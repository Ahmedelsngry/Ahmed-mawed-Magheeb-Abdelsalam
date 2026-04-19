/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CallCenter from './pages/CallCenter';
import Operations from './pages/Operations';
import PriceList from './pages/PriceList';
import Admin from './pages/Admin';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="call-center" element={<CallCenter />} />
            <Route path="operations" element={<Operations />} />
            <Route path="price-list" element={<PriceList />} />
            <Route path="admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
