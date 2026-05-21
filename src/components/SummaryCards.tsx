import React from 'react';
import { Bill } from '../types';
import { formatCurrency, cn } from '../utils';
import { FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface SummaryCardsProps {
  bills: Bill[];
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ bills }) => {
  const completedStatuses = ['Payment Confirmed', 'Tally Entry', 'Paid'];
  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);
  const paidAmount = bills.filter(b => completedStatuses.includes(b.status || '')).reduce((sum, b) => sum + b.amount, 0);
  const pendingAmount = bills.filter(b => !completedStatuses.includes(b.status || '')).reduce((sum, b) => sum + b.amount, 0);
  const overdueAmount = bills.filter(b => b.status === 'Overdue' || b.status === 'OVERDUE').reduce((sum, b) => sum + b.amount, 0);

  const stats = [
    { label: 'Total Value', value: totalAmount, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', count: bills.length },
    { label: 'Paid / Completed', value: paidAmount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', count: bills.filter(b => completedStatuses.includes(b.status || '')).length },
    { label: 'Pending Payment', value: pendingAmount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', count: bills.filter(b => !completedStatuses.includes(b.status || '')).length },
    { label: 'Overdue Amount', value: overdueAmount, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', count: bills.filter(b => b.status === 'Overdue' || b.status === 'OVERDUE').length },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{stat.label}</span>
            <stat.icon className={`w-3.5 h-3.5 ${stat.color} opacity-70`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-lg font-black transition-colors",
              stat.value < 0 ? "text-red-600 dark:text-red-400" : "text-text-primary"
            )}>
              {formatCurrency(stat.value)}
            </span>
            <span className="text-[10px] font-bold text-gray-400">({stat.count})</span>
          </div>
        </div>
      ))}
    </div>
  );
};
