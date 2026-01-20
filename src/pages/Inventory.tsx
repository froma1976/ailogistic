import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { format } from 'date-fns';
import { Trash2, Save, Package, Edit2, X, Search, Plus, Layers, AlertCircle, FileUp, Download, CheckCircle2 } from 'lucide-react';
import type { PartReference, InventoryLog } from '../types/database';
import * as XLSX from 'xlsx';

interface EditModalProps {
    reference: PartReference;
    currentGroupings: number;
    currentLoose: number;
    onClose: () => void;
    onSave: (oldCode: string, newCode: string, coef: number, ua: number, groupings: number, loose: number) => void;
    onDelete: (code: string) => void;
}

const EditModal: React.FC<EditModalProps> = ({ reference, currentGroupings, currentLoose, onClose, onSave, onDelete }) => {
    const [code, setCode] = useState(reference.code);
    const [coef, setCoef] = useState(reference.consumption_coef ?? 0);
    const [ua, setUa] = useState(reference.pieces_per_ua ?? 1);
    const [groupings, setGroupings] = useState(currentGroupings);
    const [loose, setLoose] = useState(currentLoose);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const total = (Number(groupings) || 0) * (Number(ua) || 1) + (Number(loose) || 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(reference.code, code, coef, ua, groupings, loose);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold" style={{ color: '#243782' }}>Editar Referencia</h3>
                        <p className="text-sm text-slate-500">{reference.description}</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {!showDeleteConfirm ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Código de Referencia</label>
                            <input
                                type="text"
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                                value={code}
                                onChange={e => setCode(e.target.value.toUpperCase())}
                                placeholder="CÓDIGO"
                            />
                        </div>

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

                        <div className="pt-4 space-y-3">
                            <div className="flex gap-3">
                                <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-slate-200">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-colors" style={{ backgroundColor: '#243782' }}>
                                    Guardar
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-full py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={18} /> Eliminar Referencia
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center space-y-6 py-4">
                        <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                            <AlertCircle size={32} />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-slate-800">¿Estás seguro?</h4>
                            <p className="text-slate-500">Se eliminará la referencia <b>{reference.code}</b> y todo su historial de inventario. Esta acción no se puede deshacer.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => onDelete(reference.code)}
                                className="w-full py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-colors"
                            >
                                Sí, eliminar definitivamente
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="w-full py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                No, cancelar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface ImportModalProps {
    onClose: () => void;
    onImport: (data: any[]) => Promise<void>;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleProcess = async () => {
        if (!file) return;
        setLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                await onImport(jsonData);
                setDone(true);
                setLoading(false);
            };
            reader.readAsArrayBuffer(file);
        } catch (err) {
            console.error(err);
            alert('Error al procesar el archivo');
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const template = [
            { Referencia: 'REF001', Agrupaciones: 10, Sueltas: 5 },
            { Referencia: 'REF002', Agrupaciones: 0, Sueltas: 100 },
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
        XLSX.writeFile(wb, 'plantilla_inventario.xlsx');
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold" style={{ color: '#243782' }}>Importar Inventario</h3>
                        <p className="text-sm text-slate-500">Sube un Excel para actualización masiva</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {!done ? (
                    <div className="space-y-6">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />
                            <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
                                <FileUp size={32} />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-slate-700">{file ? file.name : 'Seleccionar Archivo Excel'}</p>
                                <p className="text-xs text-slate-400">Haz clic para buscar en tu ordenador</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <Download size={16} /> Formato esperado
                            </h4>
                            <p className="text-xs text-slate-500 mb-3">El Excel debe tener las columnas: <b>Referencia</b>, <b>Agrupaciones</b> y <b>Sueltas</b>.</p>
                            <button
                                onClick={downloadTemplate}
                                className="text-xs font-bold text-blue-600 hover:underline"
                            >
                                Descargar plantilla de ejemplo
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-slate-200">
                                Cancelar
                            </button>
                            <button
                                onClick={handleProcess}
                                disabled={!file || loading}
                                className="flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ backgroundColor: '#243782' }}
                            >
                                {loading ? 'Procesando...' : 'Procesar Archivo'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-6 py-4">
                        <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                            <CheckCircle2 size={32} />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-slate-800">¡Importación Exitosa!</h4>
                            <p className="text-slate-500">Se ha actualizado el inventario con los datos del archivo.</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-900 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export const InventoryPage: React.FC = () => {
    const references = useLiveQuery(() => db.part_references.toArray());
    const allLogs = useLiveQuery(() => db.inventory_log.toArray());
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const currentStockMap = useMemo(() => {
        if (!allLogs) return new Map<string, InventoryLog>();
        const map = new Map<string, InventoryLog>();
        const sorted = [...allLogs].sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            return (b.created_at || '').localeCompare(a.created_at || '');
        });
        for (const log of sorted) {
            if (log.reference_code && !map.has(log.reference_code)) {
                map.set(log.reference_code, log);
            }
        }
        return map;
    }, [allLogs]);

    const historyToday = useLiveQuery(async () => {
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
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const selectedRef = references?.find(r => r.code === selectedCode);
    const filteredReferences = references?.filter(ref =>
        ref.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ref.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Stats
    const totalRefs = references?.length || 0;
    const todayEntriesCount = historyToday?.length || 0;
    const totalPieces = Array.from(currentStockMap.values()).reduce((sum, h) => sum + (h.total || 0), 0) || 0;

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

    const handleEditSave = async (oldCode: string, newCode: string, coef: number, ua: number, groupings: number, loose: number) => {
        try {
            const ref = references?.find(r => r.code === oldCode);
            if (!ref) return;

            // Handle code change
            if (oldCode !== newCode) {
                // Check if new code exists
                const conflict = await db.part_references.get(newCode);
                if (conflict) {
                    alert('El nuevo código ya existe. Elige otro.');
                    return;
                }

                // Create new reference
                const newRef = { ...ref, code: newCode, consumption_coef: coef, pieces_per_ua: ua };
                await db.part_references.add(newRef);
                await db.sync_queue.add({ table: 'part_references', operation: 'INSERT', payload: newRef, status: 'PENDING', created_at: Date.now() });

                // Move all logs to new code
                const allRefLogs = await db.inventory_log.where('reference_code').equals(oldCode).toArray();
                for (const log of allRefLogs) {
                    const updatedLog = { ...log, reference_code: newCode };
                    await db.inventory_log.put(updatedLog);
                    await db.sync_queue.add({ table: 'inventory_log', operation: 'UPDATE', payload: updatedLog, status: 'PENDING', created_at: Date.now() });
                }

                // Delete old reference
                await db.part_references.delete(oldCode);
                await db.sync_queue.add({ table: 'part_references', operation: 'DELETE', payload: { code: oldCode }, status: 'PENDING', created_at: Date.now() });
            } else {
                // Just update values
                const updatedRef = { ...ref, consumption_coef: coef, pieces_per_ua: ua };
                await db.part_references.put(updatedRef);
                await db.sync_queue.add({ table: 'part_references', operation: 'UPDATE', payload: updatedRef, status: 'PENDING', created_at: Date.now() });
            }

            // Update current log for today
            const codeToUse = newCode;
            const log = await db.inventory_log.where('date').equals(todayStr).and(l => l.reference_code === codeToUse).first();
            const newTotal = (groupings * ua) + loose;

            if (log) {
                const updatedLog = { ...log, groupings, loose, total: newTotal };
                await db.inventory_log.put(updatedLog);
                await db.sync_queue.add({ table: 'inventory_log', operation: 'UPDATE', payload: updatedLog, status: 'PENDING', created_at: Date.now() });
            } else if (newTotal > 0) {
                const newLog = {
                    id: crypto.randomUUID(),
                    date: todayStr,
                    reference_code: codeToUse,
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

    const handleDeleteReference = async (code: string) => {
        try {
            // Delete all logs for this reference
            const allRefLogs = await db.inventory_log.where('reference_code').equals(code).toArray();
            for (const log of allRefLogs) {
                await db.inventory_log.delete(log.id);
                await db.sync_queue.add({ table: 'inventory_log', operation: 'DELETE', payload: { id: log.id }, status: 'PENDING', created_at: Date.now() });
            }

            // Delete the reference
            await db.part_references.delete(code);
            await db.sync_queue.add({ table: 'part_references', operation: 'DELETE', payload: { code }, status: 'PENDING', created_at: Date.now() });

            setEditingRef(null);
        } catch (err) {
            console.error(err);
            alert('Error al eliminar');
        }
    };

    const handleImportExcel = async (data: any[]) => {
        if (!references) return;

        for (const row of data) {
            const code = String(row.Referencia || row.Codigo || row.Code || '').trim().toUpperCase();
            if (!code) continue;

            const ref = references.find(r => r.code === code);
            if (!ref) {
                console.warn('Referencia no encontrada:', code);
                continue;
            }

            const groupings = Number(row.Agrupaciones || row.UA || row.Pallets || 0);
            const loose = Number(row.Sueltas || row.Loose || row.Unidades || 0);
            const total = groupings * (ref.pieces_per_ua || 1) + loose;

            // Create/Update log for today
            const existing = await db.inventory_log
                .where('date').equals(todayStr)
                .and(item => item.reference_code === code)
                .first();

            if (existing) {
                const updated = { ...existing, groupings, loose, total };
                await db.inventory_log.put(updated);
                await db.sync_queue.add({ table: 'inventory_log', operation: 'UPDATE', payload: updated, status: 'PENDING', created_at: Date.now() });
            } else {
                const newLog = {
                    id: crypto.randomUUID(),
                    date: todayStr,
                    reference_code: code,
                    groupings,
                    loose,
                    total,
                    created_at: new Date().toISOString()
                };
                await db.inventory_log.add(newLog);
                await db.sync_queue.add({ table: 'inventory_log', operation: 'INSERT', payload: newLog, status: 'PENDING', created_at: Date.now() });
            }
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
                        <p className="text-slate-500 text-sm">Gestión de stock e historial</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-all shadow-sm"
                    >
                        <FileUp size={18} /> Importar Excel
                    </button>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
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
                        <div className="text-3xl font-bold" style={{ color: '#388e3c' }}>{todayEntriesCount}</div>
                        <div className="text-sm text-slate-500">Entradas Hoy</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#fff3e0' }}>
                        <Layers size={24} style={{ color: '#f57c00' }} />
                    </div>
                    <div>
                        <div className="text-3xl font-bold" style={{ color: '#f57c00' }}>{totalPieces.toLocaleString()}</div>
                        <div className="text-sm text-slate-500">Piezas en Stock</div>
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
                            const log = currentStockMap.get(ref.code);
                            const stock = log ? (log.total ?? 0) : 0;
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
                                        {log && log.date !== todayStr && (
                                            <div className="text-[10px] text-orange-500 font-medium">Últ. registro: {format(new Date(log.date), 'dd/MM/yyyy')}</div>
                                        )}
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
                                    <th className="text-left py-3 px-5 font-semibold">UA / Coef</th>
                                    <th className="text-center py-3 px-5 font-semibold">Stock Actual</th>
                                    <th className="text-center py-3 px-5 font-semibold">Últ. Act</th>
                                    <th className="text-center py-3 px-5 font-semibold">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredReferences?.map(ref => {
                                    const log = currentStockMap.get(ref.code);
                                    const stock = log ? (log.total ?? 0) : 0;
                                    const g = log ? log.groupings || 0 : 0;
                                    const l = log ? log.loose || 0 : 0;

                                    return (
                                        <tr key={ref.code} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-5">
                                                <div className="font-semibold text-slate-800">{ref.code}</div>
                                                <div className="text-xs text-slate-400 truncate max-w-[200px]">{ref.description}</div>
                                            </td>
                                            <td className="py-3 px-5">
                                                <div className="text-sm text-slate-600">UA: {ref.pieces_per_ua}</div>
                                                <div className="text-xs text-slate-400">Coef: {ref.consumption_coef}</div>
                                            </td>
                                            <td className="py-3 px-5 text-center">
                                                <span className={`text-xl font-bold ${stock ? '' : 'text-slate-300'}`} style={stock ? { color: '#243782' } : {}}>
                                                    {stock || '-'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5 text-center text-xs text-slate-500">
                                                {log ? format(new Date(log.date), 'dd/MM/yyyy') : '-'}
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
                            {historyToday?.map(item => (
                                <div key={item.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                    <div>
                                        <div className="font-semibold text-slate-800">{item.reference_code}</div>
                                        <div className="text-xs text-slate-400">UA: {item.groupings} | Sueltas: {item.loose}</div>
                                    </div>
                                    <div className="text-xl font-bold" style={{ color: '#243782' }}>{item.total}</div>
                                </div>
                            ))}
                            {!historyToday?.length && (
                                <div className="text-center py-12 text-slate-400">No hay registros hoy</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isImportModalOpen && (
                <ImportModal
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={handleImportExcel}
                />
            )}

            {editingRef && (
                <EditModal
                    reference={editingRef.ref}
                    currentGroupings={editingRef.groupings}
                    currentLoose={editingRef.loose}
                    onClose={() => setEditingRef(null)}
                    onSave={handleEditSave}
                    onDelete={handleDeleteReference}
                />
            )}
        </div>
    );
};
