
import { GoogleGenAI, Type } from "@google/genai";
import { ParsingResult, PriceRecord } from "./types.ts";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "") {
    throw new Error("API Key 尚未設定。請在 Vercel 環境變數中設定 API_KEY 並重新部署。");
  }
  return new GoogleGenAI({ apiKey });
};

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
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // 升級模型以獲得更強的邏輯解析
      contents: `請解析以下訂單文字，提取使用者名稱、地址、區域及品項數量：${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: parsingSchema,
      },
    });
    const result = JSON.parse(response.text.trim());
    return result.orders || [];
  } catch (error: any) {
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};

export const parsePriceText = async (text: string): Promise<Partial<PriceRecord>[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `請從以下文字提取菜名、價格與地區（若無地區則預設為「全區」）：${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: priceSchema,
      },
    });
    const result = JSON.parse(response.text.trim());
    return result.prices || [];
  } catch (error: any) {
    console.error("Gemini Price Parsing Error:", error);
    throw error;
  }
};
