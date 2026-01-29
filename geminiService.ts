
import { GoogleGenAI, Type } from "@google/genai";
import { ParsingResult, PriceRecord } from "./types.ts";

// 延遲初始化函數，確保在呼叫時才檢查 API Key，防止頂層崩潰
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key 尚未設定。請在 Vercel 環境變數中設定 API_KEY。");
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
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};

export const parsePriceText = async (text: string): Promise<Partial<PriceRecord>[]> => {
  try {
    const ai = getAI();
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
    console.error("Gemini Price Parsing Error:", error);
    throw error;
  }
};
