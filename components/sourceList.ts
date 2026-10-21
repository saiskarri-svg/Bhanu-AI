// The sources behind the site's facts. Order here sets the citation numbers.
// Checked October 2026. Figures change: recheck before relying on them.
export interface Source { id: string; group: string; title: string; publisher: string; url: string; supports: string }

const S = (group: string, id: string, title: string, publisher: string, url: string, supports: string): Source => ({ id, group, title, publisher, url, supports });

const G1 = 'Schools, power and the grid';
const G2 = 'Money: subsidies, tariffs and funding';
const G3 = 'Climate and carbon';
const G4 = 'How panels behave';
const G5 = 'Weather and seasons';
const G6 = 'Standards and safety';
const G7 = 'Skills and careers';
const G8 = 'Getting real data from the inverter';

export const SOURCES: Source[] = [
  S(G1, 'udise-power', '67.4% of Indian schools now online, yet over 73,000 still without electricity', 'Education for All in India, analysing UDISE+ 2025-26 (Ministry of Education)', 'https://educationforallinindia.com/67-4-of-indian-schools-now-online-yet-over-73000-still-without-electricity/', 'Over 73,000 schools have no electricity; about 93.5% have working electricity.'),
  S(G1, 'udise-schools', 'From classrooms to policy: analysing UDISE+ 2024-25 data', 'Education for All in India, analysing UDISE+ (Ministry of Education)', 'https://educationforallinindia.com/from-classrooms-to-policy-analysing-udise-2024-25-data/', 'India has roughly 10 lakh government schools.'),
  S(G1, 'heat-schools', "Indian schools are unprepared to deal with increasing heat waves", 'Scroll.in, citing UDISE+ 2021-22', 'https://scroll.in/article/1049763/indian-schools-are-unprepared-to-deal-with-increasing-heat-waves-are-already-disrupting-education', 'Heat disrupts learning; many government schools lacked working electricity in 2021-22.'),
  S(G1, 'td-loss', "India's power sector loses 16.64% of energy", 'The Sunday Guardian, reporting Ministry of Power data for FY 2023-24', 'https://sundayguardianlive.com/news/indias-power-sector-bleeds-loses-1664-energy-136604/', 'About 17% of electricity is lost in transmission and distribution across India.'),
  S(G1, 'cea-connect', 'Connectivity of distributed generation resources (regulations)', 'Central Electricity Authority', 'https://cea.nic.in/regulations-category/connectivity-of-distributed-generation-resources/?lang=en', 'Grid-tied systems must switch off when the grid fails (anti-islanding), so they do not keep power on in a cut without a battery.'),
  S(G1, 'target-500', 'India achieves 300 GW of renewable capacity, 60% of its 500 GW target for 2030', 'Outlook Business, citing MNRE', 'https://www.outlookbusiness.com/news/india-achieves-300-gw-re-capacity-60-of-500-gw-target-by-2030', 'India aims for 500 GW of non-fossil power capacity by 2030.'),
  S(G1, 'india-solar', 'India becomes the world’s second largest solar growth market in 2025', 'Vision IAS, citing IRENA Renewable Capacity Statistics', 'https://visionias.in/current-affairs/news-today/2026-06-04/environment/india-becomes-the-worlds-second-largest-solar-growth-market-in-2025-environment-minister', 'India is adding solar faster than almost any other country.'),

  S(G2, 'rts2', 'India approves financial aid for rooftop solar Phase II', 'TaiyangNews', 'https://taiyangnews.info/india-approves-financial-aid-for-rooftop-solar-ph-ii', 'Central rooftop subsidy under Phase II went to homes and housing societies, not institutions or schools.'),
  S(G2, 'rts2-guideline', 'Grid connected rooftop solar programme Phase II: operational guidelines (20 Aug 2019)', 'MNRE (copy hosted by JBVNL)', 'https://jbvnl.co.in/SOLAR/MNRE%20Phase%20II%20Guideline%2020.08.2019.pdf', 'No fixed state "school bonus" in the national scheme; state top-ups vary.'),
  S(G2, 'psg-gov', 'MNRE issues guidelines for PM Surya Ghar rooftop solar implementation models', 'SolarQuarter, reporting MNRE', 'https://solarquarter.com/2025/01/16/mnre-issues-guidelines-for-pm-surya-ghar-rooftop-solar-implementation-models', 'Government buildings can get rooftop solar through RESCO or utility-led models with little or no upfront cost.'),
  S(G2, 'export-rate', 'KSERC upholds ₹3.26 APPC rate, rejects rooftop solar prosumers’ appeal in Kerala', 'SolarQuarter', 'https://solarquarter.com/2026/07/28/kserc-upholds-inr-3-26-appc-rate-rejects-rooftop-solar-prosumers-appeal-in-kerala/', 'Surplus units at the year end are paid at roughly ₹3 to ₹4.5 a unit, below the tariff.'),
  S(G2, 'net-metering', 'Demystifying India’s rooftop solar policies', 'CEEW', 'https://www.ceew.in/sites/default/files/demystifying-india-rooftop-solar-policies.pdf', 'Exported units first offset units bought; how surplus is settled differs by state.'),
  S(G2, 'benchmark', 'MNRE benchmark costs for rooftop solar', 'Indian Infrastructure', 'https://indianinfrastructure.com/?p=161858', 'Install cost per kW is a rough guide; local quotes vary.'),
  S(G2, 'tariffs', 'Electricity tariff and duty, and average rates of electricity supply in India', 'Central Electricity Authority', 'https://cea.nic.in/api/dashboardReports/view-pdf/en/dd3e9b77-3057-4cfd-a5af-e29760561052', 'State tariffs used as defaults are rough guides; use the school’s own bill.'),
  S(G2, 'csr', 'Schedule VII of the Companies Act, 2013', 'Companies Act 2013 text (ca2013.com)', 'https://ca2013.com/schedule/schedule7-3/', 'Company CSR money can fund education and environmental projects.'),
  S(G2, 'inverter-life', 'How long do residential solar inverters last?', 'pv magazine', 'https://www.pv-magazine.com/2025/08/06/how-long-do-residential-solar-inverters-last-5/', 'Inverters often need replacing after about 10 to 15 years.'),
  S(G2, 'battery-prices', 'Solar battery price in India', 'QuickEstimate', 'https://quickestimate.co/blog/solar-battery-price-india', 'Rough battery prices and lifetimes (LFP and lead acid).'),

  S(G3, 'cea-co2', 'CO2 Baseline Database highlights India’s progress in renewable energy', 'SolarQuarter, reporting CEA CO2 Baseline Database Version 20.0', 'https://solarquarter.com/2025/01/06/co2-baseline-database-highlights-indias-progress-in-renewable-energy-and-emission-reduction-cea/', 'Each unit from India’s grid emits about 0.72 kg of CO₂ (weighted average, FY 2023-24). A newer CEA version (22.0) exists; recheck.'),
  S(G3, 'tree-co2', 'How much CO2 does a tree absorb?', 'One Tree Planted', 'https://onetreeplanted.org/blogs/stories/how-much-co2-does-tree-absorb', 'A grown tree absorbs roughly 20 kg of CO₂ a year (estimates range from about 10 to 40 kg).'),
  S(G3, 'jobs-gw', 'Doing green jobs right', 'NRDC, on the CEEW-NRDC-SCGJ jobs study', 'https://www.nrdc.org/bio/anjali-jaiswal/doing-green-job-right-0', 'Each gigawatt of solar needs thousands of skilled workers.'),

  S(G4, 'degradation', 'Photovoltaic degradation rates: an analytical review', 'NREL (Jordan and Kurtz)', 'https://www.nrel.gov/docs/fy13osti/56690.pdf', 'Panels lose about 0.5% of output a year.'),
  S(G4, 'panel-life', 'Photovoltaic lifetime project', 'NREL', 'https://www.nrel.gov/pv/lifetime.html', 'Panels last 25 years or more.'),
  S(G4, 'temp-coeff', 'Measuring the temperature coefficients of a PV module', 'Sinovoltaics', 'https://sinovoltaics.com/solar-basics/measuring-the-temperature-coefficients-of-a-pv-module', 'About -0.4% power per °C above 25 °C; NOCT about 45 °C.'),
  S(G4, 'soiling', 'The long read: the impact of dust on solar panels matters', 'pv magazine India (interview with IIT Bombay researchers)', 'https://pv-magazine-india.com/2021/07/10/the-long-read-the-impact-of-dust-on-solar-panels-matters', 'In dry weather dust cuts output by about 0.3 to 0.6% a day.'),
  S(G4, 'rain-cleans', 'Soiling of PV modules: losses and the cleaning effect of rain', 'Solar Energy (Elsevier), Valerino et al. 2020', 'https://www.solideas.com/wp-content/uploads/2024/07/valerino_SE_2020_soiling.pdf', 'Heavy rain washes most dust off the panels.'),
  S(G4, 'haurwitz', 'pvlib.clearsky.haurwitz', 'pvlib python (Sandia PV Performance Modeling Collaborative)', 'https://pvlib-python.readthedocs.io/en/latest/reference/generated/pvlib.clearsky.haurwitz.html', 'Clear-sky sunlight formula used by the simulator.'),
  S(G4, 'kasten', 'Kasten and Czeplak (1980) cloud cover model, as used in CSBE paper 17057', 'Canadian Society for Bioengineering', 'https://library.csbe-scgab.ca/docs/meetings/2017/CSBE17057.pdf', 'How cloud cover reduces sunlight in the simulator.'),
  S(G4, 'area', 'FAQ for consumers: grid connected rooftop solar', 'MNRE (copy hosted by JBVNL)', 'https://jbvnl.co.in/SOLAR/MNRE%20FAQ%20for%20consumer.pdf', 'About 10 m² of shade-free roof per kWp.'),
  S(G4, 'state-yields', 'Solar generation by state in India', 'Heaven Green Energy, citing MNRE solar atlas data', 'https://www.heavengreenenergy.com/blog/solar-generation-by-state', 'Typical yearly units per kWp by state (rough guide).'),
  S(G4, 'bldc', 'BLDC fans', 'Bajaj Electricals', 'https://www.bajajelectricals.com/collections/bldc-fan', 'BLDC fans use about 30 W, against about 70 to 75 W for an old fan.'),
  S(G4, 'three-phase', 'Net metering and gross metering in India', 'Secure Meters', 'https://www.securemeters.com/net-metering-and-gross-metering-in-india/', 'Larger systems need a three phase connection; the limit is set by each DISCOM.'),

  S(G5, 'imd-monsoon', 'India gets a new monsoon calendar', 'The Week, reporting IMD', 'https://www.theweek.in/news/india/2020/04/15/india-gets-new-monsoon-calendar-imd-predicts-normal-rainfall-this-year.amp.html', 'The southwest monsoon runs from about June to September.'),
  S(G5, 'ne-monsoon', 'Northeast monsoon 2024 report', 'IMD Regional Meteorological Centre, Chennai', 'https://mausam.imd.gov.in/chennai/mcdata/ne_monsoon_2024.pdf', 'The northeast monsoon brings rain to the south from October to December.'),
  S(G5, 'stubble', 'Stubble burning season begins', 'Down To Earth', 'https://www.downtoearth.org.in/air/stubble-burning-season-begins-madhya-pradesh-ranks-first-punjab-second-and-uttar-pradesh-third', 'Crop stubble burning in north India peaks in October and November.'),

  S(G6, 'std-goods', 'MNRE issues Solar Systems, Devices and Components Goods Order 2025', 'Aleph India, summarising the MNRE order', 'https://alephindia.in/mnre-issues-solar-systems-devices-and-components-goods-order-2025.php', 'Panel and inverter standards: IS 14286 / IEC 61215, IS/IEC 61730, IS 16221 / IEC 62109, IS 16169 / IEC 62116 (anti-islanding).'),
  S(G6, 'bis-list', 'Published standards: solar photovoltaic energy systems', 'Bureau of Indian Standards', 'https://www.services.bis.gov.in/php/BIS_2.0/dgdashboard/published/sub_grp_stn_list/73', 'Connector, cable, earthing and lightning standards (IEC 62852, IEC 62930, IS 3043, IS/IEC 62305).'),
  S(G6, 'almm', 'What is ALMM?', 'CEEW Centre for Energy Finance', 'https://www.ceew.in/cef/quick-reads/explains/what-is-almm', 'Government-backed and net metered projects must use panels on the approved list.'),
  S(G6, 'cea-safety', 'CEA notifies Measures relating to Safety and Electric Supply Regulations, 2023', 'Power Line', 'https://powerline.net.in/2023/06/20/cea-notifies-cea-measures-relating-to-safety-and-electric-supply-regulations-2023/', 'Only licensed, trained people may work on electrical installations.'),
  S(G6, 'gloves', 'Class 0 insulating gloves (IEC 60903)', 'TMG Test Equipment', 'https://tmgtestequipment.com.au/?p=3106', 'Class 0 rubber gloves are rated for 1,000 V.'),
  S(G6, 'fall-protection', 'Fall protection: duty to have fall protection (1926.501)', 'OSHA (United States)', 'https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.501', 'Work near an unguarded roof edge needs a harness or guard rail.'),

  S(G7, 'suryamitra', 'Suryamitra skill development programme', 'Vikaspedia, with MNRE', 'https://en.vikaspedia.in/viewcontent/energy/policy-support/renewable-energy-1/solar-energy/suryamitra-skill-development-programme', 'Free course of about 3 months from NISE; needs class 10 plus an ITI or diploma, age 18 or over.'),
  S(G7, 'iti', 'ITI Electrician trade', 'Government ITI Cacora, Goa', 'https://iticacora.goa.gov.in/?p=460', 'ITI Electrician is a 2 year course after class 10.'),
  S(G7, 'pay', 'Solar installer salary in India', 'QuickEstimate', 'https://quickestimate.co/blog/solar-installer-salary-india', 'Rough monthly pay for installers and technicians.'),
  S(G8, 'huawei-reports', 'SmartPVMS 24.2.0 user manual: viewing and managing reports', 'Huawei (FusionSolar)', 'https://support.huawei.com/enterprise/en/doc/EDOC1100331328/90b9638d/viewing-and-managing-report', 'FusionSolar plant and inverter reports show yield by day, month and year, and can be exported.'),
  S(G8, 'growatt-export', 'Raw access to Growatt inverter data (forum thread)', 'Power Forum', 'https://powerforum.co.za/topic/11621-raw-access-to-growatt-inverter-data/', 'Users report the Growatt web portal exports graphs as pictures, not data.'),
];
