
import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, Clock, Plus, Search, LayoutDashboard, Tag, Bell, MessageCircle, LogOut, User as UserIcon, Lock, MapPin, Sparkles } from 'lucide-react';
import { Order, ParsingResult, PriceRecord, UserProfile, UserRole } from './types';
import { parseLineText } from './geminiService';
import { OrderCard } from './components/OrderCard';
import { Stats } from './components/Stats';
import { PriceManager } from './components/PriceManager';
import { LineSimulator } from './components/LineSimulator';

const App: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [prices, setPrices] = useState<PriceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'prices' | 'dashboard'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '', address: '' });

  useEffect(() => {
    const savedOrders = localStorage.getItem('smart_orders_v4');
    const savedPrices = localStorage.getItem('smart_prices_v4');
    const savedUser = localStorage.getItem('smart_user_session_v4');
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedPrices) setPrices(JSON.parse(savedPrices));
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    localStorage.setItem('smart_orders_v4', JSON.stringify(orders));
    localStorage.setItem('smart_prices_v4', JSON.stringify(prices));
    if (currentUser) {
      localStorage.setItem('smart_user_session_v4', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('smart_user_session_v4');
    }
  }, [orders, prices, currentUser]);

  const findReferencePrice = (itemName: string, region: string): number => {
    const regionPrice = prices.find(p => p.itemName === itemName && p.region === region);
    if (regionPrice) return regionPrice.price;
    const globalPrice = prices.find(p => p.itemName === itemName && p.region === '全區');
    return globalPrice ? globalPrice.price : 0;
  };

  const processOrderFromText = async (text: string): Promise<void> => {
    if (!currentUser) return;
    
    const parsedResults: ParsingResult[] = await parseLineText(text);
    const availableItems = prices.filter(p => p.isAvailable);

    const newOrders: Order[] = parsedResults.map(res => {
      // 限制：只能訂購「販售清單」中的商品
      const filteredItems = res.items.filter(item => {
        if (currentUser.role === 'admin') return true;
        return availableItems.some(p => p.itemName === item.name);
      });

      if (filteredItems.length === 0 && res.items.length > 0) {
        throw new Error(`很抱歉，「${res.items[0].name}」目前不在當前的販售清單中。`);
      }

      const processedItems = filteredItems.map(item => {
        const unitPrice = item.price || findReferencePrice(item.name, res.region);
        return { ...item, price: unitPrice };
      });

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
  };

  const toggleStatus = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: o.status === 'pending' ? 'completed' : 'pending' } : o));
  };

  const deleteOrder = (id: string) => {
    if (confirm('確定刪除此訂單？')) setOrders(prev => prev.filter(o => o.id !== id));
  };

  const toggleFlag = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, isFlagged: !o.isFlagged } : o));
  };

  const addPrice = (record: Omit<PriceRecord, 'id' | 'updatedAt' | 'isAvailable'>) => {
    // Check if item already exists in that region
    const existingIndex = prices.findIndex(p => p.itemName === record.itemName && p.region === record.region);
    
    if (existingIndex > -1) {
      setPrices(prev => prev.map((p, idx) => 
        idx === existingIndex ? { ...p, price: record.price, updatedAt: Date.now() } : p
      ));
    } else {
      setPrices(prev => [...prev, { ...record, id: crypto.randomUUID(), updatedAt: Date.now(), isAvailable: false }]);
    }
  };

  const updatePriceValue = (id: string, newPrice: number) => {
    setPrices(prev => prev.map(p => p.id === id ? { ...p, price: newPrice, updatedAt: Date.now() } : p));
  };

  const deletePrice = (id: string) => {
    setPrices(prev => prev.filter(p => p.id !== id));
  };

  const togglePriceAvailable = (id: string) => {
    setPrices(prev => prev.map(p => p.id === id ? { ...p, isAvailable: !p.isAvailable } : p));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const { username, password } = loginForm;
    if (username === 'alinveoo017' && password === 'Aa971024') {
      setCurrentUser({ username, role: 'admin' });
      setActiveTab('pending');
    } else {
      const users = JSON.parse(localStorage.getItem('smart_users_v4') || '[]');
      const user = users.find((u: any) => u.username === username && u.password === password);
      if (user) {
        setCurrentUser({ username: user.username, role: 'member', address: user.address });
        setActiveTab('pending');
      } else {
        alert('帳號或密碼錯誤');
      }
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const { username, password, address } = loginForm;
    if (username === 'alinveoo017') return alert('不可使用保留帳號');
    if (!address) return alert('請輸入您的送貨地址或社區名稱以利配送');
    
    const users = JSON.parse(localStorage.getItem('smart_users_v4') || '[]');
    if (users.some((u: any) => u.username === username)) return alert('帳號已存在');
    
    users.push({ username, password, address });
    localStorage.setItem('smart_users_v4', JSON.stringify(users));
    alert('註冊成功，請開始登入');
    setAuthMode('login');
  };

  const filteredOrders = orders.filter(o => {
    const isOwner = currentUser?.role === 'admin' || o.userName === currentUser?.username;
    if (!isOwner) return false;
    const matchesSearch = o.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.address.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'dashboard' || activeTab === 'prices') return true;
    return matchesSearch && o.status === activeTab;
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden">
          <div className="bg-[#00B900] p-12 text-center text-white">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-black italic tracking-tighter">SmartLine</h1>
          </div>
          <div className="p-10 space-y-6">
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              <button onClick={() => setAuthMode('login')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400'}`}>登入</button>
              <button onClick={() => setAuthMode('register')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${authMode === 'register' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400'}`}>註冊</button>
            </div>
            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              <input type="text" placeholder="使用者帳號" className="w-full px-6 py-4 bg-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-medium" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} required />
              <input type="password" placeholder="登入密碼" className="w-full px-6 py-4 bg-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-medium" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required />
              {authMode === 'register' && (
                <input type="text" placeholder="預設送貨地址 / 社區名稱" className="w-full px-6 py-4 bg-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-medium border-2 border-green-100" value={loginForm.address} onChange={e => setLoginForm({...loginForm, address: e.target.value})} required />
              )}
              <button className="w-full bg-[#00B900] text-white py-5 rounded-[24px] font-black text-lg shadow-lg hover:bg-green-600 transition-all active:scale-95">
                {authMode === 'login' ? '進入系統' : '註冊帳號'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-24">
      <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-[#00B900] p-3 rounded-[20px] text-white"><ShoppingCart className="w-5 h-5" /></div>
          <div>
            <h1 className="text-lg font-black text-gray-800 tracking-tight leading-none">SmartLine</h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{currentUser.role} mode · {currentUser.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="搜尋訂單..." className="pl-11 pr-5 py-2.5 bg-gray-100 rounded-full text-xs outline-none focus:ring-2 focus:ring-green-500 w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => setCurrentUser(null)} className="p-3 text-gray-400 hover:text-red-500 bg-gray-50 rounded-full transition-colors"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-8">
        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar">
          {[
            { id: 'pending', icon: Clock, label: '當前訂單' },
            { id: 'completed', icon: CheckCircle, label: '歷史紀錄' },
            ...(isAdmin ? [
              { id: 'prices', icon: Tag, label: '管理商品/菜價' },
              { id: 'dashboard', icon: LayoutDashboard, label: '營收分析' }
            ] : [])
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`flex items-center gap-2 px-8 py-3.5 rounded-full text-xs font-black border-2 transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-[#00B900] text-white border-green-600 shadow-xl scale-105' 
                  : 'bg-white text-gray-500 border-gray-100 hover:border-green-200'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {activeTab === 'dashboard' && isAdmin ? (
            <Stats orders={orders} />
          ) : activeTab === 'prices' && isAdmin ? (
            <PriceManager 
              prices={prices} 
              onAddPrice={addPrice} 
              onDeletePrice={deletePrice} 
              onToggleAvailable={togglePriceAvailable}
              onUpdatePrice={updatePriceValue}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {currentUser.role === 'member' && activeTab === 'pending' && (
                <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
                  <div className="bg-white rounded-[40px] p-8 border shadow-sm sticky top-28">
                    <h3 className="text-sm font-black text-gray-800 mb-6 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-green-500" /> 今日推薦清單
                    </h3>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
                      {prices.filter(p => p.isAvailable).map(p => (
                        <div key={p.id} className="group flex justify-between items-center bg-gray-50 p-4 rounded-3xl border border-gray-100 hover:border-green-200 transition-all">
                          <div>
                            <span className="font-bold text-gray-700 block">{p.itemName}</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase">{p.region}</span>
                          </div>
                          <span className="text-sm font-black text-green-600">NT$ {p.price}</span>
                        </div>
                      ))}
                      {prices.filter(p => p.isAvailable).length === 0 && (
                        <p className="text-center text-gray-300 italic text-xs py-8 bg-gray-50 rounded-3xl">今日暫未上架商品</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className={`${currentUser.role === 'member' && activeTab === 'pending' ? 'lg:col-span-2' : 'col-span-full'} order-1 lg:order-2`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {filteredOrders.length > 0 ? filteredOrders.map(order => (
                    <OrderCard 
                      key={order.id} 
                      order={order} 
                      onToggleStatus={isAdmin ? () => toggleStatus(order.id) : undefined} 
                      onDelete={isAdmin ? () => deleteOrder(order.id) : undefined} 
                      onFlag={isAdmin ? () => toggleFlag(order.id) : undefined}
                    />
                  )) : (
                    <div className="col-span-full py-32 text-center bg-white rounded-[48px] border-2 border-dashed border-gray-200">
                      <MessageCircle className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                      <h3 className="text-gray-400 font-bold">目前無相關訂單資料</h3>
                      <p className="text-gray-300 text-xs mt-2">請使用 LINE 模擬器開始訂購</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating LINE Action Button */}
      <button 
        onClick={() => setIsSimulatorOpen(true)} 
        className="fixed bottom-8 right-8 bg-[#00B900] text-white p-6 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 ring-8 ring-green-100 group"
      >
        <MessageCircle className="w-8 h-8 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
        </span>
      </button>

      <LineSimulator isOpen={isSimulatorOpen} onClose={() => setIsSimulatorOpen(false)} onSendMessage={processOrderFromText} />
    </div>
  );
};

export default App;
