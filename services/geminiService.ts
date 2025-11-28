
import { GoogleGenAI, Type } from "@google/genai";
import { blobToBase64 } from "../utils/audioUtils";
import { IncidentAnalysis } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert Personal Safety Analyst and Tactical Profiler. Your job is to analyze audio recordings of potential incidents to help users understand what happened, what is currently happening, and what might happen next.

You will be provided with an audio file. Analyze it for:
1. Context and summary of events.
2. Tone, sentiment, and aggression levels.
3. Specific threats or key events detected.
4. TACTICAL ANALYSIS: detailed description of what the subjects are currently doing.
5. PREDICTIVE PROFILING: Brainstorm potential next moves or escalation paths based on the audio cues.
6. An overall threat level assessment (Low, Medium, High, Critical).
7. Actionable recommendations for the user.

Output strictly in JSON format matching the schema provided.
`;

export const analyzeIncident = async (audioBlob: Blob, apiKey: string): Promise<IncidentAnalysis> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please provide a valid Gemini API Key.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Audio = await blobToBase64(audioBlob);

  // Using Gemini 3 for advanced reasoning
  const modelId = "gemini-3-pro-preview";

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || "audio/webm",
              data: base64Audio,
            },
          },
          {
            text: "Analyze this audio. Brainstorm what they are doing and predict their next moves.",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A concise summary of the audio content.",
            },
            sentiment: {
              type: Type.STRING,
              description: "Description of the emotional tone (e.g., angry, calm, chaotic).",
            },
            threatLevel: {
              type: Type.STRING,
              enum: ["Low", "Medium", "High", "Critical"],
              description: "The assessed threat level.",
            },
            keyEvents: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of key events or phrases identified.",
            },
            currentSituation: {
              type: Type.STRING,
              description: "Tactical description of what the subjects are currently doing (e.g., 'Approaching rapidly', 'Searching for entry').",
            },
            predictedNextMoves: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Brainstormed list of potential next moves the subjects might make.",
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Safety advice based on the situation.",
            },
          },
          required: ["summary", "sentiment", "threatLevel", "keyEvents", "currentSituation", "predictedNextMoves", "recommendations"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text from Gemini.");
    }

    return JSON.parse(text) as IncidentAnalysis;

  } catch (error) {
    console.error("Error analyzing incident with Gemini:", error);
    throw error;
  }
};
