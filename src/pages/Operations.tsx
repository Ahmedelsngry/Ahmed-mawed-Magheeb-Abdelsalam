import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { Printer, CheckCircle, XCircle, Clock, Send, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../components/layout/AppLayout';

export default function Operations() {
  const { appUser } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reasonModal, setReasonModal] = useState<{ id: string, reason: string } | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'orders'));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(d => d.data());
      // Due to index setup limits in sandbox without index creation, we sort locally here:
      fetched.sort((a,b) => b.createdAt - a.createdAt);
      setOrders(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (newStatus === 'Not Completed') {
      setReasonModal({ id: orderId, reason: '' });
      return;
    }
    
    setUpdatingId(orderId);
    try {
      const ref = doc(db, 'orders', orderId);
      await updateDoc(ref, { 
        status: newStatus,
        updatedAt: Date.now()
      });
      await fetchOrders();
    } catch(err) {
       console.error(err);
       alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const submitNotCompleted = async () => {
    if (!reasonModal || !reasonModal.reason.trim()) return;
    setUpdatingId(reasonModal.id);
    try {
      const ref = doc(db, 'orders', reasonModal.id);
      await updateDoc(ref, { 
        status: 'Not Completed',
        notCompletedReason: reasonModal.reason,
        updatedAt: Date.now()
      });
      // Simulate notify call center
      console.log(`Call center notified: Order ${reasonModal.id} Not Completed. Reason: ${reasonModal.reason}`);
      setReasonModal(null);
      await fetchOrders();
    } catch(err) {
       console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePrint = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const dateStr = new Date(order.createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>FMPLUS Work Order - ${order.id}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { 
              font-family: 'Inter', -apple-system, sans-serif; 
              color: #1e293b; 
              line-height: 1.5; 
              margin: 0;
              padding: 0;
            }
            .container { max-width: 800px; margin: 0 auto; }
            
            /* Header */
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center;
              border-bottom: 4px solid #2563eb; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
            }
            .brand { display: flex; align-items: center; gap: 12px; }
            .brand-logo { 
              width: 48px; 
              height: 48px; 
              background: #2563eb; 
              border-radius: 12px; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              color: white;
              font-weight: 900;
              font-size: 24px;
            }
            .brand-text h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.05em; color: #0f172a; }
            .brand-text p { margin: 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; }
            
            .meta { text-align: right; }
            .meta h2 { margin: 0; font-size: 18px; color: #2563eb; font-weight: 800; text-transform: uppercase; }
            .meta p { margin: 4px 0 0; font-size: 13px; font-weight: 600; color: #64748b; }

            /* Grid Sections */
            .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
            .section { background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; }
            .section-title { 
              font-size: 11px; 
              font-weight: 800; 
              color: #94a3b8; 
              text-transform: uppercase; 
              letter-spacing: 0.1em; 
              margin-bottom: 12px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
            }
            .detail-row { margin-bottom: 8px; font-size: 14px; }
            .detail-label { font-weight: 700; color: #475569; width: 100px; display: inline-block; }
            .detail-value { color: #0f172a; font-weight: 500; }

            /* Table */
            .work-table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 30px 0; }
            .work-table th { 
              background: #f1f5f9; 
              color: #475569; 
              font-size: 11px; 
              font-weight: 800; 
              text-transform: uppercase; 
              letter-spacing: 0.1em;
              padding: 12px 16px;
              text-align: left;
              border-bottom: 2px solid #e2e8f0;
            }
            .work-table td { padding: 16px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
            .service-desc { font-weight: 700; color: #0f172a; display: block; margin-bottom: 4px; }
            .service-sub { font-size: 12px; color: #64748b; }

            /* Financials */
            .summary-container { display: flex; justify-content: flex-end; }
            .summary { width: 300px; }
            .summary-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; }
            .total-row { 
              border-top: 2px solid #2563eb; 
              margin-top: 10px; 
              padding-top: 15px; 
              font-size: 20px; 
              font-weight: 800; 
              color: #2563eb; 
            }

            /* Signatures */
            .footer-sig { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 80px; }
            .signature-block { border-top: 2px solid #cbd5e1; padding-top: 12px; }
            .signature-label { font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
            .signature-name { margin-top: 4px; font-size: 14px; font-weight: 600; color: #1e293b; }

            /* Notice */
            .notice { margin-top: 40px; padding: 20px; background: #eff6ff; border-radius: 12px; color: #1d4ed8; font-size: 12px; font-weight: 500; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="brand">
                <div class="brand-logo">F</div>
                <div class="brand-text">
                  <h1>FMPLUS</h1>
                  <p>Facility Management R3</p>
                </div>
              </div>
              <div class="meta">
                <h2>Work Order</h2>
                <p>REF: ${order.id}</p>
                <p>DATE: ${dateStr}</p>
              </div>
            </div>

            <div class="section-grid">
              <div class="section">
                <div class="section-title">Customer Information</div>
                <div class="detail-row"><span class="detail-label">Name:</span> <span class="detail-value">${order.customerName}</span></div>
                <div class="detail-row"><span class="detail-label">Phone:</span> <span class="detail-value">${order.customerPhone}</span></div>
                <div class="detail-row"><span class="detail-label">Location:</span> <span class="detail-value">${order.address}</span></div>
              </div>
              <div class="section">
                <div class="section-title">Assignment Details</div>
                <div class="detail-row"><span class="detail-label">Technician:</span> <span class="detail-value">${order.assignedExecutor}</span></div>
                <div class="detail-row"><span class="detail-label">Status:</span> <span class="detail-value">${order.status}</span></div>
                <div class="detail-row"><span class="detail-label">Type:</span> <span class="detail-value">Facility Maintenance</span></div>
              </div>
            </div>

            <table class="work-table">
              <thead>
                <tr>
                  <th>Description of Service</th>
                  <th style="text-align: right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span class="service-desc">${order.serviceCategory}</span>
                    <span class="service-sub">${order.serviceDescription}</span>
                  </td>
                  <td style="text-align: right; font-weight: 700;">EGP ${order.basePrice.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div class="summary-container">
              <div class="summary">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span>EGP ${order.basePrice.toLocaleString()}</span>
                </div>
                <div class="summary-row">
                  <span>Discount (${order.discount}%)</span>
                  <span>- EGP ${(order.basePrice * order.discount / 100).toLocaleString()}</span>
                </div>
                <div class="summary-row total-row">
                  <span>Total Amount</span>
                  <span>EGP ${order.finalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div class="footer-sig">
              <div class="signature-block">
                <div class="signature-label">Technician Authorization</div>
                <div class="signature-name">${order.assignedExecutor}</div>
              </div>
              <div class="signature-block">
                <div class="signature-label">Customer Acknowledgment</div>
                <div class="signature-name">${order.customerName}</div>
              </div>
            </div>

            <div class="notice">
              This document serves as proof of service. By signing above, the customer acknowledges that the mentioned services have been performed to their satisfaction.
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    // Wait for styles/fonts to load
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const getBadgeClass = (s: string) => {
    switch (s) {
      case 'Completed': return 'badge badge-complete';
      case 'In Progress': return 'badge badge-progress';
      case 'Not Completed': return 'badge bg-rose-50 text-rose-700';
      default: return 'badge badge-pending';
    }
  };

  const filtered = orders.filter(o => statusFilter === 'All' || o.status === statusFilter);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Fulfillment</div>
           <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Operations Hub</h1>
        </div>
        <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm">
          {['All', 'Pending', 'In Progress', 'Completed', 'Not Completed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-5 py-2 text-xs font-bold rounded-xl transition-all uppercase tracking-wider",
                statusFilter === s 
                  ? "bg-[var(--color-primary)] text-white shadow-lg shadow-green-500/20" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-24 flex flex-col items-center gap-4 text-slate-400 drop-shadow-sm">
           <RefreshCw className="w-10 h-10 animate-spin text-emerald-500" />
           <span className="font-bold text-xs uppercase tracking-widest">Syncing Orders...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {filtered.map(order => (
            <div key={order.id} className="card-modern group hover:translate-y-[-4px] transition-all duration-300">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</span>
                     <span className="font-mono text-xs font-bold text-slate-500 tracking-tighter">{order.id}</span>
                  </div>
                  <h3 className="font-black text-slate-900 tracking-tight text-lg">{order.serviceCategory}</h3>
                </div>
                <span className={getBadgeClass(order.status)}>
                   <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                   {order.status}
                </span>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1 shrink-0">Service</span>
                    <span className="text-right text-sm font-bold text-slate-700 leading-snug">{order.serviceDescription}</span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1 shrink-0">Address</span>
                    <span className="text-right text-xs font-bold text-slate-600 italic">"{order.address}"</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-emerald-600 shadow-sm text-sm">
                           {order.customerName.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-slate-900">{order.customerName}</span>
                           <span className="text-[10px] font-bold text-slate-400">{order.customerPhone}</span>
                        </div>
                     </div>
                     <span className="text-xs font-black text-slate-900">$ {order.finalPrice.toLocaleString()}</span>
                  </div>
                </div>

                {order.status === 'Not Completed' && order.notCompletedReason && (
                   <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-100 text-[11px] font-bold leading-relaxed">
                     <div className="uppercase tracking-widest opacity-60 mb-1">Issue Reported</div>
                     {order.notCompletedReason}
                   </div>
                )}
              </div>
              <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center mt-auto">
                <button 
                  onClick={() => handlePrint(order)}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <div className="flex items-center gap-3">
                  <select 
                     className="text-[11px] font-bold uppercase tracking-widest bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 py-2 pl-3 pr-8 shadow-sm cursor-pointer"
                     value={order.status}
                     disabled={updatingId === order.id}
                     onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  >
                     <option value="Pending">Pending</option>
                     <option value="In Progress">In Progress</option>
                     <option value="Completed">Completed</option>
                     <option value="Not Completed">Not Completed</option>
                  </select>
                  {updatingId === order.id && <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reasonModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4 text-red-600">
                  <AlertCircle className="w-6 h-6" />
                  <h3 className="font-semibold text-lg text-slate-900">Mark Not Completed</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4">Please provide a reason for not completing order {reasonModal.id}. This will notify the Call Center.</p>
                <textarea 
                  className="w-full text-sm border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-500 min-h-[100px]"
                  placeholder="e.g., Customer not at home, missing parts..."
                  value={reasonModal.reason}
                  onChange={e => setReasonModal({...reasonModal, reason: e.target.value})}
                />
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                  onClick={() => setReasonModal(null)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                  onClick={submitNotCompleted}
                  disabled={!reasonModal.reason.trim()}
                >
                  <Send className="w-4 h-4" /> Submit
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
