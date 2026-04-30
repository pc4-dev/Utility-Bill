import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Phone, 
  Wifi, 
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
  Info,
  Trash2,
  Clock,
  X,
  Edit2,
  ChevronDown,
  ShieldCheck,
  CreditCard,
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { Bill, Project, WORKFLOW_STATUSES } from '../types';
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

const DetailRow: React.FC<{ label: string; value: any; mono?: boolean; isHighlight?: boolean }> = ({ 
  label, value, mono, isHighlight 
}) => (
  <div className="flex flex-col gap-1 transition-colors">
    <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider transition-colors">{label}</span>
    <span className={cn(
      "text-sm font-semibold truncate transition-colors",
      isHighlight ? "text-orange-600 dark:text-orange-400 font-black" : "text-text-primary",
      mono && "font-mono text-xs bg-gray-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-slate-700"
    )}>
      {value || 'Not specified'}
    </span>
  </div>
);

export const TelecomModule: React.FC = () => {
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
    date: '', // Added to match Filters component expectations
    startDate: '',
    endDate: '',
    operator: '',
    billType: ''
  });
  
  // Modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<Bill | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [workflowActionType, setWorkflowActionType] = useState<'verify' | 'approve' | 'initiate' | 'confirm'>('verify');
  const [workflowActionTitle, setWorkflowActionTitle] = useState('');
  
  const [formData, setFormData] = useState<Partial<Bill>>({
    utilityType: 'Telecom',
    status: '' as any,
    priority: 'Normal',
    amount: 0,
    propertyName: '',
    customPropertyName: '',
    companyName: '',
    customCompanyName: '',
    operatorName: '',
    customOperatorName: '',
    billType: 'Mobile',
    phoneNumber: '',
    accountNumber: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    billingPeriod: '',
    planName: '',
    dataUsage: '',
    callCharges: 0,
    internetCharges: 0,
    otherCharges: 0,
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

  const companies = [
    "GLR",
    "Gravity",
    "Neoteric Housing LLP",
    "Swastik",
    "Heaven Heights",
    "Neoteric Construction",
    "Others"
  ];

  const operators = [
    "Airtel",
    "Jio",
    "BSNL",
    "Vi (Vodafone Idea)",
    "Tata Play",
    "Excitel",
    "ACT Fiber",
    "Others"
  ];

  const billTypes = ["Mobile", "Landline", "Broadband"];

  const telecomSubcategories = [
    { id: 'Mobile', label: 'Mobile Bill', icon: Smartphone, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-100', shadowColor: 'shadow-orange-100' },
    { id: 'Landline', label: 'Landline', icon: Phone, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-100', shadowColor: 'shadow-green-100' },
    { id: 'Broadband', label: 'Broadband', icon: Wifi, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-100', shadowColor: 'shadow-purple-100' },
  ];

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  
  useEffect(() => {
    fetchData();
  }, []);

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allBills, allProjects] = await Promise.all([
        api.getBills(),
        api.getProjects()
      ]);
      
      // Deduplicate bills by ID to prevent displaying the same bill multiple times
      const uniqueBillsMap = new Map();
      allBills.forEach(bill => {
        const id = bill.id || bill._id;
        if (id && bill.utilityType === 'Telecom') {
          uniqueBillsMap.set(id, bill);
        }
      });
      
      setBills(Array.from(uniqueBillsMap.values()));
      setProjects(allProjects);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (bill: Bill) => {
    setFormData(bill as any);
    const url = bill.fileUrl || (bill.attachments && bill.attachments[0]?.url) || null;
    setPreviewUrl(url);
    setView('form');
  };

  const filteredBills = bills.filter(bill => {
    const matchesProject = !filters.property || bill.propertyName === filters.property;
    const matchesType = !filters.billType || bill.billType === filters.billType;
    const matchesOperator = !filters.operator || bill.operatorName === filters.operator;
    const matchesStatus = !filters.status || bill.status === filters.status;
    const matchesDate = (!filters.startDate || (bill.billDate && bill.billDate >= filters.startDate)) && 
                       (!filters.endDate || (bill.billDate && bill.billDate <= filters.endDate));
    const matchesSearch = !filters.search || 
      bill.propertyName.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.customerName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.phoneNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.accountNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.billNumber.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesProject && matchesType && matchesOperator && matchesStatus && matchesSearch && matchesDate;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setView('upload');
      
      // Reset form data for new upload
      setFormData({
        utilityType: 'Telecom',
        status: '' as any,
        priority: 'Normal',
        amount: 0,
        propertyName: '',
        companyName: '',
        operatorName: '',
        billType: 'Mobile',
        phoneNumber: '',
        accountNumber: '',
        billDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        billingPeriod: '',
        planName: '',
        dataUsage: '',
        callCharges: 0,
        internetCharges: 0,
        otherCharges: 0,
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
    
    if (selectedFile.size === 0) {
      toast.error('The selected file is empty (0 bytes). Please select a valid file.');
      return;
    }

    setIsExtracting(true);
    
    try {
      // 1. Upload file first to get a URL (especially if needed for PDF processing or just storage)
      const formDataUpload = new FormData();
      formDataUpload.append('files', selectedFile);
      
      toast.loading('Uploading and processing...', { id: 'extraction' });
      const uploadRes = await api.uploadTelecom(formDataUpload);
      const fileUrl = uploadRes.fileUrl;
      
      // 2. Perform Extraction Client-side
      toast.loading('AI Extracting Data...', { id: 'extraction' });
      
      const fileData = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type;
      
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: fileData, mimeType: mimeType === "application/pdf" ? "application/pdf" : "image/jpeg" } },
            { text: `Extract all fields from this telecom/internet bill. 
            Return a JSON with:
            - customerName: name on bill
            - phoneNumber: mobile or landline number
            - accountNumber: customer account/relationship ID
            - billNumber: invoice/bill ID
            - billingDate: "YYYY-MM-DD"
            - dueDate: "YYYY-MM-DD"
            - amount: total amount due
            - operatorName: service provider. MUST BE ONE OF: [Airtel, Jio, BSNL, Vi (Vodafone Idea), Tata Play, Excitel, ACT Fiber]. If not matched, provide the name anyway.
            - billType: "Mobile", "Landline", or "Broadband"
            - billingPeriod: period mentioned in "Month-Year" format (e.g., March-2026). If it's a date range, derive the main month and year.
            - planName: current plan name
            - dataUsage: data used (e.g., 50GB)
            - callCharges: cost of calls
            - internetCharges: cost of data/broadband
            - otherCharges: misc taxes or penalties
            ` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              customerName: { type: Type.STRING },
              phoneNumber: { type: Type.STRING },
              accountNumber: { type: Type.STRING },
              billNumber: { type: Type.STRING },
              billingDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
              dueDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
              billingPeriod: { type: Type.STRING, description: "Format: Month-Year, e.g. March-2026" },
              amount: { type: Type.NUMBER },
              operatorName: { type: Type.STRING },
              billType: { type: Type.STRING },
              planName: { type: Type.STRING },
              dataUsage: { type: Type.STRING },
              callCharges: { type: Type.NUMBER },
              internetCharges: { type: Type.NUMBER },
              otherCharges: { type: Type.NUMBER },
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
      
      // Map extracted data to form data
      const matchedOperator = operators.find(o => 
        extractedData.operatorName?.toLowerCase().includes(o.toLowerCase()) || 
        o.toLowerCase().includes(extractedData.operatorName?.toLowerCase())
      );

      const bDate = extractedData.billDate || extractedData.billingDate ? new Date(extractedData.billDate || extractedData.billingDate) : new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const defaultPeriod = !isNaN(bDate.getTime()) ? `${monthNames[bDate.getMonth()]}-${bDate.getFullYear()}` : "";

      const newFormData = {
        ...formData,
        customerName: extractedData.customerName || '',
        phoneNumber: extractedData.phoneNumber || extractedData.accountNumber || '',
        accountNumber: extractedData.accountNumber || '',
        billNumber: extractedData.billNumber || `TEL-${Date.now().toString().slice(-6)}`,
        billDate: extractedData.billDate || extractedData.billingDate || new Date().toISOString().split('T')[0],
        dueDate: extractedData.dueDate || new Date().toISOString().split('T')[0],
        billingPeriod: extractedData.billingPeriod || defaultPeriod,
        amount: extractedData.amount || 0,
        operatorName: matchedOperator || (extractedData.operatorName ? 'Others' : ''),
        customOperatorName: matchedOperator ? '' : (extractedData.operatorName || ''),
        billType: (extractedData.billType as any) || 'Mobile',
        planName: extractedData.planName || '',
        dataUsage: extractedData.dataUsage || '',
        callCharges: extractedData.callCharges || 0,
        internetCharges: extractedData.internetCharges || 0,
        otherCharges: extractedData.otherCharges || 0,
        propertyName: extractedData.customerName || '',
        fileUrl: fileUrl
      };

      setFormData(newFormData);

      // Proactive Duplicate Check
      const checkPayload = {
        utilityType: 'Telecom',
        phoneNumber: newFormData.phoneNumber,
        billingPeriod: newFormData.billingPeriod,
        year: newFormData.billDate?.split('-')[0] || new Date().getFullYear().toString()
      };

      if (checkPayload.phoneNumber && checkPayload.billingPeriod) {
        const dupCheck = await api.checkDuplicate(checkPayload);
        if (dupCheck.duplicate) {
          toast.error("This bill is already filled in the list, kindly check.", { 
            duration: 6000,
            icon: '⚠️'
          });
        }
      }

      toast.success('Data extracted successfully', { id: 'extraction' });
      setView('form');
    } catch (err: any) {
      console.error('Extraction error:', err);
      toast.error(`Extraction failed: ${err.message || 'Unknown error'}`, { id: 'extraction' });
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

    setIsLoading(true);
    try {
      // Duplicate check before save
      const year = formData.billDate ? new Date(formData.billDate).getFullYear().toString() : new Date().getFullYear().toString();
      const dupCheck = await api.checkDuplicate({
        utilityType: 'Telecom',
        phoneNumber: formData.phoneNumber,
        billingPeriod: formData.billingPeriod,
        year: year,
        id: formData.id || (formData as any)._id
      });

      if (dupCheck.duplicate) {
        toast.error("This bill is already filled in the list, kindly check.", {
          icon: '🚫'
        });
        setIsLoading(false);
        return;
      }

      let fileUrl = formData.fileUrl || '';
      if (selectedFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('files', selectedFile);
        // Use the new telecom upload endpoint to stay consistent with user request
        const uploadRes = await api.uploadTelecom(formDataUpload);
        fileUrl = uploadRes.fileUrl;
      }

      const isUpdate = !!(formData.id || formData._id);
      const bDate = formData.billDate ? new Date(formData.billDate) : new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthStr = monthNames[bDate.getMonth()];
      const yearStr = bDate.getFullYear().toString();

      const billToSave: Partial<Bill> = {
        ...formData,
        category: 'telecom' as const,
        subcategory: formData.billType?.toLowerCase() || 'mobile',
        month: monthStr,
        year: yearStr,
        propertyName: formData.propertyName === 'Others' ? formData.customPropertyName : formData.propertyName,
        companyName: formData.companyName === 'Others' ? formData.customCompanyName : formData.companyName,
        operatorName: formData.operatorName === 'Others' ? formData.customOperatorName : formData.operatorName,
        fileUrl,
        submissionDateTime: formData.submissionDateTime || new Date().toISOString(),
        billId: formData.billId || formData.billNumber || `TEL-${Date.now().toString().slice(-6)}`,
        attachments: fileUrl 
          ? [{ url: fileUrl, name: selectedFile?.name || 'Bill', type: selectedFile?.type || 'image/jpeg' }] 
          : (formData.attachments || [])
      };

      await api.saveBill(billToSave as Bill);
      toast.success(isUpdate ? 'Telecom bill updated successfully!' : 'Telecom bill saved successfully!');
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

  const hasPermission = (action: 'view' | 'add' | 'edit' | 'delete' | 'approve') => {
    if (user?.role === 'ADMIN') return true;
    if (user?.permissions && user.permissions.telecom) {
      return user.permissions.telecom[action];
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
  const canDownload = user?.role !== 'ACCOUNT_MANAGEMENT';
  const canPay = user?.role === 'ADMIN' || user?.role === 'ACCOUNT_MANAGER';
  const canInitiatePayment = user?.role === 'ADMIN' || user?.role === 'ACCOUNT_MANAGEMENT';
  const canConfirmPayment = user?.role === 'ADMIN' || user?.role === 'ACCOUNT_MANAGER';

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2 transition-colors">
            <Smartphone className="w-8 h-8 text-orange-600" />
            Telecom Module
          </h1>
          <p className="text-text-secondary mt-1 transition-colors">Manage Mobile, Landline and Broadband bills</p>
        </div>
        
        <div className="flex items-center gap-3">
          {view !== 'list' && (
            <button 
              onClick={() => setView('list')}
              className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </button>
          )}
          {canAdd && (
            <button 
              onClick={() => {
                setFormData({
                  utilityType: 'Telecom',
                  status: 'Pending',
                  priority: 'Normal',
                  amount: 0,
                  propertyName: '',
                  companyName: '',
                  operatorName: '',
                  billType: 'Mobile',
                  phoneNumber: '',
                  accountNumber: '',
                  billDate: new Date().toISOString().split('T')[0],
                  dueDate: new Date().toISOString().split('T')[0],
                  billingPeriod: '',
                  planName: '',
                  dataUsage: '',
                  callCharges: 0,
                  internetCharges: 0,
                  otherCharges: 0,
                });
                setSelectedFile(null);
                setPreviewUrl(null);
                setView('upload');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Upload Bill
            </button>
          )}
        </div>
      </div>

      {view === 'list' && (
        <div className="space-y-6">
          {/* Quick Stats & Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div 
              onClick={() => setFilters({ ...filters, status: '' })}
              className={cn(
                "p-4 sm:p-6 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md",
                filters.status === '' 
                  ? "bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-500/30 ring-2 ring-orange-100 dark:ring-orange-500/10 shadow-orange-100" 
                  : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest transition-colors">Total Bills</p>
                <History className="w-4 h-4 text-text-secondary transition-colors" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-text-primary transition-colors">{bills.length}</h2>
            </div>

            <div 
              onClick={() => setFilters({ ...filters, status: 'Pending' })}
              className={cn(
                "p-4 sm:p-6 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md",
                filters.status === 'Pending' 
                  ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-500/30 ring-2 ring-orange-100 dark:ring-orange-500/10 shadow-orange-100" 
                  : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest transition-colors">Pending Bills</p>
                <AlertCircle className="w-4 h-4 text-orange-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-orange-500 transition-colors">
                {bills.filter(b => b.status === 'Pending' || b.status === 'PENDING').length}
              </h2>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1 transition-colors">Active Connections</p>
              <h2 className="text-xl sm:text-2xl font-black text-blue-500 transition-colors">
                {new Set(bills.map(b => b.consumerNumber)).size} Lines
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-2">
            <button
              onClick={() => setFilters({ ...filters, status: '' })}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                filters.status === '' 
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-200" 
                  : "bg-white dark:bg-slate-900 text-text-secondary border border-gray-100 dark:border-slate-800 hover:bg-gray-50 uppercase tracking-widest"
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
                      : "bg-white dark:bg-slate-900 text-text-secondary border border-gray-100 dark:border-slate-800 hover:bg-gray-50 uppercase tracking-widest"
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

          {/* Filters Bar */}
          <Filters 
            filters={filters}
            setFilters={setFilters}
            properties={Array.from(new Set(projects.map(p => p.name)))}
            options={{
              operators: operators,
              billTypes: ["Mobile", "Landline", "Broadband"]
            }}
          />

          {/* Bills List */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                    <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Bill Details</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Operator / Account</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Phone / Period</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Due Date</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Amount</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 transition-colors">
                  {isLoading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Skeleton variant="card" className="w-10 h-10 rounded-xl" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="py-4 px-6">
                          <Skeleton className="h-5 w-16" />
                        </td>
                        <td className="py-4 px-6">
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </td>
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
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <History className="w-12 h-12 text-text-secondary opacity-30 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-text-primary">No bills found</h3>
                        <p className="text-text-secondary">Upload a new telecom bill to get started.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((bill) => (
                      <tr key={bill._id || bill.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-all">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                              bill.billType === 'Mobile' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-500" :
                              bill.billType === 'Broadband' ? "bg-purple-50 dark:bg-purple-900/20 text-purple-500" :
                              "bg-green-50 dark:bg-green-900/20 text-green-500"
                            )}>
                              {bill.billType === 'Mobile' ? (
                                <Smartphone className="w-5 h-5" />
                              ) : bill.billType === 'Broadband' ? (
                                <Wifi className="w-5 h-5" />
                              ) : (
                                <Phone className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-text-primary transition-colors">{bill.propertyName}</p>
                              <p className="text-[10px] text-text-secondary font-medium transition-colors">{bill.billId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm font-bold text-text-primary transition-colors">{bill.operatorName}</p>
                          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest transition-colors">{bill.billType || 'Telecom'}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm font-bold text-text-primary transition-colors">{bill.phoneNumber || bill.accountNumber}</p>
                          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest transition-colors">{bill.billingPeriod || 'N/A'}</p>
                        </td>
                        <td className="py-4 px-6 text-sm font-medium text-text-secondary transition-colors">
                          <div className={cn(
                            "transition-colors font-bold",
                            new Date(bill.dueDate) < new Date() && bill.status !== 'Paid' ? "text-red-500" : "text-text-secondary"
                          )}>
                            {bill.dueDate}
                          </div>
                          {bill.submissionDateTime && (
                            <div className="text-[10px] text-orange-500 font-bold mt-1">
                              Submitted: {new Date(bill.submissionDateTime).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                           <p className="text-sm font-black text-text-primary transition-colors">
                            ₹{bill.amount.toLocaleString()}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors",
                            bill.status === 'Paid' ? "bg-green-100 dark:bg-emerald-900/30 text-green-700 dark:text-emerald-400" :
                            bill.status === 'Overdue' ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                            "bg-orange-100 dark:bg-amber-900/30 text-orange-700 dark:text-amber-400"
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
                                onClick={() => handleEdit(bill)}
                                className="p-2 text-text-secondary hover:text-blue-500 transition-colors"
                                title="Edit Bill"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button 
                                onClick={() => handleDelete(bill.id || bill._id!)}
                                className="p-2 text-text-secondary hover:text-red-500 transition-colors"
                                title="Delete Bill"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            {canDownload && (bill.fileUrl || (bill.attachments && bill.attachments.length > 0)) && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const url = bill.fileUrl || (bill.attachments && bill.attachments[0].url);
                                  if (url) {
                                    downloadFile(url, `${bill.billNumber}_telecom.pdf`);
                                  }
                                }}
                                className="p-2 text-text-secondary hover:text-green-500 transition-colors"
                                title="Download Bill"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            {bill.status !== 'Paid' && canPay && (
                              <button
                                onClick={() => {
                                  setSelectedBillForDetails(bill);
                                  setIsPaymentModalOpen(true);
                                }}
                                className="px-3 py-1 bg-orange-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
                              >
                                Pay Now
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

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-slate-800 transition-colors">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Skeleton variant="card" className="w-10 h-10 rounded-xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-24" /></div>
                      <div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-24" /></div>
                    </div>
                  </div>
                ))
              ) : filteredBills.length === 0 ? (
                <div className="px-6 py-12 text-center transition-colors">
                  <History className="w-12 h-12 text-text-secondary opacity-30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary">No bills found</h3>
                  <p className="text-text-secondary text-sm">Upload a new telecom bill to get started.</p>
                </div>
              ) : (
                filteredBills.map((bill) => (
                  <div key={bill._id || bill.id} className="p-4 space-y-4 hover:bg-gray-50/30 dark:hover:bg-slate-800/10 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0",
                          bill.billType === 'Mobile' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-500" :
                          bill.billType === 'Broadband' ? "bg-purple-50 dark:bg-purple-900/20 text-purple-500" :
                          "bg-green-50 dark:bg-green-900/20 text-green-500"
                        )}>
                          {bill.billType === 'Mobile' ? (
                            <Smartphone className="w-5 h-5" />
                          ) : bill.billType === 'Broadband' ? (
                            <Wifi className="w-5 h-5" />
                          ) : (
                            <Phone className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text-primary truncate transition-colors">{bill.propertyName}</p>
                          <p className="text-[10px] text-text-secondary font-medium transition-colors">{bill.billId}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors self-start",
                        bill.status === 'Paid' ? "bg-green-100 dark:bg-emerald-900/30 text-green-700 dark:text-emerald-400" :
                        bill.status === 'Overdue' ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                        "bg-orange-100 dark:bg-amber-900/30 text-orange-700 dark:text-amber-400"
                      )}>
                        {bill.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest transition-colors">Operator / Type</p>
                        <p className="text-xs font-bold text-text-primary transition-colors">{bill.operatorName}</p>
                        <p className="text-[10px] text-text-secondary font-medium uppercase tracking-tight transition-colors">{bill.billType || 'Telecom'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest transition-colors">Phone / Account</p>
                        <p className="text-xs font-bold text-text-primary transition-colors">{bill.phoneNumber || bill.accountNumber}</p>
                        <p className="text-[10px] text-text-secondary font-medium transition-colors">{bill.billingPeriod || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest transition-colors mb-1">Due Date</p>
                        <p className={cn(
                          "text-xs font-bold transition-colors",
                          new Date(bill.dueDate) < new Date() && bill.status !== 'Paid' ? "text-red-500" : "text-text-primary"
                        )}>
                          {bill.dueDate}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Amount</p>
                        <p className="text-sm font-black text-text-primary transition-colors">₹{bill.amount.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-slate-800 transition-colors">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            setSelectedBillForDetails(bill);
                            setIsDetailsModalOpen(true);
                          }}
                          className="p-2 text-text-secondary hover:text-orange-500 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button 
                            onClick={() => handleEdit(bill)}
                            className="p-2 text-text-secondary hover:text-blue-500 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDownload && (bill.fileUrl || (bill.attachments && bill.attachments.length > 0)) && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = bill.fileUrl || (bill.attachments && bill.attachments[0].url);
                              if (url) {
                                downloadFile(url, `${bill.billNumber}_telecom.pdf`);
                              }
                            }}
                            className="p-2 text-text-secondary hover:text-green-500 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {bill.status !== 'Paid' && canPay && (
                        <button
                          onClick={() => {
                            setSelectedBillForDetails(bill);
                            setIsPaymentModalOpen(true);
                          }}
                          className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
                        >
                          Pay Now
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}      {view === 'upload' && (
        <motion.div 
          key="upload"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="max-w-2xl mx-auto py-6 sm:py-12"
        >
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-12 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800 flex flex-col items-center text-center space-y-6 transition-colors">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-50 dark:bg-orange-900/20 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-colors">
              <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600 dark:text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-text-primary transition-colors">Upload Telecom Bill</h2>
              <p className="text-text-secondary mt-2 text-sm transition-colors px-2">Upload PDF or Image. Our AI will automatically extract all bill details including amount, operator, and due date.</p>
            </div>

            <input 
              type="file" 
              id="file-upload"
              hidden
              onChange={handleFileChange}
              accept="application/pdf,image/*"
            />
            <label 
              htmlFor="file-upload"
              className="w-full sm:w-auto px-8 py-3 bg-orange-600 text-white rounded-xl font-bold cursor-pointer hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 text-center"
            >
              Choose File
            </label>

            {selectedFile && (
              <div className="w-full p-3 sm:p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm shrink-0 transition-colors">
                    <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate max-w-[150px] sm:max-w-[200px] transition-colors">{selectedFile.name}</p>
                    <p className="text-[10px] text-text-secondary font-bold transition-colors">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={handleExtract}
                  disabled={isExtracting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-colors"
                >
                  {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                  {isExtracting ? 'Extracting...' : 'Extract Data'}
                </button>
              </div>
            )}

            <button onClick={() => setView('list')} className="text-text-secondary text-xs font-bold uppercase tracking-widest hover:text-text-primary transition-colors">Cancel</button>
          </div>
        </motion.div>
      )}      {view === 'form' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8"
        >
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col transition-colors order-2 lg:order-1">
            <div className="p-5 sm:p-8 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
              <div>
                <h2 className="text-xl font-black text-text-primary transition-colors">Verify Telecom Bill</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 dark:bg-emerald-900/20 text-green-700 dark:text-emerald-400 border border-green-100 dark:border-emerald-900/30 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors">
                    <CheckCircle2 className="w-3 h-3" />
                    AI Extracted
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-8 space-y-8 flex-1">
              {/* Core Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="min-w-0">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block transition-colors">Property Name / Project *</label>
                  <div className="relative">
                    <select 
                      value={formData.propertyName}
                      onChange={(e) => setFormData({...formData, propertyName: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 appearance-none cursor-pointer pr-10 transition-colors"
                      required
                    >
                      <option value="" className="bg-white dark:bg-slate-900">Select Property</option>
                      {projects.map(p => (
                        <option key={p._id || p.id} value={p.name} className="bg-white dark:bg-slate-900">{p.name}</option>
                      ))}
                      <option value="Others" className="bg-white dark:bg-slate-900">Others (Type Below)</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                  {formData.propertyName === 'Others' && (
                    <input 
                      type="text"
                      value={formData.customPropertyName || ''}
                      onChange={(e) => setFormData({...formData, customPropertyName: e.target.value})}
                      placeholder="Enter Custom Property Name"
                      className="mt-3 w-full px-4 py-3 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/50 rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-2 focus:ring-orange-500/20 transition-colors"
                      required
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block transition-colors">Company Name *</label>
                  <div className="relative">
                    <select 
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 appearance-none cursor-pointer pr-10 transition-colors"
                      required
                    >
                      <option value="" className="bg-white dark:bg-slate-900">Select Company</option>
                      {companies.map(c => (
                        <option key={c} value={c} className="bg-white dark:bg-slate-900">{c}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                  {formData.companyName === 'Others' && (
                    <input 
                      type="text"
                      value={formData.customCompanyName || ''}
                      onChange={(e) => setFormData({...formData, customCompanyName: e.target.value})}
                      placeholder="Enter Custom Company Name"
                      className="mt-3 w-full px-4 py-3 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/50 rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-2 focus:ring-orange-500/20 transition-colors"
                      required
                    />
                  )}
                </div>
              </div>

              {/* Operator & Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="min-w-0">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block transition-colors">Operator Name *</label>
                  <div className="relative">
                    <select 
                      value={formData.operatorName}
                      onChange={(e) => setFormData({...formData, operatorName: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 appearance-none cursor-pointer pr-10 transition-colors"
                      required
                    >
                      <option value="" className="bg-white dark:bg-slate-900">Select Operator</option>
                      {operators.map(o => (
                        <option key={o} value={o} className="bg-white dark:bg-slate-900">{o}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                  {formData.operatorName === 'Others' && (
                    <input 
                      type="text"
                      value={formData.customOperatorName || ''}
                      onChange={(e) => setFormData({...formData, customOperatorName: e.target.value})}
                      placeholder="Enter Custom Operator Name"
                      className="mt-3 w-full px-4 py-3 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/50 rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-2 focus:ring-orange-500/20 transition-colors"
                      required
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block transition-colors">Bill Type *</label>
                  <div className="relative">
                    <select 
                      value={formData.billType}
                      onChange={(e) => setFormData({...formData, billType: e.target.value as any})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 appearance-none cursor-pointer pr-10 transition-colors"
                      required
                    >
                      <option value="Mobile" className="bg-white dark:bg-slate-900">Mobile</option>
                      <option value="Landline" className="bg-white dark:bg-slate-900">Landline</option>
                      <option value="Broadband" className="bg-white dark:bg-slate-900">Broadband</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block transition-colors">Phone / Account No *</label>
                  <input 
                    type="text"
                    value={formData.phoneNumber || formData.accountNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                    placeholder="Enter number..."
                    required
                  />
                </div>
              </div>

              {/* Billing Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-8">
                <div className="min-w-0">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block transition-colors">Bill Date</label>
                  <input 
                    type="date"
                    value={formData.billDate}
                    onChange={(e) => setFormData({...formData, billDate: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                  />
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block transition-colors">Billing Period</label>
                  <input 
                    type="text"
                    value={formData.billingPeriod || ''}
                    onChange={(e) => setFormData({...formData, billingPeriod: e.target.value})}
                    placeholder="e.g. March-2026"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block transition-colors">Due Date</label>
                  <input 
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-text-primary outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                  />
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block transition-colors">Status *</label>
                  <div className="relative">
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
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

              {/* Advanced Breakup */}
              <div className="bg-orange-50/50 dark:bg-orange-900/10 p-5 sm:p-6 rounded-2xl border border-orange-100/50 dark:border-orange-900/30 transition-colors">
                <h3 className="text-[10px] font-black text-orange-900 dark:text-orange-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2 transition-colors">
                  <Info className="w-3 h-3 text-orange-500" />
                  Detailed Billing Breakup
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-widest mb-2 block transition-colors">Plan Name</label>
                    <input 
                      type="text"
                      value={formData.planName}
                      onChange={(e) => setFormData({...formData, planName: e.target.value})}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-orange-100 dark:border-orange-900/50 rounded-xl text-sm text-text-primary transition-colors focus:ring-1 focus:ring-orange-500 outline-none"
                      placeholder="Fiber Premium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-widest mb-2 block transition-colors">Data Usage</label>
                    <input 
                      type="text"
                      value={formData.dataUsage}
                      onChange={(e) => setFormData({...formData, dataUsage: e.target.value})}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-orange-100 dark:border-orange-900/50 rounded-xl text-sm text-text-primary transition-colors focus:ring-1 focus:ring-orange-500 outline-none"
                      placeholder="1.2 TB"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-widest mb-2 block transition-colors">Call Charges</label>
                    <input 
                      type="number"
                      value={formData.callCharges}
                      onChange={(e) => setFormData({...formData, callCharges: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-orange-100 dark:border-orange-900/50 rounded-xl text-sm font-medium text-text-primary transition-colors focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-widest mb-2 block transition-colors">Internet Charges</label>
                    <input 
                      type="number"
                      value={formData.internetCharges}
                      onChange={(e) => setFormData({...formData, internetCharges: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-orange-100 dark:border-orange-900/50 rounded-xl text-sm font-medium text-text-primary transition-colors focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-widest mb-2 block transition-colors">Other Charges</label>
                    <input 
                      type="number"
                      value={formData.otherCharges}
                      onChange={(e) => setFormData({...formData, otherCharges: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-orange-100 dark:border-orange-900/50 rounded-xl text-sm font-medium text-text-primary transition-colors focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block transition-colors">Total Amount (Inc. GST) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-900 dark:text-orange-400 font-bold transition-colors">₹</span>
                  <input 
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                    className="w-full pl-8 pr-4 py-4 bg-orange-600 text-white border-none rounded-2xl text-xl sm:text-2xl font-black outline-none focus:ring-2 focus:ring-orange-400/50 transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-8 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 transition-colors">
              <button 
                type="button" 
                onClick={() => setView('upload')}
                className="w-full sm:w-auto px-6 py-2.5 text-text-secondary dark:text-gray-400 font-bold uppercase tracking-widest text-[11px] hover:text-text-primary transition-colors order-2 sm:order-1"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={cn(
                  "w-full sm:w-auto px-8 py-3 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-[13px] flex items-center justify-center gap-2 shadow-xl shadow-orange-200 hover:bg-orange-700 transition-all order-1 sm:order-2",
                  isLoading && "opacity-70 cursor-not-allowed"
                )}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Telecom Bill
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Preview Section */}
          <div className="space-y-4 order-1 lg:order-2">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm h-[400px] sm:h-[600px] lg:h-[800px] overflow-hidden flex flex-col transition-colors">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-bold text-text-primary flex items-center gap-2 transition-colors">
                  <Eye className="w-4 h-4 text-orange-600" />
                  Document Preview
                </h3>
                <div className="flex items-center gap-3">
                  <label 
                    htmlFor="replace-file-input"
                    className="text-orange-600 dark:text-orange-400 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    Replace File
                  </label>
                  <input 
                    type="file" 
                    id="replace-file-input"
                    hidden
                    onChange={handleFileChange}
                    accept="application/pdf,image/*"
                  />
                  {previewUrl && canDownload && (
                    <button 
                      onClick={() => downloadFile(previewUrl, selectedFile?.name || 'telecom_bill.pdf')}
                      className="text-orange-600 dark:text-orange-400 text-xs font-bold hover:underline flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  )}
                  <button 
                    onClick={() => window.open(previewUrl!, '_blank')}
                    className="text-orange-600 dark:text-orange-400 text-xs font-bold hover:underline flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-gray-100 dark:bg-slate-800/50 rounded-2xl overflow-hidden shadow-inner border border-gray-200 dark:border-slate-700 transition-colors">
                {selectedFile?.type === 'application/pdf' || (formData.fileUrl?.toLowerCase().endsWith('.pdf')) ? (
                  <PdfViewer file={previewUrl!} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-4">
                     <img 
                      src={previewUrl!} 
                      alt="Bill Preview" 
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      referrerPolicy="no-referrer"
                     />
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Modals */}
      {isDetailsModalOpen && selectedBillForDetails && (
        <BillDetailsDrawer 
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedBillForDetails(null);
            fetchData();
          }}
          bill={selectedBillForDetails}
          onEdit={(bill) => {
            setIsDetailsModalOpen(false);
            setFormData(bill as any);
            setSelectedFile(null);
            setView('form');
          }}
          onMarkPaid={(bill) => {
            setIsDetailsModalOpen(false);
            setSelectedBillForDetails(bill);
            setIsPaymentModalOpen(true);
          }}
          onDelete={handleDelete}
          onVerify={(bill) => {
            setSelectedBillForDetails(bill);
            setWorkflowActionType('verify');
            setWorkflowActionTitle('Verify Telecom Bill');
            setIsVerificationModalOpen(true);
          }}
          onApprove={(bill) => {
            setSelectedBillForDetails(bill);
            setWorkflowActionType('approve');
            setWorkflowActionTitle('Approve Telecom Bill');
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
      )}

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

      {isPaymentModalOpen && selectedBillForDetails && (
        <PaymentModal 
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedBillForDetails(null);
          }}
          bill={selectedBillForDetails}
          onPaymentSuccess={async (updatedBill) => {
            try {
              await api.saveBill(updatedBill);
              toast.success('Payment recorded successfully');
              fetchData();
              setSelectedBillForDetails(null);
            } catch (err) {
              toast.error('Failed to save payment record');
              throw err;
            }
          }}
        />
      )}

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Delete Telecom Bill"
        message="Are you sure you want to remove this telecom bill record? This action cannot be undone."
      />
    </div>
  );
};
