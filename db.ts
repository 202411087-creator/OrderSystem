
// 此檔案現在作為前端呼叫後端 API 的 Proxy
export const sqlite = {
  async query(sql: string, params: any[] = []) {
    // 為了保持 App.tsx 相容性，我們模擬一個 query 接口，但實際上是呼叫 API
    // 在真實實作中，我們會根據 SQL 關鍵字判斷要呼叫哪個 Endpoint
    const lowerSql = sql.toLowerCase();
    let endpoint = "";
    
    if (lowerSql.includes("orders")) endpoint = "/api/orders";
    else if (lowerSql.includes("prices")) endpoint = "/api/prices";
    else if (lowerSql.includes("chat_messages")) endpoint = "/api/messages";
    else if (lowerSql.includes("users")) endpoint = "/api/auth";

    try {
      const response = await fetch(`${endpoint}?sql=${encodeURIComponent(sql)}&params=${encodeURIComponent(JSON.stringify(params))}`);
      if (!response.ok) throw new Error("API Request Failed");
      return await response.json();
    } catch (err) {
      console.error("Database Proxy Error:", err);
      return [];
    }
  },
  
  async run(sql: string, params: any[] = []) {
    const lowerSql = sql.toLowerCase();
    let endpoint = "";
    
    if (lowerSql.includes("orders")) endpoint = "/api/orders";
    else if (lowerSql.includes("prices")) endpoint = "/api/prices";
    else if (lowerSql.includes("chat_messages")) endpoint = "/api/messages";
    else if (lowerSql.includes("users")) endpoint = "/api/auth";

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params })
      });
      if (!response.ok) throw new Error("API Post Failed");
      return await response.json();
    } catch (err) {
      console.error("Database Proxy Write Error:", err);
      throw err;
    }
  }
};
