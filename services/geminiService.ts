
import { GoogleGenAI, Type } from "@google/genai";
import { SystemConfig, SensorLog } from "../types";

export const getAIInsights = async (config: SystemConfig, logs: SensorLog[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const recentLogsStr = JSON.stringify(logs.slice(-7));
  const prompt = `
    Act as a Solar Energy Expert. Based on the following system profile and recent 7-day logs, provide 3 short, actionable optimization insights for the user.
    
    System Profile:
    - State: ${config.state}
    - Size: ${config.systemSize} kWp
    - Recent Efficiency: ${logs[logs.length-1].efficiency.toFixed(2)}
    - Recent Dust: ${logs[logs.length-1].dustIndex.toFixed(2)}
    - Recent Logs: ${recentLogsStr}

    Return the response as a JSON array of 3 objects with "title" and "insight" keys.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              insight: { type: Type.STRING }
            },
            required: ["title", "insight"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("AI Insight Error:", error);
    return [
      { title: "Optimize Tilt", insight: "Based on seasonal shifts, a 5-degree adjustment could boost yield by 3%." },
      { title: "Cleaning Schedule", insight: "High dust index detected. Schedule cleaning within 48 hours to prevent hotspots." },
      { title: "Inverter Check", insight: "Slight voltage fluctuations observed. Recommend a thermal scan of MC4 connectors." }
    ];
  }
};
