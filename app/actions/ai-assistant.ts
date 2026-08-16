"use server";

import { GoogleGenAI } from "@google/genai";
import { getDashboardStats } from "./dashboard";

export async function askAssistant(userMessage: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { success: false, error: "Chave da API do Gemini não configurada." };
    }

    // 1. Fetch real DB data for context
    const statsResult = await getDashboardStats();
    let dashboardData = {};
    if (statsResult.success && statsResult.data) {
      dashboardData = statsResult.data;
    }

    // 2. Initialize Gemini new SDK
    const ai = new GoogleGenAI({ apiKey });

    // 3. Prepare Prompt Context
    const systemPrompt = `
Você é o assistente inteligente de gestão e controle de perdas do estabelecimento. Seu objetivo é analisar os dados brutos de vendas, custos e perdas fornecidos e responder às dúvidas do gestor de forma clara, direta e acionável.

Regras:
- Responda sempre em texto corrido e objetivo, sem enrolação. Formate em markdown quando necessário.
- Destaque pontos críticos (produtos com alto índice de descarte, categorias com margem em queda).
- Sugira ações práticas (ex: 'reduzir produção da estufa', 'revisar validade de insumo').
- Baseie-se estritamente nos dados recebidos no contexto abaixo.

Contexto (JSON com dados de desempenho do negócio, perdas e top categorias):
${JSON.stringify(dashboardData)}
`;

    // 4. Generate Content
    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: userMessage,
        config: {
            systemInstruction: systemPrompt
        }
    });

    const responseText = response.text;

    return { success: true, text: responseText };
  } catch (error: any) {
    console.error("Error asking Gemini:", error);
    const errorMessage = error?.message || String(error);
    return { success: false, error: `Erro na API: ${errorMessage}` };
  }
}
