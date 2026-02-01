
export interface SystemConfig {
  state: string;
  village: string;
  schoolName: string;
  systemSize: number;
  costPerKw: number;
  unitPrice: number;
  degradation: number;
}

export interface SensorLog {
  id: string;
  date: string;
  efficiency: number;
  dustIndex: number;
  status: 'Active & Optimized' | 'Cleaning Needed' | 'Underperforming' | 'Maintenance Required' | 'Resolved';
  resolvedDate?: string;
  faultDescription?: string;
}

export interface YieldData {
  [key: string]: number;
}

export interface ForecastPoint {
  time: string;
  generation: number;
}

export interface MonthlyGen {
  month: string;
  value: number;
  isMonsoon: boolean;
}

export interface SubsidyInfo {
  centralSubsidy: number;
  stateBonus: number;
  totalSubsidy: number;
  description: string;
}
