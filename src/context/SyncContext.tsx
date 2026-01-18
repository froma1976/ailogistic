import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';

interface SyncContextType {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: Date | null;
    syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({} as SyncContextType);

export const useSync = () => useContext(SyncContext);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncNow();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const pushChanges = async () => {
        const queue = await db.sync_queue.where('status').equals('PENDING').toArray();

        for (const item of queue) {
            try {
                const { table, operation, payload } = item;
                let error = null;

                if (operation === 'INSERT') {
                    // Use upsert to handle duplicates gracefully without 409 errors
                    const { error: err } = await supabase.from(table).upsert(payload);
                    error = err;
                } else if (operation === 'UPDATE') {
                    // Assuming payload has ID for update
                    const match = table === 'production' ? { date: payload.date } :
                        table === 'part_references' ? { code: payload.code } :
                            { id: payload.id };

                    // @ts-ignore
                    const { error: err } = await supabase.from(table as any).update(payload).match(match);
                    error = err;
                } else if (operation === 'DELETE') {
                    // Payload should be ID or PK object
                    const match = table === 'production' ? { date: payload.date } :
                        table === 'part_references' ? { code: payload.code } :
                            { id: payload.id };
                    // @ts-ignore
                    const { error: err } = await supabase.from(table as any).delete().match(match);
                    error = err;
                }

                if (error) {
                    // Check for duplicate key error (Postgres code 23505)
                    // If entry exists, we consider it synced (or we could try to update, but usually this means it was already pushed)
                    if (error.code === '23505') {
                        console.warn('Item already exists on server, marking as synced:', item);
                    } else {
                        throw error;
                    }
                }

                await db.sync_queue.update(item.id!, { status: 'SYNCED' });
                // Optional: Remove from queue after success
                await db.sync_queue.delete(item.id!);
            } catch (err) {
                console.error('Sync failed for item', item, err);
            }
        }
    };

    const pullChanges = async () => {
        // 1. References
        const { data: refs } = await supabase.from('part_references').select('*');
        if (refs) await db.part_references.bulkPut(refs);

        // 2. Inventory Logs
        const { data: logs } = await supabase.from('inventory_log').select('*').limit(1000);
        if (logs) await db.inventory_log.bulkPut(logs);

        // 3. Production
        const { data: prod } = await supabase.from('production').select('*');
        if (prod) await db.production.bulkPut(prod);
    };

    const syncNow = async () => {
        if (!navigator.onLine || isSyncing) return;
        setIsSyncing(true);
        console.log('Starting sync...');
        try {
            await pushChanges();
            console.log('Push completed');
            await pullChanges();
            console.log('Pull completed');
            setLastSyncTime(new Date());
        } catch (error) {
            console.error('Sync failed', error);
        } finally {
            setIsSyncing(false);
        }
    };

    // Watch for pending items to trigger immediate sync
    const pendingCount = useLiveQuery(() => db.sync_queue.where('status').equals('PENDING').count());

    useEffect(() => {
        if (pendingCount && pendingCount > 0 && isOnline && !isSyncing) {
            syncNow();
        }
    }, [pendingCount, isOnline, isSyncing]);

    // Initial Sync on mount
    useEffect(() => {
        if (isOnline) syncNow();
    }, [isOnline]);

    // Periodic sync to pull remote changes (every 30 seconds)
    useEffect(() => {
        if (!isOnline) return;

        const interval = setInterval(async () => {
            if (!isSyncing && navigator.onLine) {
                console.log('Periodic pull sync...');
                try {
                    await pullChanges();
                    setLastSyncTime(new Date());
                } catch (error) {
                    console.error('Periodic pull failed', error);
                }
            }
        }, 30000); // Every 30 seconds

        return () => clearInterval(interval);
    }, [isOnline, isSyncing]);

    return (
        <SyncContext.Provider value={{ isOnline, isSyncing, lastSyncTime, syncNow }}>
            {children}
        </SyncContext.Provider>
    );
};
