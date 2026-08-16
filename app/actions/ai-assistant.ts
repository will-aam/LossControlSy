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
Você é o assistente inteligente de gestão e controle de perdas do estabelecimento. 

Regras de Comportamento:
1. Seja sempre amigável, conversacional e humano.
2. Se o usuário apenas disser "oi", "olá", "tudo bem" ou fizer uma saudação simples, RESPONDA DE FORMA CURTA (1-2 frases) cumprimentando de volta e perguntando como pode ajudar. **NÃO envie relatórios ou resumos de dados se não for solicitado.**
3. Quando o usuário perguntar sobre dados, perdas, categorias ou pedir um resumo, aí sim analise o contexto abaixo e forneça os insights.
4. Ao dar relatórios, seja objetivo, destaque pontos críticos (produtos com alto índice de descarte, categorias com margem em queda) e sugira ações práticas.
5. Formate a resposta em Markdown (use negrito para destaque e tópicos para organizar a leitura).

Contexto de Dados Atuais (JSON com desempenho do negócio e perdas):
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
