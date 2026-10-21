
import React, { useEffect, useState } from 'react';
import { Cite } from './Sources';
import { SystemConfig } from '../types';
import { STATE_YIELDS, VILLAGE_DATA, STATE_TARIFFS, SCHOOL_DATA } from '../constants';

interface SidebarProps {
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  /** Where the settings are saved, shown under the form */
  saveNote?: string;
}

const fieldClass =
  'w-full h-9 bg-bg border border-line rounded-ctl px-3 text-sm text-fg placeholder:text-muted/60 hover:border-[#3a3a42] focus:outline-none focus:border-silver transition-colors';

const Chevron = () => (
  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Field: React.FC<{ label: string; htmlFor: string; hint?: React.ReactNode; children: React.ReactNode }> = ({ label, htmlFor, hint, children }) => (
  <div>
    <div className="flex items-baseline justify-between mb-1.5">
      <label htmlFor={htmlFor} className="text-xs text-muted">{label}</label>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
    {children}
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ config, setConfig, saveNote }) => {
  const [open, setOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig(prev => {
      const updated = {
        ...prev,
        [name]: ['state', 'village', 'schoolName', 'address', 'mapLink'].includes(name) ? value : (parseFloat(value) || 0)
      };

      // If state changes, reset village, school and update tariff to DISCOM rate
      if (name === 'state') {
        const villages = VILLAGE_DATA[value];
        const firstVillage = (villages && villages[0]) || '';
        updated.village = firstVillage;
        updated.schoolName = SCHOOL_DATA[firstVillage] || '';
        updated.unitPrice = STATE_TARIFFS[value] || prev.unitPrice;
      }

      // If village changes, update the default school
      if (name === 'village') {
        updated.schoolName = SCHOOL_DATA[value] || '';
      }

      return updated;
    });
  };

  // Ensure initial data is valid
  useEffect(() => {
    if (config.state && !config.village && VILLAGE_DATA[config.state]) {
      const villages = VILLAGE_DATA[config.state];
      const v = villages[0];
      setConfig(prev => ({
        ...prev,
        village: v,
        schoolName: SCHOOL_DATA[v] || ''
      }));
    }
  }, [config.state]);

  const sortedStates = Object.keys(STATE_YIELDS).sort();
  const isDefaultTariff = STATE_TARIFFS[config.state] === config.unitPrice;

  return (
    <aside id="sidebar" className="bg-surface border border-line rounded-box lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto">
      {/* Phone: one summary line that opens the full form */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="site-form"
        className="lg:hidden w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-fg">Site settings</span>
          <span className="block text-xs text-muted truncate">{config.village} · {config.state} · {config.systemSize} kWp</span>
        </span>
        <svg className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div id="site-form" className={`${open ? 'block border-t border-line' : 'hidden'} lg:block lg:border-0`}>
        <section className="p-5 space-y-4">
          <h2 className="hidden lg:block text-[15px] font-semibold text-fg">Site</h2>

          <Field label="State" htmlFor="state">
            <div className="relative">
              <select id="state" name="state" value={config.state} onChange={handleChange} className={`${fieldClass} appearance-none pr-8`}>
                {sortedStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Chevron />
            </div>
          </Field>

          <Field label="Village or area" htmlFor="village">
            <div className="relative">
              <select id="village" name="village" value={config.village} onChange={handleChange} className={`${fieldClass} appearance-none pr-8`}>
                {VILLAGE_DATA[config.state] && VILLAGE_DATA[config.state].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <Chevron />
            </div>
          </Field>

          <Field label="School" htmlFor="schoolName">
            <input id="schoolName" type="text" name="schoolName" value={config.schoolName} onChange={handleChange} placeholder="e.g. ZPH High School" className={fieldClass} />
          </Field>

          <Field label="School address" htmlFor="address" hint="For technician visits">
            <input id="address" type="text" name="address" value={config.address ?? ''} onChange={handleChange} placeholder="Street, village, mandal, PIN" className={fieldClass} />
          </Field>

          <Field label="Map link, optional" htmlFor="mapLink">
            <input id="mapLink" type="url" name="mapLink" value={config.mapLink ?? ''} onChange={handleChange} placeholder="Paste a Google Maps share link" className={fieldClass} />
          </Field>

          <Field label="System size" htmlFor="systemSize" hint={<span className="text-fg tabular-nums">{config.systemSize} kWp</span>}>
            <input id="systemSize" type="range" name="systemSize" min="1" max="30" step="0.5" value={config.systemSize} onChange={handleChange} className="w-full" />
          </Field>
        </section>

        <section className="p-5 space-y-4 border-t border-line">
          <h2 className="hidden lg:block text-[15px] font-semibold text-fg">Finance</h2>
          <h2 className="lg:hidden text-xs text-muted">Finance</h2>

          <Field label="Install cost (₹ per kWp)" htmlFor="costPerKw">
            <input id="costPerKw" type="number" name="costPerKw" value={config.costPerKw} onChange={handleChange} className={`${fieldClass} tabular-nums`} />
          </Field>

          <Field label="Tariff (₹ per kWh)" htmlFor="unitPrice" hint={isDefaultTariff ? 'DISCOM default' : undefined}>
            <input id="unitPrice" type="number" name="unitPrice" step="0.1" value={config.unitPrice} onChange={handleChange} className={`${fieldClass} tabular-nums`} />
          </Field>

          <Field label="Grants secured (₹)" htmlFor="grant" hint="CSR or state scheme">
            <input id="grant" type="number" name="grant" min="0" step="1000" value={config.grant ?? 0} onChange={handleChange} className={`${fieldClass} tabular-nums`} />
          </Field>

          <Field label="Yearly degradation" htmlFor="degradation" hint={<span className="text-fg tabular-nums">{config.degradation}%</span>}>
            <input id="degradation" type="range" name="degradation" min="0.1" max="1.5" step="0.1" value={config.degradation} onChange={handleChange} className="w-full" />
          </Field>
        </section>

        <p className="px-5 py-4 border-t border-line text-xs text-muted leading-relaxed">
          Tariffs<Cite id="tariffs" />, install costs<Cite id="benchmark" /> and yields per kWp<Cite id="state-yields" /> are rough guides for each state; use the rate on the school's own bill and a local quote. Schools get no central rooftop subsidy, so enter any CSR or state grant above<Cite id="rts2" />.
        {saveNote && <span className="block mt-2 text-fg">{saveNote}</span>}</p>
      </div>
    </aside>
  );
};

export default Sidebar;
