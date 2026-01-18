import Dexie, { type Table } from 'dexie';
import type { PartReference, InventoryLog, Production } from '../types/database';

export interface SyncQueueItem {
    id?: number;
    table: 'part_references' | 'inventory_log' | 'production';
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    payload: any;
    status: 'PENDING' | 'SYNCED' | 'FAILED';
    created_at: number;
}

export class FerlogisticDatabase extends Dexie {
    part_references!: Table<PartReference, string>;
    inventory_log!: Table<InventoryLog, string>;
    production!: Table<Production, string>;
    sync_queue!: Table<SyncQueueItem, number>;

    constructor() {
        super('FerlogisticDB');
        this.version(2).stores({
            part_references: 'code',
            inventory_log: 'id, date, reference_code, created_at',
            production: 'date',
            sync_queue: '++id, table, status, created_at'
        });
    }
}

export const db = new FerlogisticDatabase();
