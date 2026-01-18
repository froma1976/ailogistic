export type PartReference = {
  code: string;
  description: string | null;
  pieces_per_ua: number | null;
  consumption_coef: number | null;
};

export type InventoryLog = {
  id: string; // UUID
  date: string; // YYYY-MM-DD
  reference_code: string | null;
  groupings: number | null;
  loose: number | null;
  total: number | null;
  created_at: string;
};

export type Production = {
  date: string; // YYYY-MM-DD
  quantity: number | null;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      part_references: {
        Row: PartReference;
        Insert: PartReference;
        Update: Partial<PartReference>;
      };
      inventory_log: {
        Row: InventoryLog;
        Insert: Omit<InventoryLog, 'id' | 'created_at'>;
        Update: Partial<InventoryLog>;
      };
      production: {
        Row: Production;
        Insert: Production;
        Update: Partial<Production>;
      };
    };
  };
};
