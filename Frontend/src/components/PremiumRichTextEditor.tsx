import React, { useRef, useEffect } from 'react';
import {
   Bold,
   Italic,
   Underline,
   List,
   ListOrdered,
   Heading3,
   Eraser
} from 'lucide-react';

interface PremiumRichTextEditorProps {
   value: string;
   onChange: (value: string) => void;
   placeholder?: string;
}

const PremiumRichTextEditor: React.FC<PremiumRichTextEditorProps> = ({
   value,
   onChange,
   placeholder = 'Write your notes here...'
}) => {
   const editorRef = useRef<HTMLDivElement>(null);
   const isLocalUpdateRef = useRef(false);

   // Sync outer value change to internal HTML
   useEffect(() => {
      if (editorRef.current) {
         if (isLocalUpdateRef.current) {
            isLocalUpdateRef.current = false;
            return;
         }
         editorRef.current.innerHTML = value || '';
      }
   }, [value]);

   const handleInput = () => {
      if (editorRef.current) {
         const html = editorRef.current.innerHTML;
         isLocalUpdateRef.current = true;
         onChange(html === '<br>' ? '' : html);
      }
   };

   const executeCommand = (command: string, arg: string = '') => {
      document.execCommand(command, false, arg);
      handleInput();
      editorRef.current?.focus();
   };

   return (
      <div className="w-full flex flex-col rounded-xl overflow-hidden border border-slate-200 dark:border-[#334155] bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-md shadow-sm transition-all duration-300 hover:border-slate-300 dark:hover:border-[#475569] focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">

         {/* Glassmorphic Premium Toolbar */}
         <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50/90 dark:bg-[#283548]/90 border-b border-slate-100 dark:border-[#334155] select-none">
            <button
               type="button"
               onClick={() => executeCommand('bold')}
               className="p-2 text-slate-600 dark:text-[#cbd5e1] hover:text-primary hover:bg-slate-200/50 dark:hover:bg-[#334155]/50 rounded-lg transition-all duration-200 active:scale-95 cursor-pointer"
               title="Bold"
            >
               <Bold className="w-4 h-4" />
            </button>
            <button
               type="button"
               onClick={() => executeCommand('italic')}
               className="p-2 text-slate-600 dark:text-[#cbd5e1] hover:text-primary hover:bg-slate-200/50 dark:hover:bg-[#334155]/50 rounded-lg transition-all duration-200 active:scale-95 cursor-pointer"
               title="Italic"
            >
               <Italic className="w-4 h-4" />
            </button>
            <button
               type="button"
               onClick={() => executeCommand('underline')}
               className="p-2 text-slate-600 dark:text-[#cbd5e1] hover:text-primary hover:bg-slate-200/50 dark:hover:bg-[#334155]/50 rounded-lg transition-all duration-200 active:scale-95 cursor-pointer"
               title="Underline"
            >
               <Underline className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-[#334155] mx-1"></div>

            <button
               type="button"
               onClick={() => executeCommand('insertUnorderedList')}
               className="p-2 text-slate-600 dark:text-[#cbd5e1] hover:text-primary hover:bg-slate-200/50 dark:hover:bg-[#334155]/50 rounded-lg transition-all duration-200 active:scale-95 cursor-pointer"
               title="Bullet List"
            >
               <List className="w-4 h-4" />
            </button>
            <button
               type="button"
               onClick={() => executeCommand('insertOrderedList')}
               className="p-2 text-slate-600 dark:text-[#cbd5e1] hover:text-primary hover:bg-slate-200/50 dark:hover:bg-[#334155]/50 rounded-lg transition-all duration-200 active:scale-95 cursor-pointer"
               title="Numbered List"
            >
               <ListOrdered className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-[#334155] mx-1"></div>

            <button
               type="button"
               onClick={() => executeCommand('formatBlock', '<h3>')}
               className="p-2 text-slate-600 dark:text-[#cbd5e1] hover:text-primary hover:bg-slate-200/50 dark:hover:bg-[#334155]/50 rounded-lg transition-all duration-200 active:scale-95 cursor-pointer"
               title="Heading"
            >
               <Heading3 className="w-4 h-4" />
            </button>
            <button
               type="button"
               onClick={() => executeCommand('removeFormat')}
               className="p-2 text-slate-600 dark:text-[#cbd5e1] hover:text-primary hover:bg-slate-200/50 dark:hover:bg-[#334155]/50 rounded-lg transition-all duration-200 active:scale-95 cursor-pointer"
               title="Clear Formatting"
            >
               <Eraser className="w-4 h-4" />
            </button>
         </div>

         {/* Editable Canvas */}
         <div className="relative min-h-[350px] p-5">
            <div
               ref={editorRef}
               contentEditable
               onInput={handleInput}
               className="w-full min-h-[320px] outline-none text-sm text-slate-700 dark:text-[#e2e8f0] leading-relaxed font-sans focus:outline-none jodit-content"
               style={{ minHeight: '320px' }}
            />

            {/* Native CSS-based Placeholder */}
            {!value && (
               <div className="absolute top-5 left-5 text-slate-400 dark:text-[#64748b] text-sm font-medium pointer-events-none select-none">
                  {placeholder}
               </div>
            )}
         </div>
      </div>
   );
};

export default PremiumRichTextEditor;
