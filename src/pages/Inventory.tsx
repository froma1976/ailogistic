import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { format } from 'date-fns';
import { Trash2, Save, Package, Edit2, X, Search, Plus, Layers } from 'lucide-react';
import type { PartReference } from '../types/database';

interface EditModalProps {
    reference: PartReference;
    currentGroupings: number;
    currentLoose: number;
    onClose: () => void;
    onSave: (code: string, coef: number, ua: number, groupings: number, loose: number) => void;
}

const EditModal: React.FC<EditModalProps> = ({ reference, currentGroupings, currentLoose, onClose, onSave }) => {
    const [coef, setCoef] = useState(reference.consumption_coef ?? 0);
    const [ua, setUa] = useState(reference.pieces_per_ua ?? 1);
    const [groupings, setGroupings] = useState(currentGroupings);
    const [loose, setLoose] = useState(currentLoose);

    const total = (Number(groupings) || 0) * (Number(ua) || 1) + (Number(loose) || 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(reference.code, coef, ua, groupings, loose);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold" style={{ color: '#243782' }}>Editar Referencia</h3>
                        <p className="text-sm text-slate-500">{reference.code} - {reference.description}</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Coef. Consumo</label>
                            <input
                                type="number" step="0.01"
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={coef}
                                onChange={e => setCoef(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Piezas por UA</label>
                            <input
                                type="number"
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={ua}
                                onChange={e => setUa(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <h4 className="text-sm font-medium text-slate-400 uppercase mb-3">Corrección de Stock</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Agrupaciones</label>
                                <input
                                    type="number"
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                    value={groupings}
                                    onChange={e => setGroupings(Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Piezas Sueltas</label>
                                <input
                                    type="number"
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                    value={loose}
                                    onChange={e => setLoose(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="mt-4 p-3 rounded-xl flex justify-between items-center" style={{ backgroundColor: '#e3f2fd' }}>
                            <span className="text-sm font-medium" style={{ color: '#243782' }}>Total Calculado</span>
                            <span className="text-xl font-bold" style={{ color: '#243782' }}>{total}</span>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-slate-200">
                            Cancelar
                        </button>
                        <button type="submit" className="flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-colors" style={{ backgroundColor: '#243782' }}>
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const InventoryPage: React.FC = () => {
    const references = useLiveQuery(() => db.part_references.toArray());
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const history = useLiveQuery(async () => {
        const logs = await db.inventory_log.where('date').equals(todayStr).toArray();
        return logs.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    });

    const [viewMode, setViewMode] = useState<'entry' | 'list'>('entry');
    const [selectedCode, setSelectedCode] = useState('');
    const [groupings, setGroupings] = useState<number | ''>('');
    const [loose, setLoose] = useState<number | ''>('');
    const [total, setTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingRef, setEditingRef] = useState<{ ref: PartReference, groupings: number, loose: number } | null>(null);

    const selectedRef = references?.find(r => r.code === selectedCode);
    const filteredReferences = references?.filter(ref =>
        ref.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ref.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Stats
    const totalRefs = references?.length || 0;
    const todayEntries = history?.length || 0;
    const totalPieces = history?.reduce((sum, h) => sum + (h.total || 0), 0) || 0;

    useEffect(() => {
        if (selectedRef) {
            const g = Number(groupings) || 0;
            const l = Number(loose) || 0;
            const ua = selectedRef.pieces_per_ua || 1;
            setTotal(g * ua + l);
        } else {
            setTotal(0);
        }
    }, [groupings, loose, selectedRef]);

    const handleSaveEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCode || (!groupings && !loose)) return;

        try {
            const existing = await db.inventory_log
                .where('date').equals(todayStr)
                .and(item => item.reference_code === selectedCode)
                .first();

            if (existing) {
                const newGroupings = (existing.groupings || 0) + (Number(groupings) || 0);
                const newLoose = (existing.loose || 0) + (Number(loose) || 0);
                const newTotal = (existing.total || 0) + total;

                const updated = { ...existing, groupings: newGroupings, loose: newLoose, total: newTotal };
                await db.inventory_log.put(updated);
                await db.sync_queue.add({ table: 'inventory_log', operation: 'UPDATE', payload: updated, status: 'PENDING', created_at: Date.now() });
            } else {
                const newLog = {
                    id: crypto.randomUUID(),
                    date: todayStr,
                    reference_code: selectedCode,
                    groupings: Number(groupings) || 0,
                    loose: Number(loose) || 0,
                    total: total,
                    created_at: new Date().toISOString()
                };
                await db.inventory_log.add(newLog);
                await db.sync_queue.add({ table: 'inventory_log', operation: 'INSERT', payload: newLog, status: 'PENDING', created_at: Date.now() });
            }
            setSelectedCode('');
            setGroupings('');
            setLoose('');
        } catch (err) {
            console.error(err);
            alert('Error al guardar');
        }
    };

    const handleEditSave = async (code: string, coef: number, ua: number, groupings: number, loose: number) => {
        try {
            const ref = references?.find(r => r.code === code);
            if (ref) {
                const updatedRef = { ...ref, consumption_coef: coef, pieces_per_ua: ua };
                await db.part_references.put(updatedRef);
                await db.sync_queue.add({ table: 'part_references', operation: 'UPDATE', payload: updatedRef, status: 'PENDING', created_at: Date.now() });
            }

            const log = await db.inventory_log.where('date').equals(todayStr).and(l => l.reference_code === code).first();
            const newTotal = (groupings * ua) + loose;

            if (log) {
                const updatedLog = { ...log, groupings, loose, total: newTotal };
                await db.inventory_log.put(updatedLog);
                await db.sync_queue.add({ table: 'inventory_log', operation: 'UPDATE', payload: updatedLog, status: 'PENDING', created_at: Date.now() });
            } else if (newTotal > 0) {
                const newLog = {
                    id: crypto.randomUUID(),
                    date: todayStr,
                    reference_code: code,
                    groupings,
                    loose,
                    total: newTotal,
                    created_at: new Date().toISOString()
                };
                await db.inventory_log.add(newLog);
                await db.sync_queue.add({ table: 'inventory_log', operation: 'INSERT', payload: newLog, status: 'PENDING', created_at: Date.now() });
            }

            setEditingRef(null);
        } catch (err) {
            console.error(err);
            alert('Error al actualizar');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl text-white" style={{ backgroundColor: '#243782' }}>
                        <Package size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: '#243782' }}>Inventario</h1>
                        <p className="text-slate-500 text-sm">Gestión de stock y entradas</p>
                    </div>
                </div>
                <div className="flex w-full md:w-auto bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('entry')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'entry' ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        style={viewMode === 'entry' ? { backgroundColor: '#243782' } : {}}
                    >
                        <Plus size={16} className="inline mr-1" /> Entrada
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'list' ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        style={viewMode === 'list' ? { backgroundColor: '#243782' } : {}}
                    >
                        <Layers size={16} className="inline mr-1" /> Consultar
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#e3f2fd' }}>
                        <Package size={24} style={{ color: '#1976d2' }} />
                    </div>
                    <div>
                        <div className="text-3xl font-bold" style={{ color: '#243782' }}>{totalRefs}</div>
                        <div className="text-sm text-slate-500">Referencias Totales</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#e8f5e9' }}>
                        <Plus size={24} style={{ color: '#388e3c' }} />
                    </div>
                    <div>
                        <div className="text-3xl font-bold" style={{ color: '#388e3c' }}>{todayEntries}</div>
                        <div className="text-sm text-slate-500">Entradas Hoy</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#fff3e0' }}>
                        <Layers size={24} style={{ color: '#f57c00' }} />
                    </div>
                    <div>
                        <div className="text-3xl font-bold" style={{ color: '#f57c00' }}>{totalPieces.toLocaleString()}</div>
                        <div className="text-sm text-slate-500">Piezas Registradas</div>
                    </div>
                </div>
            </div>

            {viewMode === 'list' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="font-bold text-lg" style={{ color: '#243782' }}>Estado de Referencias</h3>
                        <div className="relative w-full md:w-auto">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="w-full md:w-64 pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    {/* Mobile Cards */}
                    <div className="md:hidden">
                        {filteredReferences?.map(ref => {
                            const log = history?.find(h => h.reference_code === ref.code);
                            const stock = log ? log.total : 0;
                            const g = log ? log.groupings || 0 : 0;
                            const l = log ? log.loose || 0 : 0;

                            return (
                                <div key={ref.code} className="p-4 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800 text-lg">{ref.code}</span>
                                            {stock > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">{stock}</span>}
                                        </div>
                                        <div className="text-sm text-slate-500 line-clamp-1">{ref.description}</div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            UA: {ref.pieces_per_ua} · Coef: {ref.consumption_coef}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setEditingRef({ ref, groupings: g, loose: l })}
                                        className="p-3 bg-slate-50 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors"
                                    >
                                        <Edit2 size={20} />
                                    </button>
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
                                    <th className="text-center py-3 px-5 font-semibold">UA</th>
                                    <th className="text-center py-3 px-5 font-semibold">Coef</th>
                                    <th className="text-center py-3 px-5 font-semibold">Stock Hoy</th>
                                    <th className="text-center py-3 px-5 font-semibold">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredReferences?.map(ref => {
                                    const log = history?.find(h => h.reference_code === ref.code);
                                    const stock = log ? (log.total ?? 0) : 0;
                                    const g = log ? log.groupings || 0 : 0;
                                    const l = log ? log.loose || 0 : 0;

                                    return (
                                        <tr key={ref.code} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-5">
                                                <div className="font-semibold text-slate-800">{ref.code}</div>
                                                <div className="text-xs text-slate-400 truncate max-w-[200px]">{ref.description}</div>
                                            </td>
                                            <td className="py-3 px-5 text-center text-slate-600">{ref.pieces_per_ua}</td>
                                            <td className="py-3 px-5 text-center text-slate-600">{ref.consumption_coef}</td>
                                            <td className="py-3 px-5 text-center">
                                                <span className={`text-xl font-bold ${stock ? '' : 'text-slate-300'}`} style={stock ? { color: '#243782' } : {}}>
                                                    {stock || '-'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5 text-center">
                                                <button
                                                    onClick={() => setEditingRef({ ref, groupings: g, loose: l })}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <h3 className="font-bold text-lg mb-6" style={{ color: '#243782' }}>Nueva Entrada de Inventario</h3>
                        <form onSubmit={handleSaveEntry} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">Referencia</label>
                                <select
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={selectedCode}
                                    onChange={e => { setSelectedCode(e.target.value); setGroupings(''); setLoose(''); }}
                                >
                                    <option value="">Seleccionar Referencia...</option>
                                    {references?.map(r => (
                                        <option key={r.code} value={r.code}>{r.code} - {r.description}</option>
                                    ))}
                                </select>
                                {selectedRef && (
                                    <div className="mt-2 text-xs font-medium px-3 py-1 rounded-full inline-block" style={{ backgroundColor: '#e3f2fd', color: '#243782' }}>
                                        UA: {selectedRef.pieces_per_ua} pzs | Coef: {selectedRef.consumption_coef}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-2">Agrupaciones (UA)</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-center text-xl font-bold"
                                        value={groupings}
                                        onChange={e => setGroupings(e.target.value === '' ? '' : Number(e.target.value))}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-2">Piezas Sueltas</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-center text-xl font-bold"
                                        value={loose}
                                        onChange={e => setLoose(e.target.value === '' ? '' : Number(e.target.value))}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="p-4 rounded-xl flex justify-between items-center" style={{ backgroundColor: '#e3f2fd' }}>
                                <span className="text-sm font-medium" style={{ color: '#243782' }}>Total a Registrar</span>
                                <span className="text-3xl font-bold" style={{ color: '#243782' }}>{total}</span>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: '#243782' }}
                            >
                                <Save size={20} /> Guardar Entrada
                            </button>
                        </form>
                    </div>

                    {/* Today's Log */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg" style={{ color: '#243782' }}>Registro de Hoy</h3>
                            <button
                                onClick={async () => {
                                    if (confirm('¿Borrar historial de hoy?')) {
                                        const logs = await db.inventory_log.where('date').equals(todayStr).toArray();
                                        for (const log of logs) {
                                            await db.inventory_log.delete(log.id);
                                            await db.sync_queue.add({ table: 'inventory_log', operation: 'DELETE', payload: { id: log.id }, status: 'PENDING', created_at: Date.now() });
                                        }
                                    }
                                }}
                                className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                title="Reiniciar Día"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {history?.map(item => (
                                <div key={item.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                    <div>
                                        <div className="font-semibold text-slate-800">{item.reference_code}</div>
                                        <div className="text-xs text-slate-400">UA: {item.groupings} | Sueltas: {item.loose}</div>
                                    </div>
                                    <div className="text-xl font-bold" style={{ color: '#243782' }}>{item.total}</div>
                                </div>
                            ))}
                            {!history?.length && (
                                <div className="text-center py-12 text-slate-400">No hay registros hoy</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {editingRef && (
                <EditModal
                    reference={editingRef.ref}
                    currentGroupings={editingRef.groupings}
                    currentLoose={editingRef.loose}
                    onClose={() => setEditingRef(null)}
                    onSave={handleEditSave}
                />
            )}
        </div>
    );
};
