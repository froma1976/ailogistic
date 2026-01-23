import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { format } from 'date-fns';
import { Factory, Save, Calendar, BarChart2, Calculator, FileDown, Edit2, TrendingUp, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

export const ProductionPage: React.FC = () => {
    const [viewMode, setViewMode] = useState<'daily' | 'simulation'>('daily');

    // --- DAILY ENTRY STATE ---
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [quantity, setQuantity] = useState<number | ''>('');
    const history = useLiveQuery(() => db.production.orderBy('date').reverse().toArray());

    // --- SIMULATION STATE ---
    const [weekInput, setWeekInput] = useState<{ [key: string]: number | '' }>({
        lunes: '', martes: '', miercoles: '', jueves: '', viernes: '', sabado: '', domingo: ''
    });

    const references = useLiveQuery(() => db.part_references.toArray());
    const inventoryLogs = useLiveQuery(() => db.inventory_log.toArray());

    const totalWeeklyProduction = Object.values(weekInput).reduce((acc: number, curr) => acc + (Number(curr) || 0), 0);
    const dayNames = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    const simulationResults = useMemo(() => {
        if (!references) return [];

        const latestStockMap = new Map<string, number>();
        if (inventoryLogs) {
            const sortedLogs = [...inventoryLogs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            for (const log of sortedLogs) {
                const refCode = log.reference_code || '';
                if (refCode && !latestStockMap.has(refCode)) {
                    latestStockMap.set(refCode, log.total || 0);
                }
            }
        }

        const dailyProduction = dayNames.map(day => Number(weekInput[day]) || 0);
        const totalWeekly = dailyProduction.reduce((a, b) => a + b, 0);

        return references.map(ref => {
            const initialStock = latestStockMap.get(ref.code) || 0;
            const coef = ref.consumption_coef || 0;

            let runningStock = initialStock;
            let ruptureDay: string | null = null;
            const dailyBalance: number[] = [];

            for (let i = 0; i < 7; i++) {
                const dailyConsumption = dailyProduction[i] * coef;
                runningStock -= dailyConsumption;
                dailyBalance.push(runningStock);

                if (runningStock < 0 && !ruptureDay) {
                    ruptureDay = dayNames[i];
                }
            }

            return {
                code: ref.code,
                description: ref.description,
                initialStock,
                coef,
                required: totalWeekly * coef,
                finalBalance: runningStock,
                ruptureDay,
                dailyBalance
            };
        }).sort((a, b) => a.finalBalance - b.finalBalance);

    }, [references, inventoryLogs, weekInput]);

    // Stats for simulation
    const ruptureCount = simulationResults.filter(r => r.ruptureDay).length;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quantity || !date) return;

        try {
            const prodDate = date;
            const newQty = Number(quantity);

            // 1. Get previous production to calculate difference
            const existingProd = await db.production.get(prodDate);
            const oldQty = existingProd?.quantity || 0;
            const diffQty = newQty - oldQty;

            // 2. Save production record
            const prod = {
                date: prodDate,
                quantity: newQty,
                updated_at: new Date().toISOString()
            };

            await db.production.put(prod);
            await db.sync_queue.add({
                table: 'production',
                operation: 'UPDATE',
                payload: prod,
                status: 'PENDING',
                created_at: Date.now()
            });

            // 3. DISCOUNT FROM INVENTORY if there is a change in quantity
            if (diffQty !== 0) {
                const refs = await db.part_references.toArray();

                for (const ref of refs) {
                    const coef = ref.consumption_coef || 0;
                    if (coef <= 0) continue;

                    const consumptionChange = diffQty * coef;

                    // Find inventory logs for this reference for this date or later
                    const logsToUpdate = await db.inventory_log
                        .where('reference_code').equals(ref.code)
                        .toArray();

                    const filteredLogs = logsToUpdate.filter(l => l.date >= prodDate);

                    if (filteredLogs.length > 0) {
                        // Update all existing logs from that date onwards
                        for (const log of filteredLogs) {
                            const newTotal = (log.total || 0) - consumptionChange;
                            const ua = ref.pieces_per_ua || 1;
                            const updatedLog = {
                                ...log,
                                total: newTotal,
                                groupings: Math.floor(newTotal / ua),
                                loose: Math.round(newTotal % ua),
                                created_at: new Date().toISOString()
                            };
                            await db.inventory_log.put(updatedLog);
                            await db.sync_queue.add({
                                table: 'inventory_log',
                                operation: 'UPDATE',
                                payload: updatedLog,
                                status: 'PENDING',
                                created_at: Date.now()
                            });
                        }
                    } else {
                        // If no logs exist from that date onwards, create a new one based on latest known stock
                        const allLogsForRef = await db.inventory_log
                            .where('reference_code').equals(ref.code)
                            .toArray();

                        const previousLogs = allLogsForRef
                            .filter(l => l.date < prodDate)
                            .sort((a, b) => b.date.localeCompare(a.date));

                        const baseStock = previousLogs.length > 0 ? (previousLogs[0].total || 0) : 0;
                        const newTotal = baseStock - (newQty * coef);

                        const ua = ref.pieces_per_ua || 1;
                        const newLog = {
                            id: crypto.randomUUID(),
                            date: prodDate,
                            reference_code: ref.code,
                            total: newTotal,
                            groupings: Math.floor(newTotal / ua),
                            loose: Math.round(newTotal % ua),
                            created_at: new Date().toISOString()
                        };
                        await db.inventory_log.add(newLog);
                        await db.sync_queue.add({
                            table: 'inventory_log',
                            operation: 'INSERT',
                            payload: newLog,
                            status: 'PENDING',
                            created_at: Date.now()
                        });
                    }
                }
            }

            setQuantity('');
            alert('Producción guardada e inventario actualizado');
        } catch (err) {
            console.error(err);
            alert('Error al guardar la producción');
        }
    };

    const handleExportSimulation = () => {
        const dataToExport = simulationResults.map(item => ({
            Codigo: item.code,
            Descripcion: item.description,
            Stock_Inicial: item.initialStock,
            Coeficiente: item.coef,
            Necesario_Semana: item.required.toFixed(0),
            Balance_Final: item.finalBalance.toFixed(0),
            Dia_Ruptura: item.ruptureDay ?? 'OK'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Simulacion Semanal');
        XLSX.writeFile(wb, `Simulacion_Produccion_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl text-white" style={{ backgroundColor: '#243782' }}>
                        <Factory size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: '#243782' }}>Producción</h1>
                        <p className="text-slate-500 text-sm">Gestión y planificación de producción</p>
                    </div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('daily')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'daily' ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        style={viewMode === 'daily' ? { backgroundColor: '#243782' } : {}}
                    >
                        Registro Diario
                    </button>
                    <button
                        onClick={() => setViewMode('simulation')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'simulation' ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        style={viewMode === 'simulation' ? { backgroundColor: '#243782' } : {}}
                    >
                        Simulación Semanal
                    </button>
                </div>
            </div>

            {viewMode === 'daily' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <h3 className="font-bold text-lg mb-6" style={{ color: '#243782' }}>Nuevo Registro</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">Fecha Producción</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="date"
                                        className="w-full pl-12 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">Coches Producidos</label>
                                <div className="relative">
                                    <BarChart2 className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="number"
                                        className="w-full pl-12 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-xl font-bold"
                                        value={quantity}
                                        onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 hover:opacity-90"
                                style={{ backgroundColor: '#243782' }}
                            >
                                <Save size={20} /> GUARDAR
                            </button>
                        </form>
                    </div>

                    {/* History Panel */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h3 className="font-bold text-lg" style={{ color: '#243782' }}>Historial de Producción</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="text-left py-3 px-5 font-semibold">Fecha</th>
                                        <th className="text-left py-3 px-5 font-semibold">Cantidad</th>
                                        <th className="text-left py-3 px-5 font-semibold">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {history?.slice(0, 10).map(item => (
                                        <tr key={item.date} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-5">
                                                <div className="font-semibold text-slate-800">{format(new Date(item.date), 'dd/MM/yyyy')}</div>
                                                <div className="text-xs text-slate-400">{format(new Date(item.date), 'EEEE')}</div>
                                            </td>
                                            <td className="py-3 px-5">
                                                <span className="text-2xl font-bold" style={{ color: '#243782' }}>{item.quantity}</span>
                                                <span className="text-slate-400 ml-1">coches</span>
                                            </td>
                                            <td className="py-3 px-5">
                                                <button
                                                    onClick={() => { setDate(item.date); setQuantity(item.quantity ?? ''); }}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {!history?.length && (
                            <div className="text-center py-12 text-slate-400">No hay registros de producción</div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                            <div className="p-3 rounded-xl" style={{ backgroundColor: '#e3f2fd' }}>
                                <TrendingUp size={24} style={{ color: '#1976d2' }} />
                            </div>
                            <div>
                                <div className="text-3xl font-bold" style={{ color: '#243782' }}>{totalWeeklyProduction}</div>
                                <div className="text-sm text-slate-500">Producción Total Semanal</div>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                            <div className="p-3 rounded-xl" style={{ backgroundColor: '#ffebee' }}>
                                <AlertTriangle size={24} style={{ color: '#d32f2f' }} />
                            </div>
                            <div>
                                <div className="text-3xl font-bold" style={{ color: '#d32f2f' }}>{ruptureCount}</div>
                                <div className="text-sm text-slate-500">Referencias con Ruptura</div>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                            <div className="p-3 rounded-xl" style={{ backgroundColor: '#e8f5e9' }}>
                                <Calculator size={24} style={{ color: '#388e3c' }} />
                            </div>
                            <div>
                                <div className="text-3xl font-bold" style={{ color: '#388e3c' }}>{simulationResults.length - ruptureCount}</div>
                                <div className="text-sm text-slate-500">Referencias OK</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Weekly Input */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                            <h3 className="font-bold text-lg mb-4" style={{ color: '#243782' }}>Plan Semanal</h3>
                            <div className="space-y-3">
                                {dayNames.map((day, idx) => (
                                    <div key={day} className="flex items-center justify-between gap-3">
                                        <label className="text-sm font-medium text-slate-500 uppercase w-12">{dayLabels[idx]}</label>
                                        <input
                                            type="number"
                                            className="flex-1 p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-right"
                                            value={weekInput[day]}
                                            onChange={e => setWeekInput({ ...weekInput, [day]: e.target.value === '' ? '' : Number(e.target.value) })}
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100">
                                <div className="flex justify-between mb-4">
                                    <span className="text-sm font-medium text-slate-500">Total</span>
                                    <span className="text-2xl font-bold" style={{ color: '#243782' }}>{totalWeeklyProduction}</span>
                                </div>
                                <button
                                    onClick={handleExportSimulation}
                                    className="w-full py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                    style={{ backgroundColor: '#243782' }}
                                >
                                    <FileDown size={18} /> Exportar Excel
                                </button>
                            </div>
                        </div>

                        {/* Results Table */}
                        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-5 border-b border-slate-100">
                                <h3 className="font-bold text-lg" style={{ color: '#243782' }}>Evolución del Stock</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                                            <th className="text-left py-3 px-3 font-semibold">Ref</th>
                                            <th className="text-center py-3 px-2 font-semibold">Stock</th>
                                            {dayLabels.map(d => (
                                                <th key={d} className="text-center py-3 px-2 font-semibold">{d}</th>
                                            ))}
                                            <th className="text-center py-3 px-3 font-semibold">Ruptura</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {simulationResults.map(item => (
                                            <tr key={item.code} className={`hover:bg-slate-50 transition-colors ${item.ruptureDay ? 'bg-red-50/30' : ''}`}>
                                                <td className="py-2 px-3">
                                                    <div className="font-semibold text-slate-800">{item.code}</div>
                                                </td>
                                                <td className="py-2 px-2 text-center font-medium text-slate-600">{item.initialStock}</td>
                                                {(item.dailyBalance || []).map((bal, idx) => (
                                                    <td key={idx} className={`py-2 px-2 text-center font-bold ${(bal ?? 0) < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        {bal?.toFixed(0) ?? '-'}
                                                    </td>
                                                ))}
                                                <td className="py-2 px-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.ruptureDay ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        {item.ruptureDay ?? 'OK'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {!simulationResults.length && (
                                <div className="text-center py-12 text-slate-400">No hay referencias para simular</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
