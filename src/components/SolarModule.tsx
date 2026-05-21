import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sun, 
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
  TrendingUp,
  X,
  Trash2,
  ShieldCheck,
  CreditCard,
  CheckSquare,
  Zap,
  Building,
  Building2,
  Globe,
  Phone,
  Wifi,
  User,
  Hash,
  Calendar,
  Clock,
  Edit2,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { Bill, Project, WORKFLOW_STATUSES, ModuleProps, Company } from '../types';
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
import { TallyEntryForm } from './TallyEntryForm';
import { Skeleton } from './ui/Skeleton';

const ReadOnlyField = ({ label, value, icon: Icon }: { label: string, value: string | number | undefined, icon: any }) => (
  <div className="group transition-all">
    <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5 block transition-colors">{label}</label>
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-slate-800 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-slate-800/50 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-all">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-bold text-gray-700 dark:text-slate-200 truncate transition-colors">{value || 'Not specified'}</span>
    </div>
  </div>
);

export const SolarModule: React.FC<ModuleProps> = ({ projects: propsProjects, isLoadingProjects, allBills: propsBills }) => {
  const { user } = useAuth();
  
  const normalizeBills = (bills_to_normalize: Bill[]) => {
    return bills_to_normalize.map(b => ({
      ...b,
      id: b.id || (b as any)._id,
      propertyName: b.propertyName || b.project_name || '',
      companyName: b.companyName || b.company_name || '',
      dueDate: b.dueDate || b.due_date || '',
      billNumber: b.billNumber || b.bill_number || '',
      billDate: b.billDate || b.bill_date || '',
      status: b.status || 'Pending',
      amount: b.amount || (b as any).total_amount || 0
    }));
  };

  const initialBills = useMemo(() => 
    propsBills ? normalizeBills(propsBills.filter(b => b.utilityType === 'Solar Bill')) : [], 
    [propsBills]
  );

  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [projects, setProjects] = useState<Project[]>(propsProjects || []);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(!propsBills || !propsProjects);
  const [isExtracting, setIsExtracting] = useState(false);
  const extractionAbortController = React.useRef<AbortController | null>(null);
  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);
  const [selectedBillForTally, setSelectedBillForTally] = useState<Bill | null>(null);
  const [view, setView] = useState<'list' | 'upload' | 'form'>('list');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    property: '',
    status: '',
    company: '',
    date: '',
    startDate: '',
    endDate: '',
    operator: '', 
    billType: '',
    month: '',
    year: ''
  });
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<Bill | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [workflowActionType, setWorkflowActionType] = useState<'verify' | 'approve' | 'initiate' | 'confirm' | 'tally'>('verify');
  const [workflowActionTitle, setWorkflowActionTitle] = useState('');
  const [duplicateFound, setDuplicateFound] = useState<boolean>(false);
  const [duplicateMessage, setDuplicateMessage] = useState<string>('');
  
  const [formData, setFormData] = useState<Partial<Bill>>({
    utilityType: 'Solar Bill',
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
    kwhImportUnits: 0,
    kwhExportUnits: 0,
    netUnits: 0,
    solarGenerationUnits: 0,
    exportAdjustment: 0,
    netBillPayable: 0,
    previousReading: 0,
    currentReading: 0,
    billingDemand: 0,
    maxDemand: 0,
    energyCharges: 0,
    electricityDuty: 0,
    fixedCharges: 0,
    rebate: 0,
    surcharge: 0,
    notes: '',
    reminderDays: 3,
    reminderDate: '',
  });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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

  // Real-time duplicate check
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const performCheck = async () => {
      if (view === 'form' && formData.consumerNumber && formData.billDate) {
        try {
          const bDate = new Date(formData.billDate);
          const month = monthNames[bDate.getMonth()];
          const year = bDate.getFullYear().toString();

          const res = await api.checkDuplicate({
            ...formData,
            utilityType: 'Solar Bill',
            month,
            year,
            id: formData.id || (formData as any)._id
          });
          setDuplicateFound(res.duplicate);
          setDuplicateMessage(res.message || '');
        } catch (err) {
          console.error("Duplicate check error:", err);
        }
      } else {
        setDuplicateFound(false);
        setDuplicateMessage('');
      }
    };

    if (view === 'form') {
      timeoutId = setTimeout(performCheck, 500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [formData.consumerNumber, formData.billDate, view, monthNames]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => (currentYear - 5 + i).toString());

  const properties = useMemo(() => 
    Array.from(new Set(projects.map(p => p.name))),
    [projects]
  );

  useEffect(() => {
    if (propsBills) {
      setBills(normalizeBills(propsBills.filter(b => b.utilityType === 'Solar Bill')));
    }
  }, [propsBills]);

  useEffect(() => {
    if (propsProjects) {
      setProjects(propsProjects);
    }
  }, [propsProjects]);

  useEffect(() => {
    fetchCompanies();
    if (!propsBills || !propsProjects) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [propsBills, propsProjects]);

  const fetchCompanies = async () => {
    try {
      const data = await api.getCompanies();
      setCompanies(data.filter(c => c.status === 'Active'));
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  };

  const activeCompanyNames = useMemo(() => companies.map(c => c.companyName), [companies]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allBills, fetchedProjects] = await Promise.all([
        api.getBills(),
        !propsProjects ? api.getProjects() : Promise.resolve(propsProjects)
      ]);
      setBills(normalizeBills(allBills.filter(b => b.utilityType === 'Solar Bill')));
      if (!propsProjects) {
        setProjects(fetchedProjects);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (bill: Bill) => {
    const normalizedBill = {
      ...bill,
      id: bill.id || (bill as any)._id,
      propertyName: bill.propertyName || bill.project_name || '',
      companyName: bill.companyName || bill.company_name || '',
      status: bill.status || 'Pending',
      dueDate: bill.dueDate || bill.due_date || '',
      billDate: bill.billDate || bill.bill_date || '',
      billNumber: bill.billNumber || bill.bill_number || '',
      amount: bill.amount || (bill as any).total_amount || 0
    };
    setFormData(normalizedBill as any);
    const url = bill.fileUrl || (bill.attachments && bill.attachments[0]?.url) || null;
    setPreviewUrl(url);
    setView('form');
  };

  const filteredBills = bills.filter(bill => {
    const matchesProject = !filters.property || bill.propertyName === filters.property;
    const matchesCompany = !filters.company || bill.companyName === filters.company;
    
    let matchesStatus = true;
    if (filters.status === 'IN_PROGRESS') {
      matchesStatus = !['Payment Confirmed', 'Tally Entry', 'Paid'].includes(bill.status || '');
    } else if (filters.status === 'COMPLETED') {
      matchesStatus = ['Payment Confirmed', 'Tally Entry', 'Paid'].includes(bill.status || '');
    } else if (filters.status) {
      matchesStatus = bill.status === filters.status;
    }

    // Month & Year filtering
    const bDate = bill.billDate ? new Date(bill.billDate) : null;
    const billMonth = bDate && !isNaN(bDate.getTime()) ? monthNames[bDate.getMonth()] : bill.month;
    const billYear = bDate && !isNaN(bDate.getTime()) ? bDate.getFullYear().toString() : bill.year;
    
    const matchesMonth = !filters.month || billMonth === filters.month;
    const matchesYear = !filters.year || billYear === filters.year;
    
    const matchesDate = (!filters.startDate || (bill.billDate && bill.billDate >= filters.startDate)) && 
                       (!filters.endDate || (bill.billDate && bill.billDate <= filters.endDate));

    const matchesSearch = !filters.search || 
      bill.propertyName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.customerName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.consumerNumber?.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesProject && matchesCompany && matchesStatus && matchesSearch && matchesDate && matchesMonth && matchesYear;
  }).sort((a, b) => {
    const dateA = a.submissionDateTime || a.createdAt || '';
    const dateB = b.submissionDateTime || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  const handleDelete = (id: string | number) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteBill(itemToDelete, user ? { name: user.name, role: user.role } : undefined);
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

  const resetSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      resetSelection();
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setView('upload');
      
      setFormData({
        utilityType: 'Solar Bill',
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
    
    // Create new abort controller
    if (extractionAbortController.current) {
      extractionAbortController.current.abort();
    }
    extractionAbortController.current = new AbortController();
    const signal = extractionAbortController.current.signal;
    
    try {
      // 1. Upload file
      const formDataUpload = new FormData();
      formDataUpload.append('files', selectedFile);
      const uploadRes = await api.uploadSolar(formDataUpload, signal);
      
      if (signal.aborted) return;
      
      const fileUrl = uploadRes.fileUrl;

      // 2. Extract Client-side
      toast.loading('AI Extracting Solar Data...', { id: 'extraction' });
      
      const fileData = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type;
      
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: fileData, mimeType: mimeType === "application/pdf" ? "application/pdf" : "image/jpeg" } },
            { text: `Extract all details from this solar / net metering electricity bill.
            Return a JSON object with:
            - customerName: full name of consumer
            - consumerNumber: Consumer/Account ID number
            - billNumber: invoice/bill number
            - billingDate: "YYYY-MM-DD"
            - dueDate: "YYYY-MM-DD"
            - billingPeriod: period mentioned (e.g., April 2024)
            - totalUnits: total units consumed from grid (Import)
            - amount: net payable amount
            - meterNumber: meter ID
            - previousReading: previous billing cycle reading
            - currentReading: current cycle reading
            - billingDemand: sanctioned/contracted load/demand
            - maxDemand: maximum demand recorded
            - kwhImportUnits: power imported from grid
            - kwhExportUnits: solar power exported to grid
            - netUnits: difference between export and import (Import - Export)
            - solarGenerationUnits: total solar generation if mentioned
            - exportAdjustment: adjustment amount for exported power
            - energyCharges: charge for units consumed
            - electricityDuty: duty or tax
            - fixedCharges: monthly fixed charges
            - rebate: any credit or rebate
            - surcharge: any penalty or surcharge
            - serviceProvider: electricity board name
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
              meterNumber: { type: Type.STRING },
              previousReading: { type: Type.NUMBER },
              currentReading: { type: Type.NUMBER },
              billingDemand: { type: Type.NUMBER },
              maxDemand: { type: Type.NUMBER },
              kwhImportUnits: { type: Type.NUMBER },
              kwhExportUnits: { type: Type.NUMBER },
              netUnits: { type: Type.NUMBER },
              solarGenerationUnits: { type: Type.NUMBER },
              exportAdjustment: { type: Type.NUMBER },
              energyCharges: { type: Type.NUMBER },
              electricityDuty: { type: Type.NUMBER },
              fixedCharges: { type: Type.NUMBER },
              rebate: { type: Type.NUMBER },
              surcharge: { type: Type.NUMBER },
              serviceProvider: { type: Type.STRING }
            }
          }
        }
      });

      if (signal.aborted) return;

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
      
      setFormData(prev => {
        const newFormData = {
          ...prev,
          customerName: extractedData.customerName || '',
          consumerNumber: extractedData.consumerNumber || '',
          billNumber: extractedData.billNumber || '',
          meterNumber: extractedData.meterNumber || '',
          billDate: extractedData.billingDate || new Date().toISOString().split('T')[0],
          dueDate: extractedData.dueDate || new Date().toISOString().split('T')[0],
          billingPeriod: extractedData.billingPeriod || '',
          amount: extractedData.amount || 0,
          totalUnits: extractedData.totalUnits || extractedData.kwhImportUnits || 0,
          previousReading: extractedData.previousReading || 0,
          currentReading: extractedData.currentReading || 0,
          billingDemand: extractedData.billingDemand || 0,
          maxDemand: extractedData.maxDemand || 0,
          kwhImportUnits: extractedData.kwhImportUnits || extractedData.totalUnits || 0,
          kwhExportUnits: extractedData.kwhExportUnits || 0,
          netUnits: extractedData.netUnits || ((extractedData.kwhImportUnits || 0) - (extractedData.kwhExportUnits || 0)),
          solarGenerationUnits: extractedData.solarGenerationUnits || 0,
          exportAdjustment: extractedData.exportAdjustment || 0,
          energyCharges: extractedData.energyCharges || 0,
          electricityDuty: extractedData.electricityDuty || 0,
          fixedCharges: extractedData.fixedCharges || 0,
          rebate: extractedData.rebate || 0,
          surcharge: extractedData.surcharge || 0,
          netBillPayable: extractedData.amount || 0,
          serviceProvider: extractedData.serviceProvider || '',
          fileUrl: fileUrl
        };

        // Extract month/year from billDate for duplicate checking
        const bDate = new Date(newFormData.billDate);
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const month = monthNames[bDate.getMonth()];
        const year = bDate.getFullYear().toString();

        // Proactive Duplicate Check
        if (newFormData.consumerNumber) {
          api.checkDuplicate({
            utilityType: 'Solar Bill',
            consumerNumber: newFormData.consumerNumber,
            month: month,
            year: year
          }).then(dupCheck => {
            if (dupCheck.duplicate) {
              toast.error("This bill is already filled in the list, kindly check.", { 
                duration: 6000,
                icon: '⚠️'
              });
            }
          });
        }

        return newFormData;
      });

      toast.success('Solar data extracted successfully', { id: 'extraction' });
      setView('form');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Extraction aborted');
        return;
      }
      console.error('Extraction error:', err);
      toast.error(`Extraction failed: ${err.message}`, { id: 'extraction' });
    } finally {
      if (!signal.aborted) {
        setIsExtracting(false);
        extractionAbortController.current = null;
      }
    }
  };

  const handleRemoveFile = () => {
    if (extractionAbortController.current) {
      extractionAbortController.current.abort();
      extractionAbortController.current = null;
    }
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setIsExtracting(false);
    toast.dismiss('extraction');
    setFormData({
      utilityType: 'Solar Bill',
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
      reminderDays: 3,
      reminderDate: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyName || !formData.companyName || !formData.status) {
      toast.error('Project, Company and Status are required');
      return;
    }

    setIsLoading(true);
    try {
      // Duplicate check before save
      const bDate = formData.billDate ? new Date(formData.billDate) : new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const month = monthNames[bDate.getMonth()];
      const year = bDate.getFullYear().toString();

      const dupCheck = await api.checkDuplicate({
        utilityType: 'Solar Bill',
        consumerNumber: formData.consumerNumber,
        month: month,
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
        const uploadRes = await api.uploadFiles(formDataUpload);
        if (uploadRes.files && uploadRes.files.length > 0) {
          fileUrl = uploadRes.files[0].url;
        }
      }

      const isUpdate = !!(formData.id || formData._id);

      const billToSave: Partial<Bill> = {
        ...formData,
        category: 'utility' as const,
        subcategory: 'solar',
        month: month,
        year: year,
        propertyName: formData.propertyName === 'Others' ? formData.customPropertyName : formData.propertyName,
        companyName: formData.companyName === 'Others' ? formData.customCompanyName : formData.companyName,
        fileUrl,
        submissionDateTime: formData.submissionDateTime || new Date().toISOString(),
        billId: formData.billId || `SOLAR-${Date.now().toString().slice(-6)}`,
        attachments: fileUrl 
          ? [{ url: fileUrl, name: selectedFile?.name || 'Solar Bill', type: selectedFile?.type || 'image/jpeg' }] 
          : (formData.attachments || [])
      };

      await api.saveBill(billToSave as Bill, user ? { name: user.name, role: user.role } : undefined);
      toast.success(isUpdate ? 'Solar bill updated successfully!' : 'Solar bill saved successfully!');
      resetSelection();
      setView('list');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to save solar bill');
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (action: 'view' | 'add' | 'edit' | 'delete' | 'approve') => {
    if (user?.role === 'ADMIN') return true;
    if (user?.permissions && user.permissions.solar) {
      return user.permissions.solar[action];
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
  const canConfirmPayment = user?.role === 'ADMIN' || user?.role === 'ACCOUNT_MANAGEMENT';
  const canDownload = user?.role !== 'ACCOUNT_MANAGEMENT';

  return (
    <div className="p-0 space-y-6 max-w-full text-foreground transition-colors overflow-hidden no-scrollbar">
      {/* Hub Header - Only show in list view */}
      {view === 'list' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-t-[2rem] border-x border-t border-gray-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2 transition-colors">
              Solar Hub
              <div className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full cursor-help transition-all">
                <Sun className="w-5 h-5 text-orange-500" />
              </div>
            </h1>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3 w-full max-w-4xl">
            <div className="relative">
              <select 
                value={filters.year}
                onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer font-sans"
              >
                <option value="">All Years</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select 
                value={filters.month}
                onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
                className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer font-sans"
              >
                <option value="">All Months</option>
                {monthNames.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <button 
              onClick={() => {
                resetSelection();
                setView('upload');
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 font-sans"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div 
            key="list" 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-0"
          >
            <div className="bg-white dark:bg-slate-900 px-6 py-4 border-x border-gray-50 dark:border-slate-800 shadow-sm">
              <Filters 
                filters={filters}
                setFilters={setFilters}
                properties={properties}
                companies={activeCompanyNames}
                isLoading={isLoading || isLoadingProjects}
                data={bills}
                searchPlaceholder="Search by Consumer No. or Name..."
                countData={{
                  total: filteredBills.length,
                  totalAmount: filteredBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
                  inProgress: filteredBills.filter(b => !['Payment Confirmed', 'Tally Entry', 'Paid', 'Rejected'].includes(b.status || '')).length,
                  paid: filteredBills.filter(b => ['Payment Confirmed', 'Tally Entry', 'Paid'].includes(b.status || '')).length
                }}
                onCountClick={(type) => {
                  if (type === 'all') setFilters(prev => ({ ...prev, status: '' }));
                  if (type === 'count3') setFilters(prev => ({ ...prev, status: 'IN_PROGRESS' }));
                  if (type === 'count4') setFilters(prev => ({ ...prev, status: 'COMPLETED' }));
                }}
                options={{
                  count3Label: 'In Progress',
                  count4Label: 'Paid / Completed'
                }}
              />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-b-[2rem] border-x border-b border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-slate-800/30">
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800">S.No</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800">Project / Company</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800">Consumer / Bill</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-center">Import Unit</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-center">Export Unit</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-center">Net Units</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800">Bill Period</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-center">Due Date</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-center">Amount (₹)</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-center">Status</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800 transition-colors">
                    {isLoading ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={11} className="py-6 px-6"><div className="h-8 w-full bg-gray-50 dark:bg-slate-800/10 rounded"></div></td>
                        </tr>
                      ))
                    ) : filteredBills.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-32 text-center text-text-secondary transition-colors transition-colors">
                          <History className="w-12 h-12 opacity-10 mx-auto" />
                          <p className="font-bold text-lg mt-3">No solar records found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredBills.map((bill, index) => (
                        <tr key={bill._id || bill.id || `solar-bill-${index}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group transition-colors">
                          <td className="py-5 px-6">
                            <div className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-all shadow-sm",
                              index === 0 ? "bg-amber-100 text-amber-600 ring-2 ring-amber-50" :
                              index === 1 ? "bg-slate-100 text-slate-500 ring-2 ring-slate-50" :
                              index === 2 ? "bg-orange-100 text-orange-600 ring-2 ring-orange-50" :
                              "bg-gray-50 text-gray-400 group-hover:bg-white group-hover:text-blue-500"
                            )}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <p className="text-sm font-black text-gray-800 dark:text-white transition-colors">{bill.propertyName}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest transition-colors tracking-tighter mb-0.5">{bill.companyName}</p>
                          </td>
                          <td className="py-5 px-6">
                            <p className="text-sm font-mono font-bold text-gray-700 tracking-tighter transition-colors">{bill.consumerNumber || 'N/A'}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest transition-colors">{bill.serviceProvider}</p>
                          </td>
                          <td className="py-5 px-6 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-black text-gray-900 dark:text-white transition-colors">{bill.kwhImportUnits || 0}</span>
                              <span className="text-[9px] font-black uppercase tracking-tighter text-blue-500 transition-colors">Import</span>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-black text-gray-900 dark:text-white transition-colors">{bill.kwhExportUnits || 0}</span>
                              <span className="text-[9px] font-black uppercase tracking-tighter text-orange-500 transition-colors">Export</span>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-black text-gray-900 dark:text-white transition-colors">{bill.netUnits || 0}</span>
                              <span className="text-[9px] font-black uppercase tracking-tighter text-gray-400 transition-colors">Units</span>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                             <p className="text-sm font-bold text-gray-700 dark:text-slate-200 transition-colors">{bill.billingPeriod || 'N/A'}</p>
                          </td>
                          <td className="py-5 px-6 text-center">
                             <p className="text-sm font-bold text-gray-700 dark:text-slate-200 transition-colors">{bill.dueDate}</p>
                          </td>
                          <td className={cn(
                            "py-5 px-6 text-center text-base font-black tabular-nums tracking-tight transition-colors",
                            (bill.amount || 0) < 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                          )}>
                            ₹{bill.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-5 px-6 text-center">
                             <div className="flex justify-center">
                              <span className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors",
                                bill.status === 'Paid' || bill.status === 'Payment Confirmed' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30" : "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30"
                              )}>
                                <div className={cn("w-2 h-2 rounded-full", bill.status === 'Paid' || bill.status === 'Payment Confirmed' ? "bg-emerald-500" : "bg-orange-500")} />
                                {bill.status}
                              </span>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-right">
                            <div className="flex items-center justify-end gap-1 transition-all">
                              <button 
                                onClick={() => { setSelectedBillForDetails(bill); setIsDetailsModalOpen(true); }} 
                                className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                              >
                                <Eye className="w-4 h-4 transition-colors" />
                              </button>
                              
                              {canEdit && (
                                <button 
                                  onClick={() => handleEdit(bill)}
                                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all shadow-sm"
                                >
                                  <Edit2 className="w-4 h-4 transition-colors transition-colors" />
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(bill.id || bill._id!)}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4 transition-colors" />
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
            className="flex flex-col gap-6 max-w-2xl mx-auto"
          >
            <button 
              onClick={() => setView('list')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-bold transition-colors w-fit px-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to List</span>
            </button>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800 text-center space-y-6 transition-colors">
              <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center mx-auto transition-colors">
                <Upload className="w-10 h-10 text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary transition-colors">Upload Solar Bill</h3>
                <p className="text-text-secondary transition-colors">PDF or JPEG files are supported</p>
              </div>
              <input type="file" id="solar-upload" hidden onChange={handleFileChange} accept="application/pdf,image/*" />
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => {
                    resetSelection();
                    setView('list');
                  }} 
                  className="px-6 py-3 bg-gray-100 dark:bg-slate-800 text-text-secondary hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <label htmlFor="solar-upload" className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all cursor-pointer shadow-lg shadow-orange-200">
                  Select File
                </label>
              </div>
              {selectedFile && (
                <div className="pt-6 border-t border-gray-100 dark:border-slate-800 transition-colors">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl transition-colors relative group">
                    <button 
                      onClick={handleRemoveFile}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all z-10"
                      title="Remove File"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-orange-500" />
                      <div className="text-left font-sans">
                        <p className="text-sm font-bold text-text-primary truncate max-w-[200px] transition-colors">{selectedFile.name}</p>
                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest transition-colors">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button 
                      onClick={isExtracting ? handleRemoveFile : handleExtract}
                      className={cn(
                        "px-4 py-2 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                        isExtracting ? "bg-red-500 hover:bg-red-600" : "bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200"
                      )}
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-3 h-3" />
                          Start Extraction
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {view === 'form' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-8"
          >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => setView('list')}
                  className="p-2.5 bg-white dark:bg-slate-700 text-gray-400 hover:text-gray-600 rounded-xl border border-gray-100 dark:border-slate-600 shadow-sm transition-all"
                  title="Back to List"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200 dark:shadow-none transition-colors">
                    <Sun className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight transition-colors">Verify Solar Bill</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 transition-colors">Review extracted energy data</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setView('upload')}
                  className="px-6 py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-slate-700 transition-all font-mono"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => (document.querySelector('form') as HTMLFormElement)?.requestSubmit()}
                  disabled={isLoading || duplicateFound}
                  className={cn(
                    "px-8 py-3 bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 flex items-center gap-2 font-mono",
                    (isLoading || duplicateFound) && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Confirm & Save
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Left Column: Editable Form */}
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 transition-colors">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Project Name *</label>
                      <select 
                        required
                        value={formData.propertyName || ''}
                        onChange={(e) => setFormData({...formData, propertyName: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors h-[48px] outline-none"
                      >
                        <option value="">Select Project</option>
                        {projects.map(p => <option key={p.id || p._id} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Company Name *</label>
                      <div className="relative">
                        <select 
                          required
                          value={formData.companyName || ''}
                          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors h-[48px] outline-none appearance-none pr-10"
                        >
                          <option value="">Select Company</option>
                          {companies.map(c => (
                            <option key={c.id || (c as any)._id} value={c.companyName}>{c.companyName}</option>
                          ))}
                          <option value="Others">Others</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Consumer Name</label>
                      <input 
                        type="text" 
                        value={formData.customerName || ''}
                        onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Consumer Number</label>
                      <input 
                        type="text" 
                        value={formData.consumerNumber || ''}
                        onChange={(e) => setFormData({...formData, consumerNumber: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Bill Date</label>
                      <input type="text" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm" value={formData.billDate || ''} onChange={(e) => setFormData({...formData, billDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Due Date</label>
                      <input type="text" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm" value={formData.dueDate || ''} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Status *</label>
                      <select 
                        value={formData.status || ''}
                        onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors h-[48px] outline-none"
                        required
                      >
                        <option value="">Select Status</option>
                        {WORKFLOW_STATUSES.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Import Units (kWh)</label>
                      <input 
                        type="number" 
                        value={formData.kwhImportUnits || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const exportU = formData.kwhExportUnits || 0;
                          setFormData({...formData, kwhImportUnits: val, netUnits: val - exportU});
                        }}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Export Units (kWh)</label>
                      <input 
                        type="number" 
                        value={formData.kwhExportUnits || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const importU = formData.kwhImportUnits || 0;
                          setFormData({...formData, kwhExportUnits: val, netUnits: importU - val});
                        }}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Bill Amount (₹)</label>
                      <input 
                        type="number" 
                        value={formData.amount || 0}
                        onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                        className="w-full px-4 py-4 bg-orange-600 text-white rounded-2xl text-xl font-black outline-none shadow-lg focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                  </div>

                  {duplicateFound && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-xs font-bold">{duplicateMessage || "This bill appears to be a duplicate."}</p>
                    </motion.div>
                  )}

                </form>
              </div>

              {/* Right Column: Read-only Preview */}
              <div className="space-y-8">
                {/* Document Thumbnail */}
                <div 
                  onClick={() => window.open(previewUrl || '', '_blank')}
                  className="bg-gray-100 dark:bg-slate-950 rounded-[2rem] overflow-hidden shadow-sm aspect-[3/4] relative group cursor-pointer border border-gray-100 dark:border-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 transition-colors"
                >
                  {previewUrl && (
                    selectedFile?.type.includes('pdf') ? (
                      <PdfViewer file={previewUrl} className="w-full h-full pointer-events-none transition-colors" />
                    ) : (
                      <img src={previewUrl} alt="Bill Document" className="w-full h-full object-contain transition-colors transition-colors" />
                    )
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-6 text-center transition-colors">
                    <Eye className="w-10 h-10 mb-2 transition-colors" />
                    <p className="text-sm font-black uppercase tracking-widest transition-colors tracking-[0.2em]">View Original</p>
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
        }}
        bill={selectedBillForDetails}
        onEdit={(bill) => {
          setIsDetailsModalOpen(false);
          const normalizedBill = {
            ...bill,
            propertyName: bill.propertyName || bill.project_name || '',
            companyName: bill.companyName || bill.company_name || '',
            status: bill.status || 'Pending',
            dueDate: bill.dueDate || bill.due_date || '',
            billNumber: bill.billNumber || bill.bill_number || ''
          };
          setFormData(normalizedBill as any);
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
          setWorkflowActionTitle('Verify Solar Bill');
          setIsVerificationModalOpen(true);
        }}
        onApprove={(bill) => {
          setSelectedBillForDetails(bill);
          setWorkflowActionType('approve');
          setWorkflowActionTitle('Approve Solar Bill');
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
        onTallyEntry={(bill) => {
          setSelectedBillForTally(bill);
          setIsTallyModalOpen(true);
          setIsDetailsModalOpen(false);
        }}
      />

      <TallyEntryForm 
        isOpen={isTallyModalOpen}
        bill={selectedBillForTally}
        onSave={async (tallyData) => {
          if (!selectedBillForTally) return;
          const id = selectedBillForTally.id || (selectedBillForTally as any)._id;
          try {
            const updatedBill = await api.tallyEntry(id, tallyData.narration, user?.name, user?.role, tallyData);
            toast.success("Tally entry recorded successfully");
            setBills(prev => prev.map(b => (b.id === id || (b as any)._id === id) ? updatedBill : b));
            setIsTallyModalOpen(false);
            setSelectedBillForTally(null);
          } catch (err) {
            toast.error("Failed to record tally entry");
          }
        }}
        onClose={() => {
          setIsTallyModalOpen(false);
          setSelectedBillForTally(null);
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
              } else if (workflowActionType === 'tally') {
                updatedBill = await api.tallyEntry(id, remarks, user?.name, user?.role);
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
              setBills(prev => prev.map(b => (b.id === id || (b as any)._id === id) ? updatedBill : b));
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
              setBills(prev => prev.map(b => (b.id === id || (b as any)._id === id) ? updatedBill : b));
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
            await api.saveBill(updatedBill, user ? { name: user.name, role: user.role } : undefined);
            toast.success('Payment recorded successfully');
            const id = updatedBill.id || (updatedBill as any)._id;
            setBills(prev => prev.map(b => (b.id === id || (b as any)._id === id) ? updatedBill : b));
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
        title="Delete Solar Bill"
        message="Are you sure you want to delete this solar bill? This record will be permanently removed from the system."
      />
    </div>
  );
};

const SectionLabel = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 mb-4 transition-colors">
    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest transition-colors">{label}</span>
  </div>
);

const FormField = ({ label, value, onChange, type = 'text', options = [] }: any) => (
  <div className="space-y-1.5 transition-colors">
    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1 transition-colors">{label}</label>
    {type === 'select' ? (
      <select 
        value={value || ''} 
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl text-sm font-medium text-text-primary focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
      >
        <option value="" className="bg-white dark:bg-slate-900">Select...</option>
        {options.map((opt: string) => <option key={opt} value={opt} className="bg-white dark:bg-slate-900">{opt}</option>)}
        <option value="Others" className="bg-white dark:bg-slate-900">Others</option>
      </select>
    ) : (
      <input 
        type={type} 
        value={value || ''} 
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl text-sm font-medium text-text-primary focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
      />
    )}
  </div>
);
