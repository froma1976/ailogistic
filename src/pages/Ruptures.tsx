import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { format, addDays } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FileDown, Printer, AlertTriangle, TrendingDown, Clock } from 'lucide-react';

export const RupturesPage: React.FC = () => {
    const references = useLiveQuery(() => db.part_references.toArray());
    const logs = useLiveQuery(() => db.inventory_log.toArray());
    const productions = useLiveQuery(() => db.production.orderBy('date').reverse().limit(1).toArray());

    const ruptureData = useMemo(() => {
        if (!references || !logs || !productions) return [];
        const latestProd = productions[0]?.quantity || 0;
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const logsToday = logs.filter(l => l.date === todayStr);

        return references.map(ref => {
            const stockLog = logsToday.find(l => l.reference_code === ref.code);
            const currentStock = stockLog?.total || 0;
            const consumption = latestProd * (ref.consumption_coef || 0);

            let daysRemaining = 999;
            let ruptureDate = new Date();

            if (consumption > 0) {
                daysRemaining = currentStock / consumption;
                ruptureDate = addDays(new Date(), daysRemaining);
            } else {
                daysRemaining = 999;
                ruptureDate = new Date('2099-12-31');
            }

            return {
                code: ref.code,
                description: ref.description,
                stock: currentStock,
                coef: ref.consumption_coef,
                consumption,
                days: daysRemaining,
                date: ruptureDate
            };
        }).sort((a, b) => a.days - b.days);

    }, [references, logs, productions]);

    // Stats
    const critical = ruptureData.filter(d => d.days <= 2).length;
    const warning = ruptureData.filter(d => d.days > 2 && d.days <= 5).length;
    const safe = ruptureData.filter(d => d.days > 5).length;

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('INFORME DE RUPTURAS SKD', 14, 20);
        doc.setFontSize(12);
        doc.text(`Fecha de generación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

        const tableData = ruptureData.map(d => [
            d.code,
            d.description,
            d.stock,
            d.coef,
            d.days > 900 ? '∞' : d.days.toFixed(1),
            format(d.date, 'dd/MM/yyyy')
        ]);

        autoTable(doc, {
            head: [['Código', 'Descripción', 'Stock', 'Coef', 'Días', 'Fecha Ruptura']],
            body: tableData,
            startY: 40,
        });
        doc.save('rupturas_skd.pdf');
    };

    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(ruptureData.map(d => ({
            Codigo: d.code,
            Descripcion: d.description,
            Stock: d.stock,
            Coeficiente: d.coef,
            Dias_Restantes: d.days > 900 ? 'INF' : d.days.toFixed(2),
            Fecha_Ruptura: format(d.date, 'dd/MM/yyyy')
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rupturas');
        XLSX.writeFile(wb, 'rupturas_skd.xlsx');
    };

    const getStatusBadge = (days: number) => {
        if (days <= 2) return { bg: '#ffebee', text: '#d32f2f', label: 'Crítico' };
        if (days <= 5) return { bg: '#fff3e0', text: '#f57c00', label: 'Alerta' };
        return { bg: '#e8f5e9', text: '#388e3c', label: 'OK' };
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl text-white" style={{ backgroundColor: '#243782' }}>
                        <AlertTriangle size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: '#243782' }}>Análisis de Rupturas</h1>
                        <p className="text-slate-500 text-sm">Previsión de agotamiento de stock</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={exportPDF} className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                        <Printer size={18} /> PDF
                    </button>
                    <button onClick={exportExcel} className="px-4 py-2 text-white rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition-opacity" style={{ backgroundColor: '#243782' }}>
                        <FileDown size={18} /> Excel
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#ffebee' }}>
                        <AlertTriangle size={24} style={{ color: '#d32f2f' }} />
                    </div>
                    <div>
                        <div className="text-3xl font-bold" style={{ color: '#d32f2f' }}>{critical}</div>
                        <div className="text-sm text-slate-500">Críticos (≤2 días)</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#fff3e0' }}>
                        <TrendingDown size={24} style={{ color: '#f57c00' }} />
                    </div>
                    <div>
                        <div className="text-3xl font-bold" style={{ color: '#f57c00' }}>{warning}</div>
                        <div className="text-sm text-slate-500">En alerta (3-5 días)</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#e8f5e9' }}>
                        <Clock size={24} style={{ color: '#388e3c' }} />
                    </div>
                    <div>
                        <div className="text-3xl font-bold" style={{ color: '#388e3c' }}>{safe}</div>
                        <div className="text-sm text-slate-500">Seguros (&gt;5 días)</div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-lg" style={{ color: '#243782' }}>Detalle por Referencia</h3>
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden">
                    {ruptureData.map((item, idx) => {
                        const status = getStatusBadge(item.days);
                        return (
                            <div key={idx} className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800 text-lg">{item.code}</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: status.bg, color: status.text }}>
                                            {status.label}
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-500 line-clamp-1">{item.description}</div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        Stock: <span className="font-bold text-slate-600">{item.stock}</span> ·
                                        Días: <span className="font-bold" style={{ color: status.text }}>{item.days > 900 ? '∞' : item.days.toFixed(1)}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 italic">
                                        Ruptura: {format(item.date, 'dd/MM/yyyy')}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 font-medium">Consumo</div>
                                    <div className="text-sm font-bold text-slate-600">{item.consumption.toFixed(1)}/d</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                                <th className="text-left py-3 px-5 font-semibold">Referencia</th>
                                <th className="text-left py-3 px-5 font-semibold">Stock</th>
                                <th className="text-left py-3 px-5 font-semibold">Consumo/día</th>
                                <th className="text-left py-3 px-5 font-semibold">Días Restantes</th>
                                <th className="text-left py-3 px-5 font-semibold">Fecha Ruptura</th>
                                <th className="text-left py-3 px-5 font-semibold">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {ruptureData.map((item, idx) => {
                                const status = getStatusBadge(item.days);
                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-5">
                                            <div className="font-semibold text-slate-800">{item.code}</div>
                                            <div className="text-xs text-slate-400 truncate max-w-[200px]">{item.description}</div>
                                        </td>
                                        <td className="py-3 px-5 font-bold text-slate-700">{item.stock}</td>
                                        <td className="py-3 px-5 text-slate-600">{item.consumption.toFixed(1)}</td>
                                        <td className="py-3 px-5 font-bold" style={{ color: status.text }}>
                                            {item.days > 900 ? '∞' : item.days.toFixed(1)}
                                        </td>
                                        <td className="py-3 px-5 text-slate-600">{format(item.date, 'dd/MM/yyyy')}</td>
                                        <td className="py-3 px-5">
                                            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: status.bg, color: status.text }}>
                                                {status.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {!ruptureData.length && (
                    <div className="text-center py-12 text-slate-400">
                        <AlertTriangle size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No hay datos de ruptura disponibles</p>
                    </div>
                )}
            </div>
        </div>
    );
};
