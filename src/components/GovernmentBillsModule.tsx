import React, { useState, useEffect } from 'react';
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
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { Bill, Project, UtilityType, WORKFLOW_STATUSES } from '../types';
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
import { Edit2 } from 'lucide-react';
import { Filters } from './Filters';

import { Skeleton } from './ui/Skeleton';

export const GovernmentBillsModule: React.FC = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [view, setView] = useState<'list' | 'upload' | 'form'>('list');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Type detection
  const [detectedType, setDetectedType] = useState<'Property Tax (MCG)' | 'Diversion Tax (RD)' | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    property: '',
    status: '',
    date: '',
    startDate: '',
    endDate: '',
    region: 'All', // Used for SubModule/Type
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

  const [selectedBillForDetails, setSelectedBillForDetails] = useState<Bill | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [workflowActionType, setWorkflowActionType] = useState<'verify' | 'approve' | 'initiate' | 'confirm'>('verify');
  const [workflowActionTitle, setWorkflowActionTitle] = useState('');

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

  useEffect(() => {
    fetchData();
  }, []);

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
      setBills(allBills.filter(b => b.utilityType === 'Property Tax (MCG)' || b.utilityType === 'Diversion Tax (RD)'));
      setProjects(allProjects);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBills = bills.filter(bill => {
    const matchesSubModule = filters.region === 'All' || bill.utilityType === filters.region;
    const matchesProject = !filters.property || bill.propertyName === filters.property;
    const matchesYear = !filters.year || bill.year === filters.year;
    const matchesMonth = !filters.month || bill.month === filters.month;
    const matchesStatus = !filters.status || bill.status === filters.status;
    const matchesSearch = !filters.search || 
      bill.propertyName.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.ownerName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.depositorName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.receiptNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.challanNumber?.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesSubModule && matchesProject && matchesYear && matchesMonth && matchesStatus && matchesSearch;
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
    
    try {
      // 1. Upload file
      const formDataUpload = new FormData();
      formDataUpload.append('files', selectedFile);
      const uploadRes = await api.uploadGovernmentBill(formDataUpload);
      const fileUrl = uploadRes.fileUrl;

      // 2. Extract client-side
      toast.loading('AI Detect & Extract...', { id: 'extraction' });
      
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

      const mappedType = extractedData.type === 'PROPERTY_TAX' ? 'Property Tax (MCG)' : 'Diversion Tax (RD)';
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
        totalAmount: extractedData.totalAmount || extractedData.paidAmount || extractedData.amount || 0,
        transactionDate: extractedData.transactionDate || '',
        transactionTime: extractedData.transactionTime || '',
        billingPeriod: extractedData.billingPeriod || extractedData.assessmentYear || extractedData.challanPeriod || '',
        billDate: extractedData.date || new Date().toISOString().split('T')[0],
        fileUrl: fileUrl
      }));

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

      await api.saveBill(billToSave as Bill);
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
      await api.saveBill(updatedBill);
      toast.success('Payment recorded successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to update payment status');
    }
  };

  const handleEditBill = (bill: Bill) => {
    setFormData(bill);
    setDetectedType(bill.utilityType as any);
    setView('form');
    setIsDetailsModalOpen(false);
  };

  const propertyTaxCount = bills.filter(b => b.utilityType === 'Property Tax (MCG)').length;
  const diversionTaxCount = bills.filter(b => b.utilityType === 'Diversion Tax (RD)').length;
  const allCount = bills.length;

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2 transition-colors">
            <Building2 className="w-8 h-8 text-orange-600" />
            Government Bills Module
          </h1>
          <p className="text-text-secondary mt-1 transition-colors">Manage Property Tax (MCG) and Diversion Tax (RD)</p>
        </div>
        
        <div className="flex items-center gap-3">
          {view !== 'list' && (
            <button 
              onClick={() => setView('list')}
              className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all border border-gray-100 dark:border-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </button>
          )}
          <button 
            onClick={() => {
              setFormData({});
              setSelectedFile(null);
              setPreviewUrl(null);
              setDetectedType(null);
              setView('upload');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Bill
          </button>
        </div>
      </div>

      {view === 'list' && (
        <div className="flex flex-wrap items-center gap-2 mb-6 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
          <button 
            onClick={() => {
              setFilters({ ...filters, region: 'All', status: '' });
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              filters.region === 'All' && filters.status === '' ? "bg-orange-600 text-white shadow-sm" : "text-text-secondary hover:bg-gray-50 dark:hover:bg-slate-800"
            )}
          >
            All Bills
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
              filters.region === 'All' && filters.status === '' ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-slate-800 text-text-secondary"
            )}>
              {allCount}
            </span>
          </button>

          <button 
            onClick={() => {
              setFilters({ ...filters, region: 'All', status: 'Pending' });
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              filters.status === 'Pending' ? "bg-orange-600 text-white shadow-sm" : "text-text-secondary hover:bg-gray-50 dark:hover:bg-slate-800"
            )}
          >
            Pending Bills
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
              filters.status === 'Pending' ? "bg-orange-500 text-white" : "bg-orange-100 dark:bg-orange-900/30 text-orange-600"
            )}>
              {bills.filter(b => b.status === 'Pending').length}
            </span>
          </button>

          <button 
            onClick={() => {
              setFilters({ ...filters, region: 'Property Tax (MCG)', status: '' });
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              filters.region === 'Property Tax (MCG)' && filters.status === '' ? "bg-orange-600 text-white shadow-sm" : "text-text-secondary hover:bg-gray-50 dark:hover:bg-slate-800"
            )}
          >
            Property Tax (MCG)
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
              filters.region === 'Property Tax (MCG)' && filters.status === '' ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-slate-800 text-text-secondary"
            )}>
              {propertyTaxCount}
            </span>
          </button>
          <button 
            onClick={() => {
              setFilters({ ...filters, region: 'Diversion Tax (RD)', status: '' });
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              filters.region === 'Diversion Tax (RD)' && filters.status === '' ? "bg-orange-600 text-white shadow-sm" : "text-text-secondary hover:bg-gray-50 dark:hover:bg-slate-800"
            )}
          >
            Diversion Tax (RD)
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
              filters.region === 'Diversion Tax (RD)' && filters.status === '' ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-slate-800 text-text-secondary"
            )}>
              {diversionTaxCount}
            </span>
          </button>
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            <button
              onClick={() => setFilters({ ...filters, status: '' })}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                filters.status === '' 
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-200" 
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

          {/* Filters Bar */}
          <Filters 
            filters={filters}
            setFilters={setFilters}
            properties={Array.from(new Set(projects.map(p => p.name)))}
          />

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 transition-colors">
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Type / ID</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Depositor / Owner</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Project</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Arrears</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Bill Period</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 transition-colors">
                  {isLoading ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <tr key={i}>
                          <td className="py-4 px-6">
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-32" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-28" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-4 px-6"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-4 px-6">
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </td>
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
                      <td colSpan={8} className="px-6 py-12 text-center text-text-secondary transition-colors">
                        No government bills recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map(bill => (
                      <tr key={bill._id || bill.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col min-w-[120px]">
                            <span className="text-sm font-medium text-text-primary transition-colors">{bill.utilityType}</span>
                            <span className="text-xs text-text-secondary font-mono transition-colors">{bill.billId}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary min-w-[150px] transition-colors">
                          {bill.utilityType === 'Property Tax (MCG)' ? bill.ownerName : bill.depositorName}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary capitalize transition-colors">
                          {bill.propertyName}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-text-primary transition-colors">
                          ₹{bill.amount?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                           {bill.outstandingAmount !== undefined ? (
                             <span className={cn(
                               "text-sm font-bold transition-colors",
                               bill.outstandingAmount > 0 ? "text-red-600" : "text-text-secondary opacity-50"
                             )}>
                               ₹{bill.outstandingAmount.toLocaleString()}
                             </span>
                           ) : (
                             <span className="text-sm text-text-secondary opacity-30">-</span>
                           )}
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col min-w-[100px]">
                             <span className="text-sm font-bold text-text-primary transition-colors">{bill.billingPeriod || 'N/A'}</span>
                             <span className="text-[10px] text-text-secondary transition-colors transition-colors">Date: {bill.billDate}</span>
                             {bill.submissionDateTime && (
                                <div className="text-[10px] text-orange-500 font-bold mt-0.5 uppercase tracking-tighter transition-colors">
                                   Sub: {new Date(bill.submissionDateTime).toLocaleDateString()}
                                </div>
                             )}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium transition-colors",
                            bill.status === 'Paid' || bill.status === 'Payment Confirmed' ? "bg-green-100 dark:bg-emerald-900/30 text-green-700 dark:text-emerald-400" : "bg-yellow-100 dark:bg-amber-900/30 text-yellow-700 dark:text-amber-400"
                          )}>
                            {bill.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                             <button 
                               onClick={() => {
                                 setSelectedBillForDetails(bill);
                                 setIsDetailsModalOpen(true);
                               }}
                               className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded-lg transition-all flex items-center gap-1 group whitespace-nowrap"
                               title="View Details"
                             >
                               <Eye className="w-4 h-4" />
                               <span className="hidden sm:inline text-xs font-medium">View</span>
                             </button>

                             {/* Workflow Actions Removed - Only available in details modal */}

                              {user?.role === 'ADMIN' && (
                                <button 
                                  onClick={() => handleDelete(bill.id || bill._id!)}
                                  className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/20"
                                  title="Delete Bill"
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
                                 className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all shadow-sm shadow-orange-500/10"
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
        </div>
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
              <h2 className="text-xl font-black text-gray-900">Upload Government Bill</h2>
              <p className="text-gray-500 mt-2">Upload Property Tax (MCG) or Diversion Tax (RD) document. AI will detect the type and extract all values.</p>
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
                  onClick={() => handleExtract()}
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-10">
            <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Verify {formData.utilityType} Details</h2>
                <p className="text-gray-500 text-sm mt-1">Review AI extracted data and complete missing info</p>
              </div>
              <span className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                <CheckCircle2 className="w-4 h-4" />
                OCR Processed
              </span>
            </div>

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
                  </select>
                  {formData.companyName === 'Others' && (
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
                          <option value="Paid">Paid</option>
                          <option value="Pending">Pending</option>
                          <option value="Overdue">Overdue</option>
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
                          <option value="Paid">Paid</option>
                          <option value="Pending">Pending</option>
                          <option value="Overdue">Overdue</option>
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

              {/* Document Review Section */}
              {previewUrl && (
                <div className="mt-10 pt-8 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-orange-600" />
                    Document Review
                  </h3>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-1/2 aspect-[4/3] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm relative group">
                        {selectedFile?.type.includes('pdf') ? (
                          <div className="w-full h-full relative">
                            <PdfViewer file={previewUrl} />
                          </div>
                        ) : (
                          <img 
                            src={previewUrl} 
                            alt="Bill Document" 
                            className="w-full h-full object-contain" 
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-black/50 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <p className="text-white text-[10px] font-medium uppercase tracking-wider">
                             Preview of uploaded document
                           </p>
                        </div>
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center space-y-4">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <h4 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-orange-600" />
                            File Information
                          </h4>
                          <p className="text-xs text-gray-500 font-mono mb-4 truncate">
                            {selectedFile?.name}
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              type="button"
                              onClick={() => previewUrl && selectedFile && downloadFile(previewUrl, selectedFile.name)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Full View
                            </a>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                           <p className="text-[11px] text-blue-700 leading-relaxed flex gap-2">
                             <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                             Review the original bill here to verify extracted data. Discrepancies can be corrected in the fields above.
                           </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-4 pt-8 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setView('upload')}
                  className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-8 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Bill Record
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      )}
      {/* Modals */}
      <BillDetailsDrawer 
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedBillForDetails(null);
          fetchData();
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
