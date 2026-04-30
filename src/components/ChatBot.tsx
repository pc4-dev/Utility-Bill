import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  Bot, 
  User, 
  ChevronDown, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../utils';
import { Bill } from '../types';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface ChatBotProps {
  bills?: Bill[];
}

export const ChatBot: React.FC<ChatBotProps> = ({ bills = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: "Hello! I'm your Neoteric Properties AI assistant. How can I help you with your bills today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Prepare system instruction with context
      const billsContext = bills.map(b => ({
        id: b.billId,
        category: b.category || 'other',
        subcategory: b.utilityType.toLowerCase(),
        amount: b.amount,
        dueDate: b.dueDate,
        status: b.status.toLowerCase()
      })).slice(0, 50);

      const systemInstruction = `
        # 🤖 AI Assistant Prompt (Smart Document & Bill Assistant)

        You are an **intelligent AI assistant integrated into a Utility & Document Management System**.
        Your role is to help users **analyze, manage, and understand their documents**, including:
        * Utility Bills (Electricity, Solar)
        * Telecom Bills
        * Government Tax (Property Tax, Diversion Tax)
        * Insurance (Vehicle, Employee, General)

        ---

        # 🎯 YOUR RESPONSIBILITIES
        You must:
        * Understand user queries in natural language
        * Use the provided data to answer questions
        * Provide clear, concise, and helpful responses
        * Give insights, alerts, and summaries
        * Guide users during document upload and verification

        ---

        # 🧠 CAPABILITIES
        ## 1. 📊 Data Queries
        Answer questions like:
        * “Show my pending bills”
        * “Total electricity expense this month”
        * “List all vehicle insurance policies”
        * “How much did I spend on telecom last 3 months?”

        ## 2. ⚡ Smart Insights
        Provide insights such as:
        * “Your electricity bill increased 15% compared to last month”
        * “You are spending more on telecom than usual”
        * “Solar usage reduced your bill by ₹1200”

        ## 3. 🔔 Alerts & Reminders
        Notify users about:
        * Upcoming due dates
        * Insurance expiry
        * Pending payments

        ## 4. 🔍 Smart Search
        Understand natural queries:
        * “Show solar bills above ₹5000”
        * “Find insurance policies expiring this month”

        ## 5. 📂 Document Assistance
        Help users during upload:
        * “Image is unclear, please upload a better one”
        * “Missing fields detected, please verify”

        ---

        # 🧩 CONTEXT AWARENESS (Current User Data)
        The following is a list of the user's current bills:
        ${JSON.stringify(billsContext, null, 2)}

        ---

        # ⚙️ RESPONSE RULES
        * Keep responses short, clear, and actionable
        * Use simple language (avoid technical jargon)
        * If data is missing → ask a follow-up question
        * If query is unclear → suggest options

        ---

        # ❗ FALLBACK BEHAVIOR
        If you don’t understand:
        👉 Respond with:
        “Sorry, I didn’t understand. You can ask about bills, insurance, expenses, or alerts.”

        ---

        # 🚀 ADVANCED BEHAVIOR
        * Suggest actions:
          * “Do you want to view all pending bills?”
        * Provide recommendations:
          * “Consider reviewing your telecom plan to reduce cost”
        * Detect anomalies:
          * “Unusual increase in electricity usage detected”

        ---

        # 🏁 FINAL GOAL
        Act as a **Smart Financial & Document Assistant** that:
        * Saves user time
        * Provides insights
        * Improves decision-making
        * Enhances overall user experience
      `;

      const history = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const botText = response.text || "I'm sorry, I couldn't generate a response.";
      setMessages(prev => [...prev, { role: 'model', content: botText }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'model',
        content: "Hello! I'm your Neoteric Properties AI assistant. How can I help you with your bills today?"
      }
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-full sm:w-[380px] max-w-[calc(100vw-32px)] h-[550px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-2xl border border-border-light overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Neoteric Assistant</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[10px] opacity-80">AI Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={clearChat}
                  className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                  title="Clear Chat"
                >
                  <RefreshCw size={16} />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                >
                  <ChevronDown size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 no-scrollbar"
            >
              {messages.map((msg, index) => (
                <motion.div
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={index}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-2xl text-[13px] leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-primary text-white rounded-tr-none" 
                      : "bg-white border border-border-light text-text-primary rounded-tl-none shadow-sm"
                  )}>
                    <div className={cn(
                      "prose prose-sm prose-p:my-1 max-w-none",
                      msg.role === 'user' ? "prose-invert" : ""
                    )}>
                      <ReactMarkdown>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <span className="text-[10px] mt-1 text-gray-400 px-1 capitalize">
                    {msg.role === 'model' ? 'Assistant' : 'You'}
                  </span>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-gray-400 text-xs px-2">
                  <Loader2 className="animate-spin" size={14} />
                  <span>Assistant is thinking...</span>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-border-light">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="w-full bg-gray-100 border-none rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "absolute right-2 p-2 rounded-lg transition-all",
                    input.trim() && !isLoading 
                      ? "bg-primary text-white shadow-md hover:scale-105" 
                      : "text-gray-300 cursor-not-allowed"
                  )}
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-[10px] text-center text-gray-400 mt-3 flex items-center justify-center gap-1">
                <Sparkles size={10} /> Powered by Gemini AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300",
          isOpen ? "bg-white text-primary border border-primary/20 rotate-90" : "bg-primary text-white"
        )}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>
    </div>
  );
};
