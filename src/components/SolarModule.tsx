import React, { useState, useEffect } from 'react';
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

export const SolarModule: React.FC = () => {
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
    operator: '', // Not strictly needed for Solar but good for consistency
    billType: ''   // Not strictly needed for Solar but good for consistency
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
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
      setBills(allBills.filter(b => b.utilityType === 'Solar Bill'));
      setProjects(allProjects);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBills = bills.filter(bill => {
    const matchesProject = !filterProject || bill.propertyName === filterProject;
    const matchesCompany = !filterCompany || bill.companyName === filterCompany;
    const matchesStatus = !filters.status || bill.status === filters.status;
    const matchesDate = (!filterStartDate || (bill.billDate && bill.billDate >= filterStartDate)) && 
                       (!filterEndDate || (bill.billDate && bill.billDate <= filterEndDate));
    const matchesSearch = !searchQuery || 
      bill.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.billNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesProject && matchesCompany && matchesStatus && matchesSearch && matchesDate;
  });

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
    
    try {
      // 1. Upload file
      const formDataUpload = new FormData();
      formDataUpload.append('files', selectedFile);
      const uploadRes = await api.uploadSolar(formDataUpload);
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
      console.error('Extraction error:', err);
      toast.error(`Extraction failed: ${err.message}`, { id: 'extraction' });
    } finally {
      setIsExtracting(false);
    }
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

      await api.saveBill(billToSave as Bill);
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
  const canConfirmPayment = user?.role === 'ADMIN' || user?.role === 'ACCOUNT_MANAGER';
  const canDownload = user?.role !== 'ACCOUNT_MANAGEMENT';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Solar Monitoring</span>
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-md border border-orange-100 dark:border-orange-800 uppercase tracking-widest">
              {user?.role === 'DATA_ENTRY' ? 'Data Entry Operative' : user?.role || 'Guest'}
            </span>
          </div>
          <h1 className="text-3xl font-black text-text-primary flex items-center gap-3 transition-colors">
            <Sun className="w-10 h-10 text-orange-500 fill-orange-100 dark:fill-orange-500/20" />
            Solar Management
          </h1>
          <p className="text-text-secondary font-medium text-sm transition-colors">Monitor net metering, consumption, and solar generation savings.</p>
        </div>
        
        <div className="flex items-center gap-6">
          {view === 'list' && canAdd && (
            <button 
              onClick={() => {
                resetSelection();
                setView('upload');
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 h-fit"
            >
              <Upload className="w-4 h-4" />
              Upload Solar Bill
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
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

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4 overflow-x-auto transition-colors">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-lg text-text-primary text-xs outline-none focus:ring-1 focus:ring-orange-500 w-48 transition-colors"
                    />
                  </div>
                  
                  <select 
                    value={filterProject} 
                    onChange={e => setFilterProject(e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-lg text-text-primary text-xs outline-none focus:ring-1 focus:ring-orange-500 min-w-[120px] transition-colors"
                  >
                    <option value="" className="bg-white dark:bg-slate-900">All Projects</option>
                    {Array.from(new Set(projects.map(p => p.name))).map(name => <option key={name} value={name} className="bg-white dark:bg-slate-900">{name}</option>)}
                  </select>

                  <select 
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-lg text-text-primary text-xs outline-none focus:ring-1 focus:ring-orange-500 min-w-[120px] transition-colors"
                  >
                    <option value="" className="bg-white dark:bg-slate-900">All Companies</option>
                    {companies.map(c => <option key={c} value={c} className="bg-white dark:bg-slate-900">{c}</option>)}
                  </select>

 

                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-lg text-text-primary text-xs outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                    />
                    <span className="text-text-secondary text-xs transition-colors">to</span>
                    <input 
                      type="date" 
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-lg text-text-primary text-xs outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                    />
                    {(filterStartDate || filterEndDate) && (
                      <button 
                        onClick={() => {
                          setFilterStartDate('');
                          setFilterEndDate('');
                        }}
                        className="text-[10px] font-bold text-yellow-500 hover:text-yellow-600"
                      >
                        Clear Date
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                      <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Bill Details</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Consumer No</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-center">Power Mix</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-center">Net Units</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Bill Period</th>
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
                                <Skeleton className="h-3 w-16" />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-32 mx-auto" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-12 mx-auto" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-20 mx-auto" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-20" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-5 w-16" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-6 w-16 rounded-full" /></td>
                          <td className="py-4 px-6 text-right">
                             <div className="flex justify-end gap-2">
                                <Skeleton variant="circle" className="w-8 h-8" />
                              </div>
                          </td>
                        </tr>
                      ))
                    ) : filteredBills.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-text-secondary transition-colors">
                          <div className="flex flex-col items-center gap-2">
                            <Sun className="w-12 h-12 opacity-20" />
                            <p className="font-medium">No solar bills found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredBills.map((bill) => (
                        <tr key={bill.id || bill._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all transition-colors">
                                <Sun className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-text-primary transition-colors">{bill.propertyName}</p>
                                <p className="text-[10px] text-text-secondary font-medium tracking-tight transition-colors">#{bill.billNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                             <p className="text-sm font-medium text-text-secondary transition-colors">{bill.consumerNumber || 'N/A'}</p>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">Import: {bill.kwhImportUnits || 0}</span>
                                <span className="text-[9px] font-black text-green-500 uppercase tracking-tighter">Export: {bill.kwhExportUnits || 0}</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex transition-colors">
                                <div className="h-full bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)] transition-all" style={{ width: `${(bill.kwhImportUnits || 0) / ((bill.kwhImportUnits || 0) + (bill.kwhExportUnits || 0) || 1) * 100}%` }}></div>
                                <div className="h-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.3)] transition-all" style={{ width: `${(bill.kwhExportUnits || 0) / ((bill.kwhImportUnits || 0) + (bill.kwhExportUnits || 0) || 1) * 100}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className={cn(
                              "inline-flex flex-col items-center px-3 py-1 rounded-lg transition-colors shadow-sm",
                              (bill.netUnits || 0) <= 0 ? "bg-green-50 dark:bg-emerald-900/20 text-green-700 dark:text-emerald-400 border border-green-100 dark:border-emerald-800" : "bg-orange-50 dark:bg-amber-900/20 text-orange-700 dark:text-amber-400 border border-orange-100 dark:border-amber-800"
                            )}>
                              <span className="text-xs font-black">{bill.netUnits || 0}</span>
                              <span className="text-[8px] font-bold uppercase tracking-tighter opacity-70">Units</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                             <p className="text-sm font-medium text-text-secondary transition-colors">{bill.billingPeriod || 'N/A'}</p>
                          </td>
                          <td className="py-4 px-6">
                             <p className="text-sm font-medium text-text-secondary transition-colors">{bill.dueDate}</p>
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm font-black text-text-primary transition-colors">₹{bill.amount.toLocaleString()}</p>
                          </td>
                          <td className="py-4 px-6">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm",
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
                                  title="Delete Bill"
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
          <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto">
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
                      onClick={resetSelection}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all z-10"
                      title="Remove File"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-orange-500" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-text-primary truncate max-w-[200px] transition-colors">{selectedFile.name}</p>
                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest transition-colors">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleExtract}
                      disabled={isExtracting}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-all flex items-center gap-2"
                    >
                      {isExtracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                      {isExtracting ? 'Extracting...' : 'Start Extraction'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {view === 'form' && (
          <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden transition-colors">
              <div className="p-6 bg-orange-500 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <Sun className="w-5 h-5" />
                    Solar Bill Review
                  </h3>
                  <p className="text-orange-100 text-[10px] font-bold uppercase tracking-widest">Verify AI extraction and complete project mapping</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/20 transition-colors">
                    AI confidence: 98%
                  </div>
                  <button type="button" onClick={() => setView('upload')} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-10">
                {/* Source Document Preview/Download Section */}
                {formData.fileUrl && (
                  <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-2xl p-4 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border border-orange-100 dark:border-orange-900/30 transition-colors">
                        <FileText className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-text-primary transition-colors">Source Document Attached</p>
                        <p className="text-[10px] text-text-secondary font-bold uppercase transition-colors">Ready for verification</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-text-primary">
                      <button 
                        type="button"
                        onClick={() => window.open(formData.fileUrl, '_blank')}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-orange-100 dark:border-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-orange-50 dark:hover:bg-slate-700 transition-all"
                      >
                        <Eye className="w-3 h-3" />
                        Preview
                      </button>
                      {canDownload && (
                        <button 
                          type="button"
                          onClick={() => downloadFile(formData.fileUrl || '', formData.attachments?.[0]?.name || 'bill.pdf')}
                          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-orange-600 transition-all shadow-sm"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <SectionLabel label="Identity & Provider" />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Project" value={formData.propertyName} onChange={v => setFormData({...formData, propertyName: v})} type="select" options={projects.map(p => p.name)} />
                      <FormField label="Company" value={formData.companyName} onChange={v => setFormData({...formData, companyName: v})} type="select" options={companies} />
                    </div>
                    {formData.propertyName === 'Others' && (
                      <FormField label="Custom Property Name" value={formData.customPropertyName} onChange={v => setFormData({...formData, customPropertyName: v})} />
                    )}
                    {formData.companyName === 'Others' && (
                      <FormField label="Custom Company Name" value={formData.customCompanyName} onChange={v => setFormData({...formData, customCompanyName: v})} />
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Bill Date" value={formData.billDate} onChange={v => setFormData({...formData, billDate: v})} type="date" />
                      <FormField label="Due Date" value={formData.dueDate} onChange={v => setFormData({...formData, dueDate: v})} type="date" />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField label="Billing Period" value={formData.billingPeriod} onChange={v => setFormData({...formData, billingPeriod: v})} placeholder="e.g. April 2024" />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField 
                        label="Status *" 
                        value={formData.status} 
                        onChange={v => setFormData({...formData, status: v})} 
                        type="select" 
                        options={['Select Status', 'Paid', 'Pending', 'Overdue']} 
                        required 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Consumer Name" value={formData.customerName} onChange={v => setFormData({...formData, customerName: v})} />
                      <FormField label="Consumer No" value={formData.consumerNumber} onChange={v => setFormData({...formData, consumerNumber: v})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Meter Number" value={formData.meterNumber} onChange={v => setFormData({...formData, meterNumber: v})} />
                      <FormField label="Service Provider" value={formData.serviceProvider} onChange={v => setFormData({...formData, serviceProvider: v})} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 text-text-primary">
                      <FormField 
                        label="Status" 
                        value={formData.status} 
                        onChange={v => setFormData({...formData, status: v})} 
                        type="select" 
                        options={['Paid', 'Pending', 'Overdue']} 
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <SectionLabel label="Reading & Consumption" />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Previous Reading" value={formData.previousReading} onChange={v => setFormData({...formData, previousReading: Number(v)})} type="number" />
                      <FormField label="Current Reading" value={formData.currentReading} onChange={v => setFormData({...formData, currentReading: Number(v)})} type="number" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Sanctioned Load (Demand)" value={formData.billingDemand} onChange={v => setFormData({...formData, billingDemand: Number(v)})} type="number" />
                      <FormField label="Max Recorded Demand" value={formData.maxDemand} onChange={v => setFormData({...formData, maxDemand: Number(v)})} type="number" />
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/30 space-y-4 transition-colors">
                      <h4 className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest transition-colors">Net Metering Breakdown</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Import Units (Grid ↑)" value={formData.kwhImportUnits} onChange={v => setFormData({...formData, kwhImportUnits: Number(v)})} type="number" />
                        <FormField label="Export Units (Solar ↓)" value={formData.kwhExportUnits} onChange={v => setFormData({...formData, kwhExportUnits: Number(v)})} type="number" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Net Charged Units" value={formData.netUnits} onChange={v => setFormData({...formData, netUnits: Number(v)})} type="number" />
                        <FormField label="Solar Generation" value={formData.solarGenerationUnits} onChange={v => setFormData({...formData, solarGenerationUnits: Number(v)})} type="number" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-8 border-t border-gray-100 dark:border-slate-800 transition-colors">
                  <div className="space-y-6">
                    <SectionLabel label="Financial Breakdown" />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Energy Charges (₹)" value={formData.energyCharges} onChange={v => setFormData({...formData, energyCharges: Number(v)})} type="number" />
                      <FormField label="Fixed Charges (₹)" value={formData.fixedCharges} onChange={v => setFormData({...formData, fixedCharges: Number(v)})} type="number" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField label="Duty (₹)" value={formData.electricityDuty} onChange={v => setFormData({...formData, electricityDuty: Number(v)})} type="number" />
                      <FormField label="Rebate (₹)" value={formData.rebate} onChange={v => setFormData({...formData, rebate: Number(v)})} type="number" />
                      <FormField label="Surcharge (₹)" value={formData.surcharge} onChange={v => setFormData({...formData, surcharge: Number(v)})} type="number" />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <SectionLabel label="Totals & Notes" />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Export Adjustment (₹)" value={formData.exportAdjustment} onChange={v => setFormData({...formData, exportAdjustment: Number(v)})} type="number" />
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1 transition-colors">Total Payable (₹)</label>
                        <input 
                          type="number"
                          value={formData.amount}
                          onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                          className="w-full px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-900/50 rounded-xl text-lg font-black text-orange-700 dark:text-orange-400 focus:ring-0 outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1 transition-colors">Notes / Remarks</label>
                      <textarea 
                        value={formData.notes || ''}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl text-sm font-medium text-text-primary outline-none h-20 resize-none transition-colors"
                        placeholder="Add any specific observations..."
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-4 transition-colors">
                  <button 
                    type="button" 
                    onClick={() => {
                      resetSelection();
                      setView('list');
                    }} 
                    className="px-8 py-4 bg-gray-100 dark:bg-slate-800 text-text-secondary hover:bg-gray-200 dark:hover:bg-slate-700 rounded-2xl font-bold transition-all"
                  >
                    Discard
                  </button>
                  <button type="submit" disabled={isLoading} className="px-8 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-xl shadow-orange-200 flex items-center gap-3">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Confirm & Save Solar Bill
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

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
