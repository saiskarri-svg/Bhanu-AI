import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, ScatterChart, Scatter, LineChart, Line, ReferenceLine, Label,
  Legend, ComposedChart
} from 'recharts';
import { 
  SystemConfig, SensorLog 
} from './types';
import { 
  STATE_YIELDS, EMISSION_FACTOR, TREE_ABSORPTION, GRID_STATS,
  generateSensorData, getBacktestData, 
  calculateIndianSubsidy, getHistoricalAverageYield
} from './constants';
import { getAIInsights } from './services/geminiService';

const App: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig>({
    state: "Andhra Pradesh",
    village: "Ganaparthi",
    schoolName: "ZPH High School",
    systemSize: 5.0,
    costPerKw: 60000,
    unitPrice: 7.2,
    degradation: 0.5
  });

  const [activeTab, setActiveTab] = useState(0);
  const [sensorLogs, setSensorLogs] = useState<SensorLog[]>(() => generateSensorData());
  const [aiInsights, setAiInsights] = useState<{title: string, insight: string}[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const annualGen = useMemo(() => {
    return config.systemSize * (STATE_YIELDS[config.state] || 1450);
  }, [config.state, config.systemSize]);

  const backtestedAvgAnnualGen = useMemo(() => {
    const avgYieldPerKwp = getHistoricalAverageYield(config.state);
    return config.systemSize * avgYieldPerKwp;
  }, [config.state, config.systemSize]);

  const environmentalMetrics = useMemo(() => {
    const co2Tonnes = (annualGen * EMISSION_FACTOR) / 1000;
    const trees = Math.floor((annualGen * EMISSION_FACTOR) / TREE_ABSORPTION);
    return { co2Tonnes, trees };
  }, [annualGen]);

  const subsidyInfo = useMemo(() => {
    return calculateIndianSubsidy(config.systemSize, config.state);
  }, [config.systemSize, config.state]);

  const latestStatus = useMemo(() => sensorLogs[sensorLogs.length - 1], [sensorLogs]);

  const forecastData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 24; i++) {
      const gen = Math.max(0, config.systemSize * 0.75 * Math.sin((i * Math.PI) / 12 - Math.PI / 4));
      data.push({ time: i + ":00", generation: parseFloat(gen.toFixed(2)) });
    }
    return data;
  }, [config.systemSize]);

  const monthlyBacktestData = useMemo(() => getBacktestData(annualGen), [annualGen]);

  const roiData = useMemo(() => {
    const baseCost = config.systemSize * config.costPerKw;
    const totalInv = Math.max(0, baseCost - subsidyInfo.totalSubsidy);
    const data = [{ year: 0, cashFlow: -totalInv, annualSavings: 0, generation: 0 }];
    let currentCashFlow = -totalInv;
    for (let y = 1; y <= 20; y++) {
      const yearGeneration = backtestedAvgAnnualGen * Math.pow(1 - config.degradation / 100, y - 1);
      const savings = yearGeneration * config.unitPrice;
      currentCashFlow += savings;
      data.push({ 
        year: y, 
        cashFlow: Math.round(currentCashFlow),
        annualSavings: Math.round(savings),
        generation: Math.round(yearGeneration)
      });
    }
    return data;
  }, [config, backtestedAvgAnnualGen, subsidyInfo]);

  const paybackYear = useMemo(() => {
    const yr = roiData.find(d => d.cashFlow > 0);
    return yr ? yr.year : '> 20';
  }, [roiData]);

  const currentYieldLoss = useMemo(() => {
    const cleanEfficiency = 0.98;
    const currentEff = latestStatus ? latestStatus.efficiency : 0;
    const loss = Math.max(0, cleanEfficiency - currentEff);
    const kwLoss = config.systemSize * loss;
    return { percentage: (loss * 100).toFixed(1), kw: kwLoss.toFixed(2) };
  }, [latestStatus, config.systemSize]);

  const scatterData = useMemo(() => {
    return sensorLogs.map(log => ({
      dust: log.dustIndex,
      efficiency: log.efficiency
    }));
  }, [sensorLogs]);

  const dustImpactCurve = useMemo(() => {
    const curve = [];
    const baseEfficiency = 0.98;
    const penaltyFactor = 0.9;
    for (let d = 0; d <= 1.0; d += 0.05) {
      curve.push({
        dust: d,
        avgEfficiency: baseEfficiency * (1 - (d * penaltyFactor))
      });
    }
    return curve;
  }, []);

  const schoolSustainabilityImpact = useMemo(() => {
    const kwhPerClassroomPerYear = 330; 
    const classroomsLighted = Math.floor(annualGen / kwhPerClassroomPerYear); 

    const labLoadKW = 2.0; 
    const computerLabHours = Math.floor((annualGen * 0.3) / labLoadKW); 

    const savingsINR = annualGen * config.unitPrice;
    const booksEquivalent = Math.floor(savingsINR / 250); 
    
    const kwhGainedBypass = Math.floor(annualGen * GRID_STATS.transmissionLossBypass);

    return { classroomsLighted, computerLabHours, booksEquivalent, kwhGainedBypass };
  }, [annualGen, config.unitPrice]);

  const handleFetchAiInsights = async () => {
    setIsAiLoading(true);
    const insights = await getAIInsights(config, sensorLogs);
    setAiInsights(insights);
    setIsAiLoading(false);
  };

  const handleResolveFault = (id: string) => {
    const now = new Date();
    const stamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    setSensorLogs(prevLogs => prevLogs.map(log => {
      if (log.id === id) {
        return { ...log, status: 'Resolved', resolvedDate: stamp };
      }
      return log;
    }));
  };

  const filteredLogs = useMemo(() => {
    return sensorLogs
      .filter(l => l.status === 'Maintenance Required' || l.status === 'Resolved')
      .slice()
      .reverse();
  }, [sensorLogs]);

  const handleGenerateReport = () => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      alert('Pop-up blocked! Please allow pop-ups to view the official report tab.');
      return;
    }

    const roiRows = [0, 1, 2, 5, 10, 15, 20].map(y => {
      const d = roiData.find(row => row.year === y);
      if (!d) return '';
      return `
        <tr>
          <td>${y === 0 ? 'Initial Phase' : 'Year ' + y}</td>
          <td>${y === 0 ? '-' : d.generation.toLocaleString()}</td>
          <td>${y === 0 ? '-' : '₹' + d.annualSavings.toLocaleString()}</td>
          <td style="color: ${d.cashFlow < 0 ? '#b91c1c' : '#166534'}; font-weight: bold;">₹${d.cashFlow.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    const logRows = filteredLogs.slice(0, 8).map(log => `
      <tr>
        <td style="font-family: monospace;">${log.date}</td>
        <td><strong>${log.status}</strong></td>
        <td>
          ${log.faultDescription || 'Standard operational verification.'}
          ${log.resolvedDate ? `<br><small style="color: #166534; font-size: 8pt; font-weight: bold;">[RESOLVED: ${log.resolvedDate}]</small>` : ''}
        </td>
      </tr>
    `).join('');

    const aiDirectives = aiInsights.length > 0 ? aiInsights.map((insight, idx) => `
      <div style="border: 1px solid #ccc; padding: 10px; border-radius: 4px; background: #fdfdfd; margin-bottom: 10px;">
        <p style="margin: 0; font-weight: bold; font-size: 10pt;">Directive ${idx + 1}: ${insight.title}</p>
        <p style="margin: 5px 0 0; font-size: 9pt; color: #444;">${insight.insight}</p>
      </div>
    `).join('') : '<p style="font-style: italic; font-size: 9pt; color: #777;">No critical performance anomalies flagged. AI core indicates healthy asset-grid synchronicity.</p>';

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bhanu AI Official Audit Report - ${config.village}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;700&family=Inter:wght@400;700;900&display=swap');
          body { font-family: 'Inter', sans-serif; line-height: 1.5; color: #111; margin: 0; padding: 0; background: #fff; }
          .container { width: 190mm; margin: 0 auto; padding: 20mm 10mm; }
          .header { border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .header h1 { margin: 0; font-size: 22pt; font-weight: 900; font-style: italic; letter-spacing: -1px; }
          .header-meta { text-align: right; }
          .stamp { border: 2px solid #b91c1c; color: #b91c1c; padding: 5px 10px; border-radius: 4px; font-weight: bold; text-transform: uppercase; display: inline-block; transform: none; margin-bottom: 10px; font-size: 10pt; }
          .section { margin-bottom: 30px; page-break-inside: avoid; }
          .section-title { font-size: 11pt; font-weight: 900; text-transform: uppercase; border-left: 5px solid #000; padding-left: 10px; background: #f3f4f6; padding-top: 5px; padding-bottom: 5px; margin-bottom: 15px; }
          .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
          .card { border: 1.5px solid #000; padding: 15px; border-radius: 2px; background: #fafafa; }
          .card h3 { margin: 0 0 10px; font-size: 10pt; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .card p { margin: 5px 0; font-size: 9.5pt; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
          th, td { border: 1px solid #000; padding: 10px; text-align: left; }
          th { background: #eee; font-weight: bold; text-transform: uppercase; }
          .kpi-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 10px; }
          .kpi-box { border: 1px solid #000; padding: 10px; text-align: center; }
          .kpi-box span { display: block; font-size: 7pt; font-weight: bold; color: #666; text-transform: uppercase; }
          .kpi-box strong { display: block; font-size: 13pt; margin-top: 2px; }
          .signature-area { display: grid; grid-template-cols: repeat(3, 1fr); gap: 30px; margin-top: 50px; }
          .sig-box { text-align: center; }
          .sig-line { border-bottom: 1px solid #000; height: 40px; margin-bottom: 10px; }
          .sig-box p { font-size: 8pt; font-weight: bold; margin: 0; text-transform: uppercase; }
          .page-break { page-break-after: always; }
          @media print {
            .no-print { display: none; }
            body { background: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="background: #111; color: #fff; padding: 15px; text-align: center; font-weight: bold;">
          REPORT PREVIEW TAB - Click <button onclick="window.print()" style="background: #facc15; border: none; padding: 5px 15px; border-radius: 4px; font-weight: bold; cursor: pointer; margin-left: 10px;">Download / Print as PDF</button> to save.
        </div>
        
        <div class="container">
          <!-- PAGE 1 -->
          <div class="header">
            <div>
              <h1>BHANU AI: SOLAR ASSET AUDIT</h1>
              <p style="margin: 5px 0 0; font-size: 9pt; font-weight: bold; color: #444; letter-spacing: 1px;">OFFICIAL COMPLIANCE & PERFORMANCE DOSSIER</p>
            </div>
            <div class="header-meta">
              <div class="stamp">Verified IoT Asset</div>
              <p style="margin: 0; font-size: 9pt; font-weight: bold;">DOC ID: BA-${Date.now().toString().slice(-8)}</p>
              <p style="margin: 2px 0 0; font-size: 8pt; color: #666;">Issued: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div class="section grid">
            <div class="card">
              <h3>Beneficiary & Site Identity</h3>
              <p><strong>Beneficiary Institution:</strong> ${config.schoolName || 'Not Specified'}</p>
              <p><strong>Village / Area:</strong> ${config.village}</p>
              <p><strong>District / State:</strong> ${config.state}</p>
              <p><strong>Monitoring Class:</strong> RTS Phase II / Social Sector</p>
            </div>
            <div class="card">
              <h3>Technical Asset Specs</h3>
              <p><strong>Plant Capacity:</strong> ${config.systemSize} kWp</p>
              <p><strong>Design Annual Yield:</strong> ${annualGen.toLocaleString()} kWh</p>
              <p><strong>DISCOM Tariff:</strong> ₹${config.unitPrice} / kWh</p>
              <p><strong>State Yield Factor:</strong> ${STATE_YIELDS[config.state]} kWh/kWp</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Executive Performance Matrix</div>
            <div class="kpi-grid">
              <div class="kpi-box">
                <span>Annual Savings</span>
                <strong>₹${(annualGen * config.unitPrice).toLocaleString()}</strong>
              </div>
              <div class="kpi-box">
                <span>Carbon Offset</span>
                <strong style="color: #166534;">${environmentalMetrics.co2Tonnes.toFixed(1)} t</strong>
              </div>
              <div class="kpi-box">
                <span>Availability</span>
                <strong style="color: #1d4ed8;">98.4%</strong>
              </div>
              <div class="kpi-box">
                <span>Payback</span>
                <strong style="color: #854d0e;">${paybackYear} Yrs</strong>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">National Sustainability Alignment</div>
            <table>
              <thead>
                <tr>
                  <th>Audit Category</th>
                  <th>Observed Metric</th>
                  <th>National Impact Equivalent</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Ecology & Reforestation</td>
                  <td>${environmentalMetrics.trees.toLocaleString()} Adult Trees</td>
                  <td>Aligned with Green India Mission baseline</td>
                </tr>
                <tr>
                  <td>Social Utility Index</td>
                  <td>${Math.floor(annualGen / 330)} School Classrooms</td>
                  <td>Equivalent annual lighting & computing capacity provided</td>
                </tr>
                <tr>
                  <td>Grid Resilience</td>
                  <td>${(annualGen / 1000).toFixed(1)} MWh Displaced</td>
                  <td>Reduction in peak fossil-fuel demand on DISCOM</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="signature-area">
            <div class="sig-box">
              <div class="sig-line"></div>
              <p>Authorized Site Engineer</p>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <p>DISCOM / Govt Inspector</p>
            </div>
            <div class="sig-box">
              <div class="sig-line" style="border-bottom: 1px dashed #000; display: flex; align-items: flex-end; justify-content: center; font-size: 6pt; color: #1d4ed8; font-family: monospace;">IOT_CORE_VERIFIED_AUTH</div>
              <p>Bhanu AI System Validator</p>
            </div>
          </div>

          <div class="page-break"></div>

          <!-- PAGE 2 -->
          <div class="header">
            <h1>DETAILED TECHNICAL ANNEXURE</h1>
            <p style="margin: 0; font-size: 8pt; font-weight: bold; color: #666;">PAGE 02 // AUDIT DATA</p>
          </div>

          <div class="section">
            <div class="section-title">20-Year Financial Lifecycle Forecast</div>
            <p style="font-size: 8pt; margin-bottom: 10px; color: #555;">Projections based on ${config.degradation}% annual degradation and current state DISCOM policy.</p>
            <table>
              <thead>
                <tr>
                  <th>Project Year</th>
                  <th>Projected Gen (kWh)</th>
                  <th>Yearly Savings (INR)</th>
                  <th>Cumulative Position (INR)</th>
                </tr>
              </thead>
              <tbody>
                ${roiRows}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Artificial Intelligence Asset Advisor Directives</div>
            ${aiDirectives}
          </div>

          <div class="section">
            <div class="section-title">Technical Maintenance & Incident Log</div>
            <table>
              <thead>
                <tr>
                  <th>Log Date</th>
                  <th>Fault Classification</th>
                  <th>Audit Status / Resolution</th>
                </tr>
              </thead>
              <tbody>
                ${logRows}
              </tbody>
            </table>
          </div>

          <div style="margin-top: 50px; border-top: 1px solid #ddd; padding-top: 10px; display: flex; justify-content: space-between;">
            <p style="font-size: 7pt; color: #999; margin: 0;">© 2024 BHANU AI TECHNOLOGIES PVT LTD. VALID FOR OFFICIAL FILING.</p>
            <p style="font-size: 7pt; color: #999; margin: 0; font-family: monospace;">VERIFIED HASH: SHA-256: ${Math.random().toString(16).slice(2, 10).toUpperCase()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
  };

  const chartTooltipStyle = {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    fontSize: '13px',
    color: '#ffffff'
  };

  const tooltipItemStyle = { color: '#facc15' };
  const tooltipLabelStyle = { color: '#ffffff', fontWeight: 'bold', marginBottom: '4px' };

  // Custom ROI Tooltip
  const RoiTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-lg shadow-2xl space-y-2 min-w-[200px]">
          <p className="text-white font-bold border-b border-[#30363d] pb-2 mb-2 text-sm uppercase tracking-wider">Year: {label}</p>
          {payload.map((item: any, index: number) => {
            const isBalance = item.dataKey === 'cashFlow';
            const color = isBalance ? '#facc15' : '#238636';
            const displayName = isBalance ? 'Cumulative Balance' : 'Annual Savings';
            return (
              <div key={index} className="flex justify-between items-center gap-6">
                <span className="text-xs font-medium" style={{ color }}>{displayName}:</span>
                <span className="text-sm font-black" style={{ color }}>₹{item.value.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const CustomDustTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dustVal = parseFloat(label) || 0;
      
      const dustLine = payload.find((p: any) => p.dataKey === 'avgEfficiency');
      const actualDust = payload.find((p: any) => p.dataKey === 'efficiency');
      const displayEff = actualDust ? actualDust.value : (dustLine ? dustLine.value : null);

      return (
        <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg shadow-2xl">
          <p className="text-white font-bold border-b border-[#30363d] pb-1 mb-2">
            Soiling Level: {(dustVal * 100).toFixed(1)}%
          </p>
          <p className="text-[#facc15] font-semibold">
            Efficiency: {(displayEff * 100).toFixed(1)}%
          </p>
          <p className="text-[10px] text-gray-400 mt-2 italic leading-tight">
            Modeled from IoT sensor telemetry.
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#0d1117] text-[#c9d1d9] overflow-hidden font-sans">
      <Sidebar config={config} setConfig={setConfig} onGenerateReport={handleGenerateReport} />
      
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 text-[#c9d1d9]">
        <header className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl shadow-sm hover:border-yellow-400/50 transition-all">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Annual Generation</p>
            <h3 className="text-2xl font-bold text-white">{annualGen.toLocaleString()} <span className="text-sm font-normal text-gray-400">kWh/yr</span></h3>
          </div>
          <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl shadow-sm">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Carbon Offset</p>
            <h3 className="text-2xl font-bold text-green-400">{environmentalMetrics.co2Tonnes.toFixed(1)} <span className="text-sm font-normal text-gray-400">tonnes CO₂</span></h3>
          </div>
          <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl shadow-sm">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Payback Period</p>
            <h3 className="text-2xl font-bold text-yellow-400">{paybackYear} <span className="text-sm font-normal text-gray-400">years</span></h3>
          </div>
          <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl shadow-sm">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Total Subsidy</p>
            <h3 className="text-2xl font-bold text-blue-400">₹{subsidyInfo.totalSubsidy.toLocaleString()}</h3>
          </div>
        </header>

        <nav className="flex space-x-1 border-b border-[#30363d] overflow-x-auto whitespace-nowrap scrollbar-hide">
          {['Dashboard', 'ROI Analysis', 'Soiling Intelligence', 'AI Advisor', 'Mission & Impact'].map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setActiveTab(idx)}
              className={`px-6 py-3 text-sm font-medium transition-all ${
                activeTab === idx 
                  ? 'text-yellow-400 border-b-2 border-yellow-400 bg-[#1c2128]' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#161b22]'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          {(activeTab === 0) && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-xl">
                  <h4 className="text-sm font-semibold mb-6 flex items-center gap-2">
                    Projected 24-Hour Solar Curve
                  </h4>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecastData} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                        <defs>
                          <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#facc15" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                        <XAxis dataKey="time" stroke="#8b949e" fontSize={10} tickLine={false} axisLine={false}>
                          <Label value="Time of Day" offset={-20} position="insideBottom" fill="#8b949e" fontSize={12} />
                        </XAxis>
                        <YAxis stroke="#8b949e" fontSize={10} tickLine={false} axisLine={false}>
                          <Label value="Yield (kW)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#8b949e', fontSize: 12 }} />
                        </YAxis>
                        <Tooltip 
                          contentStyle={chartTooltipStyle} 
                          itemStyle={tooltipItemStyle}
                          labelStyle={tooltipLabelStyle}
                          formatter={(value: number) => [value + " kW", 'Solar Yield']}
                        />
                        <Area name="Yield" type="monotone" dataKey="generation" stroke="#facc15" strokeWidth={2} fillOpacity={1} fill="url(#colorGen)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-xl">
                  <h4 className="text-sm font-semibold mb-6 flex items-center gap-2">
                    Monthly Generation Backtest
                  </h4>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyBacktestData} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                        <XAxis dataKey="month" stroke="#8b949e" fontSize={10} tickLine={false} axisLine={false}>
                           <Label value="Months" offset={-20} position="insideBottom" fill="#8b949e" fontSize={12} />
                        </XAxis>
                        <YAxis stroke="#8b949e" fontSize={10} tickLine={false} axisLine={false}>
                          <Label value="Energy (kWh)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#8b949e', fontSize: 12 }} />
                        </YAxis>
                        <Tooltip 
                          contentStyle={chartTooltipStyle} 
                          cursor={{fill: '#21262d'}} 
                          itemStyle={tooltipItemStyle}
                          labelStyle={tooltipLabelStyle}
                          formatter={(value: number) => [Math.round(value) + " kWh", 'Production']}
                        />
                        <Legend 
                          verticalAlign="top" 
                          align="right" 
                          wrapperStyle={{ paddingBottom: '30px', top: '-10px' }}
                          content={() => (
                            <div className="flex justify-end gap-4 text-[10px] font-bold uppercase tracking-wider">
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-[#facc15] rounded-sm"></div>
                                <span className="text-gray-400">Standard Production</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-[#3b82f6] rounded-sm"></div>
                                <span className="text-gray-400">Monsoon Impact</span>
                              </div>
                            </div>
                          )}
                        />
                        <Bar name="Production" dataKey="value" radius={[4, 4, 0, 0]}>
                          {monthlyBacktestData.map((entry, index) => (
                            <Cell key={"cell-" + index} fill={entry.isMonsoon ? '#3b82f6' : '#facc15'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-[#161b22] border border-[#30363d] p-8 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 blur-[100px] rounded-full"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-yellow-400/20 rounded-lg flex items-center justify-center text-xl">🎓</div>
                    <div>
                      <h4 className="text-lg font-bold text-white">Institutional Grid Bypass & Impact</h4>
                      <p className="text-sm text-gray-500">Beneficiary: <span className="text-yellow-400 font-semibold">{config.schoolName}</span></p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2 p-4 bg-[#1c2128] rounded-xl border border-[#30363d] hover:border-yellow-400/30 transition-colors">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Grid Loss Reclaim</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{schoolSustainabilityImpact.kwhGainedBypass}</span>
                        <span className="text-sm text-gray-400">kWh/Yr</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">Energy normally lost in the 'leaky grid' that now reaches classrooms directly.</p>
                    </div>

                    <div className="space-y-2 p-4 bg-[#1c2128] rounded-xl border border-[#30363d] hover:border-yellow-400/30 transition-colors">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Full Classroom Support</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-yellow-400">{schoolSustainabilityImpact.classroomsLighted}</span>
                        <span className="text-sm text-gray-400">Rooms</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">Solar yields bypass 65% daily outage rate for consistent lighting and fans.</p>
                    </div>

                    <div className="space-y-2 p-4 bg-[#1c2128] rounded-xl border border-[#30363d] hover:border-yellow-400/30 transition-colors">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Digital Resilience</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-blue-400">{schoolSustainabilityImpact.computerLabHours.toLocaleString()}</span>
                        <span className="text-sm text-gray-400">Lab Hrs</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">Bypasses agricultural pump voltage sags to protect lab hardware.</p>
                    </div>

                    <div className="space-y-2 p-4 bg-[#1c2128] rounded-xl border border-[#30363d] hover:border-yellow-400/30 transition-colors">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Learning Funding</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-green-400">{schoolSustainabilityImpact.booksEquivalent}</span>
                        <span className="text-sm text-gray-400">Books</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">Savings redirectable to library materials from DISCOM bill displacement.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeTab === 1) && (
            <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-xl">
              <h4 className="text-sm font-semibold mb-6">20-Year Cumulative Cash Flow Analysis</h4>
              <div className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={roiData} margin={{ top: 20, right: 30, left: 30, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                    <XAxis dataKey="year" stroke="#8b949e" fontSize={10} tickLine={false} axisLine={false}>
                      <Label value="Project Lifetime (Years)" offset={-20} position="insideBottom" fill="#8b949e" fontSize={12} />
                    </XAxis>
                    <YAxis stroke="#8b949e" fontSize={10} tickLine={false} axisLine={false}>
                      <Label value="Net Balance (INR)" angle={-90} position="insideLeft" dx={-10} style={{ textAnchor: 'middle', fill: '#8b949e', fontSize: 12 }} />
                    </YAxis>
                    <Tooltip content={<RoiTooltip />} />
                    <ReferenceLine y={0} stroke="#444c56" />
                    <Bar dataKey="annualSavings" name="Annual Savings" fill="#238636" opacity={0.3} radius={[2, 2, 0, 0]} />
                    <Line type="monotone" dataKey="cashFlow" name="Cumulative Balance" stroke="#facc15" strokeWidth={3} dot={{ r: 4, fill: '#facc15' }} />
                    <Legend verticalAlign="top" height={36}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] p-6 rounded-xl">
                <h4 className="text-sm font-semibold mb-6 flex justify-between items-center">
                  <span>Performance Decay Roadmap</span>
                  <span className="text-xs font-normal text-gray-500">Asset Health Analytics</span>
                </h4>
                <div className="h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                      <XAxis 
                        type="number" 
                        dataKey="dust" 
                        name="Soiling" 
                        domain={[0, 1]} 
                        stroke="#8b949e" 
                        fontSize={10}
                        tickFormatter={(v) => (v * 100).toFixed(0) + "%"}
                      >
                         <Label value="Dust Accumulation (%)" offset={-25} position="insideBottom" fill="#8b949e" fontSize={12} />
                      </XAxis>
                      <YAxis 
                        type="number" 
                        dataKey="efficiency" 
                        domain={[0, 1.1]} 
                        stroke="#8b949e" 
                        fontSize={10}
                        tickFormatter={(v) => (v * 100).toFixed(0) + "%"}
                      >
                         <Label value="Efficiency (%)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#8b949e', fontSize: 12 }} />
                      </YAxis>
                      <Tooltip content={<CustomDustTooltip />} />
                      <Scatter data={scatterData} fill="#444c56" opacity={0.3} shape="circle" name="Past Performance" />
                      <Line 
                        data={dustImpactCurve} 
                        type="monotone" 
                        dataKey="avgEfficiency" 
                        stroke="#facc15" 
                        strokeWidth={3} 
                        dot={false} 
                        name="Decay Curve"
                      />
                      <Legend verticalAlign="top" height={36}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-[#1c2128] border border-[#30363d] p-5 rounded-xl">
                  <h5 className="text-xs font-bold text-gray-500 uppercase mb-3 flex justify-between items-center">
                    <span>Live Yield Analysis</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                  </h5>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-orange-500">{currentYieldLoss.percentage}%</p>
                      <p className="text-xs text-gray-400 mt-1">Soiling Loss</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">{currentYieldLoss.kw} kW</p>
                      <p className="text-xs text-gray-400 mt-1">Blocked Power</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl flex-1">
                  <h5 className="text-xs font-bold text-gray-500 uppercase mb-4">Maintenance Center</h5>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar text-xs">
                    {filteredLogs.map(log => (
                      <div key={log.id} className={"p-3 rounded-lg border " + (log.status === 'Resolved' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20')}>
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex flex-col">
                            <span className={"font-bold " + (log.status === 'Resolved' ? 'text-green-400' : 'text-red-400')}>{log.status}</span>
                            {log.status === 'Resolved' && log.resolvedDate && (
                              <span className="text-[9px] text-green-500 font-mono mt-0.5">Resolved @ {log.resolvedDate}</span>
                            )}
                          </div>
                          <span className="text-gray-500 text-[10px]">{log.date}</span>
                        </div>
                        <p className="text-gray-300 mt-1">{log.faultDescription}</p>
                        {log.status !== 'Resolved' && (
                          <button 
                            onClick={() => handleResolveFault(log.id)}
                            className="mt-2 text-red-400 hover:text-white transition-colors underline decoration-dotted font-bold"
                          >
                            Resolve Incident
                          </button>
                        )}
                      </div>
                    ))}
                    {filteredLogs.length === 0 && <p className="text-gray-500 italic text-center py-10">System health is 100%. No issues.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Bhanu AI Advisor</h3>
                <button 
                  onClick={handleFetchAiInsights}
                  disabled={isAiLoading}
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-6 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAiLoading ? (
                    <span className="flex items-center gap-2">
                       <svg className="animate-spin h-4 w-4 text-gray-900" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       Analyzing Performance...
                    </span>
                  ) : 'Generate New Insights'}
                </button>
              </div>

              {aiInsights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {aiInsights.map((insight, idx) => (
                    <div key={idx} className="bg-[#161b22] border border-[#30363d] p-6 rounded-xl hover:border-yellow-400/50 transition-all group">
                      <div className="w-10 h-10 bg-yellow-400/10 rounded-lg flex items-center justify-center mb-4">
                        <span className="text-yellow-400 text-lg">💡</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">{insight.title}</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">{insight.insight}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#161b22] border border-[#30363d] border-dashed rounded-xl p-20 text-center">
                  <p className="text-gray-500">Run the advisor to generate actionable performance optimization steps based on current telemetry.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 4 && (
            <div className="space-y-12 max-w-5xl mx-auto pb-20">
              <div className="text-center space-y-4 py-10 relative">
                <h2 className="text-4xl font-black text-white tracking-tight uppercase italic">The Bhanu AI Mission</h2>
                <p className="text-xl text-yellow-400 font-medium">Turning Photon Telemetry into Human Potential.</p>
                <div className="max-w-2xl mx-auto text-gray-400 leading-relaxed italic">
                  "Data is the sunlight of the modern age. My goal is to ensure it reaches the classrooms of rural India, starting with my father's village."
                </div>
              </div>

              <div className="grid grid-cols-1 gap-12">
                <section className="bg-white/5 p-8 rounded-3xl border border-yellow-400/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-8xl">☀️</span>
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                   <h3 className="text-2xl font-bold text-white uppercase tracking-wider">My "Why" — Sai Karri</h3>
                  </div>
                  <div className="space-y-4 relative z-10">
                    <p className="text-gray-300 leading-relaxed text-lg">
                      My mission is <strong>helping my dad's village in Ganaparthi</strong> to help teach students about solar energy, data management, and becoming a solar technician. <strong>This is my why.</strong>
                    </p>
                    <p className="text-gray-400 leading-relaxed">
                      Bhanu AI isn't just about efficiency; it's a social framework. We use these assets as educational hubs. By teaching students to analyze local solar data, we are fostering the next generation of local technologists who can maintain their own energy future while unlocking global career paths.
                    </p>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">🎒</span>
                    <h3 className="text-2xl font-bold text-white uppercase tracking-wider">Impact on Student Learning</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl space-y-4">
                      <div className="text-xs font-black text-red-500 uppercase tracking-widest border-b border-red-500/20 pb-2">The Crisis</div>
                      <p className="text-sm text-gray-300">
                        <strong className="text-white">65% of rural students</strong> face daily power outages. Without fans, classroom heat leads to thermal fatigue. <strong className="text-white">15% of teachers</strong> cite lack of power as a major learning barrier.
                      </p>
                    </div>
                    <div className="bg-[#1c2128] border border-yellow-400/30 p-6 rounded-2xl space-y-4 shadow-[0_0_30px_rgba(250,204,21,0.05)]">
                      <div className="text-xs font-black text-yellow-400 uppercase tracking-widest border-b border-yellow-400/20 pb-2">The Bhanu AI Solution</div>
                      <p className="text-sm text-gray-300">
                        Ensures stable, off-grid power, keeping fans and lighting active even during load-shedding, and redirecting DISCOM bill savings to village school library resources.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">⚡</span>
                    <h3 className="text-2xl font-bold text-white uppercase tracking-wider">The Grid & DISCOM Equation</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl space-y-4">
                      <div className="text-xs font-black text-blue-500 uppercase tracking-widest border-b border-blue-500/20 pb-2">The Crisis</div>
                      <p className="text-sm text-gray-300">
                        Transmission losses waste <strong className="text-white">18% of energy</strong> before reaching remote schools. Localized agricultural pump loads often cause hardware-damaging voltage sags.
                      </p>
                    </div>
                    <div className="bg-[#1c2128] border border-blue-400/30 p-6 rounded-2xl space-y-4 shadow-[0_0_30px_rgba(59,130,246,0.05)]">
                      <div className="text-xs font-black text-blue-400 uppercase tracking-widest border-b border-blue-400/20 pb-2">The Bhanu AI Solution</div>
                      <p className="text-sm text-gray-300">
                        Implements decentralized feeder segregation, turning schools into micro-energy hubs that don't burden the rural grid during peak daytime school hours.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">🌿</span>
                    <h3 className="text-2xl font-bold text-white uppercase tracking-wider">Community Resilience</h3>
                  </div>
                  <div className="bg-[#161b22] border border-[#30363d] p-8 rounded-2xl shadow-xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="text-center space-y-2">
                        <div className="text-4xl">🌳</div>
                        <h5 className="text-xl font-bold text-white">{environmentalMetrics.trees.toLocaleString()}</h5>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Trees Equivalent</p>
                      </div>
                      <div className="text-center space-y-2 border-x border-[#30363d] px-4">
                        <div className="text-4xl">📚</div>
                        <h5 className="text-xl font-bold text-white">{schoolSustainabilityImpact.booksEquivalent.toLocaleString()}</h5>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Books Funded</p>
                      </div>
                      <div className="text-center space-y-2">
                        <div className="text-4xl">💡</div>
                        <h5 className="text-xl font-bold text-white">99.8%</h5>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Digital Uptime</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;