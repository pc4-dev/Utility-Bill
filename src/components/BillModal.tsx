import React, { useState, useEffect, useMemo } from 'react';
import { Bill, UtilityType, BillStatus, BillType } from '../types';
import { 
  X, 
  Upload, 
  IndianRupee, 
  Calendar, 
  FileText, 
  Building2, 
  AlertCircle,
  Clock,
  Zap,
  Droplets,
  Wifi,
  Flame,
  Wrench,
  MoreHorizontal,
  CheckCircle2,
  File,
  Trash2,
  Loader2,
  Sun,
  Phone,
  ShieldCheck,
  Bug,
  Wind,
  ArrowUpCircle,
  FileCheck,
  ShieldAlert,
  Eye,
  Calculator,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../utils';
import { api } from '../services/api';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bill: Partial<Bill>) => void;
  onDelete?: (id: string | number) => void;
  initialData?: Bill | null;
  properties: string[];
  billTypes: BillType[];
  userRole?: string;
}

export const BillModal: React.FC<BillModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onDelete,
  initialData, 
  properties, 
  billTypes,
  userRole 
}) => {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());

  const [formData, setFormData] = useState<Partial<Bill>>({
    propertyName: '',
    utilityType: 'Electricity',
    month: currentMonth,
    year: currentYear,
    companyName: '',
    customCompanyName: '',
    serviceProvider: '',
    billNumber: '',
    billDate: '',
    dueDate: '',
    reminderDate: '',
    priority: 'Normal',
    reminderDays: 3,
    ratePerUnit: 0,
    totalUnits: 0,
    baseAmount: 0,
    taxAmount: 0,
    depositAmount: 0,
    securityAmount: 0,
    amount: 0,
    status: 'Pending',
    notes: '',
    accountNumber: '',
    policyNumber: '',
    assessmentId: '',
    contractId: '',
    insuredName: '',
    customerName: '',
    consumerNumber: '',
    meterNumber: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (initialData && initialData.billId) {
      // Full bill object for editing
      setFormData(initialData);
    } else {
      // New bill or partial initial data (like pre-selected utility type)
      setFormData({
        propertyName: initialData?.propertyName || properties[0] || '',
        utilityType: initialData?.utilityType || 'Electricity',
        month: initialData?.month || currentMonth,
        year: initialData?.year || currentYear,
        companyName: initialData?.companyName || '',
        customCompanyName: initialData?.customCompanyName || '',
        serviceProvider: initialData?.serviceProvider || '',
        billNumber: '',
        billDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        reminderDate: '',
        priority: 'Normal',
        reminderDays: 3,
        ratePerUnit: 0,
        totalUnits: 0,
        baseAmount: 0,
        taxAmount: 0,
        depositAmount: 0,
        securityAmount: 0,
        fine: 0,
        amount: 0,
        status: 'Pending',
        notes: '',
        accountNumber: '',
        policyNumber: '',
        assessmentId: '',
        contractId: '',
        insuredName: '',
        mobileNumber: '',
        customerName: initialData?.customerName || '',
        consumerNumber: initialData?.consumerNumber || '',
        meterNumber: initialData?.meterNumber || ''
      });
    }
    setErrors({});
    setSelectedFiles([]);
    setIsUploading(false);
  }, [initialData, properties, isOpen]);

  const isConsumptionBased = useMemo(() => {
    return ['Electricity', 'Water', 'Solar Bill'].includes(formData.utilityType || '');
  }, [formData.utilityType]);

  const isAccountBased = useMemo(() => {
    return ['Data (Internet)', 'Landline', 'Telecom'].includes(formData.utilityType || '');
  }, [formData.utilityType]);

  const isTaxBased = useMemo(() => {
    return ['Property Tax (MCG)', 'Diversion Tax (RD)'].includes(formData.utilityType || '');
  }, [formData.utilityType]);

  const isInsuranceBased = useMemo(() => {
    return ['Labour Insurance', 'Asset Insurance', 'Insurance', 'Vehicle Insurance', 'Employee Insurance', 'General Insurance'].includes(formData.utilityType || '');
  }, [formData.utilityType]);

  const isPollutionBased = useMemo(() => {
    return ['Pollution Control', 'CTE', 'CTO'].includes(formData.utilityType || '');
  }, [formData.utilityType]);

  const isContractBased = useMemo(() => {
    return ['Air Conditioner AMC', 'Elevator AMC'].includes(formData.utilityType || '');
  }, [formData.utilityType]);

  const isMobileBased = useMemo(() => {
    return formData.utilityType === 'Mobile Recharge';
  }, [formData.utilityType]);

  // Auto-calculate Total Amount
  const calculatedTotal = useMemo(() => {
    const tax = formData.taxAmount || 0;
    const deposit = formData.depositAmount || 0;
    const security = formData.securityAmount || 0;
    const fine = formData.fine || 0;
    
    if (isConsumptionBased && formData.utilityType !== 'Electricity') {
      const rate = formData.ratePerUnit || 0;
      const units = formData.totalUnits || 0;
      return (rate * units) + tax + security + fine - deposit;
    } else {
      const base = formData.baseAmount || 0;
      return base + tax + security + fine - deposit;
    }
  }, [isConsumptionBased, formData.utilityType, formData.ratePerUnit, formData.totalUnits, formData.baseAmount, formData.taxAmount, formData.depositAmount, formData.securityAmount, formData.fine]);

  useEffect(() => {
    setFormData(prev => {
      const newAmount = Math.max(0, calculatedTotal);
      let newRate = prev.ratePerUnit || 0;
      
      if (prev.utilityType === 'Electricity' && (prev.totalUnits || 0) > 0) {
        newRate = newAmount / (prev.totalUnits || 0);
      }
      
      return { ...prev, amount: newAmount, ratePerUnit: newRate };
    });
  }, [calculatedTotal, formData.totalUnits, formData.utilityType]);

  // Auto-calculate Reminder Date from Due Date
  useEffect(() => {
    if (formData.dueDate && formData.reminderDays) {
      const dueDate = new Date(formData.dueDate);
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(dueDate.getDate() - formData.reminderDays);
      if (!isNaN(reminderDate.getTime())) {
        const dateStr = reminderDate.toISOString().split('T')[0];
        if (formData.reminderDate !== dateStr) {
          setFormData(prev => ({ ...prev, reminderDate: dateStr }));
        }
      }
    }
  }, [formData.dueDate, formData.reminderDays, formData.reminderDate]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.propertyName) newErrors.propertyName = 'Property is required';
    if (formData.propertyName === 'Others' && !formData.customPropertyName) {
      newErrors.customPropertyName = 'Please specify project name';
    }
    if (!formData.billNumber) newErrors.billNumber = 'Bill number is required';
    if (!formData.billDate) newErrors.billDate = 'Bill date is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    if (!formData.companyName) newErrors.companyName = 'Company name is required';
    if (formData.companyName === 'Others' && !formData.customCompanyName) {
      newErrors.customCompanyName = 'Please specify company name';
    }
    if (!formData.serviceProvider) newErrors.serviceProvider = 'Service provider is required';
    if (selectedFiles.length === 0 && (!formData.attachments || formData.attachments.length === 0)) {
      newErrors.documentation = 'Documentation is required';
    }
    if (formData.utilityType === 'Other' && !formData.customUtilityType) {
      newErrors.customUtilityType = 'Please specify the bill type';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsUploading(true);
      try {
        let attachments = formData.attachments || [];

        if (selectedFiles.length > 0) {
          const uploadFormData = new FormData();
          selectedFiles.forEach(file => uploadFormData.append('files', file));

          const data = await api.uploadFiles(uploadFormData);
          attachments = [...attachments, ...(data.files || [])];
        }

        // Map utilityType to category and subcategory for consistent reporting
        let category: any = 'other';
        let subcategory = formData.utilityType?.toLowerCase() || '';

        const type = formData.utilityType || formData.bill_type;
        if (['Electricity', 'Water', 'Solar Bill', 'Gas', 'Waste Management'].includes(type || '')) {
          category = 'utility';
          if (type === 'Solar Bill') subcategory = 'solar';
          else if (type === 'Electricity') subcategory = 'electricity';
        } else if (['Data (Internet)', 'Landline', 'Telecom', 'Mobile Recharge'].includes(type || '')) {
          category = 'telecom';
          if (type === 'Data (Internet)') subcategory = 'broadband';
        } else if (['Labour Insurance', 'Asset Insurance', 'Insurance', 'Vehicle Insurance', 'Employee Insurance', 'General Insurance'].includes(type || '')) {
          category = 'insurance';
          if (type === 'Vehicle Insurance') subcategory = 'vehicle_insurance';
          else if (type === 'Employee Insurance') subcategory = 'employee_insurance';
          else if (['Insurance', 'General Insurance'].includes(type)) subcategory = 'general_insurance';
        } else if (['Property Tax (MCG)', 'Diversion Tax (RD)', 'Pollution Control', 'CTE', 'CTO'].includes(type || '')) {
          category = 'government_tax';
          if (type === 'Property Tax (MCG)') subcategory = 'property_tax';
          else if (type === 'Diversion Tax (RD)') subcategory = 'diversion_tax';
          else if (['Pollution Control', 'CTE', 'CTO'].includes(type || '')) subcategory = 'pollution_control';
        }

        const submissionData = { 
          ...formData,
          category,
          subcategory,
          month: formData.month,
          year: formData.year ? formData.year.toString() : new Date().getFullYear().toString(),
          propertyName: formData.propertyName === 'Others' ? formData.customPropertyName : formData.propertyName,
          companyName: formData.companyName === 'Others' ? formData.customCompanyName : formData.companyName,
          attachments: Array.isArray(attachments) ? attachments : [],
          fileUrl: (Array.isArray(attachments) && attachments.length > 0) ? attachments[0].url : formData.fileUrl 
        };

        if (!submissionData.billId) {
          submissionData.billId = `BILL-${formData.year}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        onSubmit(submissionData);
      } catch (err) {
        console.error('Submit error:', err);
        setErrors(prev => ({ ...prev, submit: 'Failed to upload files or save bill' }));
      } finally {
        setIsUploading(false);
      }
    }
  };

  if (!isOpen) return null;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

  const getUtilityIcon = (type: string) => {
    switch (type) {
      case 'Electricity': return <Zap className="w-4 h-4" />;
      case 'Water': return <Droplets className="w-4 h-4" />;
      case 'Solar Bill': return <Sun className="w-4 h-4" />;
      case 'Data (Internet)': return <Wifi className="w-4 h-4" />;
      case 'Landline': return <Phone className="w-4 h-4" />;
      case 'Property Tax (MCG)': 
      case 'Diversion Tax (RD)': return <Building2 className="w-4 h-4" />;
      case 'Pollution Control':
      case 'CTE': return <Wind className="w-4 h-4" />;
      case 'CTO': return <ShieldCheck className="w-4 h-4" />;
      case 'Labour Insurance':
      case 'Vehicle Insurance':
      case 'Employee Insurance':
      case 'General Insurance':
      case 'Asset Insurance': return <ShieldAlert className="w-4 h-4" />;
      case 'Air Conditioner AMC': return <Wind className="w-4 h-4" />;
      case 'Elevator AMC': return <ArrowUpCircle className="w-4 h-4" />;
      case 'Waste Management': return <Trash2 className="w-4 h-4" />;
      case 'Pest Control': return <Bug className="w-4 h-4" />;
      case 'Fire Safety Audit': return <Flame className="w-4 h-4" />;
      case 'Electrical Safety Audit': return <FileCheck className="w-4 h-4" />;
      default: return <MoreHorizontal className="w-4 h-4" />;
    }
  };

  const filteredBillTypes = useMemo(() => {
    if (userRole === 'INSURANCE_ENTRY') {
      return billTypes.filter(t => 
        t.name === 'Insurance' || 
        t.name === 'Labour Insurance' || 
        t.name === 'Asset Insurance' || 
        t.name === 'Vehicle Insurance' || 
        t.name === 'Employee Insurance' || 
        t.name === 'General Insurance'
      );
    }
    if (userRole === 'GOV_TAX_ENTRY') {
      return billTypes.filter(t => 
        t.name === 'Property Tax (MCG)' || 
        t.name === 'Diversion Tax (RD)' || 
        t.name === 'Pollution Control' || 
        t.name === 'CTE' ||
        t.name === 'CTO'
      );
    }
    return billTypes;
  }, [billTypes, userRole]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#1A1A2E]/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="relative bg-white w-full max-w-[840px] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col max-h-[92vh] overflow-hidden border border-gray-100"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {`Add ${formData.utilityType === 'Other' ? formData.customUtilityType || '' : formData.utilityType} Bill`}
              </h2>
              <p className="text-[13px] text-gray-500 font-medium">Complete the form to register the utility payment</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 space-y-12">
            
            {/* Section 1: Core Details */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Core Information</h3>
                <div className="h-px flex-1 bg-gray-100 ml-4"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className="text-[12px] font-semibold text-gray-700 ml-1">Project / Property</label>
                  <div className="relative group">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <select 
                      className={cn(
                        "w-full pl-10 pr-4 py-3 bg-gray-50/50 border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer",
                        errors.propertyName ? "border-red-200 bg-red-50/10" : "border-gray-200"
                      )}
                      value={formData.propertyName || ''}
                      onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                    >
                      <option value="" disabled>Select Project</option>
                      {properties.map(p => <option key={p} value={p}>{p}</option>)}
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  {formData.propertyName === 'Others' && (
                    <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[12px] font-semibold text-gray-700 ml-1">Specify Project Name</label>
                      <input 
                        type="text"
                        placeholder="Enter project name"
                        className={cn(
                          "w-full px-4 py-3 bg-gray-50/50 border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all",
                          errors.customPropertyName ? "border-red-200 bg-red-50/10" : "border-gray-200"
                        )}
                        value={formData.customPropertyName || ''}
                        onChange={(e) => setFormData({ ...formData, customPropertyName: e.target.value })}
                      />
                      {errors.customPropertyName && <p className="text-[11px] text-red-500 mt-1.5 ml-1 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.customPropertyName}</p>}
                    </div>
                  )}
                  {errors.propertyName && <p className="text-[11px] text-red-500 mt-1.5 ml-1 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.propertyName}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-semibold text-gray-700 ml-1">Bill Category</label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                      {getUtilityIcon(formData.utilityType || '')}
                    </div>
                    <select 
                      className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer"
                      value={formData.utilityType || 'Electricity'}
                      onChange={(e) => setFormData({ ...formData, utilityType: e.target.value as UtilityType, customUtilityType: e.target.value === 'Other' ? formData.customUtilityType : undefined })}
                    >
                      {filteredBillTypes.map(t => <option key={t.id || t._id} value={t.name}>{t.name}</option>)}
                      {userRole !== 'INSURANCE_ENTRY' && <option value="Other">Other</option>}
                    </select>
                  </div>
                </div>

                {formData.utilityType === 'Other' && (
                  <div className="space-y-2 md:col-span-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[12px] font-semibold text-gray-700 ml-1">Specify Category</label>
                    <input 
                      type="text"
                      placeholder="e.g. Maintenance, Security"
                      className={cn(
                        "w-full px-4 py-3 bg-gray-50/50 border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all",
                        errors.customUtilityType ? "border-red-200 bg-red-50/10" : "border-gray-200"
                      )}
                      value={formData.customUtilityType || ''}
                      onChange={(e) => setFormData({ ...formData, customUtilityType: e.target.value })}
                    />
                    {errors.customUtilityType && <p className="text-[11px] text-red-500 mt-1.5 ml-1 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.customUtilityType}</p>}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <div className="space-y-2">
                    <label className="text-[12px] font-semibold text-gray-700 ml-1">Billing Period</label>
                    <div className="flex gap-2">
                      <select 
                        className="flex-1 px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all appearance-none"
                        value={formData.month || ''}
                        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      >
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select 
                        className="w-28 px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all appearance-none"
                        value={formData.year || ''}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] font-semibold text-gray-700 ml-1">Bill Number</label>
                    <div className="relative group">
                      <FileText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="text"
                        placeholder="Invoice #"
                        className={cn(
                          "w-full pl-10 pr-4 py-3 bg-gray-50/50 border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all",
                          errors.billNumber ? "border-red-200 bg-red-50/10" : "border-gray-200"
                        )}
                        value={formData.billNumber || ''}
                        onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Provider Details */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Provider Details</h3>
                <div className="h-px flex-1 bg-gray-100 ml-4"></div>
              </div>
              
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <label className="text-[12px] font-semibold text-gray-700 ml-1">Company Name</label>
                    <select 
                      className={cn(
                        "w-full px-4 py-3 bg-gray-50/50 border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer",
                        errors.companyName ? "border-red-200 bg-red-50/10" : "border-gray-200"
                      )}
                      value={formData.companyName || ''}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    >
                      <option value="">Select Company</option>
                      <option value="GLR">GLR</option>
                      <option value="Gravity">Gravity</option>
                      <option value="Neoteric Housing LLP">Neoteric Housing LLP</option>
                      <option value="Swastik">Swastik</option>
                      <option value="Heaven Heights">Heaven Heights</option>
                      <option value="Neoteric Construction">Neoteric Construction</option>
                      <option value="Others">Others</option>
                    </select>
                    {errors.companyName && <p className="text-[11px] text-red-500 mt-1.5 ml-1 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.companyName}</p>}
                  </div>
                  {formData.companyName === 'Others' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[12px] font-semibold text-gray-700 ml-1">Specify Company Name</label>
                      <input 
                        type="text"
                        placeholder="Enter company name"
                        className={cn(
                          "w-full px-4 py-3 bg-gray-50/50 border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all",
                          errors.customCompanyName ? "border-red-200 bg-red-50/10" : "border-gray-200"
                        )}
                        value={formData.customCompanyName || ''}
                        onChange={(e) => setFormData({ ...formData, customCompanyName: e.target.value })}
                      />
                      {errors.customCompanyName && <p className="text-[11px] text-red-500 mt-1.5 ml-1 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.customCompanyName}</p>}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[12px] font-semibold text-gray-700 ml-1">Service Provider</label>
                    <input 
                      type="text"
                      placeholder="e.g. Tata Power"
                      className={cn(
                        "w-full px-4 py-3 bg-gray-50/50 border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all",
                        errors.serviceProvider ? "border-red-200 bg-red-50/10" : "border-gray-200"
                      )}
                      value={formData.serviceProvider || ''}
                      onChange={(e) => setFormData({ ...formData, serviceProvider: e.target.value })}
                    />
                    {errors.serviceProvider && <p className="text-[11px] text-red-500 mt-1.5 ml-1 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.serviceProvider}</p>}
                  </div>

                  {/* Dynamic Fields based on Bill Type */}
                  {isAccountBased && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[12px] font-semibold text-gray-700 ml-1">
                        {formData.utilityType === 'Landline' ? 'Landline Number' : 'Account Number / Consumer ID'}
                      </label>
                      <input 
                        type="text"
                        placeholder={formData.utilityType === 'Landline' ? 'e.g. 011-12345678' : 'e.g. 1234567890'}
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                        value={formData.accountNumber || ''}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      />
                    </div>
                  )}

                  {isTaxBased && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[12px] font-semibold text-gray-700 ml-1">Assessment ID / Property ID</label>
                      <input 
                        type="text"
                        placeholder="e.g. TAX-998877"
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                        value={formData.assessmentId || ''}
                        onChange={(e) => setFormData({ ...formData, assessmentId: e.target.value })}
                      />
                    </div>
                  )}

                  {isInsuranceBased && (
                    <div className="md:col-span-2 space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      {formData.utilityType === 'Insurance' && (
                        <div className="space-y-2">
                          <label className="text-[12px] font-semibold text-gray-700 ml-1">Insurance Sub-Category</label>
                          <select 
                            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all appearance-none"
                            value={formData.subcategory || 'general_insurance'}
                            onChange={(e) => setFormData({ ...formData, subcategory: e.target.value as any })}
                          >
                            <option value="general_insurance">General Insurance</option>
                            <option value="vehicle_insurance">Vehicle Insurance</option>
                            <option value="employee_insurance">Employee Insurance</option>
                          </select>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <label className="text-[12px] font-semibold text-gray-700 ml-1">Policy Number</label>
                        <input 
                          type="text"
                          placeholder="e.g. POL-554433"
                          className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                          value={formData.policyNumber || ''}
                          onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[12px] font-semibold text-gray-700 ml-1">Insured Name</label>
                        <input 
                          type="text"
                          placeholder="e.g. John Doe / Neoteric Ltd"
                          className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                          value={formData.insuredName || ''}
                          onChange={(e) => setFormData({ ...formData, insuredName: e.target.value })}
                        />
                      </div>

                      {formData.subcategory === 'vehicle_insurance' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                          <div className="space-y-2">
                            <label className="text-[12px] font-semibold text-gray-700 ml-1">Registration Number</label>
                            <input 
                              type="text"
                              placeholder="MH-12-XX-XXXX"
                              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none"
                              value={formData.registrationNumber || ''}
                              onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[12px] font-semibold text-gray-700 ml-1">Make & Model</label>
                            <input 
                              type="text"
                              placeholder="e.g. Honda City"
                              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none"
                              value={`${formData.vehicleMake || ''} ${formData.vehicleModel || ''}`}
                              onChange={(e) => {
                                const [make, ...model] = e.target.value.split(' ');
                                setFormData({ ...formData, vehicleMake: make, vehicleModel: model.join(' ') });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[12px] font-semibold text-gray-700 ml-1">Engine Number</label>
                            <input 
                              type="text"
                              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none"
                              value={formData.engineNumber || ''}
                              onChange={(e) => setFormData({ ...formData, engineNumber: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[12px] font-semibold text-gray-700 ml-1">IDV Value</label>
                            <input 
                              type="number"
                              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none font-bold"
                              value={formData.idv || 0}
                              onChange={(e) => setFormData({ ...formData, idv: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      )}

                      {formData.subcategory === 'employee_insurance' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                          <div className="space-y-2">
                            <label className="text-[12px] font-semibold text-gray-700 ml-1">Insured Company</label>
                            <input 
                              type="text"
                              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none"
                              value={formData.insuredCompanyName || ''}
                              onChange={(e) => setFormData({ ...formData, insuredCompanyName: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[12px] font-semibold text-gray-700 ml-1">No. of Employees</label>
                            <input 
                              type="number"
                              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none"
                              value={formData.numberOfEmployees || 0}
                              onChange={(e) => setFormData({ ...formData, numberOfEmployees: Number(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-[12px] font-semibold text-gray-700 ml-1">Sum Insured</label>
                            <input 
                              type="number"
                              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none font-bold"
                              value={formData.sumInsured || 0}
                              onChange={(e) => setFormData({ ...formData, sumInsured: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      )}

                      {formData.subcategory === 'general_insurance' && (
                        <div className="space-y-2 animate-in fade-in duration-300">
                          <label className="text-[12px] font-semibold text-gray-700 ml-1">Policy Period</label>
                          <input 
                            type="text"
                            placeholder="e.g. 1 Year"
                            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none"
                            value={formData.policyPeriod || ''}
                            onChange={(e) => setFormData({ ...formData, policyPeriod: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {isContractBased && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[12px] font-semibold text-gray-700 ml-1">Contract ID / AMC Number</label>
                      <input 
                        type="text"
                        placeholder="e.g. AMC-2025-001"
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                        value={formData.contractId || ''}
                        onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
                      />
                    </div>
                  )}

                  {isMobileBased && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[12px] font-semibold text-gray-700 ml-1">Mobile Number</label>
                      <input 
                        type="text"
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                        value={formData.mobileNumber || ''}
                        onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                      />
                    </div>
                  )}

                  {formData.utilityType === 'Telecom' && (
                    <div className="md:col-span-2 space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[12px] font-semibold text-gray-700 ml-1">Bill Sub-Type</label>
                          <select 
                            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none"
                            value={formData.billType || 'Mobile'}
                            onChange={(e) => setFormData({ ...formData, billType: e.target.value as any })}
                          >
                            <option value="Mobile">Mobile</option>
                            <option value="Landline">Landline</option>
                            <option value="Broadband">Broadband</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[12px] font-semibold text-gray-700 ml-1">Phone Number</label>
                          <input 
                            type="text"
                            placeholder="e.g. 9876543210"
                            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none"
                            value={formData.phoneNumber || ''}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[12px] font-semibold text-gray-700 ml-1">Operator Name</label>
                          <input 
                            type="text"
                            placeholder="e.g. Airtel, Jio"
                            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none"
                            value={formData.operatorName || ''}
                            onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[12px] font-semibold text-gray-700 ml-1">Plan Name</label>
                          <input 
                            type="text"
                            placeholder="e.g. 5G Unlimited"
                            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none"
                            value={formData.planName || ''}
                            onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.utilityType === 'Electricity' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[12px] font-semibold text-gray-700 ml-1">Customer Name</label>
                        <input 
                          type="text"
                          placeholder="Enter customer name"
                          className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                          value={formData.customerName || ''}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[12px] font-semibold text-gray-700 ml-1">Consumer Number</label>
                        <input 
                          type="text"
                          placeholder="Enter consumer number"
                          className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                          value={formData.consumerNumber || ''}
                          onChange={(e) => setFormData({ ...formData, consumerNumber: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[12px] font-semibold text-gray-700 ml-1">Meter Number</label>
                        <input 
                          type="text"
                          placeholder="Enter meter number"
                          className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                          value={formData.meterNumber || ''}
                          onChange={(e) => setFormData({ ...formData, meterNumber: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </div>
            </section>

            {/* Section 3: Financials */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Financial Summary</h3>
                <div className="h-px flex-1 bg-gray-100 ml-4"></div>
              </div>

              <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Base Amount</label>
                      <div className="relative group">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px] font-bold">₹</span>
                        <input 
                          type="number" step="0.01"
                          className="w-full pl-8 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-[18px] font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                          value={formData.baseAmount || 0}
                          onChange={(e) => setFormData({ ...formData, baseAmount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    {isConsumptionBased && (
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Units</label>
                          <input 
                            type="number"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[15px] font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                            value={formData.totalUnits || 0}
                            onChange={(e) => setFormData({ ...formData, totalUnits: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-500" /> Rate Per Unit
                          </label>
                          <div className="relative group">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px] font-bold">₹</span>
                            <input 
                              type="number" step="0.01"
                              readOnly={formData.utilityType === 'Electricity'}
                              className={cn(
                                "w-full pl-8 pr-4 py-3 border rounded-xl text-[15px] font-bold text-gray-900 focus:outline-none transition-all",
                                formData.utilityType === 'Electricity' ? "bg-gray-50 cursor-not-allowed border-gray-200" : "bg-white border-gray-200 focus:ring-2 focus:ring-primary/10 focus:border-primary"
                              )}
                              value={formData.ratePerUnit || 0}
                              onChange={(e) => setFormData({ ...formData, ratePerUnit: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tax, Security & Fine</label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="relative">
                          <input 
                            type="number" placeholder="Tax"
                            className="w-full px-3 py-3 bg-white border border-gray-200 rounded-xl text-[14px] font-semibold focus:outline-none focus:border-primary transition-all"
                            value={formData.taxAmount || ''}
                            onChange={(e) => setFormData({ ...formData, taxAmount: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="relative">
                          <input 
                            type="number" placeholder="Sec."
                            className="w-full px-3 py-3 bg-white border border-gray-200 rounded-xl text-[14px] font-semibold focus:outline-none focus:border-primary transition-all"
                            value={formData.securityAmount || ''}
                            onChange={(e) => setFormData({ ...formData, securityAmount: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="relative">
                          <input 
                            type="number" placeholder="Fine"
                            className="w-full px-3 py-3 bg-white border border-gray-200 rounded-xl text-[14px] font-semibold focus:outline-none focus:border-primary transition-all"
                            value={formData.fine || ''}
                            onChange={(e) => setFormData({ ...formData, fine: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Deposit Amount</label>
                      <div className="relative group">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px] font-bold">₹</span>
                        <input 
                          type="number" step="0.01"
                          className="w-full pl-8 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-[15px] font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                          value={formData.depositAmount || 0}
                          onChange={(e) => setFormData({ ...formData, depositAmount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2">Total Payable Amount</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-primary">₹</span>
                      <span className="text-5xl font-black text-gray-900 tracking-tighter">
                        {formData.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 bg-green-50 rounded-xl text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[12px] font-bold">Auto-calculated summary</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Timeline & Attachments */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Timeline</h3>
                  <div className="h-px flex-1 bg-gray-100 ml-4"></div>
                </div>
                
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[12px] font-semibold text-gray-700 ml-1">Bill Date</label>
                      <input 
                        type="date"
                        className={cn(
                          "w-full px-4 py-3 bg-gray-50/50 border rounded-xl text-[13px] focus:outline-none focus:border-primary transition-all",
                          errors.billDate ? "border-red-200 bg-red-50/10" : "border-gray-200"
                        )}
                        value={formData.billDate || ''}
                        onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                      />
                      {errors.billDate && <p className="text-[11px] text-red-500 mt-1.5 ml-1 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.billDate}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12px] font-semibold text-gray-700 ml-1">Due Date</label>
                      <input 
                        type="date"
                        className={cn(
                          "w-full px-4 py-3 bg-gray-50/50 border rounded-xl text-[13px] focus:outline-none focus:border-primary transition-all",
                          errors.dueDate ? "border-red-200 bg-red-50/10" : "border-gray-200"
                        )}
                        value={formData.dueDate || ''}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Clock className="w-4 h-4" />
                        <span className="text-[12px] font-bold">Smart Reminders</span>
                      </div>
                      <div className="px-2 py-1 bg-blue-100 rounded-md text-[10px] font-black text-blue-700 uppercase">Active</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-blue-600/70 uppercase ml-1">Lead Days</label>
                        <input 
                          type="number"
                          className="w-full px-3 py-2 bg-white border border-blue-100 rounded-lg text-[13px] font-bold text-blue-900 focus:outline-none"
                          value={formData.reminderDays || 0}
                          onChange={(e) => setFormData({ ...formData, reminderDays: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-blue-600/70 uppercase ml-1">Priority</label>
                        <select 
                          className="w-full px-3 py-2 bg-white border border-blue-100 rounded-lg text-[13px] font-bold text-blue-900 focus:outline-none appearance-none"
                          value={formData.priority || 'Normal'}
                          onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        >
                          <option value="Low">Low</option>
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Documentation</h3>
                  <div className="h-px flex-1 bg-gray-100 ml-4"></div>
                </div>

                <div className="space-y-4">
                  <div 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className={cn(
                      "group border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-primary/[0.02] hover:border-primary/30 transition-all cursor-pointer",
                      errors.documentation ? "border-red-200 bg-red-50/10" : "border-gray-200"
                    )}
                  >
                    <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,image/*" />
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-primary group-hover:scale-110 transition-all mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-[13px] font-bold text-gray-900">Drop files here (Required)</p>
                    <p className="text-[11px] text-gray-500 mt-1">PDF or Images up to 5MB</p>
                  </div>
                  {errors.documentation && <p className="text-[11px] text-red-500 mt-1.5 ml-1 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.documentation}</p>}

                  {selectedFiles.length > 0 && (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm animate-in fade-in slide-in-from-right-2 duration-200">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary shrink-0">
                              <File className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-bold text-gray-900 truncate pr-2">{file.name}</p>
                              <p className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(index); }} className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-lg transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Section 5: Notes */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Additional Notes</h3>
                <div className="h-px flex-1 bg-gray-100 ml-4"></div>
              </div>
              <textarea 
                rows={3}
                className="w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all resize-none placeholder:text-gray-400"
                placeholder="Add any specific instructions or context for this bill..."
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </section>
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-[14px] font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Discard Changes
            </button>
            {(initialData?.id || initialData?._id) && userRole === 'ADMIN' && onDelete && (
              <button 
                type="button"
                onClick={() => {
                  if (onDelete) {
                    onDelete(initialData.id || initialData._id!);
                    onClose();
                  }
                }}
                className="px-6 py-3 text-[14px] font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Bill
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button 
              type="submit"
              onClick={handleSubmit}
              disabled={isUploading}
              className="px-10 py-3 bg-gray-900 text-white rounded-xl text-[14px] font-bold hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{`Add ${formData.utilityType === 'Other' ? formData.customUtilityType || '' : formData.utilityType} Bill`}</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
