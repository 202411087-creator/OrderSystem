
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, MessageCircle, ChevronLeft } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
}

interface LineSimulatorProps {
  onSendMessage: (text: string) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export const LineSimulator: React.FC<LineSimulatorProps> = ({ onSendMessage, isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: '您好！我是訂單助理。請輸入訂單，例如：「小明 高麗菜+2」', sender: 'bot', timestamp: Date.now() }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = { id: crypto.randomUUID(), text: input, sender: 'user', timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);
    try {
      await onSendMessage(currentInput);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), text: '訂單已同步！', sender: 'bot', timestamp: Date.now() }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), text: e.message || '出錯了', sender: 'bot', timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#7494C0] z-[60] flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* LINE Header - App Style */}
      <div className="bg-[#2c3e50] text-white px-4 py-4 pt-[calc(16px+var(--safe-top))] flex items-center gap-3">
        <button onClick={onClose} className="p-1 tap-active">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h2 className="font-black text-sm leading-tight">訂單助理</h2>
          <span className="text-[10px] opacity-60">目前在線上</span>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-10">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
            {m.sender === 'bot' && (
              <div className="bg-white p-2 rounded-full mb-1 shrink-0">
                <Bot className="w-4 h-4 text-gray-400" />
              </div>
            )}
            <div className={`max-w-[85%] px-4 py-3 rounded-[20px] text-sm shadow-sm relative ${
              m.sender === 'user' 
                ? 'bg-[#A0ED8D] text-gray-800 rounded-tr-none' 
                : 'bg-white text-gray-800 rounded-tl-none'
            }`}>
              {m.text}
              <span className="absolute bottom-[-18px] text-[8px] text-white/60 whitespace-nowrap right-0">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start items-center gap-2">
            <div className="bg-white px-4 py-2 rounded-[20px] text-sm shadow-sm">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce delay-75"></div>
                <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area - iOS Keyboard Style */}
      <div className="bg-white p-3 pb-[calc(12px+var(--safe-bottom))] border-t flex items-center gap-3">
        <div className="flex-1 bg-gray-100 rounded-[24px] px-5 py-2">
          <input
            type="text"
            className="w-full bg-transparent border-none outline-none text-sm py-1 font-bold"
            placeholder="請輸入訂單內容..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
        </div>
        <button 
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${input.trim() ? 'bg-[#00B900] text-white' : 'bg-gray-100 text-gray-300'}`}
        >
          <Send className="w-4 h-4 fill-current" />
        </button>
      </div>
    </div>
  );
};
