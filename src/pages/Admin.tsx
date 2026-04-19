import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { Shield, Mail, Users, MapPin, Trash2, Plus, LogOut } from 'lucide-react';
import { cn } from '../components/layout/AppLayout';

export default function Admin() {
  const { appUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('users');
  
  const [newMap, setNewMap] = useState({ eventType: 'ORDER_CREATED', roles: [] as string[], emails: [] as string[] });
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const uSnap = await getDocs(collection(db, 'users'));
      setUsers(uSnap.docs.map(d => d.data()));

      const mSnap = await getDocs(collection(db, 'emailMappings'));
      setMappings(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
  };

  const addMapping = async () => {
    if (!newMap.eventType || (newMap.roles.length === 0 && newMap.emails.length === 0)) return;
    const id = `RULE-${Date.now()}`;
    try {
       await setDoc(doc(db, 'emailMappings', id), {
         id,
         eventType: newMap.eventType,
         roles: newMap.roles,
         emails: newMap.emails,
         mappedBy: appUser?.uid,
         createdAt: Date.now(),
         updatedAt: Date.now()
       });
       setNewMap({ eventType: 'ORDER_CREATED', roles: [], emails: [] });
       setEmailInput('');
       await fetchData();
    } catch(err) { console.error(err); }
  };

  const toggleRole = (role: string) => {
    setNewMap(prev => ({
      ...prev,
      roles: prev.roles.includes(role) 
        ? prev.roles.filter(r => r !== role) 
        : [...prev.roles, role]
    }));
  };

  const addEmail = () => {
    if (emailInput && emailInput.includes('@')) {
      setNewMap(prev => ({ ...prev, emails: [...new Set([...prev.emails, emailInput])] }));
      setEmailInput('');
    }
  };

  const updateUserRole = async (uid: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole, updatedAt: Date.now() });
      await fetchData();
    } catch(err) { console.error(err); }
  };

  const deleteMapping = async (id: string) => {
    try {
       await deleteDoc(doc(db, 'emailMappings', id));
       await fetchData();
    } catch(err) { console.error(err); }
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
           <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">System Control</div>
           <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none">Administration Hub</h1>
        </div>
        <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm">
          <button 
             className={cn(
               "px-6 py-2.5 text-xs font-bold rounded-xl transition-all uppercase tracking-wider flex items-center gap-2", 
               activeTab === 'users' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
             )}
             onClick={() => setActiveTab('users')}
          >
            <Users className="w-4 h-4" /> Users
          </button>
          <button 
             className={cn(
               "px-6 py-2.5 text-xs font-bold rounded-xl transition-all uppercase tracking-wider flex items-center gap-2", 
               activeTab === 'routing' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
             )}
             onClick={() => setActiveTab('routing')}
          >
            <Mail className="w-4 h-4" /> Workflow
          </button>
        </div>
      </div>

      <div className="card-modern overflow-hidden">
        {activeTab === 'users' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Member</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">System Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-900 flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-110 transition-transform">{u.name.charAt(0)}</div>
                          <div className="flex flex-col">
                             <span className="font-black text-slate-900 tracking-tight">{u.name}</span>
                             <span className="text-xs font-bold text-slate-400">{u.email}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <select 
                        value={u.role} 
                        onChange={e => updateUserRole(u.uid, e.target.value)}
                        disabled={u.uid === appUser?.uid}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 text-[11px] font-black uppercase tracking-widest shadow-sm cursor-pointer disabled:opacity-30 appearance-none text-right"
                      >
                        <option value="admin">Administrator</option>
                        <option value="call_center">Agent</option>
                        <option value="operations">Manager</option>
                        <option value="executor">Technician</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 overflow-hidden">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
               <div className="lg:col-span-5 space-y-10">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Rule Definition</h3>
                    <p className="text-sm font-bold text-slate-400 leading-relaxed">Establish automated notification protocols for key operational triggers.</p>
                 </div>
                 
                 <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black uppercase tracking-[3px] text-slate-400">Trigger Event</label>
                      <select 
                         className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-slate-900 text-sm font-black transition-all appearance-none cursor-pointer"
                         value={newMap.eventType}
                         onChange={e => setNewMap({...newMap, eventType: e.target.value})}
                      >
                         <option value="ORDER_CREATED">Fulfillment: New Intake</option>
                         <option value="ORDER_ASSIGNED">Logistics: Dispatch Assigned</option>
                         <option value="STATUS_UPDATED">Lifecycle: Milestone Change</option>
                      </select>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-black uppercase tracking-[3px] text-slate-400">Recipient Tiers</label>
                      <div className="flex flex-wrap gap-3">
                        {['admin', 'call_center', 'operations', 'executor'].map(role => (
                          <button
                            key={role}
                            onClick={() => toggleRole(role)}
                            className={cn(
                              "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm",
                              newMap.roles.includes(role) 
                                ? "bg-slate-900 text-white border-slate-900" 
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-900"
                            )}
                          >
                            {role?.replace('_', ' ') || ''}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-black uppercase tracking-[3px] text-slate-400">Custom Endpoints</label>
                      <div className="flex gap-3">
                        <input 
                           type="email" 
                           placeholder="ops.lead@fmplus.com"
                           className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-slate-900 text-sm font-bold placeholder:italic"
                           value={emailInput}
                           onChange={e => setEmailInput(e.target.value)}
                           onKeyPress={e => e.key === 'Enter' && addEmail()}
                        />
                        <button onClick={addEmail} className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm">
                          <Plus className="w-6 h-6" />
                        </button>
                      </div>
                      {newMap.emails.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {newMap.emails.map(email => (
                            <span key={email} className="px-4 py-2 rounded-xl bg-emerald-50 text-[10px] font-black uppercase tracking-wider text-emerald-700 border border-emerald-100 flex items-center gap-2">
                               {email}
                               <button onClick={() => setNewMap(prev => ({...prev, emails: prev.emails.filter(e => e !== email)}))} className="hover:text-rose-600 transition-colors">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button 
                       onClick={addMapping}
                       disabled={newMap.roles.length === 0 && newMap.emails.length === 0}
                       className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[3px] shadow-2xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:scale-100"
                    >
                      Commit Automation Rule
                    </button>
                 </div>
               </div>

               <div className="lg:col-span-1 hidden lg:block border-r border-slate-100"></div>

               <div className="lg:col-span-6 space-y-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Active Protocol Stack</h3>
                    <p className="text-sm font-bold text-slate-400 leading-relaxed">Current automated workflows running in production.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {mappings.map(m => (
                      <div key={m.id} className="bg-slate-50/50 border border-slate-200 rounded-3xl p-8 flex justify-between items-center group hover:bg-white hover:border-emerald-500 transition-all shadow-sm hover:shadow-xl hover:shadow-emerald-500/5">
                         <div className="space-y-5">
                            <div className="flex items-center gap-4">
                               <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400">Trigger Layer</div>
                               <span className="font-black text-slate-900 tracking-tight uppercase text-xs">{m.eventType?.replace('_', ' ') || 'Unknown'}</span>
                            </div>
                            <div className="flex flex-col gap-3">
                               {m.roles?.length > 0 && (
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center"><Users className="w-4 h-4 text-slate-400" /></div>
                                    <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                      {m.roles.map((r: string) => <span key={r} className="px-2 py-0.5 bg-slate-100 rounded-md">{r?.replace('_', ' ') || ''}</span>)}
                                    </div>
                                 </div>
                               )}
                               {m.emails?.length > 0 && (
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center"><Mail className="w-4 h-4 text-slate-400" /></div>
                                    <span className="text-[10px] font-bold text-slate-900 italic tracking-tight">{m.emails.join(', ')}</span>
                                 </div>
                               )}
                            </div>
                         </div>
                         <button onClick={() => deleteMapping(m.id)} className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all">
                            <Trash2 className="w-5 h-5" />
                         </button>
                      </div>
                    ))}
                    {mappings.length === 0 && (
                      <div className="text-center py-32 bg-slate-50/50 rounded-[3rem] border-4 border-dashed border-slate-100 text-slate-400 grayscale">
                         <Mail className="w-16 h-16 mx-auto mb-6 opacity-10" />
                         <p className="text-xs font-black uppercase tracking-[3px] opacity-40">No Protocols Active</p>
                      </div>
                    )}
                  </div>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
