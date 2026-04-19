import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { 
  Building2,
  LayoutDashboard, 
  PhoneCall, 
  Wrench, 
  FileSpreadsheet, 
  Settings,
  LogOut,
  Menu
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'call_center', 'operations'] },
  { name: 'Call Center', path: '/call-center', icon: PhoneCall, roles: ['admin', 'call_center'] },
  { name: 'Operations', path: '/operations', icon: Wrench, roles: ['admin', 'operations', 'executor', 'call_center'] },
  { name: 'Price List', path: '/price-list', icon: FileSpreadsheet, roles: ['admin', 'call_center'] },
  { name: 'Admin Hub', path: '/admin', icon: Settings, roles: ['admin'] },
];

export default function AppLayout() {
  const { user, appUser, logout } = useAuth();
  const location = useLocation();

  if (!user || !appUser) {
    return <Navigate to="/login" replace />;
  }

  const allowedNavItems = navItems.filter(item => item.roles.includes(appUser.role));

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)] flex font-sans">
      {/* Sidebar */}
      <aside className="w-[260px] bg-white border-r border-[var(--color-border-main)] flex flex-col shrink-0">
        <div className="p-8 pb-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">FMPLUS</span>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full">v2</span>
          </div>
        </div>
        
        <div className="px-4 mb-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest px-8">Main Menu</div>
        <nav className="flex-1 px-4 flex flex-col gap-1">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                            (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-4 py-3 rounded-xl flex items-center gap-3 text-[14px] font-medium transition-all group",
                  isActive 
                    ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-[var(--color-primary)]" : "text-slate-400 group-hover:text-slate-900")} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-6">
          <div className="bg-slate-900 rounded-2xl p-4 text-white relative overflow-hidden group cursor-pointer">
             <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/40 transition-all"></div>
             <p className="text-xs font-bold text-emerald-400 mb-1">Scale Productivity</p>
             <p className="text-[10px] text-slate-400 mb-3">Upgrade to FMPLUS Enterprise for advanced analytics.</p>
             <button className="w-full py-2 bg-white text-slate-900 rounded-lg text-[11px] font-bold hover:bg-emerald-50 transition-colors">Upgrade Now</button>
          </div>
        </div>

        <div className="p-6 pt-0 flex justify-between items-center text-[11px] text-slate-400 font-medium">
            <span>© 2026 FMPLUS Inc.</span>
            <button onClick={logout} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors" title="Logout">
                <LogOut className="w-4 h-4" />
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="h-[80px] bg-transparent flex items-center px-8 justify-between shrink-0">
            <div className="flex flex-col">
              <div className="text-sm font-bold text-slate-400">Welcome Back,</div>
              <div className="text-2xl font-extrabold tracking-tight text-slate-900">
                {location.pathname === '/' ? `Hello, ${appUser.name.split(' ')[0]} 👋` : allowedNavItems.find(i => i.path === location.pathname)?.name || 'Command Center'}
              </div>
            </div>
            
            <div className="flex items-center gap-6">
                <div className="relative group lg:block hidden">
                  <input 
                    type="text" 
                    placeholder="Search records..." 
                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-64 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  </div>
                </div>

                <div className="h-10 w-px bg-slate-200 lg:block hidden"></div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-bold text-slate-900">{appUser.name}</div>
                      <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">{appUser.role?.replace('_', ' ') || ''}</div>
                    </div>
                    <div className="w-11 h-11 bg-white border-2 border-emerald-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm">
                        <span className="text-sm font-black text-emerald-600">
                          {appUser.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>
        </header>

        <div className="flex-1 overflow-auto p-8 pt-2">
          <div className="mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
