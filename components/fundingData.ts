// Funding routes for school rooftop solar, national and by state.
// Researched from official and news sources; every item keeps its source.
// Amounts are rough guides. Regenerate rather than hand-editing large parts.

export interface FundingItem {
  name: string;
  what: string;
  who?: string;
  amount?: string;
  status?: 'current' | 'past' | 'unclear';
  url?: string;
  source?: string;
  publisher?: string;
}

export interface StateFunding {
  agency?: { name: string; url?: string };
  schemes: FundingItem[];
  netMetering?: { text: string; url?: string; source?: string };
}

export const FUNDING_CHECKED = 'October 2026';

export const FUNDING_NATIONAL: FundingItem[] = [
  {
    "name": "Samagra Shiksha (state school plan)",
    "what": "The central school scheme lets the state add solar to its yearly school plan, mainly for schools that have no electricity. New school buildings under the scheme should include solar panels in the plan. The yearly composite school grant can pay electricity bills, but it is too small to buy a system.",
    "who": "Head teacher writes to the Block or District Samagra Shiksha office, so the school is included in the state's Annual Work Plan and Budget.",
    "amount": "Composite school grant is roughly Rs 25,000 to Rs 1 lakh a year, based on enrolment (rough guide). Solar money depends on what the state asks for and the centre approves.",
    "url": "https://samagra.education.gov.in/docs/Framework_IISE%20_F.pdf",
    "source": "Samagra Shiksha: An Integrated Scheme for School Education, Framework for Implementation",
    "publisher": "Ministry of Education, Government of India"
  },
  {
    "name": "PM SHRI schools",
    "what": "Schools picked as PM SHRI schools are to become Green Schools, with solar panels and LED lights named in the plan. This only helps if your school is on the PM SHRI list.",
    "who": "Head teacher and the District Samagra Shiksha or District Education Office that handles PM SHRI.",
    "url": "https://www.pmindia.gov.in/en/news_updates/cabinet-approves-a-new-centrally-sponsored-scheme-pm-shri-schools-pm-schools-for-rising-india/",
    "source": "Cabinet approves a new centrally sponsored scheme: PM SHRI Schools",
    "publisher": "Prime Minister's Office, Government of India"
  },
  {
    "name": "MP Local Area Development Scheme (MPLADS)",
    "what": "Your MP can recommend works that create public assets. The guidelines allow non-conventional energy systems for community use and buildings for government and aided schools. The list of works is not complete, so new works can be added if they fit the rules.",
    "who": "Write to your MP. The MP recommends the work to the District Collector (District Authority), who sanctions it.",
    "amount": "Each MP gets about Rs 5 crore a year for the whole constituency (rough guide).",
    "url": "https://www.mplads.gov.in/MPLADS/UploadedFiles/MPLADSGuidelinesApril2023.pdf",
    "source": "Guidelines on MPLADS, April 1, 2023 (and MPLADS Pocket Book, mplads.gov.in)",
    "publisher": "Ministry of Statistics and Programme Implementation"
  },
  {
    "name": "MLA Local Area Development fund",
    "what": "Many states let MLAs pay for works at government schools. Some state rules name solar directly. Tamil Nadu lists rooftop solar on government buildings, and one state's FAQ says solar, inverter and battery for a government school are allowed. Rules differ by state.",
    "who": "Write to your MLA, then follow up at the District Planning or Collector's office that runs the MLA fund.",
    "amount": "Set by each state.",
    "url": "https://www.tnrd.tn.gov.in/schemes/st_mlacds.php",
    "source": "Rural Development and Panchayat Raj: MLA Constituency Development Scheme",
    "publisher": "Government of Tamil Nadu"
  },
  {
    "name": "Panchayat Finance Commission grants (untied)",
    "what": "Gram Panchayats get untied money for local needs under the 29 subjects in the Eleventh Schedule, which include schools and non-conventional energy. A panchayat can put school solar into its yearly plan. Tied money is only for sanitation and water, so it cannot be used.",
    "who": "Sarpanch and Gram Sabha, so the work is added to the Gram Panchayat Development Plan.",
    "amount": "The 16th Finance Commission grants started in April 2026. About half the basic grant is untied (rough guide).",
    "url": "https://www.downtoearth.org.in/amp/story/governance/grants-expanded-under-16th-finance-commission-recommendations-but-gram-panchayats-face-stricter-compliance-requirements",
    "source": "Grants expanded under 16th Finance Commission recommendations, but Gram Panchayats face stricter compliance requirements",
    "publisher": "Down To Earth"
  },
  {
    "name": "District Mineral Foundation (DMF / PMKKKY)",
    "what": "Only for districts with mining. DMF money can pay for decentralised solar under energy, and education is a top priority area. A school near mines can ask for solar from the DMF trust.",
    "who": "District Collector, who heads the District Mineral Foundation trust.",
    "amount": "At least 70% goes to top priority areas like education and health; up to 30% to areas like energy (rough guide).",
    "url": "https://dmf.gujarat.gov.in/Home/PMKKKY",
    "source": "PMKKKY, District Mineral Foundation (also Ministry of Mines revised PMKKKY guidelines, 15 January 2024)",
    "publisher": "Government of Gujarat / Ministry of Mines"
  },
  {
    "name": "Company CSR funds",
    "what": "Large companies must spend part of their profit on CSR. Schedule VII allows education (item ii) and environmental sustainability (item iv), and the government says these items should be read liberally. Solar on a school fits both.",
    "who": "CSR team of companies, banks or public sector units with offices or plants near you.",
    "amount": "Qualifying companies spend about 2% of their average profit on CSR (rough guide).",
    "url": "https://www.mca.gov.in/Ministry/pdf/General_Circular_21_2014.pdf",
    "source": "General Circular No. 21/2014 on CSR (clarifications carried into General Circular 14/2021)",
    "publisher": "Ministry of Corporate Affairs"
  },
  {
    "name": "Pay per unit (RESCO model)",
    "what": "A solar company puts panels on the roof and owns them. The school or department pays only for the units it uses, under a contract of 10 to 25 years. The central government uses this for its own buildings, with no central subsidy.",
    "who": "Your state renewable energy agency (State Nodal Agency) or the district education office, which signs for the building.",
    "amount": "No central subsidy for government buildings.",
    "url": "https://mnre.gov.in/en/grid-connected-solar-rooftop-programme/",
    "source": "Grid Connected Rooftop Solar Programme (Guidelines for Saturation of Government Buildings with Rooftop Solar)",
    "publisher": "Ministry of New and Renewable Energy"
  }
];

