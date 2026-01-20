import React, { useState, useEffect } from 'react';
import { Download, Send, ChevronRight, Lock, User, LogOut, BarChart3, TrendingUp, TrendingDown, Mail, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const TrendIndicator = ({ data }) => {
  if (!data || data.length < 2) return null;
  const current = parseFloat(data[data.length - 1].value) || 0;
  const previous = parseFloat(data[data.length - 2].value) || 0;
  const change = current - previous;
  const changePercent = previous !== 0 ? ((change / previous) * 100).toFixed(1) : 0;
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className="flex items-center gap-2 mt-2">
      {isPositive && <TrendingUp size={18} className="text-green-600" />}
      {isNegative && <TrendingDown size={18} className="text-red-600" />}
      {!isPositive && !isNegative && <span className="text-gray-400">→</span>}
      <span className={`font-semibold text-sm ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'}`}>
        {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent}%)
      </span>
    </div>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [siteId, setSiteId] = useState('');
  const [siteName, setSiteName] = useState('');
  const [month, setMonth] = useState('Jan');
  const [year, setYear] = useState('2025');
  const [activeProduct, setActiveProduct] = useState('Caster');
  const [activeAssetIndex, setActiveAssetIndex] = useState(0);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [kpiChartData, setKpiChartData] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({ 'BUS': true, 'TECH': true, 'BENCH': true, 'HSE': true });
  const [expandedFormSections, setExpandedFormSections] = useState({ 'business': true, 'operational': true, 'benchmark': true, 'hse': true });

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [sites, setSites] = useState([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [userAccessibleEntities, setUserAccessibleEntities] = useState([]);
  const [assetQuantities, setAssetQuantities] = useState({ 'Caster': 0, 'MSW': 0, 'HSM': 0, 'RGW': 0 });
  const [equipmentDetails, setEquipmentDetails] = useState({});
  const [kpiData, setKpiData] = useState({});
  const [sectionProgress, setSectionProgress] = useState({});
  const yearOptions = Array.from({ length: 11 }, (_, i) => (2025 + i).toString());


  /* -------------------------------------------------------
    KPI Metrci id Map
  -------------------------------------------------------- */

  const metricIdMap = {
    'BUS_TOTAL_COST': 1, 'BUS_OPER_RESULT': 2, 'BUS_CPT_FULL': 3, 'BUS_CPT_VAR': 4, 'BUS_CPT_FIX': 5,
    'BUS_WC_DAYS_INV': 6, 'BUS_WC_DAYS_WIP': 7, 'BUS_OPER_RESULT_PER_TON': 8, 'TECH_PROD_VOLUME': 9,
    'TECH_PROD_UPTIME': 10, 'TECH_DOWNTIME': 11, 'TECH_WORK_ORDERS': 12, 'TECH_WO_HOURS': 13,
    'TECH_MTTR': 14, 'TECH_FTP_YIELD_PCT': 15, 'BENCH_SEG_LIFE_ACH_PCT': 16,
    'BENCH_CAMPAIGN_LENGTH_HEATS_AVG': 17, 'BENCH_TOTAL_CONSUMABLE_COST': 18, 'BENCH_CAST_THROUGHPUT': 19,
    'BENCH_BREAKOUT_FREQUENCY': 20, 'BENCH_CU_MOLD_PLATE_AVG_TURNAROUND_TIME': 21, 'BENCH_CASTER_ROLLER_WEAR_RATE': 22,
    'BENCH_SEG_LIFETIME_T': 23, 'BENCH_CASTER_ROLLER_LIFETIME_T': 24, 'BENCH_CU_MOLD_PLATE_LIFETIME_T': 25,
    'BENCH_OTD_RATE': 26, 'HSE_ACCIDENTS_COUNT': 27, 'HSE_SEVERITY_COUNT': 28, 'HSE_HEALTH_STATUS': 29,
    'HSE_CAPACITY_LOSS': 30, 'BUS_OPER_RESULT_PCT': 31, 'BUS_SALES': 32, 'BUS_VARIABLE_COST_PCT': 33,
    'BUS_VARIABLE_COST': 34, 'BUS_FIXED_COST': 35, 'BUS_SALES_PER_TON': 36, 'BUS_NON_INVOICED_COSTS': 38,
    'TECH_MAINT_COMPLIANCE_PCT': 39, 'TECH_MTBF': 40, 'TECH_PERSONNEL_UTI_PCT': 41,
    'TECH_INSPECTION_PASS_RATE_PCT': 44, 'TECH_FULL_REPAIR_ORDERS': 43, 'BENCH_CU_MOLD_PLATE_WEAR_RATE': 45,
    'BENCH_CU_MOLD_PLATE_LIFE_ACH_PCT': 46, 'BENCH_SEG_AVG_TURNAROUND_TIME': 48, 'HSE_NEAR_MISSES': 49
  };

  const categoryColors = {
    'BUS': { bg: 'bg-blue-50', border: 'border-blue-300', bgColor: 'rgb(0, 162, 245)' },
    'TECH': { bg: 'bg-blue-50', border: 'border-blue-300', bgColor: 'rgb(0, 162, 245)' },
    'BENCH': { bg: 'bg-green-50', border: 'border-green-300', bgColor: 'rgb(142, 194, 74)' },
    'HSE': { bg: 'bg-green-50', border: 'border-green-300', bgColor: 'rgb(142, 194, 74)' }
  };

  /* -------------------------------------------------------
    KPI defitions inside information icon
  -------------------------------------------------------- */

  const kpiDefinitions = {
    'BUS_TOTAL_COST': { name: 'Total Cost', def: 'Sum of all direct and indirect costs to operate the equipment, including labour, materials, energy, subcontracting services.', example: 'A caster operation costs €150k/month to run.' },
    'BUS_OPER_RESULT': { name: 'Operating Result', def: 'Revenue minus total operating costs; the profit/loss generated before financing and taxes.', example: 'With €200k revenue and €150k costs, operating result is €50k.' }, 'BUS_OPER_RESULT_PCT': { name: 'Operating Result %', def: 'Operating result as a percentage of revenue; measures profitability margin.', example: 'An operating result of €50k on €200k revenue = 25% operating result.' }, 'BUS_CPT_FULL': { name: 'Cost per Ton (Full)', def: 'Sum of all direct and indirect costs to operate the equipment, including labour, materials, energy, subcontracting services divided by output tonnage; shows unit economics.', example: 'Producing 1,000 tons with €80k cost = €80/ton.' },
    'BUS_CPT_VAR': { name: 'Cost per Ton (Variable)', def: 'Variable costs (materials, energy, repair services, waged labour, overtimes) per ton produced; excludes fixed costs.', example: 'Variable costs of €40k for 1,000 tons = €40/ton.' }, 'BUS_CPT_FIX': { name: 'Cost per Ton (Fixed)', def: 'Fixed costs (salaried labour, equipment depreciation, facility expenses, overheads) allocated per ton produced.', example: 'Fixed costs of €20k for 1,000 tons = €20/ton.' }, 'BUS_WC_DAYS_INV': { name: 'Working Capital - Days Inventory', def: 'Average days inventory sits in storage before being used or sold; indicates inventory efficiency.', example: 'If inventory turns over every 15 days, high inventory ties up working capital.' }, 'BUS_WC_DAYS_WIP': { name: 'Working Capital - Days WIP', def: 'Average days materials spend in work-in-progress; lower is better for cash flow.', example: 'If WIP cycle is 10 days, fast production improves cash position.' },
    'BUS_OPER_RESULT_PER_TON': { name: 'Operating Result per Ton', def: 'Profit generated per ton of production; combines volume and margin.', example: 'Producing 1,000 tons with €50k profit = €50/ton.' }, 'BUS_SALES': { name: 'Sales Revenue', def: 'Total revenue generated from selling equipment, spares or services.', example: 'Selling 400 rollers at €2.500/roller = €1M sales.' }, 'BUS_VARIABLE_COST': { name: 'Variable Cost', def: 'Costs that change with production volume (raw materials, energy, waged labour, overtimes).', example: 'Producing 20% more tons increases variable costs by ~20%.' }, 'BUS_VARIABLE_COST_PCT': { name: 'Variable Cost %', def: 'Variable costs as percentage of total cost; shows cost structure flexibility.', example: 'Variable costs share of 40% on €100k total cost = €40k.' }, 'BUS_FIXED_COST': { name: 'Fixed Cost', def: 'Costs independent of production volume (salaried labour, equipment depreciation, facility expenses, overheads).', example: 'Monthly facility cost of €30k remains same whether producing 500 or 1,000 tons.' }, 'BUS_SALES_PER_TON': { name: 'Sales per Ton', def: 'Revenue generated per ton produced; reflects pricing and product mix.', example: 'Selling 1,000 tons for €200k = €200/ton average price.' },
    'BUS_NON_INVOICED_COSTS': { name: 'Non Invoiced Costs', def: 'Costs not recovered through invoicing (waste, defects, downtime) usually if the costs are incurred following SMS fault, discretionary costs born out of the budgetary scope (if operation is cost plus fee) or pure budgetary overruns (on cost plus fee with a hard limit); indicates efficiency losses.', example: '€20k to eliminate consequences of a breakout cause by SMS maintenance error not invoices to customer .' },

    'TECH_PROD_VOLUME': { name: 'Production Volume', def: 'Total tonnage produced in the period; core operational metric.', example: 'Caster produces 1,200 tons in January.' },
    'TECH_PROD_UPTIME': { name: 'Production Time', def: 'Hours equipment actively produces; excludes maintenance and breakdowns.', example: 'Equipment runs 600 hours out of 744 available hours.' },
    'TECH_DOWNTIME': { name: 'Downtime', def: 'Hours equipment is not producing due to failures, maintenance, or planned stops.', example: 'Equipment down 40 hours for refractory repair.' },
    'TECH_MAINT_COMPLIANCE_PCT': { name: 'Maintenance Compliance %', def: 'Percentage of scheduled preventive maintenance completed on time; prevents unplanned downtime.', example: '95% of scheduled maintenance completed = 95% compliance.' },
    'TECH_MTBF': { name: 'MTBF (Mean Time Between Failures)', def: 'Average hours of operation between equipment failures; measures reliability.', example: 'Equipment fails every 200 hours on average (MTBF = 200h).' },
    'TECH_MTTR': { name: 'MTTR (Mean Time To Repair)', def: 'Average hours to repair equipment after failure; shows maintenance efficiency.', example: 'Average repair takes 4 hours to get equipment back running.' },
    'TECH_FTP_YIELD_PCT': { name: 'First Time Prime Yield %', def: 'Percentage of cast steel meeting quality specs first attempt; excludes rework/scrap.', example: '96% of casts are prime grade on first pour.' },
    'TECH_WORK_ORDERS': { name: 'Number of Work Orders', def: 'Total maintenance and repair activities in the period.', example: '45 work orders issued in the month.' },
    'TECH_FULL_REPAIR_ORDERS': { name: 'Full Repair Work Orders', def: 'Major repair orders requiring significant downtime; indicates major issues.', example: '8 full repairs compared to 45 total work orders.' },
    'TECH_INSPECTION_PASS_RATE_PCT': { name: 'Inspection Pass Rate %', def: 'Percentage of quality inspections passed without defects; quality control metric.', example: '98% of all castings pass inspection criteria.' },
    'TECH_PERSONNEL_UTI_PCT': { name: 'Personnel Utilization %', def: 'Percentage of labor hours productively used vs. total available; staffing efficiency.', example: 'Team works 80% of scheduled hours; 20% idle time.' },
    'BENCH_SEG_LIFE_ACH_PCT': { name: 'Segment Life Achievement %', def: 'Actual segment lifespan vs. specification target; shows component wear efficiency.', example: 'Segment lasts 500 casts vs. 520 target = 96% achievement.' },
    'BENCH_CU_MOLD_PLATE_LIFE_ACH_PCT': { name: 'Mold Plate Life Achievement %', def: 'Actual copper mold plate lifespan vs. expected; component durability metric.', example: 'Mold plate lasts 1,800 casts vs. 2,000 target = 90% achievement.' },
    'BENCH_CAMPAIGN_LENGTH_HEATS_AVG': { name: 'Average Campaign Length (Heats)', def: 'Average number of heats per campaign before equipment needs reconfiguration; efficiency metric.', example: 'Running 250 heats per campaign before changeover.' },
    'BENCH_TOTAL_CONSUMABLE_COST': { name: 'Total Cost of Consumables', def: 'Cost of expendable materials (refractory, electrodes, mold powder) per period.', example: '€45k spent on refractory and consumables monthly.' },
    'BENCH_CAST_THROUGHPUT': { name: 'Casting Throughput', def: 'Tons of steel cast per hour; measures casting speed and efficiency.', example: 'Caster produces 10 tons/hour average throughput.' },
    'BENCH_BREAKOUT_FREQUENCY': { name: 'Breakout Frequency', def: 'Number of mold breakouts (molten steel leaks) per ton produced; quality/safety metric.', example: '0.5 breakouts per 1,000 tons produced.' },
    'BENCH_CU_MOLD_PLATE_AVG_TURNAROUND_TIME': { name: 'Mold Plate Turnaround Time (Days)', def: 'Days from mold plate removal to return to service; shop efficiency.', example: 'Mold plates serviced and back in 5 days.' },
    'BENCH_SEG_AVG_TURNAROUND_TIME': { name: 'Segment Turnaround Time (Days)', def: 'Days from segment removal to return to service; maintenance efficiency.', example: 'Segments restored and reinstalled in 3 days.' },
    'BENCH_CASTER_ROLLER_WEAR_RATE': { name: 'Caster Roller Wear Rate', def: 'Millimeters of wear per ton produced; indicates roller degradation speed.', example: 'Rollers wear 0.05 mm per 1,000 tons.' },
    'BENCH_CU_MOLD_PLATE_WEAR_RATE': { name: 'Mold Plate Wear Rate', def: 'Millimeters of wear per ton cast; shows mold plate durability.', example: 'Mold plates wear 0.1 mm per 1,000 tons.' },
    'BENCH_SEG_LIFETIME_T': { name: 'Segment Lifetime (Tons)', def: 'Total tons a segment can cast before replacement; durability specification.', example: 'Segment rated for 50,000 tons.' },
    'BENCH_CASTER_ROLLER_LIFETIME_T': { name: 'Roller Lifetime (Tons)', def: 'Total tons a roller can process before replacement; wear specification.', example: 'Roller rated for 100,000 tons.' },
    'BENCH_CU_MOLD_PLATE_LIFETIME_T': { name: 'Mold Plate Lifetime (Tons)', def: 'Total tons a mold plate can handle before replacement; durability metric.', example: 'Mold plate rated for 200,000 tons.' },
    'BENCH_OTD_RATE': { name: 'On-Time Delivery Rate', def: 'Percentage of orders delivered by promised date; customer satisfaction metric.', example: '98% of orders shipped on schedule.' },
    'HSE_ACCIDENTS_COUNT': { name: 'Accident Frequency Rate', def: 'Number of workplace accidents in the period; safety performance.', example: '2 accidents in the month (target: 0).' },
    'HSE_SEVERITY_COUNT': { name: 'Severity Rate', def: 'Number of serious/lost-time incidents; measures accident impact.', example: '1 lost-time incident vs. 2 near-misses.' },
    'HSE_HEALTH_STATUS': { name: 'Health Status %', def: 'Percentage of workforce in good health; occupational health metric.', example: '99% of team fit for duty, 1% on medical leave.' },
    'HSE_CAPACITY_LOSS': { name: 'Capacity Loss %', def: 'Production capacity lost due to HSE incidents; business impact of safety issues.', example: '2% capacity loss from unplanned HSE shutdowns.' },
    'HSE_NEAR_MISSES': { name: 'Near Misses', def: 'Count of incidents that could have caused harm but didn\'t; leading indicator of risk.' }
  };




  const Tooltip2 = ({ title, text }) => {
    const [isVisible, setIsVisible] = useState(false);
    return (
      <div className="relative inline-block ml-2">
        <button
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          onClick={() => setIsVisible(!isVisible)}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-200 text-blue-700 hover:bg-blue-300 cursor-help text-xs font-bold"
        >
          ?
        </button>
        {isVisible && (
          <div className="absolute z-50 left-0 mt-1 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-normal">
            <p className="font-bold mb-1">{title}</p>
            <p className="mb-2">{text}</p>
            {kpiDefinitions[title] && kpiDefinitions[title].example && (
              <p className="text-blue-300 italic">Ex: {kpiDefinitions[title].example}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const productConfigs = {
    'Caster': {
      equipmentFields: [
        { label: 'Asset / Project', key: 'entity_name', source: 'entity_name' },
        { label: 'Equipment Type', key: 'equipment_type', source: 'equipment_type' },
        { label: 'Capacity', key: 'capacity', source: 'capacity' },
        { label: '# of Strands', key: 'strands', source: 'strand_no' },
        { label: 'Year of Commission', key: 'commission_year', source: 'commission_year' },
        { label: 'City', key: 'city', source: 'location' },
        { label: 'Site Name', key: 'site_name', source: 'customer_name' },
        { label: 'Supplier', key: 'supplier', source: 'oem_name' }
      ],
      sections: {
        business: {
          title: 'Business/Financial Control (SXC Operations)',
          category: 'BUS',
          kpis: [
            { name: 'Operating Result', code: 'BUS_OPER_RESULT', unit: 'CUR', scenarios: ['Actual', 'Plan', 'Contract'] },
            { name: 'Operating Result in %', code: 'BUS_OPER_RESULT_PCT', unit: 'pct', scenarios: ['Actual', 'Plan', 'Contract'] },
            { name: 'Variable Cost Proportion in %', code: 'BUS_VARIABLE_COST_PCT', unit: 'pct', scenarios: ['Actual', 'Plan', 'Contract'] },
            { name: 'Non Invoiced Costs', code: 'BUS_NON_INVOICED_COSTS', unit: 'CUR', scenarios: ['Actual', 'Plan', 'Contract'] },
            { name: 'Working Capital - Days Inventory', code: 'BUS_WC_DAYS_INV', unit: 'd', scenarios: ['Actual', 'Plan'] },
            { name: 'Working Capital - Days WIP', code: 'BUS_WC_DAYS_WIP', unit: 'd', scenarios: ['Actual', 'Plan'] }
          ]
        },
        operational: {
          title: 'Operational / Technical Controls (Customer Equipment)',
          category: 'TECH',
          kpis: [
            { name: 'Production Volume', code: 'TECH_PROD_VOLUME', unit: 't', scenarios: ['Actual', 'Plan'] },
            { name: 'Production Time', code: 'TECH_PROD_UPTIME', unit: 'h', scenarios: ['Actual', 'Plan'] },
            { name: 'Downtime', code: 'TECH_DOWNTIME', unit: 'h', scenarios: ['Actual', 'Plan'] },
            { name: 'Maintenance Compliance', code: 'TECH_MAINT_COMPLIANCE_PCT', unit: 'pct', scenarios: ['Actual'] },
            { name: 'First Time Prime Yield', code: 'TECH_FTP_YIELD_PCT', unit: 'pct', scenarios: ['Actual'] }
          ]
        },
        benchmark: {
          title: 'Benchmark Controls (Different per Equipment)',
          category: 'BENCH',
          kpis: [
            { name: 'Average Campaign Length - Heats', code: 'BENCH_CAMPAIGN_LENGTH_HEATS_AVG', unit: 'count', scenarios: ['Actual', 'Plan'] },
            { name: 'Segment Life Achievement %', code: 'BENCH_SEG_LIFE_ACH_PCT', unit: 'pct', scenarios: ['Actual'] },
            { name: 'Mold Plate Life Achievement %', code: 'BENCH_CU_MOLD_PLATE_LIFE_ACH_PCT', unit: 'pct', scenarios: ['Actual'] },
            { name: 'Total Cost of Consumables', code: 'BENCH_TOTAL_CONSUMABLE_COST', unit: 'CUR', scenarios: ['Actual'] },
            { name: 'Casting Throughput', code: 'BENCH_CAST_THROUGHPUT', unit: 'T_PER_HOUR', scenarios: ['Actual'] },
            { name: 'Breakout Frequency', code: 'BENCH_BREAKOUT_FREQUENCY', unit: 'BREAK_PER_TON', scenarios: ['Actual'] }
          ]
        },
        hse: {
          title: 'HSE Controls',
          category: 'HSE',
          kpis: [
            { name: 'Accident Frequency Rate', code: 'HSE_ACCIDENTS_COUNT', unit: 'count', scenarios: ['Actual'] },
            { name: 'Severity Rate', code: 'HSE_SEVERITY_COUNT', unit: 'count', scenarios: ['Actual'] },
            { name: 'Health Status', code: 'HSE_HEALTH_STATUS', unit: 'pct', scenarios: ['Actual'] },
            { name: 'Capacity Loss', code: 'HSE_CAPACITY_LOSS', unit: 'pct', scenarios: ['Actual'] },
            { name: 'Near Misses', code: 'HSE_NEAR_MISSES', unit: 'count', scenarios: ['Actual'] }
          ]
        }
      }
    },
    'MSW': {
      equipmentFields: [
        { label: 'Asset / Project', key: 'entity_name', source: 'entity_name' },
        { label: 'Equipment Type', key: 'equipment_type', source: 'equipment_type' },
        { label: 'Year of Commission', key: 'commission_year', source: 'commission_year' },
        { label: 'City', key: 'city', source: 'location' },
        { label: 'Site Name', key: 'site_name', source: 'customer_name' },
        { label: 'Supplier', key: 'supplier', source: 'oem_name' }
      ],
      sections: {
        business: {
          title: 'Business/Financial Control (SXC Operations)',
          category: 'BUS',
          kpis: [
            { name: 'Operating Result', code: 'BUS_OPER_RESULT', unit: 'CUR', scenarios: ['Actual', 'Plan', 'Contract'] },
            { name: 'Operating Result in %', code: 'BUS_OPER_RESULT_PCT', unit: 'pct', scenarios: ['Actual', 'Plan', 'Contract'] },
            { name: 'Variable Cost Proportion in %', code: 'BUS_VARIABLE_COST_PCT', unit: 'pct', scenarios: ['Actual', 'Plan', 'Contract'] },
            { name: 'Non Invoiced Costs', code: 'BUS_NON_INVOICED_COSTS', unit: 'CUR', scenarios: ['Actual', 'Plan'] },
            { name: 'Working Capital - Days Inventory', code: 'BUS_WC_DAYS_INV', unit: 'd', scenarios: ['Actual', 'Plan'] },
            { name: 'Working Capital - Days WIP', code: 'BUS_WC_DAYS_WIP', unit: 'd', scenarios: ['Actual', 'Plan'] }
          ]
        },
        operational: {
          title: 'Operational / Technical Controls (Customer Equipment)',
          category: 'TECH',
          kpis: [
            { name: 'Utilization of Personnel in %', code: 'TECH_PERSONNEL_UTI_PCT', unit: 'pct', scenarios: ['Actual'] },
            { name: 'Number of Work Orders', code: 'TECH_WORK_ORDERS', unit: 'count', scenarios: ['Actual', 'Plan'] },
            { name: 'Full Repair Work Orders', code: 'TECH_FULL_REPAIR_ORDERS', unit: 'count', scenarios: ['Actual', 'Plan'] },
            { name: 'Inspection Pass Rate %', code: 'TECH_INSPECTION_PASS_RATE_PCT', unit: 'pct', scenarios: ['Actual'] }
          ]
        },
        benchmark: {
          title: 'Benchmark Controls (Different per Equipment)',
          category: 'BENCH',
          kpis: [
            { name: 'Average Turnaround Time - Copper Molds', code: 'BENCH_CU_MOLD_PLATE_AVG_TURNAROUND_TIME', unit: 'd', scenarios: ['Actual', 'Plan'] },
            { name: 'Average Turnaround Time - Segments', code: 'BENCH_SEG_AVG_TURNAROUND_TIME', unit: 'd', scenarios: ['Actual', 'Plan'] },
            { name: 'Caster Roller Wear Rate', code: 'BENCH_CASTER_ROLLER_WEAR_RATE', unit: 'MM_PER_TON', scenarios: ['Actual'] },
            { name: 'Copper Mold Plate Wear Rate', code: 'BENCH_CU_MOLD_PLATE_WEAR_RATE', unit: 'MM_PER_TON', scenarios: ['Actual'] },
            { name: 'Total Cost of Consumables', code: 'BENCH_TOTAL_CONSUMABLE_COST', unit: 'CUR', scenarios: ['Actual'] }
          ]
        },
        hse: {
          title: 'HSE Controls',
          category: 'HSE',
          kpis: [
            { name: 'Accident Frequency Rate', code: 'HSE_ACCIDENTS_COUNT', unit: 'count', scenarios: ['Actual'] },
            { name: 'Severity Rate', code: 'HSE_SEVERITY_COUNT', unit: 'count', scenarios: ['Actual'] },
            { name: 'Health Status', code: 'HSE_HEALTH_STATUS', unit: 'pct', scenarios: ['Actual'] },
            { name: 'Capacity Loss', code: 'HSE_CAPACITY_LOSS', unit: 'pct', scenarios: ['Actual'] },
            { name: 'Near Misses', code: 'HSE_NEAR_MISSES', unit: 'count', scenarios: ['Actual'] }
          ]
        }
      }
    },
    'HSM': {
      equipmentFields: [
        { label: 'Asset / Project', key: 'entity_name', source: 'entity_name' },
        { label: 'Equipment Type', key: 'equipment_type', source: 'equipment_type' },
        { label: 'Capacity', key: 'capacity', source: 'capacity' },
        { label: 'Year of Commission', key: 'commission_year', source: 'commission_year' },
        { label: 'City', key: 'city', source: 'location' },
        { label: 'Site Name', key: 'site_name', source: 'customer_name' },
        { label: 'Supplier', key: 'supplier', source: 'oem_name' }
      ],
      sections: {
        business: {
          title: 'Business/Financial Control (SXC Operations)',
          category: 'BUS',
          kpis: [
            { name: 'Total Cost', code: 'BUS_TOTAL_COST', unit: 'CUR', scenarios: ['Actual', 'Plan', 'Contract'] },
            { name: 'Operating Result', code: 'BUS_OPER_RESULT', unit: 'CUR', scenarios: ['Actual', 'Plan', 'Contract'] },
            { name: 'Cost per Ton (Full)', code: 'BUS_CPT_FULL', unit: 'CUR_PER_TON', scenarios: ['Actual', 'Plan', 'Contract'] }
          ]
        },
        operational: {
          title: 'Operational / Technical Controls (Customer Equipment)',
          category: 'TECH',
          kpis: [
            { name: 'Production Volume', code: 'TECH_PROD_VOLUME', unit: 't', scenarios: ['Actual', 'Planned'] },
            { name: 'Production Time', code: 'TECH_PROD_UPTIME', unit: 'h', scenarios: ['Actual', 'Planned'] },
            { name: 'Downtime', code: 'TECH_DOWNTIME', unit: 'h', scenarios: ['Actual', 'Planned'] },
            { name: 'First Time Prime Yield', code: 'TECH_FTP_YIELD_PCT', unit: 'pct', scenarios: ['Actual'] }
          ]
        },
        benchmark: { title: 'Benchmark Controls', category: 'BENCH', kpis: [] },
        hse: {
          title: 'HSE Controls',
          category: 'HSE',
          kpis: [
            { name: 'Accidents', code: 'HSE_ACCIDENTS_COUNT', unit: 'count', scenarios: ['Actual'] },
            { name: 'Severity Incidents', code: 'HSE_SEVERITY_COUNT', unit: 'count', scenarios: ['Actual'] },
            { name: 'Health Status', code: 'HSE_HEALTH_STATUS', unit: 'pct', scenarios: ['Actual'] },
            { name: 'Near Misses', code: 'HSE_NEAR_MISSES', unit: 'count', scenarios: ['Actual'] }
          ]
        }
      }
    },
    'RGW': {
      equipmentFields: [
        { label: 'Asset / Project', key: 'entity_name', source: 'entity_name' },
        { label: 'Equipment Type', key: 'equipment_type', source: 'equipment_type' },
        { label: 'Capacity', key: 'capacity', source: 'capacity' },
        { label: 'City', key: 'city', source: 'location' },
        { label: 'Site Name', key: 'site_name', source: 'customer_name' },
        { label: 'Supplier', key: 'supplier', source: 'oem_name' }
      ],
      sections: {
        business: {
          title: 'Business/Financial Control (SXC Operations)',
          category: 'BUS',
          kpis: [
            { name: 'Total Cost', code: 'BUS_TOTAL_COST', unit: 'CUR', scenarios: ['Actual', 'Plan', 'Contract'] },
            { name: 'Operating Result', code: 'BUS_OPER_RESULT', unit: 'CUR', scenarios: ['Actual', 'Plan', 'Contract'] },
            { name: 'Sales Revenue', code: 'BUS_SALES', unit: 'CUR', scenarios: ['Actual', 'Plan', 'Contract'] }
          ]
        },
        operational: {
          title: 'Operational / Technical Controls',
          category: 'TECH',
          kpis: [
            { name: 'Production Volume', code: 'TECH_PROD_VOLUME', unit: 't', scenarios: ['Actual', 'Planned'] },
            { name: 'Production Time', code: 'TECH_PROD_UPTIME', unit: 'h', scenarios: ['Actual', 'Planned'] },
            { name: 'Downtime', code: 'TECH_DOWNTIME', unit: 'h', scenarios: ['Actual', 'Planned'] }
          ]
        },
        benchmark: { title: 'Benchmark Controls', category: 'BENCH', kpis: [] },
        hse: { title: 'HSE Controls', category: 'HSE', kpis: [] }
      }
    }
  };

  const calculateSectionProgress = () => {
    const config = productConfigs[activeProduct];
    const progress = {};
    Object.keys(config.sections).forEach(sectionKey => {
      const section = config.sections[sectionKey];
      let totalFields = 0, filledFields = 0;
      section.kpis.forEach(kpi => {
        kpi.scenarios.forEach(scenario => {
          totalFields++;
          const key = `${activeProduct}_${activeAssetIndex}_${sectionKey}_${kpi.code}_${scenario.toLowerCase()}`;
          if (kpiData[key] && kpiData[key] !== '') filledFields++;
        });
      });
      progress[sectionKey] = {
        filled: filledFields,
        total: totalFields,
        percentage: totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0
      };
    });
    setSectionProgress(progress);
  };

  useEffect(() => {
    calculateSectionProgress();
  }, [kpiData, activeProduct, activeAssetIndex]);

  useEffect(() => {
    if (siteId && currentUser) {
      loadHistoricalData(siteId, year, month, currentUser.username);
    }
  }, [siteId, year, month, activeProduct]);

  const loadDashboardData = async () => {
    setIsLoadingDashboard(true);
    try {
      const response = await fetch(`${API_URL}/kpi-historical-all?entityKey=${siteId}&product=${activeProduct}&username=${currentUser.username}`);
      const result = await response.json();
      if (response.ok && result.success) {
        const processedData = processKpiData(result.data);
        setKpiChartData(processedData);
        console.log('Dashboard data loaded for:', siteId);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const processKpiData = (rawData) => {
    const config = productConfigs[activeProduct];
    const processed = {};

    Object.keys(config.sections).forEach(sectionKey => {
      const section = config.sections[sectionKey];
      section.kpis.forEach(kpi => {
        kpi.scenarios.forEach(scenario => {
          const scenarioKey = scenario.toLowerCase();
          const key = `${kpi.code}_${scenario}`;
          const chartData = [];

          rawData.forEach(item => {
            const itemScenarioKey = item.scenario_code.toLowerCase();
            if (item.metric_code === kpi.code && itemScenarioKey === scenarioKey) {
              const date = new Date(item.period_start);
              const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
              chartData.push({
                month: monthYear,
                value: item.value_num
              });
            }
          });

          if (chartData.length > 0) {
            chartData.sort((a, b) => new Date(a.month) - new Date(b.month));
          }

          processed[key] = {
            kpiName: kpi.name,
            kpiCode: kpi.code,
            scenario: scenario,
            unit: kpi.unit,
            sectionTitle: section.title,
            category: section.category,
            data: chartData
          };
        });
      });
    });

    return processed;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setIsAuthenticated(true);
        setCurrentUser(result.user);
        setTimeout(() => {
          loadSites(result.user.username);
          loadUserAccess(result.user.username);
        }, 100);
      } else {
        setLoginError(result.message || 'Invalid credentials');
      }
    } catch (error) {
      setLoginError('Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setKpiData({});
    setEquipmentDetails({});
    setUserAccessibleEntities([]);
  };

  const loadUserAccess = async (username) => {
    try {
      const response = await fetch(`${API_URL}/user-access/${username}`);
      const result = await response.json();
      if (response.ok && result.success) {
        setUserAccessibleEntities(result.data);
        const quantities = { 'Caster': 0, 'MSW': 0, 'HSM': 0, 'RGW': 0 };
        result.data.forEach(entity => {
          const name = (entity.entity_name || '').toLowerCase();
          if (name.includes('caster')) quantities['Caster']++;
          else if (name.includes('msw')) quantities['MSW']++;
          else if (name.includes('hsm')) quantities['HSM']++;
          else if (name.includes('rgw')) quantities['RGW']++;
        });
        setAssetQuantities(quantities);
      }
    } catch (error) {
      console.error('Error loading user access:', error);
    }
  };

  const loadSites = async (username) => {
    setIsLoadingSites(true);
    try {
      const response = await fetch(`${API_URL}/sites?username=${username}`);
      const result = await response.json();
      if (response.ok && result.success) {
        setSites(result.data);
        if (result.data.length > 0) {
          const match = result.data.find(s => (s.entity_name || '').toLowerCase().includes(activeProduct.toLowerCase())) || result.data[0];
          setSiteId(match.entity_key);
          await loadEntityDetails(match.entity_key, username);
          await loadHistoricalData(match.entity_key, year, month, username);
        }
      }
    } catch (error) {
      console.error('Error loading sites:', error);
    } finally {
      setIsLoadingSites(false);
    }
  };

  const loadEntityDetails = async (entityKey, username) => {
    try {
      const response = await fetch(`${API_URL}/entity-details/${entityKey}?username=${username || currentUser.username}`);
      const result = await response.json();
      if (response.ok && result.success) {
        setSiteName(result.data.customer_name || '');
        const config = productConfigs[activeProduct];
        const newEquipmentDetails = {};
        config.equipmentFields.forEach(field => {
          const key = `${activeProduct}_${activeAssetIndex}_${field.key}`;
          newEquipmentDetails[key] = result.data[field.source] || '';
        });
        setEquipmentDetails(prev => ({ ...prev, ...newEquipmentDetails }));
      }
    } catch (error) {
      console.error('Error loading entity details:', error);
    }
  };

  const loadHistoricalData = async (entityKey, yearVal, monthVal, username) => {
    try {
      console.log(`Loading data for entity: ${entityKey}, year: ${yearVal}, month: ${monthVal}`);
      const response = await fetch(`${API_URL}/historical-kpi/${entityKey}/${yearVal}/${monthVal}?username=${username || currentUser.username}`);
      const result = await response.json();

      if (response.ok && result.success && result.data && result.data.length > 0) {
        console.log('Found', result.data.length, 'historical records');
        const newKpiData = {};
        const config = productConfigs[activeProduct];

        result.data.forEach(item => {
          const scenarioKey = item.scenario_code.toLowerCase();

          Object.keys(config.sections).forEach(sectionKey => {
            const kpi = config.sections[sectionKey].kpis.find(k => k.code === item.metric_code);
            if (kpi) {
              const key = `${activeProduct}_${activeAssetIndex}_${sectionKey}_${item.metric_code}_${scenarioKey}`;
              newKpiData[key] = item.value_num;
            }
          });
        });

        setKpiData(prev => ({ ...prev, ...newKpiData }));
      }
    } catch (error) {
      console.error('Error loading historical data:', error);
    }
  };

  const handleSiteChange = async (newEntityKey) => {
    const selectedSite = sites.find(s => s.entity_key === newEntityKey);
    if (selectedSite) {
      setSiteId(newEntityKey);
      setActiveAssetIndex(0);
      setKpiData({});
      setEquipmentDetails({});
      setKpiChartData({});
      await loadEntityDetails(newEntityKey, currentUser.username);
      await loadHistoricalData(newEntityKey, year, month, currentUser.username);
    }
  };

  const handlePeriodChange = async (newYear, newMonth) => {
    setYear(newYear);
    setMonth(newMonth);
    if (siteId && currentUser) {
      setKpiData({});
      await loadHistoricalData(siteId, newYear, newMonth, currentUser.username);
    }
  };

  const hasAccessToEntity = (entityKey) => {
    return userAccessibleEntities.some(entity => entity.entity_key === entityKey);
  };

  const getKpiValue = (product, assetIdx, section, code, scenario) => kpiData[`${product}_${assetIdx}_${section}_${code}_${scenario.toLowerCase()}`] || '';
  const setKpiValue = (product, assetIdx, section, code, scenario, value) => {
    setKpiData(prev => ({ ...prev, [`${product}_${assetIdx}_${section}_${code}_${scenario.toLowerCase()}`]: value }));
  };

  const layerCodeMap = {
    'Caster': 'CASTER',
    'MSW': 'MOLD_SEGMENT_WORKSHOP',
    'HSM': 'HOT_STRIP_MILL',
    'RGW': 'ROLL_GRINDING_WORKSHOP'
  };

  const scenarioCodeMap = {
    'Actual': 'ACTUAL',
    'Plan': 'PLAN',
    'Planned': 'PLAN',
    'Contract': 'CONTRACT'
  };

  const handleSubmit = async () => {
    const config = productConfigs[activeProduct];
    const problematicCodes = [];
    const dataToSubmit = [];
    const skippedKpis = [];
    const monthNum = months.indexOf(month) + 1;

    Object.entries(config.sections).forEach(([sectionKey, section]) => {
      section.kpis.forEach(kpi => {
        if (!metricIdMap[kpi.code]) {
          problematicCodes.push(kpi.code);
        }

        kpi.scenarios.forEach(scenario => {
          const key = `${activeProduct}_${activeAssetIndex}_${sectionKey}_${kpi.code}_${scenario.toLowerCase()}`;
          const value = kpiData[key];

          if (value && value !== '') {
            const metricId = metricIdMap[kpi.code];

            if (!metricId) {
              skippedKpis.push(`${kpi.name} (${scenario}) - metric code not found`);
              return;
            }

            if (!hasAccessToEntity(siteId)) {
              skippedKpis.push(`${kpi.name} (${scenario}) - access denied`);
              return;
            }

            const periodStart = new Date(parseInt(year), monthNum - 1, 1);
            const periodEnd = new Date(parseInt(year), monthNum, 0);
            const selectedEntity = userAccessibleEntities.find(e => e.entity_key === siteId);
            const entityTypeCode = selectedEntity ? selectedEntity.entity_type_code : 'ASSET';

            dataToSubmit.push({
              metric_id: metricId,
              entity_type_code: entityTypeCode,
              entity_key: siteId,
              scenario_code: scenarioCodeMap[scenario] || scenario.toUpperCase(),
              layer_code: layerCodeMap[activeProduct],
              grain_code: 'MONTH',
              period_start: periodStart.toISOString().split('T')[0],
              period_end: periodEnd.toISOString().split('T')[0],
              value_num: parseFloat(value),
              unit_code: kpi.unit,
              currency_code: 'EUR',
              submitted_by: currentUser.username
            });
          }
        });
      });
    });

    if (dataToSubmit.length === 0) {
      alert('No valid data to submit.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/submit-kpi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId, product: activeProduct, year, month, assetIndex: activeAssetIndex,
          kpiData: dataToSubmit, username: currentUser.username
        })
      });
      const result = await response.json();
      if (response.ok && result.success) {
        let message = `Success! ${result.message}`;
        if (skippedKpis.length > 0) {
          message += `\n\nSkipped:\n${skippedKpis.join('\n')}`;
        }
        alert(message);

        await loadDashboardData();
        await loadHistoricalData(siteId, year, month, currentUser.username);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Failed to submit: ${error.message}`);
    }
  };

  const handleExport = () => {
    const config = productConfigs[activeProduct];
    const exportData = [];
    Object.entries(config.sections).forEach(([sectionKey, section]) => {
      section.kpis.forEach(kpi => {
        kpi.scenarios.forEach(scenario => {
          const value = getKpiValue(activeProduct, activeAssetIndex, sectionKey, kpi.code, scenario);
          exportData.push({
            'Category': section.title,
            'KPI': kpi.name,
            'Scenario': scenario,
            'Value': value,
            'Unit': kpi.unit
          });
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${activeProduct}_${month}_${year}`);
    XLSX.writeFile(wb, `KPI_${activeProduct}_${siteId}_${month}_${year}.xlsx`);
  };

  const currentConfig = productConfigs[activeProduct];
  const hasAccessToCurrentAsset = hasAccessToEntity(siteId);
  const filteredSites = sites.filter(site => {
    const entityName = (site.entity_name || '').toLowerCase();
    return entityName.includes(activeProduct.toLowerCase());
  });

  const dashboardByCategory = Object.values(kpiChartData).reduce((acc, kpi) => {
    const cat = kpi.category || 'BUS';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(kpi);
    return acc;
  }, {});

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src="/sms-logo.png" alt="SMS Group" className="h-8 w-auto" />
            </div>

            <p className="text-black-600">SXC Operations - KPI Tracker Login</p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
              />
            </div>
            {loginError && <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-3 rounded-lg">{loginError}</div>}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Mail size={18} className="text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-2">Request Access</p>
                  <p className="text-xs text-gray-700">Contact:</p>
                  <a href="mailto:christiantyty.sadiki@sms-group.com" className="text-xs text-blue-600 hover:underline block">christiantyty.sadiki@sms-group.com</a>
                  <a href="mailto:martin.blaesner@sms-group.com" className="text-xs text-blue-600 hover:underline block">martin.blaesner@sms-group.com</a>
                </div>
              </div>
            </div>
            <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">{isLoading ? 'Logging in...' : 'Login'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-80 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b-2 border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <img src="/sms-logo.png" alt="SMS Group" className="h-10 w-auto" />
          </div>
          <p className="text-xs text-black-1000 font-semibold">KPI TRACKER</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {Object.keys(productConfigs).filter(product => assetQuantities[product] > 0).map(product => (
            <button
              key={product}
              onClick={async () => {
                setActiveProduct(product);
                setActiveAssetIndex(0);
                setKpiData({});
                setEquipmentDetails({});
                const matchingSite = sites.find(s => (s.entity_name || '').toLowerCase().includes(product.toLowerCase()));
                if (matchingSite) {
                  setSiteId(matchingSite.entity_key);
                  await new Promise(r => setTimeout(r, 100));
                  await loadEntityDetails(matchingSite.entity_key, currentUser.username);
                  await loadHistoricalData(matchingSite.entity_key, year, month, currentUser.username);
                }
              }}
              className={`w-full text-left p-3 mb-2 rounded-lg font-semibold ${activeProduct === product ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{product}</span>
                {activeProduct === product && <ChevronRight size={18} />}
              </div>
              <div className="text-xs mt-1 opacity-80">{assetQuantities[product]} unit{assetQuantities[product] > 1 ? 's' : ''}</div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t-2 border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <User size={16} className="text-gray-600" />
            <span className="text-sm font-semibold text-gray-800">{currentUser?.username}</span>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-semibold">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1800px] mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">SXC Operations</h1>
                <p className="text-gray-600">KPI Tracker - {activeProduct}</p>
              </div>
              <div className="flex gap-3">
                {/* <button onClick={() => { setShowDashboard(!showDashboard); if (!showDashboard) loadDashboardData(); }} className={`flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg font-bold transition-all ${showDashboard ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                <BarChart3 size={20} />
                {showDashboard ? 'Edit Form' : 'View Dashboard'}
              </button> */}
                <button onClick={handleSubmit} disabled={!hasAccessToCurrentAsset || showDashboard} className={`flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg font-bold ${hasAccessToCurrentAsset && !showDashboard ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                  <Send size={20} />
                  Submit Data
                </button>
                <button onClick={handleExport} disabled={showDashboard} className={`flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg font-bold ${!showDashboard ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                  <Download size={20} />
                  Export
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Asset / Project</label>
                <select value={siteId} onChange={(e) => handleSiteChange(e.target.value)} className="w-full p-3 border-2 border-gray-300 rounded-lg" disabled={isLoadingSites}>
                  {filteredSites.map(site => <option key={site.entity_key} value={site.entity_key}>{site.entity_name || site.entity_key}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Site Name</label>
                <input type="text" value={siteName} readOnly className="w-full p-3 border-2 border-gray-300 rounded-lg bg-gray-50" />
              </div>
            </div>

            {!showDashboard && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Month</label>
                  <select value={month} onChange={(e) => handlePeriodChange(year, e.target.value)} className="w-full p-3 border-2 border-gray-300 rounded-lg">
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Year</label>
                  <select value={year} onChange={(e) => handlePeriodChange(e.target.value, month)} className="w-full p-3 border-2 border-gray-300 rounded-lg">
                    {yearOptions.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {showDashboard ? (
            <div className="space-y-6">
              {isLoadingDashboard ? (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                  <p className="text-gray-500 text-lg">Loading dashboard...</p>
                </div>
              ) : Object.keys(dashboardByCategory).length > 0 ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
                    <h2 className="text-2xl font-bold text-gray-900">{activeProduct} Dashboard</h2>
                    <p className="text-gray-600 mt-2">{siteName} - Historical KPI Performance</p>
                  </div>
                  {Object.entries(dashboardByCategory).map(([category, kpis]) => {
                    const catColor = categoryColors[category];
                    const isExpanded = expandedCategories[category];
                    return (
                      <div key={category}>
                        <button
                          onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                          className="w-full text-white p-4 rounded-t-lg font-bold text-lg flex items-center justify-between hover:opacity-90 transition-all"
                          style={{ backgroundColor: catColor.bgColor }}
                        >
                          <span>{category} Metrics</span>
                          <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
                        </button>
                        {isExpanded && (
                          <div className={`${catColor.bg} border-2 ${catColor.border} rounded-b-lg p-6`}>
                            <div className="grid grid-cols-2 gap-6">
                              {kpis.map((kpi, i) => (
                                <div key={i} className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: catColor.bgColor }}>
                                  <h3 className="text-lg font-bold text-gray-900">{kpi.kpiName}</h3>
                                  <p className="text-sm text-gray-600">{kpi.scenario} | {kpi.unit}</p>
                                  {kpi.data && kpi.data.length > 0 ? (
                                    <>
                                      <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={kpi.data}>
                                          <CartesianGrid strokeDasharray="3 3" />
                                          <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={70} />
                                          <YAxis tick={{ fontSize: 11 }} />
                                          <Tooltip formatter={(v) => v.toFixed(2)} />
                                          <Bar dataKey="value" fill={catColor.bgColor} />
                                        </BarChart>
                                      </ResponsiveContainer>
                                      <TrendIndicator data={kpi.data} />
                                    </>
                                  ) : (
                                    <div className="h-[250px] flex items-center justify-center bg-gray-50 rounded-lg">
                                      <p className="text-gray-400">No data</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                  <p className="text-gray-500 text-lg">No historical data available</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {(activeProduct === 'Caster' || activeProduct === 'HSM') && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-blue-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Equipment Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {currentConfig.equipmentFields.map((field, idx) => (
                      <div key={idx}>
                        <label className="block text-sm font-bold text-gray-700 mb-2">{field.label}</label>
                        <input type="text" className="w-full p-3 border-2 border-gray-300 rounded-lg bg-gray-50" value={equipmentDetails[`${activeProduct}_${activeAssetIndex}_${field.key}`] || ''} readOnly />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.entries(currentConfig.sections).map(([sectionKey, section]) => {
                if (section.kpis.length === 0) return null;
                const progress = sectionProgress[sectionKey] || { filled: 0, total: 0, percentage: 0 };
                const catColor = categoryColors[section.category];
                const isExpanded = expandedFormSections[sectionKey];

                return (
                  <div key={sectionKey} className={`${catColor.bg} rounded-lg shadow-md p-6 mb-6 border-2 ${catColor.border}`}>
                    <button
                      onClick={() => setExpandedFormSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
                      className="w-full"
                    >
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2 text-white p-3 rounded-lg hover:opacity-90 transition-all cursor-pointer" style={{ backgroundColor: catColor.bgColor }}>
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
                            <h3 className="text-xl font-bold">{section.title}</h3>
                          </div>
                          <span className="text-sm font-semibold">{progress.filled} / {progress.total} ({progress.percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div className="h-3 rounded-full" style={{ width: `${progress.percentage}%`, backgroundColor: progress.percentage === 100 ? '#22c55e' : progress.percentage >= 50 ? catColor.bgColor : '#eab308' }} />
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border-2 border-gray-300 p-3 text-left font-bold">KPI</th>
                              <th className="border-2 border-gray-300 p-3 text-left font-bold">Unit</th>
                              {section.kpis[0]?.scenarios.map(s => <th key={s} className="border-2 border-gray-300 p-3 text-center font-bold">{s}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {section.kpis.map((kpi, idx) => {
                              const isProblematic = !metricIdMap[kpi.code];
                              return (
                                <tr key={idx} className={`hover:bg-gray-50 ${isProblematic ? 'bg-red-100' : ''}`}>
                                  <td className={`border-2 ${isProblematic ? 'border-red-400' : 'border-gray-300'} p-3 font-semibold ${isProblematic ? 'text-red-700' : ''}`}>
                                    <div className="flex items-center">
                                      <span>{kpi.name}</span>
                                      {!isProblematic && <Tooltip2 title={kpi.code} text={kpiDefinitions[kpi.code]?.def || 'Definition not available'} />}
                                    </div>
                                    {isProblematic && <span className="ml-2 text-red-600 font-bold">Cannot Submit</span>}
                                  </td>
                                  <td className={`border-2 ${isProblematic ? 'border-red-400' : 'border-gray-300'} p-3 text-sm text-gray-600`}>{kpi.unit}</td>
                                  {kpi.scenarios.map(s => (
                                    <td key={s} className={`border-2 ${isProblematic ? 'border-red-400' : 'border-gray-300'} p-2`}>
                                      <input
                                        type="number"
                                        step="0.01"
                                        disabled={isProblematic}
                                        className={`w-full p-2 border-2 rounded font-semibold ${isProblematic ? 'border-red-400 bg-red-50 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                                        placeholder={isProblematic ? "N/A" : "0.00"}
                                        title={isProblematic ? `Metric code ${kpi.code} not found` : ''}
                                        value={isProblematic ? '' : getKpiValue(activeProduct, activeAssetIndex, sectionKey, kpi.code, s)}
                                        onChange={(e) => !isProblematic && setKpiValue(activeProduct, activeAssetIndex, sectionKey, kpi.code, s, e.target.value)}
                                      />
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;