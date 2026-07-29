const globalProcess = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;

export const AI_CONFIG = {
  // Provider can be: 'ollama', 'openai', 'gemini'
  provider: import.meta.env?.VITE_AI_PROVIDER || 'ollama', 
  // Model can be 'llama3', 'mistral', 'phi3' (for Ollama) or standard OpenAI/Gemini models
  model: import.meta.env?.VITE_AI_MODEL || 'llama3', 
  apiKey: (import.meta.env?.VITE_AI_API_KEY || '') || globalProcess?.env?.REACT_APP_AI_API_KEY || '', 
  temperature: 0.7,
  maxTokens: 1024,
};
