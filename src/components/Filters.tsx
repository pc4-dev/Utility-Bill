import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  Tag, 
  Hash, 
  Clock,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WORKFLOW_STATUSES } from '../types';
import { cn } from '../utils';

interface FiltersProps {
  filters: {
    search: string;
    property: string;
    company: string;
    status: string;
    date: string;
    startDate?: string;
    endDate?: string;
    type?: string;
    region?: string;
    operator?: string;
    billType?: string;
    year?: string;
    month?: string;
  };
  setFilters: (filters: any) => void;
  properties: string[];
  companies: string[];
  data?: any[];
  statuses?: string[];
  types?: string[];
  countData?: {
    total: number;
    inProgress?: number;
    paid?: number;
    totalAmount: number;
    count3?: number;
    count4?: number;
  };
  options?: {
    operators?: string[];
    billTypes?: string[];
    showTypeFilter?: boolean;
    typeFilterLabel?: string;
    count3Label?: string;
    count4Label?: string;
  };
  onCountClick?: (type: string) => void;
  isLoading?: boolean;
  searchPlaceholder?: string;
}

export const Filters: React.FC<FiltersProps> = ({ filters, setFilters, properties, companies, data = [], statuses: propStatuses, types = [], countData, options, onCountClick, isLoading, searchPlaceholder }) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const projectCounts = useMemo(() => {
    // Basic counts by project, accounting for other active filters except the property filter itself
    const counts: Record<string, number> = { all: data.length };
    
    // For 'all', we might want to show how many bills match active filters other than property
    const otherFiltersData = data.filter(item => {
      const matchesCompany = !filters.company || item.companyName === filters.company;
      const matchesStatus = !filters.status || item.status === filters.status;
      const matchesSearch = !filters.search || 
        item.propertyName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.companyName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.billId?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.consumerNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.customerName?.toLowerCase().includes(filters.search.toLowerCase());
      return matchesCompany && matchesStatus && matchesSearch;
    });
    counts.all = otherFiltersData.length;

    properties.forEach(p => {
      counts[p] = otherFiltersData.filter(item => item.propertyName === p).length;
    });
    return counts;
  }, [data, properties, filters.company, filters.status, filters.search]);

  const companyCounts = useMemo(() => {
    // Basic counts by company, accounting for other active filters except the company filter itself
    const counts: Record<string, number> = { all: data.length };

    const otherFiltersData = data.filter(item => {
      const matchesProperty = !filters.property || item.propertyName === filters.property;
      const matchesStatus = !filters.status || item.status === filters.status;
      const matchesSearch = !filters.search || 
        item.propertyName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.companyName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.billId?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.consumerNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.customerName?.toLowerCase().includes(filters.search.toLowerCase());
      return matchesProperty && matchesStatus && matchesSearch;
    });
    counts.all = otherFiltersData.length;

    companies.forEach(c => {
      counts[c] = otherFiltersData.filter(item => item.companyName === c).length;
    });
    return counts;
  }, [data, companies, filters.property, filters.status, filters.search]);

  const statuses = propStatuses || [
    'Pending',
    'Verified',
    'Approved',
    'Payment Initiated',
    'Payment Confirmed',
    'Tally Entry',
    'Paid'
  ];

  const handleReset = () => {
    setFilters({ 
      search: '', 
      property: '', 
      company: '',
      status: '', 
      date: '', 
      startDate: '', 
      endDate: '', 
      region: '', 
      operator: '', 
      billType: '',
      year: '',
      month: '',
      type: 'All' 
    });
  };

  return (
    <div className="space-y-6 sticky top-0 bg-white dark:bg-slate-900 z-40 py-2 -mx-2 px-2 border-b border-gray-50/50 dark:border-slate-800/50 shadow-sm backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 transition-all duration-300">
      {/* Summary Cards */}
      {countData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            onClick={() => onCountClick?.('all')}
            className={cn(
              "bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md text-center sm:text-left cursor-pointer",
              onCountClick && (filters.type === 'All' || !filters.status) && "ring-2 ring-orange-500/20 border-orange-500/30 bg-orange-50/10"
            )}
          >
            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">Total Bills</p>
            <p className="text-xl font-black text-text-primary">{countData.total}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md text-center sm:text-left">
            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1 text-orange-600">Total Amount</p>
            <p className="text-xl font-black text-orange-600">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(countData.totalAmount)}
            </p>
          </div>
          <div 
            onClick={() => onCountClick?.('count3')}
            className={cn(
              "bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md text-center sm:text-left cursor-pointer",
              onCountClick && (
                (options?.count3Label && filters.type?.includes(options.count3Label.split(' ')[0])) || 
                (filters.status === 'IN_PROGRESS' || filters.status === 'Pending')
              ) && "ring-2 ring-orange-500/20 border-orange-500/30 bg-orange-50/10"
            )}
          >
            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1 text-orange-500">{options?.count3Label || 'In Progress'}</p>
            <p className="text-xl font-black text-orange-500">{countData.count3 ?? countData.inProgress}</p>
          </div>
          <div 
            onClick={() => onCountClick?.('count4')}
            className={cn(
              "bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md text-center sm:text-left cursor-pointer",
              onCountClick && (
                (options?.count4Label && filters.type?.includes(options.count4Label.split(' ')[0])) || 
                (filters.status === 'COMPLETED' || filters.status === 'Paid')
              ) && "ring-2 ring-emerald-500/20 border-emerald-500/30 bg-emerald-50/10"
            )}
          >
            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1 text-emerald-500">{options?.count4Label || 'Paid / Completed'}</p>
            <p className="text-xl font-black text-emerald-500">{countData.count4 ?? countData.paid}</p>
          </div>
        </div>
      )}

      {/* Search & Advanced Bar */}
      <div className="bg-white dark:bg-slate-950 p-2 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col lg:flex-row items-stretch lg:items-center gap-3 transition-all relative z-10 mx-1 sm:mx-0">
        {/* Search */}
        <div className="relative flex-1 group min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <input 
            type="text" 
            placeholder={searchPlaceholder || "Search by ID, Number, or Name..."} 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 border-none rounded-xl text-text-primary text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-all placeholder:text-gray-400"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        {/* Company Dropdown */}
        {companies && (
          <div className="relative min-w-[180px]">
            <select 
              className="w-full appearance-none pl-10 pr-8 py-2.5 bg-gray-50 dark:bg-slate-900 border-none rounded-xl text-text-secondary text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-all cursor-pointer"
              value={filters.company}
              onChange={(e) => setFilters({ ...filters, company: e.target.value })}
            >
              <option value="">All Companies ({companyCounts.all})</option>
              {companies.map(c => (
                <option key={c} value={c}>{c} ({companyCounts[c] || 0})</option>
              ))}
            </select>
            <Tag className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}

        {/* Project Dropdown */}
        <div className="relative min-w-[180px]">
          <select 
            className="w-full appearance-none pl-10 pr-8 py-2.5 bg-gray-50 dark:bg-slate-900 border-none rounded-xl text-text-secondary text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-all cursor-pointer"
            value={filters.property}
            onChange={(e) => setFilters({ ...filters, property: e.target.value })}
          >
            <option value="">All Projects ({projectCounts.all})</option>
            {properties.map(p => (
              <option key={p} value={p}>{p} ({projectCounts[p] || 0})</option>
            ))}
          </select>
          <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Type Filter */}
        {options?.showTypeFilter && (
          <div className="relative min-w-[180px]">
            <select 
              className="w-full appearance-none pl-10 pr-8 py-2.5 bg-gray-50 dark:bg-slate-900 border-none rounded-xl text-text-secondary text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-all cursor-pointer"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="All">All {options.typeFilterLabel || 'Types'}</option>
              {types.length > 0 ? (
                types.map(t => <option key={t} value={t}>{t}</option>)
              ) : (
                <>
                  <option value="Property Tax (MCG)">Property Tax (MCG)</option>
                  <option value="Diversion Tax (RD)">Diversion Tax (RD)</option>
                </>
              )}
            </select>
            <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}

        {/* Status Dropdown */}
        <div className="relative min-w-[160px]">
          <select 
            className="w-full appearance-none pl-10 pr-8 py-2.5 bg-gray-50 dark:bg-slate-900 border-none rounded-xl text-text-secondary text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-all cursor-pointer"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            {statuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Clock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={cn(
              "flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
              isAdvancedOpen 
                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" 
                : "bg-gray-50 dark:bg-slate-900 text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-800"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Advanced</span>
            {isAdvancedOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button 
            onClick={handleReset}
            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
            title="Clear all filters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Advanced Content */}
      <AnimatePresence>
        {isAdvancedOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-50/50 dark:bg-slate-900/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    className="flex-1 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-[12px] font-bold text-text-primary outline-none focus:ring-1 focus:ring-orange-500/20 transition-all"
                    value={filters.startDate || ''}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  />
                  <span className="text-gray-300">/</span>
                  <input 
                    type="date" 
                    className="flex-1 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-[12px] font-bold text-text-primary outline-none focus:ring-1 focus:ring-orange-500/20 transition-all"
                    value={filters.endDate || ''}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  />
                </div>
              </div>

              {(filters.type === 'Property Tax (MCG)' || filters.type === 'Diversion Tax (RD)') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Hash className="w-3 h-3" />
                    Region/District
                  </label>
                  <input 
                    type="text"
                    placeholder="Enter value..."
                    className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-[12px] font-bold text-text-primary outline-none focus:ring-1 focus:ring-orange-500/20 transition-all"
                    value={filters.region || ''}
                    onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                  />
                </div>
              )}

              {options?.operators && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="w-3 h-3" />
                    Operator
                  </label>
                  <select 
                    className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-[12px] font-bold text-text-primary outline-none focus:ring-1 focus:ring-orange-500/20 transition-all"
                    value={filters.operator || ''}
                    onChange={(e) => setFilters({ ...filters, operator: e.target.value })}
                  >
                    <option value="">Any Operator</option>
                    {options.operators.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}

              {options?.billTypes && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Tag className="w-3 h-3" />
                    Bill Type
                  </label>
                  <select 
                    className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-[12px] font-bold text-text-primary outline-none focus:ring-1 focus:ring-orange-500/20 transition-all"
                    value={filters.billType || ''}
                    onChange={(e) => setFilters({ ...filters, billType: e.target.value })}
                  >
                    <option value="">Any Type</option>
                    {options.billTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
