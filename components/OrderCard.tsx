
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
    <div className={`bg-white rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md relative overflow-hidden ${order.status === 'completed' ? 'opacity-75 border-green-200' : 'border-gray-200'}`}>
      {/* Reminder Flag Indicator */}
      {order.isFlagged && order.status === 'pending' && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-red-500 text-white flex items-center justify-center rotate-45 translate-x-8 -translate-y-8 shadow-sm">
          <Bell className="w-4 h-4 -rotate-45 mt-6" />
        </div>
      )}

      {/* Header Info */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-2 rounded-full">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 leading-tight flex items-center gap-2">
              {order.userName}
              {order.region && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{order.region}</span>}
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Calendar className="w-3 h-3" />
              {dateString}
            </div>
          </div>
        </div>
        <div className={`text-xs font-semibold px-2 py-1 rounded-md ${
          order.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
        }`}>
          {order.status === 'completed' ? '已完成' : '處理中'}
        </div>
      </div>

      {/* Address */}
      {order.address && (
        <div className="flex items-start gap-2 mb-4 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
          <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="break-all text-xs">{order.address}</p>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <Package className="w-3.5 h-3.5" />
          品項明細
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center bg-gray-50/50 border px-3 py-1.5 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-medium">{item.name}</span>
                <span className="text-xs text-gray-400">x{item.quantity}</span>
              </div>
              <span className="text-gray-500 text-xs">
                {item.price ? `NT$${item.price * item.quantity}` : '未定價'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Total Amount */}
      <div className="flex justify-between items-center mb-4 p-2 bg-green-50 rounded-xl border border-green-100">
        <span className="text-xs font-bold text-green-700 flex items-center gap-1">
          <DollarSign className="w-3 h-3" /> 總額
        </span>
        <span className="text-lg font-black text-green-800">NT$ {order.totalAmount}</span>
      </div>

      {/* Actions (Only render if user has permissions) */}
      {hasActions && (
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          {onToggleStatus && (
            <button
              onClick={onToggleStatus}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
                order.status === 'completed' 
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                  : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
              }`}
            >
              {order.status === 'completed' ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              {order.status === 'completed' ? '重設' : '完成'}
            </button>
          )}
          {onFlag && (
            <button
              onClick={onFlag}
              className={`p-2 rounded-xl border transition-all ${order.isFlagged ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-gray-200 text-gray-400 hover:text-red-400'}`}
              title="提醒標記"
            >
              <Bell className="w-5 h-5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
