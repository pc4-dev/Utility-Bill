import React from 'react';
import { Bill } from '../types';
import { cn, formatCurrency, getStatusColor, formatDateDisplay } from '../utils';
import { Eye, Edit2, Trash2, Calendar, CreditCard, ArrowRight, CheckCircle2, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface BillCardProps {
  bill: Bill;
  onEdit: (bill: Bill) => void;
  onView: (bill: Bill) => void;
  onMarkPaid: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
}

export const BillCard: React.FC<BillCardProps> = ({ bill, onEdit, onView, onMarkPaid, onDelete }) => {
  const isOverdue = bill.status === 'Overdue';
  const isPaid = bill.status === 'Paid';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid':
      case 'Payment Confirmed': return <CheckCircle2 className="w-3 h-3" />;
      case 'Pending': return <Clock className="w-3 h-3" />;
      case 'Overdue': return <AlertCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "group relative bg-white rounded-2xl border transition-all duration-300",
        "shadow-sm hover:shadow-xl",
        isOverdue ? "border-red-100 ring-1 ring-red-50" : "border-gray-100"
      )}
    >
      {/* Status Badge Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <span className={cn(
          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1",
          getStatusColor(bill.status)
        )}>
          {getStatusIcon(bill.status)}
          {bill.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900 truncate pr-16" title={bill.propertyName}>
            {bill.propertyName}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase tracking-tight">
              {bill.utilityType}
            </span>
            <span className="text-[11px] font-mono text-gray-400">#{bill.billId}</span>
          </div>
        </div>

        {/* Main Section */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-gray-900">{formatCurrency(bill.amount)}</span>
          </div>
          <p className="text-[11px] text-gray-400 font-medium mt-1">Total Amount Due</p>
        </div>

        {/* Info Section */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-[13px]">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider leading-none mb-1">Due Date</p>
              <p className="text-gray-700 font-semibold">{formatDateDisplay(bill.dueDate)}</p>
            </div>
          </div>

          {isPaid && bill.paymentDate && (
            <div className="flex items-center gap-3 text-[13px]">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-500">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider leading-none mb-1">Paid On</p>
                <p className="text-gray-700 font-semibold">{formatDateDisplay(bill.paymentDate)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
          {!isPaid ? (
            <button
              onClick={() => onMarkPaid(bill)}
              className="flex-1 bg-primary hover:bg-primary-dark text-white py-2.5 rounded-xl font-bold text-[12px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
            >
              Pay Now
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex-1 bg-gray-50 text-gray-400 py-2.5 rounded-xl font-bold text-[12px] flex items-center justify-center gap-2 cursor-not-allowed">
              Paid Successfully
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => onView(bill)}
              className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(bill)}
              className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
              title="Edit Bill"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(bill)}
              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              title="Delete Bill"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Overdue Highlight */}
      {isOverdue && (
        <div className="absolute inset-x-0 -bottom-px h-1 bg-red-500 rounded-b-2xl" />
      )}
    </motion.div>
  );
};
