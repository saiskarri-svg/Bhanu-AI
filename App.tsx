import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar, Cell, Scatter, Line, ReferenceLine, ReferenceDot, ComposedChart
} from 'recharts';
import { EnergyNow } from './components/EnergyNow';
import { Box, BoxHeader, StatStrip, StatusDot, TooltipCard, Legend, CHART, TINT, Icons, axisProps, btn, BackToTop, revealWithin, ResponsiveChart, CountUp } from './components/ui';
import SolarSky from './components/SolarSky';
import LearnTab from './components/LearnTab';
import BillCheck from './components/BillCheck';
import MaintenanceLog from './components/MaintenanceLog';
import RepairLog from './components/RepairLog';
import ImpactPage from './components/ImpactPage';
import GlowSun from './components/GlowSun';
import { SourcesPage, OPEN_SOURCE_EVENT, focusSource } from './components/Sources';
import { Cite } from './components/Sources';
import { SOURCES } from './components/sourceList';
import { ThreeJobs, WhoItHelps, Problems, ScaleUp, NextSteps } from './components/MissionInteractive';
import { AskAdvisor, WeeklyReport, Diagnose, LessonBuilder } from './components/Advisor';
import { CleaningPlanner, BeforeAfter, DustOutlook, PanelHealth, Alerts } from './components/SoilingExtras';
import { FundingOptions, WhatIf, SavingsTracker, SavingsSplit, FunderSummary } from './components/ReturnsExtras';
import { getLastClean, LAST_CLEAN_EVENT } from './components/runtime';
import { classifyFault, RISK_TONE } from './components/risk';
import { useSharedSettings } from './components/useSharedSettings';
import { useReadings, readingsToLogs, ConnectData } from './components/LiveData';
import { 
  SystemConfig, SensorLog 
} from './types';
import { 
  STATE_YIELDS, EMISSION_FACTOR, TREE_ABSORPTION, GRID_STATS,
  generateSensorData, getBacktestData, 
  calculateIndianSubsidy, getHistoricalAverageYield
} from './constants';

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

  const settings = useSharedSettings(config, setConfig);
  const [activeTab, setActiveTab] = useState(0);
  // #impact opens the shareable impact page on its own
  const [standalone, setStandalone] = useState(() => window.location.hash === '#impact');
  React.useEffect(() => {
    const on = () => setStandalone(window.location.hash === '#impact');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [sensorLogs, setSensorLogs] = useState<SensorLog[]>(() => generateSensorData());
  const aiInsights: {title: string, insight: string}[] = [];
  const [lastClean, setLastCleanState] = useState<string | null>(getLastClean());
  React.useEffect(() => {
    const on = () => setLastCleanState(getLastClean());
    window.addEventListener(LAST_CLEAN_EVENT, on);
    return () => window.removeEventListener(LAST_CLEAN_EVENT, on);
  }, []);

  const annualGen = useMemo(() => {
    return config.systemSize * (STATE_YIELDS[config.state] || 1450);
  }, [config.state, config.systemSize]);

  // Real readings replace the sample data everywhere once the school adds any
  const readingsData = useReadings();
  const realData = readingsData.readings.length > 0;
  React.useEffect(() => {
    setSensorLogs(realData ? readingsToLogs(readingsData.readings, annualGen) : generateSensorData());
  }, [realData, readingsData.readings, annualGen]);
  const lastReading = readingsData.readings[0]?.date;

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
    return calculateIndianSubsidy(config.systemSize, config.state, config.grant);
  }, [config.systemSize, config.state]);

  const latestStatus = useMemo(() => sensorLogs[sensorLogs.length - 1], [sensorLogs]);

  const forecastData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 24; i++) {
      // Sunrise about 6:00, peak at noon, sunset about 18:00
      const gen = Math.max(0, config.systemSize * 0.75 * Math.sin(((i - 6) * Math.PI) / 12));
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

  // Everything the AI advisor knows about this school, sent with each question.
  const advisorContext = useMemo(() => {
    const today = new Date();
    const recent = sensorLogs.slice(-14).map(l => `${l.date}: efficiency ${(l.efficiency * 100).toFixed(0)}%, dust ${(l.dustIndex * 100).toFixed(0)}%, ${l.status}`).join('\n');
    const faults = sensorLogs.filter(l => l.status === 'Maintenance Required').map(l => `${l.date}: ${l.faultDescription || 'fault'}`).join('\n') || 'none';
    return [
      `School: ${config.schoolName}, ${config.village}, ${config.state}, India`,
      `System: ${config.systemSize} kWp grid-tied rooftop solar, no battery`,
      `Electricity price: Rs ${config.unitPrice} per unit (kWh)`,
      `Expected generation: about ${Math.round(annualGen).toLocaleString('en-IN')} kWh a year`,
      `Cost: Rs ${Math.round(config.systemSize * config.costPerKw).toLocaleString('en-IN')} before subsidy, grants secured Rs ${Math.round(subsidyInfo.totalSubsidy).toLocaleString('en-IN')} (schools get no central rooftop subsidy)`,
      `Breaks even in year: ${paybackYear}`,
      `Today: ${today.toDateString()}`,
      `Soiling loss now: ${currentYieldLoss.percentage}% (${currentYieldLoss.kw} kW blocked)`,
      `Last cleaning logged: ${lastClean ? new Date(lastClean).toDateString() : 'none logged'}`,
      `Open faults:\n${faults}`,
      realData ? 'Data source: real daily readings from the school inverter (dust level is estimated from the shortfall).' : 'Data source: SAMPLE data for demonstration, not real readings. Say so if asked about real performance.',
      `Last 14 days of sensor readings:\n${recent}`,
    ].join('\n');
  }, [config, annualGen, subsidyInfo, paybackYear, currentYieldLoss, lastClean, sensorLogs, realData]);

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
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .card { border: 1.5px solid #000; padding: 15px; border-radius: 2px; background: #fafafa; }
          .card h3 { margin: 0 0 10px; font-size: 10pt; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .card p { margin: 5px 0; font-size: 9.5pt; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
          th, td { border: 1px solid #000; padding: 10px; text-align: left; }
          th { background: #eee; font-weight: bold; text-transform: uppercase; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
          .kpi-box { border: 1px solid #000; padding: 10px; text-align: center; }
          .kpi-box span { display: block; font-size: 7pt; font-weight: bold; color: #666; text-transform: uppercase; }
          .kpi-box strong { display: block; font-size: 13pt; margin-top: 2px; }
          .signature-area { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 50px; }
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

  // AI Advisor and Learn have their own main action, so Export steps back
  // A citation anywhere on the site opens the Sources tab at its entry
  React.useEffect(() => {
    const on = (e: Event) => { setActiveTab(7); focusSource((e as CustomEvent<string>).detail); };
    window.addEventListener(OPEN_SOURCE_EVENT, on);
    return () => window.removeEventListener(OPEN_SOURCE_EVENT, on);
  }, []);
  // A new tab always opens at its top, not where the last tab was scrolled to
  const goTab = (t: number) => { setActiveTab(t); window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); };
  // The tab underline slides to the active tab; on a phone the tab also scrolls into view
  const navRef = React.useRef<HTMLElement>(null);
  const [ink, setInk] = useState<{ x: number; w: number } | null>(null);
  React.useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const place = () => {
      const b = nav.querySelectorAll<HTMLElement>('[role="tab"]')[activeTab];
      if (b) setInk({ x: b.offsetLeft, w: b.offsetWidth });
    };
    place();
    const b = nav.querySelectorAll<HTMLElement>('[role="tab"]')[activeTab];
    if (b && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: b.offsetLeft - nav.clientWidth / 2 + b.offsetWidth / 2, behavior: 'smooth' });
    const ro = new ResizeObserver(place);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [activeTab]);
  const pageRef = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => revealWithin(pageRef.current), [activeTab]);
  const pageHasMainAction = activeTab === 2 || activeTab === 3 || activeTab === 4 || activeTab === 5;
  const openFaults = sensorLogs.filter(l => l.status === 'Maintenance Required').length;
  const netInvestment = -roiData[0].cashFlow;
  const finalBalance = roiData[roiData.length - 1].cashFlow;
  const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

  const nowLabel = `${new Date().getHours()}:00`;
  const cashValues = roiData.map(d => d.cashFlow);
  const cashMax = Math.max(0, ...cashValues);
  const cashMin = Math.min(0, ...cashValues);
  const zeroOffset = cashMax === cashMin ? 0 : cashMax / (cashMax - cashMin);
  const effColor = (e: number) => (e >= 0.75 ? CHART.positive : e >= 0.45 ? CHART.sun : CHART.negative);

  const tabs = [
    { label: 'Overview' },
    { label: 'Returns' },
    { label: 'Maintenance', count: realData ? openFaults : 0 },
    { label: 'AI Advisor' },
    { label: 'Learn' },
    { label: 'Mission' },
    { label: 'Impact' },
    ...(SOURCES.length ? [{ label: 'Sources' }] : []),
  ];

  const ForecastTooltip = ({ active, payload, label }: any) =>
    active && payload?.length ? (
      <TooltipCard title={label} rows={[{ label: 'Output', value: `${payload[0].value} kW`, color: CHART.sun }]} />
    ) : null;

  const MonthlyTooltip = ({ active, payload, label }: any) =>
    active && payload?.length ? (
      <TooltipCard
        title={label}
        rows={[{
          label: payload[0].payload.isMonsoon ? 'Monsoon month' : 'Production',
          value: `${Math.round(payload[0].value).toLocaleString()} kWh`,
          color: payload[0].payload.isMonsoon ? CHART.monsoon : CHART.sun,
        }]}
      />
    ) : null;

  const RoiTooltip = ({ active, payload, label }: any) =>
    active && payload?.length ? (
      <TooltipCard
        title={`Year ${label}`}
        rows={payload.map((item: any) => ({
          label: item.dataKey === 'cashFlow' ? 'Running balance' : 'Yearly savings',
          value: (item.value < 0 ? '-' : '') + inr(Math.abs(item.value)),
          color: item.dataKey === 'cashFlow' ? (item.value < 0 ? CHART.negative : CHART.positive) : CHART.positive,
        }))}
      />
    ) : null;

  const DustTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const eff = p.efficiency ?? p.avgEfficiency;
    return (
      <TooltipCard
        title={`Dust ${(p.dust * 100).toFixed(0)}%`}
        rows={[{ label: p.efficiency !== undefined ? 'Measured' : 'Expected', value: `${(eff * 100).toFixed(1)}%` }]}
      />
    );
  };

  const Spinner = () => (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );

  if (standalone) {
    return (
      <div className="relative min-h-screen bg-bg text-fg font-sans isolate">
        <SolarSky />
        <ImpactPage
          config={config}
          annualGen={annualGen}
          standalone
          onOpenDashboard={() => { try { history.replaceState(null, '', ' '); } catch { /* ignore */ } setStandalone(false); setActiveTab(0); }}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bg text-fg font-sans isolate">
      <SolarSky />
      <header className="sticky top-0 z-30 border-b border-line bg-[rgba(11,11,13,0.72)] backdrop-blur-xl backdrop-saturate-150">
        <div className="max-w-page mx-auto px-[var(--gutter)] flex flex-wrap items-center gap-x-8">
          <div className="order-1 flex items-center gap-2.5 h-14 lg:h-16">
            <GlowSun className="h-12 w-12 lg:h-14 lg:w-14 -mx-2 -my-2 shrink-0" />
            <span className="text-[17px] font-semibold tracking-tight text-fg">Bhanu AI</span>
          </div>

          <nav
            ref={navRef}
            role="tablist"
            aria-label="Sections"
            className="relative order-3 lg:order-2 w-full lg:w-auto -mx-[var(--gutter)] px-[var(--gutter)] lg:mx-0 lg:px-0 flex gap-6 overflow-x-auto no-scrollbar"
          >
            {tabs.map((tab, idx) => {
              const active = activeTab === idx;
              return (
                <button
                  key={tab.label}
                  role="tab"
                  aria-selected={active}
                  onClick={() => goTab(idx)}
                  className={`relative shrink-0 h-11 lg:h-16 flex items-center gap-1.5 text-sm transition-colors ${
                    active ? 'text-fg font-medium' : 'text-muted hover:text-fg'
                  }`}
                >
                  {tab.label}
                  {!!tab.count && <span className="text-xs text-muted tabular-nums">{tab.count}</span>}
                </button>
              );
            })}
            {ink && <span aria-hidden="true" className="tab-ink absolute left-0 bottom-0 h-0.5 rounded-full bg-fg pointer-events-none" style={{ width: ink.w, transform: `translateX(${ink.x}px)` }} />}
          </nav>

          <div className="order-2 lg:order-3 ml-auto flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-line text-xs text-muted">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                {realData && <span className="absolute inset-0 rounded-full bg-ok opacity-60 animate-ping" />}
                <span className={`relative h-1.5 w-1.5 rounded-full ${realData ? 'bg-ok' : 'bg-muted'}`} />
              </span>
              {realData ? `Real data · ${new Date(lastReading + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Sample data'}
            </span>
            <button onClick={handleGenerateReport} className={pageHasMainAction ? btn.secondary : btn.primary}>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 15.5h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export report
            </button>
          </div>
        </div>
      </header>

      <div ref={pageRef} className={`relative max-w-page mx-auto px-[var(--gutter)] py-6 grid gap-6 items-start ${activeTab === 0 ? 'lg:grid-cols-[300px_minmax(0,1fr)]' : ''}`}>
        {/* Site settings live on the Overview tab only */}
        {activeTab === 0 && <Sidebar config={config} setConfig={setConfig} saveNote={settings.mode === 'shared' ? (settings.canWrite ? 'Settings are saved for everyone who opens this page.' : 'You can view these settings. Changes you make stay on this device.') : settings.mode === 'local' ? 'Settings are saved on this device.' : undefined} />}

        <main className="min-w-0 space-y-6">
          {activeTab === 0 && (
          <StatStrip
            stats={[
              { label: 'Annual generation', value: annualGen.toLocaleString(), unit: 'kWh / yr', icon: Icons.sun, tint: TINT.sun },
              { label: 'Carbon offset', value: environmentalMetrics.co2Tonnes.toFixed(1), unit: 't CO₂ / yr', icon: Icons.leaf, tint: TINT.leaf },
              { label: 'Payback', value: paybackYear, unit: 'years', icon: Icons.clock, tint: TINT.sky },
              { label: 'Saved a year (rough)', value: inr(annualGen * config.unitPrice), icon: Icons.rupee, tint: TINT.leaf },
            ]}
          />
          )}

          {activeTab === 0 && (
            <div className="space-y-6">
              <EnergyNow forecast={forecastData} />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Box>
                  <BoxHeader title="Typical day" meta="kW by hour" />
                  <div className="h-[300px] px-2 pb-3">
                    <ResponsiveChart>
                      <AreaChart data={forecastData} margin={{ top: 16, right: 16, left: -8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART.sun} stopOpacity={0.32} />
                            <stop offset="100%" stopColor={CHART.sunLow} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="sunStroke" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={CHART.sunLow} />
                            <stop offset="50%" stopColor="#ffe08a" />
                            <stop offset="100%" stopColor={CHART.sunLow} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={CHART.grid} vertical={false} />
                        <XAxis dataKey="time" {...axisProps} interval={3} />
                        <YAxis {...axisProps} width={44} domain={[0, (max: number) => Math.max(1, Math.ceil(max))]} allowDecimals={false} />
                        <Tooltip content={<ForecastTooltip />} cursor={{ stroke: CHART.faint }} />
                        <ReferenceLine x={nowLabel} stroke={CHART.sun} strokeOpacity={0.6} strokeDasharray="3 3" label={{ value: 'Now', position: 'insideTopRight', fill: CHART.sun, fontSize: 11 }} />
                        <Area type="monotone" dataKey="generation" stroke="url(#sunStroke)" strokeWidth={2} fill="url(#colorGen)" activeDot={{ r: 4, fill: CHART.sun, stroke: 'none' }} />
                      </AreaChart>
                    </ResponsiveChart>
                  </div>
                </Box>

                <Box>
                  <BoxHeader
                    title="Monthly generation"
                    meta={<Legend items={[{ label: 'Dry season', color: CHART.sun }, { label: 'Monsoon', color: CHART.monsoon }]} />}
                  />
                  <div className="h-[300px] px-2 pb-3">
                    <ResponsiveChart>
                      <BarChart data={monthlyBacktestData} margin={{ top: 16, right: 16, left: -8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="barSun" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART.sun} />
                            <stop offset="100%" stopColor={CHART.sunLow} stopOpacity={0.55} />
                          </linearGradient>
                          <linearGradient id="barRain" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART.monsoon} />
                            <stop offset="100%" stopColor={CHART.monsoon} stopOpacity={0.45} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={CHART.grid} vertical={false} />
                        <XAxis dataKey="month" {...axisProps} />
                        <YAxis {...axisProps} width={44} />
                        <Tooltip content={<MonthlyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={28}>
                          {monthlyBacktestData.map((entry, index) => (
                            <Cell key={'cell-' + index} fill={entry.isMonsoon ? 'url(#barRain)' : 'url(#barSun)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveChart>
                  </div>
                </Box>
              </div>

              <section className="space-y-3">
                <div>
                  <h2 className="text-[15px] font-semibold">What it means for {config.schoolName || 'the school'}</h2>
                  <p className="text-sm text-muted">Yearly, based on this site's generation and tariff.</p>
                </div>
                <StatStrip
                  stats={[
                    { icon: Icons.bolt, tint: TINT.sun, label: 'Grid loss avoided', value: schoolSustainabilityImpact.kwhGainedBypass.toLocaleString(), unit: 'kWh', note: <>About 17% of India's power is lost on the grid<Cite id="td-loss" />. Power made on the roof is used right there.</> },
                    { icon: Icons.room, tint: TINT.sky, label: 'Classrooms powered', value: schoolSustainabilityImpact.classroomsLighted, unit: 'rooms', note: 'Daytime power for lights and fans, made on the school\'s own roof.' },
                    { icon: Icons.screen, tint: TINT.violet, label: 'Computer lab time', value: schoolSustainabilityImpact.computerLabHours.toLocaleString(), unit: 'hours', note: 'Daytime solar runs the lab. Add a UPS to ride through cuts and voltage dips.' },
                    { icon: Icons.book, tint: TINT.leaf, label: 'Library budget', value: schoolSustainabilityImpact.booksEquivalent.toLocaleString(), unit: 'books', note: 'Bill savings that can go to library materials instead.' },
                  ]}
                />
              </section>
              <ConnectData config={config} annualGen={annualGen} data={readingsData} />
            </div>
          )}

          {activeTab === 1 && (
            <div className="space-y-6">
            <FundingOptions config={config} annualGen={annualGen} />
            <Box>
              <BoxHeader
                title="20 year cash flow"
                meta={<Legend items={[{ label: 'Still paying off', color: CHART.negative }, { label: 'In profit', color: CHART.positive }, { label: 'Yearly savings', color: CHART.faint }]} />}
              />
              <p className="px-5 text-sm text-muted">
                {inr(netInvestment)} after grants · breaks even in year {paybackYear} · {inr(finalBalance)} ahead by year 20
              </p>
              <div className="h-[clamp(380px,62vh,600px)] px-2 pb-3 pt-2">
                <ResponsiveChart>
                  <ComposedChart data={roiData} margin={{ top: 16, right: 16, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
                        <stop offset={zeroOffset} stopColor={CHART.positive} />
                        <stop offset={zeroOffset} stopColor={CHART.negative} />
                      </linearGradient>
                      <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={CHART.positive} stopOpacity={0.28} />
                        <stop offset={zeroOffset} stopColor={CHART.positive} stopOpacity={0.02} />
                        <stop offset={zeroOffset} stopColor={CHART.negative} stopOpacity={0.02} />
                        <stop offset="1" stopColor={CHART.negative} stopOpacity={0.28} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="year" {...axisProps} />
                    <YAxis {...axisProps} width={64} tickFormatter={(v) => `${v < 0 ? '-' : ''}₹${Math.abs(Math.round(v / 1000))}k`} />
                    <Tooltip content={<RoiTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <ReferenceLine y={0} stroke={CHART.faint} />
                    {typeof paybackYear === 'number' && (
                      <ReferenceLine x={paybackYear} className="payback-mark" stroke={CHART.positive} strokeDasharray="3 3" label={{ value: `Paid back, year ${paybackYear}`, position: 'insideTopLeft', fill: CHART.positive, fontSize: 11 }} />
                    )}
                    <Bar dataKey="annualSavings" fill={CHART.faint} fillOpacity={0.6} radius={[2, 2, 0, 0]} maxBarSize={22} />
                    <Area type="monotone" dataKey="cashFlow" stroke="url(#splitStroke)" strokeWidth={2.25} fill="url(#splitFill)" baseValue={0} dot={false} activeDot={{ r: 4, fill: CHART.primary, stroke: 'none' }} />
                    {typeof paybackYear === 'number' && (
                      <ReferenceDot x={paybackYear} y={roiData[paybackYear].cashFlow} r={5} className="payback-mark" fill={CHART.positive} stroke="var(--surface)" strokeWidth={2} />
                    )}
                  </ComposedChart>
                </ResponsiveChart>
              </div>
            </Box>
            <FunderSummary config={config} annualGen={annualGen} payback={paybackYear} />
            <SavingsTracker config={config} annualGen={annualGen} />
            <BillCheck config={config} annualGen={annualGen} />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <WhatIf config={config} annualGen={annualGen} />
              <SavingsSplit config={config} annualGen={annualGen} />
            </div>
            </div>
          )}

          {activeTab === 2 && (
            <div className="space-y-6">
            <CleaningPlanner config={config} annualGen={annualGen} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              <Box className="xl:col-span-2">
                <BoxHeader
                  title="Dust vs efficiency"
                  meta={<Legend items={[{ label: 'Healthy', color: CHART.positive }, { label: 'Losing output', color: CHART.sun }, { label: 'Needs cleaning', color: CHART.negative }, { label: 'Expected', color: CHART.primary }]} />}
                />
                <div className="h-[380px] xl:h-[514px] px-2 pb-3">
                  <ResponsiveChart>
                    <ComposedChart margin={{ top: 16, right: 16, bottom: 0, left: -8 }}>
                      <CartesianGrid stroke={CHART.grid} vertical={false} />
                      <XAxis type="number" dataKey="dust" domain={[0, 1]} {...axisProps} tickFormatter={(v) => (v * 100).toFixed(0) + '%'} />
                      <YAxis type="number" dataKey="efficiency" domain={[0, 1.1]} {...axisProps} width={48} tickFormatter={(v) => (v * 100).toFixed(0) + '%'} />
                      <Tooltip content={<DustTooltip />} cursor={{ stroke: CHART.faint }} />
                      <Scatter data={scatterData} shape="circle">
                        {scatterData.map((d, i) => (
                          <Cell key={i} fill={effColor(d.efficiency)} fillOpacity={0.75} />
                        ))}
                      </Scatter>
                      <Line data={dustImpactCurve} type="monotone" dataKey="avgEfficiency" stroke={CHART.primary} strokeWidth={2} dot={false} activeDot={false} />
                    </ComposedChart>
                  </ResponsiveChart>
                </div>
                <p className="px-5 pb-4 -mt-1 text-xs text-muted">Horizontal: dust on panels. Vertical: efficiency. From the last 120 days of sensor data.</p>
              </Box>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-px bg-line border border-line rounded-box overflow-hidden">
                  <div className="bg-surface px-5 py-4">
                    <p className="flex items-center gap-2 text-xs text-muted">
                      <span className="h-6 w-6 rounded-ctl flex items-center justify-center" style={{ color: CHART.sun, background: `color-mix(in srgb, ${CHART.sun} 14%, transparent)` }} aria-hidden="true">{Icons.drop}</span>
                      Soiling loss now
                    </p>
                    <p className="mt-1 flex items-baseline gap-1.5">
                      <span className="font-display font-semibold text-[28px] leading-none tabular-nums"><CountUp value={currentYieldLoss.percentage} /></span>
                      <span className="text-xs text-muted">%</span>
                    </p>
                  </div>
                  <div className="bg-surface px-5 py-4">
                    <p className="flex items-center gap-2 text-xs text-muted">
                      <span className="h-6 w-6 rounded-ctl flex items-center justify-center" style={{ color: CHART.negative, background: `color-mix(in srgb, ${CHART.negative} 14%, transparent)` }} aria-hidden="true">{Icons.bolt}</span>
                      Power blocked
                    </p>
                    <p className="mt-1 flex items-baseline gap-1.5">
                      <span className="font-display font-semibold text-[28px] leading-none tabular-nums"><CountUp value={currentYieldLoss.kw} /></span>
                      <span className="text-xs text-muted">kW</span>
                    </p>
                  </div>
                </div>

                <Box>
                  <BoxHeader title="Maintenance" meta={`${realData ? '' : 'Sample · '}${openFaults ? `${openFaults} open` : 'All clear'}`} />
                  {!realData && <p className="px-5 -mt-1 pb-3 text-xs text-muted">These are sample faults for practice. Real faults show here once inverter readings are added on the Overview tab.</p>}
                  <ul className="mt-2 border-t border-line divide-y divide-line max-h-[420px] overflow-y-auto">
                    {filteredLogs.map(log => {
                      const open = log.status !== 'Resolved';
                      return (
                        <li key={log.id} className="px-5 py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs text-muted">
                              {open ? (() => { const r = classifyFault(log.faultDescription || ''); return (
                                <StatusDot tone={RISK_TONE[r]} className={`text-${RISK_TONE[r]}`} pulse={r === 'High'}>{r} risk</StatusDot>
                              ); })() : (
                                <StatusDot tone="ok" className="text-ok">Resolved</StatusDot>
                              )}
                              <span> · {log.date}</span>
                            </p>
                            <p className="mt-0.5 text-sm text-fg">{log.faultDescription}</p>
                            {!open && log.resolvedDate && <p className="text-xs text-muted">Closed {log.resolvedDate}</p>}
                          </div>
                          {open && (
                            <button onClick={() => handleResolveFault(log.id)} className={`${btn.quiet} shrink-0`}>
                              Resolve
                            </button>
                          )}
                        </li>
                      );
                    })}
                    {filteredLogs.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">No issues. Every panel is healthy.</li>}
                  </ul>
                </Box>
              </div>
            </div>
            <MaintenanceLog />
            <RepairLog />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <BeforeAfter config={config} annualGen={annualGen} />
              <PanelHealth config={config} annualGen={annualGen} />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <DustOutlook config={config} />
              <Alerts config={config} annualGen={annualGen} faults={sensorLogs.filter(l => l.status === 'Maintenance Required').map(l => l.faultDescription || 'Fault reported')} sample={!realData} />
            </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="space-y-6">
              <AskAdvisor context={advisorContext} />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                <Diagnose context={advisorContext} />
                <WeeklyReport context={advisorContext} school={config.schoolName} />
              </div>
              <LessonBuilder context={advisorContext} />
            </div>
          )}

          {activeTab === 4 && <LearnTab config={config} annualGen={annualGen} setConfig={setConfig} />}

          {activeTab === 5 && (
            <article className="max-w-3xl mx-auto w-full space-y-12 pb-12">
              <p className="pt-6 flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-1 font-display font-semibold text-[28px] sm:text-4xl tracking-tight text-accent">
                <span>Same Sun</span>
                <GlowSun className="h-14 w-14 sm:h-20 sm:w-20 -my-4 -mx-2 sm:-mx-1 shrink-0" />
                <span>Same Chance</span>
              </p>

              <section className="space-y-3 pb-10 border-b border-line">
                <h3 className="text-xl font-semibold">How it started</h3>
                <blockquote className="border-l-2 border-line pl-4 text-silver leading-relaxed">
                  "Sunlight already reaches every school in rural India. Knowledge should too. I'm starting with my father's village."
                </blockquote>
                <p className="text-xs text-muted">Sai Karri, founder</p>
                <p className="text-muted leading-relaxed">
                  Bhanu AI began with my dad's village in Ganaparthi: teaching students about solar energy, data management and becoming solar technicians. Bhanu AI isn't just about efficiency; it's a social framework. We use these systems as educational hubs, so students who learn to read local solar data grow into the technologists who maintain their own energy future and unlock global career paths. Ganaparthi is the first school. The goal is every school.
                </p>
              </section>

              <header className="space-y-4">
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight [text-wrap:balance]">The Bhanu AI mission</h2>
                <p className="text-lg text-silver [text-wrap:balance]">Every rural school powered by the sun, and every student able to understand it.</p>
                <p className="text-muted leading-relaxed">
                  Over 73,000 schools in India still have no electricity at all, and many rural schools that are connected face long power cuts<Cite id="udise-power" />. Bhanu AI turns a school's rooftop solar system into three things at once: a power plant that runs lights, fans and computers in the daytime and cuts the bill, a classroom where students learn from real data, and a training ground for the jobs a solar powered world needs. It starts in one village and is built to work in any school, in any state, in any country with sun.
                </p>
              </header>

              <ThreeJobs onGo={goTab} />
              <WhoItHelps />
              <Problems />
              <ScaleUp annualGen={annualGen} unitPrice={config.unitPrice} co2PerSchool={environmentalMetrics.co2Tonnes} treesPerSchool={environmentalMetrics.trees} />
              <NextSteps onGo={goTab} />
            </article>
          )}

          {activeTab === 7 && <SourcesPage />}

          {activeTab === 6 && <ImpactPage config={config} annualGen={annualGen} standalone={false} onOpenDashboard={() => goTab(0)} />}
        </main>
        <BackToTop />
      </div>
    </div>
  );
};

export default App;
