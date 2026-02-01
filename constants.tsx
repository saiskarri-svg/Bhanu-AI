
import React from 'react';
import { YieldData, SensorLog, MonthlyGen, SubsidyInfo } from './types';

export const STATE_YIELDS: YieldData = {
  "Andaman and Nicobar Islands": 1350,
  "Andhra Pradesh": 1520,
  "Arunachal Pradesh": 1200,
  "Assam": 1250,
  "Bihar": 1300,
  "Chandigarh": 1420,
  "Chhattisgarh": 1480,
  "Dadra and Nagar Haveli and Daman and Diu": 1500,
  "Delhi": 1400,
  "Goa": 1450,
  "Gujarat": 1550,
  "Haryana": 1420,
  "Himachal Pradesh": 1350,
  "Jammu and Kashmir": 1320,
  "Jharkhand": 1400,
  "Karnataka": 1450,
  "Kerala": 1400,
  "Ladakh": 1650,
  "Lakshadweep": 1480,
  "Madhya Pradesh": 1530,
  "Maharashtra": 1500,
  "Manipur": 1220,
  "Meghalaya": 1150,
  "Mizoram": 1180,
  "Nagaland": 1200,
  "Odisha": 1450,
  "Puducherry": 1500,
  "Punjab": 1430,
  "Rajasthan": 1600,
  "Sikkim": 1100,
  "Tamil Nadu": 1480,
  "Telangana": 1510,
  "Tripura": 1210,
  "Uttar Pradesh": 1350,
  "Uttarakhand": 1380,
  "West Bengal": 1320
};

export const GRID_STATS = {
  transmissionLossBypass: 0.18, // 18% average transmission loss avoided
  dailyOutageRate: 0.65,        // 65% students report outages
  reliablePowerRate: 0.05,     // Only 5% have reliable power
  learningImpactRate: 0.15     // 15% teachers cite lack of fans/power as learning barrier
};

export const STATE_TARIFFS: Record<string, number> = {
  "Andaman and Nicobar Islands": 7.0,
  "Andhra Pradesh": 7.2,
  "Arunachal Pradesh": 5.5,
  "Assam": 7.8,
  "Bihar": 7.5,
  "Chandigarh": 6.2,
  "Chhattisgarh": 6.8,
  "Dadra and Nagar Haveli and Daman and Diu": 5.2,
  "Delhi": 8.1,
  "Goa": 5.8,
  "Gujarat": 6.5,
  "Haryana": 7.0,
  "Himachal Pradesh": 5.5,
  "Jammu and Kashmir": 5.8,
  "Jharkhand": 6.5,
  "Karnataka": 8.0,
  "Kerala": 7.5,
  "Ladakh": 5.2,
  "Lakshadweep": 6.0,
  "Madhya Pradesh": 7.5,
  "Maharashtra": 9.2,
  "Manipur": 6.5,
  "Meghalaya": 6.2,
  "Mizoram": 5.8,
  "Nagaland": 6.0,
  "Odisha": 6.2,
  "Puducherry": 6.5,
  "Punjab": 7.5,
  "Rajasthan": 8.2,
  "Sikkim": 5.0,
  "Tamil Nadu": 7.5,
  "Telangana": 7.8,
  "Tripura": 6.5,
  "Uttar Pradesh": 7.5,
  "Uttarakhand": 6.2,
  "West Bengal": 8.5
};

