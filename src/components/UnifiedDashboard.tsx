import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  IndianRupee, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  ArrowUpRight, 
  Search, 
  Download, 
  Zap,
  Sun,
  Smartphone,
  Building2,
  ShieldCheck,
  Wind,
  Trash2
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid
} from 'recharts';
import { motion } from 'motion/react';
import { formatCurrency, cn } from '../utils';
import { api } from '../services/api';
import { Bill } from '../types';
import { useSocket } from '../SocketContext';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import toast from 'react-hot-toast';
import { BillDetailsDrawer } from './BillDetailsDrawer';
import { PaymentModal } from './PaymentModal';

import { Skeleton } from './ui/Skeleton';

interface UnifiedDashboardProps {
  onNavigate?: (tab: string) => void;
}

export const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: 'all', status: 'all' });
  const [searchTerm, setSearchTerm] = useState('');
  const { socket } = useSocket();
  const { user } = useAuth();
  const { theme } = useTheme();

  const ROLE_MODULES_MAPPING: Record<string, { label: string, categories: string[], modules: string[] }> = {
    ADMIN: { 
      label: 'Administrator', 
      categories: ['utility', 'telecom', 'insurance', 'government_tax', 'government_compliance', 'other'],
      modules: ['Electricity', 'Solar', 'Telecom', 'Insurance', 'Government Tax', 'Pollution Control']
    },
    MANAGER: { 
      label: 'Manager', 
      categories: ['utility', 'telecom', 'insurance', 'government_tax', 'government_compliance', 'other'],
      modules: ['Electricity', 'Solar', 'Telecom', 'Insurance', 'Government Tax', 'Pollution Control']
    },
    DATA_ENTRY: { 
      label: 'Data Entry - Utility', 
      categories: ['utility', 'telecom'],
      modules: ['Electricity', 'Solar', 'Telecom']
    },
    INSURANCE_ENTRY: { 
      label: 'Insurance Entry', 
      categories: ['insurance'],
      modules: ['Insurance']
    },
    GOV_TAX_ENTRY: { 
      label: 'Gov Tax Entry', 
      categories: ['government_tax', 'government_compliance'],
      modules: ['Property Tax', 'Diversion Tax', 'Pollution Control']
    },
    ACCOUNT_MANAGEMENT: {
      label: 'Account Management',
      categories: ['utility', 'telecom'],
      modules: ['Electricity', 'Solar', 'Telecom']
    },
    ACCOUNT_MANAGER: {
      label: 'Account Manager',
      categories: ['utility', 'telecom', 'insurance'],
      modules: ['Electricity', 'Solar', 'Telecom', 'Insurance']
    }
  };

  const userPermissions = useMemo(() => {
    if (user?.permissions) {
      const allowedModules = Object.entries(user.permissions)
        .filter(([_, perms]) => perms.view)
        .map(([id, _]) => {
          // Map ID back to Label for display
          switch(id) {
            case 'electricity': return 'Electricity';
            case 'solar': return 'Solar';
            case 'telecom': return 'Telecom';
            case 'insurance': return 'Insurance';
            case 'government': return 'Government Tax';
            case 'pollution': return 'Pollution Control';
            default: return id;
          }
        });
      
      return {
        label: user.role,
        categories: allowedModules.map(m => m.toLowerCase().replace(' ', '_')),
        modules: allowedModules
      };
    }
    return user?.role ? (ROLE_MODULES_MAPPING[user.role] || ROLE_MODULES_MAPPING.ADMIN) : ROLE_MODULES_MAPPING.ADMIN;
  }, [user?.role, user?.permissions]);

  const processedData = useMemo(() => {
    if (!data) return null;
    return data;
  }, [data]);

  const displayData = processedData || data;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const isRestricted = user?.role !== 'ADMIN' && user?.role !== 'MANAGER';
      const summary = await api.getDashboardSummary(isRestricted ? userPermissions.categories : undefined);
      setData(summary);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (socket) {
      socket.on('dashboard_update', fetchData);
      return () => {
        socket.off('dashboard_update', fetchData);
      };
    }
  }, [socket, user?.role]);

  const handleDelete = (id: string | number) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteBill(itemToDelete);
      fetchData();
      toast.success('Document deleted successfully');
      setIsDeleteModalOpen(false);
    } catch (err) {
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleBillClick = async (billId: string | number) => {
    try {
      const fullBill = await api.getBillById(billId);
      setSelectedBill(fullBill);
      setIsDetailsModalOpen(true);
    } catch (err) {
      toast.error('Failed to load bill details');
    }
  };

  const handleMarkPaid = (bill: Bill) => {
    setSelectedBill(bill);
    setIsDetailsModalOpen(false);
    setIsPaymentModalOpen(true);
  };

  const getModuleIcon = (mod: string) => {
    switch (mod) {
      case 'Electricity': return <Zap className="w-5 h-5" />;
      case 'Solar': return <Sun className="w-5 h-5" />;
      case 'Telecom': return <Smartphone className="w-5 h-5" />;
      case 'Insurance': return <ShieldCheck className="w-5 h-5" />;
      case 'Government Tax': return <Building2 className="w-5 h-5" />;
      case 'Pollution Control': return <Wind className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getModulePath = (mod: string) => {
    switch (mod) {
      case 'Electricity': return 'electricity';
      case 'Solar': return 'solar';
      case 'Telecom': return 'telecom';
      case 'Insurance': return 'insurance';
      case 'Government Tax': return 'government';
      case 'Pollution Control': return 'pollution';
      default: return 'bills';
    }
  };

  const handlePaymentSuccess = async (updatedBill: Bill) => {
    try {
      await api.saveBill(updatedBill);
      toast.success('Payment recorded successfully');
      fetchData();
      setIsPaymentModalOpen(false);
    } catch (err) {
      toast.error('Failed to update payment status');
    }
  };

  const filteredBills = useMemo(() => {
    if (!data?.recentDocuments) return [];
    return data.recentDocuments.filter((bill: Bill) => {
      const matchesCategory = filter.category === 'all' || bill.category === filter.category;
      const matchesStatus = filter.status === 'all' || bill.status === filter.status;
      const matchesSearch = bill.billId?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          bill.propertyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          bill.utilityType?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [data, filter, searchTerm]);

  if (loading && !data) {
    return (
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-start">
                <Skeleton variant="card" className="w-12 h-12 rounded-2xl" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2 h-[500px] bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 space-y-6">
            <div className="flex justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="w-full h-[300px] rounded-2xl" />
          </div>
          <div className="lg:col-span-1 h-[500px] bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
            </div>
          </div>
          <div className="lg:col-span-1 h-[500px] bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categoryData = Object.entries(data?.categoryCounts || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
    value
  }));

  const COLORS = ['#F97316', '#3B82F6', '#10B981', '#6366F1', '#8B5CF6'];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] font-black rounded uppercase tracking-widest border border-orange-200 dark:border-orange-800/30">
              Role: {userPermissions.label}
            </span>
            <div className="flex gap-1">
              {userPermissions.modules.map(mod => (
                <span key={mod} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold rounded capitalize">
                  {mod}
                </span>
              ))}
            </div>
          </div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Unified Dashboard</h1>
          <p className="text-text-secondary font-medium">Real-time aggregate data across your assigned modules</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              const headers = ['Document ID', 'Category', 'Amount', 'Status', 'Date'];
              const rows = data?.recentDocuments?.map((b: any) => [
                b.billId,
                b.category,
                b.amount,
                b.status,
                b.createdAt
              ]);
              const csvContent = "data:text/csv;charset=utf-8," 
                + headers.join(",") + "\n"
                + rows.map((e: any) => e.join(",")).join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", "dashboard_summary.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-text-primary hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {user?.role !== 'DATA_ENTRY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <SummaryCard 
            title="Total Documents" 
            value={displayData?.totalDocuments || 0} 
            icon={<FileText className="w-6 h-6" />}
            trend="All registered assets"
            color="blue"
          />
          <SummaryCard 
            title="Total Amount" 
            value={formatCurrency(displayData?.totalAmount || 0)} 
            icon={<IndianRupee className="w-6 h-6" />}
            trend="Total value"
            color="orange"
          />
          <SummaryCard 
            title="Completed Bills" 
            value={displayData?.statusCounts?.Paid || displayData?.statusCounts?.PAID || 0}
            icon={<CheckCircle2 className="w-6 h-6" />}
            trend="Paid & Confirmed"
            color="green"
          />
          <SummaryCard 
            title="Pending Bills" 
            value={displayData?.statusCounts?.Pending || displayData?.statusCounts?.PENDING || 0}
            icon={<AlertCircle className="w-6 h-6" />}
            trend="Awaiting payment"
            color="yellow"
          />
          <SummaryCard 
            title="Overdue Bills" 
            value={displayData?.statusCounts?.Overdue || displayData?.statusCounts?.OVERDUE || 0}
            icon={<Clock className="w-6 h-6" />}
            trend="Action required"
            color="red"
            onClick={() => {
              const overdueWidget = document.getElementById('overdue-summary-widget');
              overdueWidget?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>
      )}

      {/* Quick Access Modules */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-orange-500 transition-colors"></div>
          <h2 className="text-xl font-black text-text-primary tracking-tight transition-colors">Quick Access Modules</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {userPermissions.modules.map((mod) => (
            <motion.div
              key={mod}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate?.(getModulePath(mod))}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-orange-100 dark:hover:border-orange-500/30 transition-all cursor-pointer group text-center transition-colors"
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                {getModuleIcon(mod)}
              </div>
              <p className="text-xs font-black text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors capitalize">
                {mod}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-slate-500 font-bold mt-1 uppercase tracking-tighter transition-colors">
                Enter Data
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Monthly Expense Trends */}
        {user?.role !== 'DATA_ENTRY' && (
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-text-primary tracking-tight">Monthly Expense Trends</h3>
                <p className="text-xs font-medium text-text-secondary">Spending patterns over the last 6 months</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-widest">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                Trends
              </div>
            </div>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayData?.trendData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#E5E7EB'} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: theme === 'dark' ? '#94A3B8' : '#6B7280' }} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: theme === 'dark' ? '#94A3B8' : '#6B7280' }}
                    tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF',
                      color: theme === 'dark' ? '#F8FAFC' : '#1E293B'
                    }}
                    itemStyle={{ color: theme === 'dark' ? '#F8FAFC' : '#1E293B' }}
                    formatter={(val: number) => [formatCurrency(val), 'Amount']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#F97316" 
                    strokeWidth={4} 
                    dot={{ fill: '#F97316', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between">
              <div className="flex gap-8">
                {(displayData?.trendData || []).slice(-3).map((item: any) => (
                  <div key={item.month} className="flex flex-col">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{item.month}</span>
                    <span className="text-sm font-black text-text-primary">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Overdue Bills Summary Widget */}
        <div id="overdue-summary-widget" className={cn("bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col h-[500px]", user?.role === 'DATA_ENTRY' ? "lg:col-span-2" : "lg:col-span-1")}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-black text-text-primary tracking-tight leading-tight">Overdue Bills Summary</h3>
              <p className="text-[10px] font-medium text-red-500 uppercase tracking-wider">Immediate action</p>
            </div>
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold">
              {displayData?.alerts?.filter((a: any) => a.type === 'expiry').length || 0} Total
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {displayData?.alerts?.filter((a: any) => a.type === 'expiry').length > 0 ? (
              displayData.alerts.filter((a: any) => a.type === 'expiry').map((alert: any, idx: number) => (
                <div 
                  key={idx} 
                  onClick={() => handleBillClick(alert.billId)}
                  className="p-4 rounded-2xl border bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 flex flex-col gap-2 transition-all hover:scale-[1.02] cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 shrink-0">
                        {getCategoryIcon(alert.category)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400 truncate">OVERDUE</p>
                        <p className="text-[9px] font-bold text-text-secondary capitalize truncate">{alert.category}</p>
                      </div>
                    </div>
                    <p className="text-xs font-black text-text-primary shrink-0">{formatCurrency(alert.amount)}</p>
                  </div>
                  <p className="text-xs font-bold text-text-primary leading-tight line-clamp-2">{alert.message}</p>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-red-100/50 dark:border-red-900/20">
                    <p className="text-[9px] font-bold text-text-secondary font-mono">DUE: {alert.date}</p>
                    <ArrowUpRight className="w-3 h-3 text-text-secondary" />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-40 py-12">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <p className="text-sm font-bold text-text-primary">Great! No overdue bills.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Bills Widget */}
        <div id="upcoming-bills-widget" className={cn("bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col h-[500px]", user?.role === 'DATA_ENTRY' ? "lg:col-span-2" : "lg:col-span-1")}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-black text-text-primary tracking-tight leading-tight">Upcoming Bills</h3>
              <p className="text-[10px] font-medium text-blue-500 dark:text-blue-400 uppercase tracking-wider">Payments this week</p>
            </div>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold">
              {displayData?.alerts?.filter((a: any) => a.type === 'due').length || 0} Total
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {displayData?.alerts?.filter((a: any) => a.type === 'due').length > 0 ? (
              displayData.alerts.filter((a: any) => a.type === 'due').map((alert: any, idx: number) => (
                <div 
                  key={idx} 
                  onClick={() => handleBillClick(alert.billId)}
                  className="p-4 rounded-2xl border bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 flex flex-col gap-2 transition-all hover:scale-[1.02] cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 shrink-0">
                        {getCategoryIcon(alert.category)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 truncate">UPCOMING</p>
                        <p className="text-[9px] font-bold text-text-secondary capitalize truncate">{alert.category}</p>
                      </div>
                    </div>
                    <p className="text-xs font-black text-text-primary shrink-0">{formatCurrency(alert.amount)}</p>
                  </div>
                  <p className="text-xs font-bold text-text-primary leading-tight line-clamp-2">{alert.message}</p>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-blue-100/50 dark:border-blue-900/20">
                    <p className="text-[9px] font-bold text-text-secondary font-mono">DUE: {alert.date}</p>
                    <ArrowUpRight className="w-3 h-3 text-text-secondary" />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-40 py-12">
                <CheckCircle2 className="w-12 h-12 text-blue-500" />
                <p className="text-sm font-bold text-text-primary">No bills due in the next 7 days.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Subcategory Breakdown */}
        {user?.role !== 'DATA_ENTRY' && (
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-xl font-black text-text-primary tracking-tight mb-8">Asset Split</h3>
            <div className="h-[240px] mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(displayData?.subcategoryCounts || {}).map(([name, value]) => ({ name, value }))}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {Object.keys(displayData?.subcategoryCounts || {}).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF',
                      color: theme === 'dark' ? '#F8FAFC' : '#1E293B'
                    }}
                    itemStyle={{ color: theme === 'dark' ? '#F8FAFC' : '#1E293B' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 prose prose-sm max-w-none">
              {Object.entries(displayData?.subcategoryCounts || {}).slice(0, 5).map(([name, count], idx) => (
                <div key={name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-xs font-bold text-text-secondary capitalize">{name.replace('_', ' ')}</span>
                  </div>
                  <span className="text-xs font-black text-text-primary">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents Table / Recent Activity */}
        <div className={cn("bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col", user?.role === 'DATA_ENTRY' ? "lg:col-span-4" : "lg:col-span-3")}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h3 className="text-xl font-black text-text-primary tracking-tight">Recent Activity Feed</h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  className="pl-9 pr-4 py-2 h-10 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold text-text-primary focus:ring-2 focus:ring-orange-500/20 transition-all w-[240px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[400px] custom-scrollbar px-2">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 dark:border-slate-800">
                  <th className="pb-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Document</th>
                  <th className="pb-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest px-4">Category</th>
                  <th className="pb-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest px-4">Total Amount</th>
                  <th className="pb-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest px-4">Status</th>
                  <th className="pb-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {filteredBills.length > 0 ? filteredBills.map((bill: any) => (
                  <tr 
                    key={bill.id || bill._id} 
                    onClick={() => handleBillClick(bill.id || bill._id)}
                    className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                          {getCategoryIcon(bill.category)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-text-primary leading-none mb-1">{bill.utilityType}</p>
                          <p className="text-[10px] font-bold text-text-secondary">{bill.billId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-text-secondary rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        {bill.category || 'Other'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-black text-text-primary">{formatCurrency(bill.amount, { inLakhs: bill.subcategory === 'pollution_control' })}</td>
                    <td className="py-4 px-4">
                      <StatusBadge status={bill.status} />
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-text-secondary hover:text-orange-600 shadow-sm border border-transparent hover:border-orange-100 dark:hover:border-orange-500/30">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(bill.id || bill._id!);
                            }}
                            className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-text-secondary hover:text-red-600 shadow-sm border border-transparent hover:border-red-100 dark:hover:border-red-500/30"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-secondary text-xs font-bold">No documents found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Delete Dashboard Entry"
        message="Are you sure you want to remove this document from the dashboard? This action will permanently remove the record."
      />

      <BillDetailsDrawer
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedBill(null);
          fetchData();
        }}
        bill={selectedBill}
        onEdit={(bill) => {
          setSelectedBill(bill);
          toast.success('Redirecting to editor...');
        }}
        onMarkPaid={handleMarkPaid}
        onDelete={handleDelete}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        bill={selectedBill}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

const SummaryCard = ({ title, value, icon, trend, color, onClick }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/30',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800/30',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800/30',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/30',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800/30',
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", colors[color])}>
          {icon}
        </div>
        <div className="flex items-center gap-1 overflow-hidden">
          <span className={cn(
            "text-[10px] font-bold whitespace-nowrap transition-colors", 
            color === 'red' ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-emerald-400'
          )}>
            {trend}
          </span>
        </div>
      </div>
      <div>
        <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-1">{title}</h4>
        <div className="text-2xl font-black text-text-primary">{value}</div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    Paid: 'bg-green-50 dark:bg-emerald-900/20 text-green-600 dark:text-emerald-400',
    Pending: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    Overdue: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    'Payment Confirmed': 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    Rejected: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };
  return (
    <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors", styles[status] || styles.Pending)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'utility': return <Zap className="w-4 h-4 text-orange-500" />;
    case 'telecom': return <Smartphone className="w-4 h-4 text-blue-500" />;
    case 'insurance': return <ShieldCheck className="w-4 h-4 text-green-500" />;
    case 'government_tax': return <Building2 className="w-4 h-4 text-purple-500" />;
    case 'government_compliance': return <Wind className="w-4 h-4 text-green-600" />;
    default: return <FileText className="w-4 h-4 text-gray-500" />;
  }
};
