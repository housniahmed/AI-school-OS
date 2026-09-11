import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const knowledgeRouter = Router();
knowledgeRouter.use(requireAuth);
const docSchema = z.object({ title: z.string().min(2).max(200), content: z.string().min(20).max(100000), sourceType: z.string().max(40).default('INTERNAL'), mimeType: z.string().max(100).optional(), metadata: z.record(z.string(), z.unknown()).optional() });

function chunkText(text: string, maxChars = 1100) { const clean = text.replace(/\r/g,'').trim(); const paragraphs = clean.split(/\n\s*\n/).filter(Boolean); const chunks:string[]=[]; let current=''; for(const p of paragraphs){ if((current+'\n\n'+p).trim().length>maxChars && current){ chunks.push(current.trim()); current=p; } else current=(current+'\n\n'+p).trim(); } if(current) chunks.push(current); return chunks; }

async function embed(text: string): Promise<number[]|null> { if(!env.OPENAI_API_KEY) return null; const r=await fetch('https://api.openai.com/v1/embeddings',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.OPENAI_API_KEY}`},body:JSON.stringify({model:env.OPENAI_EMBEDDING_MODEL,input:text})}); if(!r.ok) return null; const data=await r.json() as any; return data.data?.[0]?.embedding ?? null; }

knowledgeRouter.get('/', requirePermission('knowledge:read'), async (req,res,next)=>{ try { const docs=await prisma.knowledgeDocument.findMany({where:{tenantId:req.auth!.tenantId},select:{id:true,title:true,sourceType:true,mimeType:true,createdAt:true,_count:{select:{chunks:true}}},orderBy:{createdAt:'desc'}}); res.json({data:docs}); } catch(e){next(e);} });

knowledgeRouter.get('/search', requirePermission('knowledge:read'), async (req,res,next)=>{ try { const query=z.string().min(2).max(500).parse(req.query.q); const chunks=await prisma.knowledgeChunk.findMany({where:{document:{tenantId:req.auth!.tenantId}},include:{document:{select:{id:true,title:true,sourceType:true}}},take:400}); const terms=query.toLowerCase().split(/\s+/).filter(Boolean); const rows=chunks.map(c=>({c,score:terms.reduce((s,t)=>s+(c.content.toLowerCase().includes(t)?1:0),0)/Math.max(terms.length,1)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,8); res.json({data:rows.map(x=>({documentId:x.c.document.id,title:x.c.document.title,sourceType:x.c.document.sourceType,score:x.score,content:x.c.content}))}); }catch(e){next(e);} });

knowledgeRouter.post('/', requirePermission('knowledge:write'), async (req,res,next)=>{ try { const input=docSchema.parse(req.body); const chunks=chunkText(input.content); const doc=await prisma.knowledgeDocument.create({data:{tenantId:req.auth!.tenantId,title:input.title,content:input.content,sourceType:input.sourceType,mimeType:input.mimeType,metadata:input.metadata, chunks:{create:await Promise.all(chunks.map(async(content,chunkIndex)=>({chunkIndex,content,embedding:await embed(content)})))}}}); res.status(201).json({data:{id:doc.id,title:doc.title,chunks:chunks.length}}); } catch(e){next(e);} });
