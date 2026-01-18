import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Factory, AlertTriangle, Wifi, WifiOff, Settings, LogOut, X } from 'lucide-react';
import { useSync } from '../context/SyncContext';

interface SidebarProps {
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
    const { pathname } = useLocation();
    const { isOnline, isSyncing } = useSync();

    const navItems = [
        { path: '/', label: 'Inicio', icon: LayoutDashboard },
        { path: '/inventory', label: 'Inventario', icon: ClipboardList },
        { path: '/production', label: 'Producción', icon: Factory },
        { path: '/ruptures', label: 'Rupturas', icon: AlertTriangle },
    ];

    return (
        <div className="flex flex-col h-full text-white shadow-xl" style={{ backgroundColor: '#243782' }}>
            {/* Brand */}
            <div className="p-6 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center font-bold text-xl shadow-lg" style={{ color: '#243782' }}>
                        <svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor">
                            <path d="M16 2L2 9v14l14 7 14-7V9L16 2zm0 4l10 5-10 5-10-5 10-5zm-12 8l12 6v8l-12-6v-8zm14 6l12-6v8l-12 6v-8z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-wide">FERLOGISTIC</h1>
                        <p className="text-xs text-white/60">Gestión de Inventario</p>
                    </div>
                </div>
                <button onClick={onClose} className="lg:hidden p-1 text-white/60 hover:text-white">
                    <X size={24} />
                </button>
            </div>

            {/* Status Card */}
            <div className="px-4 py-4">
                <div className={`p-3 rounded-lg flex items-center gap-3 text-sm font-medium ${isOnline ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                    {isSyncing ? (
                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    ) : isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
                    <span>{isSyncing ? 'Sincronizando...' : isOnline ? 'En línea' : 'Modo Desconectado'}</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1">
                {navItems.map(({ path, label, icon: Icon }) => (
                    <Link
                        key={path}
                        to={path}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${pathname === path
                            ? 'bg-white text-[#243782] shadow-lg translate-x-1 font-bold'
                            : 'text-white/70 hover:bg-white/10 hover:text-white hover:translate-x-1'
                            }`}
                    >
                        <Icon size={20} className={`${pathname === path ? '' : 'opacity-70 group-hover:opacity-100'}`} />
                        <span className="font-medium">{label}</span>
                    </Link>
                ))}
            </nav>

            {/* Footer / Settings */}
            <div className="p-4 border-t border-white/10 space-y-2">
                <button className="flex w-full items-center gap-3 px-4 py-3 text-white/60 hover:bg-white/10 hover:text-white rounded-lg transition-colors">
                    <Settings size={20} />
                    <span className="font-medium">Ajustes</span>
                </button>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-white/60 hover:bg-white/10 hover:text-red-300 rounded-lg transition-colors">
                    <LogOut size={20} />
                    <span className="font-medium">Salir</span>
                </button>
            </div>
        </div>
    );
};
