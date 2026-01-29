
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, X, MessageCircle } from 'lucide-react';

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
    { id: '1', text: '您好！我是訂單助理。請輸入您的訂單訊息，例如：「小明 台北市中正區 高麗菜+2」', sender: 'bot', timestamp: Date.now() }
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

    const userMsg: Message = {
      id: crypto.randomUUID(),
      text: input,
      sender: 'user',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      await onSendMessage(currentInput);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        text: '收到！訂單已成功解析並新增至系統。',
        sender: 'bot',
        timestamp: Date.now(),
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        text: '抱歉，訂單解析出現問題，請檢查格式。',
        sender: 'bot',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-[#7494C0] shadow-2xl z-50 flex flex-col border-l border-white/20">
      {/* LINE Header */}
      <div className="bg-[#2c3e50] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-[#00B900] p-1.5 rounded-lg">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">LINE 訂單模擬器</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
            {m.sender === 'bot' && (
              <div className="bg-white p-1.5 rounded-full mb-1">
                <Bot className="w-4 h-4 text-gray-400" />
              </div>
            )}
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm relative ${
              m.sender === 'user' 
                ? 'bg-[#A0ED8D] text-gray-800 rounded-tr-none' 
                : 'bg-white text-gray-800 rounded-tl-none'
            }`}>
              {m.text}
              <span className="absolute bottom-0 text-[9px] text-gray-500 whitespace-nowrap translate-y-full mt-1">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start items-center gap-2">
            <div className="bg-white px-3 py-2 rounded-2xl text-sm shadow-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white p-3 border-t">
        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-1.5 border border-gray-200">
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-sm py-1"
            placeholder="輸入訊息..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`p-1.5 rounded-full transition-all ${input.trim() ? 'text-[#00B900]' : 'text-gray-300'}`}
          >
            <Send className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
