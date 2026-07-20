'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'bot', text: 'Welcome to the Electrical Club! I am your AI Assistant. Ask me anything about registration, ElectroQuest, Think Big, or contact info.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const quickQuestions = [
    'ElectroQuest Rules',
    'Think Big details',
    'AI Proctoring warnings',
    'How to verify certificate',
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    // Add user message
    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, { sender: 'bot', text: data.reply || 'I am sorry, I am currently offline. Please try again later.' }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Service is temporarily down. Please check your backend server.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] p-4 rounded-full shadow-[0_0_15px_rgba(0,212,255,0.6)] text-[#081B33] hover:brightness-110 flex items-center justify-center relative cursor-pointer"
      >
        <MessageSquare className="h-6 w-6 font-bold" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-full animate-bounce">AI</span>
      </motion.button>

      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-20 right-0 w-[350px] sm:w-[380px] h-[500px] rounded-2xl border border-[#00D4FF]/30 bg-[#081B33]/95 shadow-[0_10px_30px_rgba(0,212,255,0.25)] flex flex-col backdrop-blur-xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#081B33] px-4 py-3 border-b border-[#00D4FF]/20 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="h-5 w-5 text-[#00FFFF] animate-pulse" />
                <span className="font-bold text-[#00D4FF] tracking-wider text-sm">ELECTRICAL CLUB BOT</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-md leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] text-[#081B33] font-medium rounded-tr-none'
                        : 'bg-[#081B33] border border-[#00D4FF]/20 text-gray-100 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#081B33] border border-[#00D4FF]/20 rounded-2xl rounded-tl-none px-4 py-2 text-sm text-gray-400 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-[#00FFFF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#00FFFF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#00FFFF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Quick Chips suggestions */}
            <div className="px-4 py-2 bg-[#081B33]/50 flex flex-wrap gap-1.5 border-t border-[#00D4FF]/10">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-[11px] bg-[#00D4FF]/10 text-[#00FFFF] border border-[#00FFFF]/20 px-2 py-1 rounded-full hover:bg-[#00FFFF]/25 hover:text-white transition-all cursor-pointer font-medium"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="p-3 border-t border-[#00D4FF]/20 bg-[#081B33] flex items-center space-x-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your query..."
                className="flex-1 bg-[#081B33] text-white placeholder-gray-400 text-sm border border-[#00D4FF]/20 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#00FFFF]"
              />
              <button
                type="submit"
                className="p-2.5 bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] rounded-xl text-[#081B33] hover:opacity-95 transition-all flex items-center justify-center cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
