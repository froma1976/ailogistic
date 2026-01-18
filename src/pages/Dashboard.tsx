import React from 'react';
import { Package, TrendingDown, AlertTriangle, RefreshCw, MoreVertical, FileDown, ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
    const references = useLiveQuery(() => db.part_references.toArray());
    const production = useLiveQuery(() => db.production.orderBy('date').last());
    const logs = useLiveQuery(() => db.inventory_log.toArray());

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayLogs = logs?.filter(l => l.date === todayStr) || [];

    // Calculate stats
    const totalRefs = references?.length || 0;
    const lowStockCount = todayLogs.filter(l => (l.total || 0) < 50).length;
    const criticalCount = todayLogs.filter(l => (l.total || 0) < 20).length;
    const totalStock = todayLogs.reduce((sum, l) => sum + (l.total || 0), 0);

    // Get recent inventory items for table
    const recentItems = todayLogs.slice(0, 6).map(log => {
        const ref = references?.find(r => r.code === log.reference_code);
        return {
            code: log.reference_code,
            description: ref?.description || '-',
            stock: log.total || 0,
            status: (log.total || 0) < 20 ? 'critical' : (log.total || 0) < 50 ? 'low' : 'ok',
            lastUpdate: log.created_at ? format(new Date(log.created_at), 'dd/MM/yyyy') : todayStr
        };
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: '#243782' }}>Gestión de Inventario</h1>
                    <p className="text-slate-500 text-sm">Panel de control SKD - Sistema de gestión</p>
                </div>
                <div className="flex items-center gap-3">
                    <select className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Este Mes</option>
                        <option>Esta Semana</option>
                        <option>Hoy</option>
                    </select>
                    <button className="px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: '#243782' }}>
                        <FileDown size={18} /> Exportar
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Referencias"
                    value={totalRefs}
                    subtitle="en inventario"
                    icon={Package}
                    iconBg="#e3f2fd"
                    iconColor="#1976d2"
                />
                <StatCard
                    title="Stock Bajo"
                    value={lowStockCount}
                    subtitle="necesitan reposición"
                    icon={TrendingDown}
                    iconBg="#fff3e0"
                    iconColor="#f57c00"
                />
                <StatCard
                    title="Stock Crítico"
                    value={criticalCount}
                    subtitle="por debajo del mínimo"
                    icon={AlertTriangle}
                    iconBg="#ffebee"
                    iconColor="#d32f2f"
                />
                <StatCard
                    title="Piezas Totales"
                    value={totalStock.toLocaleString()}
                    subtitle="en almacén hoy"
                    icon={RefreshCw}
                    iconBg="#e8f5e9"
                    iconColor="#388e3c"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inventory Status Overview */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-lg" style={{ color: '#243782' }}>Estado del Inventario</h3>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Link to="/inventory" className="text-sm font-medium flex items-center gap-1 hover:underline" style={{ color: '#243782' }}>
                                Ver todo <ChevronRight size={16} />
                            </Link>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                                    <th className="text-left py-3 px-5 font-semibold">Referencia</th>
                                    <th className="text-left py-3 px-5 font-semibold">Stock Actual</th>
                                    <th className="text-left py-3 px-5 font-semibold">Estado</th>
                                    <th className="text-left py-3 px-5 font-semibold">Últ. Actualización</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {recentItems.length > 0 ? recentItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-5">
                                            <div className="font-semibold text-slate-800">{item.code}</div>
                                            <div className="text-xs text-slate-400 truncate max-w-[200px]">{item.description}</div>
                                        </td>
                                        <td className="py-3 px-5 font-bold text-slate-700">{item.stock}</td>
                                        <td className="py-3 px-5">
                                            <StatusBadge status={item.status} />
                                        </td>
                                        <td className="py-3 px-5 text-sm text-slate-500">{item.lastUpdate}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-slate-400">No hay datos de inventario para hoy</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Distribution Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg" style={{ color: '#243782' }}>Distribución</h3>
                        <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={20} /></button>
                    </div>

                    {/* Simple Distribution Chart */}
                    <div className="flex justify-center mb-6">
                        <div className="relative w-40 h-40">
                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e8f5e9" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#388e3c" strokeWidth="3"
                                    strokeDasharray={`${Math.max(0, 100 - lowStockCount - criticalCount)} 100`} strokeLinecap="round" />
                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f57c00" strokeWidth="3"
                                    strokeDasharray={`${lowStockCount} 100`} strokeDashoffset={`-${100 - lowStockCount - criticalCount}`} strokeLinecap="round" />
                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#d32f2f" strokeWidth="3"
                                    strokeDasharray={`${criticalCount} 100`} strokeDashoffset={`-${100 - criticalCount}`} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-2xl font-bold" style={{ color: '#243782' }}>{totalRefs}</span>
                                <span className="text-xs text-slate-400">Total</span>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-3">
                        <LegendItem color="#388e3c" label="Stock Normal" value={`${Math.max(0, totalRefs - lowStockCount - criticalCount)}`} />
                        <LegendItem color="#f57c00" label="Stock Bajo" value={`${lowStockCount}`} />
                        <LegendItem color="#d32f2f" label="Stock Crítico" value={`${criticalCount}`} />
                    </div>
                </div>
            </div>

            {/* Production Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg" style={{ color: '#243782' }}>Información de Producción</h3>
                    <Link to="/production" className="text-sm font-medium flex items-center gap-1 hover:underline" style={{ color: '#243782' }}>
                        Ir a Producción <ChevronRight size={16} />
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="text-sm text-slate-500 mb-1">Última Producción</div>
                        <div className="text-xl font-bold" style={{ color: '#243782' }}>{production?.quantity || 0} coches</div>
                        <div className="text-xs text-slate-400">{production?.date ? format(new Date(production.date), 'dd/MM/yyyy') : 'Sin datos'}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="text-sm text-slate-500 mb-1">Estado Sincronización</div>
                        <div className="text-xl font-bold text-emerald-600">Conectado</div>
                        <div className="text-xs text-slate-400">Última sync: hace 2 min</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="text-sm text-slate-500 mb-1">Fecha Sistema</div>
                        <div className="text-xl font-bold" style={{ color: '#243782' }}>{format(new Date(), 'dd/MM/yyyy')}</div>
                        <div className="text-xs text-slate-400">{format(new Date(), 'EEEE')}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, iconBg, iconColor }: any) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold mb-1" style={{ color: '#243782' }}>{value}</h3>
                <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: iconBg }}>
                <Icon size={24} style={{ color: iconColor }} />
            </div>
        </div>
    </div>
);

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
        ok: { bg: '#e8f5e9', text: '#388e3c', label: 'Normal' },
        low: { bg: '#fff3e0', text: '#f57c00', label: 'Bajo' },
        critical: { bg: '#ffebee', text: '#d32f2f', label: 'Crítico' }
    };
    const s = styles[status] || styles.ok;
    return (
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: s.bg, color: s.text }}>
            {s.label}
        </span>
    );
};

// Legend Item Component
const LegendItem = ({ color, label, value }: { color: string; label: string; value: string }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
            <span className="text-sm text-slate-600">{label}</span>
        </div>
        <span className="text-sm font-bold text-slate-700">{value}</span>
    </div>
);
