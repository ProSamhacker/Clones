import { GeminiResponse, Message } from '@/types';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
const IMAGEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GEMINI_API_KEY}`;

// Exponential backoff for API calls
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
}

export async function generateGeminiResponse(
  prompt: string, 
  history: Partial<Message>[] = [],
  imageBase64?: string | null,
  mimeType: string = "image/png"
): Promise<GeminiResponse> {
  
  // Construct History
  // Note: Simple history formatting. For full multimodal history, you'd need to store/retrieve 
  // base64s or upload files to Google's File API. This version sends text history + current image.
  const formattedHistory = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  // Construct Current Message Part
  const currentParts: any[] = [{ text: prompt }];
  
  // Attach Image if present
  if (imageBase64) {
    // Strip prefix if present (e.g., "data:image/png;base64,")
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    currentParts.push({
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    });
  }

  const payload = {
    contents: [
      ...formattedHistory,
      { 
        role: 'user',
        parts: currentParts 
      }
    ],
    tools: [{ google_search: {} }]
  };

  try {
    const response = await fetchWithRetry(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.error) throw new Error(data.error.message);
    
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || "I couldn't generate a response.";
    
    const grounding = candidate?.groundingMetadata?.groundingAttributions?.map((a: any) => ({
      uri: a.web?.uri,
      title: a.web?.title
    })) || [];

    return { text, grounding };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "I'm having trouble connecting right now.", grounding: [] };
  }
}

export async function generateImage(prompt: string): Promise<string | null> {
  const payload = {
    instances: [{ prompt: prompt }],
    parameters: { sampleCount: 1 }
  };

  try {
    const response = await fetchWithRetry(IMAGEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (data.predictions && data.predictions[0]) {
      return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Imagen API Error:", error);
    return null;
  }
}