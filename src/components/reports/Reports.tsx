import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Download, FileText, BarChart3, 
  PieChart as PieIcon, TrendingUp, AlertCircle, Calendar,
  Filter, ChevronDown, FileSpreadsheet, Sparkles, 
  ArrowUpRight, ArrowDownRight, Search, Printer
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../services/api';
import { useAuth } from '../../AuthContext';
import { formatCurrency, formatDateDisplay, cn } from '../../utils';
import { Bill, BillType } from '../../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Extend jsPDF type for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const { user } = useAuth();
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: '',
    subcategory: '',
    documentType: '',
    status: '',
    month: '',
    year: new Date().getFullYear().toString(),
    property: '',
    utilityType: ''
  });

  const modules = useMemo(() => {
    const allModules = [
      { id: 'telecom_all', label: 'Telecommunication (All)', category: 'telecom' },
      { id: 'mobile_bill', label: 'Telecom - Mobile Bill', category: 'telecom', subcategory: 'mobile' },
      { id: 'landline_bill', label: 'Telecom - Landline', category: 'telecom', subcategory: 'landline' },
      { id: 'broadband_bill', label: 'Telecom - Broadband', category: 'telecom', subcategory: 'broadband' },
      { id: 'solar', label: 'Solar', category: 'utility', subcategory: 'solar' },
      { id: 'electricity', label: 'Electricity', category: 'utility', subcategory: 'electricity' },
      { id: 'insurance_all', label: 'Insurance (All)', category: 'insurance' },
      { id: 'vehicle_insurance', label: 'Insurance - Vehicle', category: 'insurance', subcategory: 'vehicle_insurance' },
      { id: 'employee_insurance', label: 'Insurance - Employee', category: 'insurance', subcategory: 'employee_insurance' },
      { id: 'general_insurance', label: 'Insurance - General', category: 'insurance', subcategory: 'general_insurance' },
      { id: 'pollution_control', label: 'Pollution Control (All)', category: 'government_compliance', subcategory: 'pollution_control' },
      { id: 'pollution_cte', label: 'Pollution - CTE', category: 'government_compliance', subcategory: 'pollution_control', documentType: 'CTE' },
      { id: 'pollution_cto', label: 'Pollution - CTO', category: 'government_compliance', subcategory: 'pollution_control', documentType: 'CTO' },
      { id: 'government_bills_all', label: 'Government Bills (All)', category: 'government_tax' },
      { id: 'property_tax', label: 'Property Tax', category: 'government_tax', subcategory: 'property_tax' },
      { id: 'diversion_tax', label: 'Diversion Tax', category: 'government_tax', subcategory: 'diversion_tax' },
      { id: 'other', label: 'Other', category: 'other' }
    ];

    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') return allModules;
    
    return allModules.filter(mod => {
      if (user?.role === 'INSURANCE_ENTRY') return mod.category === 'insurance';
      if (user?.role === 'GOV_TAX_ENTRY') return mod.category === 'government_tax' || mod.category === 'government_compliance';
      if (user?.role === 'DATA_ENTRY') return mod.category === 'telecom' || mod.category === 'utility' || mod.category === 'other';
      return false;
    });
  }, [user]);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const isRestricted = user?.role !== 'ADMIN' && user?.role !== 'MANAGER';
      const activeFilters = { ...filters };
      
      if (isRestricted && !activeFilters.category) {
        // Collect all distinct categories from accessible modules
        const allowedCats = Array.from(new Set(modules.map(m => m.category))).filter(Boolean);
        if (allowedCats.length > 0) {
          activeFilters.category = allowedCats.join(',');
        }
      }
      
      const data = await api.getAdvancedReports(activeFilters);
      setReportData(data);
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      setError(err.message || 'Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    const loadBillTypes = async () => {
      try {
        const types = await api.getBillTypes();
        setBillTypes(types);
      } catch (err) {
        console.error("Failed to load bill types", err);
      }
    };
    loadBillTypes();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [filters.year, filters.month, filters.category, filters.subcategory, filters.documentType, filters.status, filters.property, filters.utilityType]);

  const handleApplyCustomRange = () => {
    fetchReports();
  };

  const exportToPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    
    // Add Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text('Advanced Analytics Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Period: ${filters.startDate || 'Start'} to ${filters.endDate || 'End'}`, 14, 34);

    // Add Summary
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Financial Summary', 14, 45);
    
    const isLakhs = filters.subcategory === 'pollution_control' || ['Pollution Control', 'CTE', 'CTO'].includes(filters.utilityType);
    
    const summaryData = [
      ['Total Expense', formatCurrency(reportData.totalAmount, { inLakhs: isLakhs })],
      ['Total Documents', reportData.totalCount.toString()],
      ['Paid Amount', formatCurrency(reportData.paidAmount, { inLakhs: isLakhs })],
      ['Pending Amount', formatCurrency(reportData.pendingAmount, { inLakhs: isLakhs })],
    ];

    doc.autoTable({
      startY: 50,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillStyle: [30, 41, 59] }
    });

    // Add Bills Table
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Detailed Transaction List', 14, 20);
    
    const tableHeaders = [['Bill ID', 'Category', 'Subcategory', 'Amount', 'Date', 'Status']];
    const tableBody = reportData.bills.map((b: Bill) => [
      b.billId || 'N/A',
      b.category || 'N/A',
      b.subcategory || 'N/A',
      formatCurrency(b.amount || 0, { inLakhs: b.subcategory === 'pollution_control' || ['Pollution Control', 'CTE', 'CTO'].includes(b.utilityType || '') }),
      formatDateDisplay(b.createdAt || ''),
      b.status || 'N/A'
    ]);

    doc.autoTable({
      startY: 25,
      head: tableHeaders,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillStyle: [30, 41, 59] }
    });

    doc.save(`Advanced_Report_${Date.now()}.pdf`);
  };

  const exportToExcel = () => {
    if (!reportData) return;
    const data = reportData.bills.map((b: Bill) => {
      const isLakhs = b.subcategory === 'pollution_control' || ['Pollution Control', 'CTE', 'CTO'].includes(b.utilityType || '');
      return {
        'Bill ID': b.billId,
        'Property': b.propertyName,
        'Category': b.category,
        'Subcategory': b.subcategory,
        'Amount': isLakhs ? (b.amount || 0) / 100000 : (b.amount || 0),
        'Unit': isLakhs ? 'Lakhs' : 'INR',
        'Status': b.status,
        'Due Date': b.dueDate,
        'Created At': b.createdAt
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bills');
    XLSX.writeFile(wb, `Advanced_Report_${Date.now()}.xlsx`);
  };

  const chartData = useMemo(() => {
    if (!reportData) return { category: [], monthly: [], status: [] };
    
    const category = reportData.categoryData.map((item: any) => ({
      name: item._id || 'Uncategorized',
      value: item.total
    }));

    const monthly = reportData.monthlyTrend.map((item: any) => ({
      name: `${item._id.month}/${item._id.year}`,
      total: item.total
    }));

    const status = reportData.statusData.map((item: any) => ({
      name: item._id || 'Unknown',
      value: item.count
    }));

    return { category, monthly, status };
  }, [reportData]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (isLoading && !reportData) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-500 animate-pulse uppercase tracking-widest text-xs">Aggregating Report Data...</p>
      </div>
    );
  }

  const isLakhsModule = filters.subcategory === 'pollution_control' || ['Pollution Control', 'CTE', 'CTO'].includes(filters.utilityType);

  const getModuleLabel = () => {
    if (filters.utilityType) return filters.utilityType;
    if (filters.subcategory) {
      return modules.find(m => m.subcategory === filters.subcategory)?.label || filters.subcategory;
    }
    if (filters.category) {
      return modules.find(m => m.category === filters.category)?.label || filters.category;
    }
    return null;
  };

  const moduleLabel = getModuleLabel();

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse transition-colors"></div>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/30 transition-colors">Live Analytics</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Report Intelligence</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 transition-colors">AI-powered multi-module reporting & financial insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm group"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            Excel Export
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-xl shadow-slate-200 dark:shadow-none group"
          >
            <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            PDF Report
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400 transition-colors">
              <Filter className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white transition-colors">Intelligence Filters</h2>
          </div>
          <button 
            onClick={() => setFilters({ startDate: '', endDate: '', category: '', subcategory: '', documentType: '', status: '', month: '', year: '2026', property: '', utilityType: '' })}
            className="text-xs font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase tracking-widest"
          >
            Reset All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time Period</label>
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={filters.month}
                onChange={e => setFilters({...filters, month: e.target.value})}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Month</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i+1} value={i+1} className="bg-white dark:bg-slate-900">{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                ))}
              </select>
              <select 
                value={filters.year}
                onChange={e => setFilters({...filters, year: e.target.value})}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="2025" className="bg-white dark:bg-slate-900">2025</option>
                <option value="2026" className="bg-white dark:bg-slate-900">2026</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Utility Type</label>
            <select 
              value={filters.utilityType}
              onChange={e => setFilters({...filters, utilityType: e.target.value})}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="" className="bg-white dark:bg-slate-900">All Utility Types</option>
              {billTypes.map(type => (
                <option key={type._id || type.id} value={type.name} className="bg-white dark:bg-slate-900">
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Status</label>
            <select 
              value={filters.status}
              onChange={e => setFilters({...filters, status: e.target.value})}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="" className="bg-white dark:bg-slate-900">All Statuses</option>
              <option value="Paid" className="bg-white dark:bg-slate-900">Paid</option>
              <option value="Pending" className="bg-white dark:bg-slate-900">Pending</option>
              <option value="Overdue" className="bg-white dark:bg-slate-900">Overdue</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Document Type</label>
            <select 
              value={filters.documentType}
              onChange={e => setFilters({...filters, documentType: e.target.value})}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="" className="bg-white dark:bg-slate-900">All Types</option>
              <option value="CTE" className="bg-white dark:bg-slate-900">CTE</option>
              <option value="CTO" className="bg-white dark:bg-slate-900">CTO</option>
              <option value="Policy" className="bg-white dark:bg-slate-900">Policy</option>
              <option value="Certificate" className="bg-white dark:bg-slate-900">Certificate</option>
              <option value="Challan" className="bg-white dark:bg-slate-900">Challan</option>
              <option value="Receipt" className="bg-white dark:bg-slate-900">Receipt</option>
              <option value="Bill" className="bg-white dark:bg-slate-900">Bill</option>
              <option value="Other" className="bg-white dark:bg-slate-900">Other</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Property Name</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="Search Property..."
                value={filters.property}
                onChange={e => setFilters({...filters, property: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
              />
              <Search className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="xl:col-span-2 space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custom Range</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-1">
                <input 
                  type="date"
                  value={filters.startDate}
                  onChange={e => setFilters({...filters, startDate: e.target.value})}
                  className="bg-transparent px-2 py-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none"
                />
                <input 
                  type="date"
                  value={filters.endDate}
                  onChange={e => setFilters({...filters, endDate: e.target.value})}
                  className="bg-transparent px-2 py-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none"
                />
              </div>
              <button 
                onClick={handleApplyCustomRange}
                className="p-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-md shadow-indigo-100 active:scale-95"
                title="Apply Filter"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="space-y-6">
        {moduleLabel && (
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 rounded-full bg-indigo-500 transition-colors"></div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest transition-colors">{moduleLabel} Summary</h3>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard 
            label={moduleLabel ? `${moduleLabel} Expense` : "Total Expense"}
            value={formatCurrency(reportData?.totalAmount || 0, { inLakhs: isLakhsModule })}
            trend={isLakhsModule ? "Values in Lakhs" : "+12% vs last period"}
            trendUp={true}
            icon={<TrendingUp className="w-6 h-6" />}
            color="indigo"
          />
          <SummaryCard 
            label="Paid Amount"
            value={formatCurrency(reportData?.paidAmount || 0, { inLakhs: isLakhsModule })}
            trend="85% Efficiency"
            trendUp={true}
            icon={<Sparkles className="w-6 h-6" />}
            color="emerald"
          />
          <SummaryCard 
            label="Pending / Overdue"
            value={formatCurrency(reportData?.pendingAmount || 0, { inLakhs: isLakhsModule })}
            trend="Action Required"
            trendUp={false}
            icon={<AlertCircle className="w-6 h-6" />}
            color="amber"
          />
          <SummaryCard 
            label={moduleLabel ? `Total ${moduleLabel} Bills` : "Total Bills"}
            value={reportData?.totalCount || 0}
            trend={`${reportData?.totalCount || 0} Records`}
            trendUp={true}
            icon={<FileText className="w-6 h-6" />}
            color="slate"
          />
        </div>
      </div>


      {/* Main Charts Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown (Pie) */}
        <ChartContainer title="Category Distribution" subtitle="Expense split by major module">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.category}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={8}
                dataKey="value"
              >
                {chartData.category.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#1e293b', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Monthly Trend (Bar) */}
        <ChartContainer title="Monthly Expense Trend" subtitle="Expense flow over time">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.monthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} tickFormatter={v => `₹${v/1000}k`} />
              <RechartsTooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#1e293b', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Bar dataKey="total" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Expense Growth (Line) */}
        <ChartContainer title="Cumulative Growth" subtitle="Timeline of total spending">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData.monthly}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} tickFormatter={v => `₹${v/1000}k`} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#1e293b', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Status Breakdown (Donut) */}
        <ChartContainer title="Payment Status Breakdown" subtitle="Current status of all records">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.status}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={10}
                dataKey="value"
              >
                {chartData.status.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#1e293b', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Advanced Analytics Section - Enhanced with Subcategory Breakdown */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 p-4">
          <button className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 dark:text-slate-500 transition-all transition-colors">
            <Printer className="w-4 h-4" />
          </button>
        </div>
        <div className="mb-10">
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1 transition-colors">Module Intelligence Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium transition-colors">Granular breakdown of expenses across sub-modules and documents</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {reportData?.subcategoryData?.map((sub: any, i: number) => {
            const isSubLakhs = sub._id.subcategory === 'pollution_control' || ['Pollution Control', 'CTE', 'CTO'].includes(filters.utilityType);
            const label = sub._id.docType 
              ? `${sub._id.subcategory?.toUpperCase().replace('_', ' ')} - ${sub._id.docType}`
              : (sub._id.subcategory?.toUpperCase().replace('_', ' ') || sub._id.category?.toUpperCase().replace('_', ' ') || 'UNMAPPED');
            
            return (
              <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-white dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all group hover:shadow-lg hover:shadow-indigo-500/5 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                    {label}
                  </p>
                  {sub._id.docType && (
                    <span className={cn(
                      "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter transition-colors",
                      sub._id.docType === 'CTE' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                    )}>
                      {sub._id.docType}
                    </span>
                  )}
                </div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white mb-4 transition-colors">
                  {formatCurrency(sub.total, { inLakhs: isSubLakhs })}
                </h4>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-400 uppercase tracking-wider">Paid</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(sub.paidAmount || 0, { inLakhs: isSubLakhs })}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-400 uppercase tracking-wider">Pending</span>
                    <span className="text-red-500">{formatCurrency(sub.pendingAmount || 0, { inLakhs: isSubLakhs })}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-400 uppercase tracking-wider">Total Bills</span>
                    <span className="text-slate-700 dark:text-slate-200">{sub.totalCount || 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded w-fit transition-colors">
                  <ArrowUpRight className="w-3 h-3" />
                  Performance Stable
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Intelligence Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Transaction Intelligence</h2>
            <p className="text-sm text-slate-500 font-medium">Detailed audit trail of module data</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{reportData?.bills?.length || 0} Records</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Document</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Module</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Frequency</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Magnitude</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Vitality</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Temporal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reportData?.bills?.map((bill: Bill, idx: number) => (
                <tr key={bill._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{bill.billId || 'REF-N/A'}</span>
                      <span className="text-[10px] font-medium text-slate-400">{bill.propertyName || 'Global Asset'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 uppercase">{bill.category || 'General'}</span>
                  </td>
                  <td className="px-6 py-6">
                    <span className="text-[10px] font-bold text-slate-500 capitalize">{bill.subcategory || 'Standard'}</span>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <span className="text-sm font-black text-slate-900 dark:text-white transition-colors">
                      {formatCurrency(bill.amount || 0, { inLakhs: bill.subcategory === 'pollution_control' || ['Pollution Control', 'CTE', 'CTO'].includes(bill.utilityType || '') })}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <StatusBadge status={bill.status || 'Pending'} />
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">{formatDateDisplay(bill.createdAt || '')}</span>
                  </td>
                </tr>
              ))}
              {(!reportData?.bills || reportData.bills.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-slate-50 rounded-full">
                        <AlertCircle className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No intelligence gathered for this period</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string | number; trend: string; trendUp: boolean; icon: React.ReactNode; color: string }> = ({ 
  label, value, trend, trendUp, icon, color 
}) => {
  const colors: any = {
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/30",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/30",
    slate: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-slate-900 p-7 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all transition-colors"
    >
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border transition-colors", colors[color])}>
        {icon}
      </div>
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 transition-colors">{label}</p>
      <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 transition-colors">{value}</h3>
      <div className={cn("flex items-center gap-1 text-[10px] font-bold transition-colors", trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
        {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {trend}
      </div>
    </motion.div>
  );
};

const ChartContainer: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
    <div className="mb-8">
      <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 transition-colors">{title}</h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter transition-colors">{subtitle}</p>
    </div>
    {children}
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toLowerCase();
  if (s.includes('paid') || s.includes('confirmed') || s.includes('approved')) {
    return <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-tighter">Liquidated</span>;
  }
  if (s.includes('process')) {
    return <span className="px-3 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-tighter">In Progress</span>;
  }
  if (s.includes('overdue')) {
    return <span className="px-3 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-100 animate-pulse uppercase tracking-tighter">Critical</span>;
  }
  return <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-tighter">Pending</span>;
};
