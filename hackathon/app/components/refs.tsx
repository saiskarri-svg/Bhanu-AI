import React from 'react';

// Every source behind a modelled number, with where it is used. Engine
// references are cited as forecast/assumptions.yaml names them; where we do
// not hold the exact paper link, the link is a search for it. "assumption"
// marks values with no published source: the first numbers to check locally.

export interface Ref { short: string; full: string; url?: string; feeds: string }
const scholar = (q: string) => `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`;

export const REFS: Record<string, Ref> = {
  openbuildings: { short: 'Google Open Buildings v3', full: 'Google Research, Open Buildings v3 (CC BY 4.0)', url: 'https://sites.research.google/gr/open-buildings/',
    feeds: 'Every roof: location, footprint area, detection confidence' },
  overture: { short: 'OpenStreetMap via Overture Maps', full: 'Overture Maps Foundation, release 2026-10-21.0, includes OpenStreetMap (ODbL)', url: 'https://docs.overturemaps.org/',
    feeds: 'Building tags, places (clinics, schools, shops), roads, power lines and plants; held-out tagged buildings; the Gbamu Gbamu plant rating' },
  esmap: { short: 'ESMAP 2022', full: 'ESMAP / World Bank (2022), Mini Grids for Half a Billion People', url: 'https://www.esmap.org/mini_grids_for_half_a_billion_people_the_report',
    feeds: '5 to 35 kWh per customer a month; 22% and 40% load factors and 25% lower cost of power; $5 to $20 spent on energy today; $0.45 average mini-grid tariff (2019); productive use can double or triple demand; machine and fridge power' },
  faza: { short: 'Faza, Kenya (Tomas Fillol et al. 2025)', full: 'Tomas Fillol et al. (2025), measured connections and appliance uptake at the Faza mini-grid, Kenya', url: scholar('Tomas Fillol 2025 Faza mini-grid Kenya'),
    feeds: 'Connection pace (28, 36, 18, 12, 6% of connections in years 1 to 5); 29% early adopters; S-shaped appliance buying' },
  igc: { short: 'Rwanda (IGC 2024)', full: 'International Growth Centre (2024), rural grid consumption in Rwanda', url: scholar('International Growth Centre 2024 Rwanda rural electricity consumption'),
    feeds: '8.1 kWh per household a month, flat since 2013; 82% of households under the grid connect' },
  frame: { short: 'Malawi (Frame et al. 2023)', full: 'Frame, Eales and Bayani (2023), Estimating mini-grid demand in Malawi (Sitolo mini-grid, Mchinji District)', url: 'https://strathprints.strath.ac.uk/88020/1/Frame-etal-IEEE-PowerAfrica-2023-Estimating-mini-grid-demand-in-Malawi.pdf',
    feeds: '7.4 kWh a month for domestic customers (engine); 83 kWh a year, about 7.9 a month, per customer in 2022 (nearby measured load); surveys overstate use' },
  rockefeller: { short: 'Myanmar (Rockefeller Foundation 2020)', full: 'Rockefeller Foundation (2020), mini-grid customers in Myanmar', url: scholar('Rockefeller Foundation 2020 Myanmar mini-grid demand'),
    feeds: 'Shops and businesses: 0.70 kWh a day on average, 75% under 2 kWh a day; household use 40% of forecast' },
  omorate: { short: 'Omorate, Ethiopia (Wassie and Ahlgren 2023)', full: 'Wassie and Ahlgren (2023), Omorate mini-grid, Ethiopia, 2021 contract data', url: scholar('Wassie Ahlgren 2023 Omorate mini-grid'),
    feeds: 'Solar, battery and inverter costs and running costs; 6.0 sun hours; 10% day-to-day variation; 37 businesses per 100 households as an upper reference' },
  sltariff: { short: 'Sierra Leone tariff trial', full: 'Sierra Leone mini-grid tariff trial, as cited in forecast/assumptions.yaml', url: scholar('Sierra Leone mini-grid tariff reduction consumption'),
    feeds: 'A 41% tariff cut raised use by 58% against 6% without a cut: price elasticity -0.1 to -0.8' },
  dhs: { short: 'Mauritania DHS 2019 to 2021', full: 'Demographic and Health Survey, Mauritania 2019 to 2021 (DHS Program)', url: 'https://www.statcompiler.com/',
    feeds: 'Benichab: 6.2 people per household; 90% of households own a phone before any grid' },
  census: { short: 'Mauritania census', full: 'Mauritania national census, 2013 and 2023', feeds: 'Benichab: household growth 3.1% a year' },
  clasp: { short: 'CLASP', full: 'CLASP, off-grid appliance market data', url: 'https://www.clasp.ngo/',
    feeds: 'Fewer than 4% of rural Africans own a fridge' },
  wbsplit: { short: 'World Bank cost survey', full: 'World Bank mini-grid cost survey, as cited in forecast/assumptions.yaml', feeds: 'Distribution, meters, logistics and development: about 36 to 46% of build cost' },
  peters: { short: 'Peters, Sievert and Toman 2019', full: 'Peters, Sievert and Toman (2019), Rural electrification through mini-grids: Challenges ahead, Energy Policy', url: scholar('Rural electrification through mini-grids: Challenges ahead Peters Sievert Toman'),
    feeds: 'Productive use often far lower than planned; tariff politics; grid-arrival risk; forecasts should come from parties without incentives to overstate' },
  antonanzas: { short: 'Antonanzas-Torres et al. 2021', full: 'Antonanzas-Torres et al. (2021), State-of-the-Art of Mini Grids for Rural Electrification in West Africa, Energies (2020 data)', url: scholar('State-of-the-Art of Mini Grids for Rural Electrification in West Africa'),
    feeds: 'Tariffs: private mini-grids $0.8 to $5 per kWh, Sierra Leone programme about $0.85, national grids about $0.35' },
  mtf: { short: 'MTF', full: 'ESMAP / World Bank, Multi-Tier Framework for energy access', url: 'https://mtfenergyaccess.esmap.org/', feeds: 'Building-level model: household tiers' },
  who: { short: 'WHO et al. 2023', full: 'WHO, World Bank, IRENA, SEforALL (2023), Energizing Health', url: 'https://www.who.int/publications/i/item/9789240066960', feeds: 'Building-level model: health facility use' },
  amda: { short: 'AMDA', full: 'Africa Minigrid Developers Association, Benchmarking Africa’s Minigrids', url: 'https://africamda.org/', feeds: 'Building-level model: use per business' },
  clearsky: { short: 'Clear-sky PV model (Fereshteh)', full: 'clearsky_pv.py, GridSight team (2026): Ineichen-Perez clear sky with pvlib Linke turbidity climatology, Perez transposition, Faiman cell temperature, PVWatts DC and inverter', url: 'https://pvlib-python.readthedocs.io/',
    feeds: 'Hourly solar curve for each month at each village, the shape behind the typical-day charts' },
  copdem: { short: 'Copernicus 30 m elevation', full: 'Copernicus DEM GLO-30 (ESA), AWS open data s3://copernicus-dem-30m', url: 'https://registry.opendata.aws/copernicus-dem/',
    feeds: 'Altitude of each village for the clear-sky model (41 m at Benichab to 2,120 m at Bulongwa)' },
  metahrsl: { short: 'Meta population map (HRSL)', full: 'Data for Good at Meta and CIESIN, High Resolution Settlement Layer, general population, 30 m (CC BY 4.0), AWS open data s3://dataforgood-fb-data', url: 'https://dataforgood.facebook.com/dfg/tools/high-resolution-population-density-maps',
    feeds: 'Second household count for each village (population within 1 km divided by household size), shown beside the roof count' },
  nasapower: { short: 'NASA POWER', full: 'NASA POWER daily data (CERES SYN1deg sunlight, clear-sky sunlight, cloud and aerosol; MERRA-2 rain and temperature), 2015 to 2024, AWS open data s3://nasa-power', url: 'https://power.larc.nasa.gov/',
    feeds: 'Daily sunlight, cloud, rain, dust and haze, temperature at each village; solar output per kWp; cloudy, rainy and dusty days; the weather settings fed to the engine' },
  cmip6: { short: 'CMIP6 climate models', full: 'CMIP6 (WCRP), monthly surface sunlight (rsds) and temperature (tas), SSP2-4.5, five models: MRI-ESM2-0, MPI-ESM1-2-LR, IPSL-CM6A-LR, ACCESS-CM2, MIROC6; Google Cloud public data gs://cmip6', url: 'https://pcmdi.llnl.gov/CMIP6/',
    feeds: 'Change in sunlight and temperature for 2027 to 2036, applied to the measured history' },
  sentinel2: { short: 'Copernicus Sentinel-2', full: 'Copernicus Sentinel-2 Level-2A red, green and blue bands at 10 m (ESA), median of the 2 or 3 clearest recent pictures, haze-corrected; AWS open data bucket sentinel-cogs; contains modified Copernicus Sentinel data 2026', url: 'https://registry.opendata.aws/sentinel-2-l2a-cogs/',
    feeds: 'The latest cloud-free satellite picture under each village map (Feb to Oct 2026), so footprints can be checked against what is on the ground now' },
  scottcoley: { short: 'Tanzania (Scott and Coley 2021)', full: 'Scott and Coley (2021), Understanding load profiles of mini-grid customers in Tanzania, Energies', url: 'https://strathprints.strath.ac.uk/77070/1/Scott_Coley_Energies_2021_Understanding_load_profiles_of_mini_grid_customers.pdf',
    feeds: 'Nearby measured load: 0.098 kWh a day per household across 8,541 load profiles at two PowerGen mini-grids' },
  ngrea: { short: 'North Central Nigeria (2023)', full: 'Assessment of off- and mini-grid beneficiaries and average electricity consumed per month, North Central Nigeria (2023)', url: 'https://www.researchgate.net/publication/368390606',
    feeds: 'Nearby measured load: 1 to 3 kWh a day for residential connections (low weight: method unclear, about ten times other sites)' },
  zenodo: { short: 'Kenya and Nigeria smart-meter dataset', full: 'High-Frequency, Multi-Domain Operational Dataset for Community Solar Mini-Grids in Kenya and Nigeria (Zenodo record 22149102)', url: 'https://zenodo.org/records/22149102',
    feeds: 'Planned: 24 mini-grids, 11,942 customers, 15-minute meter data; to add as nearby measured sites on a laptop (Zenodo is blocked from the build box)' },
  viirs: { short: 'VIIRS night lights', full: 'NOAA / Earth Observation Group, VIIRS nighttime lights', url: 'https://eogdata.mines.edu/products/vnl/', feeds: 'Planned: signal of existing activity (not loaded yet)' },
  gridfinder: { short: 'GridFinder', full: 'Arderne et al. (2020), GridFinder predicted grid lines', url: 'https://gridfinder.org/', feeds: 'Planned: grid lines where OpenStreetMap has none' },
  engine: { short: 'Demand engine (Fereshteh)', full: 'demand_forecast.py and assumptions.yaml, GridSight team (2026)', feeds: 'Turns the inputs above into the 5-year forecast, drivers, sizing and tariff risk' },
  gsrough: { short: 'GridSight rough guide', full: 'GridSight rough guide by country (to replace with NASA POWER for each site)', feeds: 'Sun hours: Nigeria 4.6, Sierra Leone 4.8, Uganda 5.0, Tanzania 5.3, Kenya 5.4' },
  assumption: { short: 'assumption', full: 'Assumption: no published source found; check locally first', feeds: 'Buildings per household; share that connect by year 5; clinic and school use; business counts where the map is thin; brownout and idle thresholds; household size and growth outside Mauritania' },
};

