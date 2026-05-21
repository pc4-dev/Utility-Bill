import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wind,
  ShieldCheck,
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Droplets,
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
  CreditCard,
  CheckSquare,
  IndianRupee,
  Building2,
  MapPin,
  Calendar,
  Layers,
  Activity,
  AlertTriangle,
  Globe,
  Hash,
  User,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { Bill, Project, BillStatus, WORKFLOW_STATUSES, ModuleProps } from '../types';
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

export const PollutionControlModule: React.FC<ModuleProps> = ({ projects: propsProjects, isLoadingProjects, allBills: propsBills }) => {
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

  const initialBills = useMemo(() => {
    if (!propsBills) return [];
    const uniqueBillsMap = new Map();
    const filtered = propsBills.filter(bill => bill.subcategory === 'pollution_control');
    const normalized = normalizeBills(filtered);
    normalized.forEach(bill => {
      const id = bill.id || bill._id;
      if (id) {
        uniqueBillsMap.set(id, bill);
      }
    });
    return Array.from(uniqueBillsMap.values());
  }, [propsBills]);

  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [projects, setProjects] = useState<Project[]>(propsProjects || []);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [pendingUploadType, setPendingUploadType] = useState<'CTE' | 'CTO' | null>(null);
  const extractionAbortController = React.useRef<AbortController | null>(null);
  const [duplicateFound, setDuplicateFound] = useState<Bill | null>(null);
  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);
  const [selectedBillForTally, setSelectedBillForTally] = useState<Bill | null>(null);
  const [view, setView] = useState<'list' | 'upload' | 'form'>('list');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    property: '',
    company: '',
    status: '',
    date: '',
    startDate: '',
    endDate: '',
    operator: '', // Not strictly needed
    type: 'All'   // For CTE/CTO
  });
  
  // Modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<Bill | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [workflowActionType, setWorkflowActionType] = useState<'verify' | 'approve' | 'initiate' | 'confirm' | 'tally'>('verify');
  const [workflowActionTitle, setWorkflowActionTitle] = useState('');
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const [duplicateMessage, setDuplicateMessage] = useState<string>('');
  const [companies, setCompanies] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<Partial<Bill>>({
    utilityType: 'Pollution Control',
    category: 'government_compliance',
    subcategory: 'pollution_control',
    status: 'Pending',
    priority: 'Normal',
    amount: 0,
    propertyName: '',
    customPropertyName: '',
    companyName: '',
    customCompanyName: '',
    consentNumber: '',
    authority: 'MPPCB',
    pollutionCategory: 'Orange',
    documentType: 'CTE',
    projectType: 'Residential',
    issueDate: new Date().toISOString().split('T')[0],
    validityTo: '',
    validityFrom: '',
    address: '',
    district: '',
    capitalInvestment: 0,
    projectArea: '',
    unitsCount: '',
    productionCapacity: '',
    dgSetDetails: '',
    stsDetails: '',
    hazardousWasteDetails: '',
    complianceConditions: '',
    latitude: '',
    longitude: '',
    location: '',
    khasraNumber: '',
    notes: '',
  });

  const pollutionCategories = ["Orange", "Green", "Red"];
  // Real-time duplicate check
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const performCheck = async () => {
      if (view === 'form' && formData.consentNumber) {
        try {
          const res = await api.checkDuplicate({
            ...formData,
            utilityType: 'Pollution Control',
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
  }, [formData.consentNumber, view]);
  const projectTypes = ["Residential", "Industrial"];
  const authorities = ["MPPCB", "CPCB", "Others"];

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
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
      const uniqueBillsMap = new Map();
      const filtered = propsBills.filter(bill => bill.subcategory === 'pollution_control');
      const normalized = normalizeBills(filtered);
      normalized.forEach(bill => {
        const id = bill.id || bill._id;
        if (id) {
          uniqueBillsMap.set(id, bill);
        }
      });
      setBills(Array.from(uniqueBillsMap.values()));
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allBills, fetchedProjects] = await Promise.all([
        api.getBills(),
        !propsProjects ? api.getProjects() : Promise.resolve(propsProjects)
      ]);
      
      const uniqueBillsMap = new Map();
      const filtered = allBills.filter(bill => bill.subcategory === 'pollution_control');
      const normalized = normalizeBills(filtered);
      normalized.forEach(bill => {
        const id = bill.id || bill._id;
        if (id) {
          uniqueBillsMap.set(id, bill);
        }
      });
      
      setBills(Array.from(uniqueBillsMap.values()));
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
    setFormData({
      ...formData,
      ...normalizedBill as any,
      subcategory: 'pollution_control',
      utilityType: 'Pollution Control'
    });
    const url = bill.fileUrl || (bill.attachments && bill.attachments[0]?.url) || null;
    setPreviewUrl(url);
    setView('form');
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
      toast.success('Document deleted successfully');
      setIsDeleteModalOpen(false);
    } catch (err) {
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleApprove = async (bill: Bill) => {
    try {
      const updatedBill = { ...bill, status: 'Approved' as BillStatus };
      await api.saveBill(updatedBill, user ? { name: user.name, role: user.role } : undefined);
      toast.success('Document marked as Approved');
      fetchData();
    } catch (err) {
      toast.error('Failed to approve document');
    }
  };

  const stats = useMemo(() => {
    const baseBills = bills.filter(bill => {
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

      const matchesDate = (!filters.startDate || (bill.issueDate && bill.issueDate >= filters.startDate)) && 
                         (!filters.endDate || (bill.issueDate && bill.issueDate <= filters.endDate));
      const matchesSearch = !filters.search || 
        bill.propertyName.toLowerCase().includes(filters.search.toLowerCase()) ||
        bill.companyName.toLowerCase().includes(filters.search.toLowerCase()) ||
        bill.consentNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
        bill.district?.toLowerCase().includes(filters.search.toLowerCase());
      
      const bDate = bill.issueDate ? new Date(bill.issueDate) : (bill.billDate ? new Date(bill.billDate) : null);
      const billMonth = bDate ? monthNames[bDate.getMonth()] : bill.month;
      const billYear = bDate ? bDate.getFullYear().toString() : bill.year;
      const matchesMonth = !selectedMonth || billMonth === selectedMonth;
      const matchesYear = !selectedYear || billYear === selectedYear;
      
      return matchesProject && matchesCompany && matchesSearch && matchesDate && matchesStatus && matchesMonth && matchesYear;
    });

    return {
      total: baseBills.length,
      totalAmount: baseBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
      cteCount: baseBills.filter(b => b.documentType === 'CTE').length,
      ctoCount: baseBills.filter(b => b.documentType === 'CTO').length
    };
  }, [bills, filters.property, filters.company, filters.status, filters.search, filters.startDate, filters.endDate, selectedMonth]);

  const filteredBills = bills.filter(bill => {
    const matchesProject = !filters.property || bill.propertyName === filters.property;
    const matchesCompany = !filters.company || bill.companyName === filters.company;
    const matchesType = filters.type === 'All' || bill.documentType === filters.type;
    
    let matchesStatus = true;
    if (filters.status === 'IN_PROGRESS') {
      matchesStatus = !['Payment Confirmed', 'Tally Entry', 'Paid'].includes(bill.status || '');
    } else if (filters.status === 'COMPLETED') {
      matchesStatus = ['Payment Confirmed', 'Tally Entry', 'Paid'].includes(bill.status || '');
    } else if (filters.status) {
      matchesStatus = bill.status === filters.status;
    }

    const matchesDate = (!filters.startDate || (bill.issueDate && bill.issueDate >= filters.startDate)) && 
                       (!filters.endDate || (bill.issueDate && bill.issueDate <= filters.endDate));
    const matchesSearch = !filters.search || 
      bill.propertyName.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.companyName.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.consentNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.district?.toLowerCase().includes(filters.search.toLowerCase());
    
    // Month and Year filtering
    const bDate = bill.issueDate ? new Date(bill.issueDate) : (bill.billDate ? new Date(bill.billDate) : null);
    const billMonth = bDate ? monthNames[bDate.getMonth()] : bill.month;
    const billYear = bDate ? bDate.getFullYear().toString() : bill.year;
    const matchesMonth = !selectedMonth || billMonth === selectedMonth;
    const matchesYear = !selectedYear || billYear === selectedYear;
    
    return matchesProject && matchesCompany && matchesType && matchesSearch && matchesDate && matchesStatus && matchesMonth && matchesYear;
  }).sort((a, b) => {
    const dateA = a.submissionDateTime || a.createdAt || '';
    const dateB = b.submissionDateTime || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  const checkDuplicate = (data: Partial<Bill>, currentBills: Bill[]) => {
    return currentBills.find(eb => {
      if (data.id && (eb.id === data.id || eb._id === data.id)) return false;
      if (data._id && (eb.id === data._id || eb._id === data._id)) return false;

      const sameConsent = (eb.consentNumber && data.consentNumber && eb.consentNumber === data.consentNumber);
      const samePeriod = (eb.validityFrom === data.validityFrom && eb.validityTo === data.validityTo);
      
      return sameConsent || (samePeriod && eb.amount === data.amount);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setView('upload');
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

  const handleExtract = async (forcedType?: 'CTE' | 'CTO') => {
    if (!selectedFile) return;
    const finalForcedType = forcedType || pendingUploadType;
    setIsExtracting(true);
    
    // Create new abort controller
    if (extractionAbortController.current) {
      extractionAbortController.current.abort();
    }
    extractionAbortController.current = new AbortController();
    const signal = extractionAbortController.current.signal;
    
    try {
      toast.loading(`Uploading and processing ${finalForcedType || ''}...`, { id: 'extraction' });
      const formDataUpload = new FormData();
      formDataUpload.append('files', selectedFile);
      const uploadRes = await api.uploadPollution(formDataUpload, signal);
      
      if (signal.aborted) return;
      
      const fileUrl = uploadRes.fileUrl;
      
      toast.loading(`AI Extracting ${finalForcedType || 'Compliance Data'}...`, { id: 'extraction' });
      const fileData = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type;
      
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: fileData, mimeType: mimeType === "application/pdf" ? "application/pdf" : "image/jpeg" } },
            { text: `Extract all fields from this Pollution Control Document (${finalForcedType || 'CTE or CTO'}).
            
            ${finalForcedType ? `IMPORTANT: Force identification as ${finalForcedType}.` : `IDENTIFICATION RULES:
            - If the document contains "Consent to Establish", "Establishment", "Establish", or "application for consent to establish", set documentType to "CTE".
            - If the document contains "Consent to Operate", "Operation", "Operator", or "renewal of consent", set documentType to "CTO".`}
            
            Special extraction instructions:
            - Capital Investment: Look for labels like "Capital investment in lakhs" or "Capital investment in Lakhs". Extract the numeric value only (e.g., if it says "Rs. 3130", return 3130).
            - Consent Fee: Look for labels like "Consent fee", "Amount paid", "Fee detail", "DD No... of Rs.". Extract the numeric value only (e.g., if it says "Rs. 50000", return 50000). Convert this to Lakhs if it is a large number (e.g. 50000 -> 0.5) if the label implies it's in INR, or keep as is if the label says "Fee in lakhs".
            - Issue Date: Highly critical. Look for "Dt.", "Dated:", "Date:", or "Issued on". Example from user document: "Application Receipt No. 1164997 Dt. 06/05/2022" should return "2022-05-06". Always convert to YYYY-MM-DD.
            - CTE Project Details: Look for "Project details :" section. Summarize the items (e.g., "155 residential units - 10186 sqm", "2 commercial blocks - 2000 sqm") into 'constructionDetails'.
            - CTO Production Capacity: Look for "Product & Production Capacity:" section. Summarize activities and their capacities (e.g., "Township - 19918.96 sqm", "DG Set - 223 KVA") into 'productionCapacity'.
            - Location: Extract Village, Tehsil, District from the "Location:" field.
            
            Return a JSON with:
            - documentType: "CTE" or "CTO"
            - companyName: company or applicant name
            - projectName: project name
            - consentNumber: the consent/application number
            - authority: e.g., MPPCB, CPCB
            - pollutionCategory: "Orange", "Green", or "Red"
            - issueDate: "YYYY-MM-DD" (Look for "Date of issue", "Dated:", "Issued on", "Date:", "Dt.". Often appears after "Application Receipt No." or "Consent No." e.g. "Dt. 06/05/2022". Handle formats like DD/MM/YYYY or DD-MM-YYYY)
            - validityFrom: "YYYY-MM-DD" (for CTO)
            - validityTo: "YYYY-MM-DD" (expiry date for CTO, often mentioned as "This consent is valid up to")
            - location: full location context (e.g. Village, Tehsil, District)
            - khasraNumber: extract Khasra Number/Survey Number if mentioned
            - address: full address
            - district: district name
            - state: state name
            - latitude: latitude (e.g. 26.2183)
            - longitude: longitude (e.g. 78.1828)
            - capitalInvestment: numeric value (extract from 'Capital investment in lakhs')
            - projectType: "Residential" or "Industrial"
            - projectArea: total area from details (e.g., "10186 sqm")
            - unitsCount: number of units (e.g., "155 units")
            - constructionDetails: detailed summary of the project details table
            - productionCapacity: detailed summary of the production capacity table
            - dgSetDetails: concise value of diesel generators (e.g., "3 x 82.5 KVA"), avoid long descriptions
            - stsDetails: concise value of Sewage Treatment System/STP (e.g., "110.000 KL/day"), avoid long descriptions
            - hazardousWasteDetails: any hazardous waste mentioned
            - complianceConditions: key conditions listed
            ` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              documentType: { type: Type.STRING },
              companyName: { type: Type.STRING },
              projectName: { type: Type.STRING },
              consentNumber: { type: Type.STRING },
              authority: { type: Type.STRING },
              pollutionCategory: { type: Type.STRING },
              issueDate: { type: Type.STRING },
              validityFrom: { type: Type.STRING },
              validityTo: { type: Type.STRING },
              address: { type: Type.STRING },
              district: { type: Type.STRING },
              state: { type: Type.STRING },
              location: { type: Type.STRING },
              khasraNumber: { type: Type.STRING },
              latitude: { type: Type.STRING },
              longitude: { type: Type.STRING },
              capitalInvestment: { type: Type.NUMBER },
              consentFee: { type: Type.NUMBER },
              projectType: { type: Type.STRING },
              projectArea: { type: Type.STRING },
              unitsCount: { type: Type.STRING },
              constructionDetails: { type: Type.STRING },
              productionCapacity: { type: Type.STRING },
              dgSetDetails: { type: Type.STRING },
              stsDetails: { type: Type.STRING },
              hazardousWasteDetails: { type: Type.STRING },
              complianceConditions: { type: Type.STRING },
            }
          }
        }
      });

      if (signal.aborted) return;

      const extractedData = JSON.parse(response.text || '{}');
      
      // Determine document type carefully based on extracted keywords
      const rawExtractedType = (extractedData.documentType || '').toLowerCase();
      let documentType: 'CTE' | 'CTO' = finalForcedType || 'CTO'; // Default to forced type if available, else CTO

      if (!finalForcedType) {
        if (rawExtractedType.includes('establish') || rawExtractedType.includes('establishment') || rawExtractedType === 'cte') {
          documentType = 'CTE';
        } else if (rawExtractedType.includes('operate') || rawExtractedType.includes('operation') || rawExtractedType === 'cto') {
          documentType = 'CTO';
        } else {
          // Fallback: check whole extracted text for clues
          const fullExtraction = JSON.stringify(extractedData).toLowerCase();
          if (fullExtraction.includes('establish')) {
            documentType = 'CTE';
          } else if (fullExtraction.includes('operate')) {
            documentType = 'CTO';
          }
        }
      }

      const newFormData = {
        ...formData,
        ...extractedData,
        issueDate: extractedData.issueDate || formData.issueDate || new Date().toISOString().split('T')[0],
        amount: extractedData.consentFee || extractedData.capitalInvestment || formData.amount || 0,
        documentType: documentType,
        dueDate: extractedData.validityTo || formData.validityTo,
        propertyName: extractedData.projectName || formData.propertyName,
        fileUrl: fileUrl,
        billId: extractedData.consentNumber || `POL-${Date.now().toString().slice(-6)}`,
        subcategory: 'pollution_control',
        category: 'government_compliance',
      };

      setFormData(newFormData);

      // Check for duplicate
      const duplicate = checkDuplicate(newFormData, bills);
      if (duplicate) {
        setDuplicateFound(duplicate);
        toast.error('Warning: A duplicate entry for this document was detected!', { 
          id: 'duplicate-alert',
          duration: 6000 
        });
      } else {
        setDuplicateFound(null);
      }

      // Removed line that overwrote previewUrl with server URL to keep working blob URL during session
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
    setDuplicateFound(null);
    setPendingUploadType(null);
    toast.dismiss('extraction');
    setFormData({
      utilityType: 'Pollution Control',
      category: 'government_compliance',
      subcategory: 'pollution_control',
      status: 'Pending',
      priority: 'Normal',
      amount: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyName || !formData.companyName || !formData.consentNumber) {
      toast.error('Required fields missing');
      return;
    }

    setIsLoading(true);
    try {
      const bDate = formData.issueDate ? new Date(formData.issueDate) : (formData.billDate ? new Date(formData.billDate) : new Date());
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthStr = monthNames[bDate.getMonth()];
      const yearStr = bDate.getFullYear().toString();

      if (isDuplicate) {
        toast.error('Cannot save duplicate document');
        setIsLoading(false);
        return;
      }

      const billToSave: Partial<Bill> = {
        ...formData,
        issueDate: formData.issueDate || formData.billDate || new Date().toISOString().split('T')[0],
        billDate: formData.issueDate || formData.billDate || new Date().toISOString().split('T')[0],
        dueDate: formData.documentType === 'CTO' ? (formData.validityTo || formData.issueDate || formData.billDate) : (formData.issueDate || formData.billDate || formData.dueDate),
        category: 'government_compliance' as const,
        subcategory: 'pollution_control',
        utilityType: (formData.documentType || 'Pollution Control') as any,
        month: monthStr,
        year: yearStr,
        billId: formData.consentNumber || formData.billId,
        submissionDateTime: new Date().toISOString(),
        attachments: formData.fileUrl 
          ? [{ url: formData.fileUrl, name: selectedFile?.name || 'Document', type: selectedFile?.type || 'application/pdf' }] 
          : (formData.attachments || [])
      };

      await api.saveBill(billToSave as Bill, user ? { name: user.name, role: user.role } : undefined);
      toast.success('Document saved successfully');
      setView('list');
      fetchData();
    } catch (err) {
      toast.error('Failed to save document');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-0 space-y-6 max-w-full">
      {/* Hub Header - Only show in list view */}
      {view === 'list' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-t-[2rem] border-x border-t border-gray-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2 transition-colors">
              Pollution Hub
              <div className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full cursor-help transition-all">
                <Wind className="w-5 h-5 text-blue-500" />
              </div>
            </h1>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3 w-full max-w-4xl">
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

            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setFormData({ 
                    ...formData, 
                    documentType: 'CTE',
                    consentNumber: '', 
                    validityTo: '', 
                    validityFrom: '', 
                    issueDate: new Date().toISOString().split('T')[0] 
                  });
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setPendingUploadType('CTE');
                  setView('upload');
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-sans"
              >
                <Upload className="w-4 h-4" />
                Upload CTE
              </button>
              <button 
                onClick={() => {
                  setFormData({ 
                    ...formData, 
                    documentType: 'CTO',
                    consentNumber: '', 
                    validityTo: '', 
                    validityFrom: '', 
                    issueDate: new Date().toISOString().split('T')[0] 
                  });
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setPendingUploadType('CTO');
                  setView('upload');
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 font-sans"
              >
                <Upload className="w-4 h-4" />
                Upload CTO
              </button>
            </div>
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
                countData={{
                  total: stats.total,
                  totalAmount: stats.totalAmount,
                  count3: stats.cteCount,
                  count4: stats.ctoCount
                }}
                onCountClick={(type) => {
                  if (type === 'all') setFilters(prev => ({ ...prev, type: 'All' }));
                  if (type === 'count3') setFilters(prev => ({ ...prev, type: 'CTE' }));
                  if (type === 'count4') setFilters(prev => ({ ...prev, type: 'CTO' }));
                }}
                options={{
                  showTypeFilter: false,
                  count3Label: 'CTE',
                  count4Label: 'CTO'
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
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800">Document / Unit</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800">Authority</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-center">Fee / Investment</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-center">Status / Date</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800 transition-colors">
                    {isLoading ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={7} className="py-6 px-6"><div className="h-8 w-full bg-gray-50 dark:bg-slate-800/10 rounded"></div></td>
                        </tr>
                      ))
                    ) : filteredBills.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-32 text-center text-text-secondary transition-colors">
                          <History className="w-12 h-12 opacity-10 mx-auto" />
                          <p className="font-bold text-lg mt-3">No compliance records found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredBills.map((bill, index) => (
                        <tr key={bill._id || bill.id || `pol-bill-${index}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
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
                            <div>
                                <p className="text-sm font-black text-gray-800 dark:text-white transition-colors">{bill.propertyName}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest transition-colors">{bill.companyName}</p>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex flex-col gap-1">
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider w-fit border",
                                bill.documentType === 'CTE' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-purple-50 text-purple-600 border-purple-100"
                              )}>
                                {bill.documentType === 'CTE' ? 'CTE (Establish)' : 'CTO (Operate)'}
                              </span>
                              <p className="text-xs font-mono font-bold text-gray-500 tracking-tighter">{bill.consentNumber}</p>
                              <p className="text-[9px] text-gray-400 font-medium uppercase tracking-tight">{bill.unitsCount || bill.projectArea}</p>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-sm font-bold text-gray-700 dark:text-slate-200 transition-colors">
                             {bill.authority}
                          </td>
                          <td className="py-5 px-6 text-center">
                            <p className={cn(
                              "text-sm font-black transition-colors tabular-nums",
                              (bill.amount || 0) < 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                            )}>
                              {bill.amount ? `₹${bill.amount} L` : ''}
                              {bill.amount && bill.diversionTaxAmount ? ' + ' : ''}
                              {bill.diversionTaxAmount ? `₹${bill.diversionTaxAmount.toLocaleString()}` : ''}
                              {!bill.amount && !bill.diversionTaxAmount ? 'N/A' : ''}
                            </p>
                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">
                               {bill.amount && bill.diversionTaxAmount ? 'Fee + Diversion' : bill.diversionTaxAmount ? 'Diversion Tax' : 'Fee'}
                            </p>
                          </td>
                          <td className="py-5 px-6 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                bill.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-100"
                              )}>
                                <div className={cn("w-1.5 h-1.5 rounded-full", bill.status === 'Approved' ? "bg-emerald-500" : "bg-orange-500")} />
                                {bill.status || 'Pending'}
                              </span>
                              <div className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                                  {bill.documentType === 'CTE' ? `Issued: ${bill.issueDate || 'N/A'}` : `Expires: ${bill.validityTo || 'N/A'}`}
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-right">
                            <div className="flex items-center justify-end gap-1 transition-all">
                              <button 
                                onClick={() => { setSelectedBillForDetails(bill); setIsDetailsModalOpen(true); }} 
                                className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {(bill.fileUrl || (bill.attachments && bill.attachments[0]?.url)) && (
                                <button 
                                  onClick={() => downloadFile(bill.fileUrl || bill.attachments![0].url, `Pollution_${bill.consentNumber || 'Document'}`)} 
                                  className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              )}
                              {user?.role === 'ADMIN' && (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleEdit(bill)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={() => handleDelete(bill._id || bill.id!)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
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
              {filteredBills.map((bill, idx) => (
                <div 
                  key={bill._id || bill.id || `pol-card-${idx}`} 
                  className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-border-light shadow-sm space-y-5 transition-all active:scale-[0.98]"
                >
                  <div className="flex start justify-between gap-3">
                    <div className="flex flex-col">
                      <p className="text-sm font-black text-text-primary leading-tight transition-colors">{bill.propertyName}</p>
                      <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5 transition-colors">{bill.consentNumber}</p>
                    </div>
                    <span className={cn(
                      "status-pill text-[9px] px-2",
                      bill.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-orange-50 text-orange-600 border border-orange-100"
                    )}>
                      {bill.status || 'Pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 pt-2">
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 transition-colors">Document Type</p>
                      <p className="text-xs font-black text-text-primary transition-colors">{bill.documentType === 'CTE' ? 'CTE (Establish)' : 'CTO (Operate)'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 transition-colors">Amount (Fee)</p>
                      <p className={cn(
                        "text-base font-black tabular-nums",
                        (bill.amount || 0) < 0 ? "text-red-600 dark:text-red-400" : "text-text-primary"
                      )}>₹{bill.amount?.toLocaleString()} L</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 transition-colors">Authority</p>
                      <p className="text-xs font-bold text-text-primary transition-colors truncate">{bill.authority}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 transition-colors">Validity/Issue</p>
                      <p className="text-xs font-bold text-text-primary transition-colors">
                        {bill.documentType === 'CTE' ? (bill.issueDate || 'N/A') : (bill.validityTo || 'N/A')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-50 dark:border-slate-800 transition-colors">
                    <button 
                      onClick={() => { setSelectedBillForDetails(bill); setIsDetailsModalOpen(true); }} 
                      className="flex-1 py-3 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    {(bill.fileUrl || (bill.attachments && bill.attachments[0]?.url)) && (
                      <button
                        onClick={() => downloadFile(bill.fileUrl || bill.attachments![0].url, `Pollution_${bill.consentNumber || 'Document'}`)} 
                        className="flex-1 py-3 bg-text-primary text-white dark:bg-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {view === 'upload' && (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col gap-6 max-w-4xl mx-auto py-12"
          >
            <button 
              onClick={() => setView('list')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-bold transition-colors w-fit px-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to List</span>
            </button>
            <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800 text-center space-y-6">
             <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-10 h-10 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary text-center">Upload {pendingUploadType || 'Pollution Document'}</h2>
              <p className="text-text-secondary mt-2 text-center">Upload your {pendingUploadType || 'CTE or CTO'} document (PDF/Image) for automatic extraction</p>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              {selectedFile ? (
                <div className="flex flex-col gap-4 w-full max-w-md transition-all">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl w-full border border-gray-100 dark:border-slate-800 transition-colors">
                    <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm transition-colors">
                      <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400 transition-colors" />
                    </div>
                    <div className="flex-1 text-left font-sans">
                      <p className="font-bold text-gray-900 dark:text-white truncate transition-colors">{selectedFile.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold tracking-widest uppercase transition-colors">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    {!isExtracting && (
                      <button 
                        onClick={handleRemoveFile} 
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                        title="Remove file"
                      >
                        <Trash2 className="w-5 h-5 transition-colors" />
                      </button>
                    )}
                  </div>
                  
                  {isExtracting ? (
                    <button 
                      onClick={handleRemoveFile}
                      className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[13px] hover:bg-red-600 transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-500/20 font-sans"
                    >
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Cancel Extraction
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleExtract()}
                      className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-[13px] hover:bg-orange-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20 font-sans"
                    >
                      <Activity className="w-5 h-5 transition-colors" />
                      Start AI Extraction
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative group cursor-pointer w-full max-w-md">
                  <input type="file" onChange={handleFileChange} accept=".pdf,image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="p-12 border-2 border-dashed border-gray-100 dark:border-slate-800 group-hover:border-orange-400 dark:group-hover:border-orange-500 rounded-3xl group-hover:bg-orange-50/50 dark:group-hover:bg-orange-900/10 transition-all flex flex-col items-center">
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-[0.2em] transition-colors">Drop file here or click to browse</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left p-6 bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
            <div className="space-y-4">
              <h4 className="font-bold text-orange-800 text-[10px] uppercase tracking-widest">Supported Formats</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-orange-200 dark:border-orange-800 text-[10px] font-bold text-orange-600">PDF Document</span>
                <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-orange-200 dark:border-orange-800 text-[10px] font-bold text-orange-600">JPG/PNG Image</span>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-orange-800 text-[10px] uppercase tracking-widest">AI Detection</h4>
              <p className="text-[10px] text-orange-700 leading-relaxed font-medium">Automatic detection of Consent to Establish (CTE) & Consent to Operate (CTO) with full parameter extraction.</p>
            </div>
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
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200 dark:shadow-none transition-colors transition-colors">
                <Wind className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight transition-colors transition-colors">Verify Consent Document</h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 transition-colors transition-colors">Review CTE/CTO extraction details</p>
              </div>
            </div>
            <div className="flex items-center gap-3 transition-colors transition-colors transition-colors">
              <button 
                type="button"
                onClick={() => setView('list')}
                className="px-6 py-3 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-slate-700 transition-all font-mono transition-colors"
                title="Back to Documents List"
              >
                Back to List
              </button>
              <button 
                type="button"
                onClick={() => setView('upload')}
                className="px-6 py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-slate-700 transition-all font-mono transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => (document.querySelector('form') as HTMLFormElement)?.requestSubmit()}
                disabled={isLoading || isDuplicate}
                className={cn(
                  "px-8 py-3 bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 flex items-center gap-2 font-mono transition-colors transition-colors",
                  (isLoading || isDuplicate) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin transition-colors" /> : <Save className="w-4 h-4 transition-colors" />}
                {isDuplicate ? 'Duplicate Detected' : 'Confirm & Save'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start transition-colors">
            {/* Left Column: Editable Form */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors transition-colors transition-colors transition-colors">
              <form onSubmit={handleSubmit} className="p-8 space-y-8 transition-colors transition-colors">
                {/* Identity & Mapping */}
                <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 space-y-6 transition-colors transition-colors transition-colors transition-colors">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 transition-colors transition-colors">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors transition-colors transition-colors transition-colors transition-colors">Project Name *</label>
                      <select 
                        required
                        value={formData.propertyName || ''}
                        onChange={(e) => setFormData({...formData, propertyName: e.target.value})}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-none rounded-xl text-sm font-medium transition-colors h-[48px] outline-none transition-colors transition-colors transition-colors transition-colors transition-colors"
                      >
                        <option value="">Select Project</option>
                        {projects.map(p => <option key={p.id || p._id} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors">Applicant / Company *</label>
                      <div className="space-y-2">
                        <select 
                          required
                          value={formData.companyName || ''}
                          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-none rounded-xl text-sm font-medium transition-colors h-[48px] outline-none"
                        >
                          <option value="">Select Company</option>
                          {companies.map(c => <option key={c} value={c}>{c}</option>)}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 transition-colors transition-colors transition-colors">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors transition-colors transition-colors transition-colors">Consent Number *</label>
                      <input 
                        type="text" 
                        required
                        value={formData.consentNumber || ''}
                        onChange={(e) => setFormData({...formData, consentNumber: e.target.value})}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-none rounded-xl text-sm font-medium transition-colors outline-none h-[48px] font-mono transition-colors transition-colors transition-colors transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors transition-colors transition-colors transition-colors transition-colors">Pollution Category</label>
                      <select 
                        value={formData.pollutionCategory || ''}
                        onChange={(e) => setFormData({...formData, pollutionCategory: e.target.value as any})}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-none rounded-xl text-sm font-medium transition-colors h-[48px] outline-none transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors"
                      >
                        {pollutionCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 transition-colors transition-colors transition-colors">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors">Issue Date</label>
                    <input 
                      type="date" 
                      value={formData.issueDate || ''}
                      onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors outline-none transition-colors transition-colors transition-colors transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors">Expiry Date (Valid Until)</label>
                    <input 
                      type="date" 
                      value={formData.validityTo || ''}
                      onChange={(e) => setFormData({...formData, validityTo: e.target.value, dueDate: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors outline-none transition-colors transition-colors transition-colors transition-colors transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 transition-colors transition-colors transition-colors transition-colors">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors">Location / Area</label>
                    <input 
                      type="text" 
                      value={formData.location || ''}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors outline-none transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors">Khasra Number</label>
                    <input 
                      type="text" 
                      value={formData.khasraNumber || ''}
                      onChange={(e) => setFormData({...formData, khasraNumber: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors outline-none transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="p-6 bg-orange-600 rounded-[2rem] shadow-lg shadow-orange-200 dark:shadow-none transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[9px] font-black text-orange-200 uppercase tracking-[0.2em]">Total Amount (Fee)</label>
                      <CreditCard className="w-3.5 h-3.5 text-orange-300" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-orange-200">₹</span>
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.amount || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setFormData({...formData, amount: val, totalAmount: val});
                        }}
                        className="w-full bg-transparent border-none text-2xl font-black text-white outline-none placeholder:text-orange-400"
                        placeholder="0.00"
                      />
                      <span className="text-[10px] font-bold text-orange-200 uppercase">Lakhs</span>
                    </div>
                  </div>

                  <div className="p-6 bg-emerald-600 rounded-[2rem] shadow-lg shadow-emerald-200 dark:shadow-none transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[9px] font-black text-emerald-200 uppercase tracking-[0.2em]">Diversion Tax</label>
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-300" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-emerald-200">₹</span>
                      <input 
                        type="number" 
                        value={formData.diversionTaxAmount || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setFormData({...formData, diversionTaxAmount: val});
                        }}
                        className="w-full bg-transparent border-none text-2xl font-black text-white outline-none placeholder:text-emerald-400"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-blue-600 rounded-[2rem] shadow-lg shadow-blue-200 dark:shadow-none transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[9px] font-black text-blue-200 uppercase tracking-[0.2em]">Capital Investment</label>
                      <TrendingUp className="w-3.5 h-3.5 text-blue-300" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-blue-200">₹</span>
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.capitalInvestment || 0}
                        onChange={(e) => setFormData({...formData, capitalInvestment: Number(e.target.value)})}
                        className="w-full bg-transparent border-none text-2xl font-black text-white outline-none placeholder:text-blue-400"
                        placeholder="0.00"
                      />
                      <span className="text-[10px] font-bold text-blue-200 uppercase">Lakhs</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors">DG Set Details</label>
                    <input 
                      type="text" 
                      value={formData.dgSetDetails || ''}
                      onChange={(e) => setFormData({...formData, dgSetDetails: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors outline-none transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors border-none transition-colors"
                      placeholder="e.g. 1 x 223 KVA"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors">STP/STS Details</label>
                    <input 
                      type="text" 
                      value={formData.stsDetails || ''}
                      onChange={(e) => setFormData({...formData, stsDetails: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors outline-none transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors border-none transition-colors"
                      placeholder="e.g. STP 100 KLD"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors">
                  <div className="col-span-1 transition-colors transition-colors transition-colors">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Priority</label>
                    <select 
                      value={formData.priority || ''}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors h-[48px] outline-none transition-colors transition-colors transition-colors transition-colors transition-colors"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="col-span-2 transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block transition-colors transition-colors transition-colors">Current Status *</label>
                    <select 
                      value={formData.status || ''}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium transition-colors h-[48px] outline-none transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors transition-colors"
                      required
                    >
                      <option value="">Select Status</option>
                      {WORKFLOW_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-gray-50 dark:border-slate-800 transition-colors">
                  <h3 className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 transition-colors">
                    <Layers className="w-4 h-4 text-orange-500" />
                    Additional Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {formData.documentType === 'CTE' && (
                      <>
                         <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Project Type</label>
                          <select 
                            value={formData.projectType || ''} 
                            onChange={e => setFormData({ ...formData, projectType: e.target.value as any })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm font-medium outline-none transition-colors h-[48px]"
                          >
                            {projectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 transition-colors">Project Area</label>
                          <input 
                            value={formData.projectArea || ''} 
                            onChange={e => setFormData({ ...formData, projectArea: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm font-medium outline-none transition-colors h-[48px] transition-colors" 
                            placeholder="e.g. 10186 sqm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 transition-colors">Units Count</label>
                          <input 
                            value={formData.unitsCount || ''} 
                            onChange={e => setFormData({ ...formData, unitsCount: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm font-medium outline-none transition-colors h-[48px] transition-colors" 
                            placeholder="e.g. 155 units"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 transition-colors">Construction Details</label>
                          <textarea 
                            value={formData.constructionDetails || ''} 
                            onChange={e => setFormData({ ...formData, constructionDetails: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm font-medium outline-none h-20 transition-colors" 
                          />
                        </div>
                      </>
                    )}
                    {formData.documentType === 'CTO' && (
                      <>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 transition-colors">Product & Production Capacity</label>
                          <textarea 
                            value={formData.productionCapacity || ''} 
                            onChange={e => setFormData({ ...formData, productionCapacity: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm font-medium outline-none h-20 transition-colors transition-colors" 
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 transition-colors transition-colors">Compliance Conditions</label>
                          <textarea 
                            value={formData.complianceConditions || ''} 
                            onChange={e => setFormData({ ...formData, complianceConditions: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm font-medium outline-none h-24 transition-colors transition-colors" 
                            placeholder="Enter extracted legal conditions..."
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {isDuplicate && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mx-8 mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-xs font-bold">{duplicateMessage || "This document appears to be a duplicate."}</p>
                  </motion.div>
                )}
              </form>
            </div>

            {/* Right Column: Document Preview */}
            <div className="space-y-8 sticky top-8 transition-colors">
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors transition-colors">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/30 transition-colors">
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest transition-colors mb-0">Document Preview</h3>
                  <div className="flex items-center gap-2">
                    {previewUrl && (
                      <button 
                        type="button"
                        onClick={() => downloadFile(previewUrl, selectedFile?.name || 'document')}
                        className="p-2 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-50 transition-all"
                        title="Download Document"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => previewUrl && window.open(previewUrl, '_blank')}
                      className="p-2 bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 rounded-xl shadow-sm border border-orange-100 dark:border-orange-900/30 hover:bg-orange-50 transition-all"
                      title="Open Full Screen"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-8 space-y-6 transition-colors">
                  <div className="transition-colors transition-colors">
                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-[2rem] p-4 border border-gray-100 dark:border-slate-800 transition-colors transition-colors transition-colors">
                      <div className="aspect-[3/4] bg-white dark:bg-slate-900 rounded-[1.5rem] border border-gray-100 dark:border-slate-800 overflow-hidden relative group transition-colors shadow-inner">
                        {previewUrl ? (
                          <>
                            {(selectedFile?.type === 'application/pdf' || previewUrl.toLowerCase().includes('.pdf')) ? (
                              <div className="w-full h-full pointer-events-none">
                                <PdfViewer file={previewUrl} className="w-full h-full" />
                              </div>
                            ) : (
                              <img src={previewUrl} alt="Document Preview" className="w-full h-full object-contain transition-colors transition-colors" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-[2px] cursor-pointer" onClick={() => window.open(previewUrl, '_blank')}>
                              <Eye className="w-10 h-10 mb-2 transform scale-90 group-hover:scale-100 transition-transform" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Click to Expand</p>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center transition-colors transition-colors transition-colors">
                             <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 text-gray-300 dark:text-slate-700 rounded-2xl flex items-center justify-center mb-4 transition-colors transition-colors transition-colors">
                              <FileText className="w-8 h-8 transition-colors" />
                            </div>
                            <p className="text-xs font-black text-gray-400 dark:text-slate-600 uppercase tracking-widest transition-colors tracking-widest transition-colors transition-colors transition-colors">No Document Loaded</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Reused components */}
      <BillDetailsDrawer 
        isOpen={isDetailsModalOpen} 
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedBillForDetails(null);
        }} 
        bill={selectedBillForDetails}
        onEdit={(bill) => { setIsDetailsModalOpen(false); handleEdit(bill); }}
        onMarkPaid={() => {}}
        onVerify={(bill) => {
          setSelectedBillForDetails(bill);
          setWorkflowActionType('verify');
          setWorkflowActionTitle('Verify PCB Bill');
          setIsVerificationModalOpen(true);
        }}
        onApprove={(bill) => {
          setSelectedBillForDetails(bill);
          setWorkflowActionType('approve');
          setWorkflowActionTitle('Approve PCB Bill');
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
      
      <DeleteConfirmationModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Delete Document"
        message="Are you sure you want to remove this compliance document? This action cannot be undone."
      />
    </div>
  );
};
