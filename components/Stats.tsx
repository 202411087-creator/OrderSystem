
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Order } from '../types';
// Added CheckCircle and Clock to the imports from lucide-react
import { DollarSign, TrendingUp, Users, MapPin, CheckCircle, Clock } from 'lucide-react';

interface StatsProps {
  orders: Order[];
}

export const Stats: React.FC<StatsProps> = ({ orders }) => {
  // Financial Summary
  const totals = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    const totalItems = completedOrders.reduce((sum, o) => sum + o.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
    
    return {
      revenue: totalRevenue,
      avgValue: Math.round(avgOrderValue),
      itemCount: totalItems,
      orderCount: completedOrders.length
    };
  }, [orders]);

  // Item Revenue Rank
  const itemRevenueData = useMemo(() => {
    const revenueMap: Record<string, number> = {};
    orders.filter(o => o.status === 'completed').forEach(order => {
      order.items.forEach(item => {
        const itemTotal = (item.price || 0) * item.quantity;
        revenueMap[item.name] = (revenueMap[item.name] || 0) + itemTotal;
      });
    });
    return Object.entries(revenueMap)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [orders]);

  // Region Analysis
  const regionData = useMemo(() => {
    const regionMap: Record<string, number> = {};
    orders.filter(o => o.status === 'completed').forEach(order => {
      regionMap[order.region] = (regionMap[order.region] || 0) + order.totalAmount;
    });
    const colors = ['#00B900', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
    return Object.entries(regionMap).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  }, [orders]);

  const statusData = useMemo(() => [
    { name: '待處理', value: orders.filter(o => o.status === 'pending').length, color: '#f97316' },
    { name: '已完成', value: orders.filter(o => o.status === 'completed').length, color: '#22c55e' },
  ], [orders]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-2xl shadow-xl">
          <p className="text-xs font-black text-gray-400 mb-1 uppercase tracking-widest">{label}</p>
          <p className="text-sm font-black text-green-600">NT$ {payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Financial Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[32px] border shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-green-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">總銷售額</p>
          <p className="text-3xl font-black text-gray-900">NT$ {totals.revenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">平均客單價</p>
          <p className="text-3xl font-black text-gray-900">NT$ {totals.avgValue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-orange-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-orange-600" />
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">成交訂單</p>
          <p className="text-3xl font-black text-gray-900">{totals.orderCount}</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-purple-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">總銷量 (份)</p>
          <p className="text-3xl font-black text-gray-900">{totals.itemCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue by Item Chart */}
        <div className="bg-white p-8 rounded-[40px] border shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" /> 品項營收排行 (NT$)
            </h3>
            <span className="text-[10px] font-bold text-gray-400">僅計算已完成訂單</span>
          </div>
          <div className="h-80 w-full">
            {itemRevenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={itemRevenueData} margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    style={{ fontSize: '12px', fontWeight: 800, fill: '#9CA3AF' }}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                  <Bar dataKey="revenue" radius={[12, 12, 0, 0]} barSize={40}>
                    {itemRevenueData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${142 + index * 10}, 70%, 45%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-300 font-bold italic">尚無數據資料</div>
            )}
          </div>
        </div>

        {/* Regional Revenue Distribution */}
        <div className="bg-white p-8 rounded-[40px] border shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" /> 區域營收分佈
            </h3>
          </div>
          <div className="h-80 w-full flex flex-col items-center justify-center">
            {regionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {regionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-black text-gray-500">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-300 font-bold italic">尚無數據資料</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Order Status Breakdown */}
      <div className="bg-white p-8 rounded-[40px] border shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-black text-gray-800">訂單履約分析</h3>
        </div>
        <div className="flex items-center justify-around gap-8">
          {statusData.map((status, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div 
                className="w-16 h-16 rounded-[24px] flex items-center justify-center mb-3 shadow-lg"
                style={{ backgroundColor: status.color + '20', color: status.color }}
              >
                {status.name === '已完成' ? <CheckCircle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
              </div>
              <p className="text-2xl font-black" style={{ color: status.color }}>{status.value}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{status.name}</p>
            </div>
          ))}
          <div className="h-20 w-px bg-gray-100"></div>
          <div className="flex flex-col items-center">
             <div className="w-16 h-16 rounded-[24px] bg-gray-50 flex items-center justify-center mb-3">
                <span className="text-2xl font-black text-gray-800">
                  {orders.length > 0 ? Math.round((totals.orderCount / orders.length) * 100) : 0}%
                </span>
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">履約率</p>
          </div>
        </div>
      </div>
    </div>
  );
};
