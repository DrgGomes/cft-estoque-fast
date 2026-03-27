import React, { useContext } from 'react';
import { AppProvider, AppContext } from './AppContext';
import Login from './pages/Login';
import Fornecedor from './pages/Fornecedor';
import Revendedor from './pages/Revendedor';
import SuperAdmin from './pages/SuperAdmin';
import { RefreshCw } from 'lucide-react';

function AppRouter() {
    const { globalLoading, isSuperAdminMode, superAdminAuthenticated, selectedRole } = useContext(AppContext);

    if (globalLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <RefreshCw className="animate-spin text-blue-500 w-12 h-12"/>
            </div>
        );
    }
    
    if (isSuperAdminMode && !superAdminAuthenticated) return <SuperAdmin />;
    if (isSuperAdminMode && superAdminAuthenticated) return <SuperAdmin />;
    if (!selectedRole) return <Login />;
    if (selectedRole === 'user') return <Revendedor />;
    if (selectedRole === 'admin') return <Fornecedor />;
    
    return null;
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}