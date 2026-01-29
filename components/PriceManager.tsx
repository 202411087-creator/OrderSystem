
import React, { useState } from 'react';
import { Plus, Trash2, MapPin, Tag, Save, ListChecks, MessageSquarePlus, Sparkles, AlertCircle, ShoppingBag } from 'lucide-react';
import { PriceRecord } from '../types.ts';
import { parsePriceText } from '../geminiService.ts';

interface PriceManagerProps {
  prices: PriceRecord[];
  onAddPrice: (record: Omit<PriceRecord, 'id' | 'updatedAt' | 'isAvailable'>) => void;
  onDeletePrice: (id: string) => void;
  onToggleAvailable: (id: string) => void;
  onUpdatePrice: (id: string, newPrice: number) => void;
}

export const PriceManager: React.FC<PriceManagerProps> = ({ 
  prices, 
  onAddPrice, 
  onDeletePrice, 
  onToggleAvailable,
  onUpdatePrice 
}) => {
  const [view, setView] = useState<'library' | 'today'>('library');
  const [batchText, setBatchText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Logic for Database View: Add or Update records in the master list
  const handleDatabaseImport = async () => {
    if (!batchText.trim()) return;
    setIsParsing(true);
    try {
      const results = await parsePriceText(batchText);
      results.forEach(res => {
        if (res.itemName && res.price) {
          onAddPrice({
            itemName: res.itemName,
            price: res.price,
            region: res.region || '全區'
          });
        }
      });
      setBatchText('');
      alert('菜價庫批量更新完成！');
    } catch (e: any) {
      alert(`解析失敗: ${e.message || '請檢查格式或網路連線。'}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Logic for Daily Menu View: Find items in database, update price, and set to Available
  const handleDailyMenuImport = async () => {
    if (!batchText.trim()) return;
    setIsParsing(true);
    try {
      const results = await parsePriceText(batchText);
      results.forEach(res => {
        if (res.itemName && res.price) {
          // Look for existing item in library to toggle on
          const existing = prices.find(p => p.itemName === res.itemName && p.region === (res.region || '全區'));
          if (existing) {
            if (!existing.isAvailable) onToggleAvailable(existing.id);
            onUpdatePrice(existing.id, res.price);
          } else {
            // If not in library, add it directly as an available item
            onAddPrice({
              itemName: res.itemName,
              price: res.price,
              region: res.region || '全區'
            });
          }
        }
      });
      setBatchText('');
      alert('今日販售清單已更新！');
    } catch (e: any) {
      alert(`解析失敗: ${e.message || '出錯了'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const libraryPrices = prices;
  const todayPrices = prices.filter(p => p.isAvailable);

  return (
    <div className="bg-white rounded-[40px] border shadow-xl overflow-hidden transition-all">
      {/* Navigation Tabs */}
      <div className="flex bg-gray-50 border-b p-2">
        <button 
          onClick={() => setView('library')}
          className={`flex-1 py-4 rounded-3xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
            view === 'library' ? 'bg-white shadow-md text-green-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Tag className="w-5 h-5" /> 
          <div className="text-left">
            <p className="leading-none">總菜價庫</p>
            <p className="text-[10px] opacity-60 font-medium">資料庫存檔</p>
          </div>
        </button>
        <button 
          onClick={() => setView('today')}
          className={`flex-1 py-4 rounded-3xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
            view === 'today' ? 'bg-white shadow-md text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <ShoppingBag className="w-5 h-5" /> 
          <div className="text-left">
            <p className="leading-none">今日販售清單</p>
            <p className="text-[10px] opacity-60 font-medium">客戶可見菜單</p>
          </div>
        </button>
      </div>

      <div className="p-8">
        {/* LINE Input Section */}
        <div className="mb-10 bg-gray-50 rounded-[32px] p-6 border border-dashed border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className={`text-sm font-black flex items-center gap-2 ${view === 'library' ? 'text-green-600' : 'text-blue-600'}`}>
              <MessageSquarePlus className="w-5 h-5" /> 
              {view === 'library' ? 'LINE 批次匯入菜價庫' : 'LINE 快速上線販售商品'}
            </h4>
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
              <Sparkles className="w-3 h-3" />
              AI 智能解析
            </div>
          </div>
          
          <div className="space-y-4">
            <textarea 
              className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-sm resize-none outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
              placeholder={view === 'library' 
                ? "範例：高麗菜 50, 尊賢街 青江菜 30, 碧華街 蒜頭 100" 
                : "範例：今日特價 高麗菜 45, 只有今天 青椒 60"
              }
              rows={3}
              value={batchText}
              onChange={e => setBatchText(e.target.value)}
            />
            <button 
              onClick={view === 'library' ? handleDatabaseImport : handleDailyMenuImport}
              disabled={isParsing || !batchText.trim()}
              className={`w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:bg-gray-200 ${
                view === 'library' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isParsing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  AI 正在努力解析中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  確認匯入 {view === 'library' ? '菜價庫' : '今日清單'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* List View */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">
              {view === 'library' ? `資料庫共 ${libraryPrices.length} 項` : `今日上架 ${todayPrices.length} 項`}
            </h5>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(view === 'library' ? libraryPrices : todayPrices).map((p) => (
              <div key={p.id} className="group bg-white border border-gray-100 p-5 rounded-3xl hover:border-green-200 hover:shadow-md transition-all flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${p.isAvailable ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h6 className="font-bold text-gray-800 flex items-center gap-2">
                      {p.itemName}
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border">{p.region}</span>
                    </h6>
                    <p className="text-lg font-black text-green-600">NT$ {p.price}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => onToggleAvailable(p.id)}
                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black border transition-all ${
                      p.isAvailable 
                        ? 'bg-green-600 text-white border-green-600' 
                        : 'bg-white text-gray-400 border-gray-200 hover:border-green-400 hover:text-green-500'
                    }`}
                  >
                    {p.isAvailable ? '販售中' : '未上架'}
                  </button>
                  {view === 'library' && (
                    <button onClick={() => onDeletePrice(p.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors mx-auto">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {(view === 'library' ? libraryPrices : todayPrices).length === 0 && (
              <div className="col-span-full py-20 text-center">
                <AlertCircle className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                <p className="text-gray-300 font-bold italic">目前清單內沒有任何資料</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
