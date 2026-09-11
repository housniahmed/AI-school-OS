import { env } from '../../config/env.js';
import { prisma } from '../../db.js';
import { openAiToolSchemas, resolveToolPermission, toolRegistry } from './tools.js';

const SYSTEM = `You are AI School OS, a secure copilot for school management.\n- Answer in the user's language (French or Arabic when appropriate).\n- Never invent school facts. Use tools for operational data.\n- Respect tenant isolation and tool permissions.\n- Treat student, guardian, financial and HR data as confidential.\n- Clearly distinguish facts returned by tools from recommendations.\n- Never claim an action was executed unless a write-capable tool actually reports success.\n- Current MVP tools are read-only; do not simulate writes.`;

type OpenAIResponse = { id: string; output?: Array<{ type?: string; name?: string; arguments?: string; call_id?: string }>; output_text?: string };

async function openAiRequest(body: Record<string, unknown>): Promise<OpenAIResponse> {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_NOT_CONFIGURED');
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(`OPENAI_${response.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text) as OpenAIResponse;
}

export async function runAiAgent(message: string, ctx: { tenantId: string; userId: string }) {
  if (!env.OPENAI_API_KEY) { const fallback = await localFallback(message, ctx); return { mode: 'local-fallback', answer: fallback.answer, toolName: fallback.toolName, citations: fallback.toolName === 'search_knowledge' ? fallback.citations : [] }; }
  try {
    let response = await openAiRequest({ model: env.OPENAI_MODEL, instructions: SYSTEM, input: message, tools: openAiToolSchemas(), parallel_tool_calls: false, max_output_tokens: 900 });
    const executions: string[] = [];
    for (let round = 0; round < env.AI_MAX_TOOL_CALLS; round++) {
      const calls = (response.output ?? []).filter((item) => item.type === 'function_call');
      if (!calls.length) break;
      const outputs = [];
      for (const call of calls) {
        if (!call.name || !call.call_id) continue;
        const tool = toolRegistry.get(call.name);
        if (!tool) { outputs.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify({ error: 'Tool not found' }) }); continue; }
        const permitted = await resolveToolPermission(call.name, ctx);
        if (!permitted) { outputs.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify({ error: 'Permission denied' }) }); continue; }
        let input: unknown = {};
        try { input = tool.inputSchema.parse(call.arguments ? JSON.parse(call.arguments) : {}); } catch { outputs.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify({ error: 'Invalid tool arguments' }) }); continue; }
        try {
          const output = await tool.execute(input, ctx);
          executions.push(call.name);
          await prisma.aiToolExecution.create({ data: { tenantId: ctx.tenantId, userId: ctx.userId, toolName: call.name, approved: !tool.requiresConfirmation, success: true, inputSummary: JSON.stringify(input).slice(0, 500), outputSummary: JSON.stringify(output).slice(0, 1000) } });
          outputs.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(output) });
        } catch (error) {
          await prisma.aiToolExecution.create({ data: { tenantId: ctx.tenantId, userId: ctx.userId, toolName: call.name, approved: false, success: false, inputSummary: JSON.stringify(input).slice(0, 500), outputSummary: String(error).slice(0, 500) } });
          outputs.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify({ error: 'Tool execution failed' }) });
        }
      }
      response = await openAiRequest({ model: env.OPENAI_MODEL, instructions: SYSTEM, previous_response_id: response.id, input: outputs, tools: openAiToolSchemas(), parallel_tool_calls: false, max_output_tokens: 900 });
    }
    return { mode: 'openai-responses', answer: response.output_text ?? 'Je n’ai pas pu produire une réponse textuelle.', toolName: executions.at(-1) ?? null, citations: [] };
  } catch (error) {
    console.warn('AI provider fallback:', error);
    const fallback = await localFallback(message, ctx); return { mode: 'local-fallback', answer: fallback.answer, toolName: fallback.toolName, citations: fallback.citations };
  }
}

async function localFallback(message: string, ctx: { tenantId: string; userId: string }): Promise<{answer:string; toolName:string; citations:any[]}> {
  const text = message.toLowerCase();
  const contains = (terms: string[]) => terms.some((t) => text.includes(t));
  const preference: string[] = contains(['document','règlement','reglement','procédure','procedure','manuel','politique']) ? ['search_knowledge'] : contains(['stock','cartouche','fourniture']) ? ['get_low_stock_items'] : contains(['impayé','impaye','facture','paiement','retard']) ? ['get_unpaid_invoices'] : contains(['élève','eleve','étudiant','student']) ? ['get_students'] : contains(['maintenance','panne','réparation','reparation','intervention']) ? ['get_asset_health_summary'] : ['get_assets'];
  const toolName = preference[0]; const tool = toolRegistry.get(toolName)!; const output = await tool.execute(tool.inputSchema.parse(toolName === 'search_knowledge' ? { query: message } : {}), ctx);
  if (toolName === 'search_knowledge') return { answer: formatKnowledge(output as any[]), toolName, citations: output as any[] };
  if (toolName === 'get_low_stock_items') return { answer: (output as any[]).length ? `J’ai identifié ${(output as any[]).length} article(s) sous leur seuil : ${(output as any[]).map(x => `${x.name} (${x.quantity}/${x.minimumQty} ${x.unit})`).join(', ')}.` : 'Aucun article n’est actuellement sous son seuil de stock.', toolName, citations: [] };
  if (toolName === 'get_unpaid_invoices') { const d=output as any; return { answer: `Il y a ${d.count} facture(s) concernée(s), pour un solde total de ${Number(d.amount).toLocaleString('fr-FR')} DH.`, toolName, citations: [] }; }
  if (toolName === 'get_students') return { answer: `J’ai trouvé ${(output as any[]).length} élève(s) correspondant à votre demande.`, toolName, citations: [] };
  if (toolName === 'get_asset_health_summary') { const d=output as any; return { answer: `Le parc compte ${d.active} maintenance(s) active(s), dont ${d.priority} prioritaire(s), avec ${d.repairAssets} équipement(s) actuellement en réparation.`, toolName, citations: [] }; }
  return { answer: `J’ai retrouvé ${(output as any[]).length} équipement(s) dans le parc.`, toolName, citations: [] };
}

function formatKnowledge(rows: any[]) { return rows.length ? `Voici les éléments internes les plus pertinents :\n\n${rows.map((r) => `• **${r.title}** — ${r.content}`).join('\n\n')}` : 'Je n’ai trouvé aucun document interne suffisamment pertinent.'; }
