import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
dotenv.config();
const app = express();
const dir = path.dirname(fileURLToPath(import.meta.url));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/', rateLimit({ windowMs: 60000, limit: 12 }));
app.use(express.static(dir));
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const allowed = new Set(['script','caption','ideas','bio','ad','planner','translate','thumbnail','post','voice']);
app.post('/api/generate', async (req,res) => {
 try {
  if (!ai) return res.status(503).json({error:'AI setup pending. Add GEMINI_API_KEY to .env.'});
  const {tool,topic,platform,tone,language,length} = req.body ?? {};
  if (!allowed.has(tool)) return res.status(400).json({error:'Invalid content tool.'});
  if (typeof topic !== 'string' || topic.trim().length < 2 || topic.length > 3000) return res.status(400).json({error:'Topic must be 2–3000 characters.'});
  const input = `You are Creatova AI, a professional global content creator assistant. Create ${tool} content.\nTopic/input: ${topic.trim()}\nPlatform: ${platform || 'General'}\nTone: ${tone || 'Engaging'}\nOutput language: ${language || 'English'}\nLength: ${length || 'Medium'}\nMake it original, useful, well-structured and ready to edit. Do not invent facts. For translation, translate faithfully. Return only the requested content.`;
  const result = await ai.interactions.create({model:process.env.GEMINI_MODEL || 'gemini-4-argon',input});
  if (!result.output_text) return res.status(502).json({error:'AI returned an empty response. Try again.'});
  res.json({output:result.output_text});
 } catch(e) { console.error(e?.message || e); res.status(500).json({error:'Generation failed. Check API setup and try again.'}); }
});
const port = Number(process.env.PORT || 3000);
app.listen(port,()=>console.log(`Creatova AI running at http://localhost:${port}`));
