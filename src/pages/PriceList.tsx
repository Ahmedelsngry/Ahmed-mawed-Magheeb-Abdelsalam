import React, { useState, useEffect } from 'react';
import { collection, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import Papa from 'papaparse';
import { UploadCloud, Search, AlertCircle, FileSpreadsheet, Plus, X, RefreshCw } from 'lucide-react';
import { cn } from '../components/layout/AppLayout';

interface PriceItem {
  id: string;
  serviceCategory: string;
  serviceDescription: string;
  oldPrice: number;
  newPrice: number;
  discountPercent: number;
  acesPercent: number;
  finalPrice: number;
}

interface RowError {
  row: number;
  message: string;
}

export default function PriceList() {
  const { appUser } = useAuth();
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Partial<PriceItem>>({
    id: '', serviceCategory: '', serviceDescription: '', oldPrice: 0, newPrice: 0, discountPercent: 0, acesPercent: 25, finalPrice: 0
  });

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'priceList'));
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as PriceItem));
      setItems(fetched);
    } catch (err) {
      console.error(err);
      setError('Failed to load prices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const downloadTemplate = () => {
    const headers = ["ID", "serviceCategory", "serviceDescription", "oldPrice", "newPrice", "discountPercent", "acesPercent", "finalPrice"];
    const rows = [
      ["SRV-001", "Plumbing", "Faucet Repair", "500", "400", "-20%", "25", "500"]
    ];
    
    const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "fmplus_price_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.serviceCategory || !formData.serviceDescription) {
      setError('ID, Category, and Description are required.');
      return;
    }
    
    setUploading(true);
    setError(null);
    try {
      const item = {
        id: String(formData.id).trim(),
        serviceCategory: String(formData.serviceCategory).trim(),
        serviceDescription: String(formData.serviceDescription).trim(),
        oldPrice: Number(formData.oldPrice),
        newPrice: Number(formData.newPrice),
        discountPercent: Number(formData.discountPercent),
        acesPercent: Number(formData.acesPercent),
        finalPrice: Number(formData.finalPrice)
      };

      const ref = doc(db, 'priceList', item.id);
      const now = Date.now();
      await setDoc(ref, {
        ...item,
        createdAt: now,
        updatedAt: now
      });

      const auditRef = doc(collection(db, 'auditLogs'));
      await setDoc(auditRef, {
        id: auditRef.id,
        action: 'CREATE_PRICELIST_ITEM',
        collectionName: 'priceList',
        docId: item.id,
        userId: appUser?.uid,
        details: `Manually added price item ${item.id}`,
        createdAt: now
      });

      await fetchPrices();
      setShowAddForm(false);
      setFormData({ id: '', serviceCategory: '', serviceDescription: '', oldPrice: 0, newPrice: 0, discountPercent: 0, acesPercent: 25, finalPrice: 0 });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error adding item');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setRowErrors([]);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvData = event.target?.result;
      if (typeof csvData !== 'string') return;

      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().replace(/^\uFEFF/, ''),
        complete: async (results) => {
          try {
            const tempErrors: RowError[] = [];
            const seenIds = new Set<string>();
            const validParsed: PriceItem[] = [];

            const parseNum = (val: any) => {
              if (val === undefined || val === null || val === '') return 0;
              // Remove anything that isn't a digit, dot, or minus sign
              const cleaned = String(val).replace(/[^0-9.-]/g, '');
              const num = parseFloat(cleaned);
              return isNaN(num) ? 0 : num;
            };

            const isInvalidNum = (val: any) => {
              if (val === undefined || val === null || val === '') return false;
              const cleaned = String(val).replace(/[^0-9.-]/g, '');
              return isNaN(parseFloat(cleaned));
            };

            results.data.forEach((row: any, index: number) => {
              const rowNum = index + 1;
              const getVal = (key: string) => {
                const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
                return foundKey ? row[foundKey] : undefined;
              };

              const id = String(getVal('id') || '').trim();
              const serviceCategory = String(getVal('serviceCategory') || '').trim();
              const serviceDescription = String(getVal('serviceDescription') || '').trim();

              if (!id) {
                tempErrors.push({ row: rowNum, message: 'ID is missing' });
                return;
              }
              if (!serviceCategory) {
                tempErrors.push({ row: rowNum, message: 'Category is missing' });
                return;
              }
              if (!serviceDescription) {
                tempErrors.push({ row: rowNum, message: 'Description is missing' });
                return;
              }

              if (seenIds.has(id)) {
                tempErrors.push({ row: rowNum, message: `Duplicate ID in file: ${id}` });
                return;
              }
              seenIds.add(id);

              // Validate Number Formats
              const rawOld = getVal('oldPrice');
              const rawNew = getVal('newPrice');
              const rawDiscount = getVal('discountPercent');
              const rawAces = getVal('acesPercent');

              if (isInvalidNum(rawOld)) tempErrors.push({ row: rowNum, message: `Invalid number format for oldPrice: ${rawOld}` });
              if (isInvalidNum(rawNew)) tempErrors.push({ row: rowNum, message: `Invalid number format for newPrice: ${rawNew}` });
              if (isInvalidNum(rawDiscount)) tempErrors.push({ row: rowNum, message: `Invalid number format for discountPercent: ${rawDiscount}` });
              if (isInvalidNum(rawAces)) tempErrors.push({ row: rowNum, message: `Invalid number format for acesPercent: ${rawAces}` });

              const oldPrice = parseNum(rawOld);
              const newPrice = parseNum(rawNew);
              const discountPercent = parseNum(rawDiscount);
              const acesPercent = (rawAces === undefined || String(rawAces).trim() === '') ? 25 : parseNum(rawAces);
              
              // Auto-calculate final price if missing or incorrect
              // Based on data pattern: finalPrice = newPrice * (1 + acesPercent / 100)
              let finalPrice = parseNum(getVal('finalPrice'));
              const calculatedFinal = newPrice * (1 + Math.abs(acesPercent) / 100);
              
              if (!finalPrice || Math.abs(finalPrice - calculatedFinal) > 0.1) {
                finalPrice = calculatedFinal;
              }

              validParsed.push({
                id,
                serviceCategory,
                serviceDescription,
                oldPrice,
                newPrice,
                discountPercent: Math.abs(discountPercent), // Store absolute for display
                acesPercent,
                finalPrice
              });
            });

            setRowErrors(tempErrors);

            if (validParsed.length === 0) {
              throw new Error('No valid rows found to process.');
            }

            const batch = writeBatch(db);
            const currentDocs = await getDocs(collection(db, 'priceList'));
            currentDocs.docs.forEach(d => batch.delete(d.ref));

            const now = Date.now();
            validParsed.forEach(item => {
              const ref = doc(db, 'priceList', item.id);
              batch.set(ref, {
                ...item,
                createdAt: now,
                updatedAt: now
              });
            });

            await batch.commit();
            
            const auditRef = doc(collection(db, 'auditLogs'));
            await writeBatch(db).set(auditRef, {
              id: auditRef.id,
              action: 'UPLOAD_PRICELIST_CSV',
              collectionName: 'priceList',
              docId: 'batch',
              userId: appUser?.uid,
              details: `Uploaded ${validParsed.length} price items. ${tempErrors.length} errors found.`,
              createdAt: now
            }).commit();

            await fetchPrices();
            if (tempErrors.length > 0) {
              setError(`Uploaded ${validParsed.length} items successfully, skipped ${tempErrors.length} rows with errors.`);
            } else {
              setError(null);
            }
            e.target.value = ''; 
          } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error processing data');
          } finally {
            setUploading(false);
          }
        },
        error: (error) => {
          setError('Error parsing CSV: ' + error.message);
          setUploading(false);
        }
      });
    };

    reader.onerror = () => {
      setError('Error reading CSV file');
      setUploading(false);
    };

    // Use readAsText with UTF-8 to ensure Arabic characters are preserved
    reader.readAsText(file, 'UTF-8');
  };

  const filtered = items.filter(i => 
    i.serviceCategory.toLowerCase().includes(search.toLowerCase()) ||
    i.serviceDescription.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Commercial</div>
           <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Price Inventory</h1>
        </div>
        
        {appUser?.role === 'admin' && (
          <div className="flex flex-wrap items-center gap-3">
            <button 
               onClick={downloadTemplate}
               className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
            >
               <FileSpreadsheet className="w-4 h-4" /> Download CSV
            </button>
            <button 
               onClick={() => setShowAddForm(true)}
               className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10"
            >
               <Plus className="w-4 h-4" /> Add Service
            </button>
            <label className={cn(
              "px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-emerald-500/5",
              uploading && "opacity-50 pointer-events-none"
            )}>
              <UploadCloud className="w-4 h-4" />
              {uploading ? 'Processing...' : 'Sync CSV'}
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </label>
          </div>
        )}
      </div>

      {error && !rowErrors.length && (
        <div className="p-5 bg-rose-50 text-rose-700 border border-rose-100 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-rose-500/10 rounded-full blur-xl"></div>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-bold">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600 font-extrabold text-lg">×</button>
        </div>
      )}

      {rowErrors.length > 0 && (
        <div className="p-6 bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center">
               <AlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <p className="font-black text-sm uppercase tracking-widest underline decoration-amber-300 underline-offset-4">Import Conflict Log</p>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2 text-xs font-bold font-mono bg-white/50 p-4 rounded-xl border border-amber-100">
            {rowErrors.map((err, idx) => (
              <div key={idx} className="flex gap-4">
                <span className="text-amber-600 shrink-0">L:{err.row}</span>
                <span className="opacity-80">{err.message}</span>
              </div>
            ))}
          </div>
          {items.length > 0 && (
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-60 italic text-left">Partial sync complete. Address conflicts listed above.</p>
          )}
        </div>
      )}

      <div className="card-modern overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center">
          <div className="relative max-w-sm w-full group">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search catalog by keyword..."
              className="w-full pl-11 pr-5 py-3 tracking-tight bg-white rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all text-sm font-bold text-slate-700 shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Identifier</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Breakdown</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Standard</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Promotion</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-emerald-600 uppercase tracking-widest">Net Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                     <RefreshCw className="w-10 h-10 animate-spin mx-auto text-slate-200 mb-4" />
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Catalog Sync...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center opacity-30 grayscale">
                       <FileSpreadsheet className="w-16 h-16 mb-4" />
                       <p className="text-sm font-bold uppercase tracking-widest">No matching results</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5 font-mono text-xs font-bold text-slate-400 tracking-tighter group-hover:text-slate-900 transition-colors">{item.id}</td>
                    <td className="px-6 py-5">
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                          {item.serviceCategory}
                       </span>
                    </td>
                    <td className="px-6 py-5">
                       <div className="font-bold text-slate-900 tracking-tight text-sm leading-tight">{item.serviceDescription}</div>
                    </td>
                    <td className="px-6 py-5 text-right font-medium text-slate-400 line-through text-xs">
                       ${item.oldPrice.toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-right font-black text-slate-500 text-xs">
                       ${item.newPrice.toLocaleString()}
                       <span className="ml-2 py-0.5 px-1.5 bg-rose-50 text-rose-600 rounded-md text-[9px]">-{item.discountPercent}%</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <span className="text-sm font-black text-slate-900 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                          ${item.finalPrice.toLocaleString()}
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div>
                  <span className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-1 block">New Entry</span>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add Service Portfolio</h2>
               </div>
               <button onClick={() => setShowAddForm(false)} className="w-12 h-12 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm">
                 <X className="w-5 h-5"/>
               </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-10 space-y-8 text-left overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Portfolio ID</label>
                   <input required className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 text-sm font-bold tracking-tight" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} placeholder="SRV-77" />
                </div>
                <div className="space-y-2">
                   <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Department</label>
                   <input required className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 text-sm font-bold tracking-tight" value={formData.serviceCategory} onChange={e => setFormData({...formData, serviceCategory: e.target.value})} placeholder="e.g. Electrical" />
                </div>
                <div className="space-y-2 md:col-span-2">
                   <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Detailed Service Scope</label>
                   <input required className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 text-sm font-bold tracking-tight" value={formData.serviceDescription} onChange={e => setFormData({...formData, serviceDescription: e.target.value})} placeholder="Internal Switch Replacement (L1)" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-slate-50 p-8 rounded-3xl border border-slate-100">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Standard</label>
                   <input type="number" required className="w-full p-2 bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 text-base font-black text-slate-700" value={formData.oldPrice} onChange={e => setFormData({...formData, oldPrice: Number(e.target.value)})} />
                </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Promoted</label>
                   <input type="number" required className="w-full p-2 bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 text-base font-black text-slate-700" value={formData.newPrice} onChange={e => {
                       const np = Number(e.target.value);
                       const dp = formData.discountPercent || 0;
                       setFormData({...formData, newPrice: np, finalPrice: np * (1 - dp/100)});
                   }} />
                </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Flash Disc %</label>
                   <input type="number" required className="w-full p-2 bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 text-base font-black text-emerald-600" value={formData.discountPercent} onChange={e => {
                       const dp = Number(e.target.value);
                       const np = formData.newPrice || 0;
                       setFormData({...formData, discountPercent: dp, finalPrice: np * (1 - dp/100)});
                   }} />
                </div>
                 <div className="space-y-1 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ACES Commission %</label>
                    <input type="number" required className="w-full p-2 bg-transparent border-b border-slate-300 outline-none focus:border-emerald-500 text-base font-bold text-slate-700" value={formData.acesPercent} onChange={e => setFormData({...formData, acesPercent: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-1 md:col-span-2">
                   <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Calculated Final (Gross)</label>
                   <div className="p-2 text-xl font-black text-slate-900">$ {formData.finalPrice?.toLocaleString()}</div>
                </div>
              </div>

              <div className="flex justify-end gap-5 pt-8">
                 <button type="button" onClick={() => setShowAddForm(false)} className="px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Discard Change</button>
                 <button type="submit" disabled={uploading} className="px-10 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[2px] shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {uploading ? 'Processing Architecture...' : 'Commit Portfolio Entry'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
