import { z, type ZodType } from 'zod';
import { prisma } from '../../db.js';

export type ToolSensitivity = 'low' | 'medium' | 'high';
export type ToolContext = { tenantId: string; userId: string };
export type ToolResult = unknown;

export type AiToolDefinition<I = unknown, O = ToolResult> = {
  name: string;
  description: string;
  requiredPermission: string;
  sensitivity: ToolSensitivity;
  requiresConfirmation: boolean;
  inputSchema: ZodType<I>;
  parameters: Record<string, unknown>;
  execute: (input: I, ctx: ToolContext) => Promise<O>;
};

export const toolRegistry = new Map<string, AiToolDefinition>();
export function registerTool<I, O>(tool: AiToolDefinition<I, O>) {
  if (toolRegistry.has(tool.name)) throw new Error(`Duplicate AI tool: ${tool.name}`);
  toolRegistry.set(tool.name, tool as AiToolDefinition);
}

registerTool({
  name: 'get_assets', description: 'List school assets, optionally filtered by category or status.', requiredPermission: 'assets:read', sensitivity: 'low', requiresConfirmation: false,
  inputSchema: z.object({ category: z.string().optional(), status: z.enum(['IN_SERVICE','IN_REPAIR','RETIRED','LOST']).optional(), limit: z.number().int().min(1).max(50).default(12) }),
  parameters: { type: 'object', properties: { category: { type: 'string' }, status: { type: 'string', enum: ['IN_SERVICE','IN_REPAIR','RETIRED','LOST'] }, limit: { type: 'integer', minimum: 1, maximum: 50, default: 12 } }, additionalProperties: false },
  execute: async (input: { category?: string; status?: 'IN_SERVICE'|'IN_REPAIR'|'RETIRED'|'LOST'; limit: number }, ctx) => prisma.asset.findMany({ where: { tenantId: ctx.tenantId, ...(input.category ? { category: input.category } : {}), ...(input.status ? { status: input.status } : {}) }, select: { id: true, assetCode: true, name: true, category: true, status: true, location: true, serialNumber: true }, orderBy: { name: 'asc' }, take: input.limit })
});

registerTool({
  name: 'get_low_stock_items', description: 'Find inventory items at or below their configured minimum quantity.', requiredPermission: 'inventory:read', sensitivity: 'low', requiresConfirmation: false,
  inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(20) }),
  parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 } }, additionalProperties: false },
  execute: async (input: { limit: number }, ctx) => { const items = await prisma.inventoryItem.findMany({ where: { tenantId: ctx.tenantId }, select: { id: true, sku: true, name: true, quantity: true, minimumQty: true, unit: true, category: true }, orderBy: { name: 'asc' } }); return items.filter((item) => Number(item.quantity) <= Number(item.minimumQty)).slice(0, input.limit); }
});

registerTool({
  name: 'get_unpaid_invoices', description: 'Summarize invoices with a remaining balance, optionally limited to overdue invoices.', requiredPermission: 'finance:read', sensitivity: 'medium', requiresConfirmation: false,
  inputSchema: z.object({ overdueOnly: z.boolean().default(false), limit: z.number().int().min(1).max(100).default(50) }),
  parameters: { type: 'object', properties: { overdueOnly: { type: 'boolean', default: false }, limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 } }, additionalProperties: false },
  execute: async (input: { overdueOnly: boolean; limit: number }, ctx) => { const invoices = await prisma.invoice.findMany({ where: { tenantId: ctx.tenantId, status: { in: input.overdueOnly ? ['OVERDUE'] : ['OVERDUE','PARTIAL'] } }, select: { number: true, totalAmount: true, paidAmount: true, dueDate: true, status: true, student: { select: { firstName: true, lastName: true, studentCode: true } } }, orderBy: { dueDate: 'asc' }, take: input.limit }); return { count: invoices.length, amount: invoices.reduce((sum, i) => sum + Number(i.totalAmount) - Number(i.paidAmount), 0), invoices }; }
});

