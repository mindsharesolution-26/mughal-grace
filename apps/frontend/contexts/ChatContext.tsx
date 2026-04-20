'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { chatApi, ChatMessage, ChatConversation, ChatResponse } from '@/lib/api/chat';
import { useToast } from './ToastContext';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  contentUrdu?: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
  intent?: string;
  suggestions?: string[];
}

interface ChatState {
  isOpen: boolean;
  isLoading: boolean;
  conversationId: number | null;
  messages: Message[];
  suggestions: string[];
  language: 'en' | 'ur';
  error: string | null;
}

interface ChatContextType extends ChatState {
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  toggleLanguage: () => void;
  setLanguage: (lang: 'en' | 'ur') => void;
  applySuggestion: (suggestion: string) => void;
}

// Initial state
const initialState: ChatState = {
  isOpen: false,
  isLoading: false,
  conversationId: null,
  messages: [],
  suggestions: [
    'Show yarn stock',
    "Today's production",
    'Pending cheques',
    'Customer balances',
  ],
  language: 'en',
  error: null,
};

// Context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ChatState>(initialState);
  const { showToast } = useToast();

  // Generate unique message ID
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Toggle chat open/closed
  const toggleChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const openChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true }));
  }, []);

  const closeChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Toggle language
  const toggleLanguage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      language: prev.language === 'en' ? 'ur' : 'en',
    }));
  }, []);

  const setLanguage = useCallback((lang: 'en' | 'ur') => {
    setState((prev) => ({ ...prev, language: lang }));
  }, []);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      status: 'sent',
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    // Add temporary assistant message (loading)
    const tempAssistantId = generateId();
    setState((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: tempAssistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          status: 'sending',
        },
      ],
    }));

    try {
      const response = await chatApi.sendMessage(
        content.trim(),
        state.conversationId || undefined
      );

      // Update with actual response
      setState((prev) => ({
        ...prev,
        isLoading: false,
        conversationId: response.conversationId,
        messages: prev.messages.map((msg) =>
          msg.id === tempAssistantId
            ? {
                ...msg,
                content: response.content,
                contentUrdu: response.contentUrdu,
                status: 'sent' as const,
                intent: response.intent,
                suggestions: response.suggestions,
              }
            : msg
        ),
        suggestions: response.suggestions || prev.suggestions,
      }));
    } catch (error: any) {
      console.error('Chat error:', error);

      // Update message with error
      setState((prev) => ({
        ...prev,
        isLoading: false,
        messages: prev.messages.map((msg) =>
          msg.id === tempAssistantId
            ? {
                ...msg,
                content: 'Sorry, something went wrong. Please try again.',
                contentUrdu: 'معذرت، کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔',
                status: 'error' as const,
              }
            : msg
        ),
        error: error.response?.data?.error || 'Failed to send message',
      }));

      showToast('error', 'Failed to send message');
    }
  }, [state.conversationId, showToast]);

  // Clear messages (start new conversation)
  const clearMessages = useCallback(() => {
    setState((prev) => ({
      ...prev,
      conversationId: null,
      messages: [],
      error: null,
    }));
  }, []);

  // Apply suggestion as message
  const applySuggestion = useCallback((suggestion: string) => {
    sendMessage(suggestion);
  }, [sendMessage]);

  // Load suggestions when chat opens (lazy load to avoid 401 issues on page load)
  useEffect(() => {
    if (!state.isOpen) return;

    const loadSuggestions = async () => {
      try {
        const suggestions = await chatApi.getSuggestions();
        setState((prev) => ({ ...prev, suggestions }));
      } catch (error) {
        // Silently fail - use default suggestions
        console.debug('Failed to load chat suggestions:', error);
      }
    };

    loadSuggestions();
  }, [state.isOpen]);

  const value: ChatContextType = {
    ...state,
    toggleChat,
    openChat,
    closeChat,
    sendMessage,
    clearMessages,
    toggleLanguage,
    setLanguage,
    applySuggestion,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// Hook
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
