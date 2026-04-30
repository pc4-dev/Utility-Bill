import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Building2,
  Calendar,
  RefreshCw,
  CheckCircle,
  Eye,
  Edit2,
  AlertCircle,
  FileText,
  ShieldCheck,
  CreditCard,
  CheckSquare
} from 'lucide-react';
import { cn, formatCurrency } from '../utils';

import { Bill, Role } from '../types';

interface BillCardCollapsibleProps {
  bill: Bill;
  userRole: Role;
  onDelete: (id: string) => void;
  onEdit?: (bill: Bill) => void;
  onView?: (bill: Bill) => void;
  onVerify?: (bill: Bill) => void;
  onApprove?: (bill: Bill) => void;
  onInitiatePayment?: (bill: Bill) => void;
  onConfirmPayment?: (bill: Bill) => void;
}

export const BillCardCollapsible: React.FC<BillCardCollapsibleProps> = ({
  bill,
  userRole,
  onDelete,
  onEdit,
  onView,
  onVerify,
  onApprove,
  onInitiatePayment,
  onConfirmPayment
}) => {
  const payments = (bill as any).payments || [];
  const localPaidAmount = payments.reduce((sum: number, p: any) => p.status === 'DONE' ? sum + p.amount : sum, 0);
  const totalAmount = bill.amount || 0;
  
  let currentStatus = (bill.status as string) || 'PENDING';
  const statusUpper = currentStatus.toUpperCase();

  const isPaidVisible = statusUpper === 'PAID' || statusUpper === 'PAYMENT CONFIRMED';
  const isOverdue = new Date() > new Date(bill.dueDate) && !isPaidVisible;

  const paidPercentage = totalAmount > 0 ? Math.min(100, (localPaidAmount / totalAmount) * 100) : 0;

  const getStatusIcon = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'PAID' || s === 'PAYMENT CONFIRMED') return <CheckCircle2 className="w-3.5 h-3.5" />;
    if (s === 'PENDING') return <Clock className="w-3.5 h-3.5" />;
    if (s === 'OVERDUE') return <AlertCircle className="w-3.5 h-3.5" />;
    if (s === 'VERIFIED') return <ShieldCheck className="w-3.5 h-3.5" />;
    if (s === 'APPROVED') return <CheckSquare className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  const getStatusStyles = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'PAID' || s === 'PAYMENT CONFIRMED') 
      return 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30';
    if (s === 'PENDING') 
      return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
    if (s === 'OVERDUE' || isOverdue) 
      return 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30';
    if (s === 'VERIFIED') 
      return 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30';
    if (s === 'APPROVED') 
      return 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30';
    return 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-slate-700';
  };

  const getPriorityStyles = (priority: string) => {
    const p = (priority || '').toUpperCase();
    switch (p) {
      case 'LOW': return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
      case 'NORMAL': return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400';
      case 'HIGH': return 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400';
      case 'URGENT': 
      case 'CRITICAL': return 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-500';
    }
  };

  const isAdmin = userRole === 'ADMIN' || userRole === 'MANAGER';
  const canEdit = userRole === 'ADMIN';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none group",
        isOverdue && "border-red-100 dark:border-red-900/40 ring-1 ring-red-50 dark:ring-0"
      )}
    >
      {/* Main Content Area */}
      <div 
        className="p-5 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8 cursor-pointer"
        onClick={() => onView && onView(bill)}
      >
        {/* Left Side: Info */}
        <div className="flex-1 min-w-0">
          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-sm", 
              getStatusStyles(currentStatus)
            )}>
              {getStatusIcon(currentStatus)}
              {currentStatus.replace(/_/g, ' ')}
            </span>
            <span className="px-3 py-1 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-gray-100 dark:border-slate-700 transition-colors">
              {bill.utilityType === 'Other' ? bill.customUtilityType : bill.utilityType}
            </span>
            <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-transparent", getPriorityStyles(bill.priority))}>
              {bill.priority}
            </span>
            <span className="text-[11px] font-mono font-bold text-gray-300 dark:text-slate-700 ml-auto sm:ml-0">#{bill.billId}</span>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none group-hover:text-primary transition-colors truncate">
               {bill.propertyName === 'Others' ? bill.customPropertyName || 'Others' : bill.propertyName}
            </h3>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2 text-[13px] font-bold text-gray-500 dark:text-gray-400">
                <Building2 className="w-4 h-4 text-gray-300" />
                <span className="truncate max-w-[200px]">
                   {bill.companyName === 'Others' ? bill.customCompanyName || 'Others' : bill.companyName}
                   {bill.insuredName && <span className="text-primary ml-1"> • {bill.insuredName}</span>}
                </span>
              </div>
              <div className={cn(
                "flex items-center gap-2 text-[13px] font-bold",
                isOverdue ? "text-red-500" : "text-gray-500 dark:text-gray-400"
              )}>
                <Calendar className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                <span className="tabular-nums">Due: {new Date(bill.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Amount & Actions */}
        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-4 lg:gap-3 shrink-0 py-2 sm:py-0">
          <div className="text-left lg:text-right">
             <div className="flex flex-col">
                <span className={cn(
                  "text-3xl sm:text-4xl font-black tracking-tighter leading-none transition-colors",
                  isOverdue ? "text-red-500" : "text-gray-900 dark:text-white"
                )}>
                  {formatCurrency(totalAmount)}
                </span>
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Total Bill Amount</span>
             </div>
          </div>

          <div className="flex items-center gap-2">
            {onView && (
              <button 
                onClick={(e) => { e.stopPropagation(); onView(bill); }}
                className="p-3 text-gray-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 rounded-2xl transition-all active:scale-90"
                title="View Full Details"
              >
                <Eye className="w-5 h-5" />
              </button>
            )}
            {onEdit && canEdit && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(bill); }}
                className="p-3 text-gray-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 rounded-2xl transition-all active:scale-90"
                title="Edit Bill"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            {isAdmin && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(bill.id || bill._id!); }}
                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all active:scale-90"
                title="Delete Bill"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <div className="h-8 w-px bg-gray-100 dark:bg-slate-800 mx-1 hidden sm:block" />
            <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl hidden sm:flex">
                <button 
                   onClick={(e) => { e.stopPropagation(); onView && onView(bill); }}
                   className="px-4 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-sm hover:shadow transition-all"
                >
                  Actions
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar (Always at bottom) */}
      <div className="h-1.5 w-full bg-gray-50 dark:bg-slate-800 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${paidPercentage}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={cn(
            "h-full rounded-r-full",
            isPaidVisible ? "bg-green-500" : isOverdue ? "bg-red-500" : "bg-primary"
          )}
        />
      </div>
    </motion.div>
  );
};
