import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export type TableName = 'goals' | 'schedule_events' | 'flashcards' | 'urgent_tasks';

function readCache<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache<T>(key: string, value: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors
  }
}

export function useSupabaseTable<T extends { id: string }>(
  table: TableName,
  fallbackRows: T[] = []
) {
  const cacheKey = `plexo_v2_cache_${table}`;
  const [data, setData] = useState<T[]>(() => readCache<T>(cacheKey, fallbackRows));
  const [loading, setLoading] = useState<boolean>(() => readCache<T>(cacheKey, []).length === 0);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'offline'>('syncing');
  const dataRef = useRef(data);
  dataRef.current = data;

  const setAndCache = useCallback(
    (updater: T[] | ((prev: T[]) => T[])) => {
      setData((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        writeCache(cacheKey, next);
        return next;
      });
    },
    [cacheKey]
  );

  const fetchData = useCallback(async () => {
    if (!supabase) {
      setSyncStatus('offline');
      setLoading(false);
      return;
    }
    try {
      setSyncStatus('syncing');
      const { data: rows, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && rows) {
        setAndCache(rows as T[]);
        setSyncStatus('synced');
      } else {
        setSyncStatus('offline');
      }
    } catch {
      setSyncStatus('offline');
    } finally {
      setLoading(false);
    }
  }, [table, setAndCache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const insert = useCallback(
    async (row: Omit<T, 'created_at'>) => {
      const optimistic = { ...row, created_at: new Date().toISOString() } as unknown as T;
      setAndCache((prev) => [...prev, optimistic]);

      if (!supabase) {
        return { data: optimistic, error: null };
      }

      try {
        const { data: inserted, error } = await supabase
          .from(table)
          .insert(row as Record<string, unknown>)
          .select()
          .maybeSingle();

        if (!error && inserted) {
          setAndCache((prev) => prev.map((r) => (r.id === row.id ? (inserted as T) : r)));
          setSyncStatus('synced');
          return { data: inserted as T, error: null };
        }
        setSyncStatus('offline');
        return { data: optimistic, error };
      } catch (err) {
        setSyncStatus('offline');
        return { data: optimistic, error: err };
      }
    },
    [table, setAndCache]
  );

  const update = useCallback(
    async (id: string, updates: Partial<T>) => {
      setAndCache((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));

      if (!supabase) {
        return { error: null };
      }

      try {
        const { error } = await supabase
          .from(table)
          .update(updates as Record<string, unknown>)
          .eq('id', id);
        if (!error) {
          setSyncStatus('synced');
        } else {
          setSyncStatus('offline');
        }
        return { error };
      } catch (err) {
        setSyncStatus('offline');
        return { error: err };
      }
    },
    [table, setAndCache]
  );

  const remove = useCallback(
    async (id: string) => {
      setAndCache((prev) => prev.filter((r) => r.id !== id));

      if (!supabase) {
        return { error: null };
      }

      try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (!error) {
          setSyncStatus('synced');
        } else {
          setSyncStatus('offline');
        }
        return { error };
      } catch (err) {
        setSyncStatus('offline');
        return { error: err };
      }
    },
    [table, setAndCache]
  );

  return { data, loading, syncStatus, insert, update, remove, refetch: fetchData };
}
