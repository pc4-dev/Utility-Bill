import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Save, 
  History,
  Search,
  Filter,
  ArrowRight,
  Download,
  Eye,
  ExternalLink,
  ArrowLeft,
  Trash2,
  ChevronDown,
  ShieldCheck,
  CreditCard,
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { Bill, Project, ModulePermissions, WORKFLOW_STATUSES } from '../types';
import { cn, downloadFile } from '../utils';
import { Type } from "@google/genai";
import { generateContentWithRetry } from '../services/geminiService';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import { PdfViewer } from './PdfViewer';
import { BillDetailsDrawer } from './BillDetailsDrawer';
import { WorkflowModal } from './WorkflowModal';
import { PaymentModal } from './PaymentModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { Filters } from './Filters';

import { Skeleton } from './ui/Skeleton';

export const ElectricityModule: React.FC = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [view, setView] = useState<'list' | 'upload' | 'form'>('list');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    property: '',
    status: '',
    date: '',
    startDate: '',
    endDate: '',
    operator: '', // Not strictly needed but for consistency
    billType: ''   // Not strictly needed but for consistency
  });
  
  // Modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<Bill | null>(null);
  
  const [duplicateFound, setDuplicateFound] = useState<Bill | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [workflowActionType, setWorkflowActionType] = useState<'verify' | 'approve' | 'initiate' | 'confirm'>('verify');
  const [workflowActionTitle, setWorkflowActionTitle] = useState('');
  
  const [formData, setFormData] = useState<Partial<Bill>>({
    utilityType: 'Electricity',
    status: '' as any,
    priority: 'Normal',
    amount: 0,
    propertyName: '',
    customPropertyName: '',
    companyName: '',
    customCompanyName: '',
    serviceProvider: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    energyCharges: 0,
    fppas: 0,
    fixedCharge: 0,
    electricityDuty: 0,
    additionalSD: 0,
    otherCharges: 0,
    monthBillAmount: 0,
    subsidyAmount: 0,
    interestOnSecurityDeposit: 0,
    ccbAdjustment: 0,
    lockCreditRebate: 0,
    rebateIncentive: 0,
    currentMonthBillAmount: 0,
    reminderDays: 3,
    reminderDate: '',
  });

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

  // Duplicate detection as user edits
  useEffect(() => {
    if (view === 'form') {
      const duplicate = checkDuplicate(formData, bills);
      setDuplicateFound(duplicate || null);
    }
  }, [formData.consumerNumber, formData.billNumber, formData.dueDate, formData.month, formData.year, view]);

  const companies = [
    "GLR",
    "Gravity",
    "Neoteric Housing LLP",
    "Swastik",
    "Heaven Heights",
    "Neoteric Construction",
    "Others"
  ];

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  
  useEffect(() => {
    const handleExtracted = (e: any) => {
      const data = e.detail;
      if (data.jobId === activeJobId || (activeJobId && data.jobId === activeJobId)) {
        setIsExtracting(false);
        setActiveJobId(null);
        
        const extractedData = data.data;
        // Map extracted data to form data
        setFormData(prev => ({
          ...prev,
          customerName: extractedData.customerName,
          consumerNumber: extractedData.consumerNumber,
          billNumber: extractedData.billNumber,
          month: extractedData.billMonth?.split(' ')[0],
          year: extractedData.billMonth?.split(' ')[1],
          billDate: extractedData.billingDate || extractedData.billDate,
          dueDate: extractedData.dueDate,
          amount: extractedData.amount,
          meterNumber: extractedData.meterNumber,
          totalUnits: extractedData.totalUnits,
          securityAmount: extractedData.securityAmount,
          fine: extractedData.fine,
          serviceProvider: extractedData.serviceProvider,
          propertyName: extractedData.customerName || '',
          energyCharges: extractedData.energyCharges || 0,
          fppas: extractedData.fppas || 0,
          fixedCharge: extractedData.fixedCharge || 0,
          electricityDuty: extractedData.electricityDuty || 0,
          additionalSD: extractedData.additionalSD || 0,
          otherCharges: extractedData.otherCharges || 0,
          monthBillAmount: extractedData.monthBillAmount || 0,
          subsidyAmount: extractedData.subsidyAmount || 0,
          interestOnSecurityDeposit: extractedData.interestOnSecurityDeposit || 0,
          ccbAdjustment: extractedData.ccbAdjustment || 0,
          lockCreditRebate: extractedData.lockCreditRebate || 0,
          rebateIncentive: extractedData.rebateIncentive || 0,
          currentMonthBillAmount: extractedData.currentMonthBillAmount || extractedData.amount || 0,
        }));

        setView('form');
      }
    };

    window.addEventListener('bill:extracted', handleExtracted);
    return () => window.removeEventListener('bill:extracted', handleExtracted);
  }, [activeJobId]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allBills, allProjects] = await Promise.all([
        api.getBills(),
        api.getProjects()
      ]);
      setBills(allBills.filter(b => b.utilityType === 'Electricity'));
      setProjects(allProjects);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBills = bills.filter(bill => {
    const matchesProject = !filters.property || bill.propertyName === filters.property;
    const matchesStatus = !filters.status || bill.status === filters.status;
    const matchesDate = (!filters.startDate || (bill.billDate && bill.billDate >= filters.startDate)) && 
                       (!filters.endDate || (bill.billDate && bill.billDate <= filters.endDate));
    const matchesSearch = !filters.search || 
      bill.propertyName.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.customerName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.consumerNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.billNumber.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesProject && matchesStatus && matchesSearch && matchesDate;
  });

  const checkDuplicate = (data: Partial<Bill>, currentBills: Bill[]) => {
    return currentBills.find(eb => {
      // Skip if it's the exact same document we're editing
      if (data.id && (eb.id === data.id || eb._id === data.id)) return false;
      if (data._id && (eb.id === data._id || eb._id === data._id)) return false;

      // Criteria 1: Consumer Number Match (Strongest)
      const sameConsumer = (eb.consumerNumber && data.consumerNumber && eb.consumerNumber === data.consumerNumber);
      
      // Criteria 2: Bill Number Match
      const sameBillNum = (eb.billNumber && data.billNumber && eb.billNumber === data.billNumber);

      // Criteria 3: Period & Date Match
      const sameMonthYear = (eb.month && data.month && eb.month === data.month && eb.year && data.year && eb.year === data.year);
      const sameDueDate = (eb.dueDate && data.dueDate && eb.dueDate === data.dueDate);
      const sameBillDate = (eb.billDate && data.billDate && eb.billDate === data.billDate);
      const samePeriod = (eb.billingPeriod && data.billingPeriod && eb.billingPeriod === data.billingPeriod);

      // It's a duplicate if same consumer/bill-id AND (same period OR same bill date)
      return (sameConsumer || sameBillNum) && (sameMonthYear || sameDueDate || samePeriod || sameBillDate);
    });
  };

  const handleDelete = (id: string | number) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteBill(itemToDelete);
      fetchData();
      toast.success('Bill deleted successfully');
      setIsDeleteModalOpen(false);
    } catch (err) {
      toast.error('Failed to delete bill');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Revoke old URL to prevent memory leaks
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setView('upload');
      setDuplicateFound(null);
      
      // Reset form data for new upload to ensure old bill data is removed
      setFormData({
        utilityType: 'Electricity',
        status: 'Pending',
        priority: 'Normal',
        amount: 0,
        propertyName: '',
        companyName: '',
        serviceProvider: '',
        billDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
      });
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleExtract = async () => {
    if (!selectedFile) return;
    setIsExtracting(true);
    
    try {
      // 1. Upload file
      const formDataUpload = new FormData();
      formDataUpload.append('files', selectedFile);
      const uploadRes = await api.uploadElectricity(formDataUpload);
      const fileUrl = uploadRes.fileUrl;

      // 2. Extract Client-side
      toast.loading('AI Extracting Data...', { id: 'extraction' });
      
      const fileData = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type;
      
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: fileData, mimeType: mimeType === "application/pdf" ? "application/pdf" : "image/jpeg" } },
            { text: `Extract all details from this electricity bill.
            Return a JSON object with:
            - customerName: full name of consumer
            - consumerNumber: Consumer/Account ID number
            - billNumber: invoice/bill number
            - billingDate: "YYYY-MM-DD"
            - dueDate: "YYYY-MM-DD"
            - billingPeriod: period mentioned (e.g., April 2024 or 01-Apr to 30-Apr)
            - amount: total amount payable (net) 
            - totalUnits: total units consumed
            - serviceProvider: electricity board name (e.g., DHBVN, Tata Power)
            - fixedCharge: amount for fixed charges
            - electricityDuty: tax/duty amount
            - additionalSD: additional security deposit
            - subsidyAmount: any government subsidy
            - energyCharges: charge for units consumed
            - otherCharges: total of miscellaneous charges
            - lockCreditRebate: any rebate or credit
            ` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              customerName: { type: Type.STRING },
              consumerNumber: { type: Type.STRING },
              billNumber: { type: Type.STRING },
              billingDate: { type: Type.STRING },
              dueDate: { type: Type.STRING },
              billingPeriod: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              totalUnits: { type: Type.NUMBER },
              serviceProvider: { type: Type.STRING },
              fixedCharge: { type: Type.NUMBER },
              electricityDuty: { type: Type.NUMBER },
              additionalSD: { type: Type.NUMBER },
              subsidyAmount: { type: Type.NUMBER },
              energyCharges: { type: Type.NUMBER },
              otherCharges: { type: Type.NUMBER },
              lockCreditRebate: { type: Type.NUMBER }
            }
          }
        }
      });

      let responseText = response.text || "{}";
      
      // Basic cleanup for redundant markdown or accidental text
      responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      
      let extractedData: any;
      try {
        extractedData = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn("JSON Parse failed, attempting fallback recovery:", parseErr);
        try {
          extractedData = JSON.parse(responseText + '"}');
        } catch (f) {
          try {
            extractedData = JSON.parse(responseText + '}');
          } catch (f2) {
             throw new Error("The AI response was too large or corrupted and could not be parsed. Please try again with a smaller file or clearer document.");
          }
        }
      }
      
      const newFormData = {
        ...formData,
        customerName: extractedData.customerName || '',
        consumerNumber: extractedData.consumerNumber || '',
        billNumber: extractedData.billNumber || '',
        billDate: extractedData.billingDate || extractedData.billDate || new Date().toISOString().split('T')[0],
        dueDate: extractedData.dueDate || new Date().toISOString().split('T')[0],
        billingPeriod: extractedData.billingPeriod || '',
        amount: extractedData.amount || 0,
        totalUnits: extractedData.totalUnits || 0,
        serviceProvider: extractedData.serviceProvider || '',
        fixedCharge: extractedData.fixedCharge || 0,
        electricityDuty: extractedData.electricityDuty || 0,
        additionalSD: extractedData.additionalSD || 0,
        subsidyAmount: extractedData.subsidyAmount || 0,
        energyCharges: extractedData.energyCharges || 0,
        otherCharges: extractedData.otherCharges || 0,
        lockCreditRebate: extractedData.lockCreditRebate || 0,
        currentMonthBillAmount: extractedData.amount || 0,
        fileUrl: fileUrl
      };

      setFormData(newFormData);

      // Check for duplicate right after extraction
      const duplicate = checkDuplicate(newFormData, bills);
      if (duplicate) {
        setDuplicateFound(duplicate);
        toast.error('Warning: A duplicate entry for this bill was detected!', { 
          id: 'duplicate-alert',
          duration: 6000 
        });
      } else {
        setDuplicateFound(null);
      }

      toast.success('Data extracted successfully', { id: 'extraction' });
      setView('form');
    } catch (err: any) {
      console.error('Extraction error:', err);
      toast.error(`Extraction failed: ${err.message}`, { id: 'extraction' });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.propertyName) {
      toast.error('Project Name is required');
      return;
    }
    
    if (!formData.companyName) {
      toast.error('Company Name is required');
      return;
    }

    if (!formData.status) {
      toast.error('Status is required');
      return;
    }

    // Final duplicate check before save
    const duplicate = checkDuplicate(formData, bills);
    if (duplicate) {
      toast.error(`Error: This entry already exists (${duplicate.billId}). Please correct or delete the existing entry first.`, {
        duration: 8000
      });
      setDuplicateFound(duplicate);
      return;
    }

    setIsLoading(true);

    try {
      // First upload file to get permanent URL
      let fileUrl = formData.fileUrl || '';
      if (selectedFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('files', selectedFile);
        const uploadRes = await api.uploadFiles(formDataUpload);
        if (uploadRes.files && uploadRes.files.length > 0) {
          fileUrl = uploadRes.files[0].url;
        }
      }

      const ratePerUnit = formData.amount && formData.totalUnits ? (formData.amount / formData.totalUnits) : 0;
      
      const isUpdate = !!(formData.id || formData._id);
      
      const bDate = formData.billDate ? new Date(formData.billDate) : new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const month = monthNames[bDate.getMonth()];
      const year = bDate.getFullYear().toString();

      const billToSave: Partial<Bill> = {
        ...formData,
        category: 'utility' as const,
        subcategory: 'electricity',
        month: month,
        year: year,
        propertyName: formData.propertyName === 'Others' ? formData.customPropertyName : formData.propertyName,
        companyName: formData.companyName === 'Others' ? formData.customCompanyName : formData.companyName,
        ratePerUnit,
        fileUrl,
        submissionDateTime: formData.submissionDateTime || new Date().toISOString(),
        billId: formData.billId || `ELEC-${Date.now().toString().slice(-6)}`,
        attachments: fileUrl 
          ? [{ url: fileUrl, name: selectedFile?.name || 'Bill', type: selectedFile?.type || 'image/jpeg' }] 
          : (formData.attachments || [])
      };

      await api.saveBill(billToSave as Bill);
      toast.success(isUpdate ? 'Electricity bill updated successfully!' : (formData.amount < 0 ? 'Credit bill (refund) saved successfully!' : 'Electricity bill saved successfully!'));
      setView('list');
      fetchData();
    } catch (err: any) {
      console.error('Save error:', err);
      if (err.message?.includes('SESSION_REQUIRED')) {
        toast.error('Session timeout. Please try again in 2 seconds.');
      } else {
        toast.error('Failed to save bill');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (action: keyof ModulePermissions) => {
    if (user?.role === 'ADMIN') return true;
    if (user?.permissions && user.permissions.electricity) {
      return user.permissions.electricity[action];
    }
    // Default fallback logic for specific roles
    if (action === 'add') return user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'DATA_ENTRY';
    if (action === 'view') return true;
    if (action === 'approve') return user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'APPROVER';
    return user?.role === 'ADMIN'; 
  };

  const canAdd = hasPermission('add');
  const canEdit = user?.role === 'ADMIN';
  const canDelete = user?.role === 'ADMIN';
  const canApprove = user?.role === 'ADMIN';
  const canVerify = user?.role === 'ADMIN';
  const canInitiatePayment = user?.role === 'ADMIN' || user?.role === 'ACCOUNT_MANAGEMENT';
  const canConfirmPayment = user?.role === 'ADMIN' || user?.role === 'ACCOUNT_MANAGER';
  const canDownload = user?.role !== 'ACCOUNT_MANAGEMENT';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-3">
            <Zap className="w-8 h-8 text-orange-500 fill-orange-500" />
            Electricity Module
          </h1>
          <p className="text-text-secondary font-medium">AI-powered electricity bill management and extraction</p>
        </div>
        
        {view === 'list' && canAdd && (
          <button 
            onClick={() => {
              setSelectedFile(null);
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
              setView('upload');
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
          >
            <Upload className="w-4 h-4" />
            Upload New Bill
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={() => setFilters({ ...filters, status: '' })}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Total Bills</p>
                  <FileText className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h2 className="text-2xl font-black text-text-primary transition-colors">{bills.length}</h2>
              </div>

              <div 
                onClick={() => setFilters({ ...filters, status: 'Pending' })}
                className={cn(
                  "p-6 rounded-2xl border shadow-sm transition-all hover:shadow-md cursor-pointer group",
                  filters.status === 'Pending' 
                    ? "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-500/30" 
                    : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Pending Bills</p>
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                </div>
                <h2 className="text-2xl font-black text-orange-500">
                  {bills.filter(b => b.status === 'Pending' || b.status === 'PENDING').length}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
              <button
                onClick={() => setFilters({ ...filters, status: '' })}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  filters.status === '' 
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-200" 
                    : "bg-white dark:bg-slate-900 text-text-secondary border border-gray-100 dark:border-slate-800 hover:bg-gray-50 flex items-center gap-2"
                )}
              >
                All Bills
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-[10px]",
                  filters.status === '' ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-400"
                )}>
                  {bills.length}
                </span>
              </button>
              {WORKFLOW_STATUSES.map(s => {
                const count = bills.filter(b => b.status === s).length;
                return (
                  <button
                    key={s}
                    onClick={() => setFilters({ ...filters, status: s })}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                      filters.status === s 
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-200" 
                        : "bg-white dark:bg-slate-900 text-text-secondary border border-gray-100 dark:border-slate-800 hover:bg-gray-50"
                    )}
                  >
                    {s}
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-md text-[10px]",
                      filters.status === s ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-400"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <Filters 
              filters={filters}
              setFilters={setFilters}
              properties={Array.from(new Set(projects.map(p => p.name)))}
            />

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                      <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Bill Details</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Company / Provider</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Consumer No</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Due Date</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Amount</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {isLoading ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <tr key={i}>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <Skeleton variant="card" className="w-10 h-10 rounded-xl" />
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-16" />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                             <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-16" />
                              </div>
                          </td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-20" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-5 w-16" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-6 w-16 rounded-full" /></td>
                          <td className="py-4 px-6 text-right">
                             <div className="flex justify-end gap-2">
                                <Skeleton variant="circle" className="w-8 h-8" />
                                <Skeleton variant="circle" className="w-8 h-8" />
                              </div>
                          </td>
                        </tr>
                      ))
                    ) : filteredBills.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-2 text-text-secondary">
                            <Zap className="w-12 h-12 opacity-20" />
                            <p className="font-medium">No electricity bills found</p>
                            <button onClick={() => setView('upload')} className="text-orange-500 text-sm font-bold hover:underline transition-all">Upload your first bill</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredBills.map((bill) => (
                        <tr key={bill.id || bill._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center transition-colors">
                                <Zap className="w-5 h-5 text-orange-500" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-text-primary transition-colors">{bill.propertyName}</p>
                                <p className="text-[10px] text-text-secondary font-medium transition-colors">{bill.billNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm font-bold text-text-primary transition-colors">{bill.companyName}</p>
                            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest transition-colors">{bill.serviceProvider}</p>
                          </td>
                          <td className="py-4 px-6 text-sm font-medium text-text-secondary transition-colors">{bill.consumerNumber || bill.accountNumber || 'N/A'}</td>
                          <td className="py-4 px-6 text-sm font-medium text-text-secondary transition-colors">
                            <div>{bill.dueDate}</div>
                            {bill.submissionDateTime && (
                              <div className="text-[10px] text-orange-500 font-bold mt-1">
                                Submitted: {new Date(bill.submissionDateTime).toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1">
                              <p className={cn(
                                "text-sm font-black transition-colors",
                                bill.amount < 0 ? "text-red-600 dark:text-red-400" : "text-text-primary"
                              )}>
                                ₹{bill.amount.toLocaleString()}
                              </p>
                              {bill.amount < 0 && (
                                <div className="flex items-center gap-1 text-[9px] font-bold text-red-500 uppercase tracking-tighter bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded w-fit border border-red-100 dark:border-red-900/30">
                                  <AlertCircle className="w-2 h-2" />
                                  Credit/Refund
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors",
                              bill.status === 'Paid' ? "bg-green-100 dark:bg-emerald-900/30 text-green-700 dark:text-emerald-400" : "bg-orange-100 dark:bg-amber-900/30 text-orange-700 dark:text-amber-400"
                            )}>
                              {bill.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1 sm:gap-2">
                              <button 
                                onClick={() => {
                                  setSelectedBillForDetails(bill);
                                  setIsDetailsModalOpen(true);
                                }}
                                className="p-2 text-text-secondary hover:text-orange-500 transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Workflow Actions Removed - Only available in details modal */}
                              
                              {canEdit && (
                                <button 
                                  onClick={() => {
                                    setFormData(bill);
                                    setView('form');
                                  }}
                                  className="p-2 text-text-secondary hover:text-blue-500 transition-colors"
                                  title="Edit Bill"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              )}
                              
                              {canDelete && (
                                <button 
                                  onClick={() => handleDelete(bill.id || bill._id!)}
                                  className="p-2 text-text-secondary hover:text-red-500 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'upload' && (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-2xl mx-auto space-y-4"
          >
            <button 
              onClick={() => setView('list')}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary font-bold text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </button>
            <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800 flex flex-col items-center text-center space-y-6 transition-colors">
              <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-3xl flex items-center justify-center transition-colors">
                <Upload className="w-10 h-10 text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-black text-text-primary transition-colors">Upload Electricity Bill</h2>
                <p className="text-text-secondary mt-2">Upload a PDF or image of your bill. Our AI will automatically extract all the details for you.</p>
              </div>
              
              <div className="w-full max-w-sm">
                <label className="block">
                  <span className="sr-only">Choose bill file</span>
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                    className="block w-full text-sm text-text-secondary file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-orange-50 dark:file:bg-orange-900/30 file:text-orange-600 hover:file:bg-orange-100 transition-all cursor-pointer"
                  />
                </label>
              </div>

              {selectedFile && (
                <div className="w-full p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-orange-500" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-text-primary truncate max-w-[200px] transition-colors">{selectedFile.name}</p>
                      <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest transition-colors">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleExtract}
                    disabled={isExtracting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-50"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Extract with AI
                      </>
                    )}
                  </button>
                </div>
              )}

              <button 
                onClick={() => setView('list')}
                className="text-gray-400 text-sm font-bold hover:text-gray-600 transition-colors"
              >
                Cancel and go back
              </button>
            </div>
          </motion.div>
        )}

        {view === 'form' && (
          <motion.div 
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <button 
              onClick={() => setView('upload')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Upload
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-text-primary transition-colors">Verify Bill Details</h2>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-emerald-900/20 text-green-600 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors">
                  <CheckCircle2 className="w-3 h-3" />
                  AI Extracted
                </div>
              </div>

              {(formData.amount || 0) < 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 transition-colors"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight">Credit Bill Detected</p>
                    <p className="text-xs font-bold opacity-80">This bill has a negative balance (₹{Math.abs(formData.amount || 0).toLocaleString()}). It will be stored as a credit record.</p>
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select 
                        value={formData.propertyName || ''}
                        required
                        onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 appearance-none cursor-pointer transition-colors"
                      >
                        <option value="" className="bg-white dark:bg-slate-900">Select Project</option>
                        {projects.map(p => (
                          <option key={p.id || p._id} value={p.name} className="bg-white dark:bg-slate-900">{p.name}</option>
                        ))}
                        <option value="Others" className="bg-white dark:bg-slate-900">Others (Type Below)</option>
                      </select>
                    </div>
                    {formData.propertyName === 'Others' && (
                      <input 
                        type="text"
                        value={formData.customPropertyName || ''}
                        onChange={(e) => setFormData({...formData, customPropertyName: e.target.value})}
                        placeholder="Enter Custom Project Name"
                        className="mt-2 w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/50 rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-orange-500/20 transition-all shadow-sm"
                        required
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select 
                        value={formData.companyName || ''}
                        required
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 appearance-none cursor-pointer transition-colors"
                      >
                        <option value="" className="bg-white dark:bg-slate-900">Select Company</option>
                        {companies.map(c => (
                          <option key={c} value={c} className="bg-white dark:bg-slate-900">{c}</option>
                        ))}
                      </select>
                    </div>
                    {formData.companyName === 'Others' && (
                      <input 
                        type="text"
                        value={formData.customCompanyName || ''}
                        onChange={(e) => setFormData({...formData, customCompanyName: e.target.value})}
                        placeholder="Enter Custom Company Name"
                        className="mt-2 w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/50 rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-orange-500/20 transition-all shadow-sm"
                        required
                      />
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Service Provider</label>
                    <input 
                      type="text" 
                      value={formData.serviceProvider || ''}
                      onChange={(e) => setFormData({ ...formData, serviceProvider: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                      placeholder="e.g. Tata Power, MPEB"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Customer Name</label>
                    <input 
                      type="text" 
                      value={formData.customerName || ''}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Category</label>
                    <input 
                      type="text" 
                      value="Electricity"
                      readOnly
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 outline-none cursor-not-allowed transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Status <span className="text-red-500">*</span></label>
                    <select 
                      value={formData.status || ''}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 appearance-none cursor-pointer transition-colors"
                      required
                    >
                      <option value="" className="bg-white dark:bg-slate-900">Select Status</option>
                      <option value="Paid" className="bg-white dark:bg-slate-900">Paid</option>
                      <option value="Pending" className="bg-white dark:bg-slate-900">Pending</option>
                      <option value="Overdue" className="bg-white dark:bg-slate-900">Overdue</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Consumer Number</label>
                    <input 
                      type="text" 
                      value={formData.consumerNumber || ''}
                      onChange={(e) => setFormData({ ...formData, consumerNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                      placeholder="Enter consumer number"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Meter Number</label>
                    <input 
                      type="text" 
                      value={formData.meterNumber || ''}
                      onChange={(e) => setFormData({ ...formData, meterNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                      placeholder="Enter meter number"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Bill Number</label>
                    <input 
                      type="text" 
                      value={formData.billNumber || ''}
                      onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                      placeholder="Enter bill number"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Total Amount (₹)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={formData.amount || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setFormData({ ...formData, amount: val, currentMonthBillAmount: val });
                        }}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl text-sm font-black outline-none transition-all",
                          formData.amount < 0 
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-1 ring-red-500" 
                            : "bg-gray-50 dark:bg-slate-800 text-orange-600 focus:ring-1 focus:ring-orange-500"
                        )}
                        placeholder="0.00"
                      />
                    </div>
                    {formData.amount < 0 && (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tight px-1 transition-colors">
                        <AlertCircle className="w-3 h-3" />
                        Warning: Negative amount entered (Credit)
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Total Units</label>
                    <input 
                      type="number" 
                      value={formData.totalUnits || ''}
                      onChange={(e) => setFormData({ ...formData, totalUnits: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Rate Per Unit (₹)</label>
                    <input 
                      type="number" 
                      readOnly
                      value={formData.amount && formData.totalUnits ? (formData.amount / formData.totalUnits).toFixed(2) : ''}
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-800/50 border-none rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 outline-none cursor-not-allowed transition-colors"
                      placeholder="Auto-calculated"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Security Deposited (₹)</label>
                    <input 
                      type="number" 
                      value={formData.securityAmount || ''}
                      onChange={(e) => setFormData({ ...formData, securityAmount: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Fine / Late Fee (₹)</label>
                    <input 
                      type="number" 
                      value={formData.fine || ''}
                      onChange={(e) => setFormData({ ...formData, fine: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Billing Date</label>
                    <input 
                      type="date" 
                      value={formData.billDate || ''}
                      onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Due Date</label>
                    <input 
                      type="date" 
                      value={formData.dueDate || ''}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Billing Period</label>
                    <input 
                      type="text" 
                      value={formData.billingPeriod || ''}
                      onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                      placeholder="e.g. April 2024"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 block transition-colors">Status *</label>
                    <div className="relative">
                      <select 
                        value={formData.status || ''}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 appearance-none cursor-pointer transition-colors pr-10"
                        required
                      >
                        <option value="" className="bg-white dark:bg-slate-900">Select Status</option>
                        <option value="Paid" className="bg-white dark:bg-slate-900">Paid</option>
                        <option value="Pending" className="bg-white dark:bg-slate-900">Pending</option>
                        <option value="Overdue" className="bg-white dark:bg-slate-900">Overdue</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-wider transition-colors">Billing Details</h3>
                    <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800 transition-colors"></div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-slate-800/30 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 transition-colors">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100/50 dark:bg-slate-800/50 transition-colors">
                          <th className="py-2.5 px-4 font-bold text-text-secondary">Description</th>
                          <th className="py-2.5 px-4 font-bold text-text-secondary text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        <tr>
                          <td className="py-2.5 px-4 text-text-secondary transition-colors">Energy Charges</td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={formData.energyCharges || ''}
                              onChange={(e) => setFormData({ ...formData, energyCharges: parseFloat(e.target.value) })}
                              className="w-full bg-transparent text-right outline-none text-text-primary focus:text-orange-600 transition-colors"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-text-secondary transition-colors">FPPAS (Fuel & Power Adj. Surcharge)</td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={formData.fppas || ''}
                              onChange={(e) => setFormData({ ...formData, fppas: parseFloat(e.target.value) })}
                              className="w-full bg-transparent text-right outline-none text-text-primary focus:text-orange-600 transition-colors"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-text-secondary transition-colors">Fixed Charge</td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={formData.fixedCharge || ''}
                              onChange={(e) => setFormData({ ...formData, fixedCharge: parseFloat(e.target.value) })}
                              className="w-full bg-transparent text-right outline-none text-text-primary focus:text-orange-600 transition-colors"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-text-secondary transition-colors">Electricity Duty</td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={formData.electricityDuty || ''}
                              onChange={(e) => setFormData({ ...formData, electricityDuty: parseFloat(e.target.value) })}
                              className="w-full bg-transparent text-right outline-none text-text-primary focus:text-orange-600 transition-colors"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-text-secondary transition-colors">Additional SD Installment</td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={formData.additionalSD || ''}
                              onChange={(e) => setFormData({ ...formData, additionalSD: parseFloat(e.target.value) })}
                              className="w-full bg-transparent text-right outline-none text-text-primary focus:text-orange-600 transition-colors"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-text-secondary transition-colors">Other Charges</td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={formData.otherCharges || ''}
                              onChange={(e) => setFormData({ ...formData, otherCharges: parseFloat(e.target.value) })}
                              className="w-full bg-transparent text-right outline-none text-text-primary focus:text-orange-600 transition-colors"
                            />
                          </td>
                        </tr>
                        <tr className="bg-orange-50/30 dark:bg-orange-900/10 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-text-primary">Month Bill Amount</td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={formData.monthBillAmount || ''}
                              onChange={(e) => setFormData({ ...formData, monthBillAmount: parseFloat(e.target.value) })}
                              className="w-full bg-transparent text-right font-bold text-text-primary outline-none transition-colors"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-text-secondary transition-colors">Govt. Subsidy Amount (-)</td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={formData.subsidyAmount || ''}
                              onChange={(e) => setFormData({ ...formData, subsidyAmount: parseFloat(e.target.value) })}
                              className="w-full bg-transparent text-right outline-none text-text-primary focus:text-orange-600 transition-colors"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-text-secondary transition-colors">Interest on Security Deposit (-)</td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={formData.interestOnSecurityDeposit || ''}
                              onChange={(e) => setFormData({ ...formData, interestOnSecurityDeposit: parseFloat(e.target.value) })}
                              className="w-full bg-transparent text-right outline-none text-text-primary focus:text-orange-600 transition-colors"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-text-secondary transition-colors">CCB Adjustment</td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={formData.ccbAdjustment || ''}
                              onChange={(e) => setFormData({ ...formData, ccbAdjustment: parseFloat(e.target.value) })}
                              className="w-full bg-transparent text-right outline-none text-text-primary focus:text-orange-600 transition-colors"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-text-secondary transition-colors">Lock Credit / Employee Rebate (-)</td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={formData.lockCreditRebate || ''}
                              onChange={(e) => setFormData({ ...formData, lockCreditRebate: parseFloat(e.target.value) })}
                              className="w-full bg-transparent text-right outline-none text-text-primary focus:text-orange-600 transition-colors"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 text-text-secondary transition-colors">Rebate & Incentive (-)</td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={formData.rebateIncentive || ''}
                              onChange={(e) => setFormData({ ...formData, rebateIncentive: parseFloat(e.target.value) })}
                              className="w-full bg-transparent text-right outline-none text-text-primary focus:text-orange-600 transition-colors"
                            />
                          </td>
                        </tr>
                        <tr className={cn("transition-colors", formData.currentMonthBillAmount < 0 ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-orange-500 text-white")}>
                          <td className="py-3 px-4 font-black">Current Month Bill Amount</td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={formData.currentMonthBillAmount || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setFormData({ ...formData, currentMonthBillAmount: val, amount: val });
                              }}
                              className={cn(
                                "w-full bg-transparent text-right font-black outline-none",
                                formData.currentMonthBillAmount < 0 ? "text-red-600 dark:text-red-400" : "text-white"
                              )}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setView('upload')}
                    className="flex-1 py-3.5 bg-gray-100 dark:bg-slate-800 text-text-secondary dark:text-gray-400 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-all transition-colors"
                  >
                    Re-upload
                  </button>
                  <button 
                    type="submit"
                    disabled={isLoading || !!duplicateFound}
                    className={cn(
                      "flex-[2] py-3.5 text-white rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2",
                      duplicateFound ? "bg-red-400 cursor-not-allowed opacity-70" : "bg-orange-500 hover:bg-orange-600 shadow-orange-200"
                    )}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {duplicateFound ? 'Duplicate Entry - Blocked' : 'Save Electricity Bill'}
                  </button>
                </div>
                {duplicateFound && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-2xl flex items-start gap-4 transition-colors"
                  >
                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-900 dark:text-red-400 uppercase transition-colors">Duplicate Entry Detected</p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1 transition-colors">
                        A bill with Consumer Number <b>{duplicateFound.consumerNumber}</b> and matching billing period already exists in the system as <b>{duplicateFound.billId}</b>.
                        To avoid duplication, you are prevented from saving this entry again.
                      </p>
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedBillForDetails(duplicateFound);
                          setIsDetailsModalOpen(true);
                        }}
                        className="mt-2 text-xs font-black text-red-800 dark:text-red-400 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        View Existing Bill
                      </button>
                    </div>
                  </motion.div>
                )}
              </form>
            </div>

            <div className="space-y-6">
              <div 
                onClick={() => window.open(previewUrl || '', '_blank')}
                className="bg-gray-900 dark:bg-slate-950 rounded-3xl overflow-hidden shadow-2xl aspect-[3/4] relative group cursor-pointer border border-gray-100 dark:border-slate-800 transition-colors"
              >
                {previewUrl && (
                  selectedFile?.type === 'application/pdf' ? (
                    <PdfViewer file={selectedFile} className="w-full h-full" />
                  ) : (
                    <img src={previewUrl} alt="Bill Preview" className="w-full h-full object-contain" />
                  )
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-full text-gray-900 dark:text-white shadow-xl transition-colors">
                    <Eye className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {selectedFile && (
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-2xl flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400 transition-colors">
                      {selectedFile.type === 'application/pdf' ? <FileText className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary transition-colors">{selectedFile.type === 'application/pdf' ? 'PDF' : 'Image'} Preview Options</p>
                      <p className="text-xs text-text-secondary transition-colors">You can open this in a new tab or download for your records.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a 
                      href={previewUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </a>
                    {canDownload && (
                      <button 
                        onClick={() => downloadFile(previewUrl || '', selectedFile.name)}
                        className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all flex items-center gap-2 shadow-sm"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex gap-4 transition-colors">
                <AlertCircle className="w-6 h-6 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-orange-900 dark:text-orange-400 transition-colors">Review Required</p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1 transition-colors">Please double-check the extracted values against the original bill image to ensure 100% accuracy before saving.</p>
                </div>
              </div>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BillDetailsDrawer 
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedBillForDetails(null);
          fetchData(); // Update list when drawer closes
        }}
        bill={selectedBillForDetails}
        onEdit={(bill) => {
          setFormData(bill);
          setDuplicateFound(null);
          setSelectedFile(null);
          setPreviewUrl(bill.fileUrl || null);
          setView('form');
          setIsDetailsModalOpen(false);
        }}
        onMarkPaid={(bill) => {
          setIsDetailsModalOpen(false); // Close drawer when going to payment
          setSelectedBillForDetails(bill);
          setIsPaymentModalOpen(true);
        }}
        onDelete={handleDelete}
        onVerify={(bill) => {
          setSelectedBillForDetails(bill);
          setWorkflowActionType('verify');
          setWorkflowActionTitle('Verify Electricity Bill');
          setIsVerificationModalOpen(true);
        }}
        onApprove={(bill) => {
          setSelectedBillForDetails(bill);
          setWorkflowActionType('approve');
          setWorkflowActionTitle('Approve Electricity Bill');
          setIsVerificationModalOpen(true);
        }}
        onInitiatePayment={(bill) => {
          setSelectedBillForDetails(bill);
          setWorkflowActionType('initiate');
          setWorkflowActionTitle('Initiate Payment');
          setIsVerificationModalOpen(true);
        }}
        onConfirmPayment={(bill) => {
          setSelectedBillForDetails(bill);
          setWorkflowActionType('confirm');
          setWorkflowActionTitle('Confirm Payment');
          setIsVerificationModalOpen(true);
        }}
      />

      {isVerificationModalOpen && selectedBillForDetails && (
        <WorkflowModal
          isOpen={isVerificationModalOpen}
          onClose={() => {
            setIsVerificationModalOpen(false);
          }}
          bill={selectedBillForDetails}
          actionType={workflowActionType}
          title={workflowActionTitle}
          onConfirm={async (remarks, proofFile, extraDetails) => {
            if (!selectedBillForDetails) return;
            const id = selectedBillForDetails.id || (selectedBillForDetails as any)._id;
            try {
              let proofUrl = '';
              let proofName = '';

              if (proofFile) {
                const formDataFile = new FormData();
                formDataFile.append('files', proofFile);
                const uploadRes = await api.uploadFiles(formDataFile);
                if (uploadRes.files && uploadRes.files.length > 0) {
                  proofUrl = uploadRes.files[0].url;
                  proofName = uploadRes.files[0].name;
                }
              }

              let updatedBill: Bill;
              if (workflowActionType === 'verify') {
                updatedBill = await api.verifyBill(id, remarks, user?.name, user?.role);
              } else if (workflowActionType === 'approve') {
                updatedBill = await api.approveBill(id, remarks, user?.name, user?.role);
              } else if (workflowActionType === 'initiate') {
                updatedBill = await api.initiatePayment(id, remarks, user?.name, user?.role, proofUrl, proofName);
              } else {
                updatedBill = await api.confirmPayment(
                  id, 
                  remarks, 
                  user?.name, 
                  user?.role,
                  extraDetails?.paymentDate,
                  extraDetails?.bankName,
                  extraDetails?.upiMode,
                  extraDetails?.upiReference,
                  proofUrl,
                  proofName,
                  extraDetails?.amount
                );
              }
              toast.success(`${workflowActionTitle} successful`);
              // Update the selected bill so the drawer reflects changes
              setSelectedBillForDetails(updatedBill);
              setIsVerificationModalOpen(false);
            } catch (err) {
              toast.error(`Failed to ${workflowActionType} bill`);
              throw err;
            }
          }}
          onReject={async (remarks) => {
            if (!selectedBillForDetails) return;
            const id = selectedBillForDetails.id || (selectedBillForDetails as any)._id;
            try {
              const updatedBill = await api.rejectBill(id, remarks, user?.name, user?.role);
              toast.success("Bill rejected successfully");
              setSelectedBillForDetails(updatedBill);
              setIsVerificationModalOpen(false);
            } catch (err) {
              toast.error("Failed to reject bill");
              throw err;
            }
          }}
        />
      )}

      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        bill={selectedBillForDetails}
        onPaymentSuccess={async (updatedBill) => {
          try {
            await api.saveBill(updatedBill);
            toast.success('Payment recorded successfully');
            fetchData();
            setIsDetailsModalOpen(false);
          } catch (err) {
            toast.error('Failed to save payment record');
            throw err;
          }
        }}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Delete Electricity Bill"
        message="Are you sure you want to delete this electricity bill? This action will permanently remove the record from the database."
      />
    </div>
  );
};
