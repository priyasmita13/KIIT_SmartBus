import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, HelpCircle, Bot, ExternalLink } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAnswer } from './botEngine';
import type { BotResponse } from './botEngine';
import { quickHelps } from './knowledgeBase';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  confidence?: BotResponse['confidence'];
  navigateTo?: string;            // page to auto-navigate to
  isCountdown?: boolean;          // if true, this is a countdown message
}

// Page name map for friendly display
const PAGE_NAMES: Record<string, string> = {
  '/': 'Home',
  '/live-tracker': 'Live Bus Tracker',
  '/seat-availability': 'Seat Availability',
  '/route-schedule': 'Route & Schedule',
  '/contact': 'Contact / Help',
  '/login': 'Login',
  '/signup': 'Sign Up',
  '/profile': 'Profile',
  '/admin': 'Admin Panel',
};

const JoeBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      text: "Hey! I'm your **SmartBus Assistant** 👋\n\nAsk me anything about bus routes, schedules, seat availability, or how to use this website!",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, countdown]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (closeTimerRef.current) clearInterval(closeTimerRef.current);
    };
  }, []);

  // Start the close-chat countdown after navigation
  const startCloseCountdown = useCallback(() => {
    const closeMsgId = Date.now() + 200;
    setIsClosing(true);

    setMessages((prev) => [
      ...prev,
      {
        id: closeMsgId,
        text: 'Closing chat in **2**…',
        sender: 'bot',
        timestamp: new Date(),
        isCountdown: true,
      },
    ]);

    let remaining = 2;
    closeTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === closeMsgId
              ? { ...m, text: `Closing chat in **${remaining}**…` }
              : m
          )
        );
      } else {
        if (closeTimerRef.current) clearInterval(closeTimerRef.current);
        closeTimerRef.current = null;
        setIsClosing(false);
        setIsOpen(false);
      }
    }, 1000);
  }, []);

  const startCountdownNavigation = useCallback((targetPath: string) => {
    // Don't navigate if already on the target page
    if (location.pathname === targetPath) return;

    const pageName = PAGE_NAMES[targetPath] || targetPath;

    // Add countdown message
    const countdownMsgId = Date.now() + 100;
    setMessages((prev) => [
      ...prev,
      {
        id: countdownMsgId,
        text: `Opening **${pageName}** in **2**…`,
        sender: 'bot',
        timestamp: new Date(),
        navigateTo: targetPath,
        isCountdown: true,
      },
    ]);

    setCountdown(2);
    let remaining = 2;

    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === countdownMsgId
              ? { ...m, text: `Opening **${pageName}** in **${remaining}**…` }
              : m
          )
        );
      } else {
        // Navigate!
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        setCountdown(null);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === countdownMsgId
              ? { ...m, text: `Opened **${pageName}** ✓`, isCountdown: false }
              : m
          )
        );
        navigate(targetPath);

        // After navigating, start the close-chat countdown
        setTimeout(() => {
          startCloseCountdown();
        }, 500);
      }
    }, 1000);
  }, [location.pathname, navigate, startCloseCountdown]);

  const cancelCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (closeTimerRef.current) {
      clearInterval(closeTimerRef.current);
      closeTimerRef.current = null;
      setIsClosing(false);
    }
    setCountdown(null);
    setMessages((prev) =>
      prev.map((m) =>
        m.isCountdown ? { ...m, text: m.text.replace(/in \*\*\d\*\*…/, '— cancelled'), isCountdown: false } : m
      )
    );
  }, []);

  const handleSend = (text?: string) => {
    const query = (text || input).trim();
    if (!query) return;

    // Cancel any active countdown
    if (countdownRef.current) cancelCountdown();

    const userMsg: Message = {
      id: Date.now(),
      text: query,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate a small delay for natural feel
    setTimeout(() => {
      const response = getAnswer(query);
      const botMsg: Message = {
        id: Date.now() + 1,
        text: response.answer,
        sender: 'bot',
        timestamp: new Date(),
        confidence: response.confidence,
        navigateTo: response.navigateTo,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);

      // If there's a page to navigate to, start countdown
      if (response.navigateTo && response.confidence !== 'none') {
        setTimeout(() => {
          startCountdownNavigation(response.navigateTo!);
        }, 600);
      }
    }, 400 + Math.random() * 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Simple markdown-ish renderer
  const renderText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('• ') || line.startsWith('- ')) {
        const content = line.slice(2);
        return (
          <div key={i} className="flex items-start space-x-1.5 ml-1 mt-0.5">
            <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>
            <span>{renderInline(content)}</span>
          </div>
        );
      }
      if (line.trim() === '') return <div key={i} className="h-2" />;
      return <div key={i} className="mt-0.5">{renderInline(line)}</div>;
    });
  };

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
      if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_')))
        return <em key={i} className="italic text-gray-500">{part.slice(1, -1)}</em>;
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[9999] bg-gradient-to-r from-green-primary to-green-secondary text-white w-14 h-14 rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all flex items-center justify-center group"
          aria-label="Open SmartBus Assistant"
          id="joebot-trigger"
        >
          <Bot className="h-7 w-7 group-hover:scale-110 transition-transform" />
          <span className="absolute w-14 h-14 rounded-full bg-green-primary/30 animate-ping pointer-events-none" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ width: '380px', maxWidth: 'calc(100vw - 32px)', height: '540px', maxHeight: 'calc(100vh - 100px)' }}
          id="joebot-panel"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-primary to-green-secondary px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm leading-tight">SmartBus Assistant</h3>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.isCountdown
                        ? 'bg-green-50 text-green-800 border border-green-200 rounded-bl-md'
                        : msg.sender === 'user'
                        ? 'bg-green-primary text-white rounded-br-md'
                        : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                    }`}
                  >
                    {msg.isCountdown ? (
                      <div className="flex items-center space-x-2">
                        <ExternalLink className="h-3.5 w-3.5 text-green-600 flex-shrink-0 animate-pulse" />
                        <span>{renderText(msg.text)}</span>
                      </div>
                    ) : (
                      renderText(msg.text)
                    )}
                  </div>
                </div>

                {/* Cancel button for countdown */}
                {msg.isCountdown && (countdown !== null || isClosing) && (
                  <div className="flex justify-start mt-1 ml-1">
                    <button
                      onClick={cancelCountdown}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Cancel navigation
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-500 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100 flex items-center space-x-1.5">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick help suggestions — show after every bot answer, not while typing */}
          {!isTyping && messages[messages.length - 1]?.sender === 'bot' && (
            <div className="px-4 py-2 bg-white border-t border-gray-100 flex-shrink-0">
              <div className="flex items-center space-x-1.5 mb-2">
                <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">Quick topics</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickHelps.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-green-50 hover:text-green-primary transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2.5 bg-white border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask SmartBus anything…"
                className="flex-1 bg-gray-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-primary/30 focus:bg-white transition-colors border border-transparent focus:border-green-primary/30"
                id="joebot-input"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="bg-gradient-to-r from-green-primary to-green-secondary text-white w-9 h-9 rounded-xl flex items-center justify-center hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default JoeBot;
