import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Download,
  Filter,
  Calendar,
  ChevronUp,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import { Bill } from '../types';
import { formatCurrency, cn } from '../utils';

interface ReportsProps {
  bills: Bill[];
}

export const Reports: React.FC<ReportsProps> = ({ bills }) => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    billType: ''
  });

  const [appliedFilters, setAppliedFilters] = useState({
    startDate: '',
    endDate: '',
    billType: ''
  });

  const [sortConfig, setSortConfig] = useState<{
    key: keyof Bill | null;
    direction: 'asc' | 'desc';
  }>({ key: 'due_date', direction: 'desc' });

  const billTypes = [
    'Electricity', 'Landline', 'Data', 'MCG - Property Tax', 'RD - Diversion Tax',
    'Insurance - Labour', 'Insurance - Asset', 'Vehicle Insurance', 'Employee Insurance', 'General Insurance',
    'Waste Management', 'Pest Control', 'Fire Safety Audit', 'Electric Safety Audit', 'Solar Bill', 
    'Pollution Control', 'CTE', 'CTO',
    'Air-Conditioner AMC', 'Elevator AMC'
  ];

  const filteredData = useMemo(() => {
    return bills.filter(bill => {
      const date = new Date(bill.due_date);
      
      const matchesStartDate = appliedFilters.startDate ? date >= new Date(appliedFilters.startDate) : true;
      const matchesEndDate = appliedFilters.endDate ? date <= new Date(appliedFilters.endDate) : true;
      const matchesType = appliedFilters.billType ? bill.bill_type === appliedFilters.billType : true;

      return matchesStartDate && matchesEndDate && matchesType;
    });
  }, [bills, appliedFilters]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key!];
      const bVal = b[sortConfig.key!];

      if (aVal === bVal) return 0;
      
      const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * multiplier;
      }
      
      return String(aVal).localeCompare(String(bVal)) * multiplier;
    });
  }, [filteredData, sortConfig]);

  const stats = useMemo(() => {
    const totalBills = filteredData.length;
    const totalAmount = filteredData.reduce((sum, b) => sum + b.total_amount, 0);
    const paidAmount = filteredData.reduce((sum, b) => {
      const billPaid = b.payments?.reduce((pSum, p) => p.status === 'DONE' ? pSum + p.amount : pSum, 0) || 0;
      return sum + billPaid;
    }, 0);
    const pendingAmount = totalAmount - paidAmount;

    return { totalBills, totalAmount, paidAmount, pendingAmount };
  }, [filteredData]);

  const breakdownByType = useMemo(() => {
    const map: Record<string, { count: number, total: number }> = {};
    filteredData.forEach(bill => {
      if (!map[bill.bill_type]) {
        map[bill.bill_type] = { count: 0, total: 0 };
      }
      map[bill.bill_type].count++;
      map[bill.bill_type].total += bill.total_amount;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filteredData]);

  const breakdownByStatus = useMemo(() => {
    const map: Record<string, { count: number, total: number }> = {
      'Paid': { count: 0, total: 0 },
      'Pending': { count: 0, total: 0 },
      'Completed': { count: 0, total: 0 }
    };
    
    filteredData.forEach(bill => {
      let statusLabel = 'Pending';
      if (bill.status === 'PAID') statusLabel = 'Paid';
      else if (bill.status === 'Payment Confirmed') statusLabel = 'Completed';
      else if (bill.status === 'OVERDUE' || bill.status === 'PENDING') statusLabel = 'Pending';
      
      if (map[statusLabel]) {
        map[statusLabel].count++;
        map[statusLabel].total += bill.total_amount;
      }
    });
    return Object.entries(map);
  }, [filteredData]);

  const handleExportCSV = () => {
    const headers = ['Bill Number', 'Type', 'Company', 'Project', 'Due Date', 'Status', 'Amount'];
    const rows = sortedData.map(b => [
      b.bill_number,
      b.bill_type,
      b.company_name,
      b.project_name,
      b.due_date,
      b.status,
      b.total_amount
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const requestSort = (key: keyof Bill) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Bill) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-text-primary tracking-tight transition-colors">Reports</h2>
          <p className="text-sm text-text-secondary font-medium mt-1 transition-colors">Generate and analyze utility bill reports</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-100"
        >
          <Download className="w-5 h-5" />
          Export to CSV
        </button>
      </div>

      {/* Report Filters */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-orange-50 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-bold text-text-primary transition-colors">Report Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <label className="text-xs font-bold text-text-secondary mb-2 block uppercase tracking-wider transition-colors">Start Date</label>
            <input 
              type="date"
              className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary mb-2 block uppercase tracking-wider transition-colors">End Date</label>
            <input 
              type="date"
              className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary mb-2 block uppercase tracking-wider transition-colors">Bill Type</label>
            <select 
              className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
              value={filters.billType}
              onChange={(e) => setFilters({...filters, billType: e.target.value})}
            >
              <option value="" className="bg-white dark:bg-slate-900">All Types</option>
              {billTypes.map(type => (
                <option key={type} value={type} className="bg-white dark:bg-slate-900">{type}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => setAppliedFilters(filters)}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-100"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="Total Bills" 
          value={(stats.totalBills ?? 0).toString()} 
          icon={<FileText className="w-6 h-6" />}
          color="blue"
        />
        <SummaryCard 
          title="Total Amount" 
          value={formatCurrency(stats.totalAmount)} 
          icon={<BarChart3 className="w-6 h-6" />}
          color="orange"
        />
        <SummaryCard 
          title="Paid Amount" 
          value={formatCurrency(stats.paidAmount)} 
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
        <SummaryCard 
          title="Pending Amount" 
          value={formatCurrency(stats.pendingAmount)} 
          icon={<Clock className="w-6 h-6" />}
          color="red"
        />
      </div>

      {/* Breakdown Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Breakdown by Type */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-orange-50 dark:border-slate-800 transition-colors">
          <h3 className="text-xl font-black text-text-primary mb-6 transition-colors">Breakdown by Type</h3>
          <div className="space-y-4">
            {breakdownByType.length > 0 ? breakdownByType.map(([type, data]) => (
              <div key={type} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl transition-colors">
                <div>
                  <p className="text-sm font-bold text-text-primary transition-colors">{type}</p>
                  <p className="text-xs text-text-secondary transition-colors">{data.count} bills</p>
                </div>
                <p className="text-sm font-black text-text-primary transition-colors">{formatCurrency(data.total)}</p>
              </div>
            )) : (
              <p className="text-center text-text-secondary py-8 transition-colors">No data available</p>
            )}
          </div>
        </div>

        {/* Breakdown by Status */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-orange-50 dark:border-slate-800 transition-colors">
          <h3 className="text-xl font-black text-text-primary mb-6 transition-colors">Breakdown by Status</h3>
          <div className="space-y-4">
            {breakdownByStatus.map(([status, data]) => (
              <div key={status} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl transition-colors">
                <div>
                  <p className="text-sm font-bold text-text-primary transition-colors">{status.replace('_', ' ')}</p>
                  <p className="text-xs text-text-secondary transition-colors">{data.count} bills</p>
                </div>
                <p className="text-sm font-black text-text-primary transition-colors">{formatCurrency(data.total)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-orange-50 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-2 mb-8">
          <Calendar className="w-6 h-6 text-orange-500" />
          <h3 className="text-xl font-black text-text-primary transition-colors">Monthly Breakdown</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {useMemo(() => {
            const year = appliedFilters.startDate ? new Date(appliedFilters.startDate).getFullYear() : new Date().getFullYear();
            return Array.from({ length: 12 }, (_, i) => {
              const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`;
              const billsInMonth = filteredData.filter(bill => {
                const d = new Date(bill.due_date);
                return d.getFullYear() === year && d.getMonth() === i;
              });
              const total = billsInMonth.reduce((sum, b) => sum + b.total_amount, 0);
              
              return (
                <div key={monthKey} className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl text-center border border-transparent hover:border-orange-200 dark:hover:border-orange-500/30 transition-all transition-colors">
                  <p className="text-xs font-bold text-text-secondary mb-1 transition-colors">{monthKey}</p>
                  <p className="text-lg font-black text-text-primary transition-colors">{billsInMonth.length}</p>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400 transition-colors">{formatCurrency(total)}</p>
                </div>
              );
            });
          }, [filteredData, appliedFilters.startDate])}
        </div>
      </div>

      {/* All Bills Table Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-orange-50 dark:border-slate-800 transition-colors">
        <div className="mb-8">
          <h3 className="text-xl font-black text-text-primary transition-colors">All Bills</h3>
          <p className="text-sm text-text-secondary font-medium transition-colors">Detailed list of all bills in the selected period</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-xs font-bold text-text-secondary uppercase tracking-widest transition-colors">
                <th className="px-4 py-2 cursor-pointer group hover:text-orange-500 transition-colors" onClick={() => requestSort('bill_number')}>
                  <div className="flex items-center gap-1.5">
                    Bill Number
                    {getSortIcon('bill_number')}
                  </div>
                </th>
                <th className="px-4 py-2 cursor-pointer group hover:text-orange-500 transition-colors" onClick={() => requestSort('bill_type')}>
                  <div className="flex items-center gap-1.5">
                    Type
                    {getSortIcon('bill_type')}
                  </div>
                </th>
                <th className="px-4 py-2 cursor-pointer group hover:text-orange-500 transition-colors" onClick={() => requestSort('project_name')}>
                  <div className="flex items-center gap-1.5">
                    Project
                    {getSortIcon('project_name')}
                  </div>
                </th>
                <th className="px-4 py-2 cursor-pointer group hover:text-orange-500 transition-colors" onClick={() => requestSort('due_date')}>
                  <div className="flex items-center gap-1.5">
                    Due Date
                    {getSortIcon('due_date')}
                  </div>
                </th>
                <th className="px-4 py-2 cursor-pointer group hover:text-orange-500 transition-colors" onClick={() => requestSort('status')}>
                  <div className="flex items-center gap-1.5">
                    Status
                    {getSortIcon('status')}
                  </div>
                </th>
                <th className="px-4 py-2 cursor-pointer group hover:text-orange-500 transition-colors text-right" onClick={() => requestSort('total_amount')}>
                  <div className="flex items-center justify-end gap-1.5">
                    Amount
                    {getSortIcon('total_amount')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((bill, idx) => (
                <tr key={bill.id} className={cn("group transition-all", idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-gray-50/50 dark:bg-slate-800/30")}>
                  <td className="px-4 py-4 text-sm font-bold text-text-primary border-y border-l border-transparent group-hover:border-orange-100 dark:group-hover:border-orange-500/30 rounded-l-xl transition-colors">
                    {bill.bill_number}
                  </td>
                  <td className="px-4 py-4 text-sm text-text-secondary border-y border-transparent group-hover:border-orange-100 dark:group-hover:border-orange-500/30 transition-colors">
                    {bill.bill_type}
                  </td>
                  <td className="px-4 py-4 text-sm text-text-secondary border-y border-transparent group-hover:border-orange-100 dark:group-hover:border-orange-500/30 transition-colors">
                    {bill.project_name}
                  </td>
                  <td className="px-4 py-4 text-sm text-text-secondary border-y border-transparent group-hover:border-orange-100 dark:group-hover:border-orange-500/30 transition-colors">
                    {bill.due_date}
                  </td>
                  <td className="px-4 py-4 border-y border-transparent group-hover:border-orange-100 dark:group-hover:border-orange-500/30 transition-colors">
                    {(() => {
                      switch (bill.status) {
                        case 'PAID':
                          return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-green-100 dark:bg-emerald-900/30 text-green-600 dark:text-emerald-400">Paid</span>;
                        case 'PENDING':
                        case 'OVERDUE':
                          return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-amber-900/30 text-orange-600 dark:text-amber-400">Pending</span>;
                        case 'Payment Confirmed':
                          return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Completed</span>;
                        default:
                          return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-text-secondary">{bill.status}</span>;
                      }
                    })()}
                  </td>
                  <td className="px-4 py-4 text-sm font-black text-text-primary text-right border-y border-r border-transparent group-hover:border-orange-100 dark:group-hover:border-orange-500/30 rounded-r-xl transition-colors">
                    {formatCurrency(bill.total_amount)}
                  </td>
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-secondary font-medium transition-colors">
                    No bills found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'orange' | 'green' | 'red';
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    green: 'bg-green-50 dark:bg-emerald-900/20 text-green-600 dark:text-emerald-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-orange-50 dark:border-slate-800 flex items-center gap-4 transition-colors">
      <div className={cn("p-4 rounded-2xl transition-colors", colorClasses[color])}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-text-secondary uppercase tracking-widest transition-colors">{title}</p>
        <p className="text-2xl font-black text-text-primary transition-colors">{value}</p>
      </div>
    </div>
  );
};
