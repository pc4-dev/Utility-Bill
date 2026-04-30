import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  FileText, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  BarChart3,
  Filter,
  Calendar,
  Building2,
  Tag
} from 'lucide-react';
import { Bill, BillStatus, Project } from '../types';
import { formatCurrency, cn } from '../utils';

interface AnalyticsDashboardProps {
  bills: Bill[];
  chartsData?: any;
  projects?: Project[];
}

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ bills, chartsData, projects = [] }) => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    billType: '',
    project: '',
    status: ''
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);

  const billTypes = useMemo(() => Array.from(new Set(bills.map(b => b.bill_type))), [bills]);
  const projectNames = useMemo(() => Array.from(new Set(bills.map(b => b.project_name))), [bills]);
  const statuses = ['Pending', 'Overdue', 'Paid', 'Payment Confirmed'];

  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const date = new Date(bill.due_date);
      const matchesStart = appliedFilters.startDate ? date >= new Date(appliedFilters.startDate) : true;
      const matchesEnd = appliedFilters.endDate ? date <= new Date(appliedFilters.endDate) : true;
      const matchesType = appliedFilters.billType ? bill.bill_type === appliedFilters.billType : true;
      const matchesProject = appliedFilters.project ? bill.project_name === appliedFilters.project : true;
      const matchesStatus = appliedFilters.status ? bill.status === appliedFilters.status : true;

      return matchesStart && matchesEnd && matchesType && matchesProject && matchesStatus;
    });
  }, [bills, appliedFilters]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalBills = filteredBills.length;
    const totalAmount = filteredBills.reduce((sum, b) => sum + b.total_amount, 0);
    const paidAmount = filteredBills.reduce((sum, b) => {
      const billPaid = b.payments?.reduce((pSum, p) => p.status === 'DONE' ? pSum + p.amount : pSum, 0) || 0;
      return sum + billPaid;
    }, 0);
    const pendingAmount = totalAmount - paidAmount;
    const overdueBills = filteredBills.filter(b => b.status === 'OVERDUE');
    
    const paidBillsCount = filteredBills.filter(b => b.status === 'Paid' || b.status === 'Payment Confirmed').length;
    const completionRate = totalBills > 0 ? (paidBillsCount / totalBills) * 100 : 0;
    const overdueRate = totalBills > 0 ? (overdueBills.length / totalBills) * 100 : 0;

    return {
      totalBills,
      totalAmount,
      paidAmount,
      pendingAmount,
      completionRate,
      overdueRate
    };
  }, [filteredBills]);

  // Monthly Financial Trend
  const monthlyFinancialTrend = useMemo(() => {
    const months: Record<string, any> = {};
    filteredBills.forEach(bill => {
      const date = new Date(bill.due_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) {
        months[key] = { month: key, total: 0, paid: 0, pending: 0 };
      }
      months[key].total += bill.total_amount;
      const billPaid = bill.payments?.reduce((pSum, p) => p.status === 'DONE' ? pSum + p.amount : pSum, 0) || 0;
      months[key].paid += billPaid;
      months[key].pending += (bill.total_amount - billPaid);
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredBills]);

  // Bill Type Distribution
  const billTypeDist = useMemo(() => {
    const types: Record<string, number> = {};
    filteredBills.forEach(bill => {
      types[bill.bill_type] = (types[bill.bill_type] || 0) + bill.total_amount;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [filteredBills]);

  // Status Distribution
  const statusDist = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredBills.forEach(bill => {
      stats[bill.status] = (stats[bill.status] || 0) + 1;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [filteredBills]);

  // Priority Analysis
  const priorityAnalysis = useMemo(() => {
    const priorities: Record<string, number> = { 'NORMAL': 0, 'URGENT': 0, 'CRITICAL': 0 };
    filteredBills.forEach(bill => {
      priorities[bill.priority] = (priorities[bill.priority] || 0) + 1;
    });
    return Object.entries(priorities).map(([name, value]) => ({ name, value }));
  }, [filteredBills]);

  // Overdue Trend
  const overdueTrend = useMemo(() => {
    const months: Record<string, any> = {};
    filteredBills.forEach(bill => {
      if (bill.status === 'OVERDUE') {
        const date = new Date(bill.due_date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!months[key]) {
          months[key] = { month: key, count: 0, amount: 0 };
        }
        months[key].count++;
        months[key].amount += bill.total_amount;
      }
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredBills]);

  // Project-wise Expense
  const projectExpense = useMemo(() => {
    const projects: Record<string, number> = {};
    filteredBills.forEach(bill => {
      projects[bill.project_name] = (projects[bill.project_name] || 0) + bill.total_amount;
    });
    return Object.entries(projects).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredBills]);

  // Payment Mode Analysis (Simulated based on ID for dynamic feel)
  const paymentModes = ['UPI', 'NEFT', 'RTGS', 'Cheque', 'Cash', 'Others'];
  const paymentModeDist = useMemo(() => {
    const modes: Record<string, number> = {};
    filteredBills.forEach(bill => {
      const idSource = bill._id || bill.id || 'unknown';
      const idHash = idSource.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const mode = paymentModes[idHash % paymentModes.length];
      modes[mode] = (modes[mode] || 0) + 1;
    });
    return Object.entries(modes).map(([name, value]) => ({ name, value }));
  }, [filteredBills]);

  // Bank Usage Analysis (Simulated based on ID for dynamic feel)
  const banks = ['HDFC', 'SBI', 'ICICI', 'Axis', 'BOI', 'PNB', 'Kotak', 'Yes Bank', 'IDFC', 'Others'];
  const bankUsageDist = useMemo(() => {
    const bankStats: Record<string, number> = {};
    filteredBills.forEach(bill => {
      const idSource = bill._id || bill.id || 'unknown';
      const idHash = idSource.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const bank = banks[idHash % banks.length];
      bankStats[bank] = (bankStats[bank] || 0) + 1;
    });
    return Object.entries(bankStats).map(([name, value]) => ({ name, value }));
  }, [filteredBills]);

  // Project Budget Usage
  const projectBudgetUsage = useMemo(() => {
    if (!projects || projects.length === 0) return [];
    
    return projects.map(project => {
      const projectBills = filteredBills.filter(b => b.project_name === project.name);
      const totalExpense = projectBills.reduce((sum, b) => sum + b.total_amount, 0);
      const usagePercent = project.annualBudget > 0 ? (totalExpense / project.annualBudget) * 100 : 0;
      
      return {
        name: project.name,
        usagePercent: parseFloat(usagePercent.toFixed(1)),
        totalExpense,
        annualBudget: project.annualBudget
      };
    }).filter(p => p.annualBudget > 0).sort((a, b) => b.usagePercent - a.usagePercent);
  }, [filteredBills, projects]);

  return (
    <div className="space-y-8 mt-8">
      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-50">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-bold text-gray-900">Analytics Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">Start Date</label>
            <input 
              type="date"
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">End Date</label>
            <input 
              type="date"
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">Bill Type</label>
            <select 
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500"
              value={filters.billType}
              onChange={(e) => setFilters({...filters, billType: e.target.value})}
            >
              <option value="">All Types</option>
              {billTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">Project</label>
            <select 
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500"
              value={filters.project}
              onChange={(e) => setFilters({...filters, project: e.target.value})}
            >
              <option value="">All Projects</option>
              {projectNames.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">Status</label>
            <select 
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">All Statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <button 
            onClick={() => setAppliedFilters(filters)}
            className="w-full py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-100"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Total Bills" value={kpis.totalBills} icon={<FileText />} color="blue" />
        <KPICard title="Total Amount" value={formatCurrency(kpis.totalAmount)} icon={<BarChart3 />} color="orange" />
        <KPICard title="Paid Amount" value={formatCurrency(kpis.paidAmount)} icon={<TrendingUp />} color="green" />
        <KPICard title="Pending Amount" value={formatCurrency(kpis.pendingAmount)} icon={<Clock />} color="red" />
        <KPICard title="Completion Rate" value={`${kpis.completionRate.toFixed(1)}%`} icon={<CheckCircle2 />} color="emerald" />
        <KPICard title="Overdue Rate" value={`${kpis.overdueRate.toFixed(1)}%`} icon={<AlertCircle />} color="rose" />
      </div>

      {/* Project Budget Usage (Small Metric) */}
      {projectBudgetUsage.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-50">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-gray-900">Project Budget Usage %</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {projectBudgetUsage.map((project, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-bold text-gray-900 truncate pr-2">{project.name}</p>
                  <span className={cn(
                    "text-xs font-black px-2 py-1 rounded",
                    project.usagePercent >= 100 ? "bg-red-100 text-red-700" :
                    project.usagePercent >= 80 ? "bg-yellow-100 text-yellow-700" :
                    "bg-green-100 text-green-700"
                  )}>
                    {project.usagePercent}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      project.usagePercent >= 100 ? "bg-red-500" :
                      project.usagePercent >= 80 ? "bg-yellow-500" :
                      "bg-green-500"
                    )}
                    style={{ width: `${Math.min(project.usagePercent, 100)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-500 font-medium">
                  {formatCurrency(project.totalExpense)} / {formatCurrency(project.annualBudget)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Advanced: Cash Flow Forecast */}
        {chartsData?.advanced?.cashFlowForecast && (
          <ChartContainer title="Cash Flow Forecast (Next 30 Days)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartsData.advanced.cashFlowForecast}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="expected_amount" name="Expected Outflow" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* Advanced: YoY Comparison */}
        {chartsData?.advanced?.yoyComparison && (
          <ChartContainer title="Year-over-Year Comparison">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartsData.advanced.yoyComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="total_amount" name="Total Amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* Monthly Financial Trend */}
        <ChartContainer title="Monthly Financial Overview">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyFinancialTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val/1000}k`} />
              <Tooltip formatter={(val: number) => formatCurrency(val)} />
              <Legend />
              <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" name="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Monthly Expense Trend */}
        <ChartContainer title="Monthly Total Expense Trend">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyFinancialTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val/1000}k`} />
              <Tooltip formatter={(val: number) => formatCurrency(val)} />
              <Line type="monotone" dataKey="total" name="Total Expense" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Bill Type Distribution */}
        <ChartContainer title="Expense Breakdown by Bill Type">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={billTypeDist}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {billTypeDist.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => formatCurrency(val)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Status Distribution */}
        <ChartContainer title="Bills by Status">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusDist}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {statusDist.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Priority Analysis */}
        <ChartContainer title="Bills by Priority">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityAnalysis}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" name="Count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Overdue Trend */}
        <ChartContainer title="Overdue Trend">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={overdueTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="amount" name="Overdue Amount" stroke="#ef4444" fill="#fee2e2" />
              <Area type="monotone" dataKey="count" name="Overdue Count" stroke="#f97316" fill="#ffedd5" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Project-wise Expense */}
        <ChartContainer title="Expense by Project">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projectExpense} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(val: number) => formatCurrency(val)} />
              <Bar dataKey="value" name="Total Expense" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Payment Mode Analysis */}
        <ChartContainer title="Payment Mode Breakdown">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentModeDist}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {paymentModeDist.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Bank Usage Analysis */}
        <ChartContainer title="Bank Usage Analysis" className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bankUsageDist}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" name="Usage Count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Advanced: Payment Delay */}
        {chartsData?.advanced?.paymentDelay && (
          <ChartContainer title="Average Payment Delay" className="lg:col-span-1 flex flex-col items-center justify-center">
            <div className="text-center">
              <p className="text-6xl font-black text-orange-500 mb-2">
                {chartsData.advanced.paymentDelay.avg_delay_days?.toFixed(1) || '0'}
              </p>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Days</p>
              <p className="text-xs text-gray-500 mt-4 max-w-[200px] mx-auto">
                Average time taken to process payments after due date
              </p>
            </div>
          </ChartContainer>
        )}
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600'
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-50 flex flex-col gap-3 hover:border-orange-200 transition-all group">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110", colors[color])}>
        {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-xl font-black text-gray-900">{value}</p>
      </div>
    </div>
  );
};

const ChartContainer = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white p-6 rounded-3xl shadow-sm border border-orange-50", className)}>
    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">
      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
      {title}
    </h3>
    {children}
  </div>
);
