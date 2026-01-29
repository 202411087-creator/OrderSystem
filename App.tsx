
import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, Clock, Search, LayoutDashboard, Tag, MessageCircle, LogOut, Sparkles, User, Home } from 'lucide-react';
import { Order, ParsingResult, PriceRecord, UserProfile } from './types.ts';
import { parseLineText } from './geminiService.ts';
import { OrderCard } from './components/OrderCard.tsx';
import { Stats } from './components/Stats.tsx';
import { PriceManager } from './components/PriceManager.tsx';
import { LineSimulator } from './components/LineSimulator.tsx';

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
    const savedOrders = localStorage.getItem('smart_orders_mobile_v1');
    const savedPrices = localStorage.getItem('smart_prices_mobile_v1');
    const savedUser = localStorage.getItem('smart_user_session_mobile_v1');
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedPrices) setPrices(JSON.parse(savedPrices));
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    localStorage.setItem('smart_orders_mobile_v1', JSON.stringify(orders));
    localStorage.setItem('smart_prices_mobile_v1', JSON.stringify(prices));
    if (currentUser) {
      localStorage.setItem('smart_user_session_mobile_v1', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('smart_user_session_mobile_v1');
    }
  }, [orders, prices, currentUser]);

  const isAdmin = currentUser?.role === 'admin';

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
      const filteredItems = res.items.filter(item => {
        if (isAdmin) return true;
        return availableItems.some(p => p.itemName === item.name);
      });

      if (filteredItems.length === 0 && res.items.length > 0) {
        throw new Error(`抱歉，品項不在今日清單中。`);
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
  };

  const filteredOrders = orders.filter(o => {
    const isOwner = isAdmin || o.userName === currentUser?.username;
    if (!isOwner) return false;
    const matchesSearch = o.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.address.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'dashboard' || activeTab === 'prices') return true;
    return matchesSearch && o.status === activeTab;
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
                if (username === 'alinveoo017' && password === 'Aa971024') {
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
      <header className="px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div>
          <h1 className="text-xl font-black text-gray-900 leading-none">SmartLine</h1>
          <p className="text-[10px] font-black text-green-500 uppercase mt-1 tracking-tighter">
            {isAdmin ? 'ADMINISTATOR' : `WELCOME, ${currentUser.username.toUpperCase()}`}
          </p>
        </div>
        <button onClick={() => setCurrentUser(null)} className="p-3 bg-gray-100 rounded-2xl text-gray-400 tap-active">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="scroll-content px-6 pt-4 no-scrollbar">
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
            {/* Search Bar on Pending Tab */}
            {activeTab === 'pending' && (
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="搜尋訂單或地址..." 
                  className="w-full h-14 pl-12 pr-6 bg-white border-none rounded-[20px] shadow-sm font-bold text-sm outline-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            )}

            {/* Price Recommendation (Member Only) */}
            {!isAdmin && activeTab === 'pending' && (
              <div className="bg-white rounded-[32px] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-green-500" />
                  <h3 className="font-black text-gray-800 text-sm">今日推薦清單</h3>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {prices.filter(p => p.isAvailable).map(p => (
                    <div key={p.id} className="bg-gray-50 px-5 py-4 rounded-[24px] border border-gray-100 min-w-[140px]">
                      <span className="block text-sm font-bold text-gray-800">{p.itemName}</span>
                      <span className="text-lg font-black text-green-600">NT${p.price}</span>
                      <span className="block text-[8px] font-black text-gray-300 uppercase mt-1">{p.region}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orders List */}
            <div className="grid grid-cols-1 gap-4 pb-8">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onToggleStatus={isAdmin ? () => setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: o.status === 'pending' ? 'completed' : 'pending' } : o)) : undefined} 
                    onDelete={isAdmin ? () => { if(confirm('刪除？')) setOrders(prev => prev.filter(o => o.id !== order.id)); } : undefined} 
                    onFlag={isAdmin ? () => setOrders(prev => prev.map(o => o.id === order.id ? { ...o, isFlagged: !o.isFlagged } : o)) : undefined}
                  />
                ))
              ) : (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-gray-200" />
                  </div>
                  <p className="text-gray-300 font-bold">目前暫無相關訂單</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating LINE Button */}
      <button 
        onClick={() => setIsSimulatorOpen(true)}
        className="fixed right-6 bottom-[100px] z-40 bg-[#00B900] text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-green-200 tap-active"
      >
        <MessageCircle className="w-8 h-8" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
        </span>
      </button>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 flex items-center justify-around px-6 py-3 pb-[calc(12px+var(--safe-bottom))] z-40">
        {[
          { id: 'pending', icon: Home, label: '首頁' },
          { id: 'completed', icon: CheckCircle, label: '紀錄' },
          ...(isAdmin ? [
            { id: 'prices', icon: Tag, label: '菜價' },
            { id: 'dashboard', icon: LayoutDashboard, label: '分析' }
          ] : [])
        ].map(item => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-green-600 scale-110' : 'text-gray-300'}`}
          >
            <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'fill-green-50' : ''}`} />
            <span className="text-[10px] font-black">{item.label}</span>
          </button>
        ))}
      </nav>

      <LineSimulator isOpen={isSimulatorOpen} onClose={() => setIsSimulatorOpen(false)} onSendMessage={processOrderFromText} />
    </div>
  );
};

export default App;
