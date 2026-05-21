import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Save, 
  Search,
  Filter,
  ArrowRight,
  Download,
  Eye,
  ArrowLeft,
  Trash2,
  ChevronDown,
  CreditCard,
  Building2,
  Briefcase,
  User,
  Clock,
  Edit2,
  MapPin,
  Tag,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { Bill, Project, BillStatus, ModuleProps, WORKFLOW_STATUSES } from '../types';
import { cn } from '../utils';
import { Type } from "@google/genai";
import { generateContentWithRetry } from '../services/geminiService';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import { BillDetailsDrawer } from './BillDetailsDrawer';
import { WorkflowModal } from './WorkflowModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { Filters } from './Filters';
import { 
  CheckSquare,
  ShieldCheck,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

export const OtherExpensesModule: React.FC<ModuleProps> = ({ projects: propsProjects, isLoadingProjects, allBills: propsBills }) => {
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

  const initialExpenses = useMemo(() => {
    const filtered = propsBills ? propsBills.filter(b => b.utilityType === 'Other Bill' || b.utilityType === 'Staff Welfare' || b.utilityType === 'Office Supplies' || b.utilityType === 'Repairs & Maintenance' || b.utilityType === 'Professional Fees' || b.utilityType === 'Travelling/Conveyance' || b.utilityType === 'Bank Charges' || b.utilityType === 'Miscellaneous' || b.category === 'expense') : [];
    return normalizeBills(filtered);
  }, [propsBills]);

  const [expenses, setExpenses] = useState<Bill[]>(initialExpenses);
  const [projects, setProjects] = useState<Project[]>(propsProjects || []);
  const [companies, setCompanies] = useState<{ companyName: string, status: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const extractionAbortController = React.useRef<AbortController | null>(null);
  const [view, setView] = useState<'list' | 'upload' | 'form'>('list');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({
    search: '',
    property: '',
    company: '',
    category: '',
    status: '',
    date: '',
    startDate: '',
    endDate: ''
  });
  
  const [selectedExpenseForDetails, setSelectedExpenseForDetails] = useState<Bill | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [workflowActionType, setWorkflowActionType] = useState<'verify' | 'approve' | 'initiate' | 'confirm' | 'tally'>('verify');
  const [workflowActionTitle, setWorkflowActionTitle] = useState('');
  const [duplicateFound, setDuplicateFound] = useState<boolean>(false);
  const [duplicateMessage, setDuplicateMessage] = useState<string>('');
  
  const [formData, setFormData] = useState<Partial<Bill>>({
    category: 'expense',
    subcategory: '',
    expenseTitle: '',
    companyName: '',
    amount: 0,
    billDate: new Date().toISOString().split('T')[0],
    vendorName: '',
    propertyName: '',
    paidBy: user?.name || '',
    modeOfPayment: '',
    description: '',
    location: '',
    status: 'Pending',
    priority: 'Normal',
  });

  const expenseSubcategories = [
    "Travel & Conveyance",
    "Kitchen Expenses",
    "Water Camper + Milk",
    "Celebration & Gifts",
    "Office Stationery",
    "Miscellaneous"
  ];

  const paymentMethods = ["Cash", "UPI", "Card", "Net Banking"];

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Real-time duplicate check
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const performCheck = async () => {
      const canCheck = formData.billNumber && formData.serviceProvider;
      if (view === 'form' && canCheck) {
        try {
          const res = await api.checkDuplicate({
            ...formData,
            utilityType: 'Other Bill',
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
  const handleEdit = (bill: Bill) => {
    const normalizedBill = {
      ...bill,
      id: bill.id || (bill as any)._id,
      propertyName: bill.propertyName || bill.project_name || '',
      companyName: bill.companyName || bill.company_name || '',
      status: bill.status || 'Pending',
      billDate: bill.billDate || bill.bill_date || new Date().toISOString().split('T')[0],
      amount: bill.amount || (bill as any).total_amount || 0,
      subcategory: bill.subcategory || bill.category || ''
    };
    setFormData(normalizedBill);
    const url = bill.fileUrl || (bill.attachments && bill.attachments[0]?.url) || null;
    setPreviewUrl(url);
    setView('form');
  };

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
      const filtered = propsBills.filter(b => b.utilityType === 'Other Bill' || b.utilityType === 'Staff Welfare' || b.utilityType === 'Office Supplies' || b.utilityType === 'Repairs & Maintenance' || b.utilityType === 'Professional Fees' || b.utilityType === 'Travelling/Conveyance' || b.utilityType === 'Bank Charges' || b.utilityType === 'Miscellaneous' || b.category === 'expense');
      setExpenses(normalizeBills(filtered));
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
      setCompanies(fetchedCompanies.filter(c => c.status === 'Active'));
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
      const [allExpenses, fetchedProjects] = await Promise.all([
        api.getExpenses(),
        !propsProjects ? api.getProjects() : Promise.resolve(propsProjects)
      ]);
      setExpenses(normalizeBills(allExpenses));
      if (!propsProjects) {
        setProjects(fetchedProjects);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesProject = !filters.property || expense.propertyName === filters.property;
    const matchesCompany = !filters.company || expense.companyName === filters.company;
    const matchesCategory = !filters.category || expense.subcategory === filters.category;
    const matchesStatus = !filters.status || expense.status === filters.status;
    const matchesDate = (!filters.startDate || (expense.billDate && expense.billDate >= filters.startDate)) && 
                       (!filters.endDate || (expense.billDate && expense.billDate <= filters.endDate));
    const matchesSearch = !filters.search || 
      expense.expenseTitle?.toLowerCase().includes(filters.search.toLowerCase()) ||
      expense.vendorName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      expense.propertyName.toLowerCase().includes(filters.search.toLowerCase());
    
    // Month & Year filtering
    const bDate = expense.billDate ? new Date(expense.billDate) : null;
    const billMonth = bDate ? monthNames[bDate.getMonth()] : '';
    const billYear = bDate ? bDate.getFullYear().toString() : '';
    
    const matchesMonth = !selectedMonth || billMonth === selectedMonth;
    const matchesYear = !selectedYear || billYear === selectedYear;
    
    return matchesProject && matchesCompany && matchesCategory && matchesStatus && matchesSearch && matchesDate && matchesMonth && matchesYear;
  }).sort((a, b) => {
    const dateA = a.createdAt || '';
    const dateB = b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  const handleWorkflow = (action: 'verify' | 'approve' | 'initiate' | 'confirm' | 'tally', bill: Bill) => {
    setSelectedExpenseForDetails(bill);
    setWorkflowActionType(action);
    setWorkflowActionTitle(
      action === 'verify' ? 'Verify Expense' : 
      action === 'approve' ? 'Approve Expense' : 
      action === 'initiate' ? 'Initiate Payment' : 
      action === 'confirm' ? 'Confirm Payment' : 'Post to Tally'
    );
    setIsVerificationModalOpen(true);
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
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
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
      const formDataUpload = new FormData();
      formDataUpload.append('file', selectedFile);
      const uploadRes = await api.uploadExpense(formDataUpload, signal);
      
      if (signal.aborted) return;
      
      toast.loading('AI Extracting Data...', { id: 'extraction' });
      
      const fileData = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type;
      
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: fileData, mimeType: mimeType === "application/pdf" ? "application/pdf" : "image/jpeg" } },
            { text: `Extract details from this expense bill/receipt.
            Return a JSON object with:
            - expenseTitle: short descriptive title (e.g., "Office Lunch", "Stationery Purchase")
            - category: one of [${expenseSubcategories.join(', ')}]
            - amount: total numeric amount
            - billDate: "YYYY-MM-DD"
            - vendorName: name of shop or business
            - location: city or area name
            - paymentMethod: one of [${paymentMethods.join(', ')}]
            - description: brief summary of items
            ` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              expenseTitle: { type: Type.STRING },
              category: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              billDate: { type: Type.STRING },
              vendorName: { type: Type.STRING },
              location: { type: Type.STRING },
              paymentMethod: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          }
        }
      });

      if (signal.aborted) return;

      const extractedData = JSON.parse(response.text || "{}");
      
      setFormData(prev => ({
        ...prev,
        expenseTitle: extractedData.expenseTitle || '',
        subcategory: extractedData.category || 'Miscellaneous',
        amount: extractedData.amount || 0,
        billDate: extractedData.billDate || new Date().toISOString().split('T')[0],
        vendorName: extractedData.vendorName || '',
        location: extractedData.location || '',
        modeOfPayment: extractedData.paymentMethod || 'Cash',
        description: extractedData.description || '',
        fileUrl: uploadRes.fileUrl
      }));

      toast.success('Data extracted successfully', { id: 'extraction' });
      setView('form');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Extraction aborted');
        return;
      }
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
    setPreviewUrl(null);
    setIsExtracting(false);
    toast.dismiss('extraction');
    setFormData(prev => ({
      ...prev,
      expenseTitle: '',
      amount: 0,
      billDate: new Date().toISOString().split('T')[0],
      fileUrl: '',
      attachments: []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.expenseTitle || !formData.amount || !formData.propertyName || !formData.subcategory || !formData.modeOfPayment) {
      toast.error('Title, Amount, Project, Category and Payment Method are required');
      return;
    }

    setIsLoading(true);
    try {
      let fileUrl = formData.fileUrl || '';
      let attachments = formData.attachments || [];

      // If a file was selected but not yet uploaded (no fileUrl), upload it now
      if (selectedFile && !fileUrl) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', selectedFile);
        const uploadRes = await api.uploadExpense(formDataUpload);
        fileUrl = uploadRes.fileUrl;
        attachments = [{ url: fileUrl, name: selectedFile.name, type: selectedFile.type }];
      }

      const billToSave = {
        ...formData,
        billId: formData.billId || `EXP-${Date.now().toString().slice(-6)}`,
        utilityType: formData.utilityType || 'Other Bill',
        fileUrl,
        attachments: attachments.length > 0 ? attachments : (fileUrl ? [{ url: fileUrl, name: 'Expense Bill', type: 'image/jpeg' }] : [])
      };

      await api.saveExpense(billToSave);
      toast.success('Expense saved successfully!');
      setView('list');
      fetchData();
    } catch (err: any) {
      console.error('Save expense error:', err);
      toast.error(`Failed to save expense: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
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
      toast.success('Expense deleted successfully');
      setIsDeleteModalOpen(false);
    } catch (err) {
      toast.error('Failed to delete expense');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {view === 'list' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-t-[2rem] border-x border-t border-gray-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center">
              <Receipt className="w-6 h-6 text-orange-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white">Expense Hub</h1>
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

            <button 
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                setView('upload');
                setFormData(prev => ({ ...prev, expenseTitle: '', amount: 0, fileUrl: '' }));
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
            >
              <Upload className="w-4 h-4" />
              Upload Bill
            </button>
            <button 
              onClick={() => {
                setView('form');
                setFormData(prev => ({ ...prev, expenseTitle: '', amount: 0, fileUrl: '' }));
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
            >
              Manual Entry
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div 
            key="list" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="space-y-0"
          >
            <div className="bg-white dark:bg-slate-900 px-6 py-4 border-x border-gray-50 dark:border-slate-800 shadow-sm">
              <Filters 
                filters={filters}
                setFilters={setFilters}
                properties={properties}
                companies={companies.map(c => c.companyName)}
                statuses={['Pending', 'Paid']}
                isLoading={isLoading || isLoadingProjects}
                data={expenses}
                countData={{
                  total: filteredExpenses.length,
                  totalAmount: filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
                  inProgress: filteredExpenses.filter(e => e.status === 'Pending').length,
                  paid: filteredExpenses.filter(e => e.status === 'Paid').length
                }}
              />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-b-[2rem] border-x border-b border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-slate-800/30">
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Expense Details</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Project</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {isLoading ? (
                      [1, 2, 3].map(i => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={7} className="py-8 px-6"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                        </tr>
                      ))
                    ) : filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-20 text-center text-gray-400 font-bold">No expenses found</td>
                      </tr>
                    ) : (
                      filteredExpenses.map(expense => (
                        <tr key={expense.id || expense._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                          <td className="py-5 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                <Receipt className="w-5 h-5 text-gray-400" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-gray-800 dark:text-white capitalize">{expense.expenseTitle}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase">{expense.vendorName || 'General Vendor'}</p>
                              </div>
                              {expense.isPublic && (
                                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded uppercase">Public</span>
                              )}
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <span className="text-[10px] font-black px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-full border border-gray-200 dark:border-slate-700 uppercase tracking-widest">
                              {expense.subcategory}
                            </span>
                          </td>
                          <td className="py-5 px-6">
                            <p className="text-xs font-bold text-gray-600 dark:text-gray-300">{expense.propertyName}</p>
                          </td>
                          <td className="py-5 px-6 text-sm font-bold text-gray-600 dark:text-gray-300">{expense.billDate}</td>
                          <td className={cn(
                            "py-5 px-6 font-black transition-colors",
                            (expense.amount || 0) < 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                          )}>
                            ₹{expense.amount.toLocaleString()}
                          </td>
                          <td className="py-5 px-6">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              expense.status === 'Verified' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                            )}>
                              <div className={cn("w-1.5 h-1.5 rounded-full", expense.status === 'Verified' ? "bg-emerald-500" : "bg-orange-500")} />
                              {expense.status}
                            </div>
                          </td>
                          <td className="py-5 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {expense.status === 'Pending' && (user?.role === 'ADMIN' || user?.role === 'EA' || user?.role === 'VERIFIER' || user?.role === 'MANAGER') && (
                                <button 
                                  onClick={() => handleWorkflow('verify', expense)}
                                  className="p-2 text-gray-400 hover:text-emerald-500 transition-colors"
                                  title="Verify"
                                >
                                  <CheckSquare className="w-4 h-4" />
                                </button>
                              )}
                              {expense.status === 'Verified' && (user?.role === 'ADMIN' || user?.role === 'APPROVER' || user?.role === 'MANAGER') && (
                                <button 
                                  onClick={() => handleWorkflow('approve', expense)}
                                  className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                  title="Approve"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </button>
                              )}
                              {expense.status === 'Approved' && (user?.role === 'ADMIN' || user?.role === 'ACCOUNT_MANAGER' || user?.role === 'ACCOUNT_MANAGEMENT') && (
                                <button 
                                  onClick={() => handleWorkflow('initiate', expense)}
                                  className="p-2 text-gray-400 hover:text-purple-500 transition-colors"
                                  title="Initiate Payment"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                              {expense.status === 'Payment Initiated' && (user?.role === 'ADMIN' || user?.role === 'ACCOUNT_MANAGER' || user?.role === 'ACCOUNT_MANAGEMENT') && (
                                <button 
                                  onClick={() => handleWorkflow('confirm', expense)}
                                  className="p-2 text-gray-400 hover:text-emerald-500 transition-colors"
                                  title="Confirm Payment"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  setSelectedExpenseForDetails(expense);
                                  setIsDetailsModalOpen(true);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {user?.role === 'ADMIN' && (
                                <>
                                  <button 
                                    onClick={() => handleEdit(expense)}
                                    className="p-2 text-gray-400 hover:text-orange-500 transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(expense.id || expense._id!)}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6 max-w-2xl mx-auto py-12 px-4"
          >
            <div className="flex items-center gap-4 mb-4">
              <button 
                onClick={() => setView('list')}
                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-[#FF6B2C] hover:border-[#FF6B2C] transition-all shadow-sm group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div>
                <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Generate New Expense Entry</h1>
                <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">AI Document Processing</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-10 sm:p-12 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none text-center space-y-8 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1.5 bg-[#FF6B2C]" />
               
               <div className="space-y-4">
                 <div className="w-20 h-20 bg-orange-50 dark:bg-orange-950/30 rounded-3xl flex items-center justify-center mx-auto ring-8 ring-orange-50/50 dark:ring-orange-950/10">
                  <Receipt className="w-10 h-10 text-[#FF6B2C]" />
                 </div>
                 <div className="space-y-2">
                   <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Upload Receipt / Invoice</h2>
                   <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">Let AI extract the heavy details. Upload your receipt for seamless auto-categorization and amount extraction.</p>
                 </div>
               </div>
              
              {!selectedFile ? (
                <label className="block cursor-pointer group">
                  <input type="file" className="hidden" onChange={handleFileChange} accept="application/pdf,image/*" />
                  <div className="py-12 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 group-hover:border-[#FF6B2C] group-hover:bg-white dark:group-hover:bg-slate-800 transition-all">
                    <div className="w-14 h-14 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#FF6B2C]" />
                    </div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Click to Browse or Drag File Here</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2 font-black">Supports PDF, JPG, PNG</p>
                  </div>
                </label>
              ) : (
                <div className="space-y-6">
                  <div className="p-6 bg-[#0F172A] rounded-3xl flex items-center justify-between border border-slate-800 text-left group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-[#FF6B2C]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => window.open(URL.createObjectURL(selectedFile), '_blank')}
                        className="p-2 text-slate-500 hover:text-[#FF6B2C] hover:bg-white/10 rounded-xl transition-all"
                        title="Preview Document"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={handleRemoveFile} 
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Remove File"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={handleRemoveFile}
                      className="py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleExtract}
                      disabled={isExtracting}
                      className="py-4 bg-[#FF6B2C] text-white rounded-2xl font-bold shadow-lg shadow-orange-500/20 hover:bg-[#e85a1b] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Extracting...</span>
                        </>
                      ) : (
                        <>
                          <Receipt className="w-5 h-5" />
                          <span>Confirm & Extract</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Secure Data Processing</span>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'form' && (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-6xl mx-auto"
          >
            {/* Form Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-300">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('list')}
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-[#FF6B2C] hover:bg-orange-50 transition-all active:scale-95"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Expense Entry Details</h2>
                  <p className="text-xs font-semibold text-slate-400">Fill in the details carefully for verification</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">AI Extraction Verified</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
              {/* Left Column: Form Content */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-8 flex-1">
                  <div className="space-y-6">
                    {/* Primary Field: Title */}
                    <div className="space-y-3">
                      <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Expense Title <span className="text-red-500">*</span></label>
                      <div className="relative group">
                        <FileText className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6B2C] transition-colors" />
                        <input 
                          type="text" 
                          required
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] transition-all"
                          value={formData.expenseTitle}
                          onChange={(e) => setFormData({...formData, expenseTitle: e.target.value})}
                          placeholder="e.g. Office Stationery, Client Meeting Lunch"
                        />
                      </div>
                    </div>

                    {/* Category & Status Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Category <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Tag className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select 
                            className="w-full pl-12 pr-10 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] appearance-none cursor-pointer transition-all"
                            value={formData.subcategory}
                            onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                          >
                            <option value="" disabled>Select Category</option>
                            {expenseSubcategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                          <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Approval Workflow Status</label>
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-full border border-slate-200/50 dark:border-slate-700/50">
                          {['Pending', 'Paid'].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setFormData({...formData, status: s as BillStatus})}
                              className={cn(
                                "flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider",
                                formData.status === s 
                                  ? "bg-white dark:bg-slate-700 text-[#FF6B2C] shadow-sm" 
                                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Linking: Company & Project Selection Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Company <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Tag className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select 
                            required
                            className="w-full pl-12 pr-10 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] appearance-none cursor-pointer transition-all"
                            value={formData.companyName}
                            onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                          >
                            <option value="">Select Company</option>
                            {companies.map(c => <option key={c.companyName} value={c.companyName}>{c.companyName}</option>)}
                          </select>
                          <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Associated Project / Property <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Building2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select 
                            required
                            className="w-full pl-12 pr-10 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] appearance-none cursor-pointer transition-all"
                            value={formData.propertyName}
                            onChange={(e) => setFormData({...formData, propertyName: e.target.value})}
                          >
                            <option value="" disabled>Select Project</option>
                            {projects.map(p => <option key={p._id || p.id} value={p.name}>{p.name}</option>)}
                          </select>
                          <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Numeric & Date Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Amount (₹) <span className="text-red-500">*</span></label>
                        <div className="relative group">
                          <DollarSign className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/field:text-[#FF6B2C] transition-colors" />
                          <input 
                            type="number" 
                            required
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-black text-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] transition-all"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Bill Date <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Clock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input 
                            type="date" 
                            required
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] transition-all"
                            value={formData.billDate}
                            onChange={(e) => setFormData({...formData, billDate: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vendor & Payer Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Vendor / Store Name</label>
                        <div className="relative group">
                          <Building2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6B2C] transition-colors" />
                          <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] transition-all"
                            value={formData.vendorName}
                            onChange={(e) => setFormData({...formData, vendorName: e.target.value})}
                            placeholder="e.g. Local Vendor"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Your Name (Optional)</label>
                        <div className="relative group">
                          <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6B2C] transition-colors" />
                          <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] transition-all"
                            value={formData.paidBy}
                            onChange={(e) => setFormData({...formData, paidBy: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Method & Location Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Payment Strategy</label>
                        <div className="relative">
                          <CreditCard className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <select 
                            className="w-full pl-12 pr-10 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] appearance-none cursor-pointer transition-all"
                            value={formData.modeOfPayment}
                            onChange={(e) => setFormData({...formData, modeOfPayment: e.target.value})}
                          >
                            <option value="" disabled>Select Payment Method</option>
                            {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Location / Area</label>
                        <div className="relative group">
                          <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6B2C] transition-colors" />
                          <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] transition-all"
                            value={formData.location}
                            onChange={(e) => setFormData({...formData, location: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Description / Proof Remarks</label>
                      <textarea 
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-700 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] transition-all min-h-[140px] resize-none"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Add additional context or itemized info..."
                      />
                    </div>
                  </div>

                  {duplicateFound && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mx-8 mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-xs font-bold">{duplicateMessage || "This expense appears to be a duplicate."}</p>
                    </motion.div>
                  )}

                  <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button 
                      type="button"
                      onClick={() => setView('list')}
                      className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                    >
                      Cancel Entry
                    </button>
                    <button 
                      type="submit"
                      disabled={isLoading || duplicateFound}
                      className={cn(
                        "px-8 py-3 bg-[#FF6B2C] text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:bg-[#e85a1b] transition-all active:scale-95 flex items-center justify-center gap-2 group/btn",
                        (isLoading || duplicateFound) && "opacity-70 cursor-not-allowed"
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                      )}
                      Finalize & Record
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Visualization Card */}
              <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                <div className="bg-[#0F172A] rounded-[2.5rem] p-10 text-white min-h-[500px] flex flex-col justify-between shadow-2xl relative overflow-hidden group border border-slate-800">
                  <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                    <Receipt className="w-64 h-64" />
                  </div>
                  
                  <div className="relative z-10 space-y-12">
                    <div className="flex items-center gap-5">
                       <div className="w-16 h-16 bg-[#FF6B2C] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Tag className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-orange-400 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                           Review Profile
                        </p>
                        <p className="text-2xl font-black text-white">{formData.subcategory}</p>
                      </div>
                    </div>

                    <div className="space-y-10">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3">Internal Expense Title</p>
                        <p className="text-3xl font-black text-white leading-tight tracking-tight">{formData.expenseTitle || 'Untitled Expense'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-x-10 gap-y-12 pt-4 border-t border-slate-800/50">
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Total Amount</p>
                          <p className={cn(
                            "text-4xl font-black tracking-tighter transition-colors",
                            (formData.amount || 0) < 0 ? "text-red-500" : "text-[#FF6B2C]"
                          )}>
                            ₹{formData.amount?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Billing Date</p>
                          <p className="text-xl font-bold text-white tabular-nums">{formData.billDate || 'D-M-Y'}</p>
                        </div>
                        <div className="col-span-2 grid grid-cols-2 gap-6">
                           <div>
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Paid By</p>
                              <p className="text-sm font-bold text-white">{formData.paidBy || 'Not Specified'}</p>
                           </div>
                           <div>
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Vendor / Shop</p>
                              <p className="text-sm font-bold text-white">{formData.vendorName || 'General'}</p>
                           </div>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 transition-colors">Target Allocation</p>
                          <div className="flex items-center gap-3">
                             <Building2 className="w-5 h-5 text-slate-600" />
                             <p className="text-lg font-bold text-white truncate max-w-full">{formData.propertyName || 'Select Location'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-slate-800 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3.5 px-5 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
                       <CreditCard className="w-5 h-5 text-[#FF6B2C]" />
                       <span className="text-sm font-black text-slate-300 tracking-wider uppercase">{formData.modeOfPayment}</span>
                    </div>
                    {formData.fileUrl && (
                      <a 
                        href={formData.fileUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-2 text-xs font-bold text-white hover:text-[#FF6B2C] transition-all bg-white/5 hover:bg-white/10 px-6 py-3 rounded-2xl border border-white/10 group shadow-xl"
                      >
                        Receipt View <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Audit Checklist Card */}
                <div className="bg-orange-50/50 dark:bg-orange-950/20 p-8 rounded-[2rem] border border-orange-100 dark:border-orange-500/20 flex gap-6 items-start shadow-sm transition-all hover:bg-orange-50 group">
                   <div className="w-14 h-14 bg-white dark:bg-orange-900/40 rounded-2xl flex items-center justify-center shrink-0 shadow-sm group-hover:rotate-12 transition-transform">
                    <AlertCircle className="w-7 h-7 text-[#FF6B2C]" />
                   </div>
                   <div className="space-y-1.5">
                     <p className="text-base font-bold text-orange-950 dark:text-orange-200">Manual Verification Required</p>
                     <p className="text-[13px] text-orange-700/80 dark:text-orange-300/60 leading-relaxed font-medium">Please cross-verify amount and project allocation. Once recorded, entries enter the verification module for admin audit.</p>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BillDetailsDrawer
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        bill={selectedExpenseForDetails}
        onEdit={(expense) => {
          handleEdit(expense);
          setIsDetailsModalOpen(false);
        }}
        onDelete={handleDelete}
        onMarkPaid={() => {}}
        onVerify={(bill) => handleWorkflow('verify', bill)}
        onApprove={(bill) => handleWorkflow('approve', bill)}
        onInitiatePayment={(bill) => handleWorkflow('initiate', bill)}
        onConfirmPayment={(bill) => handleWorkflow('confirm', bill)}
        onTallyEntry={(bill) => handleWorkflow('tally', bill)}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Delete Expense Entry"
        message="Are you sure you want to remove this expense record? This action cannot be undone."
      />

      {isVerificationModalOpen && selectedExpenseForDetails && (
        <WorkflowModal
          isOpen={isVerificationModalOpen}
          onClose={() => setIsVerificationModalOpen(false)}
          bill={selectedExpenseForDetails}
          actionType={workflowActionType}
          title={workflowActionTitle}
          onConfirm={async (remarks, proofFile, extraDetails) => {
            const id = selectedExpenseForDetails.id || (selectedExpenseForDetails as any)._id;
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
              setSelectedExpenseForDetails(updatedBill);
              setExpenses(prev => prev.map(b => (b.id === id || (b as any)._id === id) ? updatedBill : b));
              setIsVerificationModalOpen(false);
            } catch (err: any) {
              toast.error(`Failed: ${err.message || 'Unknown error'}`);
              throw err;
            }
          }}
          onReject={async (remarks) => {
            const id = selectedExpenseForDetails.id || (selectedExpenseForDetails as any)._id;
            try {
              const updatedBill = await api.rejectBill(id, remarks, user?.name, user?.role);
              toast.success("Expense rejected");
              setSelectedExpenseForDetails(updatedBill);
              setExpenses(prev => prev.map(b => (b.id === id || (b as any)._id === id) ? updatedBill : b));
              setIsVerificationModalOpen(false);
            } catch (err: any) {
              toast.error("Failed to reject expense");
              throw err;
            }
          }}
        />
      )}
    </div>
  );
};
