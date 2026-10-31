export interface Source { id: number; title: string; who: string; url: string; used: string }
export const SOURCES: Source[] = [
  { id: 1, title: 'Mini Grids for Half a Billion People', who: 'ESMAP / World Bank, 2022', url: 'https://www.esmap.org/mini_grids_for_half_a_billion_people_the_report',
    used: '5 to 35 kWh per customer per month, load factor and cost of power, settlements suited to mini-grids, $5 to $20 monthly energy spend, cost benchmarks' },
  { id: 2, title: 'Open Buildings v3', who: 'Google Research', url: 'https://sites.research.google/gr/open-buildings/',
    used: 'Building centroids, footprint area and detection confidence' },
  { id: 3, title: 'Overture Maps release 2026-10-21.0', who: 'Overture Maps Foundation (includes OpenStreetMap, ODbL)', url: 'https://docs.overturemaps.org/',
    used: 'Building tags, places (clinics, schools, shops), roads, mapped power lines and plants' },
  { id: 4, title: 'Multi-Tier Framework for energy access', who: 'ESMAP / World Bank', url: 'https://mtfenergyaccess.esmap.org/',
    used: 'Household tiers and what appliances each tier runs' },
  { id: 5, title: 'Energizing Health: Accelerating Electricity Access in Health-Care Facilities', who: 'WHO, World Bank, IRENA, SEforALL, 2023', url: 'https://www.who.int/publications/i/item/9789240066960',
    used: 'Range for health facility electricity use' },
  { id: 6, title: 'Benchmarking Africa’s Minigrids', who: 'AMDA (Africa Minigrid Developers Association)', url: 'https://africamda.org/',
    used: 'Customer mix and use per business, tariffs and costs (rough guide)' },
  { id: 7, title: 'VIIRS nighttime lights', who: 'NOAA / Earth Observation Group', url: 'https://eogdata.mines.edu/products/vnl/',
    used: 'Planned input: signal of existing activity (not loaded in this prototype)' },
  { id: 8, title: 'GridFinder', who: 'Arderne et al., 2020', url: 'https://gridfinder.org/',
    used: 'Planned input: predicted grid lines where OpenStreetMap has none' },
];
