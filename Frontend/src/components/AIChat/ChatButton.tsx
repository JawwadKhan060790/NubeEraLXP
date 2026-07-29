import React, { useEffect, useState } from 'react';
import ChatPanel from './ChatPanel';
import { Sparkles, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';

const ChatButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const location = useLocation();

  const checkCopilotEnabled = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setEnabled(false);
      return;
    }
    try {
      const response = await api.get('/system-settings');
      if (response.data) {
        const val = response.data.EnableCopilot ?? response.data.enableCopilot;
        if (val !== undefined) {
          setEnabled(val === 'true' || val === true || val === 'True');
        }
      }
    } catch (e) {
      console.error('Failed to check Copilot status', e);
    }
  };

  useEffect(() => {
    checkCopilotEnabled();
  }, [location.pathname]);

  useEffect(() => {
    // Listen to custom settings changed event from AdminSettings page
    window.addEventListener('system-settings-changed', checkCopilotEnabled);
    return () => {
      window.removeEventListener('system-settings-changed', checkCopilotEnabled);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Premium Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-[10000] rounded-full w-14 h-14 flex items-center justify-center shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
          open 
            ? 'bg-slate-900 text-white hover:bg-slate-950 border border-slate-800' 
            : 'bg-gradient-to-tr from-brand-600 to-brand-400 text-white hover:shadow-brand-500/20'
        }`}
        style={{
          boxShadow: open 
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.4)' 
            : '0 10px 25px -5px rgba(75, 72, 207, 0.4)'
        }}
        aria-label="AI Assistant"
      >
        {open ? (
          <X className="w-6 h-6 transition-transform duration-300 rotate-90" />
        ) : (
          <Sparkles className="w-6 h-6 animate-pulse" />
        )}
      </button>
      
      {open && <ChatPanel onClose={() => setOpen(false)} />}
    </>
  );
};

export default ChatButton;
