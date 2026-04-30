import React, { useEffect } from 'react';
import { Bill } from '../types';
import { useAuth } from '../AuthContext';
import { 
  X, 
  IndianRupee, 
  Calendar, 
  Building2, 
  CreditCard, 
  Hash, 
  Tag, 
  Info,
  MapPin,
  Edit2,
  FileText,
  CheckCircle2,
  Clock,
  Zap,
  Droplets,
  Wifi,
  Flame,
  Wrench,
  MoreHorizontal,
  Sun,
  Phone,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Paperclip,
  Download,
  Eye,
  File,
  AlertCircle,
  Trash2,
  Car,
  Users,
  History,
  User as UserIcon,
  CheckSquare,
  ChevronRight,
  Wind,
  Bug,
  ArrowUpCircle,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency, getStatusColor, getPriorityColor, formatDateDisplay, downloadFile } from '../utils';

interface BillDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  onEdit: (bill: Bill) => void;
  onMarkPaid: (bill: Bill) => void;
  onDelete?: (id: string | number) => void;
  onVerify?: (bill: Bill) => void;
  onApprove?: (bill: Bill) => void;
  onInitiatePayment?: (bill: Bill) => void;
  onConfirmPayment?: (bill: Bill) => void;
}

export const BillDetailsDrawer: React.FC<BillDetailsDrawerProps> = ({ 
  isOpen, 
  onClose, 
  bill, 
  onEdit, 
  onMarkPaid,
  onDelete,
  onVerify,
  onApprove,
  onInitiatePayment,
  onConfirmPayment
}) => {
  const { user } = useAuth();
  
  // Prevent scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!bill) return null;

  const statusLower = bill.status?.toLowerCase();
  const isPending = statusLower === 'pending';
  const isVerified = statusLower === 'verified' || statusLower === 'verified_pending_approval';
  const isApproved = statusLower === 'approved' || statusLower === 'approved_pending_payment';
  const isPaymentInitiated = statusLower === 'payment initiated' || statusLower === 'paid_pending_confirmation';
  const isPaid = statusLower === 'paid' || statusLower === 'payment_confirmed';
  const isOverdue = statusLower === 'overdue';
  const isRejected = statusLower === 'rejected';

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isDataEntry = user?.role === 'DATA_ENTRY';
  const isAccountManagement = user?.role === 'ACCOUNT_MANAGEMENT';
  const isAccountManager = user?.role === 'ACCOUNT_MANAGER';

  // Specific stage permissions
  const canVerifyAction = (isAdmin || isDataEntry) && isPending;
  const canApproveAction = isAdmin && isVerified;
  const canInitiateAction = (isAdmin || isAccountManagement) && isApproved;
  const canConfirmAction = (isAdmin || isAccountManager) && isPaymentInitiated;
  
  const canEdit = isAdmin && !isPaid;
  const canDelete = isAdmin && !isPaid;

  const getUtilityIcon = (type: string) => {
    switch (type) {
      case 'Electricity': return <Zap className="w-5 h-5" />;
      case 'Telecom': return <Smartphone className="w-5 h-5" />;
      case 'Water': return <Droplets className="w-5 h-5" />;
      case 'Solar Bill': return <Sun className="w-5 h-5" />;
      case 'Data (Internet)': return <Wifi className="w-5 h-5" />;
      case 'Landline': return <Phone className="w-5 h-5" />;
      case 'Property Tax (MCG)': 
      case 'Diversion Tax (RD)': return <Building2 className="w-5 h-5" />;
      case 'Pollution Control': return <ShieldCheck className="w-5 h-5" />;
      case 'Insurance': return <ShieldCheck className="w-5 h-5" />;
      case 'Labour Insurance':
      case 'Asset Insurance': return <ShieldAlert className="w-5 h-5" />;
      case 'Air Conditioner AMC': return <Wind className="w-5 h-5" />;
      case 'Elevator AMC': return <ArrowUpCircle className="w-5 h-5" />;
      case 'Waste Management': return <FileText className="w-5 h-5" />;
      case 'Pest Control': return <Bug className="w-5 h-5" />;
      case 'Fire Safety Audit': return <Flame className="w-5 h-5" />;
      case 'Electrical Safety Audit': return <FileCheck className="w-5 h-5" />;
      default: return <MoreHorizontal className="w-5 h-5" />;
    }
  };

  const workflowSteps = [
    { title: 'Bill Received', date: bill.billDate, status: 'completed' },
    { title: 'Verified', status: (isVerified || isApproved || isPaymentInitiated || isPaid) ? 'completed' : 'pending' },
    { title: 'Approved', status: (isApproved || isPaymentInitiated || isPaid) ? 'completed' : 'pending' },
    { title: 'Payment Initiated', status: (isPaymentInitiated || isPaid) ? 'completed' : 'pending' },
    { title: 'Payment Confirmed', status: isPaid ? 'completed' : 'pending' },
  ];

  const currentStepIndex = workflowSteps.findIndex(s => s.status === 'pending') - 1;
  const displayStepIndex = currentStepIndex < 0 ? (isPaid ? 4 : 0) : currentStepIndex;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* Drawer Wrapper */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl z-[101] overflow-hidden flex flex-col"
          >
            {/* 1. Header Section */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                  "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
                )}>
                  {getUtilityIcon(bill.utilityType)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                      getStatusColor(bill.status)
                    )}>
                      {bill.status}
                    </span>
                    <span className="px-2.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                      {bill.utilityType}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white truncate max-w-[300px]">
                    {bill.propertyName === 'Others' ? bill.customPropertyName || 'Others' : bill.propertyName}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 mr-4">
                  {canVerifyAction && (
                    <button onClick={() => onVerify?.(bill)} className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-all hover:scale-110" title="Verify">
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  )}
                  {canApproveAction && (
                    <button onClick={() => onApprove?.(bill)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all hover:scale-110" title="Approve">
                      <ShieldCheck className="w-5 h-5" />
                    </button>
                  )}
                  {canEdit && (
                    <button onClick={() => onEdit(bill)} className="p-2 text-gray-400 hover:text-primary transition-all hover:scale-110" title="Edit">
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                  {canDelete && (
                     <button 
                      onClick={() => {
                        if (onDelete) {
                          onDelete(bill.id || (bill as any)._id);
                        }
                      }} 
                      className="p-2 text-gray-400 hover:text-red-500 transition-all hover:scale-110" 
                      title="Delete"
                     >
                        <Trash2 className="w-5 h-5" />
                      </button>
                  )}
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar">
              
              {/* 2. Bill Summary (Prominent Amount) */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className={cn(
                  "rounded-[1.5rem] p-6 text-center transition-all bg-white dark:bg-slate-800/40 border border-gray-100 dark:border-slate-700 shadow-xl shadow-gray-200/5 dark:shadow-none relative overflow-hidden group",
                  isOverdue && "border-red-100 dark:border-red-900/30"
                )}>
                  {/* Decorative background elements */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-colors" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-blue-500/5 rounded-full -ml-8 -mb-8 blur-2xl group-hover:bg-blue-500/10 transition-colors" />

                  <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">
                    Total Amount Due
                  </p>
                  <div className="flex flex-col items-center justify-center relative z-10">
                    <span className={cn(
                      "text-4xl font-black transition-colors tracking-tighter sm:text-5xl",
                      isOverdue ? "text-red-500" : "text-gray-900 dark:text-white"
                    )}>
                      {formatCurrency(bill.amount)}
                    </span>
                    {isOverdue ? (
                      <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-widest mt-4 bg-red-50 dark:bg-red-900/20 px-4 py-1.5 rounded-full border border-red-100 dark:border-red-900/30 animate-pulse">
                        <AlertCircle className="w-4 h-4" />
                        Bill Overdue
                      </div>
                    ) : isRejected ? (
                      <div className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-widest mt-4 bg-red-50 dark:bg-red-900/20 px-4 py-1.5 rounded-full border border-red-100 dark:border-red-900/30">
                        <AlertCircle className="w-4 h-4" />
                        Bill Rejected
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[10px] font-black text-green-600 uppercase tracking-widest mt-4 bg-green-50 dark:bg-green-900/20 px-4 py-1.5 rounded-full border border-green-100 dark:border-green-900/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Status: {bill.status}
                      </div>
                    )}
                  </div>
                </div>

                {/* Outstanding / Pending Grid */}
                {(bill.outstandingAmount !== undefined || bill.pendingAmount !== undefined) && (bill.outstandingAmount! > 0 || bill.pendingAmount! > 0) && (
                  <div className="grid grid-cols-2 gap-4">
                    {bill.outstandingAmount !== undefined && bill.outstandingAmount > 0 && (
                      <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/20 rounded-[2rem] p-6 text-center hover:scale-[1.02] transition-transform shadow-sm">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Outstanding</p>
                        <p className="text-2xl font-black text-red-600 dark:text-red-400">{formatCurrency(bill.outstandingAmount)}</p>
                      </div>
                    )}
                    {bill.pendingAmount !== undefined && bill.pendingAmount > 0 && (
                      <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100/50 dark:border-orange-900/20 rounded-[2rem] p-6 text-center hover:scale-[1.02] transition-transform shadow-sm">
                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Previous Due</p>
                        <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{formatCurrency(bill.pendingAmount)}</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* 3. Billing Details (Grid) */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4">
                  <h3 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] shrink-0">General Details</h3>
                  <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800"></div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <DetailCard icon={<Hash className="w-4 h-4" />} label="Bill ID" value={bill.billId} mono />
                  <DetailCard icon={<Calendar className="w-4 h-4" />} label="Due Date" value={formatDateDisplay(bill.dueDate)} highlight={isOverdue} />
                  <DetailCard icon={<Building2 className="w-4 h-4" />} label="Project" value={bill.propertyName === 'Others' ? bill.customPropertyName || 'Others' : bill.propertyName} />
                  <DetailCard icon={<Building2 className="w-4 h-4" />} label="Company" value={bill.companyName || 'N/A'} />
                  {bill.billNumber && <DetailCard icon={<FileText className="w-4 h-4" />} label="Bill No" value={bill.billNumber} />}
                  {bill.accountNumber && <DetailCard icon={<CreditCard className="w-4 h-4" />} label="Account" value={bill.accountNumber} />}
                  {bill.consumerNumber && <DetailCard icon={<UserIcon className="w-4 h-4" />} label="Consumer No" value={bill.consumerNumber} />}
                  <DetailCard icon={<Tag className="w-4 h-4" />} label="Category" value={bill.utilityType} />
                  <DetailCard icon={<Wrench className="w-4 h-4" />} label="Provider" value={bill.serviceProvider || 'N/A'} />
                </div>
              </motion.div>

              {/* 3a. Telecom Specific Details */}
              {bill.utilityType === 'Telecom' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-4">
                    <Smartphone className="w-4 h-4 text-orange-600" />
                    <h3 className="text-[12px] font-black text-orange-600 uppercase tracking-[0.2em] shrink-0">Telecom Billing Details</h3>
                    <div className="h-px flex-1 bg-orange-100 dark:bg-orange-950/30"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <DetailCard icon={<Building2 className="w-4 h-4" />} label="Project" value={bill.propertyName} />
                    <DetailCard icon={<Wifi className="w-4 h-4" />} label="Service Type" value={bill.billType || 'Broadband'} />
                    <DetailCard icon={<Building2 className="w-4 h-4" />} label="Operator" value={bill.operatorName || 'Jio'} />
                    <DetailCard icon={<Phone className="w-4 h-4" />} label="Phone Number" value={bill.phoneNumber || 'N/A'} />
                    <DetailCard icon={<Hash className="w-4 h-4" />} label="Account / Cust ID" value={bill.accountNumber || 'N/A'} />
                    <DetailCard icon={<Calendar className="w-4 h-4" />} label="Billing Period" value={bill.billingPeriod || 'N/A'} />
                    <DetailCard icon={<Info className="w-4 h-4" />} label="Plan Name" value={bill.planName || 'N/A'} />
                    <DetailCard icon={<Info className="w-4 h-4" />} label="Data Usage" value={bill.dataUsage || '0.00'} />
                  </div>

                  <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm">
                    <table className="w-full text-[13px] border-collapse">
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                        <BreakdownRow label="Internet Charges" value={bill.internetCharges} />
                        <BreakdownRow label="Other Usage Charges" value={bill.otherCharges} />
                        <tr className="bg-orange-600 text-white">
                          <td className="py-5 px-8 font-black uppercase tracking-widest text-[11px]">Total Amount Recorded</td>
                          <td className="py-5 px-8 text-right font-black text-xl">{formatCurrency(bill.amount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* 3b. Solar Specific Details */}
              {bill.utilityType === 'Solar Bill' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-4">
                    <Sun className="w-4 h-4 text-orange-600" />
                    <h3 className="text-[12px] font-black text-orange-600 uppercase tracking-[0.2em] shrink-0">Solar Net Metering Details</h3>
                    <div className="h-px flex-1 bg-orange-100 dark:bg-orange-950/30"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <DetailCard icon={<ArrowUpCircle className="w-4 h-4 text-red-500" />} label="Import (Grid)" value={`${bill.kwhImportUnits || 0} Units`} />
                    <DetailCard icon={<Sun className="w-4 h-4 text-green-500" />} label="Export (Solar)" value={`${bill.kwhExportUnits || 0} Units`} />
                    <DetailCard icon={<Zap className="w-4 h-4" />} label="Net Units" value={`${bill.netUnits || 0} Units`} />
                    <DetailCard icon={<Sun className="w-4 h-4 text-orange-400" />} label="Solar Generation" value={`${bill.solarGenerationUnits || 0} Units`} />
                  </div>

                  <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm">
                    <table className="w-full text-[13px] border-collapse">
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                        <BreakdownRow label="Fixed Charges" value={bill.fixedCharges || bill.fixedCharge} />
                        <BreakdownRow label="Rebate / Incentives" value={bill.rebate || bill.rebateIncentive} isNegative />
                        <tr className="bg-orange-600 text-white">
                          <td className="py-5 px-8 font-black uppercase tracking-widest text-[11px]">Net Amount Payable</td>
                          <td className="py-5 px-8 text-right font-black text-xl">{formatCurrency(bill.amount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* 3c. Government Bills - Diversion Tax Details */}
              {bill.utilityType === 'Diversion Tax (RD)' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-4">
                    <Building2 className="w-4 h-4 text-orange-600" />
                    <h3 className="text-[12px] font-black text-orange-600 uppercase tracking-[0.2em] shrink-0">Tax Assessment Details</h3>
                    <div className="h-px flex-1 bg-orange-100 dark:bg-orange-950/30"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <DetailCard icon={<Hash className="w-4 h-4" />} label="Challan No" value={bill.challanNumber || 'N/A'} mono />
                    <DetailCard icon={<ShieldCheck className="w-4 h-4" />} label="URN" value={bill.URN || 'N/A'} mono />
                    <DetailCard icon={<CreditCard className="w-4 h-4" />} label="CRN / CIN" value={bill.CRN || bill.CIN || 'N/A'} mono />
                    <DetailCard icon={<MapPin className="w-4 h-4" />} label="District" value={bill.district || 'Gwalior'} />
                    <DetailCard icon={<FileText className="w-4 h-4" />} label="TIN" value={bill.TIN || 'N/A'} />
                    <DetailCard icon={<Calendar className="w-4 h-4" />} label="Challan Period" value={bill.challanPeriod || 'N/A'} />
                    <DetailCard icon={<Building2 className="w-4 h-4" />} label="Bank Name" value={bill.bankName || 'N/A'} />
                    <DetailCard icon={<Hash className="w-4 h-4" />} label="Bank Ref No" value={bill.bankReferenceNumber || 'N/A'} />
                  </div>
                </motion.div>
              )}

              {/* 3d. Government Bills - Property Tax Details */}
              {bill.utilityType === 'Property Tax (MCG)' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-4">
                    <Building2 className="w-4 h-4 text-orange-600" />
                    <h3 className="text-[12px] font-black text-orange-600 uppercase tracking-[0.2em] shrink-0">Tax Assessment Details</h3>
                    <div className="h-px flex-1 bg-orange-100 dark:bg-orange-950/30"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <DetailCard icon={<Hash className="w-4 h-4" />} label="Receipt No" value={bill.receiptNumber || 'N/A'} mono />
                    <DetailCard icon={<Building2 className="w-4 h-4" />} label="Property ID" value={bill.propertyId || 'N/A'} mono />
                    <DetailCard icon={<MapPin className="w-4 h-4" />} label="Zone / Ward" value={bill.zoneWard || 'N/A'} />
                    <DetailCard icon={<Calendar className="w-4 h-4" />} label="Assessment Year" value={bill.assessmentYear || 'N/A'} />
                    <DetailCard icon={<IndianRupee className="w-4 h-4 text-red-500" />} label="Arrear / Outstanding" value={formatCurrency(bill.outstandingAmount || 0)} />
                  </div>

                  <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm">
                    <table className="w-full text-[13px] border-collapse">
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                        <BreakdownRow label="Property Tax" value={bill.propertyTax} />
                        <BreakdownRow label="Education Cess" value={bill.educationCess} />
                        <BreakdownRow label="Samekit" value={bill.samekit} />
                        <BreakdownRow label="Add Samekit" value={bill.addSamekit} />
                        <BreakdownRow label="Urban Tax" value={bill.urbanTax} />
                        <BreakdownRow label="Garbage Charges" value={bill.garbageCharges} />
                        <BreakdownRow label="SAM SWACH" value={bill.samSwach} />
                        <BreakdownRow label="Sewa Kar" value={bill.sewaKar} />
                        <BreakdownRow label="Vyapak Swachata Kar" value={bill.vyapakSwachataKar} />
                        <BreakdownRow label="Penalty" value={bill.penalty} />
                        <BreakdownRow label="Rebate" value={bill.rebate} isNegative />
                        <BreakdownRow label="Advance" value={bill.advance} isNegative />
                        <tr className="bg-orange-600 text-white">
                          <td className="py-5 px-8 font-black uppercase tracking-widest text-[11px]">Total Net Amount</td>
                          <td className="py-5 px-8 text-right font-black text-xl">{formatCurrency(bill.amount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* 3f. Pollution Control Details */}
              {bill.subcategory === 'pollution_control' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-4">
                    <Wind className="w-4 h-4 text-green-600" />
                    <h3 className="text-[12px] font-black text-green-600 uppercase tracking-[0.2em] shrink-0">Pollution Consent Details</h3>
                    <div className="h-px flex-1 bg-green-100 dark:bg-green-950/30"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <DetailCard icon={<FileText className="w-4 h-4" />} label="Document Type" value={bill.documentType} />
                    <DetailCard icon={<ShieldCheck className="w-4 h-4" />} label="Consent Number" value={bill.consentNumber || 'N/A'} mono />
                    <DetailCard icon={<MapPin className="w-4 h-4" />} label="Location" value={bill.location || 'N/A'} />
                    <DetailCard icon={<Hash className="w-4 h-4" />} label="Khasra Number" value={bill.khasraNumber || 'N/A'} />
                    <DetailCard icon={<Building2 className="w-4 h-4" />} label="Authority" value={bill.authority || 'N/A'} />
                    <DetailCard icon={<Tag className="w-4 h-4" />} label="Category" value={bill.pollutionCategory || 'N/A'} />
                    <DetailCard icon={<Calendar className="w-4 h-4" />} label="Issue Date" value={formatDateDisplay(bill.issueDate || bill.billDate)} />
                    <DetailCard icon={<Clock className="w-4 h-4" />} label="Valid Until" value={formatDateDisplay(bill.validityTo)} />
                    <DetailCard icon={<IndianRupee className="w-4 h-4" />} label="Capital Investment" value={`${bill.capitalInvestment || 0} Lakhs`} />
                  </div>
                </motion.div>
              )}

              {/* 3g. Insurance Details */}
              {(bill.utilityType === 'Insurance' || bill.utilityType === 'Labour Insurance' || bill.utilityType === 'Asset Insurance') && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-4">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <h3 className="text-[12px] font-black text-blue-600 uppercase tracking-[0.2em] shrink-0">Insurance Policy Details</h3>
                    <div className="h-px flex-1 bg-blue-100 dark:bg-blue-950/30"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <DetailCard icon={<Hash className="w-4 h-4" />} label="Policy Number" value={bill.policyNumber || 'N/A'} mono />
                    <DetailCard icon={<Building2 className="w-4 h-4" />} label="Insurer" value={bill.insurerName || bill.companyName || 'N/A'} />
                    <DetailCard icon={<UserIcon className="w-4 h-4" />} label="Insured Name" value={bill.insuredName || 'N/A'} />
                    <DetailCard icon={<Calendar className="w-4 h-4" />} label="Start Date" value={formatDateDisplay(bill.billDate)} />
                    <DetailCard icon={<Calendar className="w-4 h-4" />} label="Expiry Date" value={formatDateDisplay(bill.dueDate)} />
                  </div>
                </motion.div>
              )}

              {/* 3e. Payment/Transaction Details (For Paid Bills or Government Bills) */}
              {(isPaid || bill.utilityType === 'Property Tax (MCG)' || bill.utilityType === 'Diversion Tax (RD)') && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-4">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    <h3 className="text-[12px] font-black text-green-600 uppercase tracking-[0.2em] shrink-0">Payment / Transaction Details</h3>
                    <div className="h-px flex-1 bg-green-100 dark:bg-green-950/30"></div>
                  </div>
                  
                  <div className="bg-green-50/30 dark:bg-green-950/10 rounded-[2rem] p-6 border border-green-100 dark:border-green-800/30">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-green-600 shadow-sm border border-green-50">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Date</p>
                          <p className="text-sm font-black text-green-600">{bill.paymentDate || bill.transactionDate || bill.billDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-green-600 shadow-sm border border-green-50">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Time</p>
                          <p className="text-sm font-black text-green-600">{bill.transactionTime || bill.paymentTime || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-green-600 shadow-sm border border-green-50">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Mode</p>
                          <p className="text-sm font-black text-green-600">{bill.modeOfPayment || bill.paymentMode || 'Online'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-green-600 shadow-sm border border-green-50">
                          <IndianRupee className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paid Amount</p>
                          <p className="text-sm font-black text-green-600">{formatCurrency(bill.paidAmount || bill.totalAmount || bill.amount)}</p>
                        </div>
                      </div>
                      {bill.upiReference && (
                        <div className="col-span-2 pt-3 border-t border-green-100 dark:border-green-800/20 flex justify-between items-center px-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">UPI Reference</p>
                          <p className="text-sm font-mono font-bold text-green-600">{bill.upiReference}</p>
                        </div>
                      )}
                      {(bill.modeOfPayment?.toLowerCase() === 'cheque' || bill.chequeNumber) && (
                        <div className="col-span-2 pt-3 border-t border-green-100 dark:border-green-800/20 space-y-2 px-2">
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cheque No</p>
                            <p className="text-sm font-mono font-bold text-green-600">{bill.chequeNumber}</p>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bank</p>
                            <p className="text-sm font-bold text-green-600">{bill.chequeBankName}</p>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cheque Date</p>
                            <p className="text-sm font-bold text-green-600">{bill.chequeDate}</p>
                          </div>
                        </div>
                      )}
                      {bill.bankReferenceNumber && (
                        <div className="col-span-2 pt-3 border-t border-green-100 dark:border-green-800/20 flex justify-between items-center px-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bank Ref No</p>
                          <p className="text-sm font-mono font-bold text-green-600">{bill.bankReferenceNumber}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 4. Billing Breakdown (Only for default utilities like Electricity/Water if not already covered) */}
              {['Electricity', 'Water', 'Data (Internet)', 'Landline'].includes(bill.utilityType) && (bill.energyCharges || bill.energyCharges === 0) && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-6"
                >
                   <div className="flex items-center gap-4">
                    <h3 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] shrink-0">Payment Breakdown</h3>
                    <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800"></div>
                  </div>

                  <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm">
                    <table className="w-full text-[13px] border-collapse">
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                        <BreakdownRow label="Energy / Usage Charges" value={bill.energyCharges} />
                        <BreakdownRow label="Fixed / Service Charges" value={bill.fixedCharge || bill.fixedCharges} />
                        <BreakdownRow label="FPPAS / Surcharge" value={bill.fppas || bill.surcharge} />
                        <BreakdownRow label="Tax / Electricity Duty" value={bill.electricityDuty || bill.taxAmount} />
                        <BreakdownRow label="Security Deposit Add-on" value={bill.additionalSD || bill.securityAmount} />
                        <BreakdownRow label="Other / Misc Charges" value={bill.otherCharges} />
                        <BreakdownRow label="Adjustments / Subsidy" value={bill.subsidyAmount || bill.advance} isNegative />
                        <tr className="bg-primary/5 dark:bg-primary/10">
                          <td className="py-5 px-8 font-black text-primary uppercase tracking-widest text-[11px]">Total Current Bill</td>
                          <td className="py-5 px-8 text-right font-black text-xl text-primary">{formatCurrency(bill.amount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* 5. Workflow Timeline */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-4">
                  <h3 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] shrink-0">Workflow Progress</h3>
                  <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative px-4">
                  {/* Decorative Progress Line (Desktop Only) */}
                  <div className="hidden sm:block absolute top-[20px] left-[10%] right-[10%] h-[2px] bg-gray-100 dark:bg-slate-800 z-0">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(displayStepIndex / 4) * 100}%` }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                      className="h-full bg-green-500"
                    />
                  </div>

                  {workflowSteps.map((step, idx) => {
                    const isCompleted = step.status === 'completed';
                    const isCurrent = idx === displayStepIndex;
                    return (
                      <div key={idx} className="flex flex-col items-center group relative z-10">
                        <motion.div 
                          initial={false}
                          animate={{ 
                            scale: isCurrent ? 1.15 : 1,
                            backgroundColor: isCompleted ? "#22c55e" : isCurrent ? "#f97316" : "#f3f4f6"
                          }}
                          className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm",
                            isCompleted ? "text-white" : 
                            isCurrent ? "text-white shadow-lg shadow-orange-500/30" : 
                            "text-gray-400 dark:bg-slate-800 dark:text-gray-500"
                          )}
                        >
                          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-[13px] font-black">{idx + 1}</span>}
                        </motion.div>
                        <p className={cn(
                          "mt-4 text-[10px] font-black uppercase text-center tracking-tight leading-tight max-w-[80px]",
                          isCompleted ? "text-green-600" : isCurrent ? "text-primary" : "text-gray-400"
                        )}>
                          {step.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* 6. Attachments */}
              {bill.attachments && bill.attachments.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-4">
                    <h3 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] shrink-0">Documents & Files</h3>
                    <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800"></div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {bill.attachments.map((file, idx) => (
                      <AttachmentItem key={idx} file={file} canDownload={true} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* 7. Audit Trail */}
              {bill.workflowLogs && bill.workflowLogs.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-8 pb-10"
                >
                  <div className="flex items-center gap-4">
                    <h3 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] shrink-0">Activity Log</h3>
                    <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800"></div>
                  </div>

                  <div className="space-y-6 relative ml-4 sm:ml-6">
                    {/* Vertical activity line */}
                    <div className="absolute top-0 bottom-0 left-[15px] w-px bg-gray-100 dark:bg-slate-800" />

                    {bill.workflowLogs.slice().reverse().map((log, idx) => (
                      <div key={idx} className="flex gap-6 relative group">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 z-10 border-4 border-white dark:border-slate-900 shadow-sm transition-all group-hover:scale-110",
                          log.stage === 'Verification' ? "bg-green-100 text-green-600" :
                          log.stage === 'Approval' ? "bg-blue-100 text-blue-600" :
                          log.stage === 'Payment Initiated' ? "bg-orange-100 text-orange-600" :
                          log.stage === 'Payment Confirmed' ? "bg-purple-100 text-purple-600" :
                          "bg-gray-100 text-gray-600"
                        )}>
                          <History className="w-4 h-4" />
                        </div>
                        <div className="flex-1 bg-white dark:bg-slate-800/40 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-700 shadow-sm transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-md">
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                            <div className="min-w-[150px]">
                              <p className="text-[14px] font-black text-gray-900 dark:text-white">{log.action || log.stage}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded uppercase tracking-widest">{log.userRole}</span>
                                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">{log.user}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tabular-nums">
                              {new Date(log.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {log.remarks && (
                            <div className="relative">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                              <p className="text-xs text-gray-600 dark:text-gray-400 pl-4 py-1 italic">
                                "{log.remarks}"
                              </p>
                            </div>
                          )}
                          {log.proofUrl && (
                             <button 
                              onClick={() => window.open(log.proofUrl, '_blank')}
                              className="mt-3 flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                             >
                                <Paperclip className="w-3 h-3" />
                                View Payment Proof
                             </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

            </div>

            {/* Sticky/Fixed Bottom Action Bar (Mobile Responsive Layout) */}
            <div className="p-6 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex flex-col sm:flex-row gap-3 z-30 sticky bottom-0">
              {canVerifyAction && (
                <button
                  onClick={() => onVerify?.(bill)}
                  className="flex-1 min-w-[140px] h-12 bg-green-600 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.1em] hover:bg-green-700 transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Verify Bill
                </button>
              )}
              {canApproveAction && (
                <button
                  onClick={() => onApprove?.(bill)}
                  className="flex-1 min-w-[140px] h-12 bg-blue-600 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.1em] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Approve Bill
                </button>
              )}
              {canInitiateAction && (
                <button
                  onClick={() => onInitiatePayment?.(bill)}
                  className="flex-1 min-w-[140px] h-12 bg-orange-600 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.1em] hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Initiate Payment
                </button>
              )}
              {canConfirmAction && (
                <button
                  onClick={() => onConfirmPayment?.(bill)}
                  className="flex-1 min-w-[140px] h-12 bg-purple-600 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.1em] hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  Confirm Payment
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => onEdit(bill)}
                  className="flex-1 min-w-[100px] h-12 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => {
                    if (onDelete) {
                      onDelete(bill.id || (bill as any)._id);
                      onClose();
                    }
                  }}
                  className="flex-1 min-w-[100px] h-12 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 min-w-[100px] h-12 bg-gray-900 dark:bg-slate-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black dark:hover:bg-slate-600 transition-all flex items-center justify-center"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Internal components
const DetailCard = ({ icon, label, value, mono, highlight }: { icon: React.ReactNode, label: string, value: string, mono?: boolean, highlight?: boolean }) => (
  <div className="space-y-1.5 p-4 rounded-3xl bg-gray-50/50 dark:bg-slate-800/20 border border-gray-100 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-default group shadow-sm hover:shadow-md">
    <div className="flex items-center gap-2">
      <div className="p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm text-gray-400 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</span>
    </div>
    <p className={cn(
      "text-[13px] font-black break-words leading-tight",
      highlight ? "text-red-600" : "text-gray-900 dark:text-white",
      mono && "font-mono"
    )}>
      {value}
    </p>
  </div>
);

const BreakdownRow = ({ label, value, isNegative, isTotal }: { label: string, value?: number, isNegative?: boolean, isTotal?: boolean }) => {
  if (value === undefined || value === 0) return null;
  return (
    <tr className={cn(
      isTotal ? "bg-primary text-white" : "hover:bg-white dark:hover:bg-slate-800 transition-colors"
    )}>
      <td className="py-4 px-6 font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900">{label}</td>
      <td className={cn(
        "py-4 px-6 text-right font-black",
        isNegative && !isTotal ? "text-red-600" : !isTotal && "text-gray-900 dark:text-white"
      )}>
        {isNegative ? "-" : ""}{formatCurrency(value)}
      </td>
    </tr>
  );
};

const AttachmentItem = ({ file, canDownload }: { file: any, canDownload: boolean }) => {
  const isImage = file.type?.startsWith('image/') || file.url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/);
  const isPdf = file.type === 'application/pdf' || file.url.toLowerCase().match(/\.pdf$/);
  
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/30 border border-gray-100 dark:border-slate-800 rounded-3xl group transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden border border-gray-100 dark:border-slate-600">
          {isImage ? (
            <img src={file.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : isPdf ? (
            <FileText className="w-6 h-6 text-red-500" />
          ) : (
            <File className="w-6 h-6 text-gray-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-black text-gray-900 dark:text-white truncate">{file.name}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
            {isImage ? 'Image' : isPdf ? 'PDF Ref' : 'Document'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => window.open(file.url, '_blank')}
          className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 rounded-xl transition-all"
        >
          <Eye className="w-5 h-5" />
        </button>
        {canDownload && (
          <button 
            onClick={() => downloadFile(file.url, file.name)}
            className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 rounded-xl transition-all"
          >
            <Download className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
