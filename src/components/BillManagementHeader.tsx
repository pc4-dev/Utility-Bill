import React from 'react';
import { Plus, Search, Filter, ChevronDown, Clock, Download, FileSpreadsheet, FileText as FilePdf } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { cn } from '../utils';

interface BillManagementHeaderProps {
  onAddBill: () => void;
  onSearchChange: (value: string) => void;
  onFilterChange: (key: string, value: string) => void;
  totalBills?: number;
  properties?: string[];
  companies?: string[];
  onExportExcel?: () => void;
  onExportPdf?: () => void;
}

export const BillManagementHeader: React.FC<BillManagementHeaderProps> = ({
  onAddBill,
  onSearchChange,
  onFilterChange,
  totalBills = 0,
  properties = [],
  companies = [],
  onExportExcel,
  onExportPdf
}) => {
  const { user } = useAuth();
  const [isExportOpen, setIsExportOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      {/* SECTION 1 — TOP BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black text-text-primary tracking-tight">Bills</h2>
          <div className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider">{totalBills} Records</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-[11px] font-black text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Export
              <ChevronDown className={cn("w-3 h-3 transition-transform", isExportOpen && "rotate-180")} />
            </button>
            
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                  <button 
                    onClick={() => { onExportExcel?.(); setIsExportOpen(false); }}
                    className="w-full px-4 py-2 text-left text-[10px] font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Excel Spreadsheet
                  </button>
                  <button 
                    onClick={() => { onExportPdf?.(); setIsExportOpen(false); }}
                    className="w-full px-4 py-2 text-left text-[10px] font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2"
                  >
                    <FilePdf className="w-3.5 h-3.5 text-rose-500" /> PDF Document
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2 — SEARCH & FILTERS BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col lg:flex-row items-center gap-4 transition-all">
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search records..." 
            className="w-full pl-9 pr-4 py-2 bg-gray-50/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl text-[11px] font-medium text-text-primary focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex-1 w-full overflow-x-auto custom-scrollbar-hide flex items-center gap-2">
          <FilterSelect 
            icon={<Building2 className="w-3.5 h-3.5" />}
            label="Property"
            options={properties}
            onChange={(val) => onFilterChange('property', val)}
          />
          <FilterSelect 
            icon={<Briefcase className="w-3.5 h-3.5" />}
            label="Company"
            options={companies}
            onChange={(val) => onFilterChange('company', val)}
          />
          <FilterSelect 
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Category"
            options={['Electricity', 'Landline', 'Data', 'Property Tax', 'Solar Bill', 'Insurance']}
            onChange={(val) => onFilterChange('type', val)}
          />
          <FilterSelect 
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Status"
            options={['Pending', 'Verified', 'Approved', 'Paid', 'Overdue']}
            onChange={(val) => onFilterChange('status', val)}
          />
          <FilterSelect 
            icon={<CalendarDays className="w-3.5 h-3.5" />}
            label="Year"
            options={Array.from({ length: 5 }, (_, i) => (2024 + i).toString())}
            onChange={(val) => onFilterChange('year', val)}
          />
          <FilterSelect 
            icon={<Calendar className="w-3.5 h-3.5" />}
            label="Month"
            options={['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']}
            onChange={(val) => onFilterChange('month', val)}
          />
        </div>
      </div>
    </div>
  );
};

import { Building2, FileText, Calendar, CalendarDays, Briefcase } from 'lucide-react';

const FilterSelect = ({ icon, label, options, onChange }: { icon: React.ReactNode, label: string, options: string[], onChange: (val: string) => void }) => (
  <div className="relative min-w-[120px] flex-shrink-0">
    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
      {icon}
    </div>
    <select 
      className="w-full appearance-none pl-8 pr-8 py-1.5 bg-gray-50/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-[10px] font-black text-gray-500 hover:text-orange-600 hover:border-orange-200 focus:outline-none transition-all cursor-pointer"
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{label}</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
  </div>
);
