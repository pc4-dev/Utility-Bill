import React from 'react';
import { Bill, ModulePermissions } from '../types';
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
  ArrowRight,
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
  Bug,
  Wind,
  Layers,
  Activity,
  ArrowUpCircle,
  ArrowDownCircle,
  FileCheck,
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
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency, getStatusColor, getPriorityColor, formatDateDisplay, downloadFile } from '../utils';

interface BillDetailsModalProps {
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

export const BillDetailsModal: React.FC<BillDetailsModalProps> = ({ 
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
  if (!bill) return null;

  const statusLower = bill.status?.toLowerCase();
  const isPending = statusLower === 'pending';
  const isVerified = statusLower === 'verified';
  const isApproved = statusLower === 'approved';
  const isPaymentInitiated = statusLower === 'payment initiated';
  const isPaymentConfirmed = statusLower === 'payment confirmed' || statusLower === 'paid';
  const isTallyCompleted = statusLower === 'tally entry';
  const isPaid = isTallyCompleted;

  const isInsurance = bill.utilityType === 'Insurance' || bill.utilityType === 'Labour Insurance' || bill.utilityType === 'Asset Insurance' || bill.subcategory?.includes('insurance');
  const isPollution = bill.subcategory === 'pollution_control' || bill.utilityType === 'Pollution Control';
  const isGovTax = bill.utilityType === 'Property Tax (MCG)' || bill.utilityType === 'Diversion Tax (RD)';
  const isUtility = ['Electricity', 'Telecom', 'Solar Bill', 'Data (Internet)', 'Landline'].includes(bill.utilityType || '');

  // Get module ID based on bill type
  const getModuleId = (bill: Bill) => {
    const type = bill.utilityType || '';
    const sub = bill.subcategory || '';
    if (type === 'Electricity') return 'electricity';
    if (type === 'Solar Bill') return 'solar';
    if (type === 'Telecom' || type === 'Data (Internet)' || type === 'Landline') return 'telecom';
    if (type === 'Insurance' || type === 'Labour Insurance' || type === 'Asset Insurance' || sub.includes('insurance')) return 'insurance';
    if (type === 'Property Tax (MCG)' || type === 'Diversion Tax (RD)') return 'government';
    if (sub === 'pollution_control' || type === 'Pollution Control') return 'pollution';
    return 'bills';
  };

  const moduleId = getModuleId(bill);
  const isTelecom = moduleId === 'telecom';

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
  
  // Role-based logic based on requirements:
  // DATA_ENTRY: verify
  // ADMIN: approve
  // ACCOUNT_MANAGEMENT: initiate
  // ACCOUNT_MANAGER: confirm
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isDataEntry = user?.role === 'DATA_ENTRY';
  const isAccountManagement = user?.role === 'ACCOUNT_MANAGEMENT';
  const isAccountManager = user?.role === 'ACCOUNT_MANAGER';

  const canDownload = !(isAccountManagement && isTelecom);

  const canEdit = isAdmin;
  const canDelete = isAdmin;
  
  // Specific stage permissions
  const canVerifyAction = isAdmin || isDataEntry;
  const canApproveAction = isAdmin; // Only Admin can approve
  const canInitiateAction = isAdmin || isAccountManagement;
  const canConfirmAction = isAdmin || isAccountManager || isAccountManagement;
  const canTallyAction = (isAdmin || isAccountManagement || isAccountManager || user?.role === 'ACCOUNT' || user?.role === 'FINANCE') && isPaymentConfirmed;

  const isReadOnly = !canEdit;
  const isOverdue = bill.status?.toLowerCase() === 'overdue';

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border flex flex-col max-h-[90vh]",
              isOverdue ? "border-red-100" : "border-gray-100"
            )}
          >
            {/* Header with Status */}
            <div className="relative p-8 border-b border-gray-50 dark:border-slate-800 flex-shrink-0">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400 shadow-sm">
                  {getUtilityIcon(bill.utilityType)}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                    {bill.propertyName === 'Others' ? bill.customPropertyName || 'Others' : bill.propertyName}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">{bill.utilityType}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider",
                      getStatusColor(bill.status).split(' ')[1]
                    )}>
                      {bill.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

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

              {/* Amount Highlight */}
              <div className="p-8 bg-gray-50/50 dark:bg-slate-800/30 border-b border-gray-100 dark:border-slate-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {bill.subcategory === 'pollution_control' ? "Capital Investment" : "Total Amount Due"}
                </p>
                <h3 className={cn(
                  "text-4xl font-black transition-colors",
                  (bill.amount || 0) < 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                )}>
                  {bill.subcategory === 'pollution_control' 
                    ? (bill.amount ? formatCurrency(bill.amount) : `₹${bill.capitalInvestment || 0} Lakhs`) 
                    : formatCurrency(bill.amount)}
                </h3>
                {bill.dueDate && (
                  <p className="text-sm text-gray-500 mt-2">
                    Due on {formatDateDisplay(bill.dueDate)}
                  </p>
                )}
              </div>

              {/* Details List */}
              <div className="p-8 space-y-8">
                {/* General Details */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">General Information</h4>
                  <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <DetailItem icon={<Hash className="w-4 h-4" />} label="Bill ID" value={bill.billId} mono />
                    <DetailItem icon={<Calendar className="w-4 h-4" />} label="Bill Date" value={formatDateDisplay(bill.billDate)} />
                    <DetailItem icon={<Calendar className="w-4 h-4" />} label="Due Date" value={formatDateDisplay(bill.dueDate)} highlight={isOverdue} />
                    <DetailItem icon={<Building2 className="w-4 h-4" />} label="Project" value={bill.propertyName === 'Others' ? bill.customPropertyName || 'Others' : bill.propertyName} />
                    <DetailItem icon={<Building2 className="w-4 h-4" />} label="Company" value={bill.companyName || 'N/A'} />
                    {bill.billNumber && <DetailItem icon={<FileText className="w-4 h-4" />} label="Bill Number" value={bill.billNumber} />}
                    {bill.accountNumber && <DetailItem icon={<CreditCard className="w-4 h-4" />} label="Account Number" value={bill.accountNumber} />}
                    {bill.consumerNumber && <DetailItem icon={<UserIcon className="w-4 h-4" />} label="Consumer Number" value={bill.consumerNumber} />}
                    <DetailItem icon={<Wrench className="w-4 h-4" />} label="Service Provider" value={bill.serviceProvider || 'N/A'} />
                  </div>
                </div>

                {/* Module Specific Details */}
                {(bill.utilityType === 'Diversion Tax (RD)' || (bill.diversionTaxAmount || 0) > 0) && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Diversion Tax Details</h4>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      {bill.depositorName && <DetailItem icon={<UserIcon className="w-4 h-4" />} label="Depositor" value={bill.depositorName} />}
                      {bill.district && <DetailItem icon={<MapPin className="w-4 h-4" />} label="District" value={bill.district} />}
                      {bill.challanNumber && <DetailItem icon={<FileText className="w-4 h-4" />} label="Challan No" value={bill.challanNumber} mono />}
                      {bill.challanPeriod && <DetailItem icon={<Calendar className="w-4 h-4" />} label="Challan Period" value={bill.challanPeriod} />}
                      {bill.diversionTaxAmount && <DetailItem icon={<IndianRupee className="w-4 h-4" />} label="Tax Amount" value={`₹${bill.diversionTaxAmount.toLocaleString()}`} highlight />}
                    </div>
                  </div>
                )}
                {isTelecom && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Telecom Details</h4>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      <DetailItem icon={<Wifi className="w-4 h-4" />} label="Service Type" value={bill.billType || 'N/A'} />
                      <DetailItem icon={<Building2 className="w-4 h-4" />} label="Operator" value={bill.operatorName || 'N/A'} />
                      <DetailItem icon={<Phone className="w-4 h-4" />} label="Phone Number" value={bill.phoneNumber || 'N/A'} />
                      <DetailItem icon={<Info className="w-4 h-4" />} label="Plan Name" value={bill.planName || 'N/A'} />
                      <DetailItem icon={<Info className="w-4 h-4" />} label="Data Usage" value={bill.dataUsage || 'N/A'} />
                    </div>
                  </div>
                )}

                {bill.utilityType === 'Solar Bill' && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Solar Metering</h4>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      <DetailItem icon={<ArrowUpCircle className="w-4 h-4" />} label="Imported" value={`${bill.kwhImportUnits || 0} Units`} />
                      <DetailItem icon={<ArrowUpCircle className="w-4 h-4" />} label="Exported" value={`${bill.kwhExportUnits || 0} Units`} />
                      <DetailItem icon={<Zap className="w-4 h-4" />} label="Net Units" value={`${bill.netUnits || 0} Units`} />
                      <DetailItem icon={<Sun className="w-4 h-4" />} label="Solar Gen" value={`${bill.solarGenerationUnits || 0} Units`} />
                    </div>
                  </div>
                )}

                {isGovTax && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tax Details</h4>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      {bill.challanNumber && <DetailItem icon={<Hash className="w-4 h-4" />} label="Challan No" value={bill.challanNumber} mono />}
                      {bill.URN && <DetailItem icon={<ShieldCheck className="w-4 h-4" />} label="URN" value={bill.URN} mono />}
                      {bill.receiptNumber && <DetailItem icon={<Hash className="w-4 h-4" />} label="Receipt No" value={bill.receiptNumber} mono />}
                      {bill.propertyId && <DetailItem icon={<Building2 className="w-4 h-4" />} label="Property ID" value={bill.propertyId} mono />}
                      <DetailItem icon={<MapPin className="w-4 h-4" />} label="District" value={bill.district || 'N/A'} />
                      <DetailItem icon={<Calendar className="w-4 h-4" />} label="Period" value={bill.challanPeriod || bill.assessmentYear || 'N/A'} />
                    </div>
                  </div>
                )}

                {isInsurance && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Insurance Details</h4>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      <DetailItem icon={<ShieldCheck className="w-4 h-4" />} label="Policy Number" value={bill.policyNumber || 'N/A'} mono />
                      <DetailItem icon={<Building2 className="w-4 h-4" />} label="Insurer" value={bill.insurerName || bill.companyName || 'N/A'} />
                      <DetailItem icon={<UserIcon className="w-4 h-4" />} label="Insured Name" value={bill.insuredName || 'N/A'} />
                    </div>
                  </div>
                )}

                {isPollution && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Pollution Consent</h4>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      <DetailItem icon={<ShieldCheck className="w-4 h-4" />} label="Consent No" value={bill.consentNumber || 'N/A'} mono />
                      <DetailItem icon={<Building2 className="w-4 h-4" />} label="Authority" value={bill.authority || 'N/A'} />
                      <DetailItem icon={<Tag className="w-4 h-4" />} label="Category" value={bill.pollutionCategory || 'N/A'} />
                      <DetailItem icon={<Calendar className="w-4 h-4" />} label="Issue Date" value={formatDateDisplay(bill.issueDate || bill.billDate)} />
                      <DetailItem icon={<Calendar className="w-4 h-4" />} label="Expiry Date" value={formatDateDisplay(bill.dueDate)} />
                    </div>
                  </div>
                )}

                {/* Charge Breakdown */}
                {isUtility && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Charge Breakdown</h4>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50 dark:divide-slate-800">
                      {isTelecom ? (
                        <>
                          <BreakdownItem label="Internet Charges" value={bill.internetCharges} />
                          <BreakdownItem label="Other Charges" value={bill.otherCharges} />
                        </>
                      ) : bill.utilityType === 'Solar Bill' ? (
                        <>
                          <BreakdownItem label="Fixed Charges" value={bill.fixedCharges || bill.fixedCharge} />
                          <BreakdownItem label="Rebate / Incentives" value={bill.rebate || bill.rebateIncentive} isNegative />
                        </>
                      ) : bill.utilityType === 'Diversion Tax (RD)' ? (
                        <>
                          <BreakdownItem label="Diversion Tax Amount" value={bill.diversionTaxAmount || bill.taxAmount} />
                          {bill.totalAmount && (
                            <BreakdownItem label="Total Amount" value={bill.totalAmount} />
                          )}
                        </>
                      ) : (
                        <>
                          <BreakdownItem label="Energy Charges" value={bill.energyCharges} />
                          <BreakdownItem label="Fixed Charges" value={bill.fixedCharge || bill.fixedCharges} />
                          <BreakdownItem label="Surcharge" value={bill.fppas || bill.surcharge} />
                          <BreakdownItem label="Duty / Tax" value={bill.electricityDuty || bill.taxAmount || bill.diversionTaxAmount} />
                          <BreakdownItem label="Subsidy" value={bill.subsidyAmount || bill.advance} isNegative />
                        </>
                      )}
                      <div className="p-4 bg-gray-50 dark:bg-slate-800 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Total Amount</span>
                        <span className={cn(
                          "text-lg font-black transition-colors",
                          (bill.amount || 0) < 0 ? "text-red-600 dark:text-red-400" : "text-primary"
                        )}>
                          {formatCurrency(bill.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity History */}
                {bill.workflowLogs && bill.workflowLogs.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Activity History</h4>
                    <div className="space-y-6">
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
                                      <p className="text-xs font-black text-gray-900 dark:text-white leading-tight">{formatCurrency(log.amount)}</p>
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

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-6 pb-6 w-full border-t border-gray-100 dark:border-slate-800 transition-colors z-20 px-8">
              <div className="flex flex-wrap items-center gap-2">
                  {isPending && canVerifyAction && (
                    <button
                      onClick={() => onVerify?.(bill)}
                      className={cn(
                        "flex-1 min-w-[140px] px-4 py-3 rounded-full font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg bg-green-600 hover:bg-green-700 text-white shadow-green-500/25 hover:-translate-y-0.5 active:translate-y-0"
                      )}
                      title="Verify Bill"
                    >
                      <CheckCircle2 className="w-4 h-4 text-current" />
                      Verify
                    </button>
                  )}

                  {isVerified && canApproveAction && (
                    <button
                      onClick={() => onApprove?.(bill)}
                      className={cn(
                        "flex-1 min-w-[140px] px-4 py-3 rounded-full font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0"
                      )}
                      title="Approve Bill"
                    >
                      <ShieldCheck className="w-4 h-4 text-current" />
                      Approve
                    </button>
                  )}

                  {isApproved && canInitiateAction && (
                    <button
                      onClick={() => onInitiatePayment?.(bill)}
                      className={cn(
                        "flex-1 min-w-[140px] px-4 py-3 rounded-full font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg bg-orange-600 hover:bg-orange-700 text-white shadow-orange-500/25 hover:-translate-y-0.5 active:translate-y-0"
                      )}
                      title="Initiate Payment"
                    >
                      <CreditCard className="w-4 h-4 text-current" />
                      Initiate
                    </button>
                  )}

                  {isPaymentInitiated && canConfirmAction && (
                    <button
                      onClick={() => onConfirmPayment?.(bill)}
                      className={cn(
                        "flex-1 min-w-[140px] px-4 py-3 rounded-full font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/25 hover:-translate-y-0.5 active:translate-y-0"
                      )}
                      title="Confirm Payment"
                    >
                      <CheckSquare className="w-4 h-4 text-current" />
                      Confirm
                    </button>
                  )}

                  {isPaymentConfirmed && canTallyAction && (
                    <button
                      onClick={() => onTallyEntry?.(bill)}
                      className={cn(
                        "flex-1 min-w-[140px] px-4 py-3 rounded-full font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0"
                      )}
                      title="Complete Tally Entry"
                    >
                      <History className="w-4 h-4 text-current" />
                      Tally Entry
                    </button>
                  )}

                  {canEdit && !isPaid && (
                    <button
                      onClick={() => onEdit(bill)}
                      className="flex-1 min-w-[120px] px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-600 active:scale-95"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}

                  {canDelete && onDelete && !isPaid && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this bill? This action cannot be undone.')) {
                          onDelete(bill.id || (bill as any)._id);
                          onClose();
                        }
                      }}
                      className="flex-1 min-w-[120px] px-4 py-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className={cn(
                      "flex-1 min-w-[120px] px-8 py-3 bg-gray-900 dark:bg-slate-700 text-white rounded-xl font-black text-[11px] uppercase tracking-wider transition-all hover:bg-black dark:hover:bg-slate-600 active:scale-95 shadow-xl"
                    )}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            {/* Overdue Accent */}
            {isOverdue && (
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-red-500" />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Internal components
const DetailItem: React.FC<{ icon: React.ReactNode, label: string, value: string, mono?: boolean, highlight?: boolean, success?: boolean }> = ({ icon, label, value, mono, highlight, success }) => (
  <div className="flex items-center justify-between p-4 border-b last:border-0 border-gray-100 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
    <div className="flex items-center gap-3">
      <div className="text-gray-400">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
    </div>
    <span className={cn(
      "text-sm font-semibold text-right max-w-[50%] truncate",
      highlight ? "text-red-600" : success ? "text-green-600" : "text-gray-900 dark:text-white",
      mono && "font-mono"
    )}>
      {value}
    </span>
  </div>
);

const BreakdownItem = ({ label, value, isNegative }: { label: string, value?: number, isNegative?: boolean }) => {
  if (value === undefined || value === 0) return null;
  const isValueNegative = isNegative || value < 0;
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b last:border-0 border-gray-50 dark:border-slate-800">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className={cn(
        "text-sm font-bold",
        isValueNegative ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
      )}>
        {isNegative && value > 0 ? "-" : ""}{formatCurrency(value)}
      </span>
    </div>
  );
};

