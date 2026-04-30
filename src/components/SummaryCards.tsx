import React from 'react';
import { Bill } from '../types';
import { formatCurrency } from '../utils';
import { FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface SummaryCardsProps {
  bills: Bill[];
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ bills }) => {
  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);
  const paidAmount = bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + b.amount, 0);
  const pendingAmount = bills.filter(b => b.status === 'Pending').reduce((sum, b) => sum + b.amount, 0);
  const overdueAmount = bills.filter(b => b.status === 'Overdue').reduce((sum, b) => sum + b.amount, 0);

  const stats = [
    { label: 'Total Bills', value: totalAmount, icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Paid Amount', value: paidAmount, icon: CheckCircle2, color: 'text-status-paid dark:text-emerald-400', bg: 'bg-status-paid-bg dark:bg-emerald-900/20' },
    { label: 'Pending Amount', value: pendingAmount, icon: Clock, color: 'text-status-pending dark:text-amber-400', bg: 'bg-status-pending-bg dark:bg-amber-900/20' },
    { label: 'Overdue Amount', value: overdueAmount, icon: AlertCircle, color: 'text-status-overdue dark:text-rose-400', bg: 'bg-status-overdue-bg dark:bg-rose-900/20' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-border-light dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
          <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center transition-colors`}>
            <stat.icon className={`w-6 h-6 ${stat.color}`} />
          </div>
          <div>
            <p className="text-text-secondary text-[12px] font-medium">{stat.label}</p>
            <p className="text-lg font-bold text-text-primary mt-0.5">{formatCurrency(stat.value)}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
