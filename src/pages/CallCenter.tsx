import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { PlusCircle, Info, Loader2, CheckCircle2 } from 'lucide-react';

export default function CallCenter() {
  const { appUser } = useAuth();
  const [priceList, setPriceList] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    address: '',
    serviceCategory: '',
    serviceDescription: ''
  });

  const [selectedService, setSelectedService] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const pricesSnap = await getDocs(collection(db, 'priceList'));
        setPriceList(pricesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        try {
          const mapsSnap = await getDocs(collection(db, 'emailMappings'));
          setMappings(mapsSnap.docs.map(d => d.data()));
        } catch (e) {
            // Mappings read might be restricted or empty.
            console.log('No mappings or no permission', e);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = Array.from(new Set(priceList.map(p => p.serviceCategory)));
  const descriptions = priceList.filter(p => p.serviceCategory === formData.serviceCategory);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, serviceCategory: e.target.value, serviceDescription: '' });
    setSelectedService(null);
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, serviceDescription: e.target.value });
    const srv = priceList.find(p => p.serviceCategory === formData.serviceCategory && p.serviceDescription === e.target.value);
    setSelectedService(srv);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    setSubmitting(true);
    setSuccess('');

    try {
      const orderId = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
      const now = Date.now();
      
      let assignedExecutor = 'unassigned';
      if (mappings.length > 0) {
          const map = mappings.find(m => m.serviceCategory === formData.serviceCategory);
          if (map) assignedExecutor = map.executorEmail;
      }

      await setDoc(doc(db, 'orders', orderId), {
        id: orderId,
        customerId: `CUS-${formData.customerPhone.slice(-4)}`,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        address: formData.address,
        serviceCategory: formData.serviceCategory,
        serviceDescription: formData.serviceDescription,
        basePrice: selectedService.newPrice,
        discount: selectedService.discountPercent,
        finalPrice: selectedService.finalPrice,
        status: 'Pending',
        assignedExecutor: assignedExecutor,
        notCompletedReason: '',
        createdBy: appUser?.uid || '',
        createdAt: now,
        updatedAt: now
      });

      // Audit Log
      const auditRef = doc(collection(db, 'auditLogs'));
      await setDoc(auditRef, {
        id: auditRef.id,
        action: 'CREATE_ORDER',
        collectionName: 'orders',
        docId: orderId,
        userId: appUser?.uid,
        details: `Created order for ${formData.customerName}`,
        createdAt: now
      });

      // Simulated Backend Trigger for Email
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to: assignedExecutor,
            subject: `New Service Order: ${orderId}`,
            data: {
                orderId,
                customerName: formData.customerName,
                serviceCategory: formData.serviceCategory,
                finalPrice: selectedService.finalPrice
            }
        })
      }).catch(console.error);

      setSuccess(`Order ${orderId} created successfully & assigned to ${assignedExecutor}`);
      setFormData({ customerName: '', customerPhone: '', address: '', serviceCategory: '', serviceDescription: '' });
      setSelectedService(null);
    } catch (err) {
      console.error(err);
      alert('Failed to create order. Check permissions and data.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
           <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">New Intake</div>
           <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Order Placement</h1>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Active System Status</span>
        </div>
      </div>

      {success && (
        <div className="p-5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
             <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex-1">
             <p className="text-[11px] font-black uppercase tracking-widest opacity-60">Success Confirmation</p>
             <p className="text-sm font-bold">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-600 font-black text-lg">×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card-modern overflow-hidden">
        <div className="p-10 space-y-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-8 h-px bg-slate-200"></div>
               <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Customer Intelligence</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                <input 
                   required 
                   type="text" 
                   className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none text-sm font-bold transition-all" 
                   value={formData.customerName} 
                   onChange={(e) => setFormData({...formData, customerName: e.target.value})} 
                   placeholder="e.g. Sajibur Rahman" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Contact Phone</label>
                <input 
                   required 
                   type="tel" 
                   className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none text-sm font-bold transition-all" 
                   value={formData.customerPhone} 
                   onChange={(e) => setFormData({...formData, customerPhone: e.target.value})} 
                   placeholder="+971 50 123 4567" 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Property Address (Unit / Zone)</label>
                <input 
                   required 
                   type="text" 
                   className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none text-sm font-bold transition-all" 
                   value={formData.address} 
                   onChange={(e) => setFormData({...formData, address: e.target.value})} 
                   placeholder="Building Sapphire, Penthouse 402" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-3">
               <div className="w-8 h-px bg-slate-200"></div>
               <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Service Specification</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Operational Category</label>
                <select 
                   required 
                   className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none text-sm font-bold transition-all appearance-none cursor-pointer" 
                   value={formData.serviceCategory} 
                   onChange={handleCategoryChange}
                >
                  <option value="">Select Department...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Specific Task Description</label>
                <select 
                   required 
                   disabled={!formData.serviceCategory} 
                   className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none text-sm font-bold transition-all appearance-none cursor-pointer disabled:opacity-50" 
                   value={formData.serviceDescription} 
                   onChange={handleDescChange}
                >
                  <option value="">Select Service Work...</option>
                  {descriptions.map(d => <option key={d.id} value={d.serviceDescription}>{d.serviceDescription}</option>)}
                </select>
              </div>
            </div>
          </div>

          {selectedService && (
            <div className="bg-emerald-50/50 p-8 rounded-3xl border-2 border-dashed border-emerald-200 flex flex-col md:flex-row items-center gap-8 relative">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                 <Info className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-8 w-full">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest">List Price</span>
                  <span className="text-xl font-black text-slate-800">$ {selectedService.newPrice.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest">Rebate / Promo</span>
                  <span className="text-xl font-black text-emerald-600">-{selectedService.discountPercent}%</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest">Net Final Amount</span>
                  <span className="text-xl font-black text-slate-900">$ {selectedService.finalPrice.toLocaleString()}</span>
                </div>
              </div>
              <div className="hidden md:block absolute right-8 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-emerald-100 rounded-full flex items-center justify-center text-emerald-500 font-bold">✓</div>
            </div>
          )}
        </div>
        
        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <div className="text-[11px] font-bold text-slate-400 max-w-[300px]">
             Ensure all details are verified with the customer before initiating fulfillment.
          </div>
          <button 
            type="submit" 
            disabled={!selectedService || submitting}
            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[2px] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:hover:scale-100 flex items-center gap-3 shadow-xl shadow-slate-900/20"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4 tracking-normal" />}
            Confirm & Dispatch
          </button>
        </div>
      </form>
    </div>
  );
}
