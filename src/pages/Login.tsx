import React, { useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { Navigate } from 'react-router-dom';
import { Building2, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { user, appUser, login } = useAuth();

  if (user && appUser) {
    return <Navigate to="/" replace />;
  }

  // Prevent flash of login while we fetch appUser in AuthProvider
  if (user && !appUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
         <p className="mt-4 text-sm text-slate-500 font-medium">Verifying Enterprise Access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
            <Building2 className="w-8 h-8 text-white transform rotate-6" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          FMPLUS <span className="text-blue-600">R3</span>
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Service Order Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-slate-100">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-center mb-6 text-slate-500">
                <ShieldCheck className="w-12 h-12 text-slate-300" />
              </div>
              <p className="text-sm text-center text-slate-600 mb-6">
                Enterprise portal access is strictly restricted to authorized FMPLUS personnel.
              </p>
              <button
                onClick={login}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Sign in with Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
