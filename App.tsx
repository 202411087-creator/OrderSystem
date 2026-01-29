
import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, Clock, Search, LayoutDashboard, Tag, MessageCircle, LogOut, Sparkles, User, Home, Send, Bot, List } from 'lucide-react';
import { Order, ParsingResult, PriceRecord, UserProfile } from './types.ts';
import { parseLineText } from './geminiService.ts';
import { OrderCard } from './components/OrderCard.tsx';
import { Stats } from './components/Stats.tsx';
import { PriceManager } from './components/PriceManager.tsx';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
}

const App: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [prices, setPrices] = useState<PriceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'prices' | 'dashboard'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '', address: '' });

  const chatScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedOrders = localStorage.getItem('smart_orders_mobile_v1');
    const savedPrices = localStorage.getItem('smart_prices_mobile_v1');
    const savedUser = localStorage.getItem('smart_user_session_mobile_v1');
    const savedChat = localStorage.getItem('smart_chat_history_v1');
    
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedPrices) setPrices(JSON.parse(savedPrices));
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    if (savedChat) setChatMessages(JSON.parse(savedChat));
    else setChatMessages([{ id: '1', text: '您好！我是訂單助理。您可以直接在這裡輸入訂單，例如：「高麗菜+2」', sender: 'bot', timestamp: Date.now() }]);
  }, []);

  useEffect(() => {
    localStorage.setItem('smart_orders_mobile_v1', JSON.stringify(orders));
    localStorage.setItem('smart_prices_mobile_v1', JSON.stringify(prices));
    localStorage.setItem('smart_chat_history_v1', JSON.stringify(chatMessages));
    if (currentUser) {
      localStorage.setItem('smart_user_session_mobile_v1', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('smart_user_session_mobile_v1');
    }
  }, [orders, prices, currentUser, chatMessages]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping, activeTab]);

  const isAdmin = currentUser?.role === 'admin';

  const findReferencePrice = (itemName: string, region: string): number => {
    const regionPrice = prices.find(p => p.itemName === itemName && p.region === region);
    if (regionPrice) return regionPrice.price;
    const globalPrice = prices.find(p => p.itemName === itemName && p.region === '全區');
    return globalPrice ? globalPrice.price : 0;
  };

  const processOrderFromText = async (text: string): Promise<void> => {
    if (!currentUser) return;
    setIsTyping(true);
    try {
      const parsedResults: ParsingResult[] = await parseLineText(text);
      const availableItems = prices.filter(p => p.isAvailable);

      const newOrders: Order[] = parsedResults.map(res => {
        const filteredItems = res.items.filter(item => {
          if (isAdmin) return true;
          return availableItems.some(p => p.itemName === item.name);
        });

        if (filteredItems.length === 0 && res.items.length > 0) {
          throw new Error(`抱歉，品項 "${res.items[0].name}" 不在今日供應清單中。`);
        }

        const processedItems = filteredItems.map(item => ({
          ...item,
          price: item.price || findReferencePrice(item.name, res.region)
        }));

        const totalAmount = processedItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
        const finalAddress = res.address || currentUser.address || '未填寫地址';
        const finalRegion = res.region || (finalAddress.includes('尊賢街') ? '尊賢街' : (finalAddress.includes('碧華街') ? '碧華街' : '全區'));

        return {
          id: crypto.randomUUID(),
          userName: currentUser.role === 'member' ? currentUser.username : (res.userName || '用戶'),
          address: finalAddress,
          region: finalRegion,
          items: processedItems,
          totalAmount: totalAmount,
          rawText: text,
          timestamp: Date.now(),
          status: 'pending',
          isFlagged: false
        };
      });

      setOrders(prev => [...newOrders, ...prev]);
      
      // 生成詳細的機器人回覆明細
      const detailText = newOrders.map(order => {
        const itemsDetail = order.items.map(i => `• ${i.name}: NT$${i.price} x ${i.quantity} = NT$${(i.price || 0) * i.quantity}`).join('\n');
        return `✅ 訂單已建立成功！\n\n【訂購明細】\n${itemsDetail}\n\n💰 總計金額: NT$${order.totalAmount}\n📍 配送地址: ${order.address}\n\n您可以在「我的訂單」標籤查看詳細內容。`;
      }).join('\n\n---\n\n');

      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), text: detailText, sender: 'bot', timestamp: Date.now() }]);
    } catch (e: any) {
      const errorMsg = e.message || '請確認品項名稱是否正確。';
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), text: `❌ 解析失敗：${errorMsg}`, sender: 'bot', timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || isTyping) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), text: chatInput, sender: 'user', timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    const text = chatInput;
    setChatInput('');
    processOrderFromText(text);
  };

  const filteredOrders = orders.filter(o => {
    const isOwner = isAdmin || o.userName === currentUser?.username;
    if (!isOwner) return false;
    
    const matchesSearch = o.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'dashboard' || activeTab === 'prices') return true;
    
    // 會員模式下，在「我的訂單」頁面可以看到所有訂單（pending + completed）
    if (!isAdmin && activeTab === 'completed') {
      return matchesSearch;
    }

    return matchesSearch && o.status === (activeTab === 'pending' ? 'pending' : 'completed');
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center p-8">
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md space-y-12">
          <div className="text-center">
            <div className="bg-[#00B900] w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-green-200">
              <ShoppingCart className="w-12 h-12 text-white" />
            </div>
            <h1 className="mt-8 text-4xl font-black text-gray-900 tracking-tighter">SmartLine</h1>
            <p className="mt-2 text-gray-400 font-bold">智能訂單助理</p>
          </div>

          <div className="w-full space-y-6">
            <div className="flex bg-gray-100 p-1 rounded-[24px]">
              <button onClick={() => setAuthMode('login')} className={`flex-1 py-4 rounded-[20px] text-sm font-black transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400'}`}>登入</button>
              <button onClick={() => setAuthMode('register')} className={`flex-1 py-4 rounded-[20px] text-sm font-black transition-all ${authMode === 'register' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400'}`}>註冊</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (authMode === 'login') {
                const { username, password } = loginForm;
                if (username === 'alive0017' && password === 'Aa971024') {
                  setCurrentUser({ username, role: 'admin' });
                } else {
                  const users = JSON.parse(localStorage.getItem('smart_users_mobile_v1') || '[]');
                  const user = users.find((u: any) => u.username === username && u.password === password);
                  if (user) setCurrentUser({ ...user, role: 'member' });
                  else alert('帳號或密碼錯誤');
                }
              } else {
                const { username, password, address } = loginForm;
                if (!address) return alert('請填寫地址');
                const users = JSON.parse(localStorage.getItem('smart_users_mobile_v1') || '[]');
                if (users.some((u: any) => u.username === username)) return alert('帳號已存在');
                users.push({ username, password, address });
                localStorage.setItem('smart_users_mobile_v1', JSON.stringify(users));
                setAuthMode('login');
              }
            }} className="space-y-4">
              <input type="text" placeholder="帳號" className="w-full h-16 px-6 bg-gray-50 border-none rounded-[24px] font-bold outline-none focus:ring-2 focus:ring-green-500" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} required />
              <input type="password" placeholder="密碼" className="w-full h-16 px-6 bg-gray-50 border-none rounded-[24px] font-bold outline-none focus:ring-2 focus:ring-green-500" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required />
              {authMode === 'register' && (
                <input type="text" placeholder="預設送貨地址 / 社區" className="w-full h-16 px-6 bg-gray-50 border-none rounded-[24px] font-bold outline-none focus:ring-2 focus:ring-green-500" value={loginForm.address} onChange={e => setLoginForm({...loginForm, address: e.target.value})} required />
              )}
              <button className="w-full bg-[#00B900] text-white h-16 rounded-[24px] font-black text-lg shadow-xl shadow-green-100 tap-active">
                {authMode === 'login' ? '登入系統' : '註冊帳號'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className={`px-6 py-4 flex items-center justify-between sticky top-0 z-30 ${(!isAdmin && activeTab === 'pending') ? 'bg-[#2c3e50] text-white shadow-lg' : 'bg-white/80 backdrop-blur-md text-gray-900 border-b'}`}>
        <div>
          <h1 className="text-xl font-black leading-none">SmartLine</h1>
          <p className={`text-[10px] font-black uppercase mt-1 tracking-tighter ${(!isAdmin && activeTab === 'pending') ? 'text-green-400' : 'text-green-500'}`}>
            {isAdmin ? 'ADMINISTRATOR' : `MEMBER: ${currentUser.username.toUpperCase()}`}
          </p>
        </div>
        <button onClick={() => setCurrentUser(null)} className={`p-3 rounded-2xl tap-active ${(!isAdmin && activeTab === 'pending') ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-400'}`}>
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        { !isAdmin && activeTab === 'pending' ? (
          /* Member LINE Chat Interface */
          <div className="flex-1 flex flex-col bg-[#7494C0] overflow-hidden relative">
            <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 p-4 shadow-sm z-20">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-green-500" />
                <h3 className="font-black text-gray-800 text-xs">今日供應菜單 (橫滑查看)</h3>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {prices.filter(p => p.isAvailable).map(p => (
                  <div key={p.id} className="bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100 min-w-[120px] flex flex-col justify-center">
                    <span className="block text-xs font-bold text-gray-700 truncate">{p.itemName}</span>
                    <span className="text-sm font-black text-green-600">NT${p.price}</span>
                    <span className="text-[7px] font-black text-gray-300 uppercase mt-0.5">{p.region}</span>
                  </div>
                ))}
                {prices.filter(p => p.isAvailable).length === 0 && (
                  <div className="py-2 text-gray-400 text-xs font-bold italic">今日暫無販售項目</div>
                )}
              </div>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-20">
              {chatMessages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {m.sender === 'bot' && (
                    <div className="bg-white p-2 rounded-full mb-1 shadow-sm shrink-0">
                      <Bot className="w-4 h-4 text-green-500" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-4 py-3 rounded-[20px] text-sm shadow-sm relative whitespace-pre-wrap ${
                    m.sender === 'user' 
                      ? 'bg-[#A0ED8D] text-gray-800 rounded-tr-none' 
                      : 'bg-white text-gray-800 rounded-tl-none'
                  }`}>
                    {m.text}
                    <span className={`absolute bottom-[-18px] text-[8px] text-white/70 whitespace-nowrap ${m.sender === 'user' ? 'right-0' : 'left-0'}`}>
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

            <div className="bg-white/95 backdrop-blur-md p-3 border-t flex items-center gap-3 z-30 pb-[calc(12px+var(--safe-bottom)+64px)]">
              <div className="flex-1 bg-gray-100 rounded-[24px] px-5 py-2 border border-gray-200">
                <input
                  type="text"
                  className="w-full bg-transparent border-none outline-none text-sm py-1 font-bold text-gray-700"
                  placeholder="輸入訊息..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                />
              </div>
              <button 
                onClick={handleSendChat}
                disabled={!chatInput.trim() || isTyping}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md ${chatInput.trim() ? 'bg-[#00B900] text-white scale-110' : 'bg-gray-100 text-gray-300'}`}
              >
                <Send className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        ) : (
          /* Admin or Member Order Records View */
          <div className="flex-1 overflow-y-auto px-6 pt-4 no-scrollbar pb-24">
            {activeTab === 'dashboard' && isAdmin ? (
              <Stats orders={orders} />
            ) : activeTab === 'prices' && isAdmin ? (
              <PriceManager 
                prices={prices} 
                onAddPrice={(record) => {
                  const existingIndex = prices.findIndex(p => p.itemName === record.itemName && p.region === record.region);
                  if (existingIndex > -1) {
                    setPrices(prev => prev.map((p, idx) => idx === existingIndex ? { ...p, price: record.price, updatedAt: Date.now() } : p));
                  } else {
                    setPrices(prev => [...prev, { ...record, id: crypto.randomUUID(), updatedAt: Date.now(), isAvailable: false }]);
                  }
                }} 
                onDeletePrice={(id) => setPrices(prev => prev.filter(p => p.id !== id))} 
                onToggleAvailable={(id) => setPrices(prev => prev.map(p => p.id === id ? { ...p, isAvailable: !p.isAvailable } : p))}
                onUpdatePrice={(id, val) => setPrices(prev => prev.map(p => p.id === id ? { ...p, price: val, updatedAt: Date.now() } : p))}
              />
            ) : (
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="搜尋紀錄..." 
                    className="w-full h-14 pl-12 pr-6 bg-white border border-gray-100 rounded-[20px] shadow-sm font-bold text-sm outline-none focus:ring-2 focus:ring-green-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 pb-8">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        // 僅管理員可以刪除與更改狀態
                        onToggleStatus={isAdmin ? () => setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: o.status === 'pending' ? 'completed' : 'pending' } : o)) : undefined} 
                        onDelete={isAdmin ? () => { if(confirm('刪除？')) setOrders(prev => prev.filter(o => o.id !== order.id)); } : undefined} 
                        onFlag={isAdmin ? () => setOrders(prev => prev.map(o => o.id === order.id ? { ...o, isFlagged: !o.isFlagged } : o)) : undefined}
                      />
                    ))
                  ) : (
                    <div className="py-20 text-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <List className="w-8 h-8 text-gray-200" />
                      </div>
                      <p className="text-gray-300 font-bold">目前暫無訂單資料</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 flex items-center justify-around px-6 py-3 pb-[calc(12px+var(--safe-bottom))] z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {[
          { id: 'pending', icon: isAdmin ? MessageCircle : Home, label: isAdmin ? '訂單訊息' : '首頁聊天' },
          { id: 'completed', icon: CheckCircle, label: isAdmin ? '歷史紀錄' : '我的訂單' },
          ...(isAdmin ? [
            { id: 'prices', icon: Tag, label: '菜價管理' },
            { id: 'dashboard', icon: LayoutDashboard, label: '分析報表' }
          ] : [])
        ].map(item => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 ${activeTab === item.id ? 'text-green-600 scale-105' : 'text-gray-300 hover:text-gray-400'}`}
          >
            <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'fill-green-50' : ''}`} />
            <span className="text-[10px] font-black">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