registerTool({
  name: 'get_asset_health_summary', description: 'Summarize active maintenance requests and priority incidents.', requiredPermission: 'maintenance:read', sensitivity: 'low', requiresConfirmation: false,
  inputSchema: z.object({}), parameters: { type: 'object', properties: {}, additionalProperties: false },
  execute: async (_input: {}, ctx) => { const [active, priority, repairAssets] = await Promise.all([prisma.maintenanceRequest.count({ where: { tenantId: ctx.tenantId, status: { in: ['OPEN','ASSIGNED','IN_PROGRESS'] } } }), prisma.maintenanceRequest.count({ where: { tenantId: ctx.tenantId, status: { in: ['OPEN','ASSIGNED','IN_PROGRESS'] }, priority: { lte: 2 } } }), prisma.asset.count({ where: { tenantId: ctx.tenantId, status: 'IN_REPAIR' } })]); return { active, priority, repairAssets }; }
});

registerTool({
  name: 'get_students', description: 'List active students with class information.', requiredPermission: 'students:read', sensitivity: 'medium', requiresConfirmation: false,
  inputSchema: z.object({ search: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) }),
  parameters: { type: 'object', properties: { search: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 } }, additionalProperties: false },
  execute: async (input: { search?: string; limit: number }, ctx) => prisma.student.findMany({ where: { tenantId: ctx.tenantId, active: true, ...(input.search ? { OR: [{ firstName: { contains: input.search, mode: 'insensitive' } }, { lastName: { contains: input.search, mode: 'insensitive' } }, { studentCode: { contains: input.search, mode: 'insensitive' } }] } : {}) }, select: { studentCode: true, firstName: true, lastName: true, class: { select: { name: true, level: true } } }, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }], take: input.limit })
});

registerTool({
  name: 'search_knowledge', description: 'Retrieve relevant internal school knowledge from indexed document chunks.', requiredPermission: 'knowledge:read', sensitivity: 'low', requiresConfirmation: false,
  inputSchema: z.object({ query: z.string().min(2).max(500), limit: z.number().int().min(1).max(8).default(5) }),
  parameters: { type: 'object', properties: { query: { type: 'string', minLength: 2, maxLength: 500 }, limit: { type: 'integer', minimum: 1, maximum: 8, default: 5 } }, required: ['query'], additionalProperties: false },
  execute: async (input: { query: string; limit: number }, ctx) => {
    const chunks = await prisma.knowledgeChunk.findMany({ where: { document: { tenantId: ctx.tenantId } }, include: { document: { select: { id: true, title: true, sourceType: true } } }, take: 400 });
    const terms = input.query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = chunks.map((chunk) => { const text = chunk.content.toLowerCase(); const lexical = terms.reduce((score: number, term: string) => score + (text.includes(term) ? 1 : 0), 0); return { chunk, score: lexical / Math.max(terms.length, 1) }; }).filter((x) => x.score > 0).sort((a,b) => b.score - a.score).slice(0, input.limit);
    return scored.map(({ chunk, score }) => ({ documentId: chunk.document.id, title: chunk.document.title, sourceType: chunk.document.sourceType, score, content: chunk.content }));
  }
});

export async function resolveToolPermission(toolName: string, ctx: ToolContext) {
  const tool = toolRegistry.get(toolName);
  if (!tool) return false;
  const user = await prisma.user.findFirst({ where: { id: ctx.userId, tenantId: ctx.tenantId, status: 'ACTIVE' }, select: { roles: { select: { role: { select: { name: true, permissions: { select: { permission: { select: { code: true } } } } } } } } } });
  if (!user) return false;
  if (user.roles.some((r) => r.role.name === 'SUPER_ADMIN')) return true;
  return new Set(user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.code))).has(tool.requiredPermission);
}

export function openAiToolSchemas() {
  return [...toolRegistry.values()].map((tool) => ({ type: 'function', name: tool.name, description: tool.description, parameters: tool.parameters, strict: false }));
}
