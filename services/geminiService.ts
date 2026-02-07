
import { GoogleGenAI, Type } from "@google/genai";
import { StockPerformance, ScreeningResult } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const screenStocks = async (index: string = "EGX33"): Promise<ScreeningResult> => {
  const prompt = `
    Find the latest performance data for ALL available constituents in the ${index} index on the Egyptian Exchange (EGX).
    Provide a comprehensive list of as many stocks as possible that belong to this index.
    
    For each stock, I need:
    1. Symbol/Ticker (e.g., COMI, ABUK)
    2. Full Company Name
    3. Current Price in EGP
    4. Percentage change in the last 6 months
    5. Percentage change in the last 1 month
    6. Percentage change in the last 1 week (7 days)
    7. Current Price-to-Earnings (P/E) Ratio (if available, otherwise 0)
    8. Most recent Analyst Estimated Fair Value or Target Price in EGP (if available, otherwise 0)
    
    Format the response as a JSON object containing an array of 'stocks' and a brief 'analysis' of the Egyptian market trends for the ${index} index specifically.
    Do not limit the list to only major stocks; include all identified constituents.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  symbol: { type: Type.STRING },
                  name: { type: Type.STRING },
                  currentPrice: { type: Type.NUMBER },
                  change6m: { type: Type.NUMBER },
                  change1m: { type: Type.NUMBER },
                  change1w: { type: Type.NUMBER },
                  peRatio: { type: Type.NUMBER },
                  fairValue: { type: Type.NUMBER },
                  sector: { type: Type.STRING },
                },
                required: ["symbol", "name", "currentPrice", "change6m", "change1m", "change1w"]
              }
            },
            analysis: { type: Type.STRING }
          },
          required: ["stocks", "analysis"]
        }
      },
    });

    const jsonStr = response.text.trim();
    const data = JSON.parse(jsonStr);
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || "Market Source",
      uri: chunk.web?.uri || "#"
    })) || [];

    return {
      matchingStocks: [], 
      allStocks: data.stocks.map((s: any) => ({
        ...s,
        lastUpdated: new Date().toISOString()
      })),
      analysis: data.analysis,
      sources: sources
    };
  } catch (error) {
    console.error("Screening error:", error);
    throw error;
  }
};
