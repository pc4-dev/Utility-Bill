import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  CreditCard, 
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
  Calendar,
  IndianRupee,
  ShieldCheck,
  Building,
  Info,
  Trash2,
  ChevronDown,
  CheckSquare,
  User,
  Hash,
  Phone,
  Wifi,
  Briefcase,
  Globe,
  Zap,
  Clock,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { Bill, Project, UtilityType, WORKFLOW_STATUSES, ModuleProps } from '../types';
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

export const GovernmentBillsModule: React.FC<ModuleProps> = ({ projects: propsProjects, isLoadingProjects, allBills: propsBills }) => {
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
    propsBills ? normalizeBills(propsBills.filter(b => b.utilityType === 'Property Tax (MCG)' || b.utilityType === 'Diversion Tax (RD)')) : [], 
    [propsBills]
  );

  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [projects, setProjects] = useState<Project[]>(propsProjects || []);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const extractionAbortController = React.useRef<AbortController | null>(null);
  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);
  const [selectedBillForTally, setSelectedBillForTally] = useState<Bill | null>(null);
  const [view, setView] = useState<'list' | 'upload' | 'form'>('list');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Type detection
  const [detectedType, setDetectedType] = useState<'Property Tax (MCG)' | 'Diversion Tax (RD)' | null>(null);
  const [pendingUploadType, setPendingUploadType] = useState<'Property Tax (MCG)' | 'Diversion Tax (RD)' | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    property: '',
    company: '',
    status: '',
    date: '',
    startDate: '',
    endDate: '',
    region: '', // Real Region/District
    type: 'All', // Used for SubModule/Type (Property/Diversion)
    year: '',
    month: ''
  });
  
  const [formData, setFormData] = useState<Partial<Bill>>({
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

  // Real-time duplicate check
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const performCheck = async () => {
      const canCheck = formData.billNumber && formData.serviceProvider;
      if (view === 'form' && canCheck) {
        try {
          const res = await api.checkDuplicate({
            ...formData,
            utilityType: 'Government Bill',
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
  }, [formData.billNumber, formData.serviceProvider, view]);

  const [selectedBillForDetails, setSelectedBillForDetails] = useState<Bill | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [workflowActionType, setWorkflowActionType] = useState<'verify' | 'approve' | 'initiate' | 'confirm' | 'tally'>('verify');
  const [workflowActionTitle, setWorkflowActionTitle] = useState('');
  const [duplicateFound, setDuplicateFound] = useState<boolean>(false);
  const [duplicateMessage, setDuplicateMessage] = useState<string>('');
  const [companies, setCompanies] = useState<string[]>([]);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  
  useEffect(() => {
    const handleExtracted = (e: any) => {
      const data = e.detail;
      if (data.jobId === activeJobId || !activeJobId) {
        setIsExtracting(false);
        setActiveJobId(null);
        
        const extractedData = data.data;
        const typeResult = data.utilityType;
        
        setDetectedType(typeResult);
        setFormData(prev => ({
          ...prev,
          utilityType: typeResult,
          status: 'Paid',
          priority: 'Normal',
          amount: extractedData.paidAmount || extractedData.netAmount || extractedData.amount || 0,
          billDate: extractedData.paymentDate || extractedData.billDate || new Date().toISOString().split('T')[0],
          dueDate: extractedData.dueDate || new Date().toISOString().split('T')[0],
          // Preserve manually selected values
          propertyName: prev.propertyName || '',
          companyName: prev.companyName || '',
          ...extractedData,
          billingPeriod: extractedData.billingPeriod || extractedData.assessmentYear || extractedData.challanPeriod || ''
        }));

        setView('form');
      }
    };

    window.addEventListener('bill:extracted', handleExtracted);
    return () => window.removeEventListener('bill:extracted', handleExtracted);
  }, [activeJobId]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => (currentYear - 5 + i).toString());

  const properties = useMemo(() => 
    Array.from(new Set(projects.map(p => p.name))),
    [projects]
  );

  useEffect(() => {
    if (propsBills) {
      setBills(normalizeBills(propsBills.filter(b => b.utilityType === 'Property Tax (MCG)' || b.utilityType === 'Diversion Tax (RD)')));
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
      setCompanies(fetchedCompanies.filter(c => c.status === 'Active').map(c => c.companyName));
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

  // Auto-calculate Property Tax Total
  useEffect(() => {
    if (formData.utilityType === 'Property Tax (MCG)') {
      const calculatedTotal = 
        (formData.propertyTax || 0) + 
        (formData.educationCess || 0) + 
        (formData.samekit || 0) + 
        (formData.addSamekit || 0) + 
        (formData.urbanTax || 0) + 
        (formData.garbageCharges || 0) + 
        (formData.samSwach || 0) + 
        (formData.sewaKar || 0) + 
        (formData.vyapakSwachataKar || 0) + 
        (formData.penalty || 0) - 
        (formData.rebate || 0) - 
        (formData.advance || 0);
      
      if (formData.netAmount !== calculatedTotal || formData.amount !== calculatedTotal || formData.totalDemandAmount !== calculatedTotal) {
        setFormData(prev => ({
          ...prev,
          netAmount: calculatedTotal,
          amount: calculatedTotal,
          totalDemandAmount: calculatedTotal
        }));
      }
    }
  }, [
    formData.propertyTax,
    formData.educationCess,
    formData.samekit,
    formData.addSamekit,
    formData.urbanTax,
    formData.garbageCharges,
    formData.samSwach,
    formData.sewaKar,
    formData.vyapakSwachataKar,
    formData.penalty,
    formData.rebate,
    formData.advance,
    formData.utilityType
  ]);

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allBills, fetchedProjects] = await Promise.all([
        api.getBills(),
        !propsProjects ? api.getProjects() : Promise.resolve(propsProjects)
      ]);
      setBills(normalizeBills(allBills.filter(b => b.utilityType === 'Property Tax (MCG)' || b.utilityType === 'Diversion Tax (RD)')));
      if (!propsProjects) {
        setProjects(fetchedProjects);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const baseBills = bills.filter(bill => {
      const matchesProject = !filters.property || bill.propertyName === filters.property;
      const matchesCompany = !filters.company || bill.companyName === filters.company;
      const matchesYear = !filters.year || bill.year === filters.year;
      const matchesMonth = !filters.month || bill.month === filters.month;
      const matchesRegion = !filters.region || 
        bill.district?.toLowerCase().includes(filters.region.toLowerCase()) ||
        bill.address?.toLowerCase().includes(filters.region.toLowerCase());
      
      let matchesStatus = true;
      if (filters.status === 'IN_PROGRESS') {
        matchesStatus = !['Payment Confirmed', 'Tally Entry', 'Paid'].includes(bill.status || '');
      } else if (filters.status === 'COMPLETED') {
        matchesStatus = ['Payment Confirmed', 'Tally Entry', 'Paid'].includes(bill.status || '');
      } else if (filters.status) {
        matchesStatus = bill.status === filters.status;
      }

      const matchesSearch = !filters.search || 
        bill.propertyName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        bill.ownerName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        bill.depositorName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        bill.receiptNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
        bill.challanNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
        bill.billId?.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchesProject && matchesCompany && matchesYear && matchesMonth && matchesStatus && matchesSearch && matchesRegion;
    });

    return {
      total: baseBills.length,
      totalAmount: baseBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
      propertyCount: baseBills.filter(b => b.utilityType === 'Property Tax (MCG)').length,
      diversionCount: baseBills.filter(b => b.utilityType === 'Diversion Tax (RD)').length
    };
  }, [bills, filters]);

  const filteredBills = bills.filter(bill => {
    const matchesSubModule = filters.type === 'All' || bill.utilityType === filters.type;
    const matchesProject = !filters.property || bill.propertyName === filters.property;
    const matchesCompany = !filters.company || bill.companyName === filters.company;
    const matchesYear = !filters.year || bill.year === filters.year;
    const matchesMonth = !filters.month || bill.month === filters.month;
    const matchesRegion = !filters.region || 
      bill.district?.toLowerCase().includes(filters.region.toLowerCase()) ||
      bill.address?.toLowerCase().includes(filters.region.toLowerCase());
    
    let matchesStatus = true;
    if (filters.status === 'IN_PROGRESS') {
      matchesStatus = !['Payment Confirmed', 'Tally Entry', 'Paid'].includes(bill.status || '');
    } else if (filters.status === 'COMPLETED') {
      matchesStatus = ['Payment Confirmed', 'Tally Entry', 'Paid'].includes(bill.status || '');
    } else if (filters.status) {
      matchesStatus = bill.status === filters.status;
    }

    const matchesSearch = !filters.search || 
      bill.propertyName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.ownerName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.depositorName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.receiptNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.challanNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.billId?.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesSubModule && matchesProject && matchesCompany && matchesYear && matchesMonth && matchesStatus && matchesSearch && matchesRegion;
  }).sort((a, b) => {
    const dateA = a.submissionDateTime || a.createdAt || '';
    const dateB = b.submissionDateTime || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setView('upload');
      setDetectedType(null);
      setFormData({});
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

  const handleExtract = async (extractionType?: 'PROPERTY_TAX' | 'DIVERSION_TAX') => {
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
      const uploadRes = await api.uploadGovernmentBill(formDataUpload, signal);
      
      if (signal.aborted) return;
      
      const fileUrl = uploadRes.fileUrl;

      // 2. Extract client-side
      toast.loading(`Extracting ${pendingUploadType}...`, { id: 'extraction' });
      
      const fileData = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type;
      
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: fileData, mimeType: mimeType === "application/pdf" ? "application/pdf" : "image/jpeg" } }
          ]
        },
        config: {
          systemInstruction: `You are a data extraction specialist. Your task is to extract billing information from Indian Municipal Property Tax and Diversion Tax documents.
          
          ${extractionType ? `IMPORTANT: Extract data as ${extractionType === 'PROPERTY_TAX' ? 'Property Tax (Municipal Corporation Gwalior/Other)' : 'Diversion Tax (Revenue Department Cyber Treasury)'} specifically.` : ''}

          Strict Extraction Guidelines:
          - Extract ONLY the requested fields.
          - Do NOT extract or attempt to guess "Project Name" or "Company Name". Leave these empty.
          - Do NOT include full document text.
          - Limit any single string output (e.g., address, ownerName) to 200 characters.
          - If a value is missing, return null or 0 for numbers.
          - Return ONLY the JSON object.
          
          Specific Field Rules for Property Tax:
          - propertyId: "Property ID" or "Consumer ID".
          - receiptNumber: "Receipt No.", "Transaction ID", or "PC-" / "MCG-" IDs.
          - assessmentYear: "Assessment Year" or "Financial Year" (e.g., 2024-25).
          - billingPeriod: Extract assessment year or financial year as billing period (e.g., 2024-25).
          
          Numerical Fields:
          - propertyTax, urbanTax, educationCess, samekit, addSamekit, samagraCess, garbageCharges, samSwach, sewaKar, vyapakSwachataKar, totalTax, rebate, penalty, advance.
          - totalDemandAmount: "Total Demand" or "Net Total Before Payment".
          - paidAmount: "Paid Amount" or "Received Amount".
          - outstandingAmount: "Arrear Amount" or "Outstanding" or "Arrears".
          
          Payment Status/Details for Property Tax:
          - modeOfPayment: "Mode of Payment" (e.g., Cheque, Cash, Online, UPI).
          - chequeDate: "Cheque Date".
          - chequeNumber: "Cheque Number".
          - chequeBankName: "Cheque Bank Name".
          - upiReference: "UPI Ref No", "Transaction ID (for UPI)", or "Reference Number".
          - paymentDate: The date portion of "Date: 10-05-2025 16:25:56".
          - paymentTime: The time portion of "Date: 10-05-2025 16:25:56".

          Specific Field Rules for Diversion Tax:
          - depositorName: "Depositor/Dealer Name".
          - URN, challanNumber, CIN, CRN.
          - transactionDate: "Date of Transaction" or "Transaction Date".
          - transactionTime: "Time of Transaction" or "Transaction Time".
          - totalAmount, bankName, bankReferenceNumber.
          - modeOfPayment: "Payment Mode" or "Mode of Payment" (e.g., Internet Banking).
          - billingPeriod: "Challan Period" or "Period of Tax".`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: "One of 'PROPERTY_TAX' or 'DIVERSION_TAX'" },
              ownerName: { type: Type.STRING },
              address: { type: Type.STRING },
              propertyId: { type: Type.STRING },
              receiptNumber: { type: Type.STRING },
              zoneWard: { type: Type.STRING },
              propertyArea: { type: Type.STRING },
              mobileNumber: { type: Type.STRING },
              assessmentYear: { type: Type.STRING },
              propertyTax: { type: Type.NUMBER },
              educationCess: { type: Type.NUMBER },
              samekit: { type: Type.NUMBER },
              addSamekit: { type: Type.NUMBER },
              urbanTax: { type: Type.NUMBER },
              garbageCharges: { type: Type.NUMBER },
              samSwach: { type: Type.NUMBER },
              sewaKar: { type: Type.NUMBER },
              vyapakSwachataKar: { type: Type.NUMBER },
              samagraCess: { type: Type.NUMBER },
              totalTax: { type: Type.NUMBER },
              rebate: { type: Type.NUMBER },
              penalty: { type: Type.NUMBER },
              advance: { type: Type.NUMBER },
              totalDemandAmount: { type: Type.NUMBER },
              netAmount: { type: Type.NUMBER },
              paidAmount: { type: Type.NUMBER },
              outstandingAmount: { type: Type.NUMBER },
              modeOfPayment: { type: Type.STRING },
              upiReference: { type: Type.STRING },
              chequeDate: { type: Type.STRING },
              chequeNumber: { type: Type.STRING },
              chequeBankName: { type: Type.STRING },
              paymentDate: { type: Type.STRING },
              paymentTime: { type: Type.STRING },
              depositorName: { type: Type.STRING },
              district: { type: Type.STRING },
              challanPeriod: { type: Type.STRING },
              challanNumber: { type: Type.STRING },
              TIN: { type: Type.STRING },
              URN: { type: Type.STRING },
              CRN: { type: Type.STRING },
              CIN: { type: Type.STRING },
              bankName: { type: Type.STRING },
              bankReferenceNumber: { type: Type.STRING },
              totalAmount: { type: Type.NUMBER },
              amount: { type: Type.NUMBER },
              date: { type: Type.STRING },
              transactionDate: { type: Type.STRING },
              transactionTime: { type: Type.STRING },
              billingPeriod: { type: Type.STRING },
            }
          }
        }
      });

      if (signal.aborted) return;

      let responseText = response.text || "";
      // Strip markdown if present
      responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

      let extractedData: any;
      try {
        extractedData = JSON.parse(responseText || "{}");
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

      const mappedType = pendingUploadType || (extractedData.type === 'PROPERTY_TAX' ? 'Property Tax (MCG)' : 'Diversion Tax (RD)');
      setDetectedType(mappedType as any);

      setFormData(prev => ({
        ...prev,
        utilityType: mappedType,
        status: 'Paid',
        priority: 'Normal',
        ownerName: extractedData.ownerName || '',
        depositorName: extractedData.depositorName || '',
        // Preserving manually selected project/company names
        propertyName: prev.propertyName || '',
        customPropertyName: prev.customPropertyName || '',
        companyName: prev.companyName || '',
        customCompanyName: prev.customCompanyName || '',
        address: extractedData.address || '',
        propertyId: extractedData.propertyId || '',
        receiptNumber: extractedData.receiptNumber || '',
        zoneWard: extractedData.zoneWard || '',
        propertyArea: extractedData.propertyArea || '',
        mobileNumber: extractedData.mobileNumber || '',
        assessmentYear: extractedData.assessmentYear || '',
        propertyTax: extractedData.propertyTax || 0,
        educationCess: extractedData.educationCess || 0,
        samekit: extractedData.samekit || 0,
        addSamekit: extractedData.addSamekit || 0,
        urbanTax: extractedData.urbanTax || 0,
        garbageCharges: extractedData.garbageCharges || 0,
        samSwach: extractedData.samSwach || 0,
        sewaKar: extractedData.sewaKar || 0,
        vyapakSwachataKar: extractedData.vyapakSwachataKar || 0,
        samagraCess: extractedData.samagraCess || 0,
        totalTax: extractedData.totalTax || 0,
        rebate: extractedData.rebate || 0,
        penalty: extractedData.penalty || 0,
        advance: extractedData.advance || 0,
        totalDemandAmount: extractedData.totalDemandAmount || extractedData.netAmount || 0,
        netAmount: extractedData.netAmount || 0,
        paidAmount: extractedData.paidAmount || extractedData.totalAmount || extractedData.amount || 0,
        outstandingAmount: extractedData.outstandingAmount || 0,
        amount: extractedData.paidAmount || extractedData.totalAmount || extractedData.amount || 0,
        modeOfPayment: extractedData.modeOfPayment || '',
        upiReference: extractedData.upiReference || '',
        chequeDate: extractedData.chequeDate || '',
        chequeNumber: extractedData.chequeNumber || '',
        chequeBankName: extractedData.chequeBankName || '',
        paymentDate: extractedData.paymentDate || extractedData.transactionDate || extractedData.date || '',
        paymentTime: extractedData.paymentTime || extractedData.transactionTime || '',
        district: extractedData.district || '',
        challanPeriod: extractedData.challanPeriod || '',
        challanNumber: extractedData.challanNumber || '',
        TIN: extractedData.TIN || '',
        URN: extractedData.URN || '',
        CRN: extractedData.CRN || '',
        CIN: extractedData.CIN || '',
        scrollNumber: extractedData.scrollNumber || extractedData.scrollNo || '',
        scrollDate: extractedData.scrollDate || '',
        bankName: extractedData.bankName || '',
        bankReferenceNumber: extractedData.bankReferenceNumber || '',
        diversionTaxAmount: extractedData.diversionTaxAmount || extractedData.taxAmount || 0,
        totalAmount: extractedData.totalAmount || extractedData.diversionTaxAmount || extractedData.paidAmount || extractedData.amount || 0,
        transactionDate: extractedData.transactionDate || '',
        transactionTime: extractedData.transactionTime || '',
        billingPeriod: extractedData.billingPeriod || extractedData.assessmentYear || extractedData.challanPeriod || '',
        billDate: extractedData.date || new Date().toISOString().split('T')[0],
        fileUrl: fileUrl
      }));

      toast.success('Data extracted successfully', { id: 'extraction' });
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
    setDetectedType(null);
    setPendingUploadType(null);
    setFormData({
      reminderDays: 3,
      reminderDate: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let fileUrl = formData.fileUrl || '';
      if (selectedFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('files', selectedFile);
        const uploadRes = await api.uploadGovernmentBill(formDataUpload);
        fileUrl = uploadRes.fileUrl;
      }
      
      const isUpdate = !!(formData.id || formData._id);
      
      const bDate = formData.billDate ? new Date(formData.billDate) : new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthStr = monthNames[bDate.getMonth()];
      const yearStr = bDate.getFullYear().toString();

      if (duplicateFound) {
        toast.error('Cannot save duplicate bill');
        setIsLoading(false);
        return;
      }

      const billToSave: Partial<Bill> = {
        ...formData,
        category: 'government_tax' as const,
        subcategory: formData.utilityType === 'Property Tax (MCG)' ? 'property_tax' : 'diversion_tax',
        month: monthStr,
        year: yearStr,
        propertyName: formData.propertyName === 'Others' ? formData.customPropertyName : formData.propertyName,
        companyName: formData.companyName === 'Others' ? formData.customCompanyName : formData.companyName,
        fileUrl,
        submissionDateTime: formData.submissionDateTime || new Date().toISOString(),
        billId: formData.billId || (formData.utilityType === 'Property Tax (MCG)' ? formData.receiptNumber : formData.challanNumber) || `GOV-${Date.now().toString().slice(-6)}`,
        attachments: fileUrl 
          ? [{ url: fileUrl, name: selectedFile?.name || 'Bill', type: selectedFile?.type || 'image/jpeg' }] 
          : (formData.attachments || [])
      };

      await api.saveBill(billToSave as Bill, user ? { name: user.name, role: user.role } : undefined);
      toast.success(isUpdate ? 'Government bill updated successfully!' : 'Government bill saved successfully!');
      setView('list');
      fetchData();
    } catch (err: any) {
      console.error('Save error:', err);
      if (err.message?.includes('SESSION_REQUIRED')) {
        toast.error('Session timeout. Please try again in 2 seconds.');
        // establishment of session was already attempted in api.ts
      } else {
        toast.error('Failed to save bill');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (updatedBill: Bill) => {
    try {
      await api.saveBill(updatedBill, user ? { name: user.name, role: user.role } : undefined);
      toast.success('Payment recorded successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to update payment status');
    }
  };

  const handleEditBill = (bill: Bill) => {
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
    setDetectedType(bill.utilityType as any);
    const url = bill.fileUrl || (bill.attachments && bill.attachments[0]?.url) || null;
    setPreviewUrl(url);
    setView('form');
    setIsDetailsModalOpen(false);
  };

  const propertyTaxCount = bills.filter(b => b.utilityType === 'Property Tax (MCG)').length;
  const diversionTaxCount = bills.filter(b => b.utilityType === 'Diversion Tax (RD)').length;
  const allCount = bills.length;

  return (
    <div className="p-0 space-y-6 max-w-full">
      {/* Hub Header - Only show in list view */}
      {view === 'list' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-t-[2rem] border-x border-t border-gray-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
              Government Hub
              <div className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full cursor-help">
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
            </h1>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3 w-full max-w-3xl">
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
                setFormData({});
                setSelectedFile(null);
                setPreviewUrl(null);
                setDetectedType(null);
                setPendingUploadType('Property Tax (MCG)');
                setView('upload');
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-sans"
            >
              <Upload className="w-4 h-4" />
              Property Tax
            </button>

            <button 
              onClick={() => {
                setFormData({});
                setSelectedFile(null);
                setPreviewUrl(null);
                setDetectedType(null);
                setPendingUploadType('Diversion Tax (RD)');
                setView('upload');
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-xs hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 font-sans"
            >
              <Upload className="w-4 h-4" />
              Diversion Tax
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
                companies={companies}
                isLoading={isLoading || isLoadingProjects}
                data={bills}
                types={['Property Tax (MCG)', 'Diversion Tax (RD)']}
                countData={{
                  total: stats.total,
                  totalAmount: stats.totalAmount,
                  count3: stats.propertyCount,
                  count4: stats.diversionCount
                }}
                onCountClick={(type) => {
                  if (type === 'all') setFilters(prev => ({ ...prev, type: 'All' }));
                  if (type === 'count3') setFilters(prev => ({ ...prev, type: 'Property Tax (MCG)' }));
                  if (type === 'count4') setFilters(prev => ({ ...prev, type: 'Diversion Tax (RD)' }));
                }}
                options={{
                  showTypeFilter: false,
                  count3Label: 'Property Tax',
                  count4Label: 'Diversion Tax'
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
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800">Type / ID</th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-center">Tax Amount</th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-center">Amount (₹)</th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-center">Arrears</th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-center">Bill Period</th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-center">Status</th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800 transition-colors">
                  {isLoading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={9} className="py-6 px-6"><div className="h-8 w-full bg-gray-50 dark:bg-slate-800/10 rounded"></div></td>
                      </tr>
                    ))
                  ) : filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-32 text-center">
                        <div className="flex flex-col items-center gap-3 text-text-secondary">
                          <History className="w-12 h-12 opacity-10" />
                          <p className="font-bold text-lg">No government bills found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((bill, index) => (
                      <tr key={bill._id || bill.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
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
                            <span className="text-sm font-black text-gray-800 dark:text-white">{bill.utilityType}</span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest transition-colors">{bill.billId}</span>
                            {/* Hidden Owner/Depositor name for searchability within same cell if needed */}
                            <p className="text-[8px] text-gray-400 font-medium uppercase mt-1 opacity-50 tabular-nums">
                               {bill.utilityType === 'Property Tax (MCG)' ? bill.ownerName : bill.depositorName}
                            </p>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-center">
                           <p className="text-sm font-bold text-gray-600 dark:text-slate-400 tabular-nums">
                            {bill.utilityType === 'Property Tax (MCG)' ? (
                              bill.propertyTax ? `₹${bill.propertyTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'
                            ) : (
                              (bill.diversionTaxAmount || bill.taxAmount) ? `₹${(bill.diversionTaxAmount || bill.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'
                            )}
                          </p>
                        </td>
                          <td className="py-5 px-6 text-center">
                             <p className={cn(
                               "text-base font-black transition-colors tabular-nums",
                               (bill.amount || 0) < 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                             )}>
                              ₹{bill.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                          </td>
                        <td className="py-5 px-6 text-center">
                           {bill.outstandingAmount !== undefined ? (
                             <span className={cn(
                               "text-sm font-bold transition-colors tabular-nums",
                               bill.outstandingAmount > 0 ? "text-red-500" : "text-gray-400 opacity-50"
                             )}>
                               ₹{bill.outstandingAmount.toLocaleString()}
                             </span>
                           ) : (
                             <span className="text-sm text-gray-300">-</span>
                           )}
                        </td>
                        <td className="py-5 px-6 text-center">
                           <div className="flex flex-col">
                             <span className="text-sm font-bold text-gray-700 dark:text-slate-200">{bill.billingPeriod || 'N/A'}</span>
                             {bill.submissionDateTime && (
                                <div className="text-[9px] text-orange-500 font-black uppercase tracking-tighter mt-1">
                                   {new Date(bill.submissionDateTime).toLocaleDateString()}
                                </div>
                             )}
                           </div>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <div className="flex justify-center">
                            <div className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                              bill.status === 'Paid' || bill.status === 'Payment Confirmed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              bill.status === 'Rejected' ? "bg-red-50 text-red-600 border-red-100" :
                              "bg-orange-50 text-orange-600 border-orange-100"
                            )}>
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                bill.status === 'Paid' || bill.status === 'Payment Confirmed' ? "bg-emerald-500" :
                                bill.status === 'Rejected' ? "bg-red-500" : "bg-orange-500"
                              )} />
                              {bill.status}
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-right">
                          <div className="flex items-center justify-end gap-1 transition-all">
                            <button 
                              onClick={() => handleEditBill(bill)}
                              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                              title="Edit Bill"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            
                            <button 
                              onClick={() => {
                                setSelectedBillForDetails(bill);
                                setIsDetailsModalOpen(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {user?.role === 'ADMIN' && (
                              <button 
                                onClick={() => handleDelete(bill.id || bill._id!)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            {bill.status !== 'Paid' && bill.status !== 'Payment Confirmed' && user?.role === 'ADMIN' && (
                              <button
                                onClick={() => {
                                  setSelectedBillForDetails(bill);
                                  setIsPaymentModalOpen(true);
                                }}
                                className="ml-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all"
                              >
                                Pay
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
                    <History className="w-8 h-8 text-gray-200" />
                  </div>
                  <h3 className="text-lg font-black text-text-primary">No bills found</h3>
                  <button onClick={() => setView('upload')} className="mt-4 text-orange-500 font-black text-xs uppercase tracking-widest">Upload Now</button>
                </div>
              ) : (
                filteredBills.map((bill) => (
                  <div 
                    key={bill._id || bill.id} 
                    className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-border-light shadow-sm space-y-5 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col">
                        <p className="text-sm font-black text-text-primary leading-tight transition-colors">{bill.utilityType}</p>
                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5 transition-colors">{bill.billId}</p>
                      </div>
                      <span className={cn(
                        "status-pill text-[9px] px-2",
                        bill.status === 'Paid' || bill.status === 'Payment Confirmed' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-orange-50 text-orange-600 border border-orange-100"
                      )}>
                        {bill.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 pt-2">
                       <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 transition-colors">Depositor/Owner</p>
                        <p className="text-sm font-bold text-text-primary transition-colors">{bill.utilityType === 'Property Tax (MCG)' ? bill.ownerName : bill.depositorName}</p>
                      </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 transition-colors">Amount</p>
                          <p className={cn(
                            "text-lg font-black tabular-nums",
                            (bill.amount || 0) < 0 ? "text-red-600 dark:text-red-400" : "text-text-primary"
                          )}>₹{bill.amount?.toLocaleString()}</p>
                        </div>
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 transition-colors">Project</p>
                        <p className="text-xs font-bold text-gray-600 bg-gray-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-slate-800 truncate max-w-full">
                          {bill.propertyName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 transition-colors">Period</p>
                        <p className="text-xs font-bold text-text-primary transition-colors">{bill.billingPeriod || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-gray-50 dark:border-slate-800/50 transition-colors">
                      <button 
                        onClick={() => handleEditBill(bill)}
                        className="flex-1 py-3 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
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
                      {bill.status !== 'Paid' && bill.status !== 'Payment Confirmed' && user?.role === 'ADMIN' && (
                        <button
                          onClick={() => {
                            setSelectedBillForDetails(bill);
                            setIsPaymentModalOpen(true);
                          }}
                          className="flex-1 py-3 bg-text-primary text-white dark:bg-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                        >
                          <CreditCard className="w-4 h-4" />
                          Pay
                        </button>
                      )}
                    </div>
                  </div>
                ))
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
          <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800 flex flex-col items-center text-center space-y-6 transition-colors">
            <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center">
              <Upload className="w-10 h-10 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Upload {pendingUploadType || 'Government Bill'}</h2>
              <p className="text-gray-500 mt-2">Upload {pendingUploadType || 'Property Tax (MCG) or Diversion Tax (RD)'} document. AI will extract all values for this specific type.</p>
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
                        onClick={() => handleExtract(pendingUploadType === 'Property Tax (MCG)' ? 'PROPERTY_TAX' : 'DIVERSION_TAX')}
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
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
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                    {formData.id || formData._id ? 'Edit Government Bill' : 'Verify Government Bill'}
                  </h1>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Review {formData.utilityType} details</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setView('list')}
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
                  (isLoading || duplicateFound) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {duplicateFound ? 'Duplicate Detected' : (formData.id || formData._id ? 'Update Bill' : 'Confirm & Save')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
              <div className="p-8 space-y-10">
              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Project Name *</label>
                  <select 
                    value={formData.propertyName || ''} 
                    onChange={(e) => setFormData({...formData, propertyName: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none"
                    required
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => <option key={p.id || p._id} value={p.name}>{p.name}</option>)}
                    <option value="Others">Others</option>
                  </select>
                  {formData.propertyName === 'Others' && (
                    <input 
                      type="text"
                      className="mt-2 w-full px-4 py-3 border border-orange-100 bg-orange-50/30 rounded-xl"
                      placeholder="Specify Project Name"
                      value={formData.customPropertyName || ''}
                      onChange={(e) => setFormData({...formData, customPropertyName: e.target.value})}
                      required
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Company Name *</label>
                  <select 
                    value={formData.companyName || ''} 
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none"
                    required
                  >
                    <option value="">Select Company</option>
                    {companies.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  {formData.companyName === 'Other' && (
                    <input 
                      type="text"
                      className="mt-2 w-full px-4 py-3 border border-orange-100 bg-orange-50/30 rounded-xl"
                      placeholder="Specify Company Name"
                      value={formData.customCompanyName || ''}
                      onChange={(e) => setFormData({...formData, customCompanyName: e.target.value})}
                      required
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Billing Period</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none"
                    placeholder="e.g. 2023-24"
                    value={formData.billingPeriod || ''}
                    onChange={(e) => setFormData({...formData, billingPeriod: e.target.value})}
                  />
                </div>
              </div>

              {formData.utilityType === 'Property Tax (MCG)' ? (
                /* Property Tax Specific Fields */
                <div className="space-y-8">
                  <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 mb-6">
                    <h3 className="text-sm font-bold text-orange-900 flex items-center gap-2 mb-1">
                      <Building className="w-4 h-4" />
                      Property Tax Module
                    </h3>
                    <p className="text-xs text-orange-700/60">Fields optimized for Gwalior/Gurugram Municipal Tax</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Receipt Number</label>
                      <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20" value={formData.receiptNumber || ''} onChange={(e) => setFormData({...formData, receiptNumber: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Property ID</label>
                      <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20" value={formData.propertyId || ''} onChange={(e) => setFormData({...formData, propertyId: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Owner Name</label>
                      <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20" value={formData.ownerName || ''} onChange={(e) => setFormData({...formData, ownerName: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                       <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Address</label>
                       <textarea className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20" rows={2} value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Mobile</label>
                        <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20" value={formData.mobileNumber || ''} onChange={(e) => setFormData({...formData, mobileNumber: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Year</label>
                        <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20" value={formData.assessmentYear || ''} onChange={(e) => setFormData({...formData, assessmentYear: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ward / Zone</label>
                      <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20" value={formData.zoneWard || ''} onChange={(e) => setFormData({...formData, zoneWard: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Property Area</label>
                      <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20" value={formData.propertyArea || ''} onChange={(e) => setFormData({...formData, propertyArea: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Status *</label>
                      <div className="relative">
                        <select 
                          value={formData.status || ''}
                          onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none appearance-none cursor-pointer"
                          required
                        >
                          <option value="">Select Status</option>
                          {WORKFLOW_STATUSES.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                       <IndianRupee className="w-4 h-4 text-orange-600" />
                       Tax Breakdown
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Prop Tax</label>
                        <input type="number" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" value={formData.propertyTax || 0} onChange={(e) => setFormData({...formData, propertyTax: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Edu Cess</label>
                        <input type="number" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" value={formData.educationCess || 0} onChange={(e) => setFormData({...formData, educationCess: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Samekit</label>
                        <input type="number" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" value={formData.samekit || 0} onChange={(e) => setFormData({...formData, samekit: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Add Samekit</label>
                        <input type="number" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" value={formData.addSamekit || 0} onChange={(e) => setFormData({...formData, addSamekit: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Urban Tax</label>
                        <input type="number" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" value={formData.urbanTax || 0} onChange={(e) => setFormData({...formData, urbanTax: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Garbage</label>
                        <input type="number" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" value={formData.garbageCharges || 0} onChange={(e) => setFormData({...formData, garbageCharges: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">SAM SWACH</label>
                        <input type="number" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" value={formData.samSwach || 0} onChange={(e) => setFormData({...formData, samSwach: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sewa Kar</label>
                        <input type="number" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" value={formData.sewaKar || 0} onChange={(e) => setFormData({...formData, sewaKar: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Vyapak Swachata</label>
                        <input type="number" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" value={formData.vyapakSwachataKar || 0} onChange={(e) => setFormData({...formData, vyapakSwachataKar: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Rebate</label>
                        <input type="number" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" value={formData.rebate || 0} onChange={(e) => setFormData({...formData, rebate: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Penalty</label>
                        <input type="number" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" value={formData.penalty || 0} onChange={(e) => setFormData({...formData, penalty: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Advance</label>
                        <input type="number" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" value={formData.advance || 0} onChange={(e) => setFormData({...formData, advance: Number(e.target.value)})} />
                      </div>
                    </div>

                    {/* Calculated Total Section */}
                    <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Calculated Net Total</p>
                        <p className="text-xl font-black text-orange-900">
                          ₹{((formData.propertyTax || 0) + 
                             (formData.educationCess || 0) + 
                             (formData.samekit || 0) + 
                             (formData.addSamekit || 0) + 
                             (formData.urbanTax || 0) + 
                             (formData.garbageCharges || 0) + 
                             (formData.samSwach || 0) + 
                             (formData.sewaKar || 0) + 
                             (formData.vyapakSwachataKar || 0) + 
                             (formData.penalty || 0) - 
                             (formData.rebate || 0) - 
                             (formData.advance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right text-[10px] font-bold text-orange-600 uppercase tracking-tighter bg-white/50 px-3 py-2 rounded-lg border border-orange-100">
                        Total Tax - Rebate + Penalty - Advance
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                         <History className="w-4 h-4 text-orange-600" />
                         Payment Details (Property Tax Receipt)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Payment Mode</label>
                          <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl" value={formData.modeOfPayment || ''} onChange={(e) => setFormData({...formData, modeOfPayment: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Payment Date</label>
                          <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl" value={formData.paymentDate || ''} onChange={(e) => setFormData({...formData, paymentDate: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Payment Time</label>
                          <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl" value={formData.paymentTime || ''} onChange={(e) => setFormData({...formData, paymentTime: e.target.value})} />
                        </div>
                        {formData.modeOfPayment?.toLowerCase() === 'cheque' && (
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cheque Number</label>
                            <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl" value={formData.chequeNumber || ''} onChange={(e) => setFormData({...formData, chequeNumber: e.target.value})} />
                          </div>
                        )}
                        {formData.modeOfPayment?.toLowerCase()?.includes('upi') && (
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">UPI Reference</label>
                            <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl" value={formData.upiReference || ''} onChange={(e) => setFormData({...formData, upiReference: e.target.value})} />
                          </div>
                        )}
                      </div>
                      
                      {formData.modeOfPayment?.toLowerCase() === 'cheque' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cheque Date</label>
                            <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl" value={formData.chequeDate || ''} onChange={(e) => setFormData({...formData, chequeDate: e.target.value})} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Bank Name</label>
                            <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl" value={formData.chequeBankName || ''} onChange={(e) => setFormData({...formData, chequeBankName: e.target.value})} />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div>
                           <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Total Demand</label>
                           <input type="number" className="w-full px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl font-bold text-orange-900" value={formData.totalDemandAmount || 0} onChange={(e) => setFormData({...formData, totalDemandAmount: Number(e.target.value)})} />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Payment Amount</label>
                           <input type="number" className="w-full px-4 py-3 bg-green-50 border border-green-200 rounded-xl font-bold text-green-900" value={formData.paidAmount || 0} onChange={(e) => setFormData({...formData, paidAmount: Number(e.target.value), amount: Number(e.target.value)})} />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Arrear / Outstanding</label>
                           <input type="number" className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-xl font-bold text-red-900" value={formData.outstandingAmount || 0} onChange={(e) => setFormData({...formData, outstandingAmount: Number(e.target.value)})} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Diversion Tax Specific Fields */
                <div className="space-y-8">
                  <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 mb-6">
                    <h3 className="text-sm font-bold text-orange-900 flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4" />
                      Diversion Tax (RD) Module
                    </h3>
                    <p className="text-xs text-orange-700/60">Fields optimized for Cyber Treasury MP Diversion Tax</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Depositor Name</label>
                      <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20" value={formData.depositorName || ''} onChange={(e) => setFormData({...formData, depositorName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">District</label>
                        <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20" value={formData.district || ''} onChange={(e) => setFormData({...formData, district: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Challan Period</label>
                        <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20" value={formData.challanPeriod || ''} onChange={(e) => setFormData({...formData, challanPeriod: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">TIN</label>
                       <input type="text" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20" value={formData.TIN || ''} onChange={(e) => setFormData({...formData, TIN: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">URN</label>
                       <input type="text" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20" value={formData.URN || ''} onChange={(e) => setFormData({...formData, URN: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">CRN</label>
                       <input type="text" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20" value={formData.CRN || ''} onChange={(e) => setFormData({...formData, CRN: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">CIN</label>
                       <input type="text" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20" value={formData.CIN || ''} onChange={(e) => setFormData({...formData, CIN: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                    <div>
                       <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Challan No</label>
                       <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-orange-500/20" value={formData.challanNumber || ''} onChange={(e) => setFormData({...formData, challanNumber: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Status *</label>
                      <div className="relative">
                        <select 
                          value={formData.status || ''}
                          onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none appearance-none cursor-pointer"
                          required
                        >
                          <option value="">Select Status</option>
                          {WORKFLOW_STATUSES.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Trans. Date</label>
                        <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20" placeholder="DD-MM-YYYY" value={formData.transactionDate || ''} onChange={(e) => setFormData({...formData, transactionDate: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Trans. Time</label>
                        <input type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20" placeholder="HH:MM:SS" value={formData.transactionTime || ''} onChange={(e) => setFormData({...formData, transactionTime: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-orange-50/50 rounded-2xl border border-orange-100 grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                       <h4 className="text-xs font-bold text-orange-900 uppercase flex items-center gap-2">
                         <Building2 className="w-3 h-3" />
                         Bank Information
                       </h4>
                       <div className="grid grid-cols-1 gap-4">
                         <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Bank Name</label>
                            <input type="text" className="w-full px-3 py-2 bg-white border border-orange-100 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20" value={formData.bankName || ''} onChange={(e) => setFormData({...formData, bankName: e.target.value})} />
                         </div>
                         <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Ref Number</label>
                            <input type="text" className="w-full px-3 py-2 bg-white border border-orange-100 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20" value={formData.bankReferenceNumber || ''} onChange={(e) => setFormData({...formData, bankReferenceNumber: e.target.value})} />
                         </div>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-xs font-bold text-orange-900 uppercase flex items-center gap-2">
                         <IndianRupee className="w-3 h-3" />
                         Amount Details
                       </h4>
                       <div className="space-y-4">
                         <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Diversion Tax Amount (Rs.)</label>
                            <input type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-lg text-orange-900" value={formData.diversionTaxAmount || 0} onChange={(e) => {
                               const val = Number(e.target.value);
                               setFormData({...formData, diversionTaxAmount: val, amount: val, totalAmount: val});
                            }} />
                         </div>
                         <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Total Amount (Rs.)</label>
                            <input type="number" className="w-full px-4 py-3 bg-green-50 border border-green-200 rounded-xl font-bold text-xl text-green-900" value={formData.totalAmount || 0} onChange={(e) => setFormData({...formData, totalAmount: Number(e.target.value), amount: Number(e.target.value)})} />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-[10px] text-gray-500 uppercase mb-1">Outstanding</label>
                              <input type="number" className="w-full px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20" value={formData.outstandingAmount || 0} onChange={(e) => setFormData({...formData, outstandingAmount: Number(e.target.value)})} />
                           </div>
                           <div>
                              <label className="block text-[10px] text-gray-500 uppercase mb-1">Pending</label>
                              <input type="number" className="w-full px-3 py-2 bg-yellow-50 border border-yellow-100 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20" value={formData.pendingAmount || 0} onChange={(e) => setFormData({...formData, pendingAmount: Number(e.target.value)})} />
                           </div>
                         </div>
                         <div>
                            <label className="block text-[10px] text-gray-500 uppercase mb-1">Payment Status</label>
                             <div className="px-4 py-3 bg-white border border-orange-100 rounded-xl text-green-600 font-bold flex items-center gap-2">
                               <CheckCircle2 className="w-4 h-4" /> SUCCESS
                             </div>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
            {duplicateFound && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mx-8 mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs font-bold">{duplicateMessage || "This bill appears to be a duplicate."}</p>
              </motion.div>
            )}
          </form>

            {/* Right Column: Read-only Preview */}
            <div className="space-y-8">


              {/* Document Thumbnail */}
              <div 
                onClick={() => window.open(previewUrl || '', '_blank')}
                className="bg-gray-100 dark:bg-slate-950 rounded-[2rem] overflow-hidden shadow-sm aspect-[3/4] relative group cursor-pointer border border-gray-100 dark:border-slate-800 transition-all hover:shadow-xl hover:-translate-y-1"
              >
                {previewUrl && (
                  selectedFile?.type.includes('pdf') ? (
                    <PdfViewer file={previewUrl} className="w-full h-full pointer-events-none" />
                  ) : (
                    <img src={previewUrl} alt="Bill Document" className="w-full h-full object-contain" />
                  )
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-6 text-center">
                  <Eye className="w-10 h-10 mb-2" />
                  <p className="text-sm font-black uppercase tracking-widest">Open Original Bill</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Modals */}
      <BillDetailsDrawer 
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedBillForDetails(null);
        }}
        bill={selectedBillForDetails}
        onEdit={handleEditBill}
        onMarkPaid={(bill) => {
          setIsDetailsModalOpen(false);
          setSelectedBillForDetails(bill);
          setIsPaymentModalOpen(true);
        }}
        onDelete={handleDelete}
        onVerify={(bill) => {
          setSelectedBillForDetails(bill);
          setWorkflowActionType('verify');
          setWorkflowActionTitle('Verify Gov Bill');
          setIsVerificationModalOpen(true);
        }}
        onApprove={(bill) => {
          setSelectedBillForDetails(bill);
          setWorkflowActionType('approve');
          setWorkflowActionTitle('Approve Gov Bill');
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
        onPaymentSuccess={handlePaymentSuccess}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Delete Government Tax Record"
        message="Are you sure you want to delete this government tax entry? This action will permanently remove the record from your records."
      />
    </div>
  );
};
