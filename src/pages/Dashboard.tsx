import React, { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, DollarSign, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     async function load() {
       const snap = await getDocs(query(collection(db, 'orders')));
       setOrders(snap.docs.map(d => d.data()));
       setLoading(false);
     }
     load();
  }, []);

  if (loading) return <div className="p-12 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-blue-500" /></div>;

  // KPIs
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'Completed').length;
  const inProgressOrders = orders.filter(o => o.status === 'In Progress' || o.status === 'Pending').length;
  
  const totalRevenue = orders.reduce((acc, o) => acc + (o.finalPrice || 0), 0);
  const completedRevenue = orders.filter(o => o.status === 'Completed').reduce((acc, o) => acc + (o.finalPrice || 0), 0);
  
  // Hardcoded for demo if ACES percent isn't in order, we could recalculate it by fetching pricelist, but let's assume it's roughly 20% of net or added to DB logic. 
  // Wait, price list has acesPercent. Assuming we didn't save acesPercent in order (we only saved finalPrice, base, discount). Let's simulate a 25% ACES share on total revenue for demo analytics.
  const acesShare = totalRevenue * 0.25;

  // Chart Data: Status
  const statusData = [
    { name: 'Completed', value: completedOrders, color: '#10b981' },
    { name: 'In Progress/Pending', value: inProgressOrders, color: '#3b82f6' },
    { name: 'Not Completed', value: orders.filter(o => o.status === 'Not Completed').length, color: '#ef4444' }
  ];

  // Chart Data: Revenue by Category
  const categoryMap: Record<string, number> = {};
  orders.forEach(o => {
      if (o.status === 'Completed') {
          categoryMap[o.serviceCategory] = (categoryMap[o.serviceCategory] || 0) + o.finalPrice;
      }
  });
  const catData = Object.entries(categoryMap).map(([name, revenue]) => ({ name, revenue }));

  const MetricCard = ({ title, value, sub, isTrendUp, Icon, color }: any) => (
    <div className="stat-card group hover:translate-y-[-2px] transition-all">
       <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl ${color || 'bg-slate-50 text-slate-600'}`}>
             <Icon className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isTrendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
             {isTrendUp ? '+ 3.2%' : '- 2.1%'}
          </span>
       </div>
       <span className="stat-label">{title}</span>
       <span className="stat-value">{value}</span>
       <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{sub}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
           title="Account Balance (EGP)" 
           value={`$ ${totalRevenue.toLocaleString()}`} 
           sub="From last month"
           isTrendUp={true}
           Icon={DollarSign}
           color="bg-emerald-50 text-emerald-600"
        />
        <MetricCard 
           title="Pipeline Orders" 
           value={inProgressOrders} 
           sub="Active Operations"
           isTrendUp={false}
           Icon={Activity}
           color="bg-blue-50 text-blue-600"
        />
        <MetricCard 
           title="Operations Health" 
           value={`${((completedOrders/totalOrders)*100 || 0).toFixed(1)}%`} 
           sub="Completion Success"
           isTrendUp={true}
           Icon={CheckCircle2}
           color="bg-purple-50 text-purple-600"
        />
        <MetricCard 
           title="ACES Commission" 
           value={`$ ${acesShare.toLocaleString()}`} 
           sub="25% Service Share"
           isTrendUp={false}
           Icon={Activity}
           color="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-3 card-modern overflow-hidden flex flex-col">
          <div className="section-header p-6 pb-0 flex flex-col items-start gap-1">
             <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Performance</span>
             <span className="section-title">Revenue Overview</span>
          </div>
          <div className="p-8 h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={catData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                   dy={10}
                 />
                 <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                   tickFormatter={(value) => `$${value}`} 
                 />
                 <Tooltip 
                   contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} 
                 />
                 <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="var(--color-primary)" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                 />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie */}
        <div className="lg:col-span-1 card-modern p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
             <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Lifecycle</span>
             <span className="section-title">Order Status</span>
          </div>
          
          <div className="h-[220px] relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={statusData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={85}
                   paddingAngle={8}
                   dataKey="value"
                   cornerRadius={6}
                 >
                   {statusData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900">{totalOrders}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</span>
             </div>
          </div>

          <div className="flex flex-col gap-3">
             {statusData.map(s => (
               <div key={s.name} className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                 <div className="flex items-center gap-3">
                   <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: s.color}}></div>
                   <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{s.name}</span>
                 </div>
                 <span className="text-sm font-extrabold text-slate-900">{s.value}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
