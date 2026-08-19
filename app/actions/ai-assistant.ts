"use server";

import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function askAssistant(userMessage: string) {
  try {
    const session = await getSession();
    if (!session || !session.ownerId) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { success: false, error: "Chave da API do Gemini não configurada." };
    }

    // 1. Fetch real DB data for context using ownerId limit
    // Busca apenas o último mês (30 dias) para manter a IA muito rápida.
    const dateLimit = new Date();
    dateLimit.setMonth(dateLimit.getMonth() - 1);

    const [itens, categorias, motivos, eventos, vendas, compras] = await Promise.all([
      prisma.item.findMany({
        where: { ownerId: session.ownerId },
        select: { nome: true, custo: true, custoMedio: true, precoVenda: true, status: true, categoria: { select: { nome: true } } }
      }),
      prisma.categoria.findMany({
        where: { ownerId: session.ownerId },
        select: { nome: true, status: true }
      }),
      prisma.motivo.findMany({
        where: { ownerId: session.ownerId },
        select: { nome: true }
      }),
      prisma.evento.findMany({
        where: { ownerId: session.ownerId, dataHora: { gte: dateLimit }, status: { notIn: ["rascunho", "rejeitado"] } },
        select: { dataHora: true, motivo: true, quantidade: true, custoSnapshot: true, precoVendaSnapshot: true, status: true, item: { select: { nome: true } } }
      }),
      prisma.vendaDiaria.findMany({
        where: { ownerId: session.ownerId, data: { gte: dateLimit } },
        select: { data: true, itens: { select: { quantidade: true, valorLiquido: true, item: { select: { nome: true } } } } }
      }),
      prisma.nFeCompra.findMany({
        where: { ownerId: session.ownerId, dataEmissao: { gte: dateLimit } },
        select: { dataEmissao: true, valorTotal: true, emitente: true, itens: { select: { quantidade: true, valorUnitario: true, descricaoFornecedor: true, item: { select: { nome: true } } } } }
      })
    ]);

    // Format payload to be extremely concise to save tokens
    const contextData = {
      periodo: "Últimos 30 dias",
      categorias: categorias.map(c => c.nome),
      motivos: motivos.map(m => m.nome),
      itens: itens.map(i => ({ n: i.nome, c: Number(i.custo), cm: Number(i.custoMedio), pv: Number(i.precoVenda), cat: i.categoria?.nome, st: i.status })),
      eventosPerda: eventos.map(e => ({ d: e.dataHora.toISOString().split("T")[0], m: e.motivo, q: Number(e.quantidade), c: Number(e.custoSnapshot), pv: Number(e.precoVendaSnapshot), i: e.item?.nome })),
      vendas: vendas.map(v => ({ d: v.data.toISOString().split("T")[0], i: v.itens.map(vi => ({ q: Number(vi.quantidade), v: Number(vi.valorLiquido), n: vi.item.nome })) })),
      comprasNFe: compras.map(c => ({ d: c.dataEmissao?.toISOString().split("T")[0], v: Number(c.valorTotal), e: c.emitente, i: c.itens.map(ci => ({ q: Number(ci.quantidade), vu: Number(ci.valorUnitario), n: ci.item?.nome || ci.descricaoFornecedor })) }))
    };

    // 2. Initialize Gemini new SDK
    const ai = new GoogleGenAI({ apiKey });

    // 3. Prepare Prompt Context
    const systemPrompt = `
Você é a Iris, a assistente inteligente de gestão e controle de perdas do estabelecimento. 

Regras de Comportamento:
1. Seja sempre amigável, conversacional e humano.
2. Se o usuário apenas disser "oi", "olá", "tudo bem" ou fizer uma saudação simples, RESPONDA DE FORMA CURTA (1-2 frases) cumprimentando de volta e perguntando como pode ajudar. **NÃO envie relatórios ou resumos de dados se não for solicitado.**
3. Quando o usuário perguntar sobre dados, perdas, categorias, motivos, vendas, importações ou pedir um resumo, aí sim analise o contexto abaixo e forneça respostas precisas (EXATAS). O contexto contém os DADOS REAIS da loja (Catálogo, Perdas, Vendas, Compras NFe e Motivos de perda).
4. Ao dar relatórios, seja objetivo, destaque pontos críticos (produtos com alto índice de descarte, motivos mais frequentes) e sugira ações práticas. SEMPRE termine sua resposta com uma pergunta engajadora sugerindo uma nova análise ou aprofundamento sobre o tema que o usuário acabou de perguntar.
5. Formate a resposta em Markdown. **MUITO IMPORTANTE:** Use quebras de linha DUPLAS entre tópicos diferentes, seções, e antes de iniciar uma nova lista para dar respiro ao layout. NÃO USE linhas divisórias (como --- ou ***), apenas use quebras de linha para separar as seções.
6. Os dados abaixo usam abreviações para economizar espaço: n=nome, c=custo, cm=custoMedio, pv=precoVenda, cat=categoria, st=status, d=data, m=motivo, q=quantidade, v=valorLiquido/Total, e=emitente, vu=valorUnitario.

Contexto de Dados Atuais (JSON com os últimos 30 dias):
${JSON.stringify(contextData)}
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