export const VILLAGE_DATA: Record<string, string[]> = {
  "Andaman and Nicobar Islands": ["Port Blair", "Havelock", "Neil Island", "Diglipur"],
  "Andhra Pradesh": ["Ganaparthi", "Amaravati", "Tirupati", "Visakhapatnam", "Vijayawada", "Kurnool"],
  "Arunachal Pradesh": ["Itanagar", "Tawang", "Ziro", "Pasighat"],
  "Assam": ["Guwahati", "Majuli", "Tezpur", "Dibrugarh", "Silchar"],
  "Bihar": ["Patna", "Gaya", "Nalanda", "Muzaffarpur", "Bhagalpur"],
  "Chandigarh": ["Sector 1", "Sector 17", "Manimajra"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Jagdalpur"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Silvassa", "Daman", "Diu"],
  "Delhi": ["New Delhi", "Dwarka", "Rohini", "Saket", "Vasant Kunj"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Kutch"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Rohtak"],
  "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala", "Solan", "Kullu"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Gulmarg", "Pahalgam"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Munnar", "Wayanad"],
  "Ladakh": ["Leh", "Kargil", "Nubra", "Pangong"],
  "Lakshadweep": ["Kavaratti", "Agatti", "Minicoy"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
  "Manipur": ["Imphal", "Ukhrul", "Churachandpur"],
  "Meghalaya": ["Shillong", "Cherrapunji", "Tura"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Puri", "Rourkela", "Sambalpur"],
  "Puducherry": ["Puducherry City", "Karaikal", "Mahe", "Yanam"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Bikaner", "Ajmer", "Pushkar"],
  "Sikkim": ["Gangtok", "Pelling", "Lachung", "Namchi"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Kanyakumari"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar"],
  "Tripura": ["Agartala", "Udaipur", "Dharmanagar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Noida"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh", "Nainital", "Mussoorie"],
  "West Bengal": ["Kolkata", "Darjeeling", "Siliguri", "Howrah", "Durgapur"]
};

export const SCHOOL_DATA: Record<string, string> = {
  "Ganaparthi": "ZPH High School",
  "Amaravati": "Amaravati Public School",
  "Tirupati": "Sri Venkateswara High School",
  "Visakhapatnam": "Vizag Modern School",
  "Ahmedabad": "MG High School",
  "Mumbai": "Holy Cross High",
  "Pune": "Jnana Prabodhini",
  "Bengaluru": "Bishop Cotton School",
  "Chennai": "Don Bosco School",
  "Jaipur": "St. Xavier's High School"
};

export const EMISSION_FACTOR = 0.82; // kg CO2/kWh
export const TREE_ABSORPTION = 20;    // kg CO2/year per tree

export const FAULT_DESCRIPTIONS = [
  "Inverter DC Injection Fault",
  "String 2 Isolation Low",
  "AC Surge Protection Tripped",
  "Connector Corroded - Thermal Warning",
  "Grid Overvoltage Trip",
  "MC4 Connector Loose",
];

export const generateSensorData = (): SensorLog[] => {
  const data: SensorLog[] = [];
  const now = new Date();
  for (let i = 120; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    
    const dust = Math.random(); 
    const baseEfficiency = 0.98;
    const penaltyFactor = 0.9;
    const noise = (Math.random() - 0.5) * 0.05;
    const pr = Math.max(0.05, baseEfficiency * (1 - (dust * penaltyFactor)) + noise);
    
    let status: SensorLog['status'] = 'Active & Optimized';
    let faultDescription = undefined;
    
    if (i % 30 === 0 && i !== 0) {
      status = 'Resolved';
      faultDescription = FAULT_DESCRIPTIONS[Math.floor(Math.random() * FAULT_DESCRIPTIONS.length)];
    } else if (pr < 0.4) {
      status = 'Maintenance Required';
      faultDescription = "Critical Performance Drop - High Soiling/Hardware Check";
    } else if (dust > 0.25) {
      status = 'Cleaning Needed';
    } else if (pr < 0.85) {
      status = 'Underperforming';
    }

    data.push({
      id: `log-${i}-${d.getTime()}`,
      date: d.toLocaleDateString(),
      efficiency: pr,
      dustIndex: dust,
      status,
      faultDescription,
      resolvedDate: status === 'Resolved' ? `${d.toLocaleDateString()} 09:30 AM` : undefined
    });
  }
  return data;
};

export const getHistoricalAverageYield = (state: string): number => {
  const baseline = STATE_YIELDS[state] || 1450;
  let totalYield = 0;
  for (let i = 0; i < 10; i++) {
    const variance = 1 + (Math.random() * 0.16 - 0.08);
    totalYield += baseline * variance;
  }
  return totalYield / 10;
};

export const calculateIndianSubsidy = (systemSize: number, state: string): SubsidyInfo => {
  const benchmarkCostPerKw = 55000;
  const cfaPercentage = 0.30;
  let centralSubsidy = systemSize * benchmarkCostPerKw * cfaPercentage;
  let stateBonus = 0;
  const schoolBonusStates = ["Andhra Pradesh", "Tamil Nadu", "Karnataka", "Gujarat", "Rajasthan"];
  if (schoolBonusStates.includes(state)) {
    stateBonus = centralSubsidy * 0.15;
  }
  return {
    centralSubsidy,
    stateBonus,
    totalSubsidy: centralSubsidy + stateBonus,
    description: `Institutionally verified under RTS Phase II (Social Sector). Covers ~45% total project cost for educational non-profits.`
  };
};

export const generateTrailing12MonthDustData = () => {
  const data = [];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 0; i < 12; i++) {
    const avgDust = 0.05 + Math.random() * 0.3;
    data.push({
      month: months[i],
      avgDust,
      avgEfficiency: Math.max(0.1, 0.98 * (1 - (avgDust * 0.85)) + (Math.random() * 0.05))
    });
  }
  return data;
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const SEASONAL_YIELDS = [0.08, 0.09, 0.11, 0.12, 0.12, 0.06, 0.04, 0.05, 0.06, 0.08, 0.09, 0.10];

export const getBacktestData = (annualGen: number): MonthlyGen[] => {
  return MONTHS.map((month, i) => ({
    month,
    value: annualGen * SEASONAL_YIELDS[i],
    isMonsoon: i >= 5 && i <= 8 
  }));
};
