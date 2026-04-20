'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Minimize2, Trash2, Globe, Send } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { cn } from '@/lib/utils/cn';

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span
        className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}

// Message bubble component
interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  contentUrdu?: string;
  status: 'sending' | 'sent' | 'error';
  timestamp: Date;
  language: 'en' | 'ur';
}

function MessageBubble({
  role,
  content,
  contentUrdu,
  status,
  timestamp,
  language,
}: MessageBubbleProps) {
  const isUser = role === 'user';
  const displayContent = language === 'ur' && contentUrdu ? contentUrdu : content;

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-primary-500 text-white rounded-br-md'
            : 'bg-factory-gray text-white rounded-bl-md',
          status === 'error' && 'bg-error/20 border border-error/30',
          status === 'sending' && 'opacity-70'
        )}
        dir={language === 'ur' && !isUser ? 'rtl' : 'ltr'}
      >
        {status === 'sending' ? (
          <TypingIndicator />
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
            <p
              className={cn(
                'text-[10px] mt-1',
                isUser ? 'text-white/60' : 'text-neutral-500'
              )}
            >
              {timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {status === 'error' && ' - Failed to send'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Suggestion pill component
interface SuggestionPillProps {
  text: string;
  onClick: () => void;
}

function SuggestionPill({ text, onClick }: SuggestionPillProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs bg-factory-gray hover:bg-factory-light text-neutral-300 rounded-full transition-colors whitespace-nowrap"
    >
      {text}
    </button>
  );
}

// Main ChatWidget component
export function ChatWidget() {
  const {
    isOpen,
    isLoading,
    messages,
    suggestions,
    language,
    toggleChat,
    closeChat,
    sendMessage,
    clearMessages,
    toggleLanguage,
    applySuggestion,
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle send
  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={toggleChat}
        className={cn(
          'fixed bottom-4 right-4 z-40',
          'w-14 h-14 rounded-full',
          'bg-primary-500 hover:bg-primary-600',
          'shadow-lg hover:shadow-xl',
          'flex items-center justify-center',
          'transition-all duration-200',
          isOpen && 'scale-0 opacity-0'
        )}
        aria-label="Open chat"
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </button>

      {/* Chat Widget */}
      <div
        className={cn(
          // Position
          'fixed z-40',
          // Mobile: full screen
          'inset-0',
          // Desktop: floating widget
          'md:inset-auto md:bottom-4 md:right-4',
          'md:w-96 md:h-[500px]',
          // Styling
          'bg-factory-dark',
          'md:border md:border-factory-border md:rounded-2xl',
          'md:shadow-factory-lg',
          // Layout
          'flex flex-col',
          // Animation
          'transition-all duration-300',
          isOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none md:scale-95'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-factory-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-medium text-white text-sm">
                Grace Assistant
              </span>
              <span className="block text-[10px] text-neutral-500">
                {language === 'ur' ? 'گریس اسسٹنٹ' : 'Factory AI Helper'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors"
              title={language === 'en' ? 'Switch to Urdu' : 'Switch to English'}
            >
              <Globe className="w-4 h-4" />
            </button>

            {/* Clear Chat */}
            <button
              onClick={clearMessages}
              className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Close (mobile: full, desktop: minimize) */}
            <button
              onClick={closeChat}
              className="p-2 text-neutral-400 hover:text-white hover:bg-factory-gray rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 md:hidden" />
              <Minimize2 className="w-4 h-4 hidden md:block" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-factory-border">
          {messages.length === 0 ? (
            // Empty state
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-primary-400" />
              </div>
              <h3 className="text-white font-medium mb-2">
                {language === 'ur' ? 'السلام علیکم!' : 'Hello!'}
              </h3>
              <p className="text-neutral-400 text-sm max-w-[250px]">
                {language === 'ur'
                  ? 'مجھ سے اپنی فیکٹری کے بارے میں کچھ بھی پوچھیں'
                  : 'Ask me anything about your factory - yarn stock, production, payments, and more!'}
              </p>
            </div>
          ) : (
            // Messages
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                contentUrdu={msg.contentUrdu}
                status={msg.status}
                timestamp={msg.timestamp}
                language={language}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && messages.length < 3 && (
          <div className="px-4 py-2 border-t border-factory-border/50 shrink-0">
            <p className="text-[10px] text-neutral-500 mb-2">
              {language === 'ur' ? 'تجاویز:' : 'Suggestions:'}
            </p>
            <div className="flex gap-2 flex-wrap">
              {suggestions.slice(0, 4).map((suggestion, idx) => (
                <SuggestionPill
                  key={idx}
                  text={suggestion}
                  onClick={() => applySuggestion(suggestion)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-factory-border shrink-0">
          <div className="flex items-center gap-2 bg-factory-gray rounded-xl px-4 py-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                language === 'ur'
                  ? 'یہاں پوچھیں...'
                  : 'Ask about yarn, production, payments...'
              }
              className="flex-1 bg-transparent text-white placeholder-neutral-500 focus:outline-none text-sm"
              dir={language === 'ur' ? 'rtl' : 'ltr'}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className={cn(
                'p-2 rounded-lg transition-colors',
                inputValue.trim() && !isLoading
                  ? 'bg-primary-500 hover:bg-primary-600 text-white'
                  : 'bg-factory-light text-neutral-500 cursor-not-allowed'
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ChatWidget;
