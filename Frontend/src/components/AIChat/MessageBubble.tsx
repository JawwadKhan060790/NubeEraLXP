import React from 'react';
import { User, Sparkles } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content }) => {
  const isUser = role === 'user';

  // Basic lightweight parser to render Markdown formatting elegantly
  const parseMarkdown = (text: string) => {
    if (!text) return '';
    const lines = text.split('\n');
    const parsedElements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      let trimmed = line.trim();

      // Headers (### or ## or #)
      if (trimmed.startsWith('### ')) {
        parsedElements.push(
          <h4 key={`h3-${idx}`} className="text-xs font-black text-slate-900 dark:text-white mt-4 mb-1.5 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
            {trimmed.replace('### ', '')}
          </h4>
        );
        return;
      }
      if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        parsedElements.push(
          <h3 key={`h2-${idx}`} className="text-sm font-black text-slate-900 dark:text-white mt-4 mb-2 tracking-tight">
            {trimmed.replace(/^#+\s/, '')}
          </h3>
        );
        return;
      }

      // Bullet lists
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        parsedElements.push(
          <li key={`li-${idx}`} className="ml-4 list-disc text-[12px] leading-relaxed text-slate-600 dark:text-[#cbd5e1] my-0.5">
            {renderBoldAndCode(trimmed.substring(2))}
          </li>
        );
        return;
      }

      // Code blocks
      if (trimmed.startsWith('```')) {
        return; // skip code block tags for simple layout
      }

      // Normal paragraph
      if (trimmed.length > 0) {
        parsedElements.push(
          <p key={`p-${idx}`} className="text-[12px] leading-relaxed text-slate-700 dark:text-[#e2e8f0] my-1 font-semibold">
            {renderBoldAndCode(trimmed)}
          </p>
        );
      } else {
        parsedElements.push(<div key={`br-${idx}`} className="h-2" />);
      }
    });

    return parsedElements;
  };

  // Helper to render bold **text** and inline `code`
  const renderBoldAndCode = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-slate-950 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#283548] border border-slate-200 dark:border-[#334155] text-[10.5px] font-mono rounded text-blue-700 dark:text-blue-300 font-semibold">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse animate-in slide-in-from-right-4 duration-300' : 'flex-row animate-in slide-in-from-left-4 duration-300'} mb-4`}>
      {/* Icon Avatar */}
      <div 
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md border ${
          isUser 
            ? 'bg-slate-900 text-white border-slate-800' 
            : 'bg-gradient-to-tr from-blue-600 to-blue-500 text-white border-blue-400'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>

      {/* Message Bubble Container */}
      <div 
        className={`max-w-[82%] px-4 py-3 rounded-xl shadow-sm border ${
          isUser 
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-none rounded-tr-none' 
            : 'bg-slate-100 dark:bg-[#283548] text-slate-800 dark:text-[#e2e8f0] border-slate-200/60 dark:border-[#334155]/60 rounded-tl-none'
        }`}
      >
        {isUser ? (
          <p className="text-[12px] font-semibold leading-relaxed">{content}</p>
        ) : (
          <div className="space-y-1">
            {parseMarkdown(content)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
