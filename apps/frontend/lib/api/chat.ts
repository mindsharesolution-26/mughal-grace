import { api } from './client';

// Types
export interface ChatMessage {
  id: number;
  conversationId: number;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  contentUrdu?: string;
  intent?: string;
  tokensUsed?: number;
  latencyMs?: number;
  createdAt: string;
}

export interface ChatConversation {
  id: number;
  userId: number;
  title?: string;
  language: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  messages?: ChatMessage[];
}

export interface ChatResponse {
  conversationId: number;
  messageId: number;
  content: string;
  contentUrdu?: string;
  intent: string;
  suggestions: string[];
  data?: any;
  tokensUsed?: number;
  latencyMs?: number;
}

export interface ChatStatus {
  available: boolean;
  aiConfigured: boolean;
  features: {
    bilingual: boolean;
    queryModules: string[];
    writeActions: boolean;
  };
}

// API Functions
export const chatApi = {
  /**
   * Send a message and get AI response
   */
  sendMessage: async (
    content: string,
    conversationId?: number
  ): Promise<ChatResponse> => {
    const response = await api.post<{ success: boolean; data: ChatResponse }>(
      '/chat/message',
      { content, conversationId }
    );
    return response.data.data;
  },

  /**
   * Get conversation history
   */
  getHistory: async (limit = 20): Promise<ChatConversation[]> => {
    const response = await api.get<{
      success: boolean;
      data: ChatConversation[];
    }>('/chat/history', { params: { limit } });
    return response.data.data;
  },

  /**
   * Get a specific conversation with messages
   */
  getConversation: async (id: number): Promise<ChatConversation> => {
    const response = await api.get<{
      success: boolean;
      data: ChatConversation;
    }>(`/chat/conversation/${id}`);
    return response.data.data;
  },

  /**
   * Delete a conversation
   */
  deleteConversation: async (id: number): Promise<void> => {
    await api.delete(`/chat/conversation/${id}`);
  },

  /**
   * Get contextual suggestions
   */
  getSuggestions: async (intent?: string): Promise<string[]> => {
    const response = await api.get<{ success: boolean; data: string[] }>(
      '/chat/suggestions',
      { params: { intent } }
    );
    return response.data.data;
  },

  /**
   * Get chat service status
   */
  getStatus: async (): Promise<ChatStatus> => {
    const response = await api.get<{ success: boolean; data: ChatStatus }>(
      '/chat/status'
    );
    return response.data.data;
  },
};
