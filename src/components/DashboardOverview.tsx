import React from 'react';
import { 
  IndianRupee, 
  TrendingUp, 
  FileText, 
  AlertCircle, 
  ArrowUpCircle, 
  MinusCircle, 
  CheckCircle2,
  Tag
} from 'lucide-react';
import { formatCurrency, cn } from '../utils';
import { Bill, Project } from '../types';

interface DashboardOverviewProps {
  stats: any[];
  financial: any;
  byType: any[];
  byPriority: any[];
  onFilterStatus?: (status: string | null) => void;
  activeFilter?: string | null;
  bills?: Bill[];
  projects?: Project[];
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ 
  stats, 
  financial, 
  byType, 
  byPriority,
  onFilterStatus,
  activeFilter,
  bills = [],
  projects = []
}) => {
  const getStat = (status: string) => stats.find(s => s.status === status) || { count: 0, total_amount: 0 };
  
  const totalBillsCount = stats.reduce((acc, s) => acc + s.count, 0);
  const totalBillsAmount = stats.reduce((acc, s) => acc + s.total_amount, 0);

  const statusCards = [
    { id: 'TOTAL', label: 'Total Bills', count: totalBillsCount, amount: totalBillsAmount, color: 'text-blue-600', border: 'border-blue-600' },
    { id: 'PAID', label: 'Paid', ...getStat('PAID'), color: 'text-green-600', border: 'border-green-600' },
    { id: 'OVERDUE', label: 'Overdue', ...getStat('OVERDUE'), color: 'text-red-600', border: 'border-red-600' },
    { id: 'PENDING', label: 'Pending', ...getStat('PENDING'), color: 'text-orange-600', border: 'border-orange-600' },
  ];

  const priorities = [
    { id: 'URGENT_PRIO', label: 'Urgent', color: 'bg-red-50 text-red-600', count: byPriority.find(p => p.priority === 'URGENT')?.count || 0 },
    { id: 'CRITICAL_PRIO', label: 'High', color: 'bg-orange-50 text-orange-600', count: byPriority.find(p => p.priority === 'CRITICAL')?.count || 0 },
    { id: 'NORMAL_PRIO', label: 'Medium', color: 'bg-blue-50 text-blue-600', count: byPriority.find(p => p.priority === 'NORMAL')?.count || 0 },
    { id: 'LOW_PRIO', label: 'Low', color: 'bg-gray-50 text-gray-600', count: byPriority.find(p => p.priority === 'LOW')?.count || 0 },
  ];

  // Default categories if none exist in DB to match the requirement example
  const displayTypes = byType.length > 0 ? byType : [
    { type: 'Electricity', count: 0 },
    { type: 'Telephone', count: 0 },
    { type: 'Vehicle Insurance', count: 0 },
    { type: 'Employee Insurance', count: 0 },
    { type: 'Property Tax', count: 0 },
  ];

  const maxCount = Math.max(...displayTypes.map(t => t.count), 1);

  const budgetAlerts = projects.map(project => {
    const projectBills = bills.filter(b => b.project_name === project.name);
    const totalExpense = projectBills.reduce((sum, b) => sum + b.total_amount, 0);
    const usagePercent = project.annualBudget > 0 ? (totalExpense / project.annualBudget) * 100 : 0;
    
    let alertType = null;
    if (usagePercent >= 100) {
      alertType = 'critical';
    } else if (usagePercent >= project.alertThreshold) {
      alertType = 'warning';
    }
    
    return {
      ...project,
      totalExpense,
      usagePercent,
      alertType
    };
  }).filter(p => p.alertType !== null);

  return (
    <div className="space-y-8">
      {budgetAlerts.length > 0 && (
        <div className="space-y-4">
          {budgetAlerts.map(alert => (
            <div key={alert.id} className={cn(
              "p-4 rounded-2xl border flex items-center justify-between gap-4",
              alert.alertType === 'critical' ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  alert.alertType === 'critical' ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"
                )}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={cn(
                    "text-sm font-bold",
                    alert.alertType === 'critical' ? "text-red-900" : "text-yellow-900"
                  )}>
                    {alert.alertType === 'critical' ? 'Critical Budget Alert' : 'Budget Warning'}
                  </h4>
                  <p className={cn(
                    "text-xs font-medium",
                    alert.alertType === 'critical' ? "text-red-700" : "text-yellow-700"
                  )}>
                    Project <strong>{alert.name}</strong> has used {alert.usagePercent.toFixed(1)}% of its annual budget.
                  </p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className={cn(
                  "text-xs font-bold uppercase tracking-wider mb-1",
                  alert.alertType === 'critical' ? "text-red-600" : "text-yellow-600"
                )}>
                  Expense / Budget
                </p>
                <p className={cn(
                  "text-sm font-black",
                  alert.alertType === 'critical' ? "text-red-900" : "text-yellow-900"
                )}>
                  {formatCurrency(alert.totalExpense)} / {formatCurrency(alert.annualBudget)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION 1 — STATUS SUMMARY BAR (NEW TOP BAR) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {statusCards.map((card) => (
          <button 
            key={card.id}
            onClick={() => onFilterStatus?.(card.id === 'TOTAL' ? null : card.id)}
            className={cn(
              "p-4 rounded-xl shadow-sm transition-all duration-200 text-left group hover:scale-[1.02] bg-white border-t-4",
              card.border,
              activeFilter === card.id ? "ring-2 ring-orange-100 scale-[1.02]" : "hover:shadow-md"
            )}
          >
            <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", card.color)}>{card.label}</p>
            <h3 className={cn("text-2xl font-black mb-1", card.color)}>{card.count}</h3>
            <p className={cn("text-[11px] font-bold", card.color)}>{formatCurrency(card.amount)}</p>
          </button>
        ))}
      </div>

      {/* TOP SECTION — SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1 — Total Pending Amount */}
        <div className="bg-[#F8F9FB] p-8 rounded-2xl shadow-sm flex items-center gap-6 border border-[#E8ECF0]">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shadow-sm border border-orange-100">
            <IndianRupee className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Total Pending Amount</p>
            <h2 className="text-3xl font-black text-[#1A1A2E]">{formatCurrency(financial.total_pending || 0)}</h2>
          </div>
        </div>

        {/* Card 2 — Total Paid Amount */}
        <div className="bg-white p-8 rounded-2xl shadow-sm flex items-center gap-6 border border-[#E8ECF0]">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 shadow-sm border border-green-100">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Total Paid Amount</p>
            <h2 className="text-3xl font-black text-[#1A1A2E]">{formatCurrency(financial.total_paid || 0)}</h2>
          </div>
        </div>
      </div>

      {/* SECOND SECTION — PRIORITY GRID */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E8ECF0]">
        <div className="mb-8">
          <h3 className="text-xl font-black text-[#1A1A2E]">Bills by Priority</h3>
          <p className="text-sm text-[#6B7280] font-medium">Urgency distribution</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {priorities.map((p) => (
            <div key={p.id} className={cn("p-8 rounded-2xl text-center flex flex-col items-center justify-center transition-transform hover:scale-[1.02]", p.color)}>
              <span className="text-4xl font-black mb-1">{p.count}</span>
              <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
