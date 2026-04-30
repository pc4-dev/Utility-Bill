import React, { useState } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { WORKFLOW_STATUSES } from '../types';
import { cn } from '../utils';

interface FiltersProps {
  filters: {
    search: string;
    property: string;
    status: string;
    date: string;
    startDate?: string;
    endDate?: string;
    type?: string;
    region?: string;
    operator?: string;
    billType?: string;
  };
  setFilters: (filters: any) => void;
  properties: string[];
  options?: {
    operators?: string[];
    billTypes?: string[];
    showTypeFilter?: boolean;
    typeFilterLabel?: string;
  };
}

export const Filters: React.FC<FiltersProps> = ({ filters, setFilters, properties, options }) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const statuses = WORKFLOW_STATUSES;

  const handleReset = () => {
    setFilters({ 
      search: '', 
      property: '', 
      status: '', 
      date: '', 
      startDate: '', 
      endDate: '', 
      region: '', 
      operator: '', 
      billType: '',
      type: filters.type // Keep type if it's a module identifier
    });
  };

  const removeFilter = (key: string) => {
    setFilters({ ...filters, [key]: '' });
  };

  // Convert key to display label
  const getFilterLabel = (key: string) => {
    switch (key) {
      case 'property': return 'Project';
      case 'startDate': return 'From';
      case 'endDate': return 'To';
      case 'billType': return 'Type';
      case 'region': return filters.type === 'Property Tax (MCG)' ? 'Zone/Ward' : 'District';
      default: return key;
    }
  };

  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    // Basic fields to exclude from tags if they are default/empty
    if (!value || value === '' || key === 'type') return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Primary Filter Bar */}
      <div className="bg-white dark:bg-slate-950 p-2 sm:p-3 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3 transition-all">
        {/* Search Input */}
        <div className="relative flex-1 group">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by ID, Number, or Name..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 border-none rounded-xl text-text-primary text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-all placeholder:text-gray-400"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        {/* Quick Selects */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 px-2 border-l border-gray-100 dark:border-slate-800 ml-1">
            <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">
              <Building2 className="w-3 h-3" />
              Project
            </div>
            <select 
              className="bg-transparent border-none py-2 text-[13px] font-bold text-text-primary focus:ring-0 cursor-pointer min-w-[120px] outline-none"
              value={filters.property}
              onChange={(e) => setFilters({ ...filters, property: e.target.value })}
            >
              <option value="">All Projects</option>
              {properties.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 px-2 border-l border-gray-100 dark:border-slate-800 ml-1">
            <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">
              <Clock className="w-3 h-3" />
              Status
            </div>
            <select 
              className="bg-transparent border-none py-2 text-[13px] font-bold text-text-primary focus:ring-0 cursor-pointer min-w-[100px] outline-none"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Any Status</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-100 dark:border-slate-800">
          <button 
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
              isAdvancedOpen 
                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" 
                : "bg-gray-50 dark:bg-slate-900 text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-800"
            )}
          >
            <Filter className={cn("w-3.5 h-3.5", isAdvancedOpen ? "animate-pulse" : "")} />
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

      {/* Advanced Options Content */}
      <AnimatePresence>
        {isAdvancedOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-50/50 dark:bg-slate-900/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Date Filters */}
              <div className="space-y-2">
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

              {/* Dynamic Region Filter */}
              {(filters.type === 'Property Tax (MCG)' || filters.type === 'Diversion Tax (RD)') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Hash className="w-3 h-3" />
                    {filters.type === 'Property Tax (MCG)' ? "Zone/Ward" : "District"}
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

              {/* Module Specific Filters via Options */}
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

      {/* Active Filter Chips */}
      <AnimatePresence>
        {activeFilters.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-2 px-1"
          >
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-1">Active:</span>
            {activeFilters.map(([key, value]) => (
              <motion.button
                key={key}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={() => removeFilter(key)}
                className="flex items-center gap-1.5 px-3 py-1 bg-orange-600/5 dark:bg-orange-600/10 border border-orange-600/20 rounded-full text-[11px] font-bold text-orange-600 group hover:bg-orange-600 hover:text-white transition-all shadow-sm"
              >
                <span className="capitalize">{getFilterLabel(key)}:</span>
                <span>{String(value)}</span>
                <X className="w-3 h-3 opacity-50 group-hover:opacity-100" />
              </motion.button>
            ))}
            
            {activeFilters.length > 1 && (
              <button 
                onClick={handleReset}
                className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest ml-1 transition-colors underline underline-offset-4 decoration-dotted"
              >
                Clear All
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
