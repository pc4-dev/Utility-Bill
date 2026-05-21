import React, { useEffect } from 'react';
import { Bill } from '../types';
import { useAuth } from '../AuthContext';
import { 
  X, 
  Check,
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
  File as FileIcon,
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
  FileCheck,
  Layers,
  Activity
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
  onTallyEntry?: (bill: Bill) => void;
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
  onConfirmPayment,
  onTallyEntry
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
  const isVerified = statusLower === 'verified';
  const isApproved = statusLower === 'approved';
  const isPaymentInitiated = statusLower === 'payment initiated';
  const isPaymentConfirmed = statusLower === 'payment confirmed';
  const isTallyEntry = statusLower === 'tally entry';
  const isPaid = statusLower === 'paid';
  const isOverdue = statusLower === 'overdue';
  const isRejected = statusLower === 'rejected';

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isDataEntry = user?.role === 'DATA_ENTRY';
  const isAccountManagement = user?.role === 'ACCOUNT_MANAGEMENT';
  const isAccountManager = user?.role === 'ACCOUNT_MANAGER';
  const isAccountExecutive2 = user?.role === 'ACCOUNT_EXECUTIVE_2';

  // Module check for ACCOUNT_EXECUTIVE_2
  const isElectricity = bill.utilityType === 'Electricity';
  const isTelecom = bill.utilityType === 'Telecom' || bill.utilityType === 'Data (Internet)' || bill.utilityType === 'Landline' || bill.utilityType === 'Mobile Recharge';
  const isSolar = bill.utilityType === 'Solar Bill';
  const isAllowedModuleForExec2 = isElectricity || isTelecom || isSolar;

  // Specific stage permissions
  const canVerifyAction = (isAdmin || isDataEntry) && isPending;
  const canApproveAction = isAdmin && isVerified;
  const canInitiateAction = (isAdmin || isAccountManagement) && isApproved;
  const canConfirmAction = (isAdmin || isAccountManager || isAccountManagement) && isPaymentInitiated;
  const canTallyAction = (isAdmin || isAccountManagement || isAccountManager || user?.role === 'ACCOUNT' || user?.role === 'FINANCE' || (isAccountExecutive2 && isAllowedModuleForExec2)) && isPaymentConfirmed;
  
  const canEdit = user?.role === 'ADMIN' && !isPaid;
  const canDelete = user?.role === 'ADMIN' && !isPaid;

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
      case 'Pollution Control': 
      case 'CTE':
      case 'CTO': return <ShieldCheck className="w-5 h-5" />;
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

  const getStageNumber = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'verified') return 2;
    if (s === 'approved') return 3;
    if (s === 'payment initiated') return 4;
    if (s === 'payment confirmed') return 5;
    if (s === 'tally entry') return 6;
    if (s === 'paid' || s === 'payment completed') return 7; // Completed all
    return 1; // Default is Received
  };

  const currentStage = getStageNumber(bill.status || '');

  const steps = [
    { 
      id: 1, 
      title: 'Bill Received', 
      isCompleted: currentStage > 1,
      isCurrent: currentStage === 1,
    },
    { 
      id: 2, 
      title: 'Verified', 
      isCompleted: currentStage > 2,
      isCurrent: currentStage === 2,
    },
    { 
      id: 3, 
      title: 'Approved', 
      isCompleted: currentStage > 3,
      isCurrent: currentStage === 3,
    },
    { 
      id: 4, 
      title: 'Payment Initiated', 
      isCompleted: currentStage > 4,
      isCurrent: currentStage === 4,
    },
    { 
      id: 5, 
      title: 'Payment Confirmed', 
      isCompleted: currentStage > 5,
      isCurrent: currentStage === 5,
    },
    { 
      id: 6, 
      title: 'Tally Entry', 
      isCompleted: currentStage > 6,
      isCurrent: currentStage === 6,
    },
  ];

  const isPollutionControl = bill.utilityType === 'Pollution Control' || 
                           bill.utilityType === 'CTE' || 
                           bill.utilityType === 'CTO' || 
                           bill.subcategory === 'pollution_control';

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
            <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-20">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400 shadow-sm">
                  {getUtilityIcon(bill.utilityType)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {bill.expenseTitle || (bill.propertyName === 'Others' ? bill.customPropertyName || 'Others' : bill.propertyName)}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">{bill.subcategory || bill.utilityType}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className={cn(
                      "text-sm",
                      getStatusColor(bill.status).split(' ')[1] // Extract color text
                    )}>
                      {bill.status}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              
              {/* Workflow Stepper */}
              <div className="p-8 pb-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                {/* Mobile Stepper */}
                <div className="block sm:hidden w-full bg-gray-50 dark:bg-slate-800/10 rounded-2xl p-4 border border-gray-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Workflow Stage</span>
                    <span className="text-xs font-black text-orange-500 dark:text-orange-400">
                      {currentStage > 6 ? 'All Complete' : `Step ${currentStage} of 6`}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 py-1">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border-none",
                      currentStage > 6
                        ? "bg-emerald-500 text-white"
                        : "bg-orange-500 text-white ring-4 ring-orange-500/10"
                    )}>
                      {currentStage > 6 ? <Check className="w-3.5 h-3.5" /> : currentStage}
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        {currentStage > 6 ? 'Workflow Completed' : steps[currentStage - 1]?.title}
                      </h4>
                      <p className="text-[10px] text-gray-500 font-medium">
                        {currentStage === 1 && "Waiting for verification"}
                        {currentStage === 2 && "Verified, pending approval"}
                        {currentStage === 3 && "Approved, payment can be initiated"}
                        {currentStage === 4 && "Payment initiated, awaiting confirmation"}
                        {currentStage === 5 && "Payment confirmed, tally entry pending"}
                        {currentStage === 6 && "Tally system entry pending"}
                        {currentStage > 6 && "Processor completed and logged in Tally"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1 mt-3">
                    {[1, 2, 3, 4, 5, 6].map((num) => {
                      const isCompleted = num < currentStage;
                      const isCurrent = num === currentStage;
                      return (
                        <div 
                          key={num}
                          className={cn(
                            "h-1.5 flex-1 rounded-full transition-all duration-300",
                            isCompleted 
                              ? "bg-emerald-500" 
                              : isCurrent 
                                ? "bg-orange-500 animate-pulse" 
                                : "bg-gray-200 dark:bg-slate-800"
                          )}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Desktop/Tablet Stepper */}
                <div className="hidden sm:flex items-center justify-between w-full relative h-[72px] px-2 mb-2">
                  {/* Connector Line Background */}
                  <div className="absolute top-4 left-[8.33%] right-[8.33%] h-0.5 bg-gray-100 dark:bg-slate-800 -z-10" />
                  
                  {/* Connector Line Progress */}
                  <div 
                    className="absolute top-4 left-[8.33%] h-0.5 bg-emerald-500 dark:bg-emerald-600 transition-all duration-500 -z-10" 
                    style={{ 
                      width: `${Math.min(5, currentStage - 1) * 16.67}%` 
                    }} 
                  />
                  
                  {steps.map((step, idx) => {
                    const isStepCompleted = step.isCompleted;
                    const isStepCurrent = step.isCurrent;
                    return (
                      <div key={idx} className="flex flex-col items-center flex-1 relative min-w-0">
                         {/* Circle */}
                         <div className={cn(
                           "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border relative z-10",
                           isStepCompleted 
                             ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10" 
                             : isStepCurrent
                               ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20 scale-110 ring-4 ring-orange-500/10"
                               : "bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-800 text-gray-400"
                         )}>
                           {isStepCompleted ? (
                             <Check className="w-3.5 h-3.5 text-white" />
                           ) : (
                             <span>{step.id}</span>
                           )}
                           {isStepCurrent && (
                             <span className="absolute -inset-1 rounded-full border border-orange-500/30 animate-ping opacity-75" style={{ animationDuration: '3s' }} />
                           )}
                         </div>
                         
                         {/* Label text */}
                         <span className={cn(
                           "text-[10px] font-black mt-2 text-center select-none truncate w-full px-1 transition-colors",
                           isStepCurrent 
                             ? "text-orange-600 dark:text-orange-400" 
                             : isStepCompleted
                               ? "text-gray-900 dark:text-gray-300 font-bold"
                               : "text-gray-400 dark:text-slate-600"
                         )} title={step.title}>
                           {step.title}
                         </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* 2. Amount Summary */}
              <div className="p-8 bg-gray-50/50 dark:bg-slate-800/30 border-b border-gray-100 dark:border-slate-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Payable Amount</p>
                <h3 className={cn(
                  "text-4xl font-black transition-colors",
                  (bill.amount || 0) < 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                )}>
                  {isPollutionControl ? `₹${bill.amount?.toLocaleString('en-IN')} Lakhs` : formatCurrency(bill.amount)}
                </h3>
                {bill.dueDate && (
                  <p className="text-sm text-gray-500 mt-2">
                    Due on {formatDateDisplay(bill.dueDate)}
                  </p>
                )}
              </div>

              {/* 3. Details List */}
              <div className="p-8 space-y-8">
                {/* General Details */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">General Information</h4>
                  <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <DetailRow icon={<Hash className="w-4 h-4" />} label="Bill ID" value={bill.billId} mono />
                    <DetailRow icon={<Calendar className="w-4 h-4" />} label="Bill Date" value={formatDateDisplay(bill.billDate)} />
                    <DetailRow icon={<Calendar className="w-4 h-4" />} label="Due Date" value={formatDateDisplay(bill.dueDate)} highlight={isOverdue} />
                    <DetailRow icon={<Building2 className="w-4 h-4" />} label="Project" value={bill.propertyName === 'Others' ? bill.customPropertyName || 'Others' : bill.propertyName} />
                    <DetailRow icon={<Building2 className="w-4 h-4" />} label="Company" value={bill.companyName || 'N/A'} />
                    {bill.customerName && <DetailRow icon={<UserIcon className="w-4 h-4" />} label="Customer Name" value={bill.customerName} />}
                    {(bill.month || bill.year || bill.billingPeriod) && (
                      <DetailRow 
                        icon={<Clock className="w-4 h-4" />} 
                        label="Period" 
                        value={bill.billingPeriod || `${bill.month || ''} ${bill.year || ''}`.trim() || 'N/A'} 
                      />
                    )}
                    {bill.billNumber && <DetailRow icon={<FileText className="w-4 h-4" />} label="Bill Number" value={bill.billNumber} />}
                    {bill.accountNumber && <DetailRow icon={<CreditCard className="w-4 h-4" />} label="Account Number" value={bill.accountNumber} />}
                    {bill.consumerNumber && <DetailRow icon={<UserIcon className="w-4 h-4" />} label="Consumer Number" value={bill.consumerNumber} />}
                    <DetailRow icon={<Wrench className="w-4 h-4" />} label="Service Provider" value={bill.serviceProvider || 'N/A'} />
                  </div>
                </div>

                {/* Expense Specific Section */}
                {(bill.category === 'expense' || bill.expenseTitle) && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Expense Details</h4>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      {bill.paidBy && <DetailRow icon={<UserIcon className="w-4 h-4" />} label="Paid By" value={bill.paidBy} />}
                      {bill.modeOfPayment && <DetailRow icon={<CreditCard className="w-4 h-4" />} label="Payment Method" value={bill.modeOfPayment} />}
                      {bill.vendorName && <DetailRow icon={<Building2 className="w-4 h-4" />} label="Vendor / Store" value={bill.vendorName} />}
                      {bill.location && <DetailRow icon={<MapPin className="w-4 h-4" />} label="Location" value={bill.location} />}
                      {bill.description && (
                        <div className="p-4 border-b last:border-0 border-gray-100 dark:border-slate-800">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-gray-400">
                              <FileText className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-slate-300 leading-relaxed pl-7">
                            {bill.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Module Specific Details */}
                {bill.utilityType === 'Electricity' && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Electricity Consumption</h4>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      <DetailRow icon={<Zap className="w-4 h-4" />} label="Total Units" value={`${bill.totalUnits || 0}`} />
                      <DetailRow icon={<IndianRupee className="w-4 h-4" />} label="Rate Per Unit" value={`₹${(bill.ratePerUnit || 0).toFixed(2)}`} />
                      {bill.meterNumber && <DetailRow icon={<Hash className="w-4 h-4" />} label="Meter Number" value={bill.meterNumber} />}
                      {bill.billingPeriod && <DetailRow icon={<Clock className="w-4 h-4" />} label="Billing Period" value={bill.billingPeriod} />}
                    </div>
                  </div>
                )}

                {bill.utilityType === 'Telecom' && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Telecom Details</h4>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      <DetailRow icon={<Wifi className="w-4 h-4" />} label="Service Type" value={bill.billType || 'Broadband'} />
                      <DetailRow icon={<Building2 className="w-4 h-4" />} label="Operator" value={bill.operatorName || 'Jio'} />
                      <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone Number" value={bill.phoneNumber || 'N/A'} />
                      <DetailRow icon={<Info className="w-4 h-4" />} label="Plan Name" value={bill.planName || 'N/A'} />
                      <DetailRow icon={<Info className="w-4 h-4" />} label="Data Usage" value={bill.dataUsage || 'N/A'} />
                    </div>
                  </div>
                )}

                {bill.utilityType === 'Solar Bill' && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Solar Metering</h4>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      <DetailRow icon={<ArrowUpCircle className="w-4 h-4" />} label="Imported" value={`${bill.kwhImportUnits || 0} Units`} />
                      <DetailRow icon={<ArrowUpCircle className="w-4 h-4" />} label="Exported" value={`${bill.kwhExportUnits || 0} Units`} />
                      <DetailRow icon={<Zap className="w-4 h-4" />} label="Net Units" value={`${bill.netUnits || 0} Units`} />
                      <DetailRow icon={<Sun className="w-4 h-4" />} label="Solar Gen" value={`${bill.solarGenerationUnits || 0} Units`} />
                    </div>
                  </div>
                )}

                {(bill.utilityType === 'Property Tax (MCG)' || bill.utilityType === 'Diversion Tax (RD)') && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Government Tax Details</h4>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      {bill.depositorName && <DetailRow icon={<UserIcon className="w-4 h-4" />} label="Depositor" value={bill.depositorName} />}
                      {bill.challanNumber && <DetailRow icon={<Hash className="w-4 h-4" />} label="Challan No" value={bill.challanNumber} mono />}
                      {bill.URN && <DetailRow icon={<ShieldCheck className="w-4 h-4" />} label="URN" value={bill.URN} mono />}
                      {bill.TIN && <DetailRow icon={<Hash className="w-4 h-4" />} label="TIN" value={bill.TIN} mono />}
                      {bill.CRN && <DetailRow icon={<Hash className="w-4 h-4" />} label="CRN" value={bill.CRN} mono />}
                      {bill.CIN && <DetailRow icon={<Hash className="w-4 h-4" />} label="CIN" value={bill.CIN} mono />}
                      {bill.receiptNumber && <DetailRow icon={<Hash className="w-4 h-4" />} label="Receipt No" value={bill.receiptNumber} mono />}
                      {bill.propertyId && <DetailRow icon={<Building2 className="w-4 h-4" />} label="Property ID" value={bill.propertyId} mono />}
                      {bill.purpose && <DetailRow icon={<Info className="w-4 h-4" />} label="Purpose" value={bill.purpose} />}
                      {bill.transactionDate && <DetailRow icon={<Calendar className="w-4 h-4" />} label="Trans Date" value={`${bill.transactionDate} ${bill.transactionTime || ''}`} />}
                      {bill.bankName && <DetailRow icon={<Building2 className="w-4 h-4" />} label="Bank" value={bill.bankName} />}
                      {bill.diversionTaxAmount && <DetailRow icon={<IndianRupee className="w-4 h-4" />} label="Diversion Tax Amount" value={formatCurrency(bill.diversionTaxAmount)} highlight />}
                      <DetailRow icon={<MapPin className="w-4 h-4" />} label="District" value={bill.district || bill.location || bill.state || 'N/A'} />
                      <DetailRow icon={<Calendar className="w-4 h-4" />} label="Period" value={bill.challanPeriod || bill.assessmentYear || 'N/A'} />
                    </div>
                  </div>
                )}

                {(bill.utilityType === 'Pollution Control' || bill.utilityType === 'CTE' || bill.utilityType === 'CTO' || bill.subcategory === 'pollution_control') && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Pollution Control Compliance</h4>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      <DetailRow icon={<FileText className="w-4 h-4" />} label="Doc Type" value={bill.documentType || bill.utilityType || 'N/A'} />
                      <DetailRow icon={<Hash className="w-4 h-4" />} label="Consent No" value={bill.consentNumber || 'N/A'} mono />
                      <DetailRow icon={<Building2 className="w-4 h-4" />} label="Authority" value={bill.authority || 'MPPCB'} />
                      <DetailRow icon={<Tag className="w-4 h-4" />} label="Category" value={bill.pollutionCategory || 'N/A'} />
                      <DetailRow icon={<Info className="w-4 h-4" />} label="Project Type" value={bill.projectType || 'N/A'} />
                      <DetailRow icon={<Calendar className="w-4 h-4" />} label="Issue Date" value={formatDateDisplay(bill.issueDate || bill.billDate)} />
                      <DetailRow icon={<Calendar className="w-4 h-4" />} label="Validity From" value={formatDateDisplay(bill.validityFrom)} />
                      <DetailRow icon={<Calendar className="w-4 h-4" />} label="Validity To" value={formatDateDisplay(bill.validityTo)} />
                      {bill.capitalInvestment && (
                        <DetailRow 
                          icon={<IndianRupee className="w-4 h-4" />} 
                          label="Capital Investment" 
                          value={isPollutionControl ? `₹${bill.capitalInvestment.toLocaleString('en-IN')} Lakhs` : formatCurrency(bill.capitalInvestment)} 
                        />
                      )}
                      {bill.projectArea && <DetailRow icon={<Layers className="w-4 h-4" />} label="Project Area" value={bill.projectArea} />}
                      {bill.unitsCount && <DetailRow icon={<Users className="w-4 h-4" />} label="Units Count" value={bill.unitsCount} />}
                      {bill.productionCapacity && <DetailRow icon={<Activity className="w-4 h-4" />} label="Capacity" value={bill.productionCapacity} />}
                      {bill.khasraNumber && <DetailRow icon={<Hash className="w-4 h-4" />} label="Khasra No" value={bill.khasraNumber} />}
                      {bill.dgSetDetails && <DetailRow icon={<Zap className="w-4 h-4" />} label="DG Set" value={bill.dgSetDetails} />}
                      {bill.stsDetails && <DetailRow icon={<Activity className="w-4 h-4" />} label="STP Details" value={bill.stsDetails} />}
                      {bill.hazardousWasteDetails && <DetailRow icon={<AlertCircle className="w-4 h-4" />} label="Hazardous Waste" value={bill.hazardousWasteDetails} />}
                      {bill.complianceConditions && <DetailRow icon={<Info className="w-4 h-4" />} label="Conditions" value={bill.complianceConditions} />}
                    </div>
                  </div>
                )}

                {/* Insurance Specific Information */}
                {(bill.utilityType?.includes('Insurance')) && (
                  <div className="space-y-6">
                    {/* Common Insurance Info */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Insurance Summary</h4>
                      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <DetailRow icon={<ShieldCheck className="w-4 h-4" />} label="Policy Number" value={bill.policyNumber || 'N/A'} mono />
                        <DetailRow icon={<Building2 className="w-4 h-4" />} label="Insurer" value={bill.insurerName || bill.companyName || 'N/A'} />
                        <DetailRow icon={<UserIcon className="w-4 h-4" />} label="Insured Name" value={bill.insuredName || 'N/A'} />
                        <DetailRow icon={<Tag className="w-4 h-4" />} label="Subcategory" value={bill.subcategory?.replace('_', ' ') || 'General'} />
                      </div>
                    </div>

                    {/* Vehicle Insurance Details */}
                    {(bill.subcategory === 'vehicle_insurance' || bill.utilityType === 'Vehicle Insurance' || bill.registrationNumber) && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Vehicle Information</h4>
                        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                          <DetailRow icon={<Car className="w-4 h-4" />} label="Registration No" value={bill.registrationNumber || 'N/A'} mono />
                          <DetailRow icon={<Car className="w-4 h-4" />} label="Make & Model" value={`${bill.vehicleMake || ''} ${bill.vehicleModel || ''}`.trim() || 'N/A'} />
                          <DetailRow icon={<Calendar className="w-4 h-4" />} label="Mfg Year" value={bill.manufacturingYear || 'N/A'} />
                          <DetailRow icon={<Hash className="w-4 h-4" />} label="Engine No" value={bill.engineNumber || 'N/A'} mono />
                          <DetailRow icon={<Hash className="w-4 h-4" />} label="Chassis No" value={bill.chassisNumber || 'N/A'} mono />
                          <DetailRow icon={<IndianRupee className="w-4 h-4" />} label="IDV Value" value={formatCurrency(bill.idv || 0)} />
                        </div>
                      </div>
                    )}

                    {/* Employee Insurance Details */}
                    {(bill.subcategory === 'employee_insurance' || bill.utilityType === 'Employee Insurance' || bill.numberOfEmployees) && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Employee & Coverage</h4>
                        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                          <DetailRow icon={<Building2 className="w-4 h-4" />} label="Insured Company" value={bill.insuredCompanyName || 'N/A'} />
                          <DetailRow icon={<Users className="w-4 h-4" />} label="Employees" value={String(bill.numberOfEmployees || 0)} />
                          <DetailRow icon={<Users className="w-4 h-4" />} label="Dependents" value={String(bill.numberOfDependents || 0)} />
                          <DetailRow icon={<ShieldCheck className="w-4 h-4" />} label="Sum Insured" value={formatCurrency(bill.sumInsured || 0)} />
                          <DetailRow icon={<Info className="w-4 h-4" />} label="Coverage Type" value={bill.coverageType || 'N/A'} />
                          <DetailRow icon={<Building2 className="w-4 h-4" />} label="TPA Name" value={bill.tpaName || 'N/A'} />
                        </div>
                      </div>
                    )}

                    {/* Payment / Receipt Details */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Payment Information</h4>
                      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <DetailRow icon={<Calendar className="w-4 h-4" />} label="Receipt Date" value={formatDateDisplay(bill.receiptDate)} />
                        <DetailRow icon={<IndianRupee className="w-4 h-4" />} label="Receipt Amount" value={formatCurrency(bill.receiptAmount || 0)} />
                        <DetailRow icon={<CreditCard className="w-4 h-4" />} label="Payment Mode" value={bill.paymentMode || 'N/A'} />
                        <DetailRow icon={<UserIcon className="w-4 h-4" />} label="Paying Party" value={bill.payingParty || 'N/A'} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Billing Breakdown (Tables simplified) */}
                {(['Electricity', 'Water', 'Solar Bill', 'Telecom', 'Insurance', 'Vehicle Insurance', 'Employee Insurance', 'General Insurance', 'Property Tax'].some(t => bill.utilityType?.includes(t)) || bill.baseAmount || bill.taxAmount || bill.fine) && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Charge Breakdown</h4>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50 dark:divide-slate-800">
                      {bill.utilityType === 'Telecom' ? (
                        <>
                          <BreakdownItem label="Internet Charges" value={bill.internetCharges} />
                          <BreakdownItem label="Other Charges" value={bill.otherCharges} />
                        </>
                      ) : bill.utilityType === 'Solar Bill' ? (
                        <>
                          <BreakdownItem label="Fixed Charges" value={bill.fixedCharges || bill.fixedCharge} />
                          <BreakdownItem label="Rebate / Incentives" value={bill.rebate || bill.rebateIncentive} isNegative />
                        </>
                      ) : bill.utilityType?.includes('Insurance') ? (
                        <>
                          <BreakdownItem label="Own Damage Premium" value={bill.ownDamagePremium} />
                          <BreakdownItem label="Third Party Premium" value={bill.thirdPartyPremium} />
                          <BreakdownItem label="Package Premium" value={bill.packagePremium} />
                          <BreakdownItem label="GST Amount" value={bill.gstAmount} />
                          <BreakdownItem label="Stamp Duty" value={bill.stampDuty} />
                        </>
                      ) : bill.utilityType === 'Diversion Tax (RD)' ? (
                        <>
                          <BreakdownItem label="Diversion Tax Amount" value={bill.diversionTaxAmount || bill.taxAmount} highlight />
                          {bill.totalAmount && bill.totalAmount !== (bill.diversionTaxAmount || bill.taxAmount) && (
                            <BreakdownItem label="Total Amount" value={bill.totalAmount} />
                          )}
                        </>
                      ) : bill.utilityType?.includes('Property Tax') ? (
                        <>
                          <BreakdownItem label="Property Tax" value={bill.propertyTax} />
                          <BreakdownItem label="Education Cess" value={bill.educationCess} />
                          <BreakdownItem label="Samekit" value={bill.samekit} />
                          <BreakdownItem label="Additional Samekit" value={bill.addSamekit} />
                          <BreakdownItem label="Samagra Cess" value={bill.samagraCess} />
                          <BreakdownItem label="Urban Tax" value={bill.urbanTax} />
                          <BreakdownItem label="Garbage Charges" value={bill.garbageCharges} />
                          <BreakdownItem label="Sam Swach" value={bill.samSwach} />
                          <BreakdownItem label="Sewa Kar" value={bill.sewaKar} />
                          <BreakdownItem label="Vyapak Swachata" value={bill.vyapakSwachataKar} />
                          <BreakdownItem label="Penalty" value={bill.penalty} />
                          <BreakdownItem label="Rebate" value={bill.rebate} isNegative />
                          <BreakdownItem label="Advance" value={bill.advance} isNegative />
                        </>
                      ) : (bill.utilityType === 'Electricity' || bill.utilityType === 'Water') ? (
                        <>
                          <BreakdownItem label="Energy Charges" value={bill.energyCharges} />
                          <BreakdownItem label="Fixed Charges" value={bill.fixedCharge || bill.fixedCharges} />
                          <BreakdownItem label="FPPAS" value={bill.fppas} />
                          <BreakdownItem label="Surcharge" value={bill.surcharge} />
                          <BreakdownItem label="Electricity Duty" value={bill.electricityDuty} />
                          <BreakdownItem label="Tax Amount" value={bill.taxAmount || bill.diversionTaxAmount} />
                          <BreakdownItem label="Additional SD" value={bill.additionalSD} />
                          <BreakdownItem label="Other Charges" value={bill.otherCharges} />
                          <BreakdownItem label="Lock Credit Rebate" value={bill.lockCreditRebate} isNegative />
                          <BreakdownItem label="Rebate / Incentive" value={bill.rebateIncentive} isNegative />
                          <BreakdownItem label="Int. on Security Deposit" value={bill.interestOnSecurityDeposit} isNegative />
                          <BreakdownItem label="CCB Adjustment" value={bill.ccbAdjustment} isNegative />
                          <BreakdownItem label="Subsidy" value={bill.subsidyAmount || bill.advance} isNegative />
                        </>
                      ) : (
                        <>
                          <BreakdownItem label="Base Amount" value={bill.baseAmount} />
                          <BreakdownItem label="Tax Amount" value={bill.taxAmount || bill.diversionTaxAmount} />
                          <BreakdownItem label="Fine / Penalty" value={bill.fine} />
                          <BreakdownItem label="Security Amount" value={bill.securityAmount} />
                          <BreakdownItem label="Deposit" value={bill.depositAmount} isNegative />
                        </>
                      )}
                      <div className="p-4 bg-gray-50 dark:bg-slate-900 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Total Amount</span>
                        <span className="text-lg font-black text-primary">
                          {isPollutionControl ? `₹${bill.amount?.toLocaleString('en-IN')} Lakhs` : formatCurrency(bill.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity Log */}
                {bill.workflowLogs && bill.workflowLogs.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Activity History</h4>
                    <div className="space-y-4">
                      {bill.workflowLogs.slice().reverse().map((log, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{log.action || log.stage}</p>
                            <p className="text-xs text-gray-500 mt-0.5">by {log.user} • {new Date(log.timestamp).toLocaleString()}</p>
                            
                            {/* Detailed Payment Info for Confirmation */}
                            {log.action === 'Payment Confirmed' && (
                              <div className="mt-3 p-4 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100/50 dark:border-purple-900/20 rounded-2xl space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-purple-600 uppercase tracking-widest leading-none">Bank Name</p>
                                    <p className="text-xs font-black text-gray-900 dark:text-white leading-tight break-words">{log.bankName || 'N/A'}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-purple-600 uppercase tracking-widest leading-none">Method</p>
                                    <p className="text-xs font-black text-gray-900 dark:text-white leading-tight">{log.upiMode || 'N/A'}</p>
                                  </div>
                                  <div className="space-y-1 col-span-2">
                                    <p className="text-[9px] font-bold text-purple-600 uppercase tracking-widest leading-none">Trans / Ref Number</p>
                                    <p className="text-xs font-mono font-bold text-gray-900 dark:text-white leading-tight break-all">{log.upiReference || 'N/A'}</p>
                                  </div>
                                  {log.amount && (
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-bold text-purple-600 uppercase tracking-widest leading-none">Amount Paid</p>
                                      <p className="text-xs font-black text-gray-900 dark:text-white leading-tight">
                                        {isPollutionControl ? `₹${log.amount?.toLocaleString('en-IN')} Lakhs` : formatCurrency(log.amount)}
                                      </p>
                                    </div>
                                  )}
                                  {log.paymentDate && (
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-bold text-purple-600 uppercase tracking-widest leading-none">Payment Date</p>
                                      <p className="text-xs font-black text-gray-900 dark:text-white leading-tight">{formatDateDisplay(log.paymentDate)}</p>
                                    </div>
                                  )}
                                </div>

                                {log.proofUrl && (
                                  <div className="pt-2 border-t border-purple-100/50 dark:border-purple-900/20">
                                    <button 
                                      onClick={() => window.open(log.proofUrl, '_blank')}
                                      className="flex items-center gap-2 text-[10px] font-black text-purple-600 uppercase tracking-[0.1em] hover:text-purple-700 transition-colors"
                                    >
                                      <FileText className="w-3 h-3" />
                                      View Payment Proof
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Initiation Proof for Initiation Log */}
                            {log.action === 'Payment Initiated' && log.proofUrl && (
                              <div className="mt-2">
                                <button 
                                  onClick={() => window.open(log.proofUrl, '_blank')}
                                  className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-[0.1em] hover:text-orange-700 transition-colors bg-orange-50 dark:bg-orange-900/10 px-3 py-1.5 rounded-lg border border-orange-100/50 dark:border-orange-900/20"
                                >
                                  <FileText className="w-3 h-3" />
                                  View Intent/Proof
                                </button>
                              </div>
                            )}

                            {/* Tally Entry proof */}
                            {log.action === 'Tally Entry' && log.proofUrl && (
                              <div className="mt-2">
                                <button 
                                  onClick={() => window.open(log.proofUrl, '_blank')}
                                  className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-[0.1em] hover:text-orange-700 transition-colors bg-orange-50 dark:bg-orange-900/10 px-3 py-1.5 rounded-lg border border-orange-100/50 dark:border-orange-900/20"
                                >
                                  <FileText className="w-3.5 h-3.5 text-orange-600" />
                                  View Tally Entry Proof
                                </button>
                              </div>
                            )}

                            {log.remarks && (
                              <div className="mt-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Remarks</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl italic border border-gray-100/50 dark:border-slate-700">"{log.remarks}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {bill.attachments && bill.attachments.length > 0 && (
                  <div className="space-y-4 pb-10">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Attachments</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {bill.attachments.map((file, idx) => (
                        <AttachmentItem key={idx} file={file} canDownload={true} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
              {canTallyAction && (
                <button
                  onClick={() => onTallyEntry?.(bill)}
                  className="flex-1 min-w-[140px] h-12 bg-indigo-600 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.1em] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <History className="w-4 h-4" />
                  Tally Entry
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
const DetailRow = ({ icon, label, value, mono, highlight }: { icon: React.ReactNode, label: string, value: string, mono?: boolean, highlight?: boolean }) => (
  <div className="flex items-center justify-between p-4 border-b last:border-0 border-gray-100 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
    <div className="flex items-center gap-3">
      <div className="text-gray-400">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
    </div>
    <span className={cn(
      "text-sm font-semibold text-right max-w-[50%] truncate",
      highlight ? "text-red-600" : "text-gray-900 dark:text-white",
      mono && "font-mono"
    )}>
      {value}
    </span>
  </div>
);

const BreakdownItem = ({ label, value, isNegative, highlight }: { label: string, value?: number, isNegative?: boolean, highlight?: boolean }) => {
  if (value === undefined || value === 0) return null;
  const isValueNegative = isNegative || value < 0;
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b last:border-0 border-gray-50 dark:border-slate-800">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className={cn(
        "text-sm font-bold",
        highlight ? "text-primary dark:text-primary" : (isValueNegative ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white")
      )}>
        {isNegative && value > 0 ? "-" : ""}{formatCurrency(value)}
      </span>
    </div>
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
            <FileIcon className="w-6 h-6 text-gray-400" />
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
