
import React from 'react';
import { User, MapPin, Package, Check, Trash2, RotateCcw, Calendar, Bell, DollarSign } from 'lucide-react';
import { Order } from '../types';

interface OrderCardProps {
  order: Order;
  onToggleStatus?: () => void;
  onDelete?: () => void;
  onFlag?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onToggleStatus, onDelete, onFlag }) => {
  const dateString = new Date(order.timestamp).toLocaleString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const hasActions = onToggleStatus || onDelete || onFlag;

  return (
    <div className={`bg-white rounded-[28px] p-5 shadow-sm border border-gray-100 relative overflow-hidden tap-active ${order.status === 'completed' ? 'opacity-60 bg-gray-50' : ''}`}>
      {order.isFlagged && order.status === 'pending' && (
        <div className="absolute top-0 right-0 w-12 h-12 bg-red-500 text-white flex items-center justify-center rotate-45 translate-x-6 -translate-y-6">
          <Bell className="w-3 h-3 -rotate-45 mt-4" />
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gray-50 w-10 h-10 rounded-2xl flex items-center justify-center">
            <User className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h3 className="font-black text-gray-800 text-sm flex items-center gap-2">
              {order.userName}
              <span className="text-[8px] font-black bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full border border-green-100">{order.region}</span>
            </h3>
            <span className="text-[9px] font-bold text-gray-300">{dateString}</span>
          </div>
        </div>
        <div className={`text-[10px] font-black px-3 py-1 rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
          {order.status === 'completed' ? 'DONE' : 'PENDING'}
        </div>
      </div>

      <div className="bg-gray-50/80 rounded-2xl p-3 mb-4 flex items-start gap-2">
        <MapPin className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
        <p className="text-[11px] font-bold text-gray-500 leading-tight">{order.address}</p>
      </div>

      <div className="space-y-1.5 mb-4">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-xs px-1">
            <span className="font-bold text-gray-700">{item.name} <span className="text-gray-300">x{item.quantity}</span></span>
            <span className="font-black text-gray-400">NT${(item.price || 0) * item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center py-3 border-t border-gray-50">
        <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Total Amount</span>
        <span className="text-lg font-black text-green-600">NT$ {order.totalAmount}</span>
      </div>

      {hasActions && (
        <div className="flex gap-2 mt-2">
          {onToggleStatus && (
            <button onClick={onToggleStatus} className={`flex-1 h-12 rounded-[18px] flex items-center justify-center gap-2 font-black text-xs transition-all ${order.status === 'completed' ? 'bg-gray-100 text-gray-400' : 'bg-green-600 text-white shadow-lg shadow-green-100'}`}>
              {order.status === 'completed' ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              {order.status === 'completed' ? 'REVERT' : 'COMPLETE'}
            </button>
          )}
          {onFlag && (
            <button onClick={onFlag} className={`w-12 h-12 rounded-[18px] flex items-center justify-center border ${order.isFlagged ? 'bg-red-50 text-red-500 border-red-100' : 'bg-white text-gray-300'}`}>
              <Bell className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="w-12 h-12 rounded-[18px] flex items-center justify-center bg-gray-50 text-gray-300">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
