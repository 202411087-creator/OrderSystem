
import { GoogleGenAI, Type } from "@google/genai";
import { ParsingResult, PriceRecord } from "./types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const parsingSchema = {
  type: Type.OBJECT,
  properties: {
    orders: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          userName: { type: Type.STRING },
          address: { type: Type.STRING },
          region: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                price: { type: Type.NUMBER },
              },
              required: ["name", "quantity"],
            },
          },
        },
        required: ["userName", "items", "region"],
      },
    },
  },
  required: ["orders"],
};

const priceSchema = {
  type: Type.OBJECT,
  properties: {
    prices: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          itemName: { type: Type.STRING },
          price: { type: Type.NUMBER },
          region: { type: Type.STRING },
        },
        required: ["itemName", "price"],
      },
    },
  },
  required: ["prices"],
};

export const parseLineText = async (text: string): Promise<ParsingResult[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `解析訂單：${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: parsingSchema,
      },
    });
    const result = JSON.parse(response.text.trim());
    return result.orders || [];
  } catch (error) {
    throw error;
  }
};

export const parsePriceText = async (text: string): Promise<Partial<PriceRecord>[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `請從以下文字提取菜名、價格與地區（若無地區則預設為「全區」）：${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: priceSchema,
      },
    });
    const result = JSON.parse(response.text.trim());
    return result.prices || [];
  } catch (error) {
    throw error;
  }
};
