import React from 'react';
import { Plus, Search, Filter, ChevronDown } from 'lucide-react';

import { useAuth } from '../AuthContext';

interface BillManagementHeaderProps {
  onAddBill: () => void;
  onSearchChange: (value: string) => void;
  onFilterChange: (key: string, value: string) => void;
  totalBills?: number;
  properties?: string[];
}

export const BillManagementHeader: React.FC<BillManagementHeaderProps> = ({
  onAddBill,
  onSearchChange,
  onFilterChange,
  totalBills = 0,
  properties = []
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* SECTION 1 — PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-text-primary tracking-tight transition-colors">Bill Management</h2>
            <p className="text-sm text-text-secondary font-medium mt-1 transition-colors">Manage and track all utility bills</p>
          </div>
          <div className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 rounded-2xl border border-orange-200 dark:border-orange-500/30">
            <span className="text-sm font-black text-orange-600 dark:text-orange-400">Total: {totalBills}</span>
          </div>
        </div>
        {/* Add New Bill button removed as requested */}
      </div>

      {/* SECTION 2 — SEARCH & FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-orange-50 dark:border-slate-800 space-y-4 transition-colors">
        {/* ROW 1 — SEARCH + FILTER BUTTON */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search bills..." 
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-orange-500 transition-all outline-none"
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-text-secondary hover:bg-gray-200 dark:hover:bg-slate-700 transition-all">
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* ROW 2 — FILTER DROPDOWNS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="relative">
            <select 
              className="w-full appearance-none px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-secondary focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              onChange={(e) => onFilterChange('property', e.target.value)}
            >
              <option value="" className="bg-white dark:bg-slate-900">Property</option>
              {properties.map(p => (
                <option key={p} value={p} className="bg-white dark:bg-slate-900">{p}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4 pointer-events-none" />
          </div>

          <div className="relative">
            <select 
              className="w-full appearance-none px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-secondary focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              onChange={(e) => onFilterChange('type', e.target.value)}
            >
              <option value="" className="bg-white dark:bg-slate-900">Bill Type</option>
              {[
                'Electricity', 'Landline', 'Data', 'MCG - Property Tax', 'RD - Diversion Tax',
                'Fire Safety Audit', 'Electric Safety Audit', 'Solar Bill', 'Pollution Control',
                'CTE', 'CTO', 'Vehicle Insurance', 'Employee Insurance', 'General Insurance',
                'Insurance - Labour', 'Insurance - Asset', 'Waste Management', 'Pest Control',
                'Air-Conditioner AMC', 'Elevator AMC'
              ].map(type => (
                <option key={type} value={type} className="bg-white dark:bg-slate-900">{type}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4 pointer-events-none" />
          </div>
          
          <div className="relative">
            <select 
              className="w-full appearance-none px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-secondary focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              onChange={(e) => onFilterChange('status', e.target.value)}
            >
              <option value="" className="bg-white dark:bg-slate-900">Status</option>
              <option value="PENDING" className="bg-white dark:bg-slate-900">Pending</option>
              <option value="PAID" className="bg-white dark:bg-slate-900">Paid</option>
              <option value="COMPLETE" className="bg-white dark:bg-slate-900">Complete</option>
              <option value="OVERDUE" className="bg-white dark:bg-slate-900">Overdue</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4 pointer-events-none" />
          </div>

          <div className="relative">
            <select 
              className="w-full appearance-none px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-secondary focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              onChange={(e) => onFilterChange('priority', e.target.value)}
            >
              <option value="" className="bg-white dark:bg-slate-900">Priority</option>
              <option value="LOW" className="bg-white dark:bg-slate-900">Low</option>
              <option value="MEDIUM" className="bg-white dark:bg-slate-900">Medium</option>
              <option value="HIGH" className="bg-white dark:bg-slate-900">High</option>
              <option value="URGENT" className="bg-white dark:bg-slate-900">Urgent</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4 pointer-events-none" />
          </div>

          <div className="relative">
            <select 
              className="w-full appearance-none px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-secondary focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              onChange={(e) => onFilterChange('month', e.target.value)}
            >
              <option value="" className="bg-white dark:bg-slate-900">Month</option>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                <option key={m} value={m} className="bg-white dark:bg-slate-900">{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4 pointer-events-none" />
          </div>

          <div className="relative">
            <select 
              className="w-full appearance-none px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-secondary focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              onChange={(e) => onFilterChange('year', e.target.value)}
            >
              <option value="" className="bg-white dark:bg-slate-900">Year</option>
              {Array.from({ length: 2099 - 2025 + 1 }, (_, i) => 2025 + i).map(y => (
                <option key={y} value={y} className="bg-white dark:bg-slate-900">{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};
