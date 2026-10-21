import { useEffect, useRef, useState } from 'react';
import { SystemConfig } from '../types';
import { useCap } from './runtime';

// Site settings (school, size, tariff, grants) saved in the page's shared
// `settings/site` document, so they survive a reload and everyone sees the
// same school. Falls back to this device when shared storage is unavailable.

const LOCAL_KEY = 'bhanu-settings';
const FIELDS: (keyof SystemConfig)[] = ['state', 'village', 'schoolName', 'systemSize', 'costPerKw', 'unitPrice', 'degradation', 'grant', 'address', 'mapLink'];

const pick = (c: Partial<SystemConfig>) => Object.fromEntries(FIELDS.filter(k => c[k] !== undefined).map(k => [k, c[k]])) as Partial<SystemConfig>;

export function useSharedSettings(config: SystemConfig, setConfig: (c: SystemConfig) => void) {
  const [mode, setMode] = useState<'loading' | 'shared' | 'local'>('loading');
  const [canWrite, setCanWrite] = useState(true);
  const dbRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const lastJson = useRef<string>('');
  const loaded = useRef(false);
  const configRef = useRef(config);
  configRef.current = config;

  const apply = (saved: Partial<SystemConfig>) => {
    const next = { ...configRef.current, ...pick(saved) };
    lastJson.current = JSON.stringify(pick(next));
    if (lastJson.current !== JSON.stringify(pick(configRef.current))) setConfig(next);
  };

  // Load once: shared document if available, otherwise this device
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let alive = true;
    (async () => {
      const [db, user] = await Promise.all([useCap('db'), useCap('user')]);
      if (!alive) return;
      if (user && (await user.can('data.write')) === false) setCanWrite(false);
      if (!db) {
        try { const s = localStorage.getItem(LOCAL_KEY); if (s) apply(JSON.parse(s)); } catch { /* ignore */ }
        loaded.current = true; setMode('local'); return;
      }
      dbRef.current = db;
      setMode('shared');
      unsub = db.doc('settings/site').onSnapshot(
        (snap: { exists: boolean; data(): Record<string, unknown> | undefined }) => {
          if (snap.exists) apply(snap.data() as Partial<SystemConfig>);
          loaded.current = true;
        },
        () => { loaded.current = true; setMode('local'); },
      );
    })();
    return () => { alive = false; unsub?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save changes, a moment after the last edit
  useEffect(() => {
    if (!loaded.current) return;
    const json = JSON.stringify(pick(config));
    if (json === lastJson.current) return;
    const t = setTimeout(async () => {
      lastJson.current = json;
      try { localStorage.setItem(LOCAL_KEY, json); } catch { /* ignore */ }
      if (dbRef.current && canWrite) {
        try { await dbRef.current.doc('settings/site').set(JSON.parse(json)); } catch { /* view-only viewers keep a local copy */ }
      }
    }, 800);
    return () => clearTimeout(t);
  }, [config, canWrite]);

  return { mode, canWrite };
}
