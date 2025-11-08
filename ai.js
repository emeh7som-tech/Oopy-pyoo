import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

/**
 * Vercel Serverless function: /api/ai
 * - Protects OPENAI_API_KEY on server
 * - Logs prompts/responses to Supabase (ai_logs table) if SUPABASE_SERVICE_ROLE_KEY provided
 *
 * Environment variables (set in Vercel):
 * - OPENAI_API_KEY
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY   (required for server-side writes to Supabase)
 * - MODEL                        (optional, default: "gpt-5")
 *
 * Table schema expected in Supabase (SQL):
 * create table if not exists ai_logs (
 *   id bigint generated always as identity primary key,
 *   \"user\" text,
 *   prompt text,
 *   reply text,
 *   model text,
 *   meta jsonb,
 *   created_at timestamp with time zone default now()
 * );
 */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MODEL = process.env.MODEL || "gpt-5";

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { prompt, user, temperature } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing prompt (string)." });
    }

    // Build messages with system instruction tailored to IronBank
    const system = `Você é a IA do IronBank: assistente financeiro avançado, seguro e conservador quando necessário. Sempre responda em português (pt-BR) a menos que o usuário peça outro idioma. Dê conselhos claros, com riscos explicitados.`;

    const messages = [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ];

    // Call OpenAI (chat completions)
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: (typeof temperature === "number") ? temperature : 0.2,
      max_tokens: 800
    });

    const reply = completion.choices?.[0]?.message?.content || "";

    // Log to Supabase (best-effort; don't fail the request if logging fails)
    if (supabase) {
      try {
        await supabase.from("ai_logs").insert([{
          user: user || null,
          prompt: prompt,
          reply: reply,
          model: MODEL,
          meta: { remote_ip: req.headers["x-forwarded-for"] || null }
        }]);
      } catch (logErr) {
        console.warn("Supabase logging failed:", logErr?.message || logErr);
      }
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("AI handler error:", err);
    return res.status(500).json({ error: "Internal server error", details: err?.message || String(err) });
  }
}
