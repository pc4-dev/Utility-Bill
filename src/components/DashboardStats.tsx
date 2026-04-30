import React from 'react';
import { 
  FileText, 
  Clock, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Archive,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { formatCurrency, cn } from '../utils';

interface StatsProps {
  stats: any[];
  financial: any;
  isAdmin: boolean;
}

export const DashboardStats: React.FC<StatsProps> = ({ stats, financial, isAdmin }) => {
  const getStat = (status: string) => stats.find(s => s.status === status) || { count: 0, total_amount: 0 };

  const summaryCards = [
    { label: 'Total Bills', count: stats.reduce((acc, s) => acc + s.count, 0), amount: stats.reduce((acc, s) => acc + s.total_amount, 0), icon: FileText, color: 'bg-indigo-500' },
    { label: 'Pending', ...getStat('PENDING'), icon: Clock, color: 'bg-yellow-500' },
    { label: 'Overdue', ...getStat('OVERDUE'), icon: AlertCircle, color: 'bg-red-500' },
    { label: 'Paid', ...getStat('PAID'), icon: CheckCircle2, color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white p-4 rounded-xl border border-orange-50 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className={cn("p-2 rounded-lg text-white", card.color)}>
                <card.icon className="w-4 h-4" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{card.count}</span>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.label}</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(card.amount)}</p>
          </div>
        ))}
      </div>

      {/* Financial Summary (Account Users Only) */}
      {!isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-orange-500 p-6 rounded-2xl text-white relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <TrendingUp className="w-32 h-32" />
            </div>
            <p className="text-sm text-orange-100 font-medium mb-1">Total Amount Paid</p>
            <h3 className="text-2xl font-bold text-white">{formatCurrency(financial.total_paid || 0)}</h3>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm">
            <p className="text-sm text-gray-500 font-medium mb-1">Total Pending</p>
            <h3 className="text-2xl font-bold text-orange-600">{formatCurrency(financial.total_pending || 0)}</h3>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm">
            <p className="text-sm text-gray-500 font-medium mb-1">Current Month Expense</p>
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(financial.current_month || 0)}</h3>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm">
            <p className="text-sm text-gray-500 font-medium mb-1">Upcoming Due (7 Days)</p>
            <h3 className="text-2xl font-bold text-orange-500">{formatCurrency(financial.upcoming_due || 0)}</h3>
          </div>
        </div>
      )}
    </div>
  );
};
