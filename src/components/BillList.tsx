import React from 'react';
import { Bill } from '../types';
import { BillCardCollapsible } from './BillCardCollapsible';
import { motion, AnimatePresence } from 'motion/react';
import { SearchX } from 'lucide-react';
import { useAuth } from '../AuthContext';

import { Skeleton } from './ui/Skeleton';

interface BillListProps {
  bills: Bill[];
  onEdit: (bill: Bill) => void;
  onView: (bill: Bill) => void;
  onMarkPaid: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
  onVerify?: (bill: Bill) => void;
  onApprove?: (bill: Bill) => void;
  onInitiatePayment?: (bill: Bill) => void;
  onConfirmPayment?: (bill: Bill) => void;
  isLoading?: boolean;
}

export const BillList: React.FC<BillListProps> = ({ 
  bills, 
  onEdit, 
  onView, 
  onMarkPaid, 
  onDelete,
  onVerify,
  onApprove,
  onInitiatePayment,
  onConfirmPayment,
  isLoading 
}) => {
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-8 w-64 rounded-lg" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-4 w-40 rounded" />
                </div>
              </div>
            </div>
            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-4">
              <div className="space-y-2 lg:text-right">
                <Skeleton className="h-10 w-32 rounded-lg" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white dark:bg-slate-900 p-16 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 flex flex-col items-center justify-center text-center transition-colors"
      >
        <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400 dark:text-slate-500 mb-4 transition-colors">
          <SearchX className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white transition-colors">No bills found</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-xs mt-2 transition-colors">
          We couldn't find any bills matching your current filters. Try adjusting them or add a new bill.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {bills.map((bill) => (
          <motion.div
            key={bill.id || bill._id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <BillCardCollapsible
              bill={bill}
              userRole={user?.role || 'MANAGER'}
              onDelete={() => onDelete(bill)}
              onEdit={onEdit}
              onView={onView}
              onVerify={onVerify}
              onApprove={onApprove}
              onInitiatePayment={onInitiatePayment}
              onConfirmPayment={onConfirmPayment}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
