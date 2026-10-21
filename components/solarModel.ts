// Simple, real-world based solar model used by the simulator and the school scene.

export interface SimInputs {
  hour: number;        // local solar time, 0..24
  month: number;       // 0..11
  lat: number;         // degrees north
  cloud: number;       // 0..1 sky covered
  haze: number;        // 0..1 dust or smoke in the air
  rain: boolean;
  dustDays: number;    // days since the panels were cleaned
  shade: number;       // 0..1 share of the array in shadow
  airTemp: number;     // °C
  wind: number;        // km/h
  size: number;        // kWp
  lights: boolean;
  fans: boolean;
  lab: boolean;
}

export interface SimOutputs {
  elevation: number;   // sun height above horizon, degrees
  clearSky: number;    // W/m² with a perfectly clear sky
  irradiance: number;  // W/m² reaching the panels
  cellTemp: number;    // °C
  soilLoss: number;    // 0..1
  losses: { key: string; label: string; pct: number }[]; // negative pct = gain
  dcKw: number;
  acKw: number;
  loadKw: number;
  gridKw: number;      // + sending to grid, - buying from grid
}

const rad = (d: number) => (d * Math.PI) / 180;

export const ROOMS = 10;
export const LOADS = {
  base: 0.1,                      // router, sensors, CCTV
  lights: ROOMS * 4 * 0.02,       // four 20 W LED tubes per room
  fans: ROOMS * 2 * 0.06,         // two 60 W ceiling fans per room
  lab: 10 * 0.1,                  // ten computers at 100 W
};

export function sunElevation(hour: number, month: number, lat: number) {
  const day = 15 + month * 30.4;
  const decl = 23.45 * Math.sin(rad((360 / 365) * (284 + day)));
  const hourAngle = 15 * (hour - 12);
  const s = Math.sin(rad(lat)) * Math.sin(rad(decl)) + Math.cos(rad(lat)) * Math.cos(rad(decl)) * Math.cos(rad(hourAngle));
  return (Math.asin(Math.max(-1, Math.min(1, s))) * 180) / Math.PI;
}

// Dirt builds up quickly at first, then levels off; rain washes it away
export const soilLossFor = (days: number, rain: boolean) => (rain ? 0 : 0.3 * (1 - Math.exp(-days / 75)));

export function simulate(i: SimInputs): SimOutputs {
  const elevation = sunElevation(i.hour, i.month, i.lat);
  const cosZ = Math.sin(rad(Math.max(0, elevation)));
  // Haurwitz clear sky model
  const clearSky = cosZ > 0.01 ? 1098 * cosZ * Math.exp(-0.057 / cosZ) : 0;

  const cloudF = 1 - 0.75 * Math.pow(i.cloud, 3.4); // Kasten and Czeplak
  const hazeF = 1 - 0.35 * i.haze;
  const rainF = i.rain ? 0.8 : 1;
  const irradiance = clearSky * cloudF * hazeF * rainF;

  const soilLoss = soilLossFor(i.dustDays, i.rain);
  const shadeLoss = Math.min(0.9, i.shade * 1.4); // shade on one cell drags down its whole string

  // NOCT 45 °C, wind cools the panels
  const cellTemp = i.airTemp + (irradiance / 800) * 25 / (1 + 0.04 * i.wind);
  const tempF = 1 - 0.004 * (cellTemp - 25);

  const dcKw = Math.max(0, i.size * (irradiance / 1000) * (1 - soilLoss) * (1 - shadeLoss) * tempF);
  const acKw = Math.min(i.size, dcKw * 0.95); // inverter and wiring losses, inverter limit

  const loadKw = LOADS.base + (i.lights ? LOADS.lights : 0) + (i.fans ? LOADS.fans : 0) + (i.lab ? LOADS.lab : 0);

  const pct = (f: number) => Math.round((1 - f) * 100);
  const losses = [
    { key: 'cloud', label: 'Clouds', pct: pct(cloudF) },
    { key: 'haze', label: 'Dust in the air', pct: pct(hazeF) },
    { key: 'rain', label: 'Rain', pct: pct(rainF) },
    { key: 'soil', label: 'Dirty panels', pct: pct(1 - soilLoss) },
    { key: 'shade', label: 'Shade', pct: pct(1 - shadeLoss) },
    { key: 'heat', label: cellTemp >= 25 ? 'Hot panels' : 'Cool panels', pct: pct(tempF) },
  ];

  return { elevation, clearSky, irradiance, cellTemp, soilLoss, losses, dcKw, acKw, loadKw, gridKw: acKw - loadKw };
}

// Energy made from 5:00 up to the given hour with today's settings
export function energySoFar(i: SimInputs) {
  let kwh = 0;
  const step = 0.1;
  for (let h = 5; h < i.hour; h += step) {
    kwh += simulate({ ...i, hour: h }).acKw * Math.min(step, i.hour - h);
  }
  return kwh;
}

export const formatHour = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const suffix = hh >= 12 ? 'pm' : 'am';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${suffix}`;
};
