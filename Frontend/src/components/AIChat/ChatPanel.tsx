import { CircleHelp, GraduationCap, RefreshCw, Send, Sparkles, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { sendAIMessage } from '../../services/aiService';
import MessageBubble from './MessageBubble';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ChatPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Retrieve user credentials
  const userRole = document.documentElement.getAttribute('data-role') || 'student';
  const savedUser = localStorage.getItem('user');
  let userName = 'Explorer';
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      if (parsed && parsed.first_name) {
        userName = parsed.first_name;
      }
    } catch (e) {}
  }

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Set initial welcoming message
  useEffect(() => {
    const getWelcomeMessage = () => {
      switch (userRole.toLowerCase()) {
        case 'admin':
        case 'superadmin':
          return `### 🛡️ Welcome, Admin ${userName}!\n\nI am your LXP Operations Copilot. I can assist with:\n* Fetching active school registration metrics\n* Analyzing STEM store order fulfillment logs\n* Explaining backend configurations\n\nHow can I support you today?`;
        case 'teacher':
          return `### 👩‍🏫 Welcome, Educator ${userName}!\n\nI am your Classroom Planning Assistant. You can ask me to:\n* Identify student academic weak areas\n* Write custom module quizzes or outlines\n* Check your lesson scheduler\n\nHow can I help with your classes today?`;
        case 'parent':
          return `### 🏡 Welcome, Guardian ${userName}!\n\nI am your Parental Portal Copilot. I can help track:\n* Your child's recent exam results\n* Scheduled classroom activities\n* Learning progress and completed lessons`;
        default:
          return `### 📚 Hello, Student ${userName}!\n\nI am your STEM Learning Assistant. Let's study! Ask me to:\n* Explain complex physics or robotics concepts\n* Summarize your assigned grade modules\n* Review recent quiz performances\n\nWhat are we learning today?`;
      }
    };

    setMessages([
      {
        role: 'assistant',
        content: getWelcomeMessage(),
      },
    ]);
  }, [userRole, userName]);

  const handleSend = async (textToSend: string = input) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendAIMessage(trimmed, userRole);
      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an issue querying the secure AI proxy. Please check your credentials.',
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Conversation reset. How can I help you, ${userName}?`,
      },
    ]);
  };

  // Pre-configured role suggestions for high-end micro-interactions
  const getSuggestions = () => {
    switch (userRole.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        return [
          { text: '📊 Show active metrics', query: 'Show active metrics' },
          { text: '🛍️ Summarize orders', query: 'Summarize storefront orders' },
          { text: '⚙️ How to configure AI key?', query: 'How do I configure a live LLM key?' },
        ];
      case 'teacher':
        return [
          { text: '📉 Identify weak areas', query: 'Identify student weak areas' },
          { text: '📝 Create robotics quiz', query: 'Create a 3-question quiz for microcontrollers' },
          { text: '🗓️ What is my schedule?', query: 'Show my scheduled classes' },
        ];
      case 'parent':
        return [
          { text: '📈 Check exam scores', query: "Show child's recent exam results" },
          { text: '📅 Check attendance', query: "Check child's attendance metrics" },
        ];
      default:
        return [
          { text: '📚 Explain syllabus', query: 'Explain my syllabus and modules' },
          { text: '🤖 What is a microcontroller?', query: 'Explain what a microcontroller is and how to program it' },
          { text: '📈 My weak areas', query: 'Analyze my weak areas and exam scores' },
        ];
    }
  };

  return (
    <div
      className="fixed top-0 right-0 bottom-0 h-screen w-full sm:w-[460px] text-slate-800 dark:text-[#e2e8f0] shadow-2xl flex flex-col border-l border-slate-200/50 dark:border-[#334155]/50 animate-in slide-in-from-right duration-300"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 9999
      }}
    >
      {/* Header Container */}
      <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-[#283548] bg-slate-50/50 dark:bg-[#283548]/50 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-emerald-600">
            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-black leading-none tracking-tight uppercase text-slate-900 dark:text-white">NubeEra STEM Copilot</h3>
            <div className="mt-1">
              <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2 py-0.5 rounded text-[8.5px] uppercase tracking-widest font-black">
                Secure AI Portal
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReset}
            title="Reset Conversation"
            className="text-slate-400 dark:text-[#64748b] hover:text-slate-900 dark:hover:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#283548] transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            title="Close Drawer"
            className="text-slate-400 dark:text-[#64748b] hover:text-slate-900 dark:hover:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#283548] transition-all cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-transparent copilot-scrollbar">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-[#94a3b8] text-[11px] font-bold uppercase tracking-wider pl-3 py-2 bg-slate-100/55 dark:bg-[#283548]/55 rounded-xl border border-slate-200/50 dark:border-[#334155]/50 backdrop-blur-md animate-pulse text-left">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" /> Analyzing live LXP database...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggesters Panel (Micro-Glassmorphism Slider) */}
      {messages.length === 1 && !loading && (
        <div className="px-6 py-3 border-t border-slate-100 dark:border-[#283548] bg-transparent flex flex-wrap gap-2 flex-shrink-0">
          {getSuggestions().map((sug, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(sug.query)}
              className="text-[10px] px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 active:scale-95 bg-slate-50 dark:bg-[#283548] border border-slate-200/60 dark:border-[#334155]/60 hover:bg-slate-100 dark:hover:bg-[#334155] text-slate-600 dark:text-[#cbd5e1] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer font-bold backdrop-blur-sm shadow-sm"
            >
              <CircleHelp className="w-3.5 h-3.5 text-emerald-600" />
              {sug.text}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <div className="p-6 border-t border-slate-100 dark:border-[#283548] bg-transparent flex flex-col gap-2.5 flex-shrink-0">
        <div className="relative flex items-center bg-slate-50 dark:bg-[#283548] border border-slate-200 dark:border-[#334155] hover:border-slate-300 focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/10 rounded-xl transition-all p-1 backdrop-blur-sm">
          <textarea
            rows={1}
            className="w-full pl-3 pr-12 py-3 bg-transparent text-slate-800 dark:text-[#e2e8f0] focus:outline-none text-[12.5px] placeholder-slate-400 resize-none min-h-[44px] max-h-[120px] copilot-scrollbar"
            placeholder="Ask Copilot a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="absolute right-3 p-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white disabled:opacity-35 disabled:hover:bg-emerald-600/90 transition-all shadow-md cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex justify-between items-center px-1 text-[9px] text-slate-400 dark:text-[#64748b] font-black uppercase tracking-widest">
          <span>Active Role: <span className="text-emerald-600 font-black">{userRole}</span></span>
          <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748b]" /> Powered by NubeEra AI</span>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
