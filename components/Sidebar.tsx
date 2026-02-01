
import React, { useEffect } from 'react';
import { SystemConfig } from '../types';
import { STATE_YIELDS, VILLAGE_DATA, STATE_TARIFFS, SCHOOL_DATA } from '../constants';

interface SidebarProps {
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  onGenerateReport: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ config, setConfig, onGenerateReport }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig(prev => {
      const updated = {
        ...prev,
        [name]: name === 'state' || name === 'village' || name === 'schoolName' ? value : parseFloat(value)
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

  return (
    <aside id="sidebar" className="w-full lg:w-80 bg-[#161b22] border-r border-[#30363d] p-6 space-y-8 h-full lg:overflow-y-auto shrink-0">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-yellow-400 p-1.5 rounded-lg shadow-[0_0_15px_rgba(250,204,21,0.3)]">
          <svg className="w-7 h-7 text-gray-900" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="4.5" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="3" x2="12" y2="5.5" />
              <line x1="12" y1="18.5" x2="12" y2="21" />
              <line x1="3" y1="12" x2="5.5" y2="12" />
              <line x1="18.5" y1="12" x2="21" y2="12" />
              <line x1="5.64" y1="5.64" x2="7.41" y2="7.41" />
              <line x1="16.59" y1="16.59" x2="18.36" y2="18.36" />
              <line x1="5.64" y1="18.36" x2="7.41" y2="16.59" />
              <line x1="16.59" y1="7.41" x2="18.36" y2="5.64" />
            </g>
          </svg>
        </div>
        <h1 className="text-xl font-black text-yellow-400 tracking-tighter uppercase italic">BHANU AI</h1>
      </div>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Site Configuration</h2>
          <span className="text-[10px] bg-yellow-400/10 text-yellow-400 px-1 rounded">IoT Active</span>
        </div>
        
        <div>
          <label className="block text-xs text-gray-500 mb-1">Installation State</label>
          <select 
            name="state" 
            value={config.state} 
            onChange={handleChange}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
          >
            {sortedStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Local Area / Village</label>
          <select 
            name="village" 
            value={config.village} 
            onChange={handleChange}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
          >
            {VILLAGE_DATA[config.state] && VILLAGE_DATA[config.state].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Institutional Beneficiary (School)</label>
          <input 
            type="text"
            name="schoolName"
            value={config.schoolName}
            onChange={handleChange}
            placeholder="e.g. ZPH High School"
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-3 font-medium">System Size (kWp): {config.systemSize}</label>
          <div className="pt-1">
            <input 
              type="range" 
              name="systemSize" 
              min="1" max="15" step="0.5" 
              value={config.systemSize} 
              onChange={handleChange}
              className="w-full h-1 bg-[#30363d] rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
          </div>
        </div>
      </section>

      <div className="border-t border-[#30363d] pt-6"></div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Financial Inputs</h2>
        
        <div>
          <label className="block text-xs text-gray-500 mb-1">Install Cost (₹/kWp)</label>
          <input 
            type="number" 
            name="costPerKw" 
            value={config.costPerKw} 
            onChange={handleChange}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
             <label className="block text-xs text-gray-500">Tariff (₹/kWh)</label>
             <span className="text-[10px] text-blue-400 font-mono">DISCOM Default</span>
          </div>
          <input 
            type="number" 
            name="unitPrice" 
            step="0.1"
            value={config.unitPrice} 
            onChange={handleChange}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-3 font-medium">Annual Degradation (%): {config.degradation}%</label>
          <div className="pt-1">
            <input 
              type="range" 
              name="degradation" 
              min="0.1" max="1.5" step="0.1" 
              value={config.degradation} 
              onChange={handleChange}
              className="w-full h-1 bg-[#30363d] rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
          </div>
        </div>

        <div className="pt-2">
          <button 
            onClick={onGenerateReport}
            className="w-full flex items-center justify-center gap-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-gray-300 py-2.5 rounded-md text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF Report
          </button>
        </div>
      </section>

      <div className="pt-6">
        <div className="bg-[#21262d] rounded-lg p-4 text-xs text-gray-400 leading-relaxed border border-[#30363d]">
          <p className="font-bold text-gray-300">Total Solar Intelligence (v5.1)</p>
          <p className="mt-1 text-[11px]">Dynamic DISCOM billing enabled. School-specific RTS subsidies verified.</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
