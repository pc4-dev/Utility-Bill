import React, { useState, useEffect, useMemo } from 'react';
import { Bill, UtilityType, Project, BillType } from '../types';
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
  ArrowLeft,
  Sun,
  Phone,
  ShieldCheck,
  Bug,
  Wind,
  ArrowUpCircle,
  FileCheck,
  ShieldAlert,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCurrency } from '../utils';
import { PdfViewer } from './PdfViewer';

export const PublicBillForm: React.FC = () => {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());

  const [projects, setProjects] = useState<Project[]>([]);
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<Partial<Bill>>({
    propertyName: '',
    utilityType: 'Other',
    month: currentMonth,
    year: currentYear,
    companyName: '',
    customCompanyName: '',
    serviceProvider: '',
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
    status: '' as any,
    notes: '',
    accountNumber: '',
    policyNumber: '',
    assessmentId: '',
    contractId: '',
    mobileNumber: '',
    customerName: '',
    consumerNumber: '',
    meterNumber: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Ensure session is established
    fetch('/api/health', { credentials: 'include' }).catch(() => {});

    const fetchData = async () => {
      try {
        const [projectsRes, billTypesRes] = await Promise.all([
          fetch('/api/public/projects', { credentials: 'include' }),
          fetch('/api/public/bill-types', { credentials: 'include' })
        ]);

        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setProjects(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, propertyName: data[0].name }));
          }
        }

        if (billTypesRes.ok) {
          const data = await billTypesRes.json();
          setBillTypes(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, utilityType: data[0].name }));
          }
        }
      } catch (err) {
        console.error('Fetch data error:', err);
      }
    };
    fetchData();
  }, []);

  const properties = useMemo(() => Array.from(new Set(projects.map(p => p.name))), [projects]);

  const isConsumptionBased = useMemo(() => {
    return ['Electricity', 'Water', 'Solar Bill'].includes(formData.utilityType || '');
  }, [formData.utilityType]);

  const isAccountBased = useMemo(() => {
    return ['Data (Internet)', 'Landline'].includes(formData.utilityType || '');
  }, [formData.utilityType]);

  const isTaxBased = useMemo(() => {
    return ['Property Tax (MCG)', 'Diversion Tax (RD)'].includes(formData.utilityType || '');
  }, [formData.utilityType]);

  const isInsuranceBased = useMemo(() => {
    return ['Labour Insurance', 'Asset Insurance'].includes(formData.utilityType || '');
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
    if (!formData.billNumber) newErrors.billNumber = 'Bill number is required';
    if (!formData.billDate) newErrors.billDate = 'Bill date is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    if (!formData.companyName) newErrors.companyName = 'Company name is required';
    if (formData.companyName === 'Others' && !formData.customCompanyName) {
      newErrors.customCompanyName = 'Please specify company name';
    }
    if (formData.utilityType === 'Other' && !formData.customUtilityType) {
      newErrors.customUtilityType = 'Please specify the bill type';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const renderError = (field: string) => (
    <AnimatePresence>
      {errors[field] && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0, x: [0, -2, 2, -2, 2, 0] }}
          exit={{ opacity: 0, y: -5 }}
          className="text-[11px] text-red-500 mt-2 ml-1 font-bold flex items-center gap-1"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          {errors[field]}
        </motion.p>
      )}
    </AnimatePresence>
  );

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
        // --- PROACTIVE DUPLICATE CHECK ---
        const telecomTypes = ['Telecom', 'Data (Internet)', 'Landline', 'Mobile Recharge'];
        let checkResults = null;

        const checkParams: any = {
          utilityType: formData.utilityType,
          year: formData.year
        };

        if (telecomTypes.includes(formData.utilityType || '')) {
          const billingPeriod = `${formData.month}-${formData.year}`;
          checkParams.phoneNumber = formData.accountNumber || formData.mobileNumber;
          checkParams.billingPeriod = billingPeriod;
        } else if (formData.utilityType === 'Solar Bill') {
          checkParams.consumerNumber = formData.consumerNumber;
          checkParams.month = formData.month;
        }

        if (checkParams.phoneNumber || checkParams.consumerNumber) {
          const dupRes = await fetch('/api/public/bills/check-duplicate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkParams),
            credentials: 'include'
          });

          if (dupRes.ok) {
            const dupData = await dupRes.json();
            if (dupData.duplicate) {
              setErrors(prev => ({ ...prev, submit: "This bill is already filled in the list, kindly check." }));
              setIsUploading(false);
              return;
            }
          }
        }
        // --- END DUPLICATE CHECK ---

        // Ensure session is established before upload
        await fetch('/api/health', { credentials: 'include' }).catch(() => {});
        
        let attachments = [];

        if (selectedFiles.length > 0) {
          const uploadFormData = new FormData();
          selectedFiles.forEach(file => uploadFormData.append('files', file));

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData,
            credentials: 'include'
          });

          if (!response.ok) {
            const text = await response.text();
            let message = 'Upload failed';
            try {
              const json = JSON.parse(text);
              message = json.message || json.error || message;
            } catch (e) {
              // If it's HTML, it might be the cookie check page
              if (text.includes('<!doctype html>') || text.includes('<html')) {
                message = "Session verification required. Please try submitting again or refresh the page.";
              } else {
                message = text.slice(0, 100) || message;
              }
            }
            throw new Error(message);
          }
          
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            if (text.includes('<!doctype html>') || text.includes('<html')) {
              throw new Error("Session verification required. Please try submitting again or refresh the page.");
            }
            throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}`);
          }
          
          const data = await response.json();
          attachments = data.files || [];
        }

        const submissionData = { 
          ...formData,
          propertyName: formData.propertyName === 'Others' ? formData.customPropertyName : formData.propertyName,
          companyName: formData.companyName === 'Others' ? formData.customCompanyName : formData.companyName,
          billingPeriod: formData.month && formData.year ? `${formData.month}-${formData.year}` : formData.billingPeriod,
          attachments: Array.isArray(attachments) ? attachments : [],
          fileUrl: (Array.isArray(attachments) && attachments.length > 0) ? attachments[0].url : undefined,
          billId: `BILL-${formData.year}-${Math.floor(1000 + Math.random() * 9000)}`
        };

        const response = await fetch('/api/public/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData),
          credentials: 'include'
        });

        if (response.ok) {
          setIsSubmitted(true);
        } else {
          throw new Error('Submission failed');
        }
      } catch (err) {
        console.error('Submit error:', err);
        setErrors(prev => ({ ...prev, submit: 'Failed to submit bill. Please try again.' }));
      } finally {
        setIsUploading(false);
      }
    }
  };

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
      case 'Pollution Control': return <ShieldCheck className="w-4 h-4" />;
      case 'Labour Insurance':
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

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 md:p-16 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] text-center max-w-lg w-full border border-gray-100"
        >
          <div className="w-24 h-24 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Submission Successful!</h2>
          <p className="text-gray-500 font-medium text-lg leading-relaxed mb-10">
            Your utility bill has been registered. Our team will review and process it shortly.
          </p>
          <div className="space-y-4">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
            >
              <ArrowLeft className="w-5 h-5" />
              Submit Another Bill
            </button>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Reference ID: {Math.random().toString(36).substring(2, 9).toUpperCase()}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] py-16 px-4 md:py-24">
      <div className="max-w-[840px] mx-auto">
        {/* Header */}
        <div className="mb-12 text-center space-y-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm"
          >
            <Building2 className="text-primary w-10 h-10" />
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              {formData.utilityType === 'Other' ? formData.customUtilityType || 'Utility' : formData.utilityType || 'Utility'} Submission
            </h1>
            <p className="text-gray-500 font-medium text-lg">Neoteric Properties • Official Billing Portal</p>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden"
        >
          <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-16">
            
            {/* Section 1: Core Details */}
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Core Information</h3>
                <div className="h-px flex-1 bg-gray-100 ml-4"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                <div className="space-y-2.5">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">Project / Property</label>
                  <div className="relative group">
                    <Building2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <select 
                      className={cn(
                        "w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none cursor-pointer",
                        errors.propertyName ? "border-red-500 bg-red-50/10 focus:ring-red-500/20" : "border-gray-200"
                      )}
                      value={formData.propertyName || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, propertyName: e.target.value });
                        if (errors.propertyName) setErrors(prev => { const { propertyName, ...rest } = prev; return rest; });
                      }}
                    >
                      <option value="" disabled>Select Project</option>
                      {properties.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  {renderError('propertyName')}
                </div>

                {formData.propertyName === 'Others' && (
                  <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[13px] font-bold text-gray-700 ml-1">Location Type</label>
                    <input 
                      type="text"
                      placeholder="e.g. Warehouse, Site Office"
                      className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                      value={formData.locationType || ''}
                      onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-2.5">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">Bill Category</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                      {getUtilityIcon(formData.utilityType || '')}
                    </div>
                    <select 
                      className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none cursor-pointer"
                      value={formData.utilityType || ''}
                      onChange={(e) => setFormData({ ...formData, utilityType: e.target.value as UtilityType, customUtilityType: e.target.value === 'Other' ? formData.customUtilityType : undefined })}
                    >
                      <option value="" disabled>Select Category</option>
                      {billTypes.map(t => <option key={t.id || t._id} value={t.name}>{t.name}</option>)}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {formData.utilityType === 'Other' && (
                  <div className="space-y-2.5 md:col-span-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[13px] font-bold text-gray-700 ml-1">Specify Category</label>
                    <input 
                      type="text"
                      placeholder="e.g. Maintenance, Security"
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all",
                        errors.customUtilityType ? "border-red-500 bg-red-50/10 focus:ring-red-500/20" : "border-gray-200"
                      )}
                      value={formData.customUtilityType || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, customUtilityType: e.target.value });
                        if (errors.customUtilityType) setErrors(prev => { const { customUtilityType, ...rest } = prev; return rest; });
                      }}
                    />
                    {renderError('customUtilityType')}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6 md:col-span-2">
                  <div className="space-y-2.5">
                    <label className="text-[13px] font-bold text-gray-700 ml-1">Billing Period</label>
                    <div className="flex gap-3">
                      <select 
                        className="flex-1 px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none"
                        value={formData.month || ''}
                        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      >
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select 
                        className="w-32 px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none"
                        value={formData.year || ''}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[13px] font-bold text-gray-700 ml-1">Bill Number</label>
                    <div className="relative group">
                      <FileText className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="text"
                        placeholder="Invoice #"
                        className={cn(
                          "w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all",
                          errors.billNumber ? "border-red-500 bg-red-50/10 focus:ring-red-500/20" : "border-gray-200"
                        )}
                        value={formData.billNumber || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, billNumber: e.target.value });
                          if (errors.billNumber) setErrors(prev => { const { billNumber, ...rest } = prev; return rest; });
                        }}
                      />
                    </div>
                    {renderError('billNumber')}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Provider Details */}
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Provider Details</h3>
                <div className="h-px flex-1 bg-gray-100 ml-4"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                <div className="space-y-2.5">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">Company Name</label>
                    <select 
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none cursor-pointer",
                        errors.companyName ? "border-red-500 bg-red-50/10 focus:ring-red-500/20" : "border-gray-200"
                      )}
                      value={formData.companyName || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, companyName: e.target.value });
                        if (errors.companyName) setErrors(prev => { const { companyName, ...rest } = prev; return rest; });
                      }}
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
                    {renderError('companyName')}
                </div>
                {formData.companyName === 'Others' && (
                  <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[13px] font-bold text-gray-700 ml-1">Specify Company Name</label>
                    <input 
                      type="text"
                      placeholder="Enter company name"
                      className={cn(
                        "w-full px-5 py-3.5 bg-gray-50/50 border rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all",
                        errors.customCompanyName ? "border-red-500 bg-red-50/10 focus:ring-red-500/20" : "border-gray-200"
                      )}
                      value={formData.customCompanyName || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, customCompanyName: e.target.value });
                        if (errors.customCompanyName) setErrors(prev => { const { customCompanyName, ...rest } = prev; return rest; });
                      }}
                    />
                    {renderError('customCompanyName')}
                  </div>
                )}
                <div className="space-y-2.5">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">Service Provider</label>
                  <input 
                    type="text"
                    placeholder="e.g. Tata Power"
                    className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                    value={formData.serviceProvider || ''}
                    onChange={(e) => setFormData({ ...formData, serviceProvider: e.target.value })}
                  />
                </div>

                {/* Dynamic Fields based on Bill Category */}
                {isAccountBased && (
                  <div className="space-y-2.5 md:col-span-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[13px] font-bold text-gray-700 ml-1">
                      {formData.utilityType === 'Landline' ? 'Landline Number' : 'Account Number / Consumer ID'}
                    </label>
                    <input 
                      type="text"
                      placeholder={formData.utilityType === 'Landline' ? 'e.g. 011-12345678' : 'e.g. 1234567890'}
                      className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                      value={formData.accountNumber || ''}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    />
                  </div>
                )}

                {isTaxBased && (
                  <div className="space-y-2.5 md:col-span-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[13px] font-bold text-gray-700 ml-1">Assessment ID / Property ID</label>
                    <input 
                      type="text"
                      placeholder="e.g. TAX-998877"
                      className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                      value={formData.assessmentId || ''}
                      onChange={(e) => setFormData({ ...formData, assessmentId: e.target.value })}
                    />
                  </div>
                )}

                {isInsuranceBased && (
                  <div className="space-y-2.5 md:col-span-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[13px] font-bold text-gray-700 ml-1">Policy Number</label>
                    <input 
                      type="text"
                      placeholder="e.g. POL-554433"
                      className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                      value={formData.policyNumber || ''}
                      onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                    />
                  </div>
                )}

                {isContractBased && (
                  <div className="space-y-2.5 md:col-span-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[13px] font-bold text-gray-700 ml-1">Contract ID / AMC Number</label>
                    <input 
                      type="text"
                      placeholder="e.g. AMC-2025-001"
                      className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                      value={formData.contractId || ''}
                      onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
                    />
                  </div>
                )}

                {isMobileBased && (
                  <div className="space-y-2.5 md:col-span-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[13px] font-bold text-gray-700 ml-1">Mobile Number</label>
                    <input 
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                      value={formData.mobileNumber || ''}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    />
                  </div>
                )}

                {formData.utilityType === 'Electricity' && (
                  <>
                    <div className="space-y-2.5">
                      <label className="text-[13px] font-bold text-gray-700 ml-1">Customer Name</label>
                      <input 
                        type="text"
                        placeholder="Enter customer name"
                        className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={formData.customerName || ''}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[13px] font-bold text-gray-700 ml-1">Consumer Number</label>
                      <input 
                        type="text"
                        placeholder="Enter consumer number"
                        className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={formData.consumerNumber || ''}
                        onChange={(e) => setFormData({ ...formData, consumerNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2.5 md:col-span-2">
                      <label className="text-[13px] font-bold text-gray-700 ml-1">Meter Number</label>
                      <input 
                        type="text"
                        placeholder="Enter meter number"
                        className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={formData.meterNumber || ''}
                        onChange={(e) => setFormData({ ...formData, meterNumber: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Section 3: Financials */}
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Financial Summary</h3>
                <div className="h-px flex-1 bg-gray-100 ml-4"></div>
              </div>

              <div className="bg-gray-50/30 border border-gray-100 rounded-[2rem] p-8 md:p-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="md:col-span-2 space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Base Amount</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[14px] font-bold">₹</span>
                        <input 
                          type="number" step="0.01"
                          className="w-full pl-9 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-[20px] font-black text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                          value={formData.baseAmount || 0}
                          onChange={(e) => setFormData({ ...formData, baseAmount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    {isConsumptionBased && (
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2.5">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Units</label>
                          <input 
                            type="number"
                            className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-[16px] font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                            value={formData.totalUnits || 0}
                            onChange={(e) => setFormData({ ...formData, totalUnits: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2.5">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-500" /> Rate Per Unit
                          </label>
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[14px] font-bold">₹</span>
                            <input 
                              type="number" step="0.01"
                              readOnly={formData.utilityType === 'Electricity'}
                              className={cn(
                                "w-full pl-9 pr-4 py-3.5 border rounded-2xl text-[16px] font-bold text-gray-900 focus:outline-none transition-all",
                                formData.utilityType === 'Electricity' ? "bg-gray-50 cursor-not-allowed border-gray-200" : "bg-white border-gray-200 focus:ring-4 focus:ring-primary/5 focus:border-primary"
                              )}
                              value={formData.ratePerUnit || 0}
                              onChange={(e) => setFormData({ ...formData, ratePerUnit: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tax, Security & Fine</label>
                      <div className="grid grid-cols-3 gap-3">
                        <input 
                          type="number" placeholder="Tax"
                          className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-[15px] font-semibold focus:outline-none focus:border-primary transition-all"
                          value={formData.taxAmount || ''}
                          onChange={(e) => setFormData({ ...formData, taxAmount: parseFloat(e.target.value) || 0 })}
                        />
                        <input 
                          type="number" placeholder="Sec."
                          className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-[15px] font-semibold focus:outline-none focus:border-primary transition-all"
                          value={formData.securityAmount || ''}
                          onChange={(e) => setFormData({ ...formData, securityAmount: parseFloat(e.target.value) || 0 })}
                        />
                        <input 
                          type="number" placeholder="Fine"
                          className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-[15px] font-semibold focus:outline-none focus:border-primary transition-all"
                          value={formData.fine || ''}
                          onChange={(e) => setFormData({ ...formData, fine: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Deposit Amount</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[14px] font-bold">₹</span>
                        <input 
                          type="number" step="0.01"
                          className="w-full pl-9 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-[16px] font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                          value={formData.depositAmount || 0}
                          onChange={(e) => setFormData({ ...formData, depositAmount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-10 border-t border-gray-100 flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3">Total Payable Amount</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-primary">₹</span>
                      <span className="text-6xl font-black text-gray-900 tracking-tighter">
                        {formData.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-2.5 bg-green-50 rounded-2xl text-green-700">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-[13px] font-bold">Auto-calculated summary</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Timeline & Attachments */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-16">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Timeline</h3>
                  <div className="h-px flex-1 bg-gray-100 ml-4"></div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-[13px] font-bold text-gray-700 ml-1">Bill Date</label>
                    <div className="relative group">
                      <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="date"
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-[14px] focus:outline-none focus:border-primary transition-all"
                        value={formData.billDate || ''}
                        onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[13px] font-bold text-gray-700 ml-1">Due Date</label>
                    <div className="relative group">
                      <Clock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="date"
                        className={cn(
                          "w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border rounded-2xl text-[14px] focus:outline-none focus:border-primary transition-all",
                          errors.dueDate ? "border-red-200 bg-red-50/10" : "border-gray-200"
                        )}
                        value={formData.dueDate || ''}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Documentation</h3>
                  <div className="h-px flex-1 bg-gray-100 ml-4"></div>
                </div>

                <div className="space-y-5">
                  <div 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="group border-2 border-dashed border-gray-200 rounded-[2rem] p-8 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-primary/[0.02] hover:border-primary/30 transition-all cursor-pointer"
                  >
                    <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,image/*" />
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-primary group-hover:scale-110 transition-all mb-4">
                      <Upload className="w-7 h-7" />
                    </div>
                    <p className="text-[15px] font-bold text-gray-900">Drop files here</p>
                    <p className="text-[12px] text-gray-500 mt-1">PDF or Images up to 5MB</p>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm animate-in fade-in slide-in-from-right-2 duration-200">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                              <File className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-gray-900 truncate pr-4">{file.name}</p>
                              <p className="text-[11px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              type="button" 
                              onClick={() => setPreviewFile(file)}
                              className="p-2 hover:bg-gray-50 text-gray-400 hover:text-primary rounded-xl transition-all"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(index); }} className="p-2 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-xl transition-all">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Section 5: Notes */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Additional Notes</h3>
                <div className="h-px flex-1 bg-gray-100 ml-4"></div>
              </div>
              <textarea 
                rows={4}
                className="w-full px-6 py-5 bg-gray-50/50 border border-gray-200 rounded-[2rem] text-[15px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all resize-none placeholder:text-gray-400"
                placeholder="Add any specific instructions or context for this bill..."
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </section>

            {/* Submit Error */}
            <AnimatePresence>
              {errors.submit && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1, x: [0, -5, 5, -5, 5, 0] }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-600 animate-in shake duration-300"
                >
                  <AlertCircle className="w-6 h-6" />
                  <p className="text-[14px] font-bold">{errors.submit}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={isUploading}
              className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black text-xl hover:bg-black transition-all shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 group"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Processing Submission...</span>
                </>
              ) : (
                <>
                  <span>Submit {formData.utilityType === 'Other' ? formData.customUtilityType || '' : formData.utilityType || ''} Bill for Processing</span>
                  <CheckCircle2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        <div className="mt-16 text-center space-y-2">
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.3em]">© 2026 Neoteric Properties • Gwalior, India</p>
          <p className="text-[10px] text-gray-300 font-medium">Secure SSL Encrypted Submission Portal</p>
        </div>
      </div>
      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                    <File className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 truncate max-w-[200px] md:max-w-md">{previewFile.name}</h3>
                    <p className="text-[11px] text-gray-500">{(previewFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPreviewFile(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 bg-gray-50 overflow-hidden">
                {previewFile.type === 'application/pdf' ? (
                  <PdfViewer file={previewFile} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8">
                    <img 
                      src={URL.createObjectURL(previewFile)} 
                      alt="Preview" 
                      className="max-w-full max-h-full object-contain rounded-xl shadow-lg" 
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
