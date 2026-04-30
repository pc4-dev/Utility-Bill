import React, { useState, useEffect } from 'react';
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
  Building2,
  MapPin,
  Calendar,
  Layers,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { Bill, Project, BillStatus, WORKFLOW_STATUSES } from '../types';
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

export const PollutionControlModule: React.FC = () => {
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
    operator: '', // Not strictly needed
    billType: ''   // For CTE/CTO
  });
  
  // Modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<Bill | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [workflowActionType, setWorkflowActionType] = useState<'verify' | 'approve' | 'initiate' | 'confirm'>('verify');
  const [workflowActionTitle, setWorkflowActionTitle] = useState('');
  
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
  const projectTypes = ["Residential", "Industrial"];
  const authorities = ["MPPCB", "CPCB", "Others"];

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
      
      const uniqueBillsMap = new Map();
      allBills.forEach(bill => {
        const id = bill.id || bill._id;
        if (id && bill.subcategory === 'pollution_control') {
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
    setFormData({
      ...formData,
      ...bill as any,
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
      await api.deleteBill(itemToDelete);
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
      await api.saveBill(updatedBill);
      toast.success('Document marked as Approved');
      fetchData();
    } catch (err) {
      toast.error('Failed to approve document');
    }
  };

  const filteredBills = bills.filter(bill => {
    const matchesProject = !filters.property || bill.propertyName === filters.property;
    const matchesType = !filters.billType || bill.documentType === filters.billType;
    const matchesStatus = !filters.status || bill.status === filters.status;
    const matchesDate = (!filters.startDate || (bill.issueDate && bill.issueDate >= filters.startDate)) && 
                       (!filters.endDate || (bill.issueDate && bill.issueDate <= filters.endDate));
    const matchesSearch = !filters.search || 
      bill.propertyName.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.companyName.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.consentNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.district?.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesProject && matchesType && matchesSearch && matchesDate && matchesStatus;
  });

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

  const handleExtract = async () => {
    if (!selectedFile) return;
    setIsExtracting(true);
    
    try {
      toast.loading('Uploading and processing...', { id: 'extraction' });
      const formDataUpload = new FormData();
      formDataUpload.append('files', selectedFile);
      const uploadRes = await api.uploadPollution(formDataUpload);
      const fileUrl = uploadRes.fileUrl;
      
      toast.loading('AI Extracting Compliance Data...', { id: 'extraction' });
      const fileData = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type;
      
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: fileData, mimeType: mimeType === "application/pdf" ? "application/pdf" : "image/jpeg" } },
            { text: `Extract all fields from this Pollution Control Document (CTE or CTO).
            
            IDENTIFICATION RULES:
            - If the document contains "Consent to Establish", "Establishment", "Establish", or "application for consent to establish", set documentType to "CTE".
            - If the document contains "Consent to Operate", "Operation", "Operator", or "renewal of consent", set documentType to "CTO".
            
            Special extraction instructions:
            - Capital Investment: Look for labels like "Capital investment in lakhs" or "Capital investment in Lakhs". Extract the numeric value only (e.g., if it says "Rs. 3130", return 3130).
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

      const extractedData = JSON.parse(response.text || '{}');
      
      // Determine document type carefully based on extracted keywords
      const rawExtractedType = (extractedData.documentType || '').toLowerCase();
      let documentType: 'CTE' | 'CTO' = 'CTO'; // Default to CTO if not clear

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

      const newFormData = {
        ...formData,
        ...extractedData,
        issueDate: extractedData.issueDate || formData.issueDate || new Date().toISOString().split('T')[0],
        amount: extractedData.capitalInvestment || formData.amount || 0,
        documentType: documentType || 'CTO',
        dueDate: extractedData.validityTo || formData.validityTo,
        propertyName: extractedData.projectName || formData.propertyName,
        fileUrl: fileUrl,
        billId: extractedData.consentNumber || `POL-${Date.now().toString().slice(-6)}`,
        subcategory: 'pollution_control',
        category: 'government_compliance',
      };

      setFormData(newFormData);
      // Removed line that overwrote previewUrl with server URL to keep working blob URL during session
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

      await api.saveBill(billToSave as Bill);
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
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3 transition-colors">
            <Wind className="w-8 h-8 text-orange-600" />
            Pollution Control Module
          </h1>
          <p className="text-text-secondary mt-1 transition-colors">Manage CTE and CTO environmental compliance documents</p>
        </div>
        
        <div className="flex items-center gap-3">
          {view !== 'list' && (
            <button onClick={() => setView('list')} className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <div className="flex items-center gap-2">
            {user?.role !== 'GOV_TAX_ENTRY' && (
              <div className="flex items-center gap-2 p-1 bg-gray-50 dark:bg-slate-800 rounded-xl transition-colors shrink-0">
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
                    setView('form');
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-blue-600 bg-white dark:bg-slate-700 rounded-lg shadow-sm hover:bg-blue-50 transition-all border border-blue-100"
                >
                  + Manual CTE
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
                    setView('form');
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-purple-600 bg-white dark:bg-slate-700 rounded-lg shadow-sm hover:bg-purple-50 transition-all border border-purple-100"
                >
                  + Manual CTO
                </button>
              </div>
            )}

            <button 
              onClick={() => {
                setFormData({ ...formData, consentNumber: '', validityTo: '', validityFrom: '', issueDate: new Date().toISOString().split('T')[0] });
                setSelectedFile(null);
                setPreviewUrl(null);
                setView('upload');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm font-bold text-xs"
            >
              <Upload className="w-4 h-4" />
              Upload Documents
            </button>
          </div>
        </div>
      </div>

      {view === 'list' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div 
              onClick={() => { setFilters({ ...filters, billType: '', status: '' }); }}
              className={cn(
                "bg-white dark:bg-slate-900 px-6 py-8 rounded-3xl border shadow-sm transition-all cursor-pointer hover:shadow-md",
                (filters.billType === '' && filters.status === '') ? "border-orange-500 ring-2 ring-orange-100" : "border-gray-100 dark:border-slate-800"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl transition-colors">
                  <ShieldCheck className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg uppercase tracking-wider transition-colors">TOTAL</span>
              </div>
              <h3 className="text-3xl font-black text-text-primary transition-colors">{bills.length}</h3>
              <p className="text-text-secondary text-xs font-bold uppercase mt-1 transition-colors">Total Documents</p>
            </div>

            <div 
              onClick={() => { setFilters({ ...filters, billType: '', status: 'Pending' }); }}
              className={cn(
                "bg-white dark:bg-slate-900 px-6 py-8 rounded-3xl border shadow-sm transition-all cursor-pointer hover:shadow-md",
                filters.status === 'Pending' ? "border-orange-500 ring-2 ring-orange-100" : "border-gray-100 dark:border-slate-800"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl transition-colors">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg uppercase tracking-wider transition-colors">PENDING</span>
              </div>
              <h3 className="text-3xl font-black text-text-primary transition-colors">{bills.filter(b => b.status === 'Pending').length}</h3>
              <p className="text-text-secondary text-xs font-bold uppercase mt-1 transition-colors">Pending Review</p>
            </div>

            <div 
              onClick={() => { setFilters({ ...filters, billType: 'CTE', status: '' }); }}
              className={cn(
                "bg-white dark:bg-slate-900 px-6 py-8 rounded-3xl border shadow-sm transition-all cursor-pointer hover:shadow-md",
                filters.billType === 'CTE' ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-100 dark:border-slate-800"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl transition-colors">
                  <Building2 className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg uppercase tracking-wider transition-colors">CTE</span>
              </div>
              <h3 className="text-3xl font-black text-text-primary transition-colors">{bills.filter(b => b.documentType === 'CTE').length}</h3>
              <p className="text-text-secondary text-xs font-bold uppercase mt-1 transition-colors">Establish Consents</p>
            </div>

            <div 
              onClick={() => { setFilters({ ...filters, billType: 'CTO', status: '' }); }}
              className={cn(
                "bg-white dark:bg-slate-900 px-6 py-8 rounded-3xl border shadow-sm transition-all cursor-pointer hover:shadow-md",
                filters.billType === 'CTO' ? "border-orange-500 ring-2 ring-orange-100" : "border-gray-100 dark:border-slate-800"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl transition-colors">
                  <Activity className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg uppercase tracking-wider transition-colors">CTO</span>
              </div>
              <h3 className="text-3xl font-black text-text-primary transition-colors">{bills.filter(b => b.documentType === 'CTO').length}</h3>
              <p className="text-text-secondary text-xs font-bold uppercase mt-1 transition-colors">Operate Consents</p>
            </div>

            <div 
              onClick={() => { setFilters({ ...filters, billType: '', status: 'Approved' }); }}
              className={cn(
                "bg-white dark:bg-slate-900 px-6 py-8 rounded-3xl border shadow-sm transition-all cursor-pointer hover:shadow-md",
                filters.status === 'Approved' ? "border-orange-500 ring-2 ring-orange-100" : "border-gray-100 dark:border-slate-800"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl transition-colors">
                  <CheckCircle2 className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg uppercase tracking-wider transition-colors">APPROVED</span>
              </div>
              <h3 className="text-3xl font-black text-text-primary transition-colors">{bills.filter(b => b.status === 'Approved').length}</h3>
              <p className="text-text-secondary text-xs font-bold uppercase mt-1 transition-colors">Total Approved</p>
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
              All Documents
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

          <Filters 
            filters={filters}
            setFilters={setFilters}
            properties={Array.from(new Set(projects.map(p => p.name)))}
            options={{
              billTypes: ['CTE', 'CTO']
            }}
          />

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Project / Unit</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Document</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Authority</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Investment</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status / Date</th>
                  <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {isLoading ? (
                  [1, 2, 3].map(i => <tr key={i}><td colSpan={6} className="p-6"><Skeleton className="h-12 w-full" /></td></tr>)
                ) : filteredBills.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-text-secondary">No records found</td></tr>
                ) : filteredBills.map((bill, idx) => (
                  <tr key={bill._id || bill.id || `pol-bill-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-text-primary">{bill.propertyName}</div>
                      <div className="text-[10px] text-text-secondary uppercase">{bill.companyName}</div>
                      <div className={cn(
                        "mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md inline-block uppercase tracking-wider",
                        bill.status === 'Approved' ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"
                      )}>
                        {bill.status || 'Pending'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-md inline-block mb-1", 
                        bill.documentType === 'CTE' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                      )}>
                        {bill.documentType === 'CTE' ? 'CTE (Establish)' : 'CTO (Operate)'}
                      </div>
                      <div className="font-mono text-xs">{bill.consentNumber}</div>
                      {(bill.dgSetDetails || bill.stsDetails) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {bill.dgSetDetails && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded border border-orange-100 flex items-center gap-1">
                              <Wind className="w-2 h-2" />
                              DG: {bill.dgSetDetails}
                            </span>
                          )}
                          {bill.stsDetails && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 flex items-center gap-1">
                              <Droplets className="w-2 h-2" />
                              STS: {bill.stsDetails}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 font-medium">{bill.authority}</td>
                    <td className="py-4 px-6 font-bold text-text-primary">
                      {bill.capitalInvestment ? `₹${bill.capitalInvestment} L` : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        {bill.documentType === 'CTE' ? (
                          (bill.issueDate || bill.billDate) ? (
                            <div className="text-blue-600 font-bold text-xs">
                              Issued: {(() => {
                                const d = new Date(bill.issueDate || bill.billDate);
                                return isNaN(d.getTime()) ? (bill.issueDate || bill.billDate) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                              })()}
                            </div>
                          ) : (
                            <div className="text-text-secondary text-xs font-medium italic">Issue Date N/A</div>
                          )
                        ) : (
                          bill.validityTo ? (
                            <>
                              <div className={cn("font-bold text-xs", new Date(bill.validityTo) < new Date() ? "text-red-600" : "text-orange-600")}>
                                Expires: {(() => {
                                  const d = new Date(bill.validityTo);
                                  return isNaN(d.getTime()) ? bill.validityTo : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                })()}
                              </div>
                              {(() => {
                                const expiryDate = new Date(bill.validityTo);
                                if (isNaN(expiryDate.getTime())) return null;
                                const today = new Date();
                                const sevenMonthsFromNow = new Date();
                                sevenMonthsFromNow.setMonth(sevenMonthsFromNow.getMonth() + 7);
                                
                                if (expiryDate <= sevenMonthsFromNow && expiryDate > today) {
                                  return (
                                    <div className="flex items-center gap-1 text-[9px] font-black text-orange-600 uppercase animate-pulse">
                                      <Clock className="w-3 h-3" />
                                      Next Process Due
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </>
                          ) : (
                            <div className="text-text-secondary text-xs font-medium italic">Permanent / N/A</div>
                          )
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-1.5">
                        {bill.status !== 'Approved' && user?.role !== 'GOV_TAX_ENTRY' && (
                          <button 
                            onClick={() => handleApprove(bill)} 
                            className="p-2 hover:bg-orange-50 rounded-lg text-orange-600 transition-colors"
                            title="Mark as Approved"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => { setSelectedBillForDetails(bill); setIsDetailsModalOpen(true); }} 
                          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-text-secondary transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Workflow Actions Removed - Only available in details modal */}

                        {(bill.fileUrl || (bill.attachments && bill.attachments[0]?.url)) && user?.role !== 'GOV_TAX_ENTRY' && (
                          <>
                            <a 
                              href={bill.fileUrl || bill.attachments![0].url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-text-secondary transition-colors"
                              title="Open Document"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button 
                              onClick={() => downloadFile(bill.fileUrl || bill.attachments![0].url, `Pollution_${bill.consentNumber || 'Document'}`)} 
                              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-text-secondary transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {user?.role === 'ADMIN' && (
                          <>
                            <button onClick={() => handleEdit(bill)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-blue-600 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(bill._id || bill.id!)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-red-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

      {view === 'upload' && (
        <div className="max-w-4xl mx-auto py-12">
          <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800 text-center space-y-6">
             <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-10 h-10 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Extract Pollution Document</h2>
              <p className="text-text-secondary mt-2">Upload your CTE or CTO document (PDF/Image) for automatic extraction</p>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              {selectedFile ? (
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl w-full max-w-md">
                  <FileText className="w-10 h-10 text-text-secondary" />
                  <div className="flex-1 text-left">
                    <p className="font-bold text-text-primary truncate">{selectedFile.name}</p>
                    <p className="text-xs text-text-secondary uppercase">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="relative group cursor-pointer w-full max-w-md">
                  <input type="file" onChange={handleFileChange} accept=".pdf,image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="p-12 border-2 border-dashed border-gray-100 group-hover:border-orange-400 rounded-3xl group-hover:bg-orange-50/50 transition-all">
                    <p className="text-xs font-bold text-text-secondary uppercase">Drop file here or click to browse</p>
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleExtract}
                disabled={!selectedFile || isExtracting}
                className="w-full max-w-md py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-[13px] hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20"
              >
                {isExtracting ? <><Loader2 className="w-5 h-5 animate-spin" /> Extracting...</> : <><Activity className="w-5 h-5" /> Start AI Extraction</>}
              </button>
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
          </div>
        </div>
      )}

      {view === 'form' && (
        <div className="max-w-6xl mx-auto space-y-8">
           <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b border-gray-50 pb-6 transition-colors">
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <FileText className="w-6 h-6 text-orange-600" />
                    Document Verification
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">Type:</span>
                    <div className="flex bg-gray-50 dark:bg-slate-800 p-1 rounded-xl transition-colors">
                      {['CTE', 'CTO'].map(t => (
                        <div 
                          key={t}
                          className={cn(
                            "px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all", 
                            formData.documentType === t 
                              ? "bg-white dark:bg-slate-700 text-orange-600 shadow-sm" 
                              : "text-text-secondary opacity-40"
                          )}
                        >
                          {t === 'CTE' ? 'CTE (Establish)' : 'CTO (Operate)'}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em] ml-1">Company / Applicant</label>
                    <input 
                      required 
                      value={formData.companyName} 
                      onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em] ml-1">Project Name</label>
                    <select 
                      required 
                      value={formData.propertyName} 
                      onChange={e => setFormData({ ...formData, propertyName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none"
                    >
                      <option key="default" value="">Select Project</option>
                      {projects.map(p => <option key={p._id || p.id || p.name} value={p.name}>{p.name}</option>)}
                      <option key="others" value="Others">Others</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em] ml-1">Consent Number</label>
                    <input 
                      required 
                      value={formData.consentNumber} 
                      onChange={e => setFormData({ ...formData, consentNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-mono text-sm outline-none" 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em] ml-1">Full Location Details</label>
                    <input 
                      value={formData.location} 
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none" 
                      placeholder="Village, Tehsil, District context..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em] ml-1">Khasra Number</label>
                    <input 
                      value={formData.khasraNumber} 
                      onChange={e => setFormData({ ...formData, khasraNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none" 
                      placeholder="e.g. 152, 153/1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em] ml-1">Pollution Category</label>
                    <select 
                      value={formData.pollutionCategory} 
                      onChange={e => setFormData({ ...formData, pollutionCategory: e.target.value as any })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none"
                    >
                      {pollutionCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em] ml-1">Priority</label>
                    <select 
                      required 
                      value={formData.priority} 
                      onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em] ml-1">Issue Date</label>
                    <input 
                      type="date" 
                      value={formData.issueDate} 
                      onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em] ml-1">Valid Until (Expiry)</label>
                    <input 
                      type="date" 
                      value={formData.validityTo} 
                      onChange={e => setFormData({ ...formData, validityTo: e.target.value, dueDate: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em] ml-1">Status *</label>
                    <div className="relative">
                      <select 
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
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

                <div className="space-y-6 pt-6 border-t border-gray-50 transition-colors">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Activity className="w-4 h-4 text-orange-500" />
                    Additional Extraction Details
                  </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Latitude</label>
                        <input 
                          value={formData.latitude} 
                          onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none" 
                          placeholder="e.g. 26.2183"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Longitude</label>
                        <input 
                          value={formData.longitude} 
                          onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none" 
                          placeholder="e.g. 78.1828"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Capital Investment (Ex: 10.5 Lakhs)</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          value={formData.capitalInvestment} 
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setFormData({ ...formData, capitalInvestment: val, amount: val });
                          }}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">DG Sets Details</label>
                        <input 
                          value={formData.dgSetDetails || ''} 
                          onChange={e => setFormData({ ...formData, dgSetDetails: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none" 
                          placeholder="e.g. 1 x 223 KVA"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">STS Details</label>
                        <input 
                          value={formData.stsDetails || ''} 
                          onChange={e => setFormData({ ...formData, stsDetails: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none" 
                          placeholder="e.g. STP 100 KLD"
                        />
                      </div>
                      {formData.documentType === 'CTE' ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Project Type</label>
                            <select 
                              value={formData.projectType} 
                              onChange={e => setFormData({ ...formData, projectType: e.target.value as any })}
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none"
                            >
                              {projectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Project Area</label>
                            <input 
                              value={formData.projectArea} 
                              onChange={e => setFormData({ ...formData, projectArea: e.target.value })}
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none" 
                              placeholder="e.g. 10186 sqm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Units Count</label>
                            <input 
                              value={formData.unitsCount} 
                              onChange={e => setFormData({ ...formData, unitsCount: e.target.value })}
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none" 
                              placeholder="e.g. 155 units"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Construction Details</label>
                            <textarea 
                              value={formData.constructionDetails} 
                              onChange={e => setFormData({ ...formData, constructionDetails: e.target.value })}
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none h-20" 
                            />
                          </div>
                        </>
                      ) : (
                        <>
                           <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Product & Production Capacity</label>
                            <textarea 
                              value={formData.productionCapacity} 
                              onChange={e => setFormData({ ...formData, productionCapacity: e.target.value })}
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none h-20" 
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Compliance Conditions</label>
                            <textarea 
                              value={formData.complianceConditions} 
                              onChange={e => setFormData({ ...formData, complianceConditions: e.target.value })}
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl font-medium outline-none h-24" 
                              placeholder="Enter extracted legal conditions..."
                            />
                          </div>
                        </>
                      )}
                    </div>
                </div>
              </div>

               <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setView('list')} className="px-8 py-3 rounded-2xl font-bold text-text-secondary hover:bg-gray-100 transition-all">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-8 py-3 bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-700 transition-all disabled:opacity-50">
                  {isLoading ? 'Saving...' : 'Save Document'}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div 
                onClick={() => window.open(previewUrl || '', '_blank')}
                className="bg-gray-900 dark:bg-slate-950 rounded-3xl overflow-hidden shadow-2xl aspect-[3/4] relative group cursor-pointer border border-gray-100 dark:border-slate-800 transition-colors"
              >
                {previewUrl && (
                  (selectedFile?.type === 'application/pdf' || previewUrl.toLowerCase().includes('.pdf') || previewUrl.startsWith('data:application/pdf') || previewUrl.includes('raw/upload')) ? (
                    <PdfViewer key={previewUrl} file={previewUrl} className="w-full h-full" />
                  ) : (
                    <img 
                      key={previewUrl}
                      src={previewUrl} 
                      alt="Document Preview" 
                      className="w-full h-full object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  )
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-full text-gray-900 dark:text-white shadow-xl transition-colors">
                    <Eye className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {previewUrl && (
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-2xl flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400 transition-colors">
                      {(selectedFile?.type === 'application/pdf' || previewUrl.toLowerCase().includes('.pdf')) ? <FileText className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary transition-colors">{(selectedFile?.type === 'application/pdf' || previewUrl.toLowerCase().includes('.pdf')) ? 'PDF' : 'Image'} Preview Options</p>
                      <p className="text-xs text-text-secondary transition-colors">You can open this in a new tab or download for your records.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <a 
                      href={previewUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </a>
                    <button 
                      type="button"
                      onClick={() => downloadFile(previewUrl || '', selectedFile?.name || `Pollution_${formData.consentNumber || 'Document'}`)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                </div>
              )}
              
              <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex gap-4 transition-colors">
                <AlertCircle className="w-6 h-6 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-orange-900 dark:text-orange-400 transition-colors">Review Required</p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1 transition-colors">Please double-check the extracted values against the original document image to ensure 100% accuracy before saving.</p>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Reused components */}
      <BillDetailsDrawer 
        isOpen={isDetailsModalOpen} 
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedBillForDetails(null);
          fetchData();
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
