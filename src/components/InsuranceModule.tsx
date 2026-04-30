import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
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
  Car,
  Users,
  Briefcase,
  Zap,
  Clock,
  Trash2,
  Edit2,
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
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { WorkflowModal } from './WorkflowModal';
import { Filters } from './Filters';
import { X } from 'lucide-react';

const formatPremium = (val: any) => {
  const num = Number(val);
  return isNaN(num) ? '₹0' : `₹${num.toLocaleString()}`;
};

const DetailRow: React.FC<{ label: string; value: any; mono?: boolean; isHighlight?: boolean }> = ({ 
  label, value, mono, isHighlight 
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
    <span className={cn(
      "text-sm font-semibold truncate",
      isHighlight ? "text-orange-600 font-black" : "text-gray-800",
      mono && "font-mono text-xs bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100"
    )}>
      {value || 'Not specified'}
    </span>
  </div>
);

import { Skeleton } from './ui/Skeleton';

export const InsuranceModule: React.FC = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [view, setView] = useState<'list' | 'upload' | 'form'>('list');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewingBill, setPreviewingBill] = useState<Bill | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [workflowActionType, setWorkflowActionType] = useState<'verify' | 'approve' | 'initiate' | 'confirm'>('verify');
  const [workflowActionTitle, setWorkflowActionTitle] = useState('');
  
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
  
  const [formData, setFormData] = useState<Partial<Bill>>({
    utilityType: 'Insurance',
    subcategory: 'general_insurance',
    status: '' as any,
    priority: 'Normal',
    amount: 0,
    propertyName: '',
    companyName: '',
    serviceProvider: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    reminderDays: 30,
    // Insurance specific defaults to avoid uncontrolled component warnings
    policyNumber: '',
    insurerName: '',
    insuredName: '',
    registrationNumber: '',
    vehicleMake: '',
    vehicleModel: '',
    manufacturingYear: '',
    engineNumber: '',
    chassisNumber: '',
    fuelType: '',
    seatingCapacity: '',
    idv: 0,
    packagePremium: 0,
    ownDamagePremium: 0,
    thirdPartyPremium: 0,
    gstAmount: 0,
    stampDuty: 0,
    receiptDate: '',
    receiptAmount: 0,
    paymentMode: '',
    payingParty: '',
    // Employee specific
    insuredCompanyName: '',
    numberOfEmployees: 0,
    numberOfDependents: 0,
    sumInsured: 0,
    tpaName: '',
    coverageType: '',
    intermediaryId: '',
    intermediaryName: '',
    industryType: '',
    policyPeriod: '',
    notes: '',
  });

  // Auto-calculate Reminder Date from Expiry Date (Due Date)
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

  const subcategories = [
    { id: 'vehicle_insurance', label: 'Vehicle Insurance', icon: Car, color: 'text-orange-500' },
    { id: 'employee_insurance', label: 'Employee Insurance', icon: Users, color: 'text-orange-500' },
    { id: 'general_insurance', label: 'General Insurance', icon: Briefcase, color: 'text-orange-500' },
  ];

  const companies = [
    "ICICI Lombard",
    "National Insurance",
    "UIIC",
    "HDFC ERGO",
    "Star Health",
    "LIC",
    "Tata AIG",
    "Reliance General",
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
      const insuranceTypes = ['Insurance', 'Vehicle Insurance', 'Employee Insurance', 'General Insurance', 'Labour Insurance', 'Asset Insurance'];
      setBills(allBills.filter(b => insuranceTypes.includes(b.utilityType)));
      setProjects(allProjects);
    } catch (err) {
      toast.error('Failed to load insurance data');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      utilityType: 'Insurance',
      subcategory: 'general_insurance',
      status: '' as any,
      priority: 'Normal',
      amount: 0,
      propertyName: '',
      companyName: '',
      serviceProvider: '',
      billDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      reminderDays: 30,
      policyNumber: '',
      insurerName: '',
      insuredName: '',
      registrationNumber: '',
      vehicleMake: '',
      vehicleModel: '',
      manufacturingYear: '',
      engineNumber: '',
      chassisNumber: '',
      fuelType: '',
      seatingCapacity: '',
      idv: 0,
      packagePremium: 0,
      ownDamagePremium: 0,
      thirdPartyPremium: 0,
      gstAmount: 0,
      stampDuty: 0,
      receiptDate: '',
      receiptAmount: 0,
      paymentMode: '',
      payingParty: '',
      insuredCompanyName: '',
      numberOfEmployees: 0,
      numberOfDependents: 0,
      sumInsured: 0,
      tpaName: '',
      coverageType: '',
      intermediaryId: '',
      intermediaryName: '',
      industryType: '',
      policyPeriod: '',
      notes: '',
    });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleEdit = (bill: Bill) => {
    setFormData(bill);
    setPreviewingBill(null);
    const url = bill.fileUrl || (bill.attachments && bill.attachments[0]?.url) || null;
    setPreviewUrl(url);
    setView('form');
  };

  const filteredBills = bills.filter(bill => {
    const matchesProject = !filters.property || bill.propertyName === filters.property;
    const matchesSubcategory = !filters.billType || bill.subcategory === filters.billType;
    const matchesStatus = !filters.status || bill.status === filters.status;
    const matchesSearch = !filters.search || 
      bill.propertyName.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.policyNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.insuredName?.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesProject && matchesSubcategory && matchesStatus && matchesSearch;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      
      // Clear old URLs if we are in form view (editing)
      setFormData(prev => ({
        ...prev,
        fileUrl: undefined,
        attachments: []
      }));
      
      setView('upload');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
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
      toast.success('Policy record deleted successfully');
      setIsDeleteModalOpen(false);
    } catch (err) {
      toast.error('Failed to delete policy record');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) return;
    setIsExtracting(true);
    
    try {
      // 1. Upload for permanent storage
      const formDataUpload = new FormData();
      formDataUpload.append('files', selectedFile);
      const uploadRes = await api.uploadInsurance(formDataUpload);
      const fileUrl = uploadRes.fileUrl;

      // 2. Extract with AI
      toast.loading('Detecting Type & Extracting...', { id: 'extraction' });
      
      const fileData = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type;
      
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: fileData, mimeType: mimeType === "application/pdf" ? "application/pdf" : "image/jpeg" } },
            { text: `You are an insurance document expert.
            First, detect the subcategory of this insurance document:
            - vehicle_insurance: Details about vehicles, registration, engine, chassis, IDV.
            - employee_insurance: Details about group policy, health, dependents, employee count.
            - general_insurance: Fallback.

            Then extract the following fields based on the subcategory:
            
            COMMON FIELDS:
            - subcategory: "vehicle_insurance" | "employee_insurance" | "general_insurance"
            - policyNumber: Policy/Document number
            - insurerName: ICICI, National, UIIC, etc.
            - insuredName: Individual or Company name insured
            - startDate: "YYYY-MM-DD"
            - endDate: "YYYY-MM-DD"
            - totalPremium: total amount including GST
            - gstAmount: tax component

            VEHICLE SPECIFIC:
            - registrationNumber
            - vehicleMake
            - vehicleModel
            - manufacturingYear
            - engineNumber
            - chassisNumber
            - fuelType
            - seatingCapacity
            - idv: Insured Declared Value
            - packagePremium: Package Premium excluding GST
            - stampDuty: Stamp Duty amount
            - receiptDate: Date of payment/receipt "YYYY-MM-DD"
            - receiptAmount: Total amount paid
            - paymentMode: Payment method (Online/Cash/UPI)
            - payingParty: Name of person/entity who paid

            EMPLOYEE SPECIFIC:
            - insuredCompanyName
            - numberOfEmployees
            - numberOfDependents
            - sumInsured
            - coverageType: Health, Group Life, etc.
            - intermediaryId: ID of the broker/intermediary
            - intermediaryName: Name of the broker/intermediary
            - industryType: Type of industry (IT, Manufacturing, etc.)

            Return JSON ONLY.` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subcategory: { type: Type.STRING },
              policyNumber: { type: Type.STRING },
              insurerName: { type: Type.STRING },
              insuredName: { type: Type.STRING },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              totalPremium: { type: Type.NUMBER },
              gstAmount: { type: Type.NUMBER },
              // Vehicle
              registrationNumber: { type: Type.STRING },
              vehicleMake: { type: Type.STRING },
              vehicleModel: { type: Type.STRING },
              manufacturingYear: { type: Type.STRING },
              engineNumber: { type: Type.STRING },
              chassisNumber: { type: Type.STRING },
              fuelType: { type: Type.STRING },
              seatingCapacity: { type: Type.STRING },
              idv: { type: Type.NUMBER },
              packagePremium: { type: Type.NUMBER },
              stampDuty: { type: Type.NUMBER },
              receiptDate: { type: Type.STRING },
              receiptAmount: { type: Type.NUMBER },
              paymentMode: { type: Type.STRING },
              payingParty: { type: Type.STRING },
              // Employee
              insuredCompanyName: { type: Type.STRING },
              numberOfEmployees: { type: Type.NUMBER },
              numberOfDependents: { type: Type.NUMBER },
              sumInsured: { type: Type.NUMBER },
              coverageType: { type: Type.STRING },
              intermediaryId: { type: Type.STRING },
              intermediaryName: { type: Type.STRING },
              industryType: { type: Type.STRING }
            }
          }
        }
      });

      let responseText = response.text || "{}";
      
      // Basic cleanup for redundant markdown or accidental text
      responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      
      let extracted: any;
      try {
        extracted = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn("JSON Parse failed, attempting fallback recovery:", parseErr);
        // If it's the specific "unterminated string" error, we might have hit a token limit
        // We'll try a very basic recovery by appending a double quote and closing brace
        // This is a "best effort" to retrieve whatever data was sent before truncation
        try {
          extracted = JSON.parse(responseText + '"}');
        } catch (f) {
          try {
            extracted = JSON.parse(responseText + '}');
          } catch (f2) {
             throw new Error("The AI response was too large or corrupted and could not be parsed. Please try again with a smaller file or clearer document.");
          }
        }
      }
      
      setFormData(prev => ({
        ...prev,
        utilityType: 'Insurance',
        subcategory: extracted.subcategory as any || 'general_insurance',
        policyNumber: extracted.policyNumber || '',
        insurerName: extracted.insurerName || '',
        insuredName: extracted.insuredName || '',
        billDate: extracted.startDate || new Date().toISOString().split('T')[0],
        dueDate: extracted.endDate || new Date().toISOString().split('T')[0],
        amount: extracted.totalPremium || 0,
        gstAmount: extracted.gstAmount || 0,
        // Vehicle
        registrationNumber: extracted.registrationNumber || '',
        vehicleMake: extracted.vehicleMake || '',
        vehicleModel: extracted.vehicleModel || '',
        manufacturingYear: extracted.manufacturingYear || '',
        engineNumber: extracted.engineNumber || '',
        chassisNumber: extracted.chassisNumber || '',
        fuelType: extracted.fuelType || '',
        seatingCapacity: extracted.seatingCapacity || '',
        idv: extracted.idv || 0,
        packagePremium: extracted.packagePremium || 0,
        stampDuty: extracted.stampDuty || 0,
        receiptDate: extracted.receiptDate || '',
        receiptAmount: extracted.receiptAmount || 0,
        paymentMode: extracted.paymentMode || '',
        payingParty: extracted.payingParty || '',
        // Employee
        insuredCompanyName: extracted.insuredCompanyName || '',
        numberOfEmployees: extracted.numberOfEmployees || 0,
        numberOfDependents: extracted.numberOfDependents || 0,
        sumInsured: extracted.sumInsured || 0,
        coverageType: extracted.coverageType || '',
        intermediaryId: extracted.intermediaryId || '',
        intermediaryName: extracted.intermediaryName || '',
        industryType: extracted.industryType || '',
        fileUrl: fileUrl,
        status: prev.status || 'Pending',
        priority: prev.priority || 'Normal'
      }));

      toast.success(`Detected ${extracted.subcategory?.replace('_', ' ')}! Data extracted.`, { id: 'extraction' });
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
    setIsLoading(true);

    try {
      const isUpdate = !!(formData.id || formData._id);
      
      const bDate = formData.billDate ? new Date(formData.billDate) : new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const month = monthNames[bDate.getMonth()];
      const year = bDate.getFullYear().toString();

      const billToSave: Partial<Bill> = {
        ...formData,
        category: 'insurance' as const,
        utilityType: (subcategories.find(s => s.id === formData.subcategory)?.label || formData.utilityType || 'Insurance') as any,
        month: month,
        year: year,
        billId: formData.billId || `INS-${Date.now().toString().slice(-6)}`,
        submissionDateTime: formData.submissionDateTime || new Date().toISOString(),
        attachments: formData.fileUrl 
          ? [{ url: formData.fileUrl, name: selectedFile?.name || 'Insurance Doc', type: selectedFile?.type || 'image/jpeg' }] 
          : (formData.attachments || [])
      };

      await api.saveBill(billToSave);
      toast.success(isUpdate ? 'Insurance record updated successfully!' : 'Insurance record saved successfully!');
      setView('list');
      fetchData();
    } catch (err) {
      toast.error('Failed to save insurance record');
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (action: 'view' | 'add' | 'edit' | 'delete' | 'approve') => {
    if (user?.role === 'ADMIN') return true;
    if (user?.permissions && user.permissions.insurance) {
      return user.permissions.insurance[action];
    }
    // Default fallback logic for specific roles
    if (action === 'add') return user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'INSURANCE_ENTRY';
    if (action === 'view') return true;
    return user?.role === 'ADMIN'; 
  };

  const canAdd = hasPermission('add');
  const canEdit = user?.role === 'ADMIN';
  const canDelete = user?.role === 'ADMIN';
  const canApprove = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-orange-600 fill-orange-600/10" />
            Insurance Module
          </h1>
          <p className="text-gray-500 font-medium">Categorized AI extraction for Vehicle, Employee & General Insurance</p>
        </div>
        
        {view === 'list' && canAdd && (
          <button 
            onClick={() => {
              resetForm();
              setView('upload');
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
          >
            <Upload className="w-4 h-4" />
            Upload Policy
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
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={() => setFilters({ ...filters, status: '' })}
                className={cn(
                  "p-6 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md",
                  filters.status === '' 
                    ? "bg-orange-50 border-orange-200 ring-2 ring-orange-100" 
                    : "bg-white border-gray-100"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Policies</p>
                  <ShieldCheck className="w-4 h-4 text-gray-400" />
                </div>
                <h2 className="text-2xl font-black text-gray-900">{bills.length}</h2>
              </div>

              <div 
                onClick={() => setFilters({ ...filters, status: 'Pending' })}
                className={cn(
                  "p-6 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md",
                  filters.status === 'Pending' 
                    ? "bg-orange-50 border-orange-200 ring-2 ring-orange-100" 
                    : "bg-white border-gray-100"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending Bills</p>
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                </div>
                <h2 className="text-2xl font-black text-orange-500">
                  {bills.filter(b => b.status === 'Pending' || b.status === 'PENDING').length}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-2">
              <button
                onClick={() => setFilters({ ...filters, status: '' })}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                  filters.status === '' 
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-200" 
                    : "bg-white dark:bg-slate-900 text-text-secondary border border-gray-100 dark:border-slate-800 hover:bg-gray-50 uppercase tracking-widest"
                )}
              >
                All Policies
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
                        ? "bg-orange-600 text-white shadow-lg shadow-orange-200" 
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

            <Filters 
              filters={filters}
              setFilters={setFilters}
              properties={Array.from(new Set(projects.map(p => p.name)))}
              options={{
                billTypes: subcategories.map(s => s.label)
              }}
            />

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Policy Details</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Insured Name</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4">Total SI</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valid Until</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Premium</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <tr key={i}>
                          <td className="py-4 px-6"><Skeleton variant="card" className="w-10 h-10 rounded-xl" /></td>
                          <td className="py-4 px-6">
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-32" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-20" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-4 px-6 text-right">
                             <div className="flex justify-end gap-2">
                                <Skeleton variant="circle" className="w-8 h-8" />
                              </div>
                          </td>
                        </tr>
                      ))
                    ) : filteredBills.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-20 text-center text-gray-400 font-medium">No insurance records found</td>
                      </tr>
                    ) : (
                      filteredBills.map((bill) => {
                        const subCat = subcategories.find(s => s.id === bill.subcategory) || subcategories[2];
                        return (
                          <tr key={bill.id || bill._id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="py-4 px-6">
                              <div className={cn("inline-flex p-2 rounded-xl bg-gray-50", subCat.color)}>
                                <subCat.icon className="w-5 h-5" />
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <p className="text-sm font-bold text-gray-900">{bill.policyNumber}</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{bill.insurerName}</p>
                            </td>
                            <td className="py-4 px-6 text-sm font-medium text-gray-700">{bill.insuredName}</td>
                            <td className="py-4 px-6 px-4">
                              <p className="text-sm font-black text-gray-900">
                                {bill.sumInsured ? `₹${bill.sumInsured.toLocaleString()}` : bill.idv ? `₹${bill.idv.toLocaleString()}` : '—'}
                              </p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">Cover Value</p>
                            </td>
                            <td className="py-4 px-6">
                              <p className="text-sm font-medium text-gray-700">{bill.dueDate}</p>
                              {new Date(bill.dueDate) < new Date() && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-bold uppercase tracking-wider">Expired</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-sm font-black text-gray-900 text-nowrap">₹{bill.amount.toLocaleString()}</td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {user?.role !== 'INSURANCE_ENTRY' && user?.role !== 'DATA_ENTRY' && (
                                  <button 
                                    onClick={() => handleEdit(bill)}
                                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Edit Record"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => {
                                    // InsuranceModule uses setSelectedBillForDetails equivalent which is setPreviewingBill
                                    // But BillDetailsModal expect selectedBillForDetails.
                                    // Let's check what InsuranceModule uses for BillDetailsModal.
                                    setPreviewingBill(bill);
                                  }}
                                  className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* Workflow Actions Removed - Only available in details modal */}
                                
                                {canDelete && (
                                  <button 
                                    onClick={() => handleDelete(bill.id || bill._id!)}
                                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete Policy"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                                {(bill.fileUrl || (bill.attachments && bill.attachments.length > 0)) && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const url = bill.fileUrl || (bill.attachments && bill.attachments[0].url);
                                      if (url) {
                                        downloadFile(url, `${bill.policyNumber}_insurance.pdf`);
                                      }
                                    }}
                                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                                    title="Download Document"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
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
            className="max-w-2xl mx-auto py-12"
          >
            <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center">
                <Upload className="w-10 h-10 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Upload Insurance Document</h2>
                <p className="text-gray-500 mt-2">Upload PDF or Image. Our AI will automatically detect if it is Vehicle, Employee or General insurance.</p>
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
                className="px-8 py-3 bg-orange-600 text-white rounded-xl font-bold cursor-pointer hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
              >
                Choose File
              </label>

              {selectedFile && (
                <div className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <FileText className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{selectedFile.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleExtract}
                    disabled={isExtracting}
                    className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                  >
                    {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {isExtracting ? 'Extracting...' : 'Detect & Extract'}
                  </button>
                </div>
              )}

              <button onClick={() => setView('list')} className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-gray-600 transition-colors">Cancel</button>
            </div>
          </motion.div>
        )}

        {view === 'form' && (
          <motion.div 
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Form Section */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2">
                    <CheckCircle2 className="w-3 h-3" />
                    AI Auto-Filled
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Verify Insurance Data</h2>
                </div>
                {formData.subcategory && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detected Category</p>
                    <p className="text-sm font-black text-orange-600 uppercase italic">
                      {formData.subcategory.replace('_', ' ')}
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Insurance Category *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {subcategories.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFormData({...formData, subcategory: cat.id as any})}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                            formData.subcategory === cat.id 
                              ? "bg-orange-50 border-orange-600 ring-2 ring-orange-100" 
                              : "bg-gray-50 border-transparent hover:border-gray-200"
                          )}
                        >
                          <cat.icon className={cn("w-5 h-5", formData.subcategory === cat.id ? "text-orange-600" : "text-gray-400")} />
                          <span className={cn("text-[10px] font-bold uppercase", formData.subcategory === cat.id ? "text-orange-700" : "text-gray-500")}>
                            {cat.label.split(' ')[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Project / Property Name *</label>
                    <select 
                      required
                      value={formData.propertyName || ''}
                      onChange={(e) => setFormData({...formData, propertyName: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-orange-500 appearance-none cursor-pointer"
                    >
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.id || p._id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Insurer Name</label>
                    <div className="relative">
                      <select 
                        value={formData.insurerName || ''}
                        onChange={(e) => setFormData({...formData, insurerName: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-orange-500 appearance-none"
                      >
                        <option value="">Select Insurer</option>
                        {companies.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Policy Number</label>
                    <input 
                      type="text" 
                      value={formData.policyNumber || ''}
                      onChange={(e) => setFormData({...formData, policyNumber: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  {/* Vehicle Specific Fields */}
                  {formData.subcategory === 'vehicle_insurance' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-2 grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Car className="w-3 h-3" /> Vehicle Information
                        </label>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Registration No</label>
                        <input 
                          type="text" 
                          value={formData.registrationNumber || ''}
                          onChange={(e) => setFormData({...formData, registrationNumber: e.target.value})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-medium outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Make & Model</label>
                        <input 
                          type="text" 
                          value={`${formData.vehicleMake || ''} ${formData.vehicleModel || ''}`}
                          onChange={(e) => {
                            const [make, ...model] = e.target.value.split(' ');
                            setFormData({...formData, vehicleMake: make, vehicleModel: model.join(' ')});
                          }}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-medium outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Engine Number</label>
                        <input 
                          type="text" 
                          value={formData.engineNumber || ''}
                          onChange={(e) => setFormData({...formData, engineNumber: e.target.value})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-medium outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Chassis Number</label>
                        <input 
                          type="text" 
                          value={formData.chassisNumber || ''}
                          onChange={(e) => setFormData({...formData, chassisNumber: e.target.value})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-medium outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Mfg Year</label>
                        <input 
                          type="text" 
                          value={formData.manufacturingYear || ''}
                          onChange={(e) => setFormData({...formData, manufacturingYear: e.target.value})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-medium outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">IDV Value</label>
                        <input 
                          type="number" 
                          value={formData.idv || 0}
                          onChange={(e) => setFormData({...formData, idv: Number(e.target.value)})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-black text-gray-900 outline-none"
                        />
                      </div>

                      <div className="col-span-2 pt-4 border-t border-gray-100/50">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 block">Premium & Receipt Breakdown</label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Package Premium</label>
                            <input 
                              type="number" 
                              value={formData.packagePremium || 0}
                              onChange={(e) => setFormData({...formData, packagePremium: Number(e.target.value)})}
                              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Own Damage</label>
                            <input 
                              type="number" 
                              value={formData.ownDamagePremium || 0}
                              onChange={(e) => setFormData({...formData, ownDamagePremium: Number(e.target.value)})}
                              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Third Party</label>
                            <input 
                              type="number" 
                              value={formData.thirdPartyPremium || 0}
                              onChange={(e) => setFormData({...formData, thirdPartyPremium: Number(e.target.value)})}
                              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">GST Amount</label>
                            <input 
                              type="number" 
                              value={formData.gstAmount || 0}
                              onChange={(e) => setFormData({...formData, gstAmount: Number(e.target.value)})}
                              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Stamp Duty</label>
                            <input 
                              type="number" 
                              value={formData.stampDuty || 0}
                              onChange={(e) => setFormData({...formData, stampDuty: Number(e.target.value)})}
                              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Receipt Amount</label>
                            <input 
                              type="number" 
                              value={formData.receiptAmount || 0}
                              onChange={(e) => setFormData({...formData, receiptAmount: Number(e.target.value)})}
                              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none bg-green-50/30"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Receipt Date</label>
                            <input 
                              type="date" 
                              value={formData.receiptDate || ''}
                              onChange={(e) => setFormData({...formData, receiptDate: e.target.value})}
                              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Payment Mode</label>
                            <input 
                              type="text" 
                              value={formData.paymentMode || ''}
                              onChange={(e) => setFormData({...formData, paymentMode: e.target.value})}
                              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none"
                              placeholder="e.g. Online"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Paying Party</label>
                            <input 
                              type="text" 
                              value={formData.payingParty || ''}
                              onChange={(e) => setFormData({...formData, payingParty: e.target.value})}
                              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Employee Specific Fields */}
                  {formData.subcategory === 'employee_insurance' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-2 grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Users className="w-3 h-3" /> Workforce Details
                        </label>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Insured Company Name</label>
                        <input 
                          type="text" 
                          value={formData.insuredCompanyName || ''}
                          onChange={(e) => setFormData({...formData, insuredCompanyName: e.target.value})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-medium outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">No. of Employees</label>
                        <input 
                          type="number" 
                          value={formData.numberOfEmployees || 0}
                          onChange={(e) => setFormData({...formData, numberOfEmployees: Number(e.target.value)})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-medium outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Sum Insured</label>
                        <input 
                          type="number" 
                          value={formData.sumInsured || 0}
                          onChange={(e) => setFormData({...formData, sumInsured: Number(e.target.value)})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-black outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">TPA Name</label>
                        <input 
                          type="text" 
                          value={formData.tpaName || ''}
                          onChange={(e) => setFormData({...formData, tpaName: e.target.value})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-medium outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Coverage Type</label>
                        <input 
                          type="text" 
                          value={formData.coverageType || ''}
                          onChange={(e) => setFormData({...formData, coverageType: e.target.value})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-medium outline-none"
                          placeholder="e.g. Group Health"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Intermediary ID</label>
                        <input 
                          type="text" 
                          value={formData.intermediaryId || ''}
                          onChange={(e) => setFormData({...formData, intermediaryId: e.target.value})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-medium outline-none"
                          placeholder="Broker ID"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Intermediary Name</label>
                        <input 
                          type="text" 
                          value={formData.intermediaryName || ''}
                          onChange={(e) => setFormData({...formData, intermediaryName: e.target.value})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-medium outline-none"
                          placeholder="Broker Name"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Industry Type</label>
                        <input 
                          type="text" 
                          value={formData.industryType || ''}
                          onChange={(e) => setFormData({...formData, industryType: e.target.value})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-medium outline-none"
                          placeholder="e.g. IT Services, Manufacturing"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* General Insurance Fields */}
                  {formData.subcategory === 'general_insurance' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-2 grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Briefcase className="w-3 h-3" /> Policy Scope
                        </label>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Coverage Period Description</label>
                        <input 
                          type="text" 
                          value={formData.policyPeriod || ''}
                          onChange={(e) => setFormData({...formData, policyPeriod: e.target.value})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-medium outline-none"
                          placeholder="e.g. Annual Property Coverage"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Policy Notes</label>
                        <textarea 
                          value={formData.notes || ''}
                          onChange={(e) => setFormData({...formData, notes: e.target.value})}
                          className="w-full px-4 py-3 bg-orange-50/30 border-none rounded-xl text-sm font-medium outline-none min-h-[100px]"
                          placeholder="Any specific terms or clauses..."
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="col-span-2 pt-4 border-t border-gray-100">
                    <label className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-4 block">Schedule & Financials</label>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Policy Start Date</label>
                    <input 
                      type="date" 
                      value={formData.billDate || ''}
                      onChange={(e) => setFormData({...formData, billDate: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Expiry Date</label>
                    <input 
                      type="date" 
                      value={formData.dueDate || ''}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none ring-1 ring-red-500/10 focus:ring-red-500/30"
                    />
                  </div>

                  <div className="col-span-2 pt-4 border-t border-gray-100">
                    <label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Expiry Alert Configuration
                    </label>
                    <div className="flex items-center gap-4 bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-700">Advance Alert (Days)</p>
                        <p className="text-[10px] text-gray-500 font-medium">How many days before expiry should we notify you?</p>
                      </div>
                      <div className="w-24">
                        <input 
                          type="number"
                          value={formData.reminderDays || 0}
                          onChange={(e) => setFormData({...formData, reminderDays: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm font-black text-center outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Total Premium (Inc. GST)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input 
                        type="number" 
                        required
                        value={formData.amount || 0}
                        onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                        className="w-full pl-8 pr-4 py-4 bg-orange-600 text-white border-none rounded-2xl text-xl font-black outline-none focus:ring-2 focus:ring-orange-400/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    onClick={() => setView('upload')}
                    className="py-4 text-gray-400 font-bold uppercase tracking-widest text-[11px] hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-[13px] hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : 'Save Record'}
                  </button>
                </div>
              </form>
            </div>

            {/* Preview Section */}
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm h-[800px] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-orange-600" />
                    Document Preview
                  </h3>
                  <div className="flex items-center gap-3">
                    <label 
                      htmlFor="replace-file-input"
                      className="text-orange-600 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
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
                    {previewUrl && (
                      <button 
                        onClick={() => downloadFile(previewUrl, selectedFile?.name || 'insurance_document.pdf')}
                        className="text-orange-600 text-xs font-bold hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    )}
                    <button 
                      onClick={() => window.open(previewUrl!, '_blank')}
                      className="text-orange-600 text-xs font-bold hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open in New Tab
                    </button>
                  </div>
                </div>
                <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden shadow-inner border border-gray-200">
                  {selectedFile?.type === 'application/pdf' ? (
                    <PdfViewer file={previewUrl!} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                       <img 
                        src={previewUrl!} 
                        alt="Policy Preview" 
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
        {previewingBill && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          >
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setPreviewingBill(null);
                fetchData();
              }}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-7xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[90vh]"
            >
              <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-orange-600 shadow-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{previewingBill.policyNumber}</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-none mt-1">
                      {previewingBill.insurerName} • {previewingBill.subcategory?.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  {user?.role !== 'INSURANCE_ENTRY' && (
                    <button 
                      onClick={() => handleEdit(previewingBill)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all border border-blue-200"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      const url = previewingBill.fileUrl || (previewingBill.attachments && previewingBill.attachments[0].url);
                      if (url) downloadFile(url, `${previewingBill.policyNumber}_policy.pdf`);
                    }}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-xl text-xs font-bold hover:bg-orange-100 transition-all border border-orange-200"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button 
                    onClick={() => setPreviewingBill(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-gray-50/50">
                {/* Details Section */}
                <div className="w-full lg:w-96 bg-white border-r border-gray-100 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Core Policy Information</h4>
                    <div className="space-y-4">
                      <DetailRow label="Insured Name" value={previewingBill.insuredName} />
                      <DetailRow label="Sum Insured" value={`₹${previewingBill.sumInsured?.toLocaleString() || '0'}`} />
                      <DetailRow label="Premium Amount" value={`₹${previewingBill.amount?.toLocaleString() || '0'}`} />
                      <DetailRow label="Expiry Date" value={previewingBill.dueDate} isHighlight />
                      <DetailRow label="Project" value={previewingBill.propertyName} />
                    </div>
                  </div>

                  {previewingBill.subcategory === 'vehicle_insurance' && (
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Vehicle Details</h4>
                      <div className="space-y-4">
                        <DetailRow label="Registration No." value={previewingBill.registrationNumber} />
                        <DetailRow label="Make & Model" value={`${previewingBill.vehicleMake || ''} ${previewingBill.vehicleModel || ''}`} />
                        <DetailRow label="MFG Year" value={previewingBill.manufacturingYear} />
                        <DetailRow label="Chassis Number" value={previewingBill.chassisNumber} mono />
                        <DetailRow label="Engine Number" value={previewingBill.engineNumber} mono />
                        <DetailRow label="IDV Value" value={`₹${previewingBill.idv?.toLocaleString() || '0'}`} />
                      </div>
                    </div>
                  )}

                  {previewingBill.subcategory === 'employee_insurance' && (
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Employee Details</h4>
                      <div className="space-y-4">
                        <DetailRow label="TPA Name" value={previewingBill.tpaName} />
                        <DetailRow label="No. of Employees" value={previewingBill.numberOfEmployees} />
                        <DetailRow label="No. of Dependents" value={previewingBill.numberOfDependents} />
                        <DetailRow label="Coverage Type" value={previewingBill.coverageType} />
                        <DetailRow label="Intermediary ID" value={previewingBill.intermediaryId} />
                        <DetailRow label="Intermediary Name" value={previewingBill.intermediaryName} />
                        <DetailRow label="Industry Type" value={previewingBill.industryType} />
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Payment & Receipt</h4>
                    <div className="space-y-4">
                      <DetailRow label="Receipt Date" value={previewingBill.receiptDate} />
                      <DetailRow label="Receipt Amount" value={`₹${previewingBill.receiptAmount?.toLocaleString() || '0'}`} />
                      <DetailRow label="Payment Mode" value={previewingBill.paymentMode} />
                      <DetailRow label="Paying Party" value={previewingBill.payingParty} />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Premium Breakdown</h4>
                    <div className="space-y-4">
                      <DetailRow label="OD Premium" value={formatPremium(previewingBill.ownDamagePremium)} />
                      <DetailRow label="TP Premium" value={formatPremium(previewingBill.thirdPartyPremium)} />
                      <DetailRow label="GST Amount" value={formatPremium(previewingBill.gstAmount)} />
                      <DetailRow label="Stamp Duty" value={formatPremium(previewingBill.stampDuty)} />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-50">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">System Metadata</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailRow label="Status" value={previewingBill.status} isHighlight />
                      <DetailRow label="Priority" value={previewingBill.priority} />
                      <DetailRow label="Submitted By" value={previewingBill.entered_by_name} />
                      <DetailRow label="Category" value={previewingBill.subcategory?.replace('_', ' ')} />
                    </div>
                  </div>

                  {previewingBill.notes && (
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Additional Notes</h4>
                      <p className="text-xs text-gray-600 leading-relaxed font-medium bg-gray-50 p-4 rounded-xl border border-gray-100 italic">
                        "{previewingBill.notes}"
                      </p>
                    </div>
                  )}

                  {/* Workflow Action Buttons in Preview */}
                  <div className="pt-6 border-t border-gray-100">
                    <div className="flex flex-wrap items-center gap-2">
                      {previewingBill.status === 'Pending' && (user?.role === 'VERIFIER' || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <button 
                          onClick={() => {
                            setWorkflowActionType('verify');
                            setWorkflowActionTitle('Verify Insurance Policy');
                            setIsVerificationModalOpen(true);
                          }}
                          className={cn(
                            "flex-1 min-w-[140px] px-4 py-3 rounded-full font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg bg-green-600 hover:bg-green-700 text-white shadow-green-500/25 hover:-translate-y-0.5 active:translate-y-0"
                          )}
                          title="Verify Policy"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Verify
                        </button>
                      )}

                      {previewingBill.status === 'Verified' && (user?.role === 'APPROVER' || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <button 
                          onClick={() => {
                            setWorkflowActionType('approve');
                            setWorkflowActionTitle('Approve Insurance Policy');
                            setIsVerificationModalOpen(true);
                          }}
                          className={cn(
                            "flex-1 min-w-[140px] px-4 py-3 rounded-full font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0"
                          )}
                          title="Approve Policy"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Approve
                        </button>
                      )}

                      {previewingBill.status === 'Approved' && (user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'DATA_ENTRY') && (
                        <button 
                          onClick={() => {
                            setWorkflowActionType('initiate');
                            setWorkflowActionTitle('Initiate Payment');
                            setIsVerificationModalOpen(true);
                          }}
                          className={cn(
                            "flex-1 min-w-[140px] px-4 py-3 rounded-full font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg bg-orange-600 hover:bg-orange-700 text-white shadow-orange-500/25 hover:-translate-y-0.5 active:translate-y-0"
                          )}
                          title="Initiate Payment"
                        >
                          <CreditCard className="w-4 h-4" />
                          Initiate
                        </button>
                      )}

                      {previewingBill.status === 'Payment Initiated' && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <button 
                          onClick={() => {
                            setWorkflowActionType('confirm');
                            setWorkflowActionTitle('Confirm Payment');
                            setIsVerificationModalOpen(true);
                          }}
                          className={cn(
                            "flex-1 min-w-[140px] px-4 py-3 rounded-full font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/25 hover:-translate-y-0.5 active:translate-y-0"
                          )}
                          title="Confirm Payment"
                        >
                          <CheckSquare className="w-4 h-4" />
                          Confirm
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setPreviewingBill(null);
                          fetchData();
                        }}
                        className="flex-1 min-w-[120px] px-8 py-3 bg-gray-900 text-white rounded-full font-black text-[11px] uppercase tracking-wider transition-all hover:bg-black active:scale-95 shadow-xl flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Close
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                  {previewingBill.fileUrl || (previewingBill.attachments && previewingBill.attachments.length > 0) ? (
                    (previewingBill.fileUrl || previewingBill.attachments![0].url)?.toLowerCase().endsWith('.pdf') ? (
                      <PdfViewer file={previewingBill.fileUrl || previewingBill.attachments![0].url} />
                    ) : (
                      <div className="relative group">
                        <img 
                          src={previewingBill.fileUrl || previewingBill.attachments![0].url} 
                          alt="Policy Document" 
                          className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl ring-1 ring-gray-200"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
                      </div>
                    )
                  ) : (
                    <div className="text-center p-12 bg-white rounded-3xl border-2 border-dashed border-gray-100 max-w-sm">
                      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                        <FileText className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-tight">No document attached to this entry</p>
                      <p className="text-xs text-gray-400 mt-2">Only submission details are available for this record.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Delete Policy Record"
        message="Are you sure you want to delete this insurance policy? This action will permanently remove the record and any associated documents."
      />

      {isVerificationModalOpen && previewingBill && (
        <WorkflowModal
          isOpen={isVerificationModalOpen}
          onClose={() => {
            setIsVerificationModalOpen(false);
          }}
          bill={previewingBill}
          actionType={workflowActionType}
          title={workflowActionTitle}
          onConfirm={async (remarks, proofFile, extraDetails) => {
            if (!previewingBill) return;
            const id = previewingBill.id || (previewingBill as any)._id;
            try {
              let proofUrl = '';
              let proofName = '';

              if (proofFile) {
                const formData = new FormData();
                formData.append('files', proofFile);
                const uploadRes = await api.uploadFiles(formData);
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
              setPreviewingBill(updatedBill);
              setIsVerificationModalOpen(false);
            } catch (err) {
              toast.error(`Failed to ${workflowActionType} policy`);
              throw err;
            }
          }}
          onReject={async (remarks) => {
            if (!previewingBill) return;
            const id = previewingBill.id || (previewingBill as any)._id;
            try {
              const updatedBill = await api.rejectBill(id, remarks, user?.name, user?.role);
              toast.success("Bill rejected successfully");
              setPreviewingBill(updatedBill);
              setIsVerificationModalOpen(false);
            } catch (err) {
              toast.error("Failed to reject bill");
              throw err;
            }
          }}
        />
      )}
    </div>
  );
};
