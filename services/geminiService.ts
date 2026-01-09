
import { GoogleGenAI } from "@google/genai";
import { Product, Sale } from "../types";

export const getInventoryInsights = async (products: Product[], sales: Sale[]) => {
  // Always use a named parameter to initialize the API client.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Как опытный бизнес-аналитик, проанализируй состояние склада и продаж магазина.
    Товары: ${JSON.stringify(products.map(p => ({ name: p.name, qty: p.quantity, min: p.minStock, price: p.price })))}
    Продажи (последние): ${JSON.stringify(sales.slice(-10).map(s => ({ total: s.total, date: s.date })))}
    
    Дай краткие рекомендации на русском языке:
    1. Какие товары нужно срочно закупить?
    2. Какие товары продаются плохо?
    3. Совет по увеличению прибыли на основе цен.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
    });
    // The text content is directly available as a property on the response object.
    return response.text;
  } catch (error) {
    console.error("AI Insights Error:", error);
    return "Не удалось получить аналитику. Проверьте соединение или API ключ.";
  }
};