const AttachmentItem = ({ file, canDownload }: { file: any, canDownload?: boolean }) => {
  const isImage = file.type?.startsWith('image/') || file.url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/);
  const isPdf = file.type === 'application/pdf' || file.url.toLowerCase().match(/\.pdf$/);
  
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800/80 transition-all group">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 border border-gray-100 dark:border-slate-700">
          {isImage ? (
            <img src={file.url} alt="" className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
          ) : isPdf ? (
            <FileIcon className="w-5 h-5 text-red-500" />
          ) : (
            <FileIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{file.name}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {isImage ? 'Image' : isPdf ? 'PDF Document' : 'Document'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => window.open(file.url, '_blank')}
          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
        >
          <Eye className="w-4 h-4" />
        </button>
        {canDownload && (
          <button 
            onClick={() => downloadFile(file.url, file.name)}
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

const BillingRow = ({ label, value, isNegative, isTotal, bold }: { label: string, value?: number, isNegative?: boolean, isTotal?: boolean, bold?: boolean }) => {
  if (value === undefined || value === 0) return null;
  const isValueNegative = isNegative || value < 0;
  return (
    <tr className={cn(
      isTotal ? "bg-orange-600 text-white font-bold" : "hover:bg-gray-50 transition-colors",
      bold && "font-bold"
    )}>
      <td className="py-2.5 px-4">{label}</td>
      <td className={cn(
        "py-2.5 px-4 text-right",
        isValueNegative && !isTotal ? "text-red-600" : ""
      )}>
        {isNegative && value > 0 ? "-" : ""}₹{value.toLocaleString()}
      </td>
    </tr>
  );
};
