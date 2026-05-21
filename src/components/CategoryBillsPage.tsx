import React, { useState, useMemo, useEffect } from 'react';
import { Bill, Project, BillType } from '../types';
import { BillList } from './BillList';
import { SummaryCards } from './SummaryCards';
import { Plus, Search, Filter, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency } from '../utils';
import { api } from '../services/api';

interface CategoryBillsPageProps {
  categoryName: string;
  bills: Bill[];
  projects: Project[];
  isLoading: boolean;
  onEdit: (bill: Bill) => void;
  onView: (bill: Bill) => void;
  onMarkPaid: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
  onAdd: () => void;
}

export const CategoryBillsPage: React.FC<CategoryBillsPageProps> = ({
  categoryName,
  bills,
  projects,
  isLoading,
  onEdit,
  onView,
  onMarkPaid,
  onDelete,
  onAdd
}) => {
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [companies, setCompanies] = useState<string[]>([]);

  const categoryBills = useMemo(() => {
    return bills.filter(b => b.utilityType === categoryName);
  }, [bills, categoryName]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const fetchedCompanies = await api.getCompanies();
        setCompanies(fetchedCompanies.filter(c => c.status === 'Active').map(c => c.companyName));
      } catch (err) {
        console.error('Failed to fetch companies:', err);
      }
    };
    fetchCompanies();
  }, []);

  const filteredBills = useMemo(() => {
    return categoryBills.filter(bill => {
      const matchesSearch = search ? (
        bill.billId.toLowerCase().includes(search.toLowerCase()) ||
        bill.propertyName.toLowerCase().includes(search.toLowerCase()) ||
        bill.billNumber?.toLowerCase().includes(search.toLowerCase())
      ) : true;
      const matchesProperty = propertyFilter ? bill.propertyName === propertyFilter : true;
      const matchesCompany = companyFilter ? bill.companyName === companyFilter : true;
      const matchesStatus = statusFilter ? bill.status === statusFilter : true;
      const matchesRegion = regionFilter ? (
        (bill.district?.toLowerCase().includes(regionFilter.toLowerCase())) ||
        (bill.zoneWard?.toLowerCase().includes(regionFilter.toLowerCase()))
      ) : true;
      return matchesSearch && matchesProperty && matchesCompany && matchesStatus && matchesRegion;
    });
  }, [categoryBills, search, propertyFilter, companyFilter, statusFilter, regionFilter]);

  const properties = useMemo(() => Array.from(new Set(projects.map(p => p.name))), [projects]);
  const statuses = [
    'Pending',
    'Verified',
    'Approved',
    'Payment Initiated',
    'Payment Confirmed',
    'Tally Entry',
    'Paid'
  ];

  const stats = useMemo(() => {
    const total = filteredBills.reduce((sum, b) => sum + b.amount, 0);
    const completedStatuses = ['Payment Confirmed', 'Tally Entry', 'Paid'];
    const pending = filteredBills.filter(b => !completedStatuses.includes(b.status || '')).reduce((sum, b) => sum + b.amount, 0);
    const paid = filteredBills.filter(b => completedStatuses.includes(b.status || '')).reduce((sum, b) => sum + b.amount, 0);
    
    return { total, pending, paid, count: filteredBills.length };
  }, [filteredBills]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary transition-colors">{categoryName} Bills</h1>
          <p className="text-text-secondary font-medium transition-colors">Manage all {categoryName.toLowerCase()} related expenses</p>
        </div>
        {/* New bill button hidden as per user request */}
        {false && (
          <button 
            onClick={onAdd}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 dark:shadow-primary/5"
          >
            <Plus className="w-5 h-5" />
            Add {categoryName} Bill
          </button>
        )}
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Bills" value={(stats.count ?? 0).toString()} subValue="Entries" color="blue" />
        <StatCard label="Total Amount" value={formatCurrency(stats.total)} subValue="All time" color="orange" />
        <StatCard label="In Progress" value={formatCurrency(stats.pending)} subValue="Awaiting completion" color="red" />
        <StatCard label="Completed" value={formatCurrency(stats.paid)} subValue="Settled" color="green" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 transition-colors">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input 
            type="text"
            placeholder="Search by Bill ID, Property or Invoice #..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-text-secondary/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full md:w-64 relative">
          <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
          <select 
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
          >
            <option value="" className="dark:bg-slate-900">All Properties</option>
            {properties.map(p => <option key={p} value={p} className="dark:bg-slate-900">{p}</option>)}
          </select>
        </div>

        <div className="w-full md:w-64 relative">
          <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
          <select 
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
          >
            <option value="" className="dark:bg-slate-900">All Companies</option>
            {companies.map(c => <option key={c} value={c} className="dark:bg-slate-900">{c}</option>)}
          </select>
        </div>

        <div className="w-full md:w-64 relative">
          <Clock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
          <select 
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="" className="dark:bg-slate-900">All Statuses</option>
            {statuses.map(s => <option key={s} value={s} className="dark:bg-slate-900">{s}</option>)}
          </select>
        </div>

        {(categoryName === 'Property Tax (MCG)' || categoryName === 'Diversion Tax (RD)') && (
          <div className="w-full md:w-64 relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input 
              type="text"
              placeholder={categoryName === 'Property Tax (MCG)' ? "Search Zone/Ward" : "Search District"}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-text-secondary/50"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
            />
          </div>
        )}
      </div>

      <BillList 
        bills={filteredBills} 
        isLoading={isLoading}
        onEdit={onEdit}
        onView={onView}
        onMarkPaid={onMarkPaid}
        onDelete={onDelete}
      />
    </motion.div>
  );
};

const StatCard = ({ label, value, subValue, color }: { label: string, value: string, subValue: string, color: 'blue' | 'orange' | 'red' | 'green' }) => {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30'
  };

  return (
    <div className={`p-5 rounded-2xl border ${colors[color]} shadow-sm transition-all hover:scale-[1.02]`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">{label}</p>
      <p className="text-xl font-black truncate">{value}</p>
      <p className="text-[10px] font-medium opacity-60 mt-1">{subValue}</p>
    </div>
  );
};