export const FUNDING_STATES: Record<string, StateFunding> = {
  "Andaman and Nicobar Islands": {
    "agency": {
      "name": "Electricity Department, Andaman and Nicobar Administration (nodal agency for MNRE renewable energy programmes)",
      "url": "https://vidyut.andaman.gov.in/"
    },
    "schemes": [],
    "netMetering": {
      "text": "The islands follow the JERC net metering rules of 2019 (amended in 2024), which allow government establishments to use net metering and virtual net metering.",
      "url": "https://renewablewatch.in/2019/05/17/jerc-publishes-draft-solar-net-metering-regulations-goa-union-territories/",
      "source": "JERC publishes draft solar net metering regulations for Goa and union territories (Renewable Watch)"
    }
  },
  "Andhra Pradesh": {
    "agency": {
      "name": "New and Renewable Energy Development Corporation of Andhra Pradesh (NREDCAP)",
      "url": "https://nredcap.in/"
    },
    "schemes": [
      {
        "name": "Solar rooftops on government buildings (NVVN and NREDCAP)",
        "what": "NVVN, an NTPC company, puts solar on government building roofs and sells the power at a fixed price for 25 years. It also looks after the panels for 25 years at no cost.",
        "who": "NREDCAP with NVVN (NTPC)",
        "amount": "No upfront cost to the building. First phase about 300 MW. Rough guide only.",
        "status": "current",
        "url": "https://deccanchronicle.com/southern-states/andhra-pradesh/andhra-pradesh-govt-signs-solar-mou-with-nvvn-1816471",
        "source": "Andhra Pradesh govt signs solar MoU with NVVN",
        "publisher": "Deccan Chronicle"
      },
      {
        "name": "Rooftop solar on PM SHRI government schools",
        "what": "The School Education Department is putting rooftop solar on 415 government schools picked under PM SHRI.",
        "who": "School Education Department, Andhra Pradesh",
        "amount": "About 3.5 MW in total. Rough guide only.",
        "status": "current",
        "url": "https://mercomindia.com/andhra-pradesh-schools-trim-energy-costs-with-1-mw-rooftop-solar-program",
        "source": "Andhra Pradesh Schools Trim Energy Costs with 3.5 MW Rooftop Solar Program",
        "publisher": "Mercom India"
      }
    ],
    "netMetering": {
      "text": "Under APERC's 2023 rooftop solar rules, government bodies can use net metering for systems from 1 kW up to 500 kW.",
      "url": "https://mercomindia.com/andhra-pradesh-clarifies-net-metering-rules-for-older-rooftop-solar-projects",
      "source": "Andhra Pradesh clarifies net metering rules for older rooftop solar projects (Mercom India)"
    }
  },
  "Arunachal Pradesh": {
    "agency": {
      "name": "Arunachal Pradesh Energy Development Agency (APEDA)",
      "url": "https://apeda.nic.in/"
    },
    "schemes": [
      {
        "name": "Rooftop solar on state government buildings (SJVN, RESCO)",
        "what": "SJVN asked for bids to put about 2.4 MW of rooftop solar on government buildings. A private company pays for the panels and the building buys the power.",
        "who": "SJVN for the state government",
        "amount": "About 2.4 MW in total. No central grant for state government buildings. Rough guide only.",
        "status": "unclear",
        "url": "https://www.eqmagpro.com/sjvn-ltd-issue-tender-for-setting-up-of-2-4-mw-grid-connected-rooftop-solar-power-projects-for-state-of-arunachal-pradesh-under-rescoppa-mode-eq/",
        "source": "SJVN Ltd issue tender for setting up of 2.4 MW grid connected rooftop solar power projects for state of Arunachal Pradesh under RESCO/PPA mode",
        "publisher": "EQ Mag"
      }
    ]
  },
  "Assam": {
    "agency": {
      "name": "Assam Energy Development Agency (AEDA)",
      "url": "https://aeda.assam.gov.in/"
    },
    "schemes": [
      {
        "name": "Rooftop solar on government buildings (RESCO)",
        "what": "A company installs solar on government roofs and sells the power to the building. The regulator set the highest price it can charge.",
        "who": "APDCL, approved by the Assam Electricity Regulatory Commission",
        "amount": "Price cap about Rs 4.37 per unit (2025). Rough guide only.",
        "status": "current",
        "url": "https://www.mercomindia.com/assam-approves-tariff-for-rooftop-solar-on-government-buildings",
        "source": "Assam approves tariff for rooftop solar on government buildings",
        "publisher": "Mercom India"
      },
      {
        "name": "Solar plants for PM SHRI schools (Samagra Shiksha Assam)",
        "what": "On-grid and off-grid solar plants for PM SHRI government schools, approved by the Ministry of Education.",
        "who": "Samagra Shiksha, Assam",
        "amount": "99 schools in 26 districts (2023-24). Rough guide only.",
        "status": "past",
        "url": "https://solarquarter.com/wp-content/uploads/2024/01/BID_NRE_12012024-1.pdf",
        "source": "Bid document for solar power plants in PM SHRI schools",
        "publisher": "Samagra Shiksha Assam (copy hosted by SolarQuarter)"
      }
    ],
    "netMetering": {
      "text": "In August 2026 the regulator told APDCL to keep accepting rooftop solar under the existing net metering rules; group and virtual net metering for government offices and schools was proposed in 2024 but may not be final.",
      "url": "https://solarquarter.com/2026/08/11/aerc-directs-apdcl-to-continue-rooftop-solar-applications-under-existing-net-metering-rules-in-assam/",
      "source": "AERC directs APDCL to continue rooftop solar applications under existing net metering rules in Assam (SolarQuarter)"
    }
  },
  "Bihar": {
    "agency": {
      "name": "Bihar Renewable Energy Development Agency (BREDA)",
      "url": "https://breda.bih.nic.in/"
    },
    "schemes": [
      {
        "name": "Rooftop solar in government schools (Jal-Jeevan-Hariyali Abhiyan)",
        "what": "Grid-connected rooftop solar was put on government schools, with a plan to cover all Education Department buildings.",
        "who": "Education Department with BREDA",
        "amount": "1,890 schools by November 2022. Rough guide only.",
        "status": "past",
        "url": "https://www.drishtiias.com/state-pcs-current-affairs/1890-government-schools-of-bihar-got",
        "source": "1890 Government Schools of Bihar got Solar Power",
        "publisher": "Drishti IAS"
      },
      {
        "name": "500 MW rooftop solar on government buildings (RESCO)",
        "what": "Companies will build, run and look after rooftop solar on government buildings across Bihar, with no upfront cost to the building.",
        "who": "BREDA",
        "amount": "About 500 MW in total. Bids closed in October 2026. Rough guide only.",
        "status": "current",
        "url": "https://solarquarter.com/2026/09/11/breda-extends-bid-deadline-for-500-mw-rooftop-solar-project-across-bihar/",
        "source": "BREDA Extends Bid Deadline for 500 MW Rooftop Solar Project Across Bihar",
        "publisher": "SolarQuarter"
      },
      {
        "name": "Rooftop solar on 1,300 government buildings in Patna",
        "what": "Grid-connected rooftop solar on offices, hospitals and schools in Patna, with schools and hospitals first and at least 2 kW each.",
        "who": "BREDA",
        "amount": "Rough guide: at least 2 kW per building.",
        "status": "unclear",
        "url": "https://www.energetica-india.net/news/breda-announces-to-establish-rooftop-solar-panels-in-1300-government-buildings-in-bihar",
        "source": "BREDA announces to establish rooftop solar panels in 1300 government buildings in Bihar",
        "publisher": "Energetica India"
      }
    ],
    "netMetering": {
      "text": "Bihar's 2025 renewable energy policy says rooftop solar will be required on all government buildings and lets rooftop systems use net metering; check BERC rules for size limits.",
      "url": "https://powerline.net.in/2025/07/11/bihar-cabinet-approves-renewable-energy-policy-2025-to-scale-up-clean-power/",
      "source": "Bihar Cabinet approves Renewable Energy Policy 2025 to scale up clean power (Power Line)"
    }
  },
  "Chandigarh": {
    "agency": {
      "name": "Chandigarh Renewable Energy and Science and Technology Promotion Society (CREST)",
      "url": "https://solar.chd.gov.in/"
    },
    "schemes": [
      {
        "name": "Rooftop solar on all government buildings and schools",
        "what": "CREST put rooftop solar on every suitable government building. This includes 108 of the 114 government schools.",
        "who": "CREST, UT Chandigarh Administration",
        "status": "past",
        "url": "https://www.tribuneindia.com/news/chandigarh/solar-energy-now-powers-all-6624-govt-buildings-in-ut/amp",
        "source": "Solar energy now powers all 6,624 govt buildings in UT",
        "publisher": "The Tribune"
      },
      {
        "name": "RESCO rooftop solar on government properties",
        "what": "A private company pays the full cost of the panels. The power is sold to the city power company.",
        "who": "CREST",
        "amount": "Power sold at about Rs 4.96 per unit. First projects about 3 MW. Rough guide only.",
        "status": "current",
        "url": "https://powerline.net.in/2025/05/20/crest-to-launch-out-resco-model-rooftop-solar-projects-on-government-properties/",
        "source": "CREST to launch out RESCO model rooftop solar projects on government properties",
        "publisher": "Power Line"
      }
    ],
    "netMetering": {
      "text": "Chandigarh follows the JERC net metering rules of 2019 (amended in 2024), which allow government establishments to use net metering; applications go through the UT solar portal.",
      "url": "https://solar.chd.gov.in/",
      "source": "UWP for Solar Net Metering, UT Chandigarh"
    }
  },
  "Chhattisgarh": {
    "agency": {
      "name": "Chhattisgarh State Renewable Energy Development Agency (CREDA)",
      "url": "https://creda.co.in/"
    },
    "schemes": [
      {
        "name": "Rooftop solar on government buildings (RESCO)",
        "what": "CREDA asked for bids to put about 20 MW of grid-connected rooftop solar on government buildings. A company pays for the panels and sells the power.",
        "who": "CREDA",
        "amount": "About 20 MW in total (2020). Rough guide only.",
        "status": "unclear",
        "url": "https://mercomindia.com/chhattisgarh-rooftop-solar-government-buildings",
        "source": "Chhattisgarh to Install 20 MW of Rooftop Solar Systems On Government Buildings",
        "publisher": "Mercom India"
      },
      {
        "name": "Solar plants for remote schools in Mohla-Manpur",
        "what": "Small off-grid solar plants were put in schools in a remote district. These are off-grid, not grid-tied.",
        "who": "Education Department with CREDA",
        "amount": "About 1.2 kW per school. Rough guide only.",
        "status": "past",
        "url": "https://ianslive.in/solar-power-brings-light-to-schools-in-maoist-affected-mohla-manpur--20260114212104",
        "source": "Chhattisgarh: Solar power brings light to schools in Maoist-affected Mohla-Manpur",
        "publisher": "IANS"
      }
    ],
    "netMetering": {
      "text": "Under CSERC rules, rooftop solar can use net metering from 1 kW up to 500 kW (or the sanctioned load, if lower).",
      "url": "https://mercomindia.com/chhattisgarh-net-metering-distributed-renewable-systems-500-kw",
      "source": "Chhattisgarh Caps Net Metering for Distributed Renewable Energy Systems at 500 kW (Mercom India)"
    }
  },
  "Dadra and Nagar Haveli and Daman and Diu": {
    "agency": {
      "name": "Electricity Department, UT Administration of Dadra and Nagar Haveli and Daman and Diu (nodal role not confirmed)",
      "url": "https://www.dded.gov.in/"
    },
    "schemes": [
      {
        "name": "Rooftop solar on government buildings",
        "what": "Rooftop solar was put on government buildings. The government said in March 2025 that Daman and Diu reached its full target for government buildings.",
        "who": "UT Electricity Department",
        "amount": "About 4.5 MW on government buildings in Daman and Diu. Rough guide only.",
        "status": "past",
        "url": "https://ianslive.in/chandigarh-daman-and-diu-achieve-100-pc-govt-building-rooftop-solar-targets--20250313133903",
        "source": "Chandigarh, Daman and Diu achieve 100 pc govt building rooftop solar targets",
        "publisher": "IANS"
      }
    ],
    "netMetering": {
      "text": "The UT follows the JERC net metering rules of 2019 (amended in 2024), which allow government establishments to use net metering.",
      "url": "https://renewablewatch.in/2019/05/17/jerc-publishes-draft-solar-net-metering-regulations-goa-union-territories/",
      "source": "JERC publishes draft solar net metering regulations for Goa and union territories (Renewable Watch)"
    }
  },
  "Delhi": {
    "agency": {
      "name": "Energy Efficiency and Renewable Energy Management Centre (EE&REM), Department of Power, Delhi",
      "url": "https://eerem.delhi.gov.in/"
    },
    "schemes": [
      {
        "name": "Rooftop solar on Delhi government schools (RESCO)",
        "what": "Companies put rooftop solar on government school buildings at no cost to the school. Schools buy the power at a low fixed price.",
        "who": "Delhi government, tender run by IPGCL",
        "amount": "About 150 school buildings (2020). Power at about Rs 3.13 per unit. Rough guide only.",
        "status": "past",
        "url": "https://www.downtoearth.org.in/blog/energy/rooftop-solar-generation-why-delhi-government-schools-fare-better-than-others-78498",
        "source": "Rooftop solar generation: Why Delhi government schools fare better than others",
        "publisher": "Down To Earth"
      },
      {
        "name": "Delhi Solar Energy Policy 2023 (RESCO option for government)",
        "what": "Government buildings can get rooftop solar through RESCO, where a company owns and looks after the panels and the building pays only for the power.",
        "who": "EE&REM, Department of Power, Delhi",
        "status": "current",
        "url": "https://solar.delhi.gov.in/",
        "source": "Delhi Solar Portal",
        "publisher": "Government of NCT of Delhi"
      }
    ],
    "netMetering": {
      "text": "DERC's net metering rules cover rooftop solar for Delhi consumers, and a 2026 change cut the application steps to two and removed the registration fee.",
      "url": "https://mercomindia.com/delhi-regulator-simplifies-net-metering-rules-for-rooftop-solar-projects",
      "source": "Delhi Regulator Simplifies Net Metering Rules for Rooftop Solar Projects (Mercom India)"
    }
  },
  "Goa": {
    "agency": {
      "name": "Goa Energy Development Agency (GEDA)",
      "url": "https://geda.goa.gov.in/"
    },
    "schemes": [
      {
        "name": "Goa state rooftop solar subsidy scheme (Grid Connected Rooftop Solar Promotion Scheme)",
        "what": "State subsidy for grid-connected rooftop solar. Educational institutions are listed as eligible. Press reports say up to 50% of the benchmark cost for systems up to 90 kW. Check the exact rate with GEDA.",
        "who": "Goa Energy Development Agency (GEDA)",
        "amount": "About 50% of benchmark cost, up to 90 kW, for educational institutions (rough guide, from press reports)",
        "status": "current",
        "url": "https://dip.goa.gov.in/government-launches-state-subsidy-scheme-for-installation-of-rooftop-solar-systems-under-pm-surya-ghar-muft-bijli-yojana/",
        "source": "Government launches State Subsidy Scheme for installation of rooftop solar systems",
        "publisher": "Department of Information and Publicity, Government of Goa"
      },
      {
        "name": "GEDA rooftop solar on government buildings (RESCO)",
        "what": "GEDA tendered 30 MW of rooftop solar on government buildings. A developer pays for, builds and runs the plant for 25 years, and the building pays for the power it uses.",
        "who": "Goa Energy Development Agency (GEDA)",
        "status": "unclear",
        "url": "https://solarquarter.com/2024/03/11/geda-invites-bids-for-30-mw-rooftop-solar-pv-project-on-government-buildings-in-goa/",
        "source": "GEDA invites bids for 30 MW rooftop solar PV project on government buildings in Goa",
        "publisher": "SolarQuarter (2024)"
      }
    ],
    "netMetering": {
      "text": "Goa follows the JERC (Goa and Union Territories) net metering rules of 2019, amended in 2024; government and local authority buildings can also use virtual net metering. Check current limits with the electricity department.",
      "url": "https://mercomindia.com/goa-net-metering-regulations-solar",
      "source": "Goa Issues Net Metering Regulations for Solar Projects (Mercom India)"
    }
  },
  "Gujarat": {
    "agency": {
      "name": "Gujarat Energy Development Agency (GEDA)",
      "url": "https://geda.gujarat.gov.in/"
    },
    "schemes": [
      {
        "name": "Rooftop solar on government buildings",
        "what": "The state pays the full capital cost of grid-connected rooftop solar on state government buildings. Running since 2011-12. The 2026-27 plan adds about 15,000 buildings. Reports do not say if schools are included, so ask GEDA or the District Education Officer.",
        "who": "GEDA, under the Climate Change Department",
        "amount": "100% of capital cost for state government buildings; Rs 314 crore budget for 2026-27 (rough guide)",
        "status": "current",
        "url": "https://ddnews.gov.in/en/gujarat-to-install-rooftop-solar-systems-on-15000-govt-buildings-target-65-mw-additional-capacity/",
        "source": "Gujarat to Install Rooftop Solar Systems on 15,000 Govt Buildings, Target 65 MW Additional Capacity",
        "publisher": "DD News"
      }
    ],
    "netMetering": {
      "text": "Under the Gujarat Renewable Energy Policy 2023, rooftop plants are set up under net metering or gross metering; surplus power left after the monthly banking period lapses.",
      "url": "https://www.jsalaw.com/newsletters-and-updates/regulatory-update-on-renewable-energy-policy-2023-issued-by-the-state-of-gujarat/",
      "source": "Regulatory update on Renewable Energy Policy 2023 issued by the State of Gujarat (JSA Law)"
    }
  },
  "Haryana": {
    "agency": {
      "name": "Haryana Renewable Energy Development Agency (HAREDA), Department of New and Renewable Energy",
      "url": "https://hareda.gov.in/"
    },
    "schemes": [
      {
        "name": "Solar power plant on government buildings (CAPEX mode)",
        "what": "The department installs grid-connected rooftop solar on government buildings with net metering. Plants of 1 to 500 kWp without battery, and 1 to 10 kWp hybrid plants with battery.",
        "who": "HAREDA / Department of New and Renewable Energy, Haryana",
        "status": "current",
        "url": "https://hareda.gov.in/solar-power-plant-on-govt-buildings-capex-mode/",
        "source": "Solar Power Plant on Govt Buildings (CAPEX Mode)",
        "publisher": "HAREDA, Government of Haryana"
      },
      {
        "name": "Rooftop solar on government buildings (RESCO mode)",
        "what": "A private developer builds and runs the plant on a government building for 25 years and sells the power to that building. Tenders were issued in 2025.",
        "who": "HAREDA",
        "status": "current",
        "url": "https://hareda.gov.in/document/tender-for-selection-of-roof-top-developer-for-setting-up-grid-connected-solar-roof-top-plants-at-various-locations-on-government-buildings-in-the-state-of-haryana-on-resco-mode/",
        "source": "Tender for Selection of Roof Top Developer ... on government buildings in the state of Haryana on RESCO Mode",
        "publisher": "HAREDA, Government of Haryana"
      },
      {
        "name": "Solar hybrid systems in government schools",
        "what": "A 2017 plan to put solar hybrid systems in government senior secondary and high schools in phases, starting with about 3,222 schools.",
        "who": "Haryana School Education Department (UTKARSH Society named as nodal agency)",
        "amount": "About Rs 236 crore for phase one (rough guide)",
        "status": "past",
        "url": "https://mercomindia.com/haryana-solar-hybrid-government-schools",
        "source": "Haryana to Install Solar Hybrid Systems in All Government Schools",
        "publisher": "Mercom India (2017)"
      }
    ],
    "netMetering": {
      "text": "HAREDA says government building plants are installed with net metering, up to 500 kWp under the HERC net metering rules.",
      "url": "https://hareda.gov.in/solar-power-plant-on-govt-buildings-capex-mode/",
      "source": "Solar Power Plant on Govt Buildings (CAPEX Mode), HAREDA"
    }
  },
  "Himachal Pradesh": {
    "agency": {
      "name": "Himachal Pradesh Energy Development Agency (HIMURJA)",
      "url": "https://himurja.hp.gov.in/"
    },
    "schemes": [
      {
        "name": "Solar plants in 312 middle schools (Samagra Shiksha)",
        "what": "HIMURJA tendered small solar plants (about 1 to 3 kWp) for 312 government middle schools in 11 districts.",
        "who": "HIMURJA with Samagra Shiksha, Himachal Pradesh",
        "amount": "About Rs 11 crore in total (rough guide)",
        "status": "past",
        "url": "https://mercomindia.com/himachal-pradesh-tender-solar-schools",
        "source": "Himachal Pradesh Floats Tender to Install Solar Projects at 312 Schools Across the State",
        "publisher": "Mercom India (2019)"
      },
      {
        "name": "Rooftop solar on government buildings (RESCO)",
        "what": "HIMURJA tender for rooftop plants of 100 kW and above on government buildings. A developer builds and runs the plant for 25 years and the building pays a fixed tariff. Most village schools are smaller than this.",
        "who": "HIMURJA",
        "status": "current",
        "url": "https://himurja.hp.gov.in/wp-content/uploads/2025/05/e-TENDER-NOTICE.pdf",
        "source": "HIMURJA e-Tender Notice, GCRTS/RESCO/2025-26",
        "publisher": "HIMURJA, Government of Himachal Pradesh"
      }
    ],
    "netMetering": {
      "text": "In HIMURJA rooftop tenders, plants of 1 to 50 kW on government and institutional buildings go under net metering, and larger ones under net billing.",
      "url": "https://solarquarter.com/2024/02/16/himachal-pradesh-initiates-rate-contract-tender-for-rooftop-solar-projects/",
      "source": "Himachal Pradesh initiates rate contract tender for rooftop solar projects (SolarQuarter)"
    }
  },
  "Jammu and Kashmir": {
    "agency": {
      "name": "Jammu and Kashmir Energy Development Agency (JAKEDA)",
      "url": "https://jakeda.jk.gov.in/"
    },
    "schemes": [
      {
        "name": "Rooftop solar on all government buildings",
        "what": "Grid-tied rooftop solar on government buildings, 70 MW paid by the government (capex) and 200 MW through private developers (RESCO). Buildings get smart meters and virtual net metering. JAKEDA is awarding projects in clusters.",
        "who": "JAKEDA, Science and Technology Department, J&K",
        "amount": "About Rs 400 crore for the capex part (rough guide)",
        "status": "current",
        "url": "https://www.newsonair.gov.in/jk-government-initiates-rooftop-solar-projects-for-40000-buildings-by-2025",
        "source": "J&K government initiates rooftop solar projects for 40,000 buildings by 2025",
        "publisher": "All India Radio News (2024)"
      }
    ],
    "netMetering": {
      "text": "Under the JERC (J&K and Ladakh) renewable energy rules of 2023, consumers can use net metering up to 500 kW, and government buildings can use virtual net metering across their sites.",
      "url": "https://powerline.net.in/2024/04/08/jerc-issues-renewable-energy-regulations-for-jk-and-ladakh/",
      "source": "JERC issues renewable energy regulations for J&K and Ladakh (Power Line)"
    }
  },
  "Jharkhand": {
    "agency": {
      "name": "Jharkhand Renewable Energy Development Agency (JREDA)",
      "url": "https://jreda.com/"
    },
    "schemes": [
      {
        "name": "Solar for government residential schools",
        "what": "JREDA installed 10 kW rooftop solar systems with batteries at government residential schools.",
        "who": "JREDA, Government of Jharkhand",
        "status": "unclear",
        "url": "https://irade.org/wp-content/uploads/2025/08/Impact-of-solarisation-in-schools.pdf",
        "source": "Impact of solarisation in schools",
        "publisher": "IRADE (2025)"
      },
      {
        "name": "Survey and solarisation of government buildings",
        "what": "JREDA plans to put solar on all government buildings with a sanctioned load of 1 kW or more, and tendered a survey and feasibility study. The 2018 State Solar Rooftop Policy also asks for solar on government offices, hospitals and educational institutions.",
        "who": "JREDA",
        "status": "current",
        "url": "https://www.jreda.com/api/all-uploaded-img/img/6360e82e42ef4.pdf",
        "source": "Jharkhand State Solar Rooftop Policy 2018",
        "publisher": "JREDA, Government of Jharkhand"
      },
      {
        "name": "Extra 20% subsidy for school rooftop solar",
        "what": "An extra 20% subsidy, through UNDP funds, for rooftop solar in up to 25 schools, up to 20 kW each, on top of the then existing subsidy.",
        "who": "JREDA",
        "amount": "Extra 20% (rough guide)",
        "status": "past",
        "url": "https://mercomindia.com/jharkhand-20-percent-subsidy-schools-rooftop",
        "source": "Jharkhand Announces Additional 20 Percent Subsidy for Schools Opting for Rooftop Solar",
        "publisher": "Mercom India (2018)"
      }
    ],
    "netMetering": {
      "text": "Net metering follows the JSERC rooftop solar rules of 2015 with later amendments, and since 2024 group and virtual net metering are also allowed.",
      "url": "https://solarquarter.com/2024/02/05/jserc-implements-new-regulations-for-group-net-metering-and-virtual-net-metering-2024/",
      "source": "JSERC implements new regulations for group net metering and virtual net metering 2024 (SolarQuarter)"
    }
  },
  "Karnataka": {
    "agency": {
      "name": "Karnataka Renewable Energy Development Limited (KREDL)",
      "url": "https://kredl.karnataka.gov.in/"
    },
    "schemes": [
      {
        "name": "Rooftop solar on government buildings",
        "what": "The state plans to speed up rooftop solar on government buildings. PWD surveys the buildings and KREDL builds the plants with private partners. Only about 2,624 of some 59,000 government buildings had solar.",
        "who": "Energy Department, KREDL and PWD, Karnataka",
        "status": "current",
        "url": "https://theprint.in/india/karnataka-govt-to-accelerate-rooftop-solarisation-of-government-buildings/3029958/",
        "source": "Karnataka govt to accelerate rooftop solarisation of government buildings",
        "publisher": "PTI via ThePrint (2026)"
      }
    ],
    "netMetering": {
      "text": "KERC's 2025 order calls rooftop plants Distributed Solar PV and adds virtual and group net metering alongside net and gross metering.",
      "url": "https://www.teamleaseregtech.com/updates/article/44771/kerc-expands-scope-of-solar-tariff-introduces-virtualgroup-net-meterin",
      "source": "KERC Expands Scope of Solar Tariff and Introduces Virtual/Group Net Metering (TeamLease RegTech)"
    }
  },
  "Kerala": {
    "agency": {
      "name": "Agency for New and Renewable Energy Research and Technology (ANERT)",
      "url": "https://anert.gov.in/"
    },
    "schemes": [
      {
        "name": "Carbon Neutral Governance: solar on government buildings",
        "what": "A 2020 government order asks all departments to put solar on their buildings. ANERT collects the demand and arranges the plants.",
        "who": "ANERT, Power Department, Kerala",
        "status": "current",
        "url": "https://anert.gov.in/programmeDetails?id=74",
        "source": "Carbon Neutral Governance: installation of solar power plants in government buildings",
        "publisher": "ANERT, Government of Kerala"
      },
      {
        "name": "ANERT solar for schools",
        "what": "A 2017 plan for grid-connected solar in schools, government schools first, with a 50% subsidy.",
        "who": "ANERT",
        "amount": "50% subsidy at that time (rough guide)",
        "status": "past",
        "url": "https://deccanchronicle.com/nation/in-other-news/210217/kerala-schools-to-go-in-solar-mode.html",
        "source": "Kerala schools to go in solar mode",
        "publisher": "Deccan Chronicle (2017)"
      }
    ],
    "netMetering": {
      "text": "The KSERC renewable energy rules of 2025 apply from 6 November 2025, with new billing from 1 January 2026; reports say net metering is now for small systems and larger ones move to net billing, so check with KSEB.",
      "url": "https://solarquarter.com/2025/07/07/kserc-introduces-new-renewable-energy-regulations-for-2025-with-focus-on-metering-storage-and-decentralized-power-in-kerala/",
      "source": "KSERC introduces new renewable energy regulations for 2025 (SolarQuarter)"
    }
  },
  "Ladakh": {
    "agency": {
      "name": "Ladakh Renewable Energy Development Agency (LREDA), Leh; Kargil Renewable Energy Development Agency (KREDA) for Kargil",
      "url": "https://leh.nic.in/department/lreda/"
    },
    "schemes": [
      {
        "name": "Rooftop solar on government buildings in Kargil",
        "what": "Ladakh Power Development Department tendered about 2.6 MW of grid-connected rooftop solar on government buildings in Kargil district.",
        "who": "Ladakh Power Development Department",
        "status": "unclear",
        "url": "https://www.mercomindia.com/ladakh-power-department-floats-rooftop-solar-projects",
        "source": "Ladakh Power Department floats rooftop solar projects",
        "publisher": "Mercom India (2024)"
      }
    ],
    "netMetering": {
      "text": "Ladakh follows the JERC (J&K and Ladakh) renewable energy rules of 2023: net metering up to 500 kW, and virtual net metering for government buildings.",
      "url": "https://powerline.net.in/2024/04/08/jerc-issues-renewable-energy-regulations-for-jk-and-ladakh/",
      "source": "JERC issues renewable energy regulations for J&K and Ladakh (Power Line)"
    }
  },
  "Lakshadweep": {
    "agency": {
      "name": "Lakshadweep Energy Development Agency (LEDA), Kavaratti",
      "url": "https://lakshadweep.gov.in/"
    },
    "schemes": [
      {
        "name": "Rooftop solar with batteries on government buildings",
        "what": "Solar panels with battery storage on government buildings across the islands, to cut diesel use. About 2,107 kW of solar and 5,525 kWh of batteries in total. Vendors also maintain the systems for 10 years.",
        "who": "Lakshadweep Electricity Department picks the vendors. The department that owns each building places the order and pays.",
        "amount": "Paid upfront by the building's department (CAPEX). No per-school amount stated.",
        "status": "current",
        "url": "https://solarquarter.com/2026/05/07/lakshadweep-invites-bids-for-2107-kw-rooftop-solar-and-5525-kwh-battery-storage-projects/",
        "source": "Lakshadweep invites bids for 2107 kW rooftop solar and 5525 kWh battery storage projects (May 2026)",
        "publisher": "SolarQuarter"
      }
    ],
    "netMetering": {
      "text": "The JERC for Goa and Union Territories net metering rules (2019) cover Lakshadweep, for systems from 5 kW to 500 kW, and government buildings can use virtual net metering. The islands run on a small diesel-based grid, so check with the Electricity Department first.",
      "url": "https://renewablewatch.in/2019/08/16/goa-issues-net-metering-regulations-solar-projects/",
      "source": "Goa issues net metering regulations for solar projects (JERC Goa and UTs, 2019), Renewable Watch"
    }
  },
  "Madhya Pradesh": {
    "agency": {
      "name": "Madhya Pradesh Urja Vikas Nigam Ltd (MPUVNL), Department of New and Renewable Energy",
      "url": "http://www.mprenewable.nic.in"
    },
    "schemes": [
      {
        "name": "Rooftop solar on government buildings (RESCO model)",
        "what": "A private developer puts solar on a government building at no upfront cost. The building pays the developer a fixed rate for each unit used, usually below the grid rate. In 2018 this covered 291 government colleges, plus ITIs, polytechnics and universities. Newer rounds in 2021 and 2025 covered more government offices.",
        "who": "MPUVNL",
        "amount": "No upfront cost. Government colleges paid about Rs 2.2 per unit in 2018, rising about 3% a year. Rough guide only.",
        "status": "current",
        "url": "https://www.dailypioneer.com/2018/state-editions/291-govt-colleges--others-get-solar-energy.html",
        "source": "291 Govt colleges, others get solar energy (2018)",
        "publisher": "The Daily Pioneer"
      }
    ],
    "netMetering": {
      "text": "Under the MPERC Grid Interactive Renewable Energy Systems Regulations 2024, consumers in all categories, including government buildings, can use net metering for systems up to 500 kW.",
      "url": "https://indianstates.csis.org/articles/2024-05-21-madhya-pradesh-electricity-regulatory-commission-mperc-introduces-the-mperc-grid-interactive-renewable-energy-systems-and-related-matters-regulations-2024/madhya-pradesh-electricity-regulatory-commission-mperc-introduces-the-mperc-grid-interactive-renewable-energy-systems-and-related-matters-regulations-2024",
      "source": "MPERC introduces the Grid Interactive Renewable Energy Systems and Related Matters Regulations 2024 (CSIS Indian States)"
    }
  },
  "Maharashtra": {
    "agency": {
      "name": "Maharashtra Energy Development Agency (MEDA, Mahaurja)",
      "url": "https://www.mahaurja.com"
    },
    "schemes": [
      {
        "name": "Rooftop solar on Zilla Parishad schools (Nagpur district)",
        "what": "MEDA put 2 kW grid-tied, net metered solar systems on Zilla Parishad schools. 564 primary and upper primary schools in 2022, and 272 more in 2024, with 5 years of maintenance.",
        "who": "MEDA with Nagpur Zilla Parishad",
        "amount": "2024 round: about Rs 3.45 crore for 272 schools, roughly Rs 1.3 lakh per school. Rough guide only.",
        "status": "past",
        "url": "https://mercomindia.com/epc-tender-floated-rooftop-solar-nagpur",
        "source": "EPC Tender Floated for 1.12 MW of Rooftop Solar Systems at 564 Schools in Nagpur (2022)",
        "publisher": "Mercom India"
      },
      {
        "name": "Rooftop solar on government buildings (10 MW)",
        "what": "Statewide tenders to put solar on government buildings, under both the RESCO model (pay per unit, no upfront cost) and the CAPEX model (paid upfront).",
        "who": "MEDA",
        "status": "past",
        "url": "https://mercomindia.com/bids-to-install-10-mw-rooftop-solar-maharashtra",
        "source": "Bids Invited to Install 10 MW of Rooftop Solar on Government Buildings in Maharashtra (2022 to 2023)",
        "publisher": "Mercom India"
      }
    ],
    "netMetering": {
      "text": "MERC rooftop rules allow net metering for all consumer types, and a 2023 amendment raised the cap to 5 MW or the contract demand, whichever is lower.",
      "url": "https://renewablewatch.in/2023/11/21/merc-increases-net-metering-cap-for-rooftop-solar-projects-to-5-mw/",
      "source": "MERC increases net metering cap for rooftop solar projects to 5 MW (2023), Renewable Watch"
    }
  },
  "Manipur": {
    "agency": {
      "name": "Manipur Renewable Energy Development Agency (MANIREDA)",
      "url": "https://manireda.mn.gov.in"
    },
    "schemes": [
      {
        "name": "Grid-connected rooftop solar on government buildings (RESCO)",
        "what": "MANIREDA tendered for developers to set up grid-connected rooftop solar on government buildings across Manipur. The developer builds it and the building pays per unit.",
        "who": "MANIREDA",
        "status": "unclear",
        "url": "https://manireda.mn.gov.in/tender-for-selection-of-roof-top-developer-for-setting-up-grid-connected-solar-roof-top-plants-at-various-locations-on-government-buildings-in-the-state-of-manipur-on-resco-mode-through-tariff-based-c",
        "source": "Tender for selection of roof top developer for grid connected solar roof top plants on government buildings in Manipur on RESCO mode",
        "publisher": "MANIREDA"
      },
      {
        "name": "UNDP help for rooftop solar in private institutions and community buildings",
        "what": "MANIREDA lists an application form for UNDP financial help to install grid-connected rooftop solar in private institutions and community establishments. Aided or community-run schools may want to ask if they qualify.",
        "who": "MANIREDA with UNDP",
        "status": "unclear",
        "url": "https://manireda.mn.gov.in/application-format-for-undp-financial-assistance-for-installation-of-gcrts-in-private-institutions-and-community-based-establishments-in-manipur",
        "source": "Application format for UNDP financial assistance for installation of GCRTS in private institutions and community based establishments in Manipur",
        "publisher": "MANIREDA"
      }
    ],
    "netMetering": {
      "text": "Net metering runs under the Metering for Grid Connected RE regulations (2016, amended up to 2023), now handled by the new Manipur Electricity Regulatory Commission, which issued a draft replacement in July 2026.",
      "url": "https://mnerc.mn.gov.in/wp-content/uploads/2026/03/Metering-for-Grid-Connected-RE-2nd-amendment-Regulations-2022.pdf",
      "source": "Metering for Grid Connected RE (2nd amendment) Regulations 2022, Manipur Electricity Regulatory Commission"
    }
  },
  "Meghalaya": {
    "agency": {
      "name": "Meghalaya New and Renewable Energy Development Agency (MNREDA)",
      "url": "https://mnreda.gov.in"
    },
    "schemes": [
      {
        "name": "Chief Minister's Solar Mission",
        "what": "State solar mission launched in 2023. Lower primary schools get off-grid solar systems with batteries, fully paid by the government. Larger systems for schools and other institutions get a 50% subsidy. Note: these school systems are off-grid, not grid-tied.",
        "who": "MNREDA",
        "amount": "Lower primary schools: full subsidy. Larger systems: about 50% subsidy. Mission outlay about Rs 500 crore. Rough guide only.",
        "status": "current",
        "url": "https://meghalaya.gov.in/sites/default/files/press_release/Press_Release_MNREDA.pdf",
        "source": "MNREDA Showcases Meghalaya's Solar Push (press release)",
        "publisher": "Government of Meghalaya"
      }
    ],
    "netMetering": {
      "text": "MSERC net metering rules from 2015, amended in January 2025, cover rooftop solar for eligible consumers. A draft 2026 rule on distributed renewable energy would replace them.",
      "url": "https://megpns.gov.in/gazette/2025/01/15-01-25-X.pdf",
      "source": "Meghalaya Gazette, 15 January 2025 (MSERC net metering First Amendment)"
    }
  },
  "Mizoram": {
    "agency": {
      "name": "Zoram Energy Development Agency (ZEDA), Aizawl"
    },
    "schemes": [
      {
        "name": "Rooftop solar on state government buildings (Mizoram Solar Power Policy 2017)",
        "what": "The 2017 state solar policy makes rooftop solar compulsory on state government department and institution buildings where it is technically possible. It also offers rooftop developers an incentive of 70% of the benchmark cost for systems up to 500 kW.",
        "who": "Government of Mizoram, with ZEDA",
        "amount": "Incentive of about 70% of benchmark cost under the 2017 policy. Rough guide only; check if still offered.",
        "status": "unclear",
        "url": "https://renewablewatch.in/2017/08/24/mizoram-government-issues-its-new-solar-power-policy/",
        "source": "Mizoram government issues its new solar power policy (2017)",
        "publisher": "Renewable Watch"
      }
    ],
    "netMetering": {
      "text": "The 2017 state policy says all buildings can set up grid-connected rooftop solar of 1 kW and above with net metering, under the JERC (Manipur and Mizoram) metering regulations of 2016.",
      "url": "https://mizoramassembly.in/storage/Assembly/Gazette/EO/GZEO45ISS_368.pdf",
      "source": "Mizoram Gazette, September 2016 (JERC metering regulations for grid connected renewable energy)"
    }
  },
  "Nagaland": {
    "agency": {
      "name": "Department of New and Renewable Energy, Nagaland",
      "url": "https://nre.nagaland.gov.in"
    },
    "schemes": [
      {
        "name": "Solar power plants on government buildings",
        "what": "The department put small solar plants on government buildings in phases. Phase I covered 30 government offices. One 5 kW plant went to Riizhiikhrie Government Higher Secondary School, Kohima.",
        "who": "Department of New and Renewable Energy, Nagaland",
        "amount": "News reports say the central government paid about 90% and the state about 10% in the North East. Rough guide only.",
        "status": "past",
        "url": "https://nre.nagaland.gov.in/wp-content/uploads/2025/09/AAR-2023-24_compressed.pdf",
        "source": "Annual Administrative Report 2023-24",
        "publisher": "Department of New and Renewable Energy, Nagaland"
      }
    ],
    "netMetering": {
      "text": "The NERC Rooftop Solar Grid Interactive System Net/Gross Metering Regulations 2019 allow net metering, and a 2025 amendment pays for credits left unused at the end of each settlement period.",
      "url": "https://rts.dopn.gov.in/assets/frontend/layout/website_docs/important_docs/Rooftop Solar Grid Interactive System NetGross metering Regulations, 2019.pdf",
      "source": "NERC Rooftop Solar Grid Interactive System Net/Gross Metering Regulations 2019 (Department of Power, Nagaland)"
    }
  },
  "Odisha": {
    "agency": {
      "name": "Odisha Renewable Energy Development Agency (OREDA)",
      "url": "https://oredaodisha.com"
    },
    "schemes": [
      {
        "name": "Rooftop solar on government buildings and educational institutions",
        "what": "OREDA collects demand from government departments and tenders rooftop solar for their buildings. In the five years to March 2025 it fitted 342 educational institutions, about 5,387 kW in total. A new call in 2026 empanels installers for government offices and institutions, with 5 years of maintenance.",
        "who": "OREDA",
        "status": "current",
        "url": "https://www.theweek.in/wire-updates/national/2025/03/19/ces7-od-assembly-solar.html",
        "source": "Rooftop solar projects installed on 1232 public buildings in Odisha, Minister tells assembly (March 2025)",
        "publisher": "The Week (PTI)"
      }
    ],
    "netMetering": {
      "text": "OERC allows net metering up to 500 kW or the sanctioned load, and government offices can also use group or virtual net metering for systems of 5 kW to 500 kW.",
      "url": "https://mercomindia.com/odisha-allows-net-metering-rooftop-solar-500-kw",
      "source": "Odisha Regulator Allows Net Metering for Rooftop Solar Capacity up to 500 kW, Mercom India"
    }
  },
  "Puducherry": {
    "agency": {
      "name": "Renewable Energy Agency Puducherry (REAP)",
      "url": "https://www.py.gov.in/node/4320"
    },
    "schemes": [
      {
        "name": "Solar on all government buildings (SECI and Puducherry)",
        "what": "Puducherry and SECI signed an agreement in August 2025 to put rooftop solar on all government buildings. A developer builds and maintains it, and the building pays per unit. In 2026 SECI awarded about 17.7 MW at about Rs 4.11 per unit.",
        "who": "REAP with Solar Energy Corporation of India (SECI)",
        "amount": "No upfront cost. About Rs 4.11 per unit (2026 award). Rough guide only.",
        "status": "current",
        "url": "https://solarquarter.com/2025/08/12/puducherry-government-and-seci-sign-mou-for-solarization-of-all-government-buildings-in-the-union-territory",
        "source": "Puducherry Government and SECI Sign MoU for Solarization of All Government Buildings in the Union Territory (August 2025)",
        "publisher": "SolarQuarter"
      }
    ],
    "netMetering": {
      "text": "Puducherry follows the JERC (Goa and UTs) 2019 rules, with Electricity Department guidelines revised in January 2024, for systems of 5 kW to 500 kW, and government buildings can use virtual net metering.",
      "url": "https://electricity.py.gov.in/sites/default/files/4. Revised Guidelines 30012024.pdf",
      "source": "Revised Guidelines on rooftop solar, 30 January 2024, Electricity Department, Puducherry"
    }
  },
  "Punjab": {
    "agency": {
      "name": "Punjab Energy Development Agency (PEDA)",
      "url": "https://peda.gov.in"
    },
    "schemes": [
      {
        "name": "PEDA rooftop solar on government schools and buildings",
        "what": "PEDA has put grid-connected rooftop solar on government schools, about 5 kW per school on average. Its page reports about 4,300 school plants and more government buildings in progress. Vendors maintain the plants for five years.",
        "who": "PEDA with the School Education Department",
        "amount": "Rough guide: about 21.6 MW across about 4,300 schools (state figures)",
        "status": "current",
        "url": "https://www.peda.gov.in/roof-top-solar-power-projects",
        "source": "Roof Top Solar Power Projects",
        "publisher": "Punjab Energy Development Agency"
      }
    ],
    "netMetering": {
      "text": "Under the PSERC rooftop solar regulations of 2021, consumers including government buildings can use net metering for systems up to 500 kWp, so a 3 to 10 kWp school system fits easily.",
      "url": "https://www.peda.gov.in/roof-top-solar-power-projects",
      "source": "Roof Top Solar Power Projects (PEDA), citing PSERC regulations 2021"
    }
  },
  "Rajasthan": {
    "agency": {
      "name": "Rajasthan Renewable Energy Corporation Limited (RRECL)",
      "url": "https://www.energy.rajasthan.gov.in/content/raj/energy-department/en/departments/rrecl/activities/RoofTop.html"
    },
    "schemes": [
      {
        "name": "Rooftop Solar Power Generation Scheme on state government buildings (RESCO)",
        "what": "A private company installs and runs solar on government roofs, and the office pays only for the power it uses, over 25 years. A 50 MW tender was issued in 2019-20. About 1.2 MW was running by March 2024.",
        "who": "RRECL",
        "amount": "No cost to the building under RESCO; pays a fixed rate per unit (rough guide)",
        "status": "past",
        "url": "https://www.energy.rajasthan.gov.in/content/raj/energy-department/en/departments/rrecl/activities/RoofTop.html",
        "source": "Rooftop Solar Power Generation Scheme 2019-20",
        "publisher": "Energy Department, Government of Rajasthan"
      },
      {
        "name": "Rajasthan Integrated Clean Energy Policy 2024: solar on government buildings",
        "what": "The state policy says government buildings will be solarised with rooftop plants, using RESCO or hybrid annuity models. RRECL has since tendered large rooftop capacity for government buildings.",
        "who": "Energy Department and RRECL",
        "status": "current",
        "url": "https://istart.rajasthan.gov.in/public/Policies/2024/rajasthan-integrated-clean-energy-policy.pdf",
        "source": "Rajasthan Integrated Clean Energy Policy, 2024",
        "publisher": "Government of Rajasthan"
      }
    ],
    "netMetering": {
      "text": "RERC rules allow net metering for rooftop solar, and news reports say the limit was raised from 500 kW to 1 MW, so small school systems qualify; check with your discom.",
      "url": "https://ornatesolar.com/news/rajasthan-government-raises-net-metering-cap-to-1-mw",
      "source": "Rajasthan Government Raises Net Metering Cap to 1 MW (Ornate Solar news)"
    }
  },
  "Sikkim": {
    "agency": {
      "name": "Sikkim Renewable Energy Development Agency (SREDA), under the Energy and Power Department",
      "url": "https://www.sikkimsreda.in/"
    },
    "schemes": [
      {
        "name": "Rooftop solar on government buildings in Sikkim (NHPC, RESCO model)",
        "what": "NHPC, a central power company, has tendered rooftop solar on government buildings in Sikkim. A developer installs and runs the plant and the building buys the power.",
        "who": "NHPC with the state",
        "amount": "Rough guide: tenders of about 5.6 MW in 2025",
        "status": "unclear",
        "url": "https://mercomindia.com/sikkim-floats-empanelment-tender-rooftop-solar",
        "source": "Sikkim rooftop solar tender coverage",
        "publisher": "Mercom India"
      }
    ]
  },
  "Tamil Nadu": {
    "agency": {
      "name": "Tamil Nadu Green Energy Corporation Ltd (TNGECL), which took over the Tamil Nadu Energy Development Agency (TEDA) in 2024",
      "url": "https://teda.in"
    },
    "schemes": [
      {
        "name": "Green School Scheme",
        "what": "The state picks government schools to become green schools, with rooftop solar and other green measures. A study says solar cut grid power use by about 46% per school.",
        "who": "Tamil Nadu Climate Change Mission with the School Education Department",
        "amount": "Rough guide: an early pilot set aside about Rs 5 crore for 25 schools",
        "status": "current",
        "url": "https://news.careers360.com/tamil-nadu-green-school-scheme-study-offset-91-percent-electricity-government-schools-hospitals-rooftop-solar-cool-roof",
        "source": "Green School Scheme of Tamil Nadu can offset 91% power use of govt schools, hospitals if scaled up: study",
        "publisher": "Careers360 News"
      },
      {
        "name": "TEDA 20 MW rooftop solar on government buildings and educational institutions",
        "what": "TEDA planned 20 MW of grid-connected rooftop solar on government buildings and educational institutions, with five years of maintenance.",
        "who": "TEDA (now TNGECL)",
        "amount": "Rough guide: about Rs 120 crore",
        "status": "past",
        "url": "https://renewablewatch.in/2023/01/06/teda-floats-bids-for-20-mw-rooftop-solar-projects/",
        "source": "TEDA floats bids for 20 MW rooftop solar projects",
        "publisher": "Renewable Watch"
      },
      {
        "name": "TNGECL rooftop solar on government offices",
        "what": "TNGECL issued rooftop tenders for government buildings in 2025-26, then cancelled them. A new plan for about 200 government offices awaits state approval.",
        "who": "TNGECL",
        "status": "unclear",
        "url": "https://www.constructionworld.in/amp/energy-infrastructure/power-and-renewable-energy/tamil-nadu-plans-200-mw-rooftop-solar-for-government-offices/94059",
        "source": "Tamil Nadu Plans 200 MW Rooftop Solar For Government Offices",
        "publisher": "Construction World"
      }
    ],
    "netMetering": {
      "text": "Under the TNERC solar tariff order of 2021, net feed-in metering is reported to be open to all consumer types, which would include schools; confirm with TNPDCL.",
      "url": "https://www.cag.org.in/sites/default/files/database/5.%20TN%27s%20solar%20energy%20policy%20and%20regulations.pdf",
      "source": "TN's solar energy policy and regulations (Citizen consumer and civic Action Group)"
    }
  },
  "Telangana": {
    "agency": {
      "name": "Telangana Renewable Energy Development Corporation Ltd (TGREDCO), formerly TSREDCO",
      "url": "https://tgredco.telangana.gov.in/default.aspx"
    },
    "schemes": [
      {
        "name": "Rooftop solar for 9,937 government schools",
        "what": "TGREDCO is installing 2, 5 and 10 kW grid-connected rooftop plants with remote monitoring at 9,937 government schools in all 33 districts, with five years of maintenance.",
        "who": "TGREDCO",
        "amount": "Rough guide: about 46.7 MW; reported order value about Rs 273 crore",
        "status": "current",
        "url": "https://tgredco.telangana.gov.in/default.aspx",
        "source": "TGREDCO tender TGREDCO/SOLAR/GCRT/9937 SCHOOLS/2026-27",
        "publisher": "Telangana Renewable Energy Development Corporation"
      },
      {
        "name": "Rooftop solar for 1,521 government schools",
        "what": "TSREDCO installed 2 to 10 kW net-metered rooftop plants at 1,521 government schools, with five years of maintenance.",
        "who": "TSREDCO (now TGREDCO)",
        "amount": "Rough guide: about 3.07 MW, about Rs 32 crore",
        "status": "past",
        "url": "https://renewablewatch.in/2022/09/14/telangana-to-install-3-07-mw-of-rooftop-solar-systems-at-government-schools/",
        "source": "Telangana to install 3.07 MW of rooftop solar systems at government schools",
        "publisher": "Renewable Watch"
      }
    ],
    "netMetering": {
      "text": "Under the TGERC rooftop solar regulation of 2025, government consumers can install solar up to 100% of their sanctioned load and use net metering for systems up to 500 kW.",
      "url": "https://energetica-india.net/news/telangana-unveils-2025-rooftop-solar-reforms-widening-net-metering-and-shared-energy-access",
      "source": "Telangana unveils 2025 rooftop solar reforms (Energetica India)"
    }
  },
  "Tripura": {
    "agency": {
      "name": "Tripura Renewable Energy Development Agency (TREDA)",
      "url": "https://treda.tripura.gov.in"
    },
    "schemes": [
      {
        "name": "TREDA rooftop solar on government buildings",
        "what": "TREDA empanels vendors to put 10 to 500 kWp grid-connected plants on government buildings, with a 10-year warranty and maintenance. It plans to cover block offices and village committee offices in phases.",
        "who": "TREDA",
        "amount": "Rough guide: target of about 11 MW in 2026-27",
        "status": "current",
        "url": "https://treda.tripura.gov.in/sites/default/files/2025-06/NIeT.pdf",
        "source": "Notice Inviting e-Tender for grid-connected rooftop plants on government buildings",
        "publisher": "Tripura Renewable Energy Development Agency"
      },
      {
        "name": "Earlier TREDA solar plants on government buildings and school hostels",
        "what": "TREDA installed small solar plants on government buildings, school hostels, market sheds and similar sites.",
        "who": "TREDA",
        "status": "past",
        "url": "https://treda.tripura.gov.in/node/20",
        "source": "Solar Power Plant",
        "publisher": "Tripura Renewable Energy Development Agency"
      }
    ],
    "netMetering": {
      "text": "Under the TERC rooftop regulations of 2024 as amended in 2025, net metering is reported to cover 1 to 10 kWp (or the contracted load if lower), and larger systems move to gross metering.",
      "url": "https://solarquarter.com/2025/11/11/tripura-electricity-regulatory-commission-issues-first-amendment-to-solar-rooftop-net-gross-metering-regulations-2024/",
      "source": "TERC issues first amendment to solar rooftop net/gross metering regulations 2024 (SolarQuarter)"
    }
  },
  "Uttar Pradesh": {
    "agency": {
      "name": "Uttar Pradesh New and Renewable Energy Development Agency (UPNEDA)",
      "url": "https://upneda.org.in/"
    },
    "schemes": [
      {
        "name": "Rooftop solar on government and semi-government buildings",
        "what": "A state order of 7 October 2024 asks for rooftop solar on government buildings. UPNEDA installs it with its own funds or through a RESCO developer on a 25-year power deal. Its 2025-26 tender covers 1 to 2,000 kWp systems.",
        "who": "UPNEDA",
        "amount": "Rough guide: 500 MW tender in 2025-26",
        "status": "current",
        "url": "https://upneda.org.in/MediaGallery/Tender/UPNEDA_RESCO_Tender25-26_17April2025.pdf",
        "source": "Request for Selection document for rooftop solar on government buildings, 2025-26",
        "publisher": "UPNEDA"
      },
      {
        "name": "Rooftop solar on secondary school buildings under Samagra Shiksha",
        "what": "UPNEDA awarded rooftop solar at government secondary schools across the state under Samagra Shiksha.",
        "who": "UPNEDA with the Education Department",
        "amount": "Rough guide: about 4.1 MW, about Rs 23.5 crore",
        "status": "past",
        "url": "https://pv-magazine-india.com/press-releases/servotech-lands-4-1-mw-key-solar-rooftop-project-from-upneda",
        "source": "Servotech Lands 4.1 MW solar rooftop project from UPNEDA",
        "publisher": "pv magazine India"
      }
    ],
    "netMetering": {
      "text": "The UP Solar Energy Policy 2022 offers net metering for rooftop solar on government buildings and on all government and private educational institutions.",
      "url": "https://solarcitiesportal.upneda.org.in/images/Uttar_Pradesh_Solar_Energy_Policy2022_English.pdf",
      "source": "Uttar Pradesh Solar Energy Policy 2022"
    }
  },
  "Uttarakhand": {
    "agency": {
      "name": "Uttarakhand Renewable Energy Development Agency (UREDA)",
      "url": "https://ureda.uk.gov.in"
    },
    "schemes": [
      {
        "name": "UREDA rooftop solar on government buildings",
        "what": "UREDA hires contractors to put grid-connected rooftop solar on government offices, colleges, hospitals and other institutions. Schools are not named on their own.",
        "who": "UREDA",
        "amount": "Rough guide: about 6.5 MW tendered in 2026",
        "status": "current",
        "url": "https://www.mercomindia.com/ureda-tenders-6-5-mw-rooftop-solar-projects-on-government-buildings",
        "source": "UREDA tenders 6.5 MW rooftop solar projects on government buildings",
        "publisher": "Mercom India"
      }
    ],
    "netMetering": {
      "text": "Under the UERC renewable energy regulations of 2023, rooftop systems can use net metering up to 1 MW, and the state solar policy allows banking of surplus power through the year.",
      "url": "https://solarquarter.com/2025/07/09/uttarakhand-regulator-denies-request-to-exceed-1-mw-rooftop-solar-net-metering-limit/",
      "source": "Uttarakhand regulator denies request to exceed 1 MW rooftop solar net metering limit (SolarQuarter)"
    }
  },
  "West Bengal": {
    "agency": {
      "name": "West Bengal Renewable Energy Development Agency (WBREDA)",
      "url": "https://www.wbreda.org/"
    },
    "schemes": [
      {
        "name": "Rooftop solar for government and government-aided schools",
        "what": "WBREDA puts grid-connected rooftop solar on government-aided and sponsored schools to cut power bills and teach students about clean energy. It keeps a list of approved schools.",
        "who": "WBREDA, under the Non-Conventional and Renewable Energy Sources Department",
        "amount": "Rough guide: about 2,089 schools, about 19.1 MWp so far",
        "status": "current",
        "url": "https://www.wbreda.org/school-electrification/",
        "source": "School Electrification",
        "publisher": "WBREDA"
      },
      {
        "name": "Aloshree",
        "what": "Rooftop solar on suitable government and local body buildings. Offices apply to WBREDA through their department or the District Magistrate. The vendor maintains it for five years.",
        "who": "WBREDA",
        "status": "unclear",
        "url": "https://wbpower.gov.in/alosree/",
        "source": "ALOSREE",
        "publisher": "Power Department, Government of West Bengal"
      }
    ],
    "netMetering": {
      "text": "Under the WBERC rooftop solar regulations of 2025, any consumer with at least 1 kW load can use net metering up to 500 kW or the sanctioned load, and systems up to 10 kW are approved without a feasibility study.",
      "url": "https://www.energetica-india.net/news/wberc-issues-grid-interactive-rooftop-solar-pv-regulations-2025",
      "source": "WBERC issues Grid Interactive Rooftop Solar PV Regulations 2025 (Energetica India)"
    }
  }
};
