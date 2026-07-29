import { AI_CONFIG } from '../config/aiConfig';
import api from './api';

/**
 * AI service for sending chat messages to secure backend.
 */
export async function sendAIMessage(message: string, role: string): Promise<string> {
  try {
    const response = await api.post('/ai/chat', {
      message,
      role,
      config: AI_CONFIG,
    });
    
    // Axios returns parsed data in response.data
    return response.data.reply as string;
  } catch (err: any) {
    console.error('Failed to fetch AI reply', err);
    if (err.response?.data?.message) {
      return `Error: ${err.response.data.message}`;
    }
    return 'Sorry, I could not process your request at this moment. Please try again.';
  }
}
