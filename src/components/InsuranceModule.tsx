import React, { useState, useEffect, useMemo } from 'react';
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
  CheckSquare,
  User,
  Hash,
  Phone,
  Wifi,
  Globe,
  Building,
  Building2,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { Bill, Project, WORKFLOW_STATUSES, ModuleProps } from '../types';
import { cn, downloadFile } from '../utils';
import { Type } from "@google/genai";
import { generateContentWithRetry } from '../services/geminiService';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import { PdfViewer } from './PdfViewer';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { BillDetailsDrawer } from './BillDetailsDrawer';
import { PaymentModal } from './PaymentModal';
import { WorkflowModal } from './WorkflowModal';
import { Filters } from './Filters';
import { TallyEntryForm } from './TallyEntryForm';
import { X } from 'lucide-react';



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

export const InsuranceModule: React.FC<ModuleProps> = ({ projects: propsProjects, isLoadingProjects, allBills: propsBills }) => {
  const { user } = useAuth();
  
  const insuranceTypes = ['Insurance', 'Vehicle Insurance', 'Employee Insurance', 'General Insurance', 'Labour Insurance', 'Asset Insurance'];
  
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
    propsBills ? normalizeBills(propsBills.filter(b => insuranceTypes.includes(b.utilityType))) : [], 
    [propsBills]
  );

  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [projects, setProjects] = useState<Project[]>(propsProjects || []);
  const [isLoading, setIsLoading] = useState(!propsBills || !propsProjects);
  const [isExtracting, setIsExtracting] = useState(false);
  const extractionAbortController = React.useRef<AbortController | null>(null);
  const [duplicateFound, setDuplicateFound] = useState<Bill | null>(null);
  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);
  const [selectedBillForTally, setSelectedBillForTally] = useState<Bill | null>(null);
  const [view, setView] = useState<'list' | 'upload' | 'form'>('list');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<Bill | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [workflowActionType, setWorkflowActionType] = useState<'verify' | 'approve' | 'initiate' | 'confirm' | 'tally'>('verify');
  const [workflowActionTitle, setWorkflowActionTitle] = useState('');
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const [duplicateMessage, setDuplicateMessage] = useState<string>('');
  const [billingCompanies, setBillingCompanies] = useState<string[]>([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    property: '',
    company: '',
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
    customPropertyName: '',
    customCompanyName: '',
    customInsurerName: '',
    customStatus: '',
    customPaymentMode: '',
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

  // Real-time duplicate check
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const performCheck = async () => {
      if (view === 'form' && formData.policyNumber) {
        try {
          const res = await api.checkDuplicate({
            ...formData,
            utilityType: 'Insurance',
            id: formData.id || (formData as any)._id
          });
          setIsDuplicate(res.duplicate);
          setDuplicateMessage(res.message || '');
        } catch (err) {
          console.error("Duplicate check error:", err);
        }
      } else {
        setIsDuplicate(false);
        setDuplicateMessage('');
      }
    };

    if (view === 'form') {
      timeoutId = setTimeout(performCheck, 500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [formData.policyNumber, view]);

  const subcategories = [
    { id: 'vehicle_insurance', label: 'Vehicle Insurance', icon: Car, color: 'text-orange-500' },
    { id: 'employee_insurance', label: 'Employee Insurance', icon: Users, color: 'text-orange-500' },
    { id: 'general_insurance', label: 'General Insurance', icon: Briefcase, color: 'text-orange-500' },
  ];

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const insurers = [
    "ICICI Lombard",
    "National Insurance",
    "UIIC",
    "HDFC ERGO",
    "Star Health",
    "LIC",
    "Tata AIG",
    "Reliance General",
    "Other"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => (currentYear - 5 + i).toString());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const properties = useMemo(() => 
    Array.from(new Set(projects.map(p => p.name))),
    [projects]
  );

  useEffect(() => {
    if (propsBills) {
      setBills(normalizeBills(propsBills.filter(b => insuranceTypes.includes(b.utilityType))));
    }
  }, [propsBills]);

  useEffect(() => {
    if (propsProjects) {
      setProjects(propsProjects);
    }
  }, [propsProjects]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const fetchedCompanies = await api.getCompanies();
      setBillingCompanies(fetchedCompanies.filter(c => c.status === 'Active').map(c => c.companyName));
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  };

  useEffect(() => {
    if (!propsBills || !propsProjects) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [propsBills, propsProjects]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allBills, fetchedProjects] = await Promise.all([
        api.getBills(),
        !propsProjects ? api.getProjects() : Promise.resolve(propsProjects)
      ]);
      const insuranceTypes = ['Insurance', 'Vehicle Insurance', 'Employee Insurance', 'General Insurance', 'Labour Insurance', 'Asset Insurance'];
      setBills(normalizeBills(allBills.filter(b => insuranceTypes.includes(b.utilityType))));
      if (!propsProjects) {
        setProjects(fetchedProjects);
      }
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
    setSelectedBillForDetails(null);
    setIsDetailsModalOpen(false);
    const url = bill.fileUrl || (bill.attachments && bill.attachments[0]?.url) || null;
    setPreviewUrl(url);
    setView('form');
  };

  const filteredBills = bills.filter(bill => {
    const matchesProject = !filters.property || bill.propertyName === filters.property;
    const matchesCompany = !filters.company || bill.companyName === filters.company;
    const matchesSubcategory = !filters.billType || 
      bill.subcategory === filters.billType || 
      bill.utilityType === filters.billType ||
      subcategories.find(s => s.label === filters.billType)?.id === bill.subcategory;
    
    let matchesStatus = true;
    if (filters.status === 'IN_PROGRESS') {
      matchesStatus = !['Payment Confirmed', 'Tally Entry', 'Paid'].includes(bill.status || '');
    } else if (filters.status === 'COMPLETED') {
      matchesStatus = ['Payment Confirmed', 'Tally Entry', 'Paid'].includes(bill.status || '');
    } else if (filters.status) {
      matchesStatus = bill.status === filters.status;
    }

    const matchesSearch = !filters.search || 
      bill.propertyName.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.policyNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.insuredName?.toLowerCase().includes(filters.search.toLowerCase());
    
    // Month & Year filtering
    const bDate = bill.billDate ? new Date(bill.billDate) : null;
    const billMonth = bDate ? monthNames[bDate.getMonth()] : bill.month;
    const billYear = bDate ? bDate.getFullYear().toString() : bill.year;
    
    const matchesMonth = !selectedMonth || billMonth === selectedMonth;
    const matchesYear = !selectedYear || billYear === selectedYear;
    
    return matchesProject && matchesCompany && matchesSubcategory && matchesStatus && matchesSearch && matchesMonth && matchesYear;
  }).sort((a, b) => {
    const dateA = a.submissionDateTime || a.createdAt || '';
    const dateB = b.submissionDateTime || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  const checkDuplicate = (data: Partial<Bill>, currentBills: Bill[]) => {
    return currentBills.find(eb => {
      if (data.id && (eb.id === data.id || eb._id === data.id)) return false;
      if (data._id && (eb.id === data._id || eb._id === data._id)) return false;

      const samePolicy = (eb.policyNumber && data.policyNumber && eb.policyNumber === data.policyNumber);
      const samePeriod = (eb.billDate === data.billDate && eb.dueDate === data.dueDate);
      
      return samePolicy || (samePeriod && eb.amount === data.amount);
    });
  };

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
      await api.deleteBill(itemToDelete, user ? { name: user.name, role: user.role } : undefined);
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
    
    // Create new abort controller
    if (extractionAbortController.current) {
      extractionAbortController.current.abort();
    }
    extractionAbortController.current = new AbortController();
    const signal = extractionAbortController.current.signal;
    
    try {
      // 1. Upload for permanent storage
      const formDataUpload = new FormData();
      formDataUpload.append('files', selectedFile);
      const uploadRes = await api.uploadInsurance(formDataUpload, signal);
      
      if (signal.aborted) return;
      
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

      if (signal.aborted) return;

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
      
      const newFormData: Partial<Bill> = {
        ...formData,
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
        status: formData.status || 'Pending',
        priority: formData.priority || 'Normal'
      };

      setFormData(newFormData);

      // Check for duplicate
      const duplicate = checkDuplicate(newFormData, bills);
      if (duplicate) {
        setDuplicateFound(duplicate);
        toast.error('Warning: A duplicate entry for this policy was detected!', { 
          id: 'duplicate-alert',
          duration: 6000 
        });
      } else {
        setDuplicateFound(null);
      }

      toast.success(`Detected ${extracted.subcategory?.replace('_', ' ')}! Data extracted.`, { id: 'extraction' });
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
    setDuplicateFound(null);
    toast.dismiss('extraction');
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
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const isUpdate = !!(formData.id || formData._id);
      
      const bDate = formData.billDate ? new Date(formData.billDate) : new Date();
      const month = monthNames[bDate.getMonth()];
      const year = bDate.getFullYear().toString();

      const billToSave: Partial<Bill> = {
        ...formData,
        propertyName: formData.propertyName === 'Other' ? formData.customPropertyName : formData.propertyName,
        companyName: formData.companyName === 'Other' ? formData.customCompanyName : formData.companyName,
        insurerName: formData.insurerName === 'Other' ? formData.customInsurerName : formData.insurerName,
        status: formData.status === 'Other' ? formData.customStatus as any : formData.status,
        paymentMode: formData.paymentMode === 'Other' ? formData.customPaymentMode : formData.paymentMode,
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

      await api.saveBill(billToSave, user ? { name: user.name, role: user.role } : undefined);
      toast.success(isUpdate ? 'Insurance record updated successfully!' : 'Insurance record saved successfully!');
      setView('list');
      fetchData();
    } catch (err) {
      toast.error('Failed to save insurance record');
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (action: 'view' | 'add' | 'edit' | 'delete' | 'approve' | 'initiate' | 'confirm') => {
    if (user?.role === 'ADMIN') return true;
    if (user?.permissions && user.permissions.insurance) {
      return user.permissions.insurance[action];
    }
    // Default fallback logic for specific roles
    if (action === 'add') return user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'INSURANCE_ENTRY' || user?.role === 'ACCOUNT_MANAGEMENT';
    if (action === 'initiate') return user?.role === 'ADMIN' || user?.role === 'ACCOUNT_MANAGEMENT';
    if (action === 'confirm') return user?.role === 'ADMIN' || user?.role === 'ACCOUNT_MANAGEMENT';
    if (action === 'view') return true;
    return user?.role === 'ADMIN'; 
  };

  const canAdd = hasPermission('add');
  const canEdit = user?.role === 'ADMIN';
  const canDelete = user?.role === 'ADMIN';
  const canApprove = user?.role === 'ADMIN';
  const canInitiatePayment = hasPermission('initiate');
  const canConfirmPayment = hasPermission('confirm');

  return (
    <div className="p-0 space-y-6 max-w-full">
      {/* Hub Header - Only show in list view */}
      {view === 'list' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-t-[2rem] border-x border-t border-gray-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
              Insurance Hub
              <div className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full cursor-help">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
              </div>
            </h1>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3 w-full max-w-3xl">
            <div className="relative">
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
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
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
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
                resetForm();
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
                companies={billingCompanies}
                isLoading={isLoading || isLoadingProjects}
                data={bills}
                countData={{
                  total: filteredBills.length,
                  totalAmount: filteredBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
                  inProgress: filteredBills.filter(b => !['Payment Confirmed', 'Tally Entry', 'Paid', 'Rejected'].includes(b.status || '')).length,
                  paid: filteredBills.filter(b => ['Payment Confirmed', 'Tally Entry', 'Paid'].includes(b.status || '')).length
                }}
                options={{
                  billTypes: subcategories.map(s => s.label)
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
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800">Policy Details</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800">Total SI</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800">Valid Until</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-center">Premium</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800 transition-colors">
                    {isLoading ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={8} className="py-6 px-6"><div className="h-8 w-full bg-gray-50 dark:bg-slate-800/10 rounded"></div></td>
                        </tr>
                      ))
                    ) : filteredBills.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-32 text-center">
                          <History className="w-12 h-12 opacity-10 mx-auto" />
                          <p className="font-bold text-lg mt-3">No insurance records found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredBills.map((bill, index) => {
                        const subCat = subcategories.find(s => s.id === bill.subcategory) || subcategories[2];
                        const isExpired = new Date(bill.dueDate) < new Date();
                        return (
                          <tr key={bill.id || bill._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
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
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-gray-800 dark:text-white transition-colors">{bill.propertyName}</span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest transition-colors">{bill.companyName}</span>
                              </div>
                            </td>
                            <td className="py-5 px-6">
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-gray-800 dark:text-white transition-colors">{bill.policyNumber}</span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest transition-colors">
                                  {bill.insurerName} - {bill.insuredName}
                                  <span className={cn("ml-2 inline-flex items-center", subCat.color)} title={subCat.label}>
                                    <subCat.icon className="w-3 h-3" />
                                  </span>
                                </span>
                              </div>
                            </td>
                            <td className="py-5 px-6">
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-gray-900 dark:text-white transition-colors tabular-nums">
                                  {bill.sumInsured ? `₹${bill.sumInsured.toLocaleString()}` : bill.idv ? `₹${bill.idv.toLocaleString()}` : '—'}
                                </span>
                                <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter opacity-70">SI Value</span>
                              </div>
                            </td>
                            <td className="py-5 px-6">
                              <div className="flex flex-col">
                                <span className={cn("text-sm font-bold transition-colors", isExpired ? "text-red-500" : "text-gray-700 dark:text-slate-200")}>{bill.dueDate}</span>
                                {isExpired && (
                                  <span className="text-[9px] text-red-500 font-black uppercase tracking-widest mt-1">Expired</span>
                                )}
                              </div>
                            </td>
                            <td className={cn(
                              "py-5 px-6 text-center text-sm font-black tabular-nums transition-colors",
                              (bill.amount || 0) < 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                            )}>
                              ₹{bill.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-5 px-6 text-right">
                              <div className="flex items-center justify-end gap-1 transition-all">
                                {canEdit && (
                                  <button 
                                    onClick={() => handleEdit(bill)}
                                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => {
                                    setSelectedBillForDetails(bill);
                                    setIsDetailsModalOpen(true);
                                  }}
                                  className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                
                                {canDelete && (
                                  <button 
                                    onClick={() => handleDelete(bill.id || bill._id!)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
                                    className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
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

            {/* Mobile Card View */}
            <div className="lg:hidden flex-1 overflow-y-auto p-4 space-y-4 transition-colors">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="p-4 bg-white dark:bg-slate-900 border border-border-light rounded-2xl shadow-sm space-y-4">
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
                <div className="py-20 text-center transition-colors">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-gray-200" />
                  </div>
                  <h3 className="text-lg font-black text-text-primary">No policies found</h3>
                  <button onClick={() => setView('upload')} className="mt-4 text-orange-500 font-black text-xs uppercase tracking-widest text-[11px]">Add Policy</button>
                </div>
              ) : (
                filteredBills.map((bill) => {
                  const subCat = subcategories.find(s => s.id === bill.subcategory) || subcategories[2];
                  const isExpired = new Date(bill.dueDate) < new Date();
                  return (
                    <div 
                      key={bill.id || bill._id} 
                      className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-border-light shadow-sm space-y-5 transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                           <div className={cn("p-2.5 rounded-2xl transition-colors", subCat.color, "bg-gray-50 dark:bg-slate-800")}>
                            <subCat.icon className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <p className="text-sm font-black text-text-primary leading-tight transition-colors">{bill.policyNumber}</p>
                            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5 transition-colors">{bill.insurerName}</p>
                          </div>
                        </div>
                        {isExpired && (
                          <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-100 transition-colors">Expired</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-y-4 pt-2">
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 transition-colors">Insured Name</p>
                          <p className="text-sm font-bold text-text-primary transition-colors truncate max-w-full">{bill.insuredName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 transition-colors">Premium</p>
                          <p className={cn(
                            "text-lg font-black tabular-nums transition-colors",
                            (bill.amount || 0) < 0 ? "text-red-600 dark:text-red-400" : "text-text-primary"
                          )}>
                            ₹{bill.amount?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 transition-colors">Total Sum Insured</p>
                          <p className="text-sm font-black text-text-primary tabular-nums transition-colors">
                            {bill.sumInsured ? `₹${bill.sumInsured.toLocaleString()}` : bill.idv ? `₹${bill.idv.toLocaleString()}` : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 transition-colors">Valid Until</p>
                          <p className={cn("text-xs font-bold transition-colors", isExpired ? "text-red-500" : "text-text-primary")}>{bill.dueDate}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-4 border-t border-gray-50 dark:border-slate-800 transition-colors">
                        <button 
                          onClick={() => {
                            setSelectedBillForDetails(bill);
                            setIsDetailsModalOpen(true);
                          }}
                          className="flex-1 py-3 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        {canEdit && (
                          <button 
                             onClick={() => handleEdit(bill)}
                             className="flex-1 py-3 bg-text-primary text-white dark:bg-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {view === 'upload' && (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col gap-6 max-w-2xl mx-auto py-12"
          >
            <button 
              onClick={() => setView('list')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-bold transition-colors w-fit px-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to List</span>
            </button>
            <div className="bg-white dark:bg-slate-950 p-12 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800 flex flex-col items-center text-center space-y-6 transition-colors">
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
                <div className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-2xl flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm transition-colors">
                      <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="text-left font-sans">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px] transition-colors">{selectedFile.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold tracking-widest uppercase transition-colors">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExtracting ? (
                      <button 
                        onClick={handleRemoveFile}
                        className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-red-200 transition-all font-sans"
                      >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cancel
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={handleRemoveFile}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={handleExtract}
                          className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-orange-200 transition-all font-sans"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Detect & Extract
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              <button onClick={() => setView('list')} className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-gray-600 transition-colors">Cancel</button>
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
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">Verify Insurance Policy</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 italic tracking-widest">
                      {formData.subcategory?.replace('_', ' ')} Details
                    </p>
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
                  disabled={isLoading || isDuplicate}
                  className={cn(
                    "px-8 py-3 bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 flex items-center gap-2 font-mono",
                    (isLoading || isDuplicate) && "opacity-70 cursor-not-allowed"
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
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Insurance Category (Non-Changeable)</label>
                      <div className="grid grid-cols-3 gap-3">
                        {subcategories.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            disabled
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-not-allowed",
                              formData.subcategory === cat.id 
                                ? "bg-orange-50 border-orange-600 ring-4 ring-orange-100 dark:ring-orange-900/20" 
                                : "bg-gray-50 dark:bg-slate-800 border-transparent opacity-50"
                            )}
                          >
                            <cat.icon className={cn("w-5 h-5", formData.subcategory === cat.id ? "text-orange-600" : "text-gray-400")} />
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider", formData.subcategory === cat.id ? "text-orange-700 dark:text-orange-400" : "text-gray-500")}>
                              {cat.label.split(' ')[0]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Project / Property Name *</label>
                        <div className="space-y-2">
                          <select 
                            required
                            value={formData.propertyName || ''}
                            onChange={(e) => setFormData({...formData, propertyName: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-orange-500 appearance-none cursor-pointer h-[48px]"
                          >
                            <option value="">Select Project</option>
                            {projects.map(p => <option key={p.id || p._id} value={p.name}>{p.name}</option>)}
                            <option value="Other">Other</option>
                          </select>
                          {formData.propertyName === 'Other' && (
                            <input
                              type="text"
                              placeholder="Enter Project Name"
                              value={formData.customPropertyName || ''}
                              onChange={(e) => setFormData({...formData, customPropertyName: e.target.value})}
                              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/30 rounded-lg text-sm outline-none focus:ring-1 focus:ring-orange-500"
                              required
                            />
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Select Company *</label>
                        <div className="space-y-2">
                          <select 
                            value={formData.companyName || ''}
                            onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-orange-500 appearance-none h-[48px]"
                            required
                          >
                            <option value="">Select Company</option>
                            {billingCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="Other">Other</option>
                          </select>
                          {formData.companyName === 'Other' && (
                            <input
                              type="text"
                              placeholder="Enter Company Name"
                              value={formData.customCompanyName || ''}
                              onChange={(e) => setFormData({...formData, customCompanyName: e.target.value})}
                              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/30 rounded-lg text-sm outline-none focus:ring-1 focus:ring-orange-500"
                              required
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Insurer Name *</label>
                        <div className="space-y-2">
                          <select 
                            value={formData.insurerName || ''}
                            onChange={(e) => setFormData({...formData, insurerName: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-orange-500 appearance-none h-[48px]"
                            required
                          >
                            <option value="">Select Insurer</option>
                            {insurers.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          {formData.insurerName === 'Other' && (
                            <input
                              type="text"
                              placeholder="Enter Insurer Name"
                              value={formData.customInsurerName || ''}
                              onChange={(e) => setFormData({...formData, customInsurerName: e.target.value})}
                              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/30 rounded-lg text-sm outline-none focus:ring-1 focus:ring-orange-500"
                              required
                            />
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Policy Number</label>
                        <input 
                          type="text" 
                          value={formData.policyNumber || ''}
                          onChange={(e) => setFormData({...formData, policyNumber: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Status *</label>
                        <div className="space-y-2">
                          <select 
                            value={formData.status || ''}
                            onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-orange-500 appearance-none h-[48px] transition-colors"
                            required
                          >
                            <option value="">Select Status</option>
                            <option value="Active">Active</option>
                            {WORKFLOW_STATUSES.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                            <option value="Expired">Expired</option>
                            <option value="Canceled">Canceled</option>
                            <option value="Other">Other</option>
                          </select>
                          {formData.status === 'Other' && (
                            <input
                              type="text"
                              placeholder="Enter Custom Status"
                              value={formData.customStatus || ''}
                              onChange={(e) => setFormData({...formData, customStatus: e.target.value})}
                              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/30 rounded-lg text-sm outline-none focus:ring-1 focus:ring-orange-500"
                              required
                            />
                          )}
                        </div>
                      </div>
                    </div>
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
                            <div className="space-y-2">
                              <select 
                                value={formData.paymentMode || ''}
                                onChange={(e) => setFormData({...formData, paymentMode: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none"
                              >
                                <option value="">Select Mode</option>
                                <option value="Online">Online</option>
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Cheque">Cheque</option>
                                <option value="RTGS">RTGS/NEFT</option>
                                <option value="Other">Other</option>
                              </select>
                              {formData.paymentMode === 'Other' && (
                                <input
                                  type="text"
                                  placeholder="Enter Payment Mode"
                                  value={formData.customPaymentMode || ''}
                                  onChange={(e) => setFormData({...formData, customPaymentMode: e.target.value})}
                                  className="w-full px-4 py-2 bg-white border border-orange-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-orange-500"
                                  required
                                />
                              )}
                            </div>
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

                  <div className="grid grid-cols-2 gap-6">
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

                  {isDuplicate && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-xs font-bold">{duplicateMessage || "This policy appears to be a duplicate."}</p>
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
                      <PdfViewer file={previewUrl} className="w-full h-full pointer-events-none" />
                    ) : (
                      <img src={previewUrl} alt="Bill Document" className="w-full h-full object-contain" />
                    )
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-6 text-center transition-colors">
                    <Eye className="w-10 h-10 mb-2" />
                    <p className="text-sm font-black uppercase tracking-widest tracking-[0.2em]">Preview Document</p>
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
          handleEdit(bill);
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
          setWorkflowActionTitle('Verify Insurance Policy');
          setIsVerificationModalOpen(true);
        }}
        onApprove={(bill) => {
          setSelectedBillForDetails(bill);
          setWorkflowActionType('approve');
          setWorkflowActionTitle('Approve Insurance Policy');
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
              toast.error(`Failed to ${workflowActionType} record`);
              throw err;
            }
          }}
          onReject={async (remarks) => {
            if (!selectedBillForDetails) return;
            const id = selectedBillForDetails.id || (selectedBillForDetails as any)._id;
            try {
              const updatedBill = await api.rejectBill(id, remarks, user?.name, user?.role);
              toast.success("Policy rejected successfully");
              setSelectedBillForDetails(updatedBill);
              setBills(prev => prev.map(b => (b.id === id || (b as any)._id === id) ? updatedBill : b));
              setIsVerificationModalOpen(false);
            } catch (err) {
              toast.error("Failed to reject policy");
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
        title="Delete Insurance Policy"
        message="Are you sure you want to delete this insurance policy? This action will permanently remove the record from the database."
      />
    </div>
  );
};
