import { useState, useMemo, useCallback, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from "recharts";

const EIA = {
  AL:7.25,AK:19.31,AZ:7.90,AR:6.61,CA:21.53,CO:8.62,CT:17.12,DE:8.49,DC:10.80,FL:8.50,
  GA:7.21,HI:34.13,ID:7.69,IL:8.83,IN:8.15,IA:6.80,KS:7.73,KY:6.50,LA:5.61,ME:12.46,
  MD:10.01,MA:18.19,MI:8.26,MN:9.15,MS:6.81,MO:7.87,MT:7.59,NE:7.66,NV:8.64,NH:16.21,
  NJ:11.93,NM:5.43,NY:9.17,NC:7.77,ND:7.25,OH:7.10,OK:5.84,OR:8.05,PA:7.87,RI:19.70,
  SC:6.84,SD:8.28,TN:6.21,TX:6.12,UT:7.86,VT:11.58,VA:8.99,WA:6.61,WV:7.81,WI:8.54,WY:7.96
};
const toMWh = (sc) => { const c = EIA[sc]; return c != null ? +(c * 10).toFixed(0) : 60; };

/* State Corporate Income Tax Rates (from Enverus/Tax Foundation) */
const STATE_TAX = {
  AK:9.40,AL:6.50,AR:4.30,AZ:4.90,CA:8.84,CO:4.40,CT:8.25,DE:8.70,DC:8.25,FL:5.50,
  GA:5.39,HI:6.40,IA:7.10,ID:5.70,IL:9.50,IN:4.90,KS:6.50,KY:5.00,LA:5.50,MA:8.00,
  MD:8.25,ME:8.93,MI:6.00,MN:9.80,MO:4.00,MS:5.00,MT:6.75,NC:2.25,ND:4.31,NE:5.20,
  NH:7.50,NJ:11.50,NM:5.90,NV:0,NY:7.25,OH:0,OK:4.00,OR:7.60,PA:7.99,RI:7.00,
  SC:5.00,SD:0,TN:6.50,TX:0,UT:4.55,VA:6.00,VT:8.50,WA:0,WI:7.90,WV:6.50,WY:0
};

const LF = {
  AL:{n:"Alabama",f:0.96},AK:{n:"Alaska",f:1.32},AZ:{n:"Arizona",f:1.11},AR:{n:"Arkansas",f:0.96},
  CA:{n:"California",f:1.33},CO:{n:"Colorado",f:1.09},CT:{n:"Connecticut",f:1.29},DE:{n:"Delaware",f:1.27},
  DC:{n:"Washington D.C.",f:1.17},FL:{n:"Florida",f:0.96},GA:{n:"Georgia",f:0.98},HI:{n:"Hawaii",f:1.38},
  ID:{n:"Idaho",f:1.02},IL:{n:"Illinois",f:1.23},IN:{n:"Indiana",f:1.02},IA:{n:"Iowa",f:1.04},
  KS:{n:"Kansas",f:0.98},KY:{n:"Kentucky",f:1.00},LA:{n:"Louisiana",f:0.97},ME:{n:"Maine",f:1.02},
  MD:{n:"Maryland",f:1.03},MA:{n:"Massachusetts",f:1.34},MI:{n:"Michigan",f:1.10},MN:{n:"Minnesota",f:1.09},
  MS:{n:"Mississippi",f:0.95},MO:{n:"Missouri",f:1.11},MT:{n:"Montana",f:0.97},NE:{n:"Nebraska",f:0.99},
  NV:{n:"Nevada",f:1.14},NH:{n:"New Hampshire",f:1.19},NJ:{n:"New Jersey",f:1.22},NM:{n:"New Mexico",f:1.00},
  NY:{n:"New York",f:1.61},NC:{n:"North Carolina",f:0.96},ND:{n:"North Dakota",f:1.01},OH:{n:"Ohio",f:0.93},
  OK:{n:"Oklahoma",f:1.00},OR:{n:"Oregon",f:1.22},PA:{n:"Pennsylvania",f:1.37},RI:{n:"Rhode Island",f:1.26},
  SC:{n:"South Carolina",f:0.96},SD:{n:"South Dakota",f:0.98},TN:{n:"Tennessee",f:0.97},TX:{n:"Texas",f:0.93},
  UT:{n:"Utah",f:0.98},VT:{n:"Vermont",f:1.02},VA:{n:"Virginia",f:1.16},WA:{n:"Washington",f:1.13},
  WV:{n:"West Virginia",f:1.04},WI:{n:"Wisconsin",f:1.04},WY:{n:"Wyoming",f:1.00}
};

const CEPCI = {2018:603.1,2019:607.5,2020:596.2,2021:708.8,2022:816.0,2023:797.9,2024:810.5,2025:825.0,2026:840.0};

/* MACRS Depreciation Schedules */
const MACRS = {
  "5-yr":  [0.2000, 0.3200, 0.1920, 0.1152, 0.1152, 0.0576],
  "7-yr":  [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446],
  "15-yr": [0.0500, 0.0950, 0.0855, 0.0770, 0.0693, 0.0623, 0.0590, 0.0590, 0.0591, 0.0590, 0.0591, 0.0590, 0.0591, 0.0590, 0.0591, 0.0295],
  "20-yr": [0.0375, 0.0722, 0.0668, 0.0618, 0.0571, 0.0528, 0.0489, 0.0452, 0.0447, 0.0447, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0223]
};

const BASE_GP = 4.42;

const SC = {
  "Ammonia":{cat:"High Purity",cr:["99%"],bt:["Retrofit"],rps:"394k t NH₃/yr",rpu:"t NH₃/yr",rpc:394000,rco:413164,tic:37.356,toc:45.565,ccf:0.0551,fo:3.28,vo:2.67,pw:5.86,fl:0,cf:0.85,bs:"LA",
    cx:{fg:.454,el:.338,ic:.121,cw:.041,si:.036,ds:.011,bd:.001}},
  "Ethylene Oxide":{cat:"High Purity",cr:["99%"],bt:["Retrofit"],rps:"364.5k t EO/yr",rpu:"t EO/yr",rpc:364500,rco:103276,tic:16.636,toc:20.385,ccf:0.0474,fo:8.34,vo:1.66,pw:1.20,fl:0,cf:0.85,bs:"LA",
    cx:{fg:.296,el:.383,ic:.221,cw:.036,si:.058,ds:.006,bd:.001}},
  "Ethanol":{cat:"High Purity",cr:["99%"],bt:["Retrofit"],rps:"50M gal/yr",rpu:"M gal/yr",rpc:50,rco:121586,tic:20.187,toc:24.672,ccf:0.0696,fo:7.78,vo:1.75,pw:1.85,fl:0,cf:0.85,bs:"LA",
    cx:{fg:.322,el:.380,ic:.193,cw:.040,si:.052,ds:.013,bd:.001}},
  "NG Processing":{cat:"High Purity",cr:["99%"],bt:["Retrofit"],rps:"330 MMSCFD",rpu:"MMSCFD",rpc:330,rco:551816,tic:46.69,toc:56.764,ccf:0.0605,fo:2.86,vo:1.53,pw:6.12,fl:0,cf:0.85,bs:"LA",
    cx:{fg:.552,el:.275,ic:.097,cw:.036,si:.029,ds:.010,bd:.001}},
  "Coal-to-Liquids":{cat:"High Purity",cr:["99%"],bt:["Retrofit"],rps:"50k BPD FT",rpu:"BPD",rpc:50000,rco:65102701,tic:162.84,toc:196.924,ccf:0.0771,fo:0.58,vo:0.27,pw:43.6,fl:0,cf:0.85,bs:"LA",
    cx:{fg:.691,el:.184,cw:.074,ic:.036,si:.012,ds:.004,bd:.001}},
  "Gas-to-Liquids":{cat:"High Purity",cr:["99%"],bt:["Retrofit"],rps:"50k BPD FT",rpu:"BPD",rpc:50000,rco:1579952,tic:49.17,toc:59.661,ccf:0.0771,fo:1.04,vo:0.34,pw:6.73,fl:0,cf:0.85,bs:"LA",
    cx:{fg:.566,el:.272,ic:.094,cw:.036,si:.028,ds:.004,bd:.001}},
  "Refinery H₂":{cat:"Hydrogen",cr:["99%","90%"],bt:["Retrofit"],rps:"87k t H₂/yr",rpu:"t H₂/yr",rpc:87000,cf:0.85,bs:"LA",
    vr:{"99%":{rco:340550,tic:130.63,toc:159.244,ccf:0.0455,fo:12.28,vo:5.08,pw:4.42,fl:10.68,
      cx:{fg:.747,fw:.092,el:.085,ic:.033,cw:.028,si:.010,ds:.005,bd:.001}},
    "90%":{rco:309545,tic:127.184,toc:154.978,ccf:0.0455,fo:12.28,vo:5.08,pw:4.01,fl:10.68,
      cx:{fg:.752,fw:.088,el:.085,ic:.034,cw:.026,si:.010,ds:.005,bd:.001}}}},
  "Cement":{cat:"Industrial",cr:["99%"],bt:["Retrofit"],rps:"1.3M t cement/yr",rpu:"M t/yr",rpc:1.3,cf:0.85,bs:"LA",
    vr:{"99%":{rco:1213802,tic:338.949,toc:413.96,ccf:0.0535,fo:8.98,vo:5.88,pw:40.8,fl:15.66,
      cx:{fg:.761,fw:.069,ds:.064,el:.057,cw:.028,ic:.015,si:.005,bd:.001}}}},
  "Steel & Iron":{cat:"Industrial",cr:["99%","90%"],bt:["Retrofit"],rps:"2.54M t steel/yr",rpu:"M t/yr",rpc:2.54,cf:0.85,bs:"LA",
    vr:{"99%":{rco:1873012,tic:456.696,toc:1160.313,ccf:0.0753,fo:15.87,vo:9.29,pw:58.5,fl:6.13,
      cx:{fg:.782,fw:.072,ds:.052,el:.051,cw:.028,ic:.011,si:.004,bd:.001}},
    "90%":{rco:1691426,tic:419.354,toc:1063.524,ccf:0.0753,fo:16.12,vo:11.05,pw:52.8,fl:7.28,
      cx:{fg:.771,fw:.077,ds:.056,el:.051,cw:.030,ic:.011,si:.004,bd:.001}}}},
  "Pulp & Paper":{cat:"Industrial",cr:["99%","90%"],bt:["Greenfield","Retrofit"],rps:"0.4M t pulp/yr",rpu:"M t/yr",rpc:0.4,cf:0.85,bs:"LA",
    vr:{"99%|Greenfield":{rco:1311546,tic:337.271,toc:408.467,ccf:0.0535,fo:12.74,vo:7.17,pw:42.1,fl:0,
      cx:{fg:.799,ds:.067,el:.053,fw:.037,cw:.024,ic:.015,si:.005,bd:.001}},
    "90%|Greenfield":{rco:1190399,tic:322.627,toc:390.803,ccf:0.0535,fo:13.48,vo:7.50,pw:38.3,fl:0,
      cx:{fg:.792,ds:.070,el:.055,fw:.037,cw:.025,ic:.015,si:.005,bd:.001}},
    "99%|Retrofit":{rco:1311546,tic:349.261,toc:443.985,ccf:0.0535,fo:13.72,vo:7.51,pw:42.1,fl:9.58,
      cx:{fg:.770,fw:.068,ds:.067,el:.053,cw:.023,ic:.015,si:.005,bd:.001}},
    "90%|Retrofit":{rco:1190399,tic:332.733,toc:423.217,ccf:0.0535,fo:14.46,vo:7.84,pw:38.3,fl:9.66,
      cx:{fg:.768,ds:.070,fw:.065,el:.054,cw:.024,ic:.015,si:.005,bd:.001}}}},
  "NGCC F-Frame":{cat:"Power",cr:["90%"],bt:["Retrofit"],rps:"641 MW net",rpu:"MW net",rpc:641,rco:2161745,tic:601.463,toc:727.657,ccf:0.0773,fo:16.88,vo:10.74,pw:86.0,fl:82.86,cf:0.85,bs:"LA",
    cx:{fg:.862,el:.056,fw:.032,cw:.022,st:.019,ic:.006,si:.002,bd:.001}},
  "NGCC H-Frame":{cat:"Power",cr:["90%"],bt:["Retrofit"],rps:"878 MW net",rpu:"MW net",rpc:878,rco:2892332,tic:716.504,toc:866.916,ccf:0.0773,fo:15.97,vo:10.41,pw:114.0,fl:82.33,cf:0.85,bs:"LA",
    cx:{fg:.859,el:.057,fw:.034,cw:.023,st:.020,ic:.006,si:.002,bd:.001}},
  "Coal SC":{cat:"Power",cr:["90%","95%"],bt:["Retrofit"],rps:"550 MW net",rpu:"MW net",rpc:550,cf:0.85,bs:"LA",
    vr:{"90%":{rco:3410000,tic:892.5,toc:1080.1,ccf:0.0773,fo:18.42,vo:12.35,pw:168.0,fl:0,
      cx:{fg:.815,el:.068,fw:.042,cw:.032,st:.028,ic:.008,si:.004,bd:.003}},
    "95%":{rco:3598000,tic:948.2,toc:1147.5,ccf:0.0773,fo:19.15,vo:12.85,pw:182.0,fl:0,
      cx:{fg:.822,el:.065,fw:.040,cw:.031,st:.027,ic:.008,si:.004,bd:.003}}}},
  "Ambient Air":{cat:"CDR",cr:["99%"],bt:["Greenfield"],rps:"100k t CO₂/yr",rpu:"t CO₂/yr",rpc:100000,rco:100000,tic:450,toc:540,ccf:0.0850,fo:85,vo:45,pw:50,fl:0,cf:0.90,bs:"TX",
    cx:{ac:.45,el:.25,cw:.12,ic:.08,si:.06,bd:.04}},
  "Ocean Water":{cat:"CDR",cr:["99%"],bt:["Greenfield"],rps:"100k t CO₂/yr",rpu:"t CO₂/yr",rpc:100000,rco:100000,tic:280,toc:336,ccf:0.0850,fo:55,vo:30,pw:35,fl:0,cf:0.85,bs:"TX",
    cx:{ed:.50,el:.22,cw:.10,ic:.08,si:.06,bd:.04}}
};

const CX_LABELS = {fg:"Flue Gas Cleanup",fw:"Feedwater & BOP",ds:"Ductwork & Stack",cw:"Cooling Water",el:"Electrical",ic:"I&C",si:"Site Improvements",bd:"Buildings",st:"Steam Turbine",ac:"Air Contactor",th:"Thermal System",ed:"Electrodialysis"};
const CX_COLORS = {fg:"#3b82f6",fw:"#06b6d4",ds:"#8b5cf6",cw:"#10b981",el:"#f59e0b",ic:"#ec4899",si:"#64748b",bd:"#78716c",st:"#f97316",ac:"#14b8a6",th:"#ef4444",ed:"#6366f1"};

/* Technology type adjustment factors (relative to baseline amine/MEA) */
/* compat: array of compatible source categories */
/* learn: annual cost reduction rate (learning curve) — mature tech ~0%, emerging ~3-5%/yr */
/* baseYr: year when the listed capex/opex factors apply (learning adjusts from this) */
const TECH = {
  amine: { n: "Amine (MEA)", capex: 1.00, opex: 1.00, power: 1.00, compat: ["High Purity", "Hydrogen", "Industrial", "Power"], learn: 0.005, baseYr: 2018, desc: "Baseline monoethanolamine solvent — mature, widely deployed" },
  advamine: { n: "Advanced Amine", capex: 1.08, opex: 0.88, power: 0.85, compat: ["High Purity", "Hydrogen", "Industrial", "Power"], learn: 0.02, baseYr: 2018, desc: "Next-gen solvents (KS-1, CANSOLV) — lower regeneration energy, maturing rapidly" },
  membrane: { n: "Membrane", capex: 0.85, opex: 0.95, power: 0.70, compat: ["High Purity", "Hydrogen"], learn: 0.03, baseYr: 2018, desc: "Polymer membrane separation — costs declining with scale, best for high-purity" },
  cryo: { n: "Cryogenic", capex: 1.25, opex: 1.10, power: 1.35, compat: ["High Purity"], learn: 0.01, baseYr: 2018, desc: "Low-temperature separation — mature industrial process, modest improvements" },
  solid: { n: "Solid Sorbent", capex: 1.15, opex: 0.82, power: 0.75, compat: ["Industrial", "Power"], learn: 0.04, baseYr: 2018, desc: "Supported amines on silica/alumina — emerging tech, lower regeneration heat" },
  mof: { n: "MOF", capex: 1.35, opex: 0.70, power: 0.65, compat: ["High Purity", "Hydrogen", "Industrial", "Power"], learn: 0.06, baseYr: 2020, desc: "Metal-Organic Frameworks — highly selective, very low regeneration energy, early commercial" },
  dacsolid: { n: "DAC Solid Sorbent", capex: 1.00, opex: 1.00, power: 1.00, compat: ["CDR"], learn: 0.07, baseYr: 2020, desc: "Solid sorbent DAC (Climeworks-style) — modular, lower temp regeneration, electricity-only" },
  dacliquid: { n: "DAC Liquid Solvent", capex: 1.20, opex: 0.85, power: 1.50, compat: ["CDR"], learn: 0.05, baseYr: 2020, desc: "Liquid solvent DAC (Carbon Engineering-style) — larger scale, needs high-temp heat, lower OPEX" },
  doc: { n: "DOC Electrodialysis", capex: 0.62, opex: 0.65, power: 0.70, compat: ["CDR"], learn: 0.09, baseYr: 2022, desc: "Direct Ocean Capture — 150× higher CO₂ concentration than air, lowest energy, fastest learning" }
};

/* NETL Financial Assumptions by Source Category (from DOE/NETL Reports) */
/* constructionYrs: Capital Expenditure Period */
/* capexDist: Capital distribution during construction [Y1%, Y2%, Y3%] */
/* debtPct: Debt percentage of capital structure */
/* costDebt: Interest rate on debt (5.15% across all categories) */
/* roe: Levered Return on Equity (asset weighted) */
/* projectLife: Payback/Economic life in years */
const NETL_FIN = {
  "Ammonia":       { constructionYrs: 1, capexDist: [1.0], debtPct: 54, costDebt: 5.15, roe: 1.5, ccf: 0.0551, tascToc: 1.035, projectLife: 30 },
  "Ethylene Oxide":{ constructionYrs: 1, capexDist: [1.0], debtPct: 48, costDebt: 5.15, roe: 0.04, ccf: 0.0474, tascToc: 1.025, projectLife: 30 },
  "Ethanol":       { constructionYrs: 1, capexDist: [1.0], debtPct: 36, costDebt: 5.15, roe: 4.51, ccf: 0.0696, tascToc: 1.047, projectLife: 30 },
  "NG Processing": { constructionYrs: 1, capexDist: [1.0], debtPct: 43, costDebt: 5.15, roe: 2.96, ccf: 0.0605, tascToc: 1.039, projectLife: 30 },
  "Coal-to-Liquids":{ constructionYrs: 1, capexDist: [1.0], debtPct: 32, costDebt: 5.15, roe: 5.54, ccf: 0.0771, tascToc: 1.054, projectLife: 30 },
  "Gas-to-Liquids":{ constructionYrs: 1, capexDist: [1.0], debtPct: 32, costDebt: 5.15, roe: 5.54, ccf: 0.0771, tascToc: 1.054, projectLife: 30 },
  "Refinery H₂":   { constructionYrs: 3, capexDist: [0.10, 0.60, 0.30], debtPct: 33, costDebt: 5.15, roe: 0.41, ccf: 0.0455, tascToc: 1.036, projectLife: 30 },
  "Cement":        { constructionYrs: 3, capexDist: [0.10, 0.60, 0.30], debtPct: 42, costDebt: 5.15, roe: 1.42, ccf: 0.0535, tascToc: 1.054, projectLife: 30 },
  "Steel & Iron":  { constructionYrs: 3, capexDist: [0.10, 0.60, 0.30], debtPct: 39, costDebt: 5.15, roe: 5.02, ccf: 0.0753, tascToc: 1.091, projectLife: 30 },
  "Pulp & Paper":  { constructionYrs: 3, capexDist: [0.10, 0.60, 0.30], debtPct: 42, costDebt: 5.15, roe: 1.42, ccf: 0.0535, tascToc: 1.054, projectLife: 30 },
  "NGCC F-Frame":  { constructionYrs: 3, capexDist: [0.10, 0.60, 0.30], debtPct: 45, costDebt: 5.15, roe: 12.0, ccf: 0.0773, tascToc: 1.078, projectLife: 30 },
  "NGCC H-Frame":  { constructionYrs: 3, capexDist: [0.10, 0.60, 0.30], debtPct: 45, costDebt: 5.15, roe: 12.0, ccf: 0.0773, tascToc: 1.078, projectLife: 30 },
  "Coal SC":       { constructionYrs: 4, capexDist: [0.10, 0.30, 0.40, 0.20], debtPct: 45, costDebt: 5.15, roe: 12.0, ccf: 0.0773, tascToc: 1.078, projectLife: 30 },
  "Ambient Air":   { constructionYrs: 2, capexDist: [0.40, 0.60], debtPct: 50, costDebt: 6.0, roe: 15.0, ccf: 0.0850, tascToc: 1.10, projectLife: 25 },
  "Ocean Water":   { constructionYrs: 2, capexDist: [0.40, 0.60], debtPct: 50, costDebt: 6.0, roe: 15.0, ccf: 0.0850, tascToc: 1.10, projectLife: 25 }
};

/* Default NETL assumptions for unknown sources */
const NETL_DEFAULT = { constructionYrs: 3, capexDist: [0.10, 0.60, 0.30], debtPct: 45, costDebt: 5.15, roe: 5.0, ccf: 0.06, tascToc: 1.05, projectLife: 30 };

function gv(src, crEffective, bt) {
  const s = SC[src];
  if (!s) return null;
  
  // Parse capture rate - can be "90%", "99%", or custom like "95%"
  const crNum = parseFloat(cr);
  const crStr = cr; // Keep string version for matching
  
  let d, estCR = false, estBT = false;
  const hasCR = s.cr.includes(crStr);
  const hasBT = s.bt.includes(bt);
  
  if (s.vr) {
    // Try exact match first
    d = s.vr[`${crStr}|${bt}`] || s.vr[crStr];
    if (!d) {
      // Fall back to any available variant
      const keys = Object.keys(s.vr);
      // Prefer matching capture rate
      const crMatch = keys.find(k => k.startsWith(crStr));
      // Or matching build type
      const btMatch = keys.find(k => k.endsWith(bt));
      d = s.vr[crMatch] || s.vr[btMatch] || Object.values(s.vr)[0];
    }
  } else {
    d = s;
  }
  
  const base = { ...s, ...d };
  
  // Estimate adjustments if selected option not in NETL data
  // Capture rate adjustment: costs scale roughly linearly with capture rate
  // 99% costs ~10% more than 90%, interpolate for intermediate values
  let crAdj = 1, btAdj = 1;
  const baseCR = d ? (Object.keys(s.vr || {}).find(k => s.vr[k] === d) || "").split("|")[0] || s.cr[0] : s.cr[0];
  const baseBT = d ? (Object.keys(s.vr || {}).find(k => s.vr[k] === d) || "").split("|")[1] || s.bt[0] : s.bt[0];
  const baseCRNum = parseFloat(baseCR);
  
  if (!hasCR) {
    estCR = true;
    // Linear interpolation: 90% = 1.0, 99% = 1.10 (10% increase)
    // Cost adjustment = 1 + 0.10 * (targetCR - baseCR) / 9
    const crDiff = crNum - baseCRNum;
    crAdj = 1 + (crDiff / 9) * 0.10; // 10% cost increase per 9% capture rate increase
  }
  
  if (!hasBT) {
    estBT = true;
    // Greenfield ~7% cheaper than Retrofit (no retrofit difficulty factor)
    if (bt === "Greenfield" && baseBT === "Retrofit") btAdj = 0.93;
    else if (bt === "Retrofit" && baseBT === "Greenfield") btAdj = 1.08;
  }
  
  const adj = crAdj * btAdj;
  
  // Power adjustment scales similarly
  const pwAdj = !hasCR ? (1 + (crNum - baseCRNum) / 9 * 0.08) : 1;
  // CO2 captured scales with capture rate
  const rcoAdj = !hasCR ? (crNum / baseCRNum) : 1;
  
  return {
    ...base,
    // Apply adjustments to key cost parameters
    tic: base.tic * adj,
    toc: base.toc * adj,
    fo: base.fo * adj,
    vo: base.vo * adj,
    pw: base.pw * pwAdj,
    // CO2 captured changes with capture rate
    rco: base.rco * rcoAdj,
    // Flags
    estCR,
    estBT,
    isEst: estCR || estBT,
    crNumeric: crNum
  };
}

function fm(n, d) { if (n == null || isNaN(n)) return "—"; return n.toLocaleString("en-US", { minimumFractionDigits: d !== undefined ? d : 2, maximumFractionDigits: d !== undefined ? d : 2 }); }
function fd(n, d) { if (n == null || isNaN(n)) return "—"; return "$" + fm(n, d); }

export default function CCUSModel() {
  const [src, setSrc] = useState("Ammonia");
  const [crCustom, setCrCustom] = useState(99); // Capture rate %
  const [bt, setBt] = useState("Retrofit");
  const [tech, setTech] = useState("amine");
  const [st, setSt] = useState("TX");
  const [yr, setYr] = useState(2025);
  const [mode, setMode] = useState("co2");
  const [co2Cap, setCo2Cap] = useState("");
  const [plCap, setPlCap] = useState("");
  const [pp, setPp] = useState(toMWh("TX"));
  const [ppO, setPpO] = useState(false);
  const [gp, setGp] = useState(BASE_GP);
  const [gpO, setGpO] = useState(false);
  const [cfIn, setCfIn] = useState("");
  const [meth, setMeth] = useState(false);
  const [tab, setTab] = useState("io");
  
  /* Capital Structure - with NETL defaults and override tracking */
  const [debtPct, setDebtPct] = useState(54); // Will sync to NETL
  const [costDebt, setCostDebt] = useState(5.15);
  const [costEquity, setCostEquity] = useState(12);
  const [useFixedHurdle, setUseFixedHurdle] = useState(false);
  const [fixedHurdle, setFixedHurdle] = useState(7.73);
  const [capStructOverride, setCapStructOverride] = useState(false); // Track if user changed values
  const [debtTerm, setDebtTerm] = useState(12); // Debt term in years
  const [idcRate, setIdcRate] = useState(6.5); // Interest during construction %
  
  /* Tax & Depreciation */
  const [fedTax, setFedTax] = useState(21);
  const [stateTax, setStateTax] = useState(0); // Will auto-set from state
  const [stateTaxOverride, setStateTaxOverride] = useState(false);
  const [deprMethod, setDeprMethod] = useState("MACRS 7-yr");
  const [bonusDepr, setBonusDepr] = useState(false);
  const [bonusDeprPct, setBonusDeprPct] = useState(60);
  
  /* Transportation & Storage Costs */
  const [transportCost, setTransportCost] = useState(10); // $/t CO₂
  const [storageCost, setStorageCost] = useState(12); // $/t CO₂
  const [includeTS, setIncludeTS] = useState(false); // Include T&S in LCOC
  
  /* Incentives & Revenue */
  const [use45Q, setUse45Q] = useState(true);
  const [q45Duration, setQ45Duration] = useState(12); // 45Q credit duration
  const [q45Inflation, setQ45Inflation] = useState(2); // 45Q inflation %/yr
  const [use48C, setUse48C] = useState(false);
  const [itcPct, setItcPct] = useState(30); // IRA: 30% base
  const [useCALCFA, setUseCALCFA] = useState(false);
  const [calcfaRate, setCalcfaRate] = useState(50);
  const [grantAmt, setGrantAmt] = useState(0);
  
  /* Voluntary Carbon Markets */
  const [useCDRCredit, setUseCDRCredit] = useState(false); // CDR/removal credits (VCM)
  const [cdrCreditType, setCdrCreditType] = useState("dac"); // CDR credit type
  const [cdrCreditRate, setCdrCreditRate] = useState(400); // $/t - premium CDR credits
  const [useAvoidCredit, setUseAvoidCredit] = useState(false); // Avoidance credits (VCM)
  const [avoidCreditType, setAvoidCreditType] = useState("industrial"); // Avoidance credit type
  const [avoidCreditRate, setAvoidCreditRate] = useState(25); // $/t - industrial avoidance
  const [vcmDuration, setVcmDuration] = useState(10); // VCM contract duration (years)
  
  /* CDR Credit Types with market prices */
  const CDR_TYPES = {
    "dac": { name: "DAC (Direct Air Capture)", price: 400, desc: "Frontier/Microsoft buyers" },
    "daccs": { name: "DACCS (DAC + Storage)", price: 600, desc: "Permanent geological storage" },
    "bioccs": { name: "BioCCS / BECCS", price: 150, desc: "Biomass + CCS" },
    "biochar": { name: "Biochar", price: 120, desc: "Pyrolysis-based removal" },
    "enhanced_weathering": { name: "Enhanced Weathering", price: 80, desc: "Mineral carbonation" },
    "ocean_alk": { name: "Ocean Alkalinity", price: 100, desc: "Marine CDR" },
    "custom": { name: "Custom", price: 200, desc: "User-defined price" }
  };
  
  /* Avoidance Credit Types with market prices */
  const AVOID_TYPES = {
    "industrial": { name: "Industrial CCS", price: 25, desc: "Point-source capture" },
    "methane_coal": { name: "Coal Mine Methane", price: 15, desc: "CMM destruction" },
    "methane_landfill": { name: "Landfill Gas", price: 12, desc: "LFG capture/flare" },
    "methane_oil": { name: "Oil & Gas Methane", price: 18, desc: "Fugitive emissions" },
    "renewable_energy": { name: "Renewable Energy", price: 8, desc: "RE certificates (low)" },
    "forestry": { name: "Forestry / REDD+", price: 10, desc: "Avoided deforestation" },
    "cookstoves": { name: "Clean Cookstoves", price: 5, desc: "Household efficiency" },
    "custom": { name: "Custom", price: 25, desc: "User-defined price" }
  };

  // Auto-set state tax when state changes
  useEffect(() => {
    if (!stateTaxOverride) {
      setStateTax(STATE_TAX[st] || 0);
    }
  }, [st, stateTaxOverride]);
  
  // Auto-set CDR credit price when type changes
  useEffect(() => {
    if (cdrCreditType !== "custom") {
      setCdrCreditRate(CDR_TYPES[cdrCreditType]?.price || 200);
    }
  }, [cdrCreditType]);
  
  // Auto-set avoidance credit price when type changes
  useEffect(() => {
    if (avoidCreditType !== "custom") {
      setAvoidCreditRate(AVOID_TYPES[avoidCreditType]?.price || 25);
    }
  }, [avoidCreditType]);

  // Sync capital structure to NETL defaults when source changes (unless user overrode)
  useEffect(() => {
    if (!capStructOverride) {
      const netl = NETL_FIN[src] || NETL_DEFAULT;
      setDebtPct(netl.debtPct);
      setCostDebt(netl.costDebt);
      // Calculate implied cost of equity from NETL ROE
      setCostEquity(Math.max(8, netl.roe + 8)); // ROE + risk premium, min 8%
    }
  }, [src, capStructOverride]);

  const sd = SC[src];
  const aR = sd ? sd.cr : ["99%"];
  const aB = sd ? sd.bt : ["Retrofit"];
  
  // Capture rate as string for compatibility with existing code
  const cr = `${crCustom}%`;

  /* ── Glossary tooltip definitions ── */
  const G = {
    TIC: "Total Installed Cost \u2014 the sum of all bare erected equipment costs plus engineering, CM, and contingencies. Does not include owner’s costs.",
    TOC: "Total Overnight Cost \u2014 TIC plus owner’s costs (preproduction, inventory capital, financing costs, and other owner expenses). Represents the total capital required if built instantaneously.",
    "CAPEX $/t": "Capital intensity \u2014 total capital cost divided by annual CO\u2082 captured. Shows how much upfront investment is needed per tonne of annual capacity. This is NOT an annualized cost. The annualized capital cost (Capital Charge in the LCOC table) applies the CCF (~5\u20138%) to spread this over the project\u2019s economic life.",
    CAPEX: "Capital Expenditure \u2014 total upfront investment for the capture facility. In this model, CAPEX equals TOC (Total Overnight Cost).",
    CCF: "Capital Charge Factor \u2014 annualized fraction of TOC that must be recovered each year to cover debt service, equity returns, taxes, and depreciation over the project’s economic life (typically 30 years).",
    CEPCI: "Chemical Engineering Plant Cost Index \u2014 a widely used index to escalate historical equipment costs to current-year dollars. Published monthly by Chemical Engineering magazine.",
    LCOC: "Levelized Cost of CO₂ Captured \u2014 the all-in levelized cost per tonne of CO₂ captured, including capital charge, fixed and variable O&M, purchased power, and fuel (if applicable).",
    "Capital Charge": "Annual capital recovery cost per tonne CO₂ \u2014 calculated as (TOC × CCF) / annual CO₂ captured. Covers debt payments, equity returns, taxes, depreciation, and insurance on the capital investment.",
    "Fixed O&M": "Fixed Operating & Maintenance costs \u2014 expenses that do not vary with plant output: operating labor, maintenance labor & materials, administrative support, and property taxes/insurance. Expressed in $/t CO₂.",
    "Variable O&M": "Variable Operating & Maintenance costs \u2014 expenses that scale with throughput: chemicals and consumables (amine solvent make-up, caustic, desiccant), water treatment, and waste disposal. Expressed in $/t CO₂.",
    "Power Cost": "Cost of purchased electricity to run the capture equipment \u2014 compressors, pumps, fans, and auxiliaries. Calculated as (MW demand × $/MWh × capacity factor × 8760 hrs) / annual CO₂ captured.",
    "Natural Gas Fuel": "Fuel cost for natural gas consumed to generate steam for amine solvent regeneration in post-combustion capture. Scales linearly with gas price. High-purity sources (compression-only) have zero fuel cost.",
    "Location Factor": "State-level construction cost multiplier relative to a Gulf Coast (Louisiana) baseline. Accounts for regional differences in labor rates, productivity, material transport, and regulatory costs.",
    "Capacity Factor": "Fraction of the year the capture plant operates (0\u20131.0). At 85%, the plant runs ~7,446 hours/year. Affects annual CO₂ captured and power consumption. For NGCC power plants, equipment is always sized at 100% CF regardless of operating CF.",
    "Six-Tenths Rule": "Empirical cost-scaling law: Cost₂ = Cost\u2081 × (Capacity₂/Capacity\u2081)^0.6. Reflects economies of scale \u2014 doubling capacity increases cost by only ~52%, not 100%.",
    "Scale Adj": "Fixed O&M scale adjustment (exponent n=0.15) \u2014 when capacity changes, fixed costs per tonne decrease modestly due to staffing efficiencies and shared overheads.",
    "Owner’s Costs": "Project costs beyond the installed equipment: pre-production/startup, inventory capital, land, financing fees, and other owner expenses. Typically 15\u201325% of TIC depending on sector.",
    Retrofit: "Capture equipment added to an existing industrial facility. May include a Retrofit Difficulty Factor (RDF) that increases costs 5\u201315% to account for integration complexity.",
    Greenfield: "A new-build facility where the capture system is designed into the plant from the start. Avoids retrofit difficulty premiums but may include boiler/steam costs.",
    "NETL Ref": "Reference case values from NETL’s \u201cCost of Capturing CO₂ from Industrial Sources\u201d (2018 USD, Louisiana Gulf Coast base). All scenarios use post-combustion amine or compression-only technology.",
    "EIA Rate": "U.S. Energy Information Administration (EIA) average industrial electricity price by state, from Table 5.6.a (2024 data). Converted from ¢/kWh to $/MWh.",
    "Emission Source": "The industrial process, power plant, or carbon removal system. Point sources have varying CO₂ concentrations (~4% NGCC to 99%+ ammonia). CDR sources (DAC, DOC) capture CO₂ from ambient air (~420 ppm) or ocean water (~150× atmospheric concentration).",
    "Cost Year": "The dollar-year for all cost outputs. CEPCI index is used to escalate from the 2018 NETL base year to the selected year.",
    "Capture Config": "Capture rate (90% or 99%) and build type (Retrofit or Greenfield). Higher capture rates require larger equipment and more energy, increasing costs.",
    "Capture Tech": "Carbon capture technology type. Amine (MEA) is the baseline. Advanced amines reduce energy use. Membranes suit high-purity sources. Solid sorbents are emerging with lower heat requirements. Cryogenic is energy-intensive but yields high-purity CO₂.",
    "Project CO₂": "Annual tonnes of CO₂ captured at the specified capacity factor. This is the denominator in all $/t CO₂ calculations.",
    "Power Demand": "Electrical power consumed by the capture system (MW). Includes CO₂ compressors, solvent circulation pumps, cooling water pumps, and fans. Scales linearly with CO₂ throughput.",
    "Annual Power Cost": "Total electricity expenditure per year = MW × $/MWh × CF × 8,760 hours. A major operating cost driver, especially for large industrial/power plant capture.",
    "Total OPEX": "Sum of all annual operating costs per tonne CO₂: Fixed O&M + Variable O&M + Power + Fuel. Does not include the capital charge.",
    "Total O&M": "Combined Fixed + Variable O&M costs per tonne CO₂, excluding power and fuel. Represents the non-energy operating cost of running the capture plant.",
    "Debt/Equity": "The financing structure assumed by NETL for each sector. Higher equity fractions increase the CCF because equity investors require higher returns than debt holders.",
    "Debt %": "Percentage of project financing from debt (loans/bonds). Higher debt % typically lowers WACC since debt is cheaper than equity, but increases financial risk.",
    "Cost of Debt": "Interest rate on project debt financing. Typically 5-8% for investment-grade projects. Tax-deductible in most jurisdictions (not modeled here).",
    "Cost of Equity": "Required return for equity investors. Typically 10-15% for infrastructure projects, higher for emerging technologies. Reflects risk premium over debt.",
    "WACC": "Weighted Average Cost of Capital = (Debt% × Cost of Debt) + (Equity% × Cost of Equity). The blended cost of financing used to discount future cash flows and calculate the Capital Charge Factor.",
    "Federal Tax": "U.S. federal corporate income tax rate. Current rate is 21% (post-TCJA 2017). Affects after-tax cost of capital and depreciation tax shield value.",
    "State Tax": "State corporate income tax rate. Varies by state (0-12%). Combined with federal tax for total effective tax rate.",
    "Depreciation": "Method for recovering capital costs over time for tax purposes. MACRS (Modified Accelerated Cost Recovery System) allows faster depreciation than straight-line, improving project economics through earlier tax shields.",
    "45Q": "Federal tax credit for carbon capture under IRC §45Q (IRA 2022). Pays $85/t CO₂ for geologic storage from industrial/power sources, or $180/t for DAC. Credit available for 12 years from placed-in-service date.",
    "48C": "Advanced Energy Project Investment Tax Credit under IRC §48C. Provides 6-30% ITC for qualifying clean energy manufacturing and CCUS projects. Bonus credits available for domestic content and energy communities.",
    "LCFS": "California Low Carbon Fuel Standard. Market-based credit system paying ~$50-200/t CO₂ for qualifying carbon capture projects that reduce transportation fuel lifecycle emissions. Price varies with market.",
    "CDR Credit": "Carbon Dioxide Removal credits in the Voluntary Carbon Market (VCM). Premium credits for permanent CO₂ removal via DAC, BioCCS, enhanced weathering. Current prices: $200-1,000/t depending on permanence, MRV quality, and buyer demand. Major buyers: Microsoft, Stripe, Frontier.",
    "Avoidance Credit": "Emissions avoidance credits in the VCM. Lower-tier credits for preventing CO₂ emissions (industrial capture, methane destruction). Prices typically $10-50/t. Subject to additionality and baseline scrutiny. Market softening as buyers shift to removal credits.",
  };
  const Tip = ({ k, children, style: s }) => {
    const [show, setShow] = useState(false);
    const def = G[k];
    if (!def) return <span style={s}>{children}</span>;
    return (
      <span style={{ position: "relative", ...s }}
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        <span style={{ borderBottom: "1px dotted #94a3b8", cursor: "help" }}>{children}</span>
        {show && (
          <span style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", width: 260, padding: "10px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 0, fontSize: 11, lineHeight: 1.5, color: "#cbd5e1", zIndex: 9999, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", pointerEvents: "none" }}>
            <span style={{ display: "block", fontWeight: 700, color: "#f1f5f9", marginBottom: 3, fontSize: 11.5 }}>{k}</span>
            {def}
            <span style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 8, height: 8, background: "#1e293b", borderRight: "1px solid #334155", borderBottom: "1px solid #334155" }} />
          </span>
        )}
      </span>
    );
  };

  useEffect(() => { if (!ppO) { setPp(toMWh(st)); } }, [st, ppO]);

  const chSrc = useCallback((ns) => {
    setSrc(ns);
    // Reset tech based on new source category
    const newCat = SC[ns] ? SC[ns].cat : "High Purity";
    const currentTech = TECH[tech];
    if (ns === "Ambient Air") {
      setTech("dacsolid");
    } else if (ns === "Ocean Water") {
      setTech("doc");
    } else if (currentTech && !currentTech.compat.includes(newCat)) {
      // Reset to amine if current tech is incompatible
      setTech("amine");
    }
  }, [tech]);

  const res = useMemo(() => {
    const vd = gv(src, crEffective, bt);
    if (!vd) return null;
    const refCO2 = vd.rco;
    const refCF = vd.cf;
    const userCF = parseFloat(cfIn);
    const cf = (userCF > 0 && userCF <= 100) ? userCF / 100 : refCF;
    const cfCustom = (userCF > 0 && userCF <= 100);
    const isNGCC = src === "NGCC F-Frame" || src === "NGCC H-Frame";
    /* For NGCC: equipment sized at 100% CF, but annual output uses actual CF */
    const eqCF = isNGCC ? 1.0 : cf;
    const cfRatio = eqCF / refCF;
    let pCO2 = refCO2 * (cf / refCF), sR = cfRatio, cust = false;
    const uC = parseFloat(co2Cap), uP = parseFloat(plCap);
    if (mode === "co2" && uC > 0) { pCO2 = uC; sR = (pCO2 / (cf / refCF)) / refCO2; if (isNGCC) sR = (pCO2 / (1.0 / refCF)) / refCO2; cust = true; }
    else if (mode === "plant" && uP > 0) { sR = uP / vd.rpc; pCO2 = refCO2 * sR * (cf / refCF); if (isNGCC) { sR = uP / vd.rpc; pCO2 = refCO2 * sR * (cf / refCF); } cust = true; }
    else if (cfCustom) { cust = cfRatio !== 1; }
    /* Technology adjustment factors */
    const tF = TECH[tech] || TECH.amine;
    const cR = (CEPCI[yr] || CEPCI[2026]) / CEPCI[2018];
    const lR = (LF[st] ? LF[st].f : 1) / (LF[vd.bs] ? LF[vd.bs].f : 0.97);
    const cS = (sR !== 1) ? Math.pow(sR, 0.6) : 1;
    const rT = vd.tic * 1e6, rO = vd.toc * 1e6, rOwn = rO - rT;
    const sT = rT * cS * cR * lR * tF.capex, sOwn = rOwn * cS * cR * lR * tF.capex, sTOC = sT + sOwn;
    const fS = (sR !== 1) ? Math.pow(1 / sR, 0.15) : 1;
    const sFO = vd.fo * fS * cR * tF.opex, sVO = vd.vo * cR * tF.opex;
    const sPW = vd.pw * sR * tF.power;
    const aPwr = sPW * pp * cf * 8760, pPt = aPwr / pCO2;
    /* Capital Structure: Calculate WACC and CCF */
    const calcWACC = (debtPct / 100) * (costDebt / 100) + ((100 - debtPct) / 100) * (costEquity / 100);
    const discountRate = useFixedHurdle ? (fixedHurdle / 100) : calcWACC;
    /* CCF approximation: WACC / (1 - (1 + WACC)^-n) for n=30 years, simplified */
    const n = 30;
    const useCCF = discountRate / (1 - Math.pow(1 + discountRate, -n));
    const capC = (sTOC * useCCF) / pCO2;
    const bfl = vd.fl || 0;
    const sFL = bfl * (gp / BASE_GP);
    const cxData = vd.cx || {};
    const cxBreak = Object.entries(cxData)
      .filter(([,f]) => f > 0)
      .map(([k, f]) => ({ key: k, label: CX_LABELS[k] || k, frac: f, val: sT * f, pt: (sT * f) / pCO2 }))
      .sort((a, b) => b.val - a.val);
    return {
      vd, pCO2, sR, cust, cR, lR, cS, fS, rT, rOwn, sT, sOwn, sTOC,
      tpt: sT / pCO2, opt: sOwn / pCO2, tocpt: sTOC / pCO2,
      sFO, sVO, tOM: sFO + sVO, sPW, aPwr, pPt, capC,
      sFL, bfl, hasFuel: bfl > 0, cxBreak, cf, cfCustom, isNGCC, eqCF,
      total: capC + sFO + sVO + pPt + sFL, ccf: useCCF, baseCCF: vd.ccf,
      wacc: calcWACC, discountRate, tech: tF
    };
  }, [src, crCustom, bt, tech, st, yr, mode, co2Cap, plCap, pp, gp, cfIn, debtPct, costDebt, costEquity, useFixedHurdle, fixedHurdle]);

  const pie = res ? [
    { name: "Capital", value: res.capC, color: "#3b82f6" },
    { name: "Fixed O&M", value: res.sFO, color: "#10b981" },
    { name: "Variable O&M", value: res.sVO, color: "#f59e0b" },
    { name: "Power", value: res.pPt, color: "#ef4444" },
    ...(res.sFL > 0 ? [{ name: "Nat Gas Fuel", value: res.sFL, color: "#a855f7" }] : [])
  ] : [];

  const bars = useMemo(() => {
    if (!res) return [];
    return Object.keys(SC).map(k => {
      const dd = gv(k, SC[k].cr[0], SC[k].bt[0]);
      if (!dd) return null;
      const c2 = (CEPCI[yr] || CEPCI[2026]) / CEPCI[2018];
      const l2 = (LF[st] ? LF[st].f : 1) / (LF[dd.bs] ? LF[dd.bs].f : 0.97);
      const cap = (dd.toc * 1e6 * dd.ccf) / dd.rco * c2 * l2;
      const fix = dd.fo * c2;
      const vr2 = dd.vo * c2;
      const pwr = (dd.pw * pp * dd.cf * 8760) / dd.rco;
      const fuel = (dd.fl || 0) * (gp / BASE_GP);
      const nm = k.length > 13 ? k.substring(0, 12) + "…" : k;
      return { name: nm, Capital: +cap.toFixed(2), "Fixed O&M": +fix.toFixed(2), "Variable O&M": +vr2.toFixed(2), Power: +pwr.toFixed(2), "Nat Gas": +fuel.toFixed(2), total: +(cap + fix + vr2 + pwr + fuel).toFixed(2) };
    }).filter(Boolean).sort((a, b) => a.total - b.total);
  }, [yr, st, pp, gp, res]);

  const vd = gv(src, crEffective, bt);
  const eC = EIA[st];
  const eM = toMWh(st);

  /* ── Clean flat styles — no rounded corners, no shadows ── */
  const sec = { background: "#ffffff", border: "1px solid #e2e8f0", marginBottom: 14 };
  const secH = { padding: "12px 18px", fontSize: 12, fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e2e8f0", borderLeft: "3px solid #3b82f6" };
  const row = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderBottom: "1px solid #f1f5f9", minHeight: 42 };
  const rowL = { fontSize: 13.5, color: "#334155", fontWeight: 500 };
  const rowR = { display: "flex", alignItems: "center", gap: 8 };
  const fi = { width: 130, padding: "7px 12px", fontSize: 13.5, fontWeight: 600, color: "#1e293b", background: "#f9fafb", border: "1px solid #e2e8f0", borderRadius: 0, outline: "none", textAlign: "right", boxSizing: "border-box" };
  const fSel = { ...fi, width: "auto", minWidth: 160, textAlign: "left", cursor: "pointer" };
  const unit = { fontSize: 12.5, color: "#94a3b8", fontWeight: 500, minWidth: 50 };
  const sub = { fontSize: 11, color: "#94a3b8", fontWeight: 400, padding: "2px 18px 10px", marginTop: -4 };
  const cd = { background: "#ffffff", padding: "16px 18px", border: "1px solid #e2e8f0" };
  const ch = { margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" };
  const thd = { padding: "0 0 6px", fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" };

  const tabs = [
    { id: "io", label: "Summary" },
    { id: "model", label: "Model" },
    { id: "charts", label: "Charts" },
    { id: "sensitivity", label: "Sensitivity" },
    { id: "assumptions", label: "Assumptions" }
  ];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#1e293b", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #ffffff, #f1f5f9, #ffffff)", borderBottom: "1px solid #e2e8f0", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 0, background: "linear-gradient(135deg, #2563eb, #0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>CO₂</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>CCUS Cost of Capture Model</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>NETL Data {"·"} CEPCI {"·"} Location Factors {"·"} EIA Power Pricing {"·"} Nat Gas Fuel {"·"} Six-Tenths Scaling &nbsp;<span style={{ fontSize: 9.5, color: "#94a3b8", background: "#1e293b", padding: "1px 6px", borderRadius: 0, verticalAlign: "middle" }}>hover <span style={{ borderBottom: "1px dotted #94a3b8" }}>dotted terms</span> for definitions</span></div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 40px" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e2e8f0", marginBottom: 20, paddingTop: 12 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "10px 22px", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: "transparent",
                color: tab === t.id ? "#3b82f6" : "#64748b",
                borderBottom: tab === t.id ? "2px solid #3b82f6" : "2px solid transparent",
                marginBottom: -1, transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ===================== TAB: INPUTS & OUTPUTS ===================== */}
        {tab === "io" && (
          <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start" }}>

            {/* ═══════ LEFT COLUMN: ALL INPUTS ═══════ */}
            <div style={{ position: "sticky", top: 16 }}>
              <div style={sec}>
                <div style={secH}>Capture Configuration</div>
                <div style={row}>
                  <span style={rowL}><Tip k="Emission Source">Emission Source</Tip></span>
                  <select value={src} onChange={(e) => chSrc(e.target.value)} style={{...fSel, minWidth: 140}}>
                    <optgroup label="High Purity">{["Ammonia","Ethylene Oxide","Ethanol","NG Processing","Coal-to-Liquids","Gas-to-Liquids"].map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
                    <optgroup label="Industrial / Hydrogen">{["Refinery H₂","Cement","Steel & Iron","Pulp & Paper"].map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
                    <optgroup label="Power Generation">{["NGCC F-Frame","NGCC H-Frame","Coal SC"].map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
                    <optgroup label="Carbon Removal (CDR)">{["Ambient Air","Ocean Water"].map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
                  </select>
                </div>
                <div style={row}>
                  <span style={rowL}><Tip k="Capture Config">Capture Rate</Tip></span>
                  <div style={{...rowR, gap: 4}}>
                    <input type="number" value={crCustom} onChange={(e) => setCrCustom(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} min="0" max="100" step="1" style={{...fi, width: 55, fontSize: 12, padding: "5px 8px", textAlign: "right"}} />
                    <span style={{fontSize: 11, color: "#64748b"}}>%</span>
                    {!aR.includes(`${crCustom}%`) && <span style={{fontSize: 10, color: "#f59e0b", fontWeight: 600}}>⚠ est</span>}
                  </div>
                </div>
                <div style={row}>
                  <span style={rowL}><Tip k="Retrofit">Build Type</Tip></span>
                  <div style={rowR}>
                    <select value={bt} onChange={(e) => setBt(e.target.value)} style={{...fi, width: 100, textAlign: "left", cursor: "pointer"}}>
                      {["Retrofit", "Greenfield"].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    {!aB.includes(bt) && <span style={{fontSize: 10, color: "#f59e0b", fontWeight: 600}}>⚠ estimate</span>}
                  </div>
                </div>
                <div style={{...row, borderBottom: "none"}}>
                  <span style={rowL}><Tip k="Capture Tech">Technology</Tip></span>
                  <div style={rowR}>
                    <select value={tech} onChange={(e) => setTech(e.target.value)} style={{...fi, width: 130, textAlign: "left", cursor: "pointer"}}>
                      {Object.entries(TECH).map(([k, v]) => {
                        const srcCat = sd ? sd.cat : "High Purity";
                        const isCompat = v.compat.includes(srcCat);
                        return <option key={k} value={k} disabled={!isCompat} style={{ color: isCompat ? "#1e293b" : "#cbd5e1" }}>{v.n}{!isCompat ? " ✗" : ""}</option>;
                      })}
                    </select>
                    {tech !== "amine" && <span style={{fontSize: 10, color: "#06b6d4", fontWeight: 600}}>adj</span>}
                  </div>
                </div>
              </div>

              <div style={sec}>
                <div style={{...secH, borderLeft: "3px solid #06b6d4"}}>Production Parameters</div>
                <div style={row}>
                  <span style={rowL}>Input Mode</span>
                  <div style={{ display: "flex", borderRadius: 0, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                    {["co2", "plant"].map(m => (
                      <button key={m} onClick={() => {
                        if (m === mode) return;
                        const v2 = gv(src, crEffective, bt);
                        if (!v2) { setMode(m); return; }
                        const refCO2 = v2.rco, refCF = v2.cf, rpc = v2.rpc;
                        const userCF = parseFloat(cfIn);
                        const cf = (userCF > 0 && userCF <= 100) ? userCF / 100 : refCF;
                        if (m === "plant" && mode === "co2") {
                          const uC = parseFloat(co2Cap);
                          if (uC > 0) {
                            const sR = (uC / (cf / refCF)) / refCO2;
                            setPlCap(Math.round(sR * rpc).toString());
                          }
                        } else if (m === "co2" && mode === "plant") {
                          const uP = parseFloat(plCap);
                          if (uP > 0) {
                            const sR = uP / rpc;
                            const pCO2 = refCO2 * sR * (cf / refCF);
                            setCo2Cap(Math.round(pCO2).toString());
                          }
                        }
                        setMode(m);
                      }} style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: mode === m ? "#3b82f6" : "#f9fafb", color: mode === m ? "#fff" : "#94a3b8" }}>
                        {m === "co2" ? "CO₂ t/yr" : "Plant Cap"}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={row}>
                  <span style={rowL}>{mode === "co2" ? <Tip k="Project CO₂">Target CO₂</Tip> : "Plant Capacity"}</span>
                  <div style={rowR}>
                    <input type="number" value={mode === "co2" ? co2Cap : plCap} onChange={(e) => mode === "co2" ? setCo2Cap(e.target.value) : setPlCap(e.target.value)} placeholder={mode === "co2" ? fm(vd ? vd.rco : 0, 0) : fm(vd ? vd.rpc : 0, 0)} style={{...fi, width: 110}} />
                    <span style={unit}>{mode === "co2" ? "t/yr" : (vd ? vd.rpu : "")}</span>
                  </div>
                </div>
                <div style={{...row, borderBottom: "none"}}>
                  <span style={rowL}><Tip k="Capacity Factor">Capacity Factor</Tip></span>
                  <div style={rowR}>
                    <input type="number" value={cfIn} onChange={(e) => setCfIn(e.target.value)} placeholder="85" min="1" max="100" step="1" style={{...fi, width: 70}} />
                    <span style={unit}>%</span>
                  </div>
                </div>
                {(src === "NGCC F-Frame" || src === "NGCC H-Frame") && cfIn && (<div style={sub}>Equip sized at 100% CF; operating at {cfIn}%</div>)}
              </div>

              <div style={sec}>
                <div style={{...secH, borderLeft: "3px solid #8b5cf6"}}>Cost Basis</div>
                <div style={row}>
                  <span style={rowL}><Tip k="Location Factor">Project State</Tip></span>
                  <select value={st} onChange={(e) => setSt(e.target.value)} style={{...fSel, minWidth: 130}}>
                    {Object.entries(LF).sort((a, b) => a[1].n.localeCompare(b[1].n)).map(([c, d]) => (<option key={c} value={c}>{d.n} ({c})</option>))}
                  </select>
                </div>
                <div style={{...row, borderBottom: "none"}}>
                  <span style={rowL}><Tip k="Cost Year">Cost Year</Tip></span>
                  <select value={yr} onChange={(e) => setYr(parseInt(e.target.value))} style={{...fi, width: 80, textAlign: "left", cursor: "pointer"}}>
                    {Object.keys(CEPCI).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div style={sec}>
                <div style={{...secH, borderLeft: "3px solid #ef4444"}}>Energy Costs</div>
                <div style={row}>
                  <span style={rowL}><Tip k="Power Cost">Electricity</Tip></span>
                  <div style={rowR}>
                    <input type="number" value={pp} onChange={(e) => { setPp(parseFloat(e.target.value) || 0); setPpO(true); }} style={{...fi, width: 90}} />
                    <span style={unit}>$/MWh</span>
                  </div>
                </div>
                <div style={sub}>{ppO ? <span style={{color:"#f59e0b"}}>Manual — <span onClick={()=>{setPpO(false);setPp(toMWh(st));}} style={{cursor:"pointer",textDecoration:"underline"}}>reset</span></span> : <span>EIA: {eC}¢/kWh ({LF[st] ? LF[st].n : st})</span>}</div>
                <div style={row}>
                  <span style={rowL}><Tip k="Natural Gas Fuel">Nat Gas</Tip></span>
                  <div style={rowR}>
                    <input type="number" value={gp} onChange={(e) => { setGp(parseFloat(e.target.value) || 0); setGpO(true); }} step="0.01" style={{...fi, width: 90}} />
                    <span style={unit}>$/MMBtu</span>
                  </div>
                </div>
                <div style={{...sub, paddingBottom: 12}}>{gpO ? <span style={{color:"#f59e0b"}}>Manual — <span onClick={()=>{setGpO(false);setGp(BASE_GP);}} style={{cursor:"pointer",textDecoration:"underline"}}>reset</span></span> : <span>NETL base: ${BASE_GP}/MMBtu</span>}</div>
              </div>
            </div>


            {/* ═══════ RIGHT SIDE: TWO OUTPUT COLUMNS ═══════ */}
            <div>
              {res ? (<div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  
                  {/* ══ COLUMN 2: COST OUTPUTS ══ */}
                  <div>
                    {/* CAPEX Summary */}
                    <div style={sec}>
                      <div style={{...secH, borderLeft: "3px solid #8b5cf6"}}>CAPEX Summary</div>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead><tr><th style={{...thd,padding:"4px 10px"}}></th><th style={{...thd,textAlign:"right",padding:"4px 10px"}}>$M</th><th style={{...thd,textAlign:"right",padding:"4px 10px",width:32}}>%</th></tr></thead>
                        <tbody>
                          {res.cxBreak.map((c,i)=>(<tr key={i} style={{borderBottom:"1px solid #f1f5f9"}}><td style={{padding:"4px 10px",fontSize:11,color:"#64748b"}}><span style={{display:"inline-block",width:6,height:6,background:CX_COLORS[c.key]||"#475569",marginRight:5,verticalAlign:"middle"}} />{c.label}</td><td style={{padding:"4px 10px",fontSize:11,color:"#1e293b",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fd(c.val/1e6,1)}</td><td style={{padding:"4px 10px",fontSize:10,color:"#94a3b8",textAlign:"right"}}>{(c.frac*100).toFixed(0)}</td></tr>))}
                          <tr style={{borderTop:"2px solid #e2e8f0"}}><td style={{padding:"5px 10px",fontSize:11,color:"#1e293b",fontWeight:700}}>Total Installed Cost</td><td style={{padding:"5px 10px",fontSize:11,color:"#1e293b",textAlign:"right",fontWeight:700}}>{fd(res.sT/1e6,1)}M</td><td style={{padding:"5px 10px",fontSize:10,color:"#94a3b8",textAlign:"right"}}>100</td></tr>
                          <tr style={{borderBottom:"1px solid #f1f5f9"}}><td style={{padding:"4px 10px",fontSize:11,color:"#64748b"}}><Tip k="Owner's Costs">Owner's Costs</Tip></td><td colSpan={2} style={{padding:"4px 10px",fontSize:11,color:"#1e293b",textAlign:"right"}}>{fd(res.sOwn/1e6,1)}M</td></tr>
                          <tr style={{background:"#f8fafc"}}><td style={{padding:"6px 10px",fontSize:11,color:"#0f172a",fontWeight:800}}><Tip k="TOC">Total CAPEX (TOC)</Tip></td><td colSpan={2} style={{padding:"6px 10px",fontSize:11,color:"#0f172a",textAlign:"right",fontWeight:800}}>{fd(res.sTOC/1e6,1)}M</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {/* OPEX Summary */}
                    <div style={sec}>
                      <div style={{...secH, borderLeft:"3px solid #10b981"}}>OPEX Summary</div>
                      <table style={{width:"100%",borderCollapse:"collapse",padding:"0 10px"}}>
                        <thead><tr><th style={{...thd,padding:"4px 10px"}}></th><th style={{...thd,textAlign:"right",padding:"4px 10px"}}>$/t CO₂</th></tr></thead>
                        <tbody>
                          {[["Fixed O&M",fd(res.sFO),"Fixed O&M"],["Variable O&M",fd(res.sVO),"Variable O&M"]].map((r,i)=>(<tr key={i} style={{borderBottom:"1px solid #f1f5f9"}}><td style={{padding:"4px 10px",fontSize:11,color:"#64748b"}}><Tip k={r[2]}>{r[0]}</Tip></td><td style={{padding:"4px 10px",fontSize:11,color:"#1e293b",textAlign:"right",fontWeight:500}}>{r[1]}/t</td></tr>))}
                          <tr style={{borderTop:"2px solid #e2e8f0"}}><td style={{padding:"5px 10px",fontSize:11,color:"#1e293b",fontWeight:700}}><Tip k="Total O&M">Total O&M</Tip></td><td style={{padding:"5px 10px",fontSize:11,color:"#1e293b",textAlign:"right",fontWeight:700}}>{fd(res.tOM)}/t</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Power Cost */}
                    <div style={{...sec, borderLeft:"3px solid #ef4444"}}>
                      <div style={{...secH, borderLeft:"none"}}><Tip k="Power Cost">Power Cost</Tip>
                        <span style={{marginLeft:"auto",float:"right",fontSize:9,fontWeight:500,color:ppO?"#f59e0b":"#64748b",background:ppO?"rgba(245,158,11,0.12)":"rgba(100,116,139,0.08)",padding:"1px 6px"}}>{ppO ? "Manual" : "EIA"}</span>
                      </div>
                      <div style={{padding:"0 10px 10px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                          <span style={{fontSize:10,color:"#64748b"}}>Power Demand</span>
                          <span style={{fontSize:10,color:"#1e293b",fontWeight:600}}>{fm(res.sPW,1)} MW</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                          <span style={{fontSize:10,color:"#64748b"}}>Electricity Rate</span>
                          <span style={{fontSize:10,color:"#1e293b",fontWeight:600}}>${pp}/MWh</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                          <span style={{fontSize:10,color:"#64748b"}}><Tip k="Annual Power Cost">Annual Cost</Tip></span>
                          <span style={{fontSize:10,color:"#1e293b",fontWeight:600}}>{fd(res.aPwr/1e6,1)}M/yr</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0"}}>
                          <span style={{fontSize:10,color:"#ef4444",fontWeight:700}}>Power $/t CO₂</span>
                          <span style={{fontSize:10,color:"#ef4444",fontWeight:700}}>{fd(res.pPt)}/t</span>
                        </div>
                      </div>
                    </div>

                    {/* Nat Gas Fuel if applicable */}
                    {res.hasFuel && (
                      <div style={{...sec, borderLeft:"3px solid #a855f7"}}>
                        <div style={{...secH, borderLeft:"none"}}><Tip k="Natural Gas Fuel">Nat Gas Fuel</Tip>
                          <span style={{marginLeft:"auto",float:"right",fontSize:9,fontWeight:500,color:gpO?"#f59e0b":"#64748b",background:gpO?"rgba(245,158,11,0.12)":"rgba(100,116,139,0.08)",padding:"1px 6px"}}>{gpO?"Manual":"NETL"}</span>
                        </div>
                        <div style={{padding:"0 10px 10px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                            <span style={{fontSize:10,color:"#64748b"}}>Gas Price</span>
                            <span style={{fontSize:10,color:"#1e293b",fontWeight:600}}>${gp}/MMBtu</span>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0"}}>
                            <span style={{fontSize:10,color:"#a855f7",fontWeight:700}}>Fuel $/t CO₂</span>
                            <span style={{fontSize:10,color:"#a855f7",fontWeight:700}}>{fd(res.sFL)}/t</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cost of CO₂ Captured */}
                    <div style={cd}>
                      <h3 style={ch}><Tip k="LCOC">Cost of CO₂ Captured</Tip></h3>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead><tr><th style={{...thd,padding:"4px 0"}}></th><th style={{...thd,textAlign:"right",padding:"4px 6px"}}>$/t</th><th style={{...thd,textAlign:"right",padding:"4px 0"}}>Share</th></tr></thead>
                        <tbody>
                          {[{n:"CAPEX",gk:"Capital Charge",v:res.capC,c:"#3b82f6"},{n:"Fixed O&M",gk:"Fixed O&M",v:res.sFO,c:"#10b981"},{n:"Variable O&M",gk:"Variable O&M",v:res.sVO,c:"#f59e0b"},{n:"Power",gk:"Power Cost",v:res.pPt,c:"#ef4444"},...(res.hasFuel?[{n:"Fuel",gk:"Natural Gas Fuel",v:res.sFL,c:"#a855f7"}]:[])].map((r,i)=>(<tr key={i} style={{borderBottom:"1px solid #f1f5f9"}}><td style={{padding:"4px 0",fontSize:11,color:"#64748b"}}><span style={{display:"inline-block",width:5,height:5,background:r.c,marginRight:5,verticalAlign:"middle"}} /><Tip k={r.gk}>{r.n}</Tip></td><td style={{padding:"4px 6px",fontSize:11,color:"#1e293b",textAlign:"right",fontWeight:500,fontVariantNumeric:"tabular-nums"}}>{fd(r.v)}</td><td style={{padding:"4px 0",fontSize:10,color:"#94a3b8",textAlign:"right"}}>{(r.v/res.total*100).toFixed(0)}%</td></tr>))}
                          <tr style={{borderTop:"2px solid #cbd5e1"}}><td style={{padding:"6px 0",fontSize:11,color:"#3b82f6",fontWeight:700}}><Tip k="LCOC">Total LCOC</Tip></td><td style={{padding:"6px 6px",fontSize:11,color:"#3b82f6",textAlign:"right",fontWeight:700}}>{fd(res.total)}</td><td style={{padding:"6px 0",fontSize:10,color:"#94a3b8",textAlign:"right"}}>100%</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ══ COLUMN 3: FINANCIAL INPUTS & OUTPUTS ══ */}
                  <div>
                    {/* Capital Structure */}
                    <div style={sec}>
                      <div style={{...secH, borderLeft: "3px solid #6366f1", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                        <span>Capital Structure</span>
                        <span style={{fontSize:9,fontWeight:500,color:capStructOverride?"#f59e0b":"#6366f1",background:capStructOverride?"rgba(245,158,11,0.12)":"rgba(99,102,241,0.12)",padding:"1px 6px",cursor:capStructOverride?"pointer":"default"}} onClick={() => capStructOverride && setCapStructOverride(false)}>
                          {capStructOverride ? "Custom ✕" : "NETL Default"}
                        </span>
                      </div>
                      <div style={{padding: "0 10px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                          <span style={{fontSize:10,color:"#64748b"}}><Tip k="Debt %">Debt %</Tip></span>
                          <div style={{display:"flex",alignItems:"center",gap:3}}>
                            <input type="number" value={debtPct} onChange={(e) => { setDebtPct(parseFloat(e.target.value) || 0); setCapStructOverride(true); }} min="0" max="100" step="5" style={{...fi, width: 46, fontSize: 10, padding: "3px 5px"}} />
                            <span style={{fontSize:9,color:"#94a3b8"}}>%</span>
                          </div>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                          <span style={{fontSize:10,color:"#64748b"}}><Tip k="Cost of Debt">Cost of Debt</Tip></span>
                          <div style={{display:"flex",alignItems:"center",gap:3}}>
                            <input type="number" value={costDebt} onChange={(e) => { setCostDebt(parseFloat(e.target.value) || 0); setCapStructOverride(true); }} min="0" max="20" step="0.5" style={{...fi, width: 46, fontSize: 10, padding: "3px 5px"}} />
                            <span style={{fontSize:9,color:"#94a3b8"}}>%</span>
                          </div>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                          <span style={{fontSize:10,color:"#64748b"}}><Tip k="Cost of Equity">Cost of Equity</Tip></span>
                          <div style={{display:"flex",alignItems:"center",gap:3}}>
                            <input type="number" value={costEquity} onChange={(e) => { setCostEquity(parseFloat(e.target.value) || 0); setCapStructOverride(true); }} min="0" max="30" step="0.5" style={{...fi, width: 46, fontSize: 10, padding: "3px 5px"}} />
                            <span style={{fontSize:9,color:"#94a3b8"}}>%</span>
                          </div>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                          <span style={{fontSize:10,color:"#64748b"}}><Tip k="WACC">Calc. WACC</Tip></span>
                          <span style={{fontSize:10,fontWeight:700,color:"#1e293b"}}>{(res.wacc * 100).toFixed(2)}%</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                          <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                            <input type="checkbox" checked={useFixedHurdle} onChange={(e) => setUseFixedHurdle(e.target.checked)} style={{margin:0,width:10,height:10}} />
                            <span style={{fontSize:9,color:"#64748b"}}>Fixed Hurdle</span>
                          </label>
                          <div style={{display:"flex",alignItems:"center",gap:3}}>
                            <input type="number" value={fixedHurdle} onChange={(e) => setFixedHurdle(parseFloat(e.target.value) || 0)} disabled={!useFixedHurdle} min="0" max="20" step="0.25" style={{...fi, width: 46, fontSize: 10, padding: "3px 5px", opacity: useFixedHurdle ? 1 : 0.4}} />
                            <span style={{fontSize:9,color:"#94a3b8"}}>%</span>
                          </div>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",margin:"5px -10px 0",padding:"6px 10px"}}>
                          <span style={{fontSize:10,fontWeight:600,color:"#6366f1"}}>Discount Rate</span>
                          <span style={{fontSize:11,fontWeight:700,color:"#6366f1"}}>{(res.discountRate * 100).toFixed(2)}%</span>
                        </div>
                      </div>
                      
                      {/* Tax & Depreciation */}
                      <div style={{borderTop:"1px solid #e2e8f0",marginTop:8}}>
                        <div style={{...secH, borderLeft: "3px solid #f59e0b", marginTop: 8, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                          <span>Tax & Depreciation</span>
                          <span style={{fontSize:9,fontWeight:500,color:"#f59e0b",background:"rgba(245,158,11,0.1)",padding:"1px 5px"}}>
                            Eff: {(fedTax + stateTax - fedTax * stateTax / 100).toFixed(1)}%
                          </span>
                        </div>
                        <div style={{padding: "0 10px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                            <span style={{fontSize:10,color:"#64748b"}}><Tip k="Federal Tax">Federal Tax</Tip></span>
                            <div style={{display:"flex",alignItems:"center",gap:3}}>
                              <input type="number" value={fedTax} onChange={(e) => setFedTax(parseFloat(e.target.value) || 0)} min="0" max="50" step="1" style={{...fi, width: 46, fontSize: 10, padding: "3px 5px"}} />
                              <span style={{fontSize:9,color:"#94a3b8"}}>%</span>
                            </div>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                            <span style={{fontSize:10,color:stateTaxOverride?"#f59e0b":"#64748b",cursor:"pointer"}} onClick={() => stateTaxOverride && setStateTaxOverride(false)}>
                              <Tip k="State Tax">State Tax</Tip> {stateTaxOverride ? "✕" : `(${st})`}
                            </span>
                            <div style={{display:"flex",alignItems:"center",gap:3}}>
                              <input type="number" value={stateTax} onChange={(e) => { setStateTax(parseFloat(e.target.value) || 0); setStateTaxOverride(true); }} min="0" max="20" step="0.1" style={{...fi, width: 46, fontSize: 10, padding: "3px 5px"}} />
                              <span style={{fontSize:9,color:"#94a3b8"}}>%</span>
                            </div>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                            <span style={{fontSize:10,color:"#64748b"}}><Tip k="Depreciation">Depreciation</Tip></span>
                            <select value={deprMethod} onChange={(e) => setDeprMethod(e.target.value)} style={{...fi, width: 88, fontSize: 9, padding: "3px 4px", cursor: "pointer"}}>
                              <option value="MACRS 5-yr">MACRS 5-yr</option>
                              <option value="MACRS 7-yr">MACRS 7-yr</option>
                              <option value="MACRS 15-yr">MACRS 15-yr</option>
                              <option value="MACRS 20-yr">MACRS 20-yr</option>
                              <option value="Straight-line 20-yr">SL 20-yr</option>
                              <option value="Straight-line 30-yr">SL 30-yr</option>
                            </select>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"}}>
                            <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                              <input type="checkbox" checked={bonusDepr} onChange={(e) => setBonusDepr(e.target.checked)} style={{margin:0,width:10,height:10}} />
                              <span style={{fontSize:9,color:"#64748b"}}>Bonus Depr</span>
                            </label>
                            <div style={{display:"flex",alignItems:"center",gap:3}}>
                              <input type="number" value={bonusDeprPct} onChange={(e) => setBonusDeprPct(parseFloat(e.target.value) || 0)} disabled={!bonusDepr} min="0" max="100" step="20" style={{...fi, width: 38, fontSize: 9, padding: "2px 4px", opacity: bonusDepr ? 1 : 0.4}} />
                              <span style={{fontSize:9,color:"#94a3b8"}}>%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Transportation & Storage */}
                      <div style={{borderTop:"1px solid #e2e8f0",marginTop:8}}>
                        <div style={{...secH, borderLeft: "3px solid #8b5cf6", marginTop: 8, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                          <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                            <input type="checkbox" checked={includeTS} onChange={(e) => setIncludeTS(e.target.checked)} style={{margin:0,width:10,height:10}} />
                            <span>T&S Costs</span>
                          </label>
                          {includeTS && <span style={{fontSize:9,color:"#8b5cf6",fontWeight:600}}>${transportCost + storageCost}/t</span>}
                        </div>
                        {includeTS && (
                          <div style={{padding: "0 10px"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                              <span style={{fontSize:10,color:"#64748b"}}>Transport</span>
                              <div style={{display:"flex",alignItems:"center",gap:3}}>
                                <input type="number" value={transportCost} onChange={(e) => setTransportCost(parseFloat(e.target.value) || 0)} min="0" max="50" step="1" style={{...fi, width: 46, fontSize: 10, padding: "3px 5px"}} />
                                <span style={{fontSize:9,color:"#94a3b8"}}>$/t</span>
                              </div>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"}}>
                              <span style={{fontSize:10,color:"#64748b"}}>Storage</span>
                              <div style={{display:"flex",alignItems:"center",gap:3}}>
                                <input type="number" value={storageCost} onChange={(e) => setStorageCost(parseFloat(e.target.value) || 0)} min="0" max="50" step="1" style={{...fi, width: 46, fontSize: 10, padding: "3px 5px"}} />
                                <span style={{fontSize:9,color:"#94a3b8"}}>$/t</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Incentives */}
                    <div style={sec}>
                      <div style={{...secH, borderLeft: "3px solid #10b981"}}>Incentives</div>
                      <div style={{padding: "0 10px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                          <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                            <input type="checkbox" checked={use45Q} onChange={(e) => setUse45Q(e.target.checked)} style={{margin:0,width:10,height:10}} />
                            <span style={{fontSize:10,color:"#1e293b",fontWeight:500}}><Tip k="45Q">45Q Tax Credit</Tip></span>
                          </label>
                          <span style={{fontSize:10,color:use45Q?"#10b981":"#94a3b8",fontWeight:600}}>
                            {use45Q ? `$${SC[src]?.cat === "CDR" ? 180 : 85}/t` : "—"}
                          </span>
                        </div>
                        {use45Q && (
                          <div style={{background:"#f0fdf4",margin:"0 -10px",padding:"5px 10px",fontSize:9,color:"#166534"}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                              <span>Annual Credit</span>
                              <span style={{fontWeight:600}}>{fd((SC[src]?.cat === "CDR" ? 180 : 85) * res.pCO2 / 1e6, 2)}M/yr</span>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <span>Duration</span>
                              <div style={{display:"flex",alignItems:"center",gap:2}}>
                                <input type="number" value={q45Duration} onChange={(e) => setQ45Duration(parseInt(e.target.value) || 12)} min="1" max="20" style={{width:28,fontSize:9,padding:"1px 3px",border:"1px solid #bbf7d0",borderRadius:2,textAlign:"center"}} />
                                <span>yr @ {q45Inflation}%/yr</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f1f5f9",marginTop:use45Q?4:0}}>
                          <span style={{fontSize:10,color:"#64748b"}}>Grant/Subsidy</span>
                          <div style={{display:"flex",alignItems:"center",gap:3}}>
                            <input type="number" value={grantAmt} onChange={(e) => setGrantAmt(parseFloat(e.target.value) || 0)} min="0" step="1" style={{...fi, width: 46, fontSize: 9, padding: "2px 4px"}} />
                            <span style={{fontSize:9,color:"#94a3b8"}}>$M</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Voluntary Carbon Markets */}
                    <div style={sec}>
                      <div style={{...secH, borderLeft: "3px solid #0d9488"}}>Carbon Markets (VCM)</div>
                      <div style={{padding: "0 10px"}}>
                        {/* CDR Credits */}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f1f5f9"}}>
                          <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                            <input type="checkbox" checked={useCDRCredit} onChange={(e) => setUseCDRCredit(e.target.checked)} style={{margin:0,width:10,height:10}} />
                            <span style={{fontSize:10,color:"#1e293b",fontWeight:500}}><Tip k="CDR Credit">CDR Credits</Tip></span>
                          </label>
                          <span style={{fontSize:9,color:useCDRCredit?"#0d9488":"#94a3b8",fontWeight:600}}>${cdrCreditRate}/t</span>
                        </div>
                        {useCDRCredit && (
                          <div style={{background:"#f0fdfa",margin:"0 -10px",padding:"6px 10px",fontSize:9,color:"#115e59"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                              <span>Type</span>
                              <select value={cdrCreditType} onChange={(e) => setCdrCreditType(e.target.value)} style={{...fi, width: 130, fontSize: 9, padding: "2px 4px", cursor: "pointer"}}>
                                {Object.entries(CDR_TYPES).map(([k, v]) => (
                                  <option key={k} value={k}>{v.name} (${v.price})</option>
                                ))}
                              </select>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                              <span>Price</span>
                              <div style={{display:"flex",alignItems:"center",gap:3}}>
                                <input type="number" value={cdrCreditRate} onChange={(e) => { setCdrCreditRate(parseFloat(e.target.value) || 0); setCdrCreditType("custom"); }} min="0" max="2000" step="25" style={{...fi, width: 50, fontSize: 9, padding: "2px 4px"}} />
                                <span style={{fontSize:8,color:"#5eead4"}}>$/t</span>
                              </div>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #99f6e4",paddingTop:4,marginTop:2}}>
                              <span>Annual Revenue</span>
                              <span style={{fontWeight:600}}>{fd(cdrCreditRate * res.pCO2 / 1e6, 2)}M/yr</span>
                            </div>
                            <div style={{fontSize:8,color:"#5eead4",marginTop:2}}>{CDR_TYPES[cdrCreditType]?.desc}</div>
                          </div>
                        )}
                        
                        {/* Avoidance Credits */}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f1f5f9",marginTop:useCDRCredit?4:0}}>
                          <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                            <input type="checkbox" checked={useAvoidCredit} onChange={(e) => setUseAvoidCredit(e.target.checked)} style={{margin:0,width:10,height:10}} />
                            <span style={{fontSize:10,color:"#1e293b",fontWeight:500}}><Tip k="Avoidance Credit">Avoidance Credits</Tip></span>
                          </label>
                          <span style={{fontSize:9,color:useAvoidCredit?"#d97706":"#94a3b8",fontWeight:600}}>${avoidCreditRate}/t</span>
                        </div>
                        {useAvoidCredit && (
                          <div style={{background:"#fef3c7",margin:"0 -10px",padding:"6px 10px",fontSize:9,color:"#92400e"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                              <span>Type</span>
                              <select value={avoidCreditType} onChange={(e) => setAvoidCreditType(e.target.value)} style={{...fi, width: 130, fontSize: 9, padding: "2px 4px", cursor: "pointer"}}>
                                {Object.entries(AVOID_TYPES).map(([k, v]) => (
                                  <option key={k} value={k}>{v.name} (${v.price})</option>
                                ))}
                              </select>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                              <span>Price</span>
                              <div style={{display:"flex",alignItems:"center",gap:3}}>
                                <input type="number" value={avoidCreditRate} onChange={(e) => { setAvoidCreditRate(parseFloat(e.target.value) || 0); setAvoidCreditType("custom"); }} min="0" max="500" step="5" style={{...fi, width: 50, fontSize: 9, padding: "2px 4px"}} />
                                <span style={{fontSize:8,color:"#d97706"}}>$/t</span>
                              </div>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #fcd34d",paddingTop:4,marginTop:2}}>
                              <span>Annual Revenue</span>
                              <span style={{fontWeight:600}}>{fd(avoidCreditRate * res.pCO2 / 1e6, 2)}M/yr</span>
                            </div>
                            <div style={{fontSize:8,color:"#d97706",marginTop:2}}>{AVOID_TYPES[avoidCreditType]?.desc}</div>
                          </div>
                        )}
                        
                        {/* Contract Duration */}
                        {(useCDRCredit || useAvoidCredit) && (
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",marginTop:4}}>
                            <span style={{fontSize:10,color:"#64748b"}}>Contract Duration</span>
                            <div style={{display:"flex",alignItems:"center",gap:3}}>
                              <input type="number" value={vcmDuration} onChange={(e) => setVcmDuration(parseInt(e.target.value) || 10)} min="1" max="30" step="1" style={{...fi, width: 38, fontSize: 9, padding: "2px 4px"}} />
                              <span style={{fontSize:9,color:"#94a3b8"}}>yrs</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Revenue & Margins */}
                    <div style={sec}>
                      <div style={{...secH, borderLeft: "3px solid #0891b2"}}>Revenue & Margins</div>
                      {(() => {
                        const srcCat = SC[src]?.cat || "Industrial";
                        const isDac = srcCat === "CDR";
                        const q45Rate = isDac ? 180 : 85;
                        
                        const annualCO2 = res.pCO2;
                        const grossRevenue = use45Q ? q45Rate * annualCO2 : 0;
                        const cdrRevenue = useCDRCredit ? cdrCreditRate * annualCO2 : 0;
                        const avoidRevenue = useAvoidCredit ? avoidCreditRate * annualCO2 : 0;
                        const totalRevenue = grossRevenue + cdrRevenue + avoidRevenue;
                        const tsCostTotal = includeTS ? (transportCost + storageCost) * annualCO2 : 0;
                        const annualOPEX = (res.sFO + res.sVO + res.pPt + res.sFL) * annualCO2 + tsCostTotal;
                        const ebitda = totalRevenue - annualOPEX;
                        const lcoc = res.total + (includeTS ? transportCost + storageCost : 0);
                        const revenuePerTonne = annualCO2 > 0 ? totalRevenue / annualCO2 : 0;
                        const margin = revenuePerTonne - lcoc;
                        
                        const projectLife = 30;
                        const capex = res.sTOC;
                        const itcValue = use48C ? capex * (itcPct / 100) : 0;
                        const grantValue = grantAmt * 1e6;
                        const netCapex = capex - itcValue - grantValue;
                        const annualCF = ebitda;
                        
                        const r = res.discountRate;
                        let npv = -netCapex;
                        for (let t = 1; t <= projectLife; t++) npv += annualCF / Math.pow(1 + r, t);
                        
                        let irr = 0.10;
                        for (let iter = 0; iter < 50; iter++) {
                          let npvCalc = -netCapex, dnpv = 0;
                          for (let t = 1; t <= projectLife; t++) {
                            npvCalc += annualCF / Math.pow(1 + irr, t);
                            dnpv -= t * annualCF / Math.pow(1 + irr, t + 1);
                          }
                          if (Math.abs(npvCalc) < 1000) break;
                          irr = irr - npvCalc / dnpv;
                          if (irr < -0.5) irr = -0.5;
                          if (irr > 2) irr = 2;
                        }
                        
                        const rs = {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #f1f5f9"};
                        const ls = {fontSize:10,color:"#64748b"};
                        const vs = {fontSize:10,color:"#1e293b",fontWeight:600};
                        
                        return (
                          <div style={{padding: "0 10px"}}>
                            <div style={rs}>
                              <span style={ls}>Gross Revenue</span>
                              <span style={vs}>{fd(totalRevenue/1e6,2)}M<span style={{fontSize:8,color:"#94a3b8",marginLeft:2}}>/yr</span></span>
                            </div>
                            <div style={rs}>
                              <span style={ls}>Less: Net OPEX</span>
                              <span style={{fontSize:10,color:"#dc2626",fontWeight:600}}>({fd(annualOPEX/1e6,2)}M)<span style={{fontSize:8,color:"#94a3b8",marginLeft:2}}>/yr</span></span>
                            </div>
                            <div style={{...rs,background:"#f0fdfa",margin:"0 -10px",padding:"6px 10px",borderBottom:"none"}}>
                              <span style={{fontSize:10,fontWeight:700,color:"#0891b2"}}>EBITDA</span>
                              <span style={{fontSize:11,fontWeight:700,color:ebitda >= 0 ? "#0891b2" : "#dc2626"}}>{fd(ebitda/1e6,2)}M<span style={{fontSize:8,color:"#94a3b8",marginLeft:2}}>/yr</span></span>
                            </div>
                            
                            <div style={{borderTop:"1px solid #e2e8f0",marginTop:6,paddingTop:4}}>
                              <div style={rs}>
                                <span style={ls}>LCOC</span>
                                <span style={vs}>{fd(lcoc)}/t</span>
                              </div>
                              <div style={{...rs,borderBottom:"none"}}>
                                <span style={ls}>Margin</span>
                                <span style={{fontSize:10,color:margin >= 0 ? "#059669" : "#dc2626",fontWeight:600}}>{fd(margin)}/t</span>
                              </div>
                            </div>
                            
                            <div style={{borderTop:"2px solid #e2e8f0",marginTop:6,paddingTop:4}}>
                              <div style={rs}>
                                <span style={{...ls,fontWeight:600}}>Project IRR</span>
                                <span style={{fontSize:11,fontWeight:700,color:irr >= r ? "#059669" : "#dc2626"}}>{(irr * 100).toFixed(2)}%</span>
                              </div>
                              <div style={{...rs,borderBottom:"none"}}>
                                <span style={{...ls,fontWeight:600}}>NPV</span>
                                <span style={{fontSize:11,fontWeight:700,color:npv >= 0 ? "#059669" : "#dc2626"}}>{fd(npv/1e6,2)}M</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

              </div>) : (<div style={{padding:40,textAlign:"center",color:"#94a3b8"}}>Select inputs to see results</div>)}
            </div>

          </div>

        )}

                {/* ===================== TAB: MODEL ===================== */}
        {tab === "model" && res && (() => {
          const v = res.vd;
          const fc = (title, formula, note, color) => (
            <div style={{ background: "#ffffff", borderRadius: 0, padding: "12px 14px", borderLeft: "3px solid " + color, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>{title}</div>
              <div style={{ fontFamily: "Courier New, monospace", fontSize: 11, color: "#475569", whiteSpace: "pre-wrap", lineHeight: 1.5, background: "#f1f5f9", borderRadius: 0, padding: "8px 10px", marginBottom: 6, border: "1px solid #e2e8f0" }}>{formula}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.4 }}>{note}</div>
            </div>
          );
          const cr2 = (label, value, unit, hl) => (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 11, color: hl ? "#3b82f6" : "#94a3b8", fontWeight: hl ? 700 : 400 }}>{label}</span>
              <span style={{ fontSize: 11, color: hl ? "#3b82f6" : "#1e293b", fontWeight: hl ? 700 : 600, fontVariantNumeric: "tabular-nums" }}>{value}{unit ? " " + unit : ""}</span>
            </div>
          );
          return (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { l: src, val: crEffective + " " + bt, c: "#3b82f6" },
                { l: "CEPCI", val: res.cR.toFixed(3) + "×", c: "#8b5cf6" },
                { l: "Loc", val: st + " " + res.lR.toFixed(3) + "×", c: "#06b6d4" },
                ...(res.cust ? [{ l: "Scale", val: res.sR.toFixed(2) + "×", c: "#f59e0b" }] : []),
              ].map((p, i) => (
                <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#ffffff", border: "1px solid " + p.c + "33", borderRadius: 0, padding: "3px 10px" }}>
                  <div style={{ width: 5, height: 5, borderRadius: 0, background: p.c }} />
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>{p.l}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: p.c }}>{p.val}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Key Formulas</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {fc("Scaled Total Installed Cost ($M)", "= TIC_ref × Scale^0.6 × CEPCI_ratio × Loc_ratio", "TIC_ref = $" + (v ? v.tic : 0) + "M (NETL 2018, " + (v ? v.bs : "LA") + " base). Result: " + fd(res.sT / 1e6, 1) + "M", "#3b82f6")}
              {fc("Total Overnight Cost (TOC)", "= Scaled_TIC + Scaled_Owners_Costs", "TOC = " + fd(res.sT / 1e6, 1) + "M + " + fd(res.sOwn / 1e6, 1) + "M = " + fd(res.sTOC / 1e6, 1) + "M", "#8b5cf6")}
              {fc("CEPCI Escalation Ratio", "= CEPCI[" + yr + "] / CEPCI[2018]\n= " + (CEPCI[yr] || CEPCI[2026]) + " / " + CEPCI[2018], "Escalates 2018 USD to " + yr + " USD. Result: " + res.cR.toFixed(4) + "×", "#8b5cf6")}
              {fc("Location Factor Ratio", "= LF[" + st + "] / LF[" + (v ? v.bs : "LA") + "]\n= " + (LF[st] ? LF[st].f.toFixed(2) : "1.00") + " / " + (v && LF[v.bs] ? LF[v.bs].f.toFixed(2) : "0.97"), "Adjusts from " + (v ? v.bs : "LA") + " base to " + (LF[st] ? LF[st].n : st) + ". Result: " + res.lR.toFixed(4) + "×", "#06b6d4")}
              {fc("Capacity Scaling Factor", "= (Capacity_ratio) ^ 0.6\n= (" + res.sR.toFixed(4) + ") ^ 0.6", "Six-tenths rule. Result: " + res.cS.toFixed(4) + "×" + (!res.cust ? " (ref case, no scaling)" : ""), "#f59e0b")}
              {(() => {
                const refCO2 = v ? v.rco : 0;
                const refCFpct = ((v ? v.cf : 0.85) * 100).toFixed(0);
                const cfPct = (res.cf * 100).toFixed(0);
                let formula, note;
                if (res.cust && mode === "co2") {
                  formula = "= User input (direct)\n= " + fm(res.pCO2, 0) + " t/yr";
                  note = "Directly specified. Ref: " + fm(refCO2, 0) + " t/yr at " + refCFpct + "% CF.";
                } else if (res.cust && mode === "plant") {
                  formula = "= Ref_CO₂ × Scale_ratio × (CF / Ref_CF)\n= " + fm(refCO2, 0) + " × " + res.sR.toFixed(4) + " × (" + cfPct + "% / " + refCFpct + "%)";
                  note = "Scaled from plant capacity input. Result: " + fm(res.pCO2, 0) + " t/yr";
                } else {
                  formula = "= Ref_CO₂ × (CF / Ref_CF)\n= " + fm(refCO2, 0) + " × (" + cfPct + "% / " + refCFpct + "%)";
                  note = "Ref: " + fm(refCO2, 0) + " t/yr at " + refCFpct + "% CF. Result: " + fm(res.pCO2, 0) + " t/yr";
                }
                if (res.isNGCC) note += " NGCC: equip sized at 100% CF, output uses " + cfPct + "% operating CF.";
                return fc("Project CO₂ (t/yr)", formula, note, "#06b6d4");
              })()}
              {fc("Capital Charge ($/t CO2)", "= (TOC × CCF) / CO2_captured\n= (" + fd(res.sTOC / 1e6, 1) + "M × " + (res.ccf * 100).toFixed(2) + "%) / " + fm(res.pCO2, 0), "Result: " + fd(res.capC) + "/t CO2", "#3b82f6")}
              {fc("Power Cost ($/t CO2)", "= (MW × $/MWh × CF × 8760) / CO2\n= (" + fm(res.sPW, 1) + " × $" + pp + " × " + (v ? v.cf : 0.85) + " × 8760) / " + fm(res.pCO2, 0), "Price: $" + pp + "/MWh (" + (ppO ? "manual" : "EIA " + (LF[st] ? LF[st].n : st)) + "). Result: " + fd(res.pPt) + "/t", "#ef4444")}
              {fc("O&M Costs ($/t CO2)", "Fixed_OM  = " + fd(v ? v.fo : 0) + " × scale_adj × CEPCI\nVar_OM    = " + fd(v ? v.vo : 0) + " × CEPCI", "Fixed: " + fd(res.sFO) + "/t, Variable: " + fd(res.sVO) + "/t, Total: " + fd(res.tOM) + "/t", "#10b981")}
              {res.hasFuel ? fc("Natural Gas Fuel ($/t CO2)", "= Fuel_ref × (Gas_price / Gas_ref)\n= $" + res.bfl.toFixed(2) + " × ($" + gp + " / $" + BASE_GP + ")", "Result: " + fd(res.sFL) + "/t CO2. Amine regen steam.", "#a855f7") : fc("Natural Gas Fuel", "= 0 (not applicable)", "High-purity source: no amine regeneration needed.", "#475569")}
              {fc("Levelized Cost of CO₂ Captured (LCOC)", "= Capital + Fixed_OM + Var_OM + Power + Fuel\n= " + fd(res.capC) + " + " + fd(res.sFO) + " + " + fd(res.sVO) + " + " + fd(res.pPt) + (res.hasFuel ? " + " + fd(res.sFL) : ""), "Total: " + fd(res.total) + "/t CO2", "#3b82f6")}
            </div>

            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Intermediate Calculations</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div style={cd}>
                <h3 style={ch}>CAPEX Scaling</h3>
                {cr2("NETL Ref Total Installed Cost", fd(res.rT / 1e6, 1) + "M")}
                {cr2("NETL Ref Owners", fd(res.rOwn / 1e6, 1) + "M")}
                {cr2("NETL Ref TOC", fd((res.rT + res.rOwn) / 1e6, 1) + "M")}
                {cr2("CEPCI Ratio", res.cR.toFixed(4) + "×")}
                {cr2("Location Ratio", res.lR.toFixed(4) + "×")}
                {cr2("Capacity Scale", res.cS.toFixed(4) + "×")}
                {cr2("Scaled Total Installed Cost", fd(res.sT / 1e6, 1) + "M", null, true)}
                {cr2("Scaled Owners", fd(res.sOwn / 1e6, 1) + "M")}
                {cr2("Scaled TOC", fd(res.sTOC / 1e6, 1) + "M", null, true)}
              </div>
              <div style={cd}>
                <h3 style={ch}>Cost Breakdown ($/t CO2)</h3>
                {cr2("Capital Charge", fd(res.capC))}
                {cr2("CCF", (res.ccf * 100).toFixed(2) + "%")}
                {cr2("Fixed O&M", fd(res.sFO))}
                {cr2("Variable O&M", fd(res.sVO))}
                {cr2("Total O&M", fd(res.tOM))}
                {cr2("Power", fd(res.pPt))}
                {res.hasFuel && cr2("Nat Gas Fuel", fd(res.sFL))}
                {cr2("Total LCOC", fd(res.total), null, true)}
              </div>
              <div style={cd}>
                <h3 style={ch}>Power and Operations</h3>
                {cr2("Power Demand", fm(res.sPW, 1) + " MW")}
                {cr2("Power Price", "$" + pp + "/MWh")}
                {cr2("Capacity Factor", (res.cf * 100).toFixed(0) + "%" + (res.cfCustom ? " (custom)" : "") + (res.isNGCC ? " — equip sized at " + (res.eqCF * 100).toFixed(0) + "%" : ""))}
                {cr2("Annual Hours", "8,760 hrs")}
                {cr2("Annual Power Cost", fd(res.aPwr / 1e6, 1) + "M")}
                {cr2("Ref CO₂ Captured", fm(v ? v.rco : 0, 0) + " t/yr")}
                {cr2("Ref Capacity Factor", ((v ? v.cf : 0.85) * 100).toFixed(0) + "%")}
                {cr2("Project CO₂", fm(res.pCO2, 0) + " t/yr", null, true)}
                {res.hasFuel && cr2("Base Fuel Cost", "$" + res.bfl.toFixed(2) + "/t")}
                {res.hasFuel && cr2("Gas Price", "$" + gp + "/MMBtu")}
                {res.hasFuel && cr2("Gas Ref Price", "$" + BASE_GP + "/MMBtu")}
              </div>
            </div>

            {/* Cash Flow Projection */}
            {(() => {
              const srcCat = SC[src]?.cat || "Industrial";
              const isDac = srcCat === "CDR";
              
              // Get NETL financial assumptions for this source
              const netl = NETL_FIN[src] || NETL_DEFAULT;
              
              const constructionYears = netl.constructionYrs;
              const capexDist = netl.capexDist;
              const rampYears = constructionYears === 1 ? 1 : 2; // 1-yr construction = 1-yr ramp, else 2-yr
              const projectLife = netl.projectLife;
              const totalYears = constructionYears + projectLife;
              
              const capex = res.sTOC;
              // Interest During Construction (IDC) - per Enverus model
              const idc = capex * (idcRate / 100) * (constructionYears / 2); // Simplified: avg balance × rate × time
              const totalCapex = capex + idc;
              
              const grantValue = grantAmt * 1e6;
              
              const annualCO2 = res.pCO2;
              // Include T&S costs if enabled
              const tsCost = includeTS ? (transportCost + storageCost) : 0;
              // Calculate base 45Q rate (with inflation escalator)
              const base45Q = use45Q ? (isDac ? 180 : 85) : 0;
              
              // Effective tax rate (combined federal + state, accounting for state deductibility)
              const effTaxRate = (fedTax + stateTax - fedTax * stateTax / 100) / 100;
              
              const r = res.discountRate;
              let cumCF = 0;
              
              const cfRows = [];
              for (let i = 0; i < totalYears; i++) {
                let year, phase, capexCF = 0, revenue = 0, opex = 0, ebitda = 0, taxes = 0, netCF = 0;
                
                if (i < constructionYears) {
                  year = "C" + (i + 1);
                  phase = "Construction";
                  // Use NETL capex distribution (10/60/30 for 3-yr, 100% for 1-yr, etc.)
                  capexCF = -totalCapex * capexDist[i];
                  netCF = capexCF;
                } else {
                  const opYear = i - constructionYears + 1;
                  year = "Y" + opYear;
                  
                  // 45Q with inflation escalator and duration limit
                  let q45Rate = 0;
                  if (use45Q && opYear <= q45Duration) {
                    q45Rate = base45Q * Math.pow(1 + q45Inflation / 100, opYear - 1);
                  }
                  
                  // VCM credits (CDR and Avoidance) with duration limit
                  let cdrRate = 0, avoidRate = 0;
                  if (useCDRCredit && opYear <= vcmDuration) {
                    cdrRate = cdrCreditRate;
                  }
                  if (useAvoidCredit && opYear <= vcmDuration) {
                    avoidRate = avoidCreditRate;
                  }
                  
                  // Total revenue per tonne
                  const totalRevenueRate = q45Rate + cdrRate + avoidRate;
                  const yearRevenue = totalRevenueRate * annualCO2;
                  const yearOPEX = (res.sFO + res.sVO + res.pPt + res.sFL + tsCost) * annualCO2;
                  
                  if (opYear <= rampYears) {
                    phase = "Ramp-Up";
                    // Ramp from 75% to 100% over ramp period
                    const rampFactor = rampYears === 1 ? 0.75 : (0.75 + (opYear - 1) * 0.25);
                    revenue = yearRevenue * rampFactor;
                    opex = yearOPEX * rampFactor;
                    ebitda = revenue - opex;
                    taxes = Math.max(0, ebitda * effTaxRate);
                  } else {
                    phase = "Steady-State";
                    revenue = yearRevenue;
                    opex = yearOPEX;
                    ebitda = revenue - opex;
                    taxes = Math.max(0, ebitda * effTaxRate);
                  }
                  
                  netCF = ebitda - taxes;
                }
                
                cumCF += netCF;
                const discountFactor = Math.pow(1 + r, i + 1);
                const pvCF = netCF / discountFactor;
                
                cfRows.push({ year, phase, capex: capexCF, revenue, opex, ebitda, taxes, netCF, cumCF, pvCF });
              }
              
              const cellStyle = { padding: "4px 8px", fontSize: 10, borderBottom: "1px solid #f1f5f9", textAlign: "right", fontVariantNumeric: "tabular-nums" };
              const negStyle = { ...cellStyle, color: "#dc2626" };
              const posStyle = { ...cellStyle, color: "#059669" };
              const fmtM = (v) => v === 0 ? "-" : (v < 0 ? "(" + fd(Math.abs(v)/1e6, 1) + ")" : fd(v/1e6, 1));
              
              const phaseColors = { "Construction": "#fef3c7", "Ramp-Up": "#dbeafe", "Steady-State": "#f1f5f9" };
              
              // Format capex distribution as string
              const capexDistStr = capexDist.map((d, i) => `Y${i+1}: ${(d*100).toFixed(0)}%`).join(" / ");
              
              // Calculate summary metrics
              const totalPVCF = cfRows.reduce((sum, r) => sum + r.pvCF, 0);
              const npv = totalPVCF;
              const paybackYr = cfRows.find(r => r.cumCF >= 0 && r.phase !== "Construction")?.year || "N/A";
              
              // Total revenue stack for display
              const revenueStack = [];
              if (use45Q) revenueStack.push(`45Q:$${isDac ? 180 : 85}`);
              if (useCDRCredit) revenueStack.push(`CDR:$${cdrCreditRate}`);
              if (useAvoidCredit) revenueStack.push(`Avoid:$${avoidCreditRate}`);
              const totalRevRate = (use45Q ? (isDac ? 180 : 85) : 0) + (useCDRCredit ? cdrCreditRate : 0) + (useAvoidCredit ? avoidCreditRate : 0);
              
              // Get short names for credit types
              const cdrShort = CDR_TYPES[cdrCreditType]?.name?.split(" ")[0] || "CDR";
              const avoidShort = AVOID_TYPES[avoidCreditType]?.name?.split(" ")[0] || "Avoid";
              
              return (
                <div style={{ marginTop: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Cash Flow Projection</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", background: npv >= 0 ? "#dcfce7" : "#fee2e2", color: npv >= 0 ? "#166534" : "#991b1b", fontWeight: 600 }}>
                        NPV: {npv >= 0 ? "" : "("}{fd(Math.abs(npv)/1e6, 1)}M{npv >= 0 ? "" : ")"}
                      </span>
                      <span style={{ fontSize: 10, padding: "2px 8px", background: "#f1f5f9", color: "#475569" }}>
                        Payback: {paybackYr}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    {[
                      { l: "Construction", v: `${constructionYears} yr`, c: "#f59e0b" },
                      { l: "CAPEX", v: capexDistStr, c: "#8b5cf6" },
                      { l: "IDC", v: `${idcRate}%`, c: "#dc2626" },
                      { l: "Life", v: `${projectLife} yr`, c: "#3b82f6" },
                      { l: "Revenue", v: `$${totalRevRate}/t`, c: "#10b981" },
                      { l: "Eff Tax", v: `${(effTaxRate * 100).toFixed(1)}%`, c: "#f59e0b" },
                      ...(includeTS ? [{ l: "T&S", v: `$${tsCost}/t`, c: "#8b5cf6" }] : []),
                      ...(useCDRCredit ? [{ l: cdrShort, v: `$${cdrCreditRate}/t × ${vcmDuration}yr`, c: "#0d9488" }] : []),
                      ...(useAvoidCredit ? [{ l: avoidShort, v: `$${avoidCreditRate}/t × ${vcmDuration}yr`, c: "#d97706" }] : []),
                    ].map((p, i) => (
                      <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#ffffff", border: "1px solid " + p.c + "33", padding: "2px 6px" }}>
                        <div style={{ width: 4, height: 4, background: p.c }} />
                        <span style={{ fontSize: 8, color: "#94a3b8" }}>{p.l}</span>
                        <span style={{ fontSize: 9, fontWeight: 600, color: p.c }}>{p.v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ overflowX: "auto", border: "1px solid #e2e8f0" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th style={{ ...cellStyle, textAlign: "left", fontWeight: 600, color: "#1e293b" }}>Year</th>
                          <th style={{ ...cellStyle, textAlign: "left", fontWeight: 600, color: "#1e293b" }}>Phase</th>
                          <th style={{ ...cellStyle, fontWeight: 600, color: "#1e293b" }}>CAPEX</th>
                          <th style={{ ...cellStyle, fontWeight: 600, color: "#1e293b" }}>Revenue</th>
                          <th style={{ ...cellStyle, fontWeight: 600, color: "#1e293b" }}>OPEX</th>
                          <th style={{ ...cellStyle, fontWeight: 600, color: "#1e293b" }}>EBITDA</th>
                          <th style={{ ...cellStyle, fontWeight: 600, color: "#1e293b" }}>Taxes</th>
                          <th style={{ ...cellStyle, fontWeight: 600, color: "#1e293b" }}>Net CF</th>
                          <th style={{ ...cellStyle, fontWeight: 600, color: "#1e293b" }}>Cumulative</th>
                          <th style={{ ...cellStyle, fontWeight: 600, color: "#1e293b" }}>PV CF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cfRows.map((row, i) => (
                          <tr key={i} style={{ background: phaseColors[row.phase] || "#fff" }}>
                            <td style={{ ...cellStyle, textAlign: "left", fontWeight: 600, color: "#1e293b" }}>{row.year}</td>
                            <td style={{ ...cellStyle, textAlign: "left", color: "#64748b" }}>{row.phase}</td>
                            <td style={row.capex < 0 ? negStyle : cellStyle}>{fmtM(row.capex)}</td>
                            <td style={cellStyle}>{fmtM(row.revenue)}</td>
                            <td style={cellStyle}>{fmtM(row.opex)}</td>
                            <td style={cellStyle}>{fmtM(row.ebitda)}</td>
                            <td style={cellStyle}>{fmtM(row.taxes)}</td>
                            <td style={row.netCF < 0 ? negStyle : posStyle}>{fmtM(row.netCF)}</td>
                            <td style={row.cumCF < 0 ? negStyle : posStyle}>{fmtM(row.cumCF)}</td>
                            <td style={row.pvCF < 0 ? negStyle : { ...cellStyle, color: "#64748b" }}>{fmtM(row.pvCF)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 10, color: "#64748b" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, background: "#fef3c7", border: "1px solid #e2e8f0" }}></span> Construction</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, background: "#dbeafe", border: "1px solid #e2e8f0" }}></span> Ramp-Up</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, background: "#f1f5f9", border: "1px solid #e2e8f0" }}></span> Steady-State</div>
                  </div>
                </div>
              );
            })()}
          </div>);
        })()}

        {/* ===================== TAB: CHARTS ===================== */}
        {tab === "charts" && res && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
              {/* Pie */}
              <div style={cd}>
                <h3 style={ch}>{src} {crEffective} {bt} — LCOC Breakdown</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pie} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} stroke="none">
                      {pie.map((e, i) => (<Cell key={i} fill={e.color} />))}
                    </Pie>
                    <Tooltip formatter={(val) => fd(val)} contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 0, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 4 }}>
                  {pie.map(c => (
                    <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 0, background: c.color, flexShrink: 0 }} />
                      <span style={{ color: "#64748b" }}>{c.name}</span>
                      <span style={{ marginLeft: "auto", fontWeight: 600, color: "#1e293b" }}>{fd(c.value)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, padding: "8px 0", borderTop: "1px solid #1e293b", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>Total LCOC</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>{fd(res.total)}<span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 400 }}>/t CO₂</span></div>
                </div>
              </div>

              {/* CAPEX category pie */}
              <div style={cd}>
                <h3 style={ch}>{src} {crEffective} {bt} — Total Installed Cost by System</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={res.cxBreak.map(c => ({ name: c.label, value: c.frac, color: CX_COLORS[c.key] || "#475569" }))} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} stroke="none">
                      {res.cxBreak.map((c, i) => (<Cell key={i} fill={CX_COLORS[c.key] || "#475569"} />))}
                    </Pie>
                    <Tooltip formatter={(val) => (val * 100).toFixed(0) + "%"} contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 0, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 4 }}>
                  {res.cxBreak.slice(0, 6).map(c => (
                    <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 0, background: CX_COLORS[c.key] || "#475569", flexShrink: 0 }} />
                      <span style={{ color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</span>
                      <span style={{ marginLeft: "auto", fontWeight: 600, color: "#1e293b", flexShrink: 0 }}>{(c.frac * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, padding: "8px 0", borderTop: "1px solid #1e293b", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>Total Installed Cost</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#8b5cf6" }}>{fd(res.sT / 1e6, 1)}<span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 400 }}>M</span></div>
                </div>
              </div>
            </div>

            {/* Bar chart */}
            <div style={{ ...cd, marginBottom: 18 }}>
              <h3 style={ch}>All Sources — LCOC Comparison — {yr} · {LF[st] ? LF[st].n : st} · ${pp}/MWh</h3>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={bars} margin={{ top: 8, right: 12, bottom: 50, left: 12 }}>
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={(val) => "$" + val} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 0, fontSize: 11 }} formatter={(val) => fd(val)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Capital" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Fixed O&M" stackId="a" fill="#10b981" />
                  <Bar dataKey="Variable O&M" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Power" stackId="a" fill="#ef4444" />
                  <Bar dataKey="Nat Gas" stackId="a" fill="#a855f7"  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Cost trend by year */}
            {(() => {
              const v = res.vd;
              const refCO2 = v.rco, refCF = v.cf;
              const cfUse = res.cf;
              const lR = (LF[st] ? LF[st].f : 1) / (LF[v.bs] ? LF[v.bs].f : 0.97);
              const sRat = res.sR;
              const cScale = sRat !== 1 ? Math.pow(sRat, 0.6) : 1;
              const fScale = sRat !== 1 ? Math.pow(1 / sRat, 0.15) : 1;
              const pCO2 = res.pCO2;

              const trendData = Object.keys(CEPCI).sort().map(y => {
                const yNum = parseInt(y);
                const cR = CEPCI[yNum] / CEPCI[2018];
                const sTOC = (v.tic * 1e6 + (v.toc - v.tic) * 1e6) * cScale * cR * lR;
                const cap = (sTOC * v.ccf) / pCO2;
                const fix = v.fo * fScale * cR;
                const vari = v.vo * cR;
                const pwr = (v.pw * sRat * pp * cfUse * 8760) / pCO2;
                const fuel = (v.fl || 0) * (gp / BASE_GP);
                return { year: yNum, Capital: +cap.toFixed(2), "Fixed O&M": +fix.toFixed(2), "Var O&M": +vari.toFixed(2), Power: +pwr.toFixed(2), Fuel: +fuel.toFixed(2), total: +(cap + fix + vari + pwr + fuel).toFixed(2) };
              });

              /* All-source trend across years */
              const srcTrend = Object.keys(CEPCI).sort().map(y => {
                const yNum = parseInt(y);
                const cR = CEPCI[yNum] / CEPCI[2018];
                const row = { year: yNum };
                Object.entries(SC).forEach(([name, s]) => {
                  const d = s.vr ? Object.values(s.vr)[0] : s;
                  const rco = d.rco || s.rco;
                  const lR2 = (LF[st] ? LF[st].f : 1) / (LF[s.bs] ? LF[s.bs].f : 0.97);
                  const cap2 = ((d.toc || s.toc) * 1e6 * (d.ccf || s.ccf)) / rco * cR * lR2;
                  const fix2 = (d.fo || s.fo) * cR;
                  const var2 = (d.vo || s.vo) * cR;
                  const pwr2 = ((d.pw || s.pw) * pp * (s.cf || 0.85) * 8760) / rco;
                  const fl2 = (d.fl || s.fl || 0) * (gp / BASE_GP);
                  row[name] = +(cap2 + fix2 + var2 + pwr2 + fl2).toFixed(2);
                });
                return row;
              });

              const srcColors = { "Ammonia": "#3b82f6", "Ethylene Oxide": "#06b6d4", "Ethanol": "#10b981", "NG Processing": "#22c55e", "Coal-to-Liquids": "#64748b", "Gas-to-Liquids": "#94a3b8", "Refinery H₂": "#f59e0b", "Cement": "#ef4444", "Steel & Iron": "#dc2626", "Pulp & Paper": "#a855f7", "NGCC F-Frame": "#ec4899", "NGCC H-Frame": "#f97316", "Coal SC": "#be185d", "Ambient Air": "#14b8a6", "Ocean Water": "#6366f1" };

              return (<>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                  {/* Selected source stacked area */}
                  <div style={cd}>
                    <h3 style={ch}>{src} — LCOC by Cost Year</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={trendData} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
                        <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v2 => "$" + v2} />
                        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 0, fontSize: 11 }} formatter={(val) => fd(val)} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="Capital" stackId="a" fill="#3b82f6" />
                        <Bar dataKey="Fixed O&M" stackId="a" fill="#10b981" />
                        <Bar dataKey="Var O&M" stackId="a" fill="#f59e0b" />
                        <Bar dataKey="Power" stackId="a" fill="#ef4444" />
                        <Bar dataKey="Fuel" stackId="a" fill="#a855f7" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
                      Costs escalated via CEPCI from 2018 base. Power & fuel held at current prices. {yr} selected → {fd(res.total)}/t.
                    </div>
                  </div>

                  {/* All sources line trend */}
                  <div style={cd}>
                    <h3 style={ch}>All Sources — LCOC Trend by Cost Year</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={srcTrend} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
                        <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v2 => "$" + v2} />
                        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 0, fontSize: 11 }} formatter={(val) => "$" + val + "/t"} />
                        <ReferenceLine x={yr} stroke="#0f172a" strokeDasharray="3 3" strokeWidth={1} />
                        {Object.keys(SC).map(name => (
                          <Line key={name} dataKey={name} stroke={srcColors[name] || "#94a3b8"} strokeWidth={name === src ? 2.5 : 1} dot={false} opacity={name === src ? 1 : 0.5} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 6 }}>
                      {Object.keys(SC).map(name => (
                        <div key={name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, opacity: name === src ? 1 : 0.5 }}>
                          <div style={{ width: 10, height: 2, background: srcColors[name] || "#94a3b8" }} />
                          <span style={{ color: "#64748b" }}>{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Technology comparison chart */}
                {(() => {
                  const v = res.vd;
                  const srcCat = SC[src] ? SC[src].cat : "High Purity";
                  const techData = Object.entries(TECH).map(([k, t]) => {
                    const isCompat = t.compat.includes(srcCat);
                    if (!isCompat) return null;
                    /* Recalculate LCOC with this technology */
                    const sT2 = res.rT * res.cS * res.cR * res.lR * t.capex;
                    const sOwn2 = res.rOwn * res.cS * res.cR * res.lR * t.capex;
                    const sTOC2 = sT2 + sOwn2;
                    const capC2 = (sTOC2 * v.ccf) / res.pCO2;
                    const sFO2 = v.fo * res.fS * res.cR * t.opex;
                    const sVO2 = v.vo * res.cR * t.opex;
                    const sPW2 = v.pw * res.sR * t.power;
                    const pPt2 = (sPW2 * pp * res.cf * 8760) / res.pCO2;
                    const sFL2 = (v.fl || 0) * (gp / BASE_GP);
                    const total2 = capC2 + sFO2 + sVO2 + pPt2 + sFL2;
                    return {
                      name: t.n,
                      key: k,
                      Capital: +capC2.toFixed(2),
                      "Fixed O&M": +sFO2.toFixed(2),
                      "Var O&M": +sVO2.toFixed(2),
                      Power: +pPt2.toFixed(2),
                      Fuel: +sFL2.toFixed(2),
                      total: +total2.toFixed(2),
                      isCurrent: k === tech
                    };
                  }).filter(Boolean).sort((a, b) => a.total - b.total);

                  const techColors = { amine: "#3b82f6", advamine: "#06b6d4", membrane: "#10b981", cryo: "#8b5cf6", solid: "#f59e0b", mof: "#ec4899" };

                  return (
                    <div style={cd}>
                      <h3 style={ch}>{src} — LCOC by Technology Type ({yr} · {LF[st] ? LF[st].n : st})</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={techData} layout="vertical" margin={{ top: 8, right: 30, bottom: 4, left: 100 }}>
                          <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v2 => "$" + v2} />
                          <YAxis type="category" dataKey="name" tick={{ fill: "#1e293b", fontSize: 11 }} width={95} />
                          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 0, fontSize: 11 }} formatter={(val) => fd(val)} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="Capital" stackId="a" fill="#3b82f6" />
                          <Bar dataKey="Fixed O&M" stackId="a" fill="#10b981" />
                          <Bar dataKey="Var O&M" stackId="a" fill="#f59e0b" />
                          <Bar dataKey="Power" stackId="a" fill="#ef4444" />
                          <Bar dataKey="Fuel" stackId="a" fill="#a855f7" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 10, fontSize: 11 }}>
                        {techData.map(t => (
                          <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: t.isCurrent ? "#f0f9ff" : "transparent", border: t.isCurrent ? "1px solid #3b82f6" : "1px solid transparent" }}>
                            <span style={{ color: "#64748b" }}>{t.name}:</span>
                            <span style={{ fontWeight: 700, color: t.isCurrent ? "#3b82f6" : "#1e293b" }}>{fd(t.total)}</span>
                            {t.isCurrent && <span style={{ fontSize: 9, color: "#3b82f6", fontWeight: 600 }}>SELECTED</span>}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 8 }}>
                        Incompatible technologies ({srcCat === "High Purity" ? "Solid Sorbent" : srcCat === "Industrial" || srcCat === "Power" ? "Membrane, Cryogenic" : "varies"}) not shown. Lower LCOC = more cost-effective.
                      </div>
                    </div>
                  );
                })()}

                {/* Technology cost through time */}
                {(() => {
                  const v = res.vd;
                  const srcCat = SC[src] ? SC[src].cat : "High Purity";
                  const compatTechs = Object.entries(TECH).filter(([k, t]) => t.compat.includes(srcCat));
                  const techColors = { amine: "#3b82f6", advamine: "#06b6d4", membrane: "#10b981", cryo: "#8b5cf6", solid: "#f59e0b", mof: "#ec4899" };

                  /* Generate data for each year — includes learning curve cost reductions */
                  const techTrendData = Object.keys(CEPCI).sort().map(y => {
                    const yNum = parseInt(y);
                    const cR = CEPCI[yNum] / CEPCI[2018];
                    const lR = res.lR;
                    const row = { year: yNum };

                    compatTechs.forEach(([k, t]) => {
                      /* Learning curve: costs decrease from baseYr at learn rate per year */
                      /* learnFactor = (1 - learn)^(year - baseYr), but floor at 0.5 (50% min) */
                      const yearsFromBase = Math.max(0, yNum - (t.baseYr || 2018));
                      const learnFactor = Math.max(0.5, Math.pow(1 - (t.learn || 0), yearsFromBase));
                      
                      /* Apply learning to capex and opex (not power — that's physics-limited) */
                      const adjCapex = t.capex * learnFactor;
                      const adjOpex = t.opex * learnFactor;
                      
                      const sT2 = res.rT * res.cS * cR * lR * adjCapex;
                      const sOwn2 = res.rOwn * res.cS * cR * lR * adjCapex;
                      const sTOC2 = sT2 + sOwn2;
                      const capC2 = (sTOC2 * v.ccf) / res.pCO2;
                      const sFO2 = v.fo * res.fS * cR * adjOpex;
                      const sVO2 = v.vo * cR * adjOpex;
                      const sPW2 = v.pw * res.sR * t.power;
                      const pPt2 = (sPW2 * pp * res.cf * 8760) / res.pCO2;
                      const sFL2 = (v.fl || 0) * (gp / BASE_GP);
                      row[t.n] = +(capC2 + sFO2 + sVO2 + pPt2 + sFL2).toFixed(2);
                    });
                    return row;
                  });

                  const currentTechName = TECH[tech] ? TECH[tech].n : "Amine (MEA)";
                  const currentLearn = TECH[tech] ? (TECH[tech].learn * 100).toFixed(0) : "0.5";

                  return (
                    <div style={cd}>
                      <h3 style={ch}>{src} — Technology LCOC Trend with Learning Curves ({LF[st] ? LF[st].n : st})</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={techTrendData} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
                          <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                          <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v2 => "$" + v2} domain={["auto", "auto"]} />
                          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 0, fontSize: 11 }} formatter={(val) => fd(val)} />
                          <ReferenceLine x={yr} stroke="#0f172a" strokeDasharray="3 3" strokeWidth={1} />
                          {compatTechs.map(([k, t]) => (
                            <Line 
                              key={k} 
                              dataKey={t.n} 
                              stroke={techColors[k] || "#94a3b8"} 
                              strokeWidth={k === tech ? 3 : 1.5} 
                              dot={false} 
                              opacity={k === tech ? 1 : 0.6}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 8 }}>
                        {compatTechs.map(([k, t]) => (
                          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, opacity: k === tech ? 1 : 0.7 }}>
                            <div style={{ width: 14, height: k === tech ? 3 : 2, background: techColors[k] || "#94a3b8" }} />
                            <span style={{ color: k === tech ? "#1e293b" : "#64748b", fontWeight: k === tech ? 600 : 400 }}>{t.n}</span>
                            <span style={{ color: "#94a3b8", fontSize: 9 }}>({((t.learn || 0) * 100).toFixed(0)}%/yr)</span>
                            {k === tech && <span style={{ color: "#3b82f6", fontSize: 9 }}>●</span>}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
                        Learning curves reduce CAPEX/OPEX over time (shown as %/yr). CEPCI inflation partially offsets gains. MOF ({(TECH.mof.learn * 100).toFixed(0)}%/yr) and Solid Sorbent ({(TECH.solid.learn * 100).toFixed(0)}%/yr) show steepest declines. Floor at 50% of base cost.
                      </div>
                    </div>
                  );
                })()}

                {/* Pure learning curve chart - no inflation */}
                {(() => {
                  const v = res.vd;
                  const srcCat = SC[src] ? SC[src].cat : "High Purity";
                  const compatTechs = Object.entries(TECH).filter(([k, t]) => t.compat.includes(srcCat));
                  const techColors = { amine: "#3b82f6", advamine: "#06b6d4", membrane: "#10b981", cryo: "#8b5cf6", solid: "#f59e0b", mof: "#ec4899" };

                  /* Generate data for each year — ONLY learning, no CEPCI inflation */
                  const pureLearnData = Object.keys(CEPCI).sort().map(y => {
                    const yNum = parseInt(y);
                    const lR = res.lR;
                    const row = { year: yNum };

                    compatTechs.forEach(([k, t]) => {
                      /* Learning curve only — no CEPCI multiplier */
                      const yearsFromBase = Math.max(0, yNum - (t.baseYr || 2018));
                      const learnFactor = Math.max(0.5, Math.pow(1 - (t.learn || 0), yearsFromBase));
                      
                      const adjCapex = t.capex * learnFactor;
                      const adjOpex = t.opex * learnFactor;
                      
                      /* Use 2018 costs (cR = 1) to isolate learning effect */
                      const sT2 = res.rT * res.cS * 1 * lR * adjCapex;
                      const sOwn2 = res.rOwn * res.cS * 1 * lR * adjCapex;
                      const sTOC2 = sT2 + sOwn2;
                      const capC2 = (sTOC2 * v.ccf) / res.pCO2;
                      const sFO2 = v.fo * res.fS * 1 * adjOpex;
                      const sVO2 = v.vo * 1 * adjOpex;
                      const sPW2 = v.pw * res.sR * t.power;
                      const pPt2 = (sPW2 * pp * res.cf * 8760) / res.pCO2;
                      const sFL2 = (v.fl || 0) * (gp / BASE_GP);
                      row[t.n] = +(capC2 + sFO2 + sVO2 + pPt2 + sFL2).toFixed(2);
                    });
                    return row;
                  });

                  /* Calculate % reduction from 2018 for each tech */
                  const base2018 = pureLearnData.find(d => d.year === 2018);
                  const latest = pureLearnData[pureLearnData.length - 1];

                  return (
                    <div style={cd}>
                      <h3 style={ch}>{src} — Technology Cost Reduction (Learning Only, 2018 USD)</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={pureLearnData} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
                          <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                          <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v2 => "$" + v2} domain={["auto", "auto"]} />
                          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 0, fontSize: 11 }} formatter={(val) => fd(val)} />
                          <ReferenceLine x={yr} stroke="#0f172a" strokeDasharray="3 3" strokeWidth={1} />
                          {compatTechs.map(([k, t]) => (
                            <Line 
                              key={k} 
                              dataKey={t.n} 
                              stroke={techColors[k] || "#94a3b8"} 
                              strokeWidth={k === tech ? 3 : 1.5} 
                              dot={false} 
                              opacity={k === tech ? 1 : 0.6}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 8 }}>
                        {compatTechs.map(([k, t]) => {
                          const b = base2018 ? base2018[t.n] : 0;
                          const l = latest ? latest[t.n] : 0;
                          const pctDrop = b > 0 ? ((b - l) / b * 100).toFixed(0) : 0;
                          return (
                            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, opacity: k === tech ? 1 : 0.7 }}>
                              <div style={{ width: 14, height: k === tech ? 3 : 2, background: techColors[k] || "#94a3b8" }} />
                              <span style={{ color: k === tech ? "#1e293b" : "#64748b", fontWeight: k === tech ? 600 : 400 }}>{t.n}</span>
                              <span style={{ color: "#10b981", fontSize: 9, fontWeight: 600 }}>↓{pctDrop}%</span>
                              {k === tech && <span style={{ color: "#3b82f6", fontSize: 9 }}>●</span>}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
                        All values in constant 2018 USD (no inflation). Shows pure technology learning effect. Legend shows cumulative cost reduction 2018→2026.
                      </div>
                    </div>
                  );
                })()}
              </>);
            })()}
          </div>
        )}

        {/* ===================== TAB: SENSITIVITY ===================== */}
        {tab === "sensitivity" && res && (() => {
          const v = res.vd;
          const baseCF = res.cf;
          const basePP = pp;
          const baseGP = gp;
          const baseTIC = v.tic;
          const baseCCF = v.ccf;
          const baseCOC = res.total;

          /* local styles — sharp, flat, minimal */
          const sBox = { background: "#fff", border: "1px solid #e2e8f0", padding: "18px 20px", marginBottom: 14 };
          const sHdr = { margin: "0 0 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" };

          /* helper: recalc LCOC with one param overridden */
          const calc = (oPP, oGP, oCF, oTICmult, oCCF) => {
            const refCO2 = v.rco, refCF = v.cf;
            const isNGCC = src === "NGCC F-Frame" || src === "NGCC H-Frame";
            const eqCF = isNGCC ? 1.0 : oCF;
            const cfRatio = eqCF / refCF;
            let pCO2 = refCO2 * (oCF / refCF), sRatio = cfRatio;
            const uC = parseFloat(co2Cap), uP = parseFloat(plCap);
            if (mode === "co2" && uC > 0) { pCO2 = uC; sRatio = (pCO2 / (oCF / refCF)) / refCO2; }
            else if (mode === "plant" && uP > 0) { sRatio = uP / v.rpc; pCO2 = refCO2 * sRatio * (oCF / refCF); }
            const cR2 = (CEPCI[yr] || CEPCI[2026]) / CEPCI[2018];
            const lR2 = (LF[st] ? LF[st].f : 1) / (LF[v.bs] ? LF[v.bs].f : 0.97);
            const cS2 = sRatio !== 1 ? Math.pow(sRatio, 0.6) : 1;
            const rT2 = v.tic * 1e6 * oTICmult, rOwn2 = (v.toc - v.tic) * 1e6 * oTICmult;
            const sTOC2 = (rT2 + rOwn2) * cS2 * cR2 * lR2;
            const fS2 = sRatio !== 1 ? Math.pow(1 / sRatio, 0.15) : 1;
            const sFO2 = v.fo * fS2 * cR2, sVO2 = v.vo * cR2;
            const sPW2 = v.pw * sRatio;
            const pPt2 = (sPW2 * oPP * oCF * 8760) / pCO2;
            const capC2 = (sTOC2 * oCCF) / pCO2;
            const sFL2 = (v.fl || 0) * (oGP / BASE_GP);
            return capC2 + sFO2 + sVO2 + pPt2 + sFL2;
          };

          /* ── Tornado: ±20% on each parameter ── */
          const pct = 0.20;
          const tornado = [
            { name: "Electricity Price", low: calc(basePP*(1-pct), baseGP, baseCF, 1, baseCCF), high: calc(basePP*(1+pct), baseGP, baseCF, 1, baseCCF), baseL: "$"+(basePP*(1-pct)).toFixed(0), baseH: "$"+(basePP*(1+pct)).toFixed(0), baseV: "$"+basePP+"/MWh", color: "#ef4444" },
            { name: "CAPEX (Total Installed Cost)", low: calc(basePP, baseGP, baseCF, 1-pct, baseCCF), high: calc(basePP, baseGP, baseCF, 1+pct, baseCCF), baseL: (1-pct).toFixed(2)+"×", baseH: (1+pct).toFixed(2)+"×", baseV: "1.00×", color: "#8b5cf6" },
            { name: "Capacity Factor", low: calc(basePP, baseGP, Math.min(baseCF*(1+pct),0.99), 1, baseCCF), high: calc(basePP, baseGP, baseCF*(1-pct), 1, baseCCF), baseL: Math.min(Math.round(baseCF*(1+pct)*100),99)+"%", baseH: Math.round(baseCF*(1-pct)*100)+"%", baseV: Math.round(baseCF*100)+"%", color: "#06b6d4" },
            { name: "CCF", low: calc(basePP, baseGP, baseCF, 1, baseCCF*(1-pct)), high: calc(basePP, baseGP, baseCF, 1, baseCCF*(1+pct)), baseL: (baseCCF*(1-pct)*100).toFixed(2)+"%", baseH: (baseCCF*(1+pct)*100).toFixed(2)+"%", baseV: (baseCCF*100).toFixed(2)+"%", color: "#f59e0b" },
          ];
          if (res.hasFuel) {
            tornado.push({ name: "Natural Gas Price", low: calc(basePP, baseGP*(1-pct), baseCF, 1, baseCCF), high: calc(basePP, baseGP*(1+pct), baseCF, 1, baseCCF), baseL: "$"+(baseGP*(1-pct)).toFixed(2), baseH: "$"+(baseGP*(1+pct)).toFixed(2), baseV: "$"+baseGP+"/MMBtu", color: "#a855f7" });
          }
          tornado.forEach(t => { t.spread = t.high - t.low; t.delta = Math.max(Math.abs(t.high - baseCOC), Math.abs(baseCOC - t.low)); });
          tornado.sort((a, b) => b.spread - a.spread);

          /* ── Sweep data ── */
          const steps = 20;
          const mkSweep = (fn) => { const a = []; for (let i = 0; i <= steps; i++) a.push(fn(i / steps)); return a; };
          const sweepElec = mkSweep(p => ({ x: Math.round((basePP * 0.4 + basePP * 1.2 * p) * 10) / 10, coc: Math.round(calc(basePP * 0.4 + basePP * 1.2 * p, baseGP, baseCF, 1, baseCCF) * 100) / 100 }));
          const sweepCF = mkSweep(p => { const v2 = 0.50 + 0.49 * p; return { x: Math.round(v2 * 100), coc: Math.round(calc(basePP, baseGP, v2, 1, baseCCF) * 100) / 100 }; });
          const sweepCAPEX = mkSweep(p => { const m = 0.5 + 1.0 * p; return { x: Math.round(m * 100) / 100, coc: Math.round(calc(basePP, baseGP, baseCF, m, baseCCF) * 100) / 100 }; });
          const sweepGas = res.hasFuel ? mkSweep(p => { const v2 = baseGP * 0.3 + baseGP * 1.4 * p; return { x: Math.round(v2 * 100) / 100, coc: Math.round(calc(basePP, v2, baseCF, 1, baseCCF) * 100) / 100 }; }) : null;

          const allLow = Math.min(...tornado.map(t => t.low));
          const allHigh = Math.max(...tornado.map(t => t.high));
          const pad = (allHigh - allLow) * 0.15;
          const minCOC = allLow - pad;
          const maxCOC = allHigh + pad;
          const range = maxCOC - minCOC;

          const swpLine = { type: "monotone", strokeWidth: 2, dot: false, activeDot: { r: 3, strokeWidth: 0 } };
          const swpTT = { contentStyle: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 0, fontSize: 11, boxShadow: "none" }, formatter: (val) => "$" + val.toFixed(2) + "/t" };
          const swpAxis = { tick: { fill: "#94a3b8", fontSize: 9.5 } };

          return (
          <div>
            {/* Header bar */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "14px 20px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sensitivity Analysis</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{src} — {crEffective} {bt}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>Base LCOC</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#3b82f6" }}>{fd(baseCOC)}<span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>/t CO₂</span></div>
              </div>
            </div>

            {/* Tornado */}
            <div style={sBox}>
              <h3 style={sHdr}>Tornado — ±20% Parameter Variation</h3>
              {tornado.map((t, i) => {
                const leftPct = ((t.low - minCOC) / range) * 100;
                const basePctPos = ((baseCOC - minCOC) / range) * 100;
                const widthPct = ((t.high - t.low) / range) * 100;
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 1fr 60px", alignItems: "center", marginBottom: 10, gap: 10 }}>
                    <div style={{ fontSize: 12, color: "#334155", fontWeight: 600, textAlign: "right" }}>{t.name}</div>
                    <div style={{ position: "relative", height: 24, background: "#f8fafc" }}>
                      <div style={{ position: "absolute", left: basePctPos + "%", top: 0, bottom: 0, width: 1, background: "#0f172a", zIndex: 3 }} />
                      <div style={{ position: "absolute", left: leftPct + "%", width: widthPct + "%", top: 3, bottom: 3, background: t.color, opacity: 0.7 }} />
                      <div style={{ position: "absolute", left: leftPct + "%", top: "50%", transform: "translate(-100%, -50%)", fontSize: 9, color: "#475569", fontWeight: 600, paddingRight: 4, whiteSpace: "nowrap" }}>{fd(t.low)}</div>
                      <div style={{ position: "absolute", left: (leftPct + widthPct) + "%", top: "50%", transform: "translateY(-50%)", fontSize: 9, color: "#475569", fontWeight: 600, paddingLeft: 4, whiteSpace: "nowrap" }}>{fd(t.high)}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#0f172a", fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>±{fd(t.spread / 2)}</div>
                  </div>
                );
              })}
              <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 60px", marginTop: 4, gap: 10 }}>
                <div />
                <div style={{ fontSize: 9, color: "#94a3b8", display: "flex", justifyContent: "space-between", padding: "0 1px" }}>
                  <span>{fd(minCOC)}</span>
                  <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 10 }}>Base {fd(baseCOC)}</span>
                  <span>{fd(maxCOC)}</span>
                </div>
                <div />
              </div>
            </div>

            {/* Sweep charts — 2×2 grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              {[
                { title: "Electricity Price", data: sweepElec, color: "#ef4444", xLabel: "$/MWh", refX: Math.round(basePP * 10) / 10, labelFmt: v => "$" + v + "/MWh" },
                { title: "Capacity Factor", data: sweepCF, color: "#06b6d4", xLabel: "CF %", refX: Math.round(baseCF * 100), labelFmt: v => v + "%" },
                { title: "CAPEX Multiplier", data: sweepCAPEX, color: "#8b5cf6", xLabel: "TIC Mult", refX: 1, labelFmt: v => v + "×" },
                ...(res.hasFuel && sweepGas ? [{ title: "Natural Gas Price", data: sweepGas, color: "#a855f7", xLabel: "$/MMBtu", refX: Math.round(baseGP * 100) / 100, labelFmt: v => "$" + v }] : [])
              ].map((sw, idx) => (
                <div key={idx} style={sBox}>
                  <h3 style={sHdr}>{sw.title}</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={sw.data} margin={{ top: 4, right: 12, bottom: 14, left: 8 }}>
                      <XAxis dataKey="x" {...swpAxis} label={{ value: sw.xLabel, position: "bottom", offset: 0, style: { fontSize: 9, fill: "#94a3b8" } }} />
                      <YAxis {...swpAxis} tickFormatter={v => "$" + v} domain={["auto", "auto"]} width={45} />
                      <Tooltip {...swpTT} labelFormatter={sw.labelFmt} />
                      <ReferenceLine x={sw.refX} stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth={1} />
                      <ReferenceLine y={Math.round(baseCOC * 100) / 100} stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth={1} />
                      <Line dataKey="coc" stroke={sw.color} {...swpLine} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>

            {/* Impact table */}
            <div style={sBox}>
              <h3 style={sHdr}>Parameter Impact Summary</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "left" }}>Parameter</th>
                    <th style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "center" }}>Base</th>
                    <th style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", textAlign: "right" }}>−20%</th>
                    <th style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>LCOC Low</th>
                    <th style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", textAlign: "right" }}>+20%</th>
                    <th style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>LCOC High</th>
                    <th style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", textAlign: "right" }}>Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {tornado.map((t, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, color: "#334155" }}>
                        <span style={{ display: "inline-block", width: 8, height: 8, background: t.color, marginRight: 8, verticalAlign: "middle" }} />{t.name}
                      </td>
                      <td style={{ padding: "8px 10px", fontSize: 11, color: "#64748b", textAlign: "center" }}>{t.baseV}</td>
                      <td style={{ padding: "8px 10px", fontSize: 11, color: "#3b82f6", textAlign: "right", fontWeight: 500 }}>{t.baseL}</td>
                      <td style={{ padding: "8px 10px", fontSize: 12, color: "#1e293b", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fd(t.low)}/t</td>
                      <td style={{ padding: "8px 10px", fontSize: 11, color: "#ef4444", textAlign: "right", fontWeight: 500 }}>{t.baseH}</td>
                      <td style={{ padding: "8px 10px", fontSize: 12, color: "#1e293b", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fd(t.high)}/t</td>
                      <td style={{ padding: "8px 10px", fontSize: 12, color: "#0f172a", textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fd(t.spread)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>);
        })()}

        {/* ===================== TAB: ASSUMPTIONS ===================== */}
        {tab === "assumptions" && (() => {
          const aBox = { background: "#fff", border: "1px solid #e2e8f0", padding: "18px 20px", marginBottom: 14 };
          const aHdr = { margin: "0 0 14px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" };
          const aTh = { padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "left", borderBottom: "2px solid #e2e8f0" };
          const aTd = { padding: "6px 10px", fontSize: 11.5, color: "#1e293b", borderBottom: "1px solid #f1f5f9" };
          const aTdR = { ...aTd, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 };
          const aTdG = { ...aTd, color: "#64748b", fontSize: 11 };
          const noteStyle = { fontSize: 11, color: "#94a3b8", lineHeight: 1.6, marginTop: 10 };

          return (
          <div>
            {/* Methodology */}
            <div style={aBox}>
              <h3 style={aHdr}>Methodology & Data Sources</h3>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px 16px", fontSize: 12, color: "#334155", lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, color: "#64748b" }}>Basis</div>
                <div>NETL Carbon Capture Retrofit Database — 13 industrial and power sector point-source scenarios with bottom-up engineering cost estimates</div>
                <div style={{ fontWeight: 700, color: "#64748b" }}>Cost Year</div>
                <div>All NETL reference costs are in 2018 US dollars, escalated to the user-selected cost year via CEPCI</div>
                <div style={{ fontWeight: 700, color: "#64748b" }}>Capture Tech</div>
                <div>Baseline is amine-based post-combustion capture (MEA) with compression to pipeline-ready supercritical CO₂. Alternative technologies (Advanced Amine, Membrane, Cryogenic, Solid Sorbent) apply adjustment factors to CAPEX, OPEX, and power consumption.</div>
                <div style={{ fontWeight: 700, color: "#64748b" }}>System Bound.</div>
                <div>Capture plant battery limits — excludes CO₂ transport, storage, monitoring, and any host-plant modifications outside the capture island</div>
                <div style={{ fontWeight: 700, color: "#64748b" }}>LCOC Metric</div>
                <div>First-year levelized cost of CO₂ captured ($/t CO₂) — annualized CAPEX via capital charge factor + annual OPEX + energy, divided by annual CO₂ captured</div>
                <div style={{ fontWeight: 700, color: "#64748b" }}>Scaling</div>
                <div>Six-tenths power law (exponent 0.6) applied to CAPEX when plant capacity differs from NETL reference size. OPEX fixed costs scaled with exponent −0.15 for economies of scale</div>
              </div>
            </div>

            {/* Key Assumptions */}
            <div style={aBox}>
              <h3 style={aHdr}>Key Assumptions & Defaults</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={aTh}>Parameter</th>
                  <th style={{ ...aTh, textAlign: "right" }}>Default</th>
                  <th style={aTh}>Description</th>
                </tr></thead>
                <tbody>
                  {[
                    ["Capacity Factor", "85%", "Fraction of calendar hours the plant operates annually (8,760 hrs × CF). Applies to CO₂ output and power consumption."],
                    ["Cost Year Basis", "2018 USD", "NETL reference cost vintage. All CAPEX/OPEX escalated from 2018 via CEPCI ratio."],
                    ["CEPCI Base", "603.1 (2018)", "Chemical Engineering Plant Cost Index for the reference year. Target year index divided by 603.1 gives the inflation multiplier."],
                    ["Location Base", "Louisiana (0.97)", "NETL reference plant location. User location factor divided by 0.97 gives the regional adjustment."],
                    ["Capital Charge Factor", "Varies by source", "Annualization factor that converts total overnight cost to an annual capital charge. Includes cost of capital, depreciation, taxes, and insurance. Ranges from 4.55% (Refinery H₂) to 7.73% (NGCC)."],
                    ["Nat Gas Base Price", "$" + BASE_GP + "/MMBtu", "NETL reference natural gas price (2018 basis). Fuel cost $/t CO₂ scales linearly with the ratio of user gas price to this base."],
                    ["Electricity Pricing", "EIA state-average", "Industrial electricity rates from EIA (¢/kWh), converted to $/MWh. User may override with a manual price."],
                    ["Technology Type", "Amine (MEA)", "Baseline capture technology. Alternative technologies apply multipliers: Advanced Amine (lower energy), Membrane (high-purity only), Cryogenic (very high purity), Solid Sorbent (dilute streams)."],
                    ["NGCC Equipment Sizing", "100% CF", "For NGCC gas turbine scenarios, capture equipment is sized at full load (100% CF) to handle peak flue gas. Annual CO₂ output still uses the operating CF."],
                    ["Scaling Exponent (CAPEX)", "0.60", "Economies of scale exponent for total installed cost. CAPEX_scaled = CAPEX_ref × (capacity_ratio)^0.6"],
                    ["Scaling Exponent (Fixed O&M)", "−0.15", "Fixed O&M economy of scale. Per-ton fixed costs decrease as 1/ratio^0.15 for larger plants."],
                    ["Owner's Costs", "TOC − TIC", "Includes preproduction, inventory capital, financing, and other owner costs. Scaled proportionally with TIC."],
                    ["CO₂ Purity", "99% or 90%", "CO₂ product purity. Higher purity increases capital and energy costs. Available options depend on the source type."],
                  ].map((r, i) => (
                    <tr key={i}><td style={aTd}>{r[0]}</td><td style={aTdR}>{r[1]}</td><td style={aTdG}>{r[2]}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CEPCI Index */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div style={aBox}>
                <h3 style={aHdr}>CEPCI Index Values</h3>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={aTh}>Year</th><th style={{ ...aTh, textAlign: "right" }}>Index</th><th style={{ ...aTh, textAlign: "right" }}>vs 2018</th></tr></thead>
                  <tbody>
                    {Object.entries(CEPCI).map(([y, v]) => (
                      <tr key={y}><td style={aTd}>{y}</td><td style={aTdR}>{v.toFixed(0)}</td><td style={aTdR}>{(v / CEPCI[2018]).toFixed(3)}×</td></tr>
                    ))}
                  </tbody>
                </table>
                <div style={noteStyle}>Source: Chemical Engineering Magazine. 2025–2026 values are estimates.</div>
              </div>

              {/* Capital Charge Factors by source */}
              <div style={aBox}>
                <h3 style={aHdr}>Capital Charge Factors by Source</h3>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={aTh}>Source</th><th style={{ ...aTh, textAlign: "right" }}>CCF</th><th style={aTh}>Category</th></tr></thead>
                  <tbody>
                    {Object.entries(SC).map(([name, s]) => {
                      const d = s.vr ? Object.values(s.vr)[0] : s;
                      return (<tr key={name}><td style={aTd}>{name}</td><td style={aTdR}>{(d.ccf * 100).toFixed(2)}%</td><td style={aTdG}>{s.cat}</td></tr>);
                    })}
                  </tbody>
                </table>
                <div style={noteStyle}>CCF includes cost of equity, debt, depreciation, taxes, and insurance per NETL methodology.</div>
              </div>
            </div>

            {/* Technology Types */}
            <div style={aBox}>
              <h3 style={aHdr}>Capture Technology Types & Adjustment Factors</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={aTh}>Technology</th>
                  <th style={{ ...aTh, textAlign: "right" }}>CAPEX</th>
                  <th style={{ ...aTh, textAlign: "right" }}>OPEX</th>
                  <th style={{ ...aTh, textAlign: "right" }}>Power</th>
                  <th style={{ ...aTh, textAlign: "right" }}>Learn Rate</th>
                  <th style={aTh}>Compatible Sources</th>
                  <th style={aTh}>Description</th>
                </tr></thead>
                <tbody>
                  {Object.entries(TECH).map(([k, t]) => (
                    <tr key={k}>
                      <td style={{ ...aTd, fontWeight: 600 }}>{t.n}</td>
                      <td style={aTdR}>{t.capex.toFixed(2)}×</td>
                      <td style={aTdR}>{t.opex.toFixed(2)}×</td>
                      <td style={aTdR}>{t.power.toFixed(2)}×</td>
                      <td style={{ ...aTdR, color: t.learn >= 0.04 ? "#10b981" : t.learn >= 0.02 ? "#f59e0b" : "#64748b" }}>{((t.learn || 0) * 100).toFixed(0)}%/yr</td>
                      <td style={{ ...aTd, fontSize: 10 }}>{t.compat.join(", ")}</td>
                      <td style={aTdG}>{t.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={noteStyle}>Factors are multipliers relative to baseline Amine (MEA). <strong>Learn Rate</strong> = annual cost reduction from technology maturation (applied to CAPEX/OPEX, floored at 50%). Green = fast learning (&gt;4%/yr), amber = moderate (2-4%), gray = mature (&lt;2%). Power is physics-limited and does not benefit from learning curves.</div>
            </div>

            {/* Scenario Reference Data */}
            <div style={aBox}>
              <h3 style={aHdr}>NETL Reference Scenario Data (2018 USD)</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                  <thead><tr>
                    {["Source","Category","Ref Size","CO₂ (t/yr)","Total Installed Cost ($M)","TOC ($M)","Fixed O&M ($/t)","Var O&M ($/t)","Power (MW)","Fuel ($/t)","Base State"].map(h => (
                      <th key={h} style={{ ...aTh, whiteSpace: "nowrap", padding: "6px 8px" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {Object.entries(SC).map(([name, s]) => {
                      const d = s.vr ? Object.values(s.vr)[0] : s;
                      return (
                        <tr key={name} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ ...aTd, fontWeight: 600, padding: "6px 8px" }}>{name}</td>
                          <td style={{ ...aTdG, padding: "6px 8px" }}>{s.cat}</td>
                          <td style={{ ...aTd, padding: "6px 8px", fontSize: 11 }}>{s.rps}</td>
                          <td style={{ ...aTdR, padding: "6px 8px" }}>{fm(d.rco || s.rco, 0)}</td>
                          <td style={{ ...aTdR, padding: "6px 8px" }}>{(d.tic || s.tic).toFixed(0)}</td>
                          <td style={{ ...aTdR, padding: "6px 8px" }}>{(d.toc || s.toc).toFixed(0)}</td>
                          <td style={{ ...aTdR, padding: "6px 8px" }}>{(d.fo || s.fo).toFixed(2)}</td>
                          <td style={{ ...aTdR, padding: "6px 8px" }}>{(d.vo || s.vo).toFixed(2)}</td>
                          <td style={{ ...aTdR, padding: "6px 8px" }}>{(d.pw || s.pw).toFixed(0)}</td>
                          <td style={{ ...aTdR, padding: "6px 8px" }}>{(d.fl || s.fl || 0).toFixed(2)}</td>
                          <td style={{ ...aTdG, padding: "6px 8px" }}>{LF[s.bs] ? LF[s.bs].n : s.bs}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={noteStyle}>All costs in 2018 USD. TIC = Total Installed Cost. TOC = Total Overnight Cost (TIC + Owner's Costs). O&M figures are per tonne CO₂ captured. Power is parasitic load in MW at reference capacity.</div>
            </div>

            {/* Location Factors */}
            <div style={aBox}>
              <h3 style={aHdr}>State Location Factors</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0" }}>
                {Object.entries(LF).sort((a,b) => a[1].n.localeCompare(b[1].n)).map(([code, s]) => (
                  <div key={code} style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid #f8fafc", fontSize: 11 }}>
                    <span style={{ color: "#64748b" }}>{s.n}</span>
                    <span style={{ fontWeight: 600, color: s.f > 1.15 ? "#ef4444" : s.f < 0.97 ? "#10b981" : "#1e293b", fontVariantNumeric: "tabular-nums" }}>{s.f.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div style={noteStyle}>Factors relative to national average (1.00). Red = high cost, green = below average. Source: NETL regional construction cost indices.</div>
            </div>

            {/* EIA Electricity Rates */}
            <div style={aBox}>
              <h3 style={aHdr}>EIA Industrial Electricity Rates (¢/kWh → $/MWh)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0" }}>
                {Object.entries(EIA).sort((a,b) => (LF[a[0]]?.n||a[0]).localeCompare(LF[b[0]]?.n||b[0])).map(([code, rate]) => (
                  <div key={code} style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid #f8fafc", fontSize: 11 }}>
                    <span style={{ color: "#64748b" }}>{LF[code] ? LF[code].n : code}</span>
                    <span style={{ fontWeight: 600, color: "#1e293b", fontVariantNumeric: "tabular-nums" }}>${(rate * 10).toFixed(0)}/MWh</span>
                  </div>
                ))}
              </div>
              <div style={noteStyle}>Source: EIA Electric Power Monthly, average industrial rate. Converted from ¢/kWh to $/MWh (×10).</div>
            </div>

            {/* Formulas */}
            <div style={aBox}>
              <h3 style={aHdr}>Key Formulas</h3>
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  { name: "CEPCI Ratio", formula: "CEPCI_target_year / CEPCI_2018", note: "Escalates all capital and fixed O&M costs from 2018 base" },
                  { name: "Location Ratio", formula: "LF_user_state / LF_base_state", note: "Adjusts capital costs for regional construction cost differences" },
                  { name: "Capacity Scale Factor", formula: "(Capacity_ratio) ^ 0.6", note: "Six-tenths rule for CAPEX. Capacity_ratio = user_size / ref_size" },
                  { name: "Scaled Total Installed Cost", formula: "TIC_ref × Scale_factor × CEPCI_ratio × Location_ratio", note: "Total installed cost adjusted for size, inflation, and location" },
                  { name: "Scaled TOC", formula: "(TIC_ref + Owner's_Costs_ref) × Scale × CEPCI × Location", note: "Total overnight cost including owner's costs" },
                  { name: "Capital Charge ($/t)", formula: "TOC_scaled × CCF / Annual_CO₂", note: "Annualized capital cost per tonne captured" },
                  { name: "Fixed O&M ($/t)", formula: "FOM_ref × (1/ratio)^0.15 × CEPCI_ratio", note: "Economies of scale reduce per-unit fixed costs for larger plants" },
                  { name: "Variable O&M ($/t)", formula: "VOM_ref × CEPCI_ratio", note: "No scale adjustment — variable costs are proportional to throughput" },
                  { name: "Power Cost ($/t)", formula: "Power_MW × $/MWh × CF × 8760 / Annual_CO₂", note: "Parasitic power consumption times electricity price, annualized" },
                  { name: "Fuel Cost ($/t)", formula: "Fuel_ref × (Gas_price / $4.42)", note: "Scales linearly with natural gas price relative to 2018 NETL base" },
                  { name: "Project CO₂ (t/yr)", formula: "Ref_CO₂ × (CF / Ref_CF)", note: "Annual capture volume, adjusted for capacity factor. Custom sizing may also apply scale ratio" },
                  { name: "Total LCOC ($/t)", formula: "Capital + Fixed O&M + Variable O&M + Power + Fuel", note: "Sum of all cost components per tonne CO₂ captured" },
                ].map((f, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, padding: "6px 0", borderBottom: i < 11 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{f.name}</div>
                    <div>
                      <div style={{ fontFamily: "Courier New, monospace", fontSize: 11.5, color: "#475569", background: "#f8fafc", padding: "4px 8px", border: "1px solid #f1f5f9", marginBottom: 3 }}>{f.formula}</div>
                      <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{f.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Limitations */}
            <div style={aBox}>
              <h3 style={aHdr}>Limitations & Caveats</h3>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
                {[
                  "NETL reference costs represent Class 4–5 estimates (±30–50% accuracy) for conceptual/pre-feasibility evaluation only.",
                  "Six-tenths scaling rule is an approximation; accuracy degrades beyond ±50% of reference plant size.",
                  "O&M costs do not include CO₂ transport, injection, storage, or long-term monitoring.",
                  "No revenue offsets (e.g., 45Q tax credits, EOR income, carbon credit sales) are included in the LCOC.",
                  "Electricity and natural gas prices are treated as flat (no time-of-use, demand charges, or escalation over project life).",
                  "CEPCI values for 2025–2026 are estimated projections and may differ from actuals.",
                  "Capital charge factors embed specific financing assumptions (debt/equity split, cost of capital, tax rates) that may not match project-specific terms.",
                  "NGCC scenarios assume the base plant already exists — capture costs represent the incremental retrofit, not the full power plant.",
                  "Location factors are state-level averages and do not account for site-specific conditions (soil, seismic, permitting, labor availability).",
                  "No learning curve or technology maturation effects are modeled — costs reflect current commercial technology."
                ].map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                    <span style={{ color: "#94a3b8", flexShrink: 0, fontSize: 11, marginTop: 1 }}>{(i + 1).toString().padStart(2, "0")}</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>);
        })()}

        {/* No results message for Model/Charts tabs */}
        {tab !== "io" && tab !== "assumptions" && !res && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
            <div style={{ fontSize: 14 }}>Switch to <strong>Inputs & Outputs</strong> to configure a scenario first.</div>
          </div>
        )}
      </div>
    </div>
  );
}