// Inline "Source:" line under a modelled number
export const Cite: React.FC<{ k: string[]; className?: string; label?: string }> = ({ k, className = '', label = 'Source' }) => (
  <span className={`block text-[11px] leading-snug text-muted ${className}`}>
    {label}:{' '}
    {k.map((key, i) => {
      const r = REFS[key];
      if (!r) return null;
      const body = key === 'assumption'
        ? <span className="text-warn">assumption</span>
        : r.url ? <a href={r.url} target="_blank" rel="noreferrer" title={r.full} className="underline decoration-line underline-offset-2 hover:text-fg">{r.short}</a>
          : <span title={r.full}>{r.short}</span>;
      return <React.Fragment key={key}>{i > 0 && ' · '}{body}</React.Fragment>;
    })}
  </span>
);

// Sources behind each driver the engine reports
export const DRIVER_SRC: Record<string, string[]> = {
  buildings_per_household: ['assumption'],
  appliance_appetite: ['faza'],
  connection_share: ['igc', 'assumption'],
  connection_speed: ['faza'],
  own_fan: ['faza', 'igc', 'frame'],
  own_tv: ['faza', 'igc', 'frame'],
  own_iron_kitchen: ['faza', 'igc', 'frame'],
  own_fridge: ['clasp', 'esmap'],
  use_lights: ['igc', 'frame'],
  use_store: ['rockefeller'],
  use_health: ['assumption'],
  use_education: ['assumption'],
  use_unverified_large: ['assumption'],
  p_nonres_unverified: ['assumption'],
  prior_store: ['assumption', 'omorate'],
  prior_restaurant: ['assumption', 'omorate'],
  prior_health: ['assumption'],
  productive_rate: ['esmap', 'peters', 'assumption'],
  productive_size: ['esmap'],
  nearby_calibration: ['frame', 'scottcoley', 'igc', 'ngrea'],
};
