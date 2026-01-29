
import { GoogleGenAI, Type } from "@google/genai";
import { ParsingResult, PriceRecord } from "./types.ts";

const getApiKey = () => {
  const key = process.env.API_KEY;
  if (!key || key === "") {
    throw new Error("API Key 尚未正確注入。請確認：\n1. Vercel 環境變數名稱為 API_KEY。\n2. 設定後務必在 Vercel 點擊 'Redeploy' 重新部署。\n3. 確認 API Key 是否已過期。");
  }
  return key;
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
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
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
  } catch (error: any) {
    console.error("Gemini Price Parsing Error:", error);
    throw error;
  }
};
