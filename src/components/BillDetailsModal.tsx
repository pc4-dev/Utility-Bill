import React from 'react';
import { Bill, ModulePermissions } from '../types';
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
  File,
  AlertCircle,
  Trash2,
  Car,
  Users,
  History,
  User as UserIcon,
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  onConfirmPayment
}) => {
  const { user } = useAuth();
  if (!bill) return null;

  const statusLower = bill.status?.toLowerCase();
  const isPending = statusLower === 'pending';
  const isVerified = statusLower === 'verified';
  const isApproved = statusLower === 'approved';
  const isPaymentInitiated = statusLower === 'payment initiated';
  const isPaid = statusLower === 'paid' || statusLower === 'payment_confirmed';

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
  const canConfirmAction = isAdmin || isAccountManager;

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
            <div className="relative p-5 sm:p-8 border-b border-gray-50 flex-shrink-0">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0",
                  (bill.utilityType === 'Telecom' || bill.utilityType === 'Property Tax (MCG)' || bill.utilityType === 'Diversion Tax (RD)' || bill.utilityType === 'Insurance') ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                )}>
                  {getUtilityIcon(bill.utilityType)}
                </div>
                <div className="flex-1 pr-8">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      getStatusColor(bill.status)
                    )}>
                      {bill.status}
                    </span>
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {bill.subcategory === 'pollution_control' ? (bill.documentType || 'Document Type') : (bill.utilityType === 'Other' ? bill.customUtilityType : bill.utilityType)}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                    {bill.propertyName === 'Others' ? bill.customPropertyName || 'Others' : bill.propertyName}
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-8 space-y-8 overflow-y-auto custom-scrollbar">
              {/* Amount Highlight */}
              <div className="space-y-4">
                <div className={cn(
                  "rounded-2xl p-5 sm:p-6 text-center transition-all",
                  bill.amount < 0 ? "bg-red-50 ring-1 ring-red-100" : "bg-gray-50"
                )}>
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    {bill.subcategory === 'pollution_control' ? "Capital Investment" : (bill.amount < 0 ? "Credit Amount" : "Total Amount Due")}
                  </p>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className={cn(
                      "text-3xl sm:text-4xl font-black transition-colors",
                      bill.amount < 0 ? "text-red-600" : "text-gray-900"
                    )}>
                      {bill.subcategory === 'pollution_control' ? `₹${bill.capitalInvestment || 0} Lakhs` : formatCurrency(bill.amount)}
                    </span>
                    {bill.amount < 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 uppercase tracking-widest mt-1">
                        <AlertCircle className="w-3 h-3" />
                        Negative Amount Detected
                      </div>
                    )}
                  </div>
                </div>

                {(bill.outstandingAmount !== undefined || bill.pendingAmount !== undefined) && (bill.outstandingAmount! > 0 || bill.pendingAmount! > 0) && (
                  <div className="flex gap-3">
                    {bill.outstandingAmount !== undefined && bill.outstandingAmount > 0 && (
                      <div className="flex-1 bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
                        <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-1">Outstanding</p>
                        <p className="text-lg font-black text-red-600">{formatCurrency(bill.outstandingAmount)}</p>
                      </div>
                    )}
                    {bill.pendingAmount !== undefined && bill.pendingAmount > 0 && (
                      <div className="flex-1 bg-orange-50 border border-orange-100 rounded-2xl p-4 text-center">
                        <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-1">Pending</p>
                        <p className="text-lg font-black text-orange-600">{formatCurrency(bill.pendingAmount)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 sm:gap-y-6 gap-x-4">
                <DetailItem 
                  icon={<Hash className="w-4 h-4" />} 
                  label="Bill ID" 
                  value={bill.billId} 
                  mono
                />
                <DetailItem 
                  icon={<Calendar className="w-4 h-4" />} 
                  label={isPollution ? (bill.documentType === 'CTE' ? "Valid Until" : "Expiry Date") : "Due Date"} 
                  value={formatDateDisplay(bill.dueDate)} 
                  highlight={isOverdue}
                />
                {isPollution && (
                  <DetailItem 
                    icon={<Calendar className="w-4 h-4" />} 
                    label="Issue Date" 
                    value={formatDateDisplay(bill.issueDate || bill.billDate)} 
                  />
                )}
                <DetailItem 
                  icon={<Clock className="w-4 h-4" />} 
                  label="Billing Period" 
                  value={bill.billingPeriod || (bill.month && bill.year ? `${bill.month}-${bill.year}` : `${bill.month || ''} ${bill.year || ''}`.trim())} 
                />
                {bill.submissionDateTime && (
                  <DetailItem 
                    icon={<FileCheck className="w-4 h-4" />} 
                    label="Submitted On" 
                    value={new Date(bill.submissionDateTime).toLocaleString()} 
                    success
                  />
                )}
                <DetailItem 
                  icon={<Tag className="w-4 h-4" />} 
                  label="Bill Type" 
                  value={bill.utilityType === 'Other' ? bill.customUtilityType || 'Other' : bill.utilityType} 
                />
                <DetailItem 
                  icon={<Building2 className="w-4 h-4" />} 
                  label="Company" 
                  value={bill.companyName === 'Others' ? bill.customCompanyName || 'Others' : bill.companyName || 'N/A'} 
                />
                {bill.utilityType !== 'Property Tax (MCG)' && bill.utilityType !== 'Diversion Tax (RD)' && bill.utilityType !== 'Telecom' && bill.subcategory !== 'pollution_control' && (
                  <DetailItem 
                    icon={<Wrench className="w-4 h-4" />} 
                    label="Service Provider" 
                    value={bill.serviceProvider || 'N/A'} 
                  />
                )}
                {bill.utilityType === 'Telecom' && (
                  <DetailItem 
                    icon={<Building2 className="w-4 h-4" />} 
                    label="Project" 
                    value={bill.propertyName === 'Others' ? bill.customPropertyName || 'Others' : bill.propertyName || 'N/A'} 
                  />
                )}
                {isPaid && bill.paymentDate && (
                  <DetailItem 
                    icon={<CreditCard className="w-4 h-4" />} 
                    label="Payment Date" 
                    value={formatDateDisplay(bill.paymentDate)} 
                    success
                  />
                )}
                <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-gray-50/50 border border-gray-100 transition-all hover:bg-white hover:shadow-sm">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Priority</span>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider w-fit",
                    getPriorityColor(bill.priority || 'Normal')
                  )}>
                    {bill.priority || 'Normal'}
                  </span>
                </div>
                {bill.transactionDate && (
                  <DetailItem 
                    icon={<Calendar className="w-4 h-4" />} 
                    label="Trans. Date" 
                    value={bill.transactionDate} 
                  />
                )}
                {bill.transactionTime && (
                  <DetailItem 
                    icon={<Clock className="w-4 h-4" />} 
                    label="Trans. Time" 
                    value={bill.transactionTime} 
                  />
                )}
                {bill.outstandingAmount !== undefined && bill.outstandingAmount > 0 && (
                  <DetailItem 
                    icon={<AlertCircle className="w-4 h-4 text-red-500" />} 
                    label="Outstanding Amount" 
                    value={formatCurrency(bill.outstandingAmount)} 
                    highlight
                  />
                )}
                {bill.pendingAmount !== undefined && bill.pendingAmount > 0 && (
                  <DetailItem 
                    icon={<Clock className="w-4 h-4 text-orange-500" />} 
                    label="Pending Amount" 
                    value={formatCurrency(bill.pendingAmount)} 
                  />
                )}
              </div>

              {/* Electricity Detailed Billing Details */}
              {bill.utilityType === 'Electricity' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Billing Breakup Details</span>
                    <div className="h-px flex-1 bg-gray-100 ml-4"></div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <tbody className="divide-y divide-gray-100">
                        {[
                          <BillingRow key="energy" label="Energy Charges" value={bill.energyCharges} />,
                          <BillingRow key="fppas" label="FPPAS Surcharge" value={bill.fppas} />,
                          <BillingRow key="fixed" label="Fixed Charge" value={bill.fixedCharge} />,
                          <BillingRow key="duty" label="Electricity Duty" value={bill.electricityDuty} />,
                          <BillingRow key="sd" label="Additional SD Installment" value={bill.additionalSD} />,
                          <BillingRow key="other" label="Other Charges" value={bill.otherCharges} />,
                          <BillingRow key="month" label="Month Bill Amount" value={bill.monthBillAmount} bold />,
                          <BillingRow key="subsidy" label="Govt. Subsidy Amount" value={bill.subsidyAmount} isNegative />,
                          <BillingRow key="interest" label="Interest on Security Deposit" value={bill.interestOnSecurityDeposit} isNegative />,
                          <BillingRow key="ccb" label="CCB Adjustment" value={bill.ccbAdjustment} />,
                          <BillingRow key="lock" label="Lock Credit / Rebate" value={bill.lockCreditRebate} isNegative />,
                          <BillingRow key="rebate" label="Rebate & Incentive" value={bill.rebateIncentive} isNegative />,
                          <BillingRow key="total" label="Current Month Bill Amount" value={bill.currentMonthBillAmount} isTotal />
                        ].filter(Boolean)}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Solar / Net Metering Detailed Billing Details */}
              {bill.utilityType === 'Solar Bill' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-600">
                    <Sun className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Solar Net Metering Details</span>
                    <div className="h-px flex-1 bg-gray-100 ml-4"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem icon={<ArrowUpCircle className="w-4 h-4 text-red-500" />} label="Import (Grid)" value={`${bill.kwhImportUnits || 0} Units`} />
                    <DetailItem icon={<ArrowDownCircle className="w-4 h-4 text-green-500" />} label="Export (Solar)" value={`${bill.kwhExportUnits || 0} Units`} />
                    <DetailItem icon={<Zap className="w-4 h-4" />} label="Net Units" value={`${bill.netUnits || 0} Units`} />
                    <DetailItem icon={<Sun className="w-4 h-4 text-orange-500" />} label="Solar Generation" value={`${bill.solarGenerationUnits || 0} Units`} />
                  </div>

                  <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 mt-2">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <tbody className="divide-y divide-gray-100">
                        {[
                          <BillingRow key="energy" label="Energy Charges" value={bill.energyCharges} />,
                          <BillingRow key="fixed" label="Fixed Charges" value={bill.fixedCharges || bill.fixedCharge} />,
                          <BillingRow key="duty" label="Electricity Duty" value={bill.electricityDuty} />,
                          <BillingRow key="adj" label="Export Adjustment" value={bill.exportAdjustment} isNegative />,
                          <BillingRow key="rebate" label="Rebate / Incentives" value={bill.rebate || bill.rebateIncentive} isNegative />,
                          <BillingRow key="total" label="Net Amount Payable" value={bill.amount} isTotal />
                        ].filter(Boolean)}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {bill.utilityType === 'Telecom' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-600">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Telecom Billing Details</span>
                    <div className="h-px flex-1 bg-gray-100 ml-4"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem 
                      icon={<Building2 className="w-4 h-4" />} 
                      label="Project" 
                      value={bill.propertyName === 'Others' ? bill.customPropertyName || 'Others' : bill.propertyName || 'N/A'} 
                    />
                    <DetailItem 
                      icon={bill.billType === 'Broadband' ? <Wifi className="w-4 h-4" /> : bill.billType === 'Landline' ? <Phone className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />} 
                      label="Service Type" 
                      value={bill.billType || 'N/A'} 
                    />
                    <DetailItem icon={<Building2 className="w-4 h-4" />} label="Operator" value={bill.operatorName === 'Others' ? bill.customOperatorName || 'Others' : bill.operatorName || 'N/A'} />
                    <DetailItem icon={<Phone className="w-4 h-4" />} label="Phone Number" value={bill.phoneNumber || 'N/A'} />
                    <DetailItem icon={<Hash className="w-4 h-4" />} label="Account / Cust ID" value={bill.accountNumber || 'N/A'} />
                    <DetailItem icon={<Calendar className="w-4 h-4" />} label="Billing Period" value={bill.billingPeriod || 'N/A'} />
                    <DetailItem icon={<Info className="w-4 h-4" />} label="Plan Name" value={bill.planName || 'N/A'} />
                    {bill.dataUsage && (
                       <DetailItem icon={<Info className="w-4 h-4" />} label="Data Usage" value={bill.dataUsage} />
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 mt-2">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <tbody className="divide-y divide-gray-100">
                        {[
                          <BillingRow key="call" label="Call Charges" value={bill.callCharges} />,
                          <BillingRow key="internet" label="Internet Charges" value={bill.internetCharges} />,
                          <BillingRow key="other" label="Other Usage Charges" value={bill.otherCharges} />,
                          <tr key="total" className="bg-orange-600 text-white font-bold">
                            <td className="py-2 px-4 italic">Total Amount Recorded</td>
                            <td className="py-2 px-4 text-right">₹{(bill.amount || 0).toLocaleString()}</td>
                          </tr>
                        ].filter(Boolean)}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pollution Control Details */}
              {bill.subcategory === 'pollution_control' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <Wind className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Pollution Consent Details</span>
                    <div className="h-px flex-1 bg-gray-100 ml-4"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem 
                      icon={<FileText className="w-4 h-4" />} 
                      label="Document Type" 
                      value={bill.subcategory === 'pollution_control' ? (bill.documentType === 'CTE' ? 'CTE (Establish)' : 'CTO (Operate)') : (bill.documentType || 'N/A')} 
                    />
                    <DetailItem icon={<ShieldCheck className="w-4 h-4" />} label="Consent Number" value={bill.consentNumber || 'N/A'} mono />
                    <DetailItem icon={<MapPin className="w-4 h-4" />} label="Location Ref" value={bill.location || 'N/A'} />
                    <DetailItem icon={<Hash className="w-4 h-4" />} label="Khasra Number" value={bill.khasraNumber || 'N/A'} />
                    <DetailItem icon={<Building2 className="w-4 h-4" />} label="Authority" value={bill.authority || 'N/A'} />
                    <DetailItem icon={<Tag className="w-4 h-4" />} label="Category" value={bill.pollutionCategory || 'N/A'} />
                    <DetailItem icon={<Calendar className="w-4 h-4" />} label="Issue Date" value={formatDateDisplay(bill.issueDate || bill.billDate)} />
                    {bill.documentType === 'CTO' && (
                      <DetailItem icon={<Clock className="w-4 h-4" />} label="Valid Until" value={formatDateDisplay(bill.validityTo)} highlight={bill.validityTo ? new Date(bill.validityTo) < new Date() : false} />
                    )}
                    <DetailItem icon={<IndianRupee className="w-4 h-4" />} label="Capital Investment" value={`${bill.capitalInvestment || 0} Lakhs`} />
                    <DetailItem icon={<MapPin className="w-4 h-4" />} label="District" value={bill.district || 'N/A'} />
                    <DetailItem icon={<Layers className="w-4 h-4" />} label="Project Area" value={bill.projectArea || 'N/A'} />
                    <DetailItem icon={<Activity className="w-4 h-4" />} label="Units Count" value={bill.unitsCount || 'N/A'} />
                    <DetailItem icon={<MapPin className="w-4 h-4" />} label="Latitude" value={bill.latitude || 'N/A'} />
                    <DetailItem icon={<MapPin className="w-4 h-4" />} label="Longitude" value={bill.longitude || 'N/A'} />
                    <DetailItem icon={<Layers className="w-4 h-4" />} label="Project Type" value={bill.projectType || 'N/A'} />
                    <DetailItem icon={<MapPin className="w-4 h-4" />} label="State" value={bill.state || 'N/A'} />
                    <DetailItem icon={<Wind className="w-4 h-4 text-orange-500" />} label="DG Sets" value={bill.dgSetDetails || 'N/A'} />
                    <DetailItem icon={<Droplets className="w-4 h-4 text-blue-500" />} label="STS Details" value={bill.stsDetails || 'N/A'} />
                  </div>

                  {bill.address && (
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 transition-colors">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Full Address</p>
                      <p className="text-xs text-gray-600 break-words">{bill.address}</p>
                    </div>
                  )}

                  {bill.constructionDetails && (
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Construction Details</p>
                      <p className="text-xs text-gray-600 break-words">{bill.constructionDetails}</p>
                    </div>
                  )}

                  {bill.productionCapacity && (
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Production Capacity</p>
                      <p className="text-xs text-gray-600 break-words">{bill.productionCapacity}</p>
                    </div>
                  )}
                  
                  {bill.complianceConditions && (
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 italic">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Compliance Conditions</p>
                      <p className="text-xs text-gray-600 break-words">{bill.complianceConditions}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Government Tax Billing Details */}
              {(bill.utilityType === 'Property Tax (MCG)' || bill.utilityType === 'Diversion Tax (RD)') && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-600">
                    <Building2 className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Tax Assessment Details</span>
                    <div className="h-px flex-1 bg-gray-100 ml-4"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {bill.utilityType === 'Property Tax (MCG)' ? (
                      <>
                        <DetailItem icon={<Hash className="w-4 h-4" />} label="Receipt No" value={bill.receiptNumber || 'N/A'} />
                        <DetailItem icon={<Building2 className="w-4 h-4" />} label="Property ID" value={bill.propertyId || 'N/A'} />
                        <DetailItem icon={<MapPin className="w-4 h-4" />} label="Zone / Ward" value={bill.zoneWard || 'N/A'} />
                        <DetailItem icon={<Calendar className="w-4 h-4" />} label="Assessment Year" value={bill.assessmentYear || 'N/A'} />
                        <DetailItem icon={<IndianRupee className="w-4 h-4 text-red-500" />} label="Arrear / Outstanding" value={formatCurrency(bill.outstandingAmount || 0)} />
                      </>
                    ) : (
                      <>
                        <DetailItem icon={<Hash className="w-4 h-4" />} label="Challan No" value={bill.challanNumber || 'N/A'} />
                        <DetailItem icon={<ShieldCheck className="w-4 h-4" />} label="URN" value={bill.URN || 'N/A'} />
                        <DetailItem icon={<CreditCard className="w-4 h-4" />} label="CRN / CIN" value={`${bill.CRN || ''} ${bill.CIN ? `/ ${bill.CIN}` : ''}` || 'N/A'} />
                        <DetailItem icon={<MapPin className="w-4 h-4" />} label="District" value={bill.district || 'N/A'} />
                        <DetailItem icon={<FileText className="w-4 h-4" />} label="TIN" value={bill.TIN || 'N/A'} />
                        <DetailItem icon={<Calendar className="w-4 h-4" />} label="Challan Period" value={bill.challanPeriod || 'N/A'} />
                        <DetailItem icon={<Building2 className="w-4 h-4" />} label="Bank Name" value={bill.bankName || 'N/A'} />
                        <DetailItem icon={<Hash className="w-4 h-4" />} label="Bank Ref No" value={bill.bankReferenceNumber || 'N/A'} />
                        {(bill.outstandingAmount !== undefined && bill.outstandingAmount > 0) && (
                          <DetailItem icon={<IndianRupee className="w-4 h-4 text-red-500" />} label="Outstanding" value={formatCurrency(bill.outstandingAmount)} highlight />
                        )}
                        {(bill.pendingAmount !== undefined && bill.pendingAmount > 0) && (
                          <DetailItem icon={<IndianRupee className="w-4 h-4 text-yellow-500" />} label="Pending" value={formatCurrency(bill.pendingAmount)} />
                        )}
                      </>
                    )}
                  </div>

                  {bill.utilityType === 'Property Tax (MCG)' && (
                    <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <tbody className="divide-y divide-gray-100">
                          <BillingRow label="Property Tax" value={bill.propertyTax} />
                          <BillingRow label="Education Cess" value={bill.educationCess} />
                          <BillingRow label="Samekit" value={bill.samekit} />
                          <BillingRow label="Add Samekit" value={bill.addSamekit} />
                          <BillingRow label="Urban Tax" value={bill.urbanTax} />
                          <BillingRow label="Garbage Charges" value={bill.garbageCharges} />
                          <BillingRow label="SAM SWACH" value={bill.samSwach} />
                          <BillingRow label="Sewa Kar" value={bill.sewaKar} />
                          <BillingRow label="Vyapak Swachata Kar" value={bill.vyapakSwachataKar} />
                          <BillingRow label="Penalty" value={bill.penalty} />
                          <BillingRow label="Rebate" value={bill.rebate} isNegative />
                          <BillingRow label="Advance" value={bill.advance} isNegative />
                          <BillingRow label="Total Net Tax" value={bill.amount} isTotal />
                        </tbody>
                      </table>
                    </div>
                  )}

                  {(bill.utilityType === 'Property Tax (MCG)' || bill.utilityType === 'Diversion Tax (RD)') && (bill.modeOfPayment || bill.bankName || bill.bankReferenceNumber) && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600">
                        <CreditCard className="w-4 h-4" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Payment / Transaction Details</span>
                      </div>
                      <div className="bg-green-50/50 border border-green-100 rounded-2xl p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <DetailItem icon={<Clock className="w-4 h-4" />} label="Payment Date" value={bill.paymentDate || bill.transactionDate || 'N/A'} success />
                          {bill.utilityType === 'Property Tax (MCG)' ? (
                            <DetailItem icon={<Clock className="w-4 h-4" />} label="Payment Time" value={bill.paymentTime || 'N/A'} success />
                          ) : (
                            <DetailItem icon={<Clock className="w-4 h-4" />} label="Transaction Time" value={bill.transactionTime || 'N/A'} success />
                          )}
                          <DetailItem icon={<CreditCard className="w-4 h-4" />} label="Payment Mode" value={bill.modeOfPayment || 'N/A'} success />
                          <DetailItem icon={<IndianRupee className="w-4 h-4" />} label="Paid Amount" value={formatCurrency(bill.paidAmount || bill.totalAmount || 0)} success />
                        </div>

                        {bill.utilityType === 'Diversion Tax (RD)' && (bill.bankName || bill.bankReferenceNumber) && (
                          <div className="pt-3 border-t border-green-100 grid grid-cols-1 gap-3">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Bank Name</span>
                              <span className="font-bold text-gray-900">{bill.bankName || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Bank Ref No</span>
                              <span className="font-bold text-gray-900">{bill.bankReferenceNumber || 'N/A'}</span>
                            </div>
                          </div>
                        )}

                        {bill.upiReference && (
                          <div className="pt-3 border-t border-green-100 flex justify-between text-xs">
                             <span className="text-gray-500">UPI Ref No</span>
                             <span className="font-bold text-gray-900">{bill.upiReference}</span>
                          </div>
                        )}
                        {bill.modeOfPayment?.toLowerCase() === 'cheque' && (
                          <div className="pt-3 border-t border-green-100 grid grid-cols-1 gap-3">
                             <div className="flex justify-between text-xs">
                               <span className="text-gray-500">Bank Name</span>
                               <span className="font-bold text-gray-900">{bill.chequeBankName}</span>
                             </div>
                             <div className="flex justify-between text-xs">
                               <span className="text-gray-500">Cheque Number</span>
                               <span className="font-bold text-gray-900">{bill.chequeNumber}</span>
                             </div>
                             <div className="flex justify-between text-xs">
                               <span className="text-gray-500">Cheque Date</span>
                               <span className="font-bold text-gray-900">{bill.chequeDate}</span>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-orange-600 rounded-2xl p-4 text-white flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Total Demand Amount</p>
                      <p className="text-xl font-black">₹{(bill.totalDemandAmount || bill.amount || 0).toLocaleString()}</p>
                    </div>
                    {bill.paidAmount !== undefined && bill.paidAmount > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Payment Amount</p>
                        <p className="text-xl font-black">₹{bill.paidAmount.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Insurance Details */}
              {isInsurance && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Insurance Policy Details</span>
                    <div className="h-px flex-1 bg-gray-100 ml-4"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem icon={<ShieldCheck className="w-4 h-4" />} label="Policy Number" value={bill.policyNumber || 'N/A'} mono />
                    <DetailItem icon={<Building2 className="w-4 h-4" />} label="Insurer" value={bill.insurerName || bill.companyName || 'N/A'} />
                    <DetailItem icon={<Info className="w-4 h-4" />} label="Insured Name" value={bill.insuredName || 'N/A'} />
                    <DetailItem icon={<Tag className="w-4 h-4" />} label="Category" value={bill.subcategory?.replace('_', ' ') || 'N/A'} />
                  </div>

                  {bill.subcategory === 'vehicle_insurance' && (
                    <div className="space-y-3 pt-2">
                       <div className="flex items-center gap-2 text-orange-600">
                        <Car className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Vehicle Information</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 bg-orange-50/30 p-4 rounded-2xl border border-orange-100/50">
                        <DetailItem icon={<Tag className="w-4 h-4" />} label="Reg No" value={bill.registrationNumber || 'N/A'} />
                        <DetailItem icon={<Car className="w-4 h-4" />} label="Make/Model" value={`${bill.vehicleMake || ''} ${bill.vehicleModel || ''}`.trim() || 'N/A'} />
                        <DetailItem icon={<Calendar className="w-4 h-4" />} label="Mfg Year" value={bill.manufacturingYear || 'N/A'} />
                        <DetailItem icon={<IndianRupee className="w-4 h-4" />} label="IDV Value" value={bill.idv ? `₹${bill.idv.toLocaleString()}` : 'N/A'} />
                      </div>
                    </div>
                  )}

                  {bill.subcategory === 'employee_insurance' && (
                    <div className="space-y-3 pt-2">
                       <div className="flex items-center gap-2 text-blue-600">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Employee Coverage</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50">
                        <DetailItem icon={<Building2 className="w-4 h-4" />} label="Company" value={bill.insuredCompanyName || 'N/A'} />
                        <DetailItem icon={<Users className="w-4 h-4" />} label="Employees" value={bill.numberOfEmployees?.toString() || '0'} />
                        <DetailItem icon={<Activity className="w-4 h-4" />} label="Coverage" value={bill.coverageType || 'N/A'} />
                        <DetailItem icon={<IndianRupee className="w-4 h-4" />} label="Sum Insured" value={bill.sumInsured ? `₹${bill.sumInsured.toLocaleString()}` : 'N/A'} />
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 grid grid-cols-2 gap-4">
                    <DetailItem icon={<Calendar className="w-4 h-4" />} label="Start Date" value={formatDateDisplay(bill.billDate)} />
                    <DetailItem icon={<Calendar className="w-4 h-4" />} label="Expiry Date" value={formatDateDisplay(bill.dueDate)} highlight={isOverdue} />
                  </div>
                </div>
              )}

              {/* Workflow Progress */}
              <div className="mt-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Workflow Progress</h3>
                  <div className="h-px flex-1 bg-gray-100 ml-4"></div>
                </div>
                
                <div className="relative pl-8 space-y-8">
                  {/* Vertical Line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-gray-100"></div>
                  
                    {[
                      { id: '1', title: 'Bill Received', date: bill.billDate, status: 'completed' as const },
                      { id: '2', title: 'Verification', status: (isVerified || isApproved || isPaymentInitiated || isPaid) ? 'completed' as const : (isPending ? 'active' as const : 'pending' as const) },
                      { id: '3', title: 'Approval', status: (isApproved || isPaymentInitiated || isPaid) ? 'completed' as const : (isVerified ? 'active' as const : 'pending' as const) },
                      { id: '4', title: 'Payment Initiated', status: (isPaymentInitiated || isPaid) ? 'completed' as const : (isApproved ? 'active' as const : 'pending' as const) },
                      { id: '5', title: 'Payment Confirmed', date: isPaid ? bill.paymentDate : undefined, status: isPaid ? 'completed' as const : (isPaymentInitiated ? 'active' as const : 'pending' as const) },
                    ].map((step, index, array) => {
                    const isCompleted = step.status === 'completed';
                    const isActive = step.status === 'active';
                    const isLast = index === array.length - 1;
                    const showColoredLine = isCompleted || (isActive && !isLast);
                    const orangeTypes = ['Telecom', 'Solar Bill', 'Property Tax (MCG)', 'Diversion Tax (RD)'];
                    const isOrangeType = orangeTypes.includes(bill.utilityType);

                    return (
                      <div key={step.id} className="relative flex items-start justify-between group">
                        {showColoredLine && (
                          <div 
                            className={cn(
                              "absolute left-[-21px] top-6 w-[2px] z-10",
                              isCompleted ? "bg-green-500" : (isOrangeType ? "bg-orange-500" : "bg-blue-500")
                            )}
                            style={{ height: 'calc(100% + 8px)' }}
                          ></div>
                        )}

                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "absolute left-[-32px] w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center z-20 transition-all duration-300",
                            isCompleted ? "bg-green-500 border-green-500 text-white" :
                            isActive ? (isOrangeType ? "bg-white border-orange-500 text-orange-500 ring-4 ring-orange-50" : "bg-white border-blue-500 text-blue-500 ring-4 ring-blue-50") :
                            "bg-white border-gray-200 text-gray-300"
                          )}>
                            {isCompleted ? <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" /> : <div className={cn("w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full", isActive ? (isOrangeType ? "bg-orange-500" : "bg-blue-500") : "bg-transparent")} />}
                          </div>
                          <div className={cn(
                            "px-4 py-2 rounded-xl transition-all",
                            isActive ? (isOrangeType ? "bg-orange-50 border border-orange-100" : "bg-blue-50 border border-blue-100") : ""
                          )}>
                            <p className={cn(
                              "text-[13px] font-bold",
                              isCompleted ? "text-green-600" :
                              isActive ? (isOrangeType ? "text-orange-600" : "text-blue-600") :
                              "text-gray-400"
                            )}>
                              {step.title}
                            </p>
                          </div>
                        </div>
                        {step.date && isCompleted && (
                          <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider mt-2.5">
                            {formatDateDisplay(step.date)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Additional Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 sm:gap-y-6 gap-x-4">
                {bill.accountNumber && (
                  <DetailItem 
                    icon={<Hash className="w-4 h-4" />} 
                    label={bill.utilityType === 'Landline' ? 'Landline Number' : 'Account / Consumer ID'} 
                    value={bill.accountNumber} 
                  />
                )}
                {bill.mobileNumber && (
                  <DetailItem 
                    icon={<Phone className="w-4 h-4" />} 
                    label="Mobile Number" 
                    value={bill.mobileNumber} 
                  />
                )}
                {bill.assessmentId && (
                  <DetailItem 
                    icon={<Building2 className="w-4 h-4" />} 
                    label="Assessment / Property ID" 
                    value={bill.assessmentId} 
                  />
                )}
                {bill.policyNumber && (
                  <DetailItem 
                    icon={<ShieldCheck className="w-4 h-4" />} 
                    label="Policy Number" 
                    value={bill.policyNumber} 
                  />
                )}
                {bill.insuredName && (
                  <DetailItem 
                    icon={<ShieldCheck className="w-4 h-4 text-orange-500" />} 
                    label="Insured Name" 
                    value={bill.insuredName} 
                  />
                )}
                {bill.contractId && (
                  <DetailItem 
                    icon={<FileText className="w-4 h-4" />} 
                    label="Contract / AMC ID" 
                    value={bill.contractId} 
                  />
                )}
                {bill.customerName && (
                  <DetailItem 
                    icon={<Building2 className="w-4 h-4" />} 
                    label="Customer Name" 
                    value={bill.customerName} 
                  />
                )}
                {bill.consumerNumber && (
                  <DetailItem 
                    icon={<Hash className="w-4 h-4" />} 
                    label="Consumer Number" 
                    value={bill.consumerNumber} 
                  />
                )}
                {bill.meterNumber && (
                  <DetailItem 
                    icon={<Zap className="w-4 h-4" />} 
                    label="Meter Number" 
                    value={bill.meterNumber} 
                  />
                )}
              </div>

              {/* Payment History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <History className="w-4 h-4 text-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Payment History</span>
                  </div>
                  <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800 ml-4"></div>
                </div>
                
                <div className="space-y-3">
                  {(bill as any).payments && (bill as any).payments.length > 0 ? (
                    (bill as any).payments.map((payment: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center border border-gray-100 dark:border-slate-600">
                            <IndianRupee className="w-4 h-4 text-green-500" />
                          </div>
                          <div>
                            <p className="text-[12px] font-bold text-gray-700 dark:text-gray-200">{formatCurrency(payment.amount)}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                              {payment.mode} • {formatDateDisplay(payment.payment_date)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ref: {payment.transaction_reference}</p>
                          <p className="text-[9px] text-gray-400 font-medium">{payment.bank}</p>
                        </div>
                      </div>
                    ))
                  ) : isPaid ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-4 bg-green-50/50 dark:bg-green-900/10 border border-green-100/50 dark:border-green-900/20 rounded-2xl">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center border border-green-100 dark:border-green-800 shadow-sm">
                            <ShieldCheck className="w-5 h-5 text-green-500" />
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-gray-900 dark:text-white leading-tight">
                              ₹{(bill.paidAmount || bill.amount || 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-0.5">
                              Full Payment Confirmed
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                            {bill.paymentConfirmationUpiMode || 'UPI'}
                          </p>
                          <p className="text-[10px] font-black text-gray-700 dark:text-gray-300">
                            {formatDateDisplay(bill.paymentConfirmationDate || bill.paymentDate)}
                          </p>
                        </div>
                      </div>
                      
                      {bill.paymentConfirmationBankName && (
                        <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50/50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-xl">
                          <div>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Bank Name</p>
                            <p className="text-[11px] font-black text-gray-700 dark:text-gray-300">{bill.paymentConfirmationBankName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Reference No</p>
                            <p className="text-[11px] font-mono font-black text-purple-600 dark:text-purple-400">{bill.paymentConfirmationUpiReference || 'N/A'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                      <History className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2 opacity-50" />
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No payment history recorded</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Attachments Section */}
              {bill.attachments && bill.attachments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-900">
                    <Paperclip className="w-4 h-4 text-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Attachments ({bill.attachments.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {bill.attachments.map((file, index) => {
                      const isImage = file.type?.startsWith('image/') || file.url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/);
                      const isPdf = file.type === 'application/pdf' || file.url.toLowerCase().match(/\.pdf$/);
                      return (
                        <div key={file.url || index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-white hover:shadow-sm transition-all group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden border border-gray-100">
                              {isImage ? (
                                <img src={file.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : isPdf ? (
                                <FileText className="w-5 h-5 text-red-500" />
                              ) : (
                                <File className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-bold text-gray-700 truncate pr-2">{file.name}</p>
                              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                                {isImage ? 'Image' : isPdf ? 'PDF Document' : 'Document'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button 
                              onClick={() => window.open(file.url, '_blank')}
                              className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canDownload && (
                              <button 
                                onClick={() => downloadFile(file.url, file.name)}
                                className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {bill.notes && (
                <div className={cn(
                  "rounded-xl p-4 border",
                  (bill.utilityType === 'Telecom' || bill.utilityType === 'Property Tax (MCG)' || bill.utilityType === 'Diversion Tax (RD)') ? "bg-orange-50/50 border-orange-100/50" : "bg-blue-50/50 border-blue-100/50"
                )}>
                  <div className={cn(
                    "flex items-center gap-2 mb-2",
                    (bill.utilityType === 'Telecom' || bill.utilityType === 'Property Tax (MCG)' || bill.utilityType === 'Diversion Tax (RD)') ? "text-orange-600" : "text-blue-600"
                  )}>
                    <Info className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Notes</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {bill.notes}
                  </p>
                </div>
              )}

              {/* Workflow Audit Trail */}
              {bill.workflowLogs && bill.workflowLogs.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-4 h-4 text-gray-400" />
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Workflow Audit Trail</span>
                  </div>
                  <div className="space-y-3">
                    {bill.workflowLogs.slice().reverse().map((log, i) => (
                      <div key={i} className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-800/50 group transition-all hover:bg-gray-100 dark:hover:bg-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              log.stage === 'Verification' || log.stage === 'Verified' ? "bg-green-500" :
                              log.stage === 'Approval' || log.stage === 'Approved' ? "bg-blue-500" :
                              log.stage === 'Payment Initiation' ? "bg-orange-500" :
                              log.stage === 'Payment Confirmation' ? "bg-purple-500" :
                              "bg-gray-400"
                            )}></div>
                            <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{log.action || log.stage}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                            {new Date(log.timestamp).toLocaleString(undefined, {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2 font-medium">
                          {log.remarks ? `"${log.remarks}"` : "Action completed without remarks."}
                        </p>
                        {log.bankName && (
                          <div className="grid grid-cols-2 gap-2 mb-3 bg-gray-50/50 dark:bg-slate-800/50 p-2 rounded-xl border border-gray-100 dark:border-slate-700/50">
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Bank</p>
                              <p className="text-[11px] font-black text-gray-700 dark:text-gray-300">{log.bankName}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Payment Method</p>
                              <p className="text-[11px] font-black text-gray-700 dark:text-gray-300">{log.upiMode}</p>
                            </div>
                            {log.upiReference && (
                              <div className="col-span-2 mt-1 border-t border-gray-100 dark:border-slate-700/50 pt-1">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Transaction Ref / ID</p>
                                <p className="text-[11px] font-mono font-black text-purple-600 dark:text-purple-400 tracking-wider uppercase truncate">{log.upiReference}</p>
                              </div>
                            )}
                            {log.amount && (
                              <div className="col-span-1 mt-1 border-t border-gray-100 dark:border-slate-700/50 pt-1">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Amt Paid</p>
                                <p className="text-[11px] font-black text-gray-700 dark:text-gray-300">₹{log.amount.toLocaleString()}</p>
                              </div>
                            )}
                            {log.paymentDate && (
                              <div className="col-span-1 mt-1 border-t border-gray-100 dark:border-slate-700/50 pt-1">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Pay Date</p>
                                <p className="text-[11px] font-black text-gray-700 dark:text-gray-300">
                                  {new Date(log.paymentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        {log.proofUrl && (
                          <div className="mb-3">
                            <button
                              onClick={() => window.open(log.proofUrl, '_blank')}
                              className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-xl group/proof transition-all hover:bg-orange-100 dark:hover:bg-orange-900/20"
                            >
                              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center border border-orange-100 dark:border-orange-800 shrink-0">
                                {log.proofName?.toLowerCase().endsWith('.pdf') ? (
                                  <FileText className="w-4 h-4 text-red-500" />
                                ) : (
                                  <File className="w-4 h-4 text-orange-500" />
                                )}
                              </div>
                              <div className="text-left overflow-hidden">
                                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest leading-none mb-1">Payment Proof</p>
                                <p className="text-[11px] font-black text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{log.proofName || 'View Attachment'}</p>
                              </div>
                              <Eye className="w-3.5 h-3.5 text-orange-400 ml-auto group-hover/proof:text-orange-600" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 dark:border-slate-700/50">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center border border-gray-100 dark:border-slate-600">
                              <UserIcon className="w-2.5 h-2.5 text-gray-400" />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500">{log.user}</span>
                          </div>
                          <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md tracking-wider">
                            {log.userRole || 'USER'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Final Payment Confirmation (Explicitly at the end) */}
              {isPaid && (
                <div className="pt-6 space-y-4 border-t border-gray-100 dark:border-slate-800 mt-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Payment Confirmation Details</span>
                    </div>
                    <div className="h-px flex-1 bg-green-50 dark:bg-green-900/10 ml-4"></div>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-green-50/30 dark:bg-green-900/5 border border-green-100 dark:border-green-900/20 rounded-[2rem] p-8 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] transform translate-x-4 -translate-y-4">
                      <ShieldCheck className="w-32 h-32 text-green-600" />
                    </div>

                    <div className="flex items-center gap-5 mb-8 relative z-10">
                      <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-green-500/20">
                        <CheckSquare className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white leading-none">Payment Complete</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          <p className="text-[10px] font-bold text-green-600 uppercase tracking-[0.2em]">Audit Verified & Locked</p>
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Confirmed Date</p>
                        <p className="text-[15px] font-black text-gray-900 dark:text-white">
                          {bill.paymentConfirmationDate ? new Date(bill.paymentConfirmationDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : formatDateDisplay(bill.paymentDate)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 pt-8 border-t border-green-100/50 dark:border-green-900/10 relative z-10">
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Final Amount</p>
                        <p className="text-[17px] font-black text-gray-900 dark:text-white">₹{(bill.paidAmount || bill.amount || 0).toLocaleString()}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Bank Name</p>
                        <p className="text-[14px] font-black text-gray-700 dark:text-gray-300 line-clamp-1">{bill.paymentConfirmationBankName || 'N/A'}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Payment Method</p>
                        <p className="text-[14px] font-black text-gray-700 dark:text-gray-300">{bill.paymentConfirmationUpiMode || 'N/A'}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Trans Ref ID</p>
                        <p className="text-[13px] font-mono font-black text-purple-600 dark:text-purple-400 truncate">{bill.paymentConfirmationUpiReference || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {bill.paymentConfirmationRemarks && (
                      <div className="mt-6 pt-6 border-t border-green-100/50 dark:border-green-900/10">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Confirmation Notes</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic">"{bill.paymentConfirmationRemarks}"</p>
                      </div>
                    )}

                    {bill.paymentConfirmationProofUrl && canDownload && (
                      <div className="mt-8 relative z-10">
                        <button 
                          onClick={() => window.open(bill.paymentConfirmationProofUrl, '_blank')}
                          className="w-full flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-2 border-green-500/20 dark:border-green-500/10 rounded-2xl group transition-all hover:bg-green-500 hover:border-green-500 hover:shadow-2xl hover:shadow-green-500/20 hover:-translate-y-1 active:translate-y-0"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                              <FileText className="w-5 h-5 text-green-600 group-hover:text-white" />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white/70">Attached Proof</p>
                              <p className="text-sm font-black text-gray-900 dark:text-white group-hover:text-white truncate max-w-[200px]">{bill.paymentConfirmationProofName || 'Transaction Proof'}</p>
                            </div>
                          </div>
                          <Download className="w-5 h-5 text-green-500 group-hover:text-white animate-bounce-subtle" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-6 pb-6 mt-4 border-t border-gray-100 dark:border-slate-800 transition-colors z-20">
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

interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  success?: boolean;
}

const DetailItem: React.FC<DetailItemProps> = ({ icon, label, value, mono, highlight, success }) => (
  <div className="flex items-start gap-3">
    <div className={cn(
      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
      highlight ? "bg-red-50 text-red-500" : 
      success ? "bg-green-50 text-green-500" : 
      "bg-gray-100 text-gray-400"
    )}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">{label}</p>
      <p className={cn(
        "text-[13px] font-bold truncate",
        highlight ? "text-red-600" : 
        success ? "text-green-600" : 
        "text-gray-700",
        mono && "font-mono text-[12px]"
      )}>
        {value}
      </p>
    </div>
  </div>
);

interface BillingRowProps {
  label: string;
  value?: number;
  bold?: boolean;
  isNegative?: boolean;
  isTotal?: boolean;
}

const BillingRow: React.FC<BillingRowProps> = ({ label, value, bold, isNegative, isTotal }) => {
  if (value === undefined || value === 0) return null;
  
  return (
    <tr className={cn(
      isTotal ? "bg-orange-500 text-white" : "",
      bold && !isTotal ? "bg-gray-100/50" : ""
    )}>
      <td className="py-2.5 px-4 font-medium">{label}</td>
      <td className={cn(
        "py-2.5 px-4 text-right font-bold",
        isNegative && !isTotal ? "text-red-500" : ""
      )}>
        {isNegative ? "-" : ""}{formatCurrency(value)}
      </td>
    </tr>
  );
};
