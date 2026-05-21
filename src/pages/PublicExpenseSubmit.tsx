import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Save, 
  Building2,
  User,
  MapPin,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Zap,
  ChevronDown,
  Sparkles,
  CreditCard,
  Eye,
  X,
  CreditCard as PaymentIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { Project } from '../types';
import { cn, fileToBase64 } from '../utils';
import toast from 'react-hot-toast';
import { extractExpenseData } from '../services/geminiService';

const PublicExpenseSubmit: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const extractionAbortController = React.useRef<AbortController | null>(null);

  const [formData, setFormData] = useState({
    expenseTitle: '',
    subcategory: '',
    customSubcategory: '',
    amount: '',
    billDate: new Date().toISOString().split('T')[0],
    vendorName: '',
    propertyName: '',
    customPropertyName: '',
    paidBy: '',
    modeOfPayment: '',
    customModeOfPayment: '',
    description: '',
    location: '',
    status: 'Pending',
    fileUrl: ''
  });

  const expenseSubcategories = [
    "Travel & Conveyance",
    "Kitchen Expenses",
    "Water Camper + Milk",
    "Celebration & Gifts",
    "Office Stationery",
    "Miscellaneous",
    "Others"
  ];

  const paymentMethods = ["Cash", "UPI", "Card", "Net Banking", "Others"];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await api.getPublicProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects');
    }
  };

  const cancelExtraction = () => {
    if (extractionAbortController.current) {
      extractionAbortController.current.abort();
      extractionAbortController.current = null;
    }
    
    setIsLoading(false);
    setIsExtracting(false);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    toast.dismiss('extraction');
    
    setFormData(prev => ({
      ...prev,
      expenseTitle: '',
      amount: '',
      vendorName: '',
      description: '',
      location: '',
      fileUrl: ''
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Cancel any existing extraction
      if (extractionAbortController.current) {
        extractionAbortController.current.abort();
      }
      
      const controller = new AbortController();
      extractionAbortController.current = controller;

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const file = e.target.files[0];
      setSelectedFile(file);
      setIsLoading(true);
      setIsExtracting(true);
      
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      toast.loading('AI Intelligence is extracting data...', { id: 'extraction' });
      
      try {
        // Start upload
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        const uploadPromise = api.uploadExpense(formDataUpload, controller.signal);

        // Start extraction
        const fileDataBase64 = await fileToBase64(file);
        const extractionPromise = extractExpenseData(fileDataBase64, file.type, controller.signal);

        // Wait for both
        const [uploadRes, extractedData] = await Promise.all([uploadPromise, extractionPromise]);
        
        if (controller.signal.aborted) return;

        setFormData(prev => ({ 
          ...prev, 
          fileUrl: uploadRes.fileUrl,
          expenseTitle: extractedData?.expenseTitle || prev.expenseTitle,
          amount: extractedData?.amount ? String(extractedData.amount) : prev.amount,
          billDate: extractedData?.billDate || prev.billDate,
          vendorName: extractedData?.vendorName || prev.vendorName,
          location: extractedData?.location || prev.location,
          description: extractedData?.description || prev.description
        }));
        
        if (extractedData) {
          toast.success('Bill details extracted successfully!', { id: 'extraction' });
        } else {
          toast.success('Bill uploaded successfully', { id: 'extraction' });
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message === 'Operation aborted') {
          console.log('Extraction aborted');
        } else {
          toast.error('File upload or extraction failed', { id: 'extraction' });
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsExtracting(false);
          extractionAbortController.current = null;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.expenseTitle || !formData.amount || !formData.propertyName || !formData.subcategory || !formData.modeOfPayment) {
      toast.error('All required fields must be filled');
      return;
    }

    const finalSubcategory = formData.subcategory === 'Others' ? formData.customSubcategory : formData.subcategory;
    if (formData.subcategory === 'Others' && !formData.customSubcategory) {
      toast.error('Please specify the custom category');
      return;
    }

    const finalPropertyName = formData.propertyName === 'Others' ? formData.customPropertyName : formData.propertyName;
    if (formData.propertyName === 'Others' && !formData.customPropertyName) {
      toast.error('Please specify the custom project name');
      return;
    }

    const finalModeOfPayment = formData.modeOfPayment === 'Others' ? formData.customModeOfPayment : formData.modeOfPayment;
    if (formData.modeOfPayment === 'Others' && !formData.customModeOfPayment) {
      toast.error('Please specify the payment method');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.submitPublicExpense({
        ...formData,
        subcategory: finalSubcategory,
        propertyName: finalPropertyName,
        modeOfPayment: finalModeOfPayment,
        amount: Number(formData.amount),
        billId: `EXP-PUB-${Date.now().toString().slice(-6)}`,
        status: formData.status as any
      });
      setIsSuccess(true);
      toast.success('Expense submitted successfully!');
    } catch (err) {
      toast.error('Failed to submit expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[3rem] p-12 text-center shadow-2xl space-y-6"
        >
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-gray-900">Submitted!</h1>
            <p className="text-gray-500 font-bold uppercase tracking-tight">Your expense request has been recorded successfully and is pending verification.</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
          >
            Submit Another Expense <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] py-6 sm:py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-3xl w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl sm:rounded-[1.25rem] shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden border border-slate-100"
        >
          {/* Form Header */}
          <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FF6B2C] rounded-xl flex items-center justify-center shadow-lg shadow-orange-200 shrink-0">
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">Other Expense Submission</h1>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Fill in the details to submit your expense</p>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6 sm:space-y-8">
            {/* Bill Upload Section - Refined */}
            <div className="space-y-3">
              <label className="text-[13px] font-bold text-slate-700">
                Upload Receipt / Invoice
              </label>
              {!selectedFile ? (
                <label className="block cursor-pointer group">
                  <input type="file" className="hidden" onChange={handleFileChange} accept="application/pdf,image/*" />
                  <div className="py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 group-hover:border-[#FF6B2C] group-hover:bg-orange-50/30 transition-all text-center">
                    <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3 group-hover:text-[#FF6B2C]" />
                    <p className="text-sm font-bold text-slate-500 transition-colors">Click to upload document</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">PNG, JPG, PDF or Screenshot (Max 10MB)</p>
                  </div>
                </label>
              ) : (
                <div className="p-3 sm:p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <a 
                      href={previewUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-emerald-500 shadow-sm hover:bg-emerald-50 transition-colors shrink-0"
                    >
                      {isExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
                    </a>
                    <div className="min-w-0 overflow-hidden">
                      <p className="text-sm font-bold text-emerald-900 truncate">{selectedFile.name}</p>
                      <p className="text-[11px] font-bold text-emerald-600 truncate">
                        {isExtracting ? 'Extracting details...' : 'Analysis Complete • Click to preview'}
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={cancelExtraction} 
                    className="text-xs font-bold text-red-500 hover:text-red-600 px-4 sm:px-3 py-2 sm:py-1 bg-red-50 rounded-lg transition-colors w-full sm:w-auto text-center"
                  >
                    {isExtracting ? 'Cancel Extraction' : 'Remove File'}
                  </button>
                </div>
              )}
              {isExtracting && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100"
                >
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <p className="text-xs font-bold">AI Intelligence is extracting data. Please wait...</p>
                </motion.div>
              )}
            </div>

            {/* Core Fields Grid */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[13px] font-bold text-slate-700">Expense Title <span className="text-red-500">*</span></label>
                <div className="relative group">
                  <FileText className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6B2C] transition-colors" />
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Site Visit Travel, Client Lunch"
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] transition-all"
                    value={formData.expenseTitle}
                    onChange={(e) => setFormData({...formData, expenseTitle: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[13px] font-bold text-slate-700">Category <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select 
                      className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] appearance-none cursor-pointer transition-all"
                      value={formData.subcategory}
                      onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                    >
                      <option value="" disabled>Select Category</option>
                      {expenseSubcategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  
                  {formData.subcategory === 'Others' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative"
                    >
                      <Zap className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" />
                      <input 
                        type="text" 
                        placeholder="Specify custom category"
                        className="w-full pl-10 pr-4 py-3 bg-orange-50/50 border border-orange-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                        value={formData.customSubcategory}
                        onChange={(e) => setFormData({...formData, customSubcategory: e.target.value})}
                      />
                    </motion.div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-[13px] font-bold text-slate-700">Project / Property <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select 
                      required
                      className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] appearance-none cursor-pointer transition-all"
                      value={formData.propertyName}
                      onChange={(e) => setFormData({...formData, propertyName: e.target.value})}
                    >
                      <option value="" disabled>Select Project</option>
                      {Array.from(new Set(projects.map(p => p.name))).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                      <option value="Others">Others (Type manually)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {formData.propertyName === 'Others' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative"
                    >
                      <Building2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" />
                      <input 
                        type="text" 
                        placeholder="Project / Property Name"
                        className="w-full pl-10 pr-4 py-3 bg-orange-50/50 border border-orange-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                        value={formData.customPropertyName}
                        onChange={(e) => setFormData({...formData, customPropertyName: e.target.value})}
                      />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Priority Style Toggle for Status */}
              <div className="space-y-3">
                <label className="text-[13px] font-bold text-slate-700">Current Status</label>
                <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                  {['Pending', 'Paid'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({...formData, status: s})}
                      className={cn(
                        "px-6 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
                        formData.status === s 
                          ? "bg-white text-[#FF6B2C] shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[13px] font-bold text-slate-700">Amount (₹) <span className="text-red-500">*</span></label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                    <input 
                      type="number" 
                      required
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] transition-all"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[13px] font-bold text-slate-700">Bill Date <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] transition-all"
                    value={formData.billDate}
                    onChange={(e) => setFormData({...formData, billDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[13px] font-bold text-slate-700">Your Name (Optional)</label>
                  <div className="relative group">
                    <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6B2C] transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Full Name"
                      className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] transition-all"
                      value={formData.paidBy}
                      onChange={(e) => setFormData({...formData, paidBy: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[13px] font-bold text-slate-700">Payment Method</label>
                  <div className="relative">
                    <select 
                      className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] appearance-none cursor-pointer transition-all"
                      value={formData.modeOfPayment}
                      onChange={(e) => setFormData({...formData, modeOfPayment: e.target.value})}
                    >
                      <option value="" disabled>Select Payment Method</option>
                      {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {formData.modeOfPayment === 'Others' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative"
                    >
                      <PaymentIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" />
                      <input 
                        type="text" 
                        placeholder="Specify payment method"
                        className="w-full pl-10 pr-4 py-3 bg-orange-50/50 border border-orange-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                        value={formData.customModeOfPayment}
                        onChange={(e) => setFormData({...formData, customModeOfPayment: e.target.value})}
                      />
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[13px] font-bold text-slate-700">Vendor (Optional)</label>
                  <div className="relative group">
                    <Building2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6B2C] transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Shop or Business Name"
                      className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] transition-all"
                      value={formData.vendorName}
                      onChange={(e) => setFormData({...formData, vendorName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[13px] font-bold text-slate-700">Location</label>
                  <div className="relative group">
                    <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6B2C] transition-colors" />
                    <input 
                      type="text" 
                      placeholder="City or Area"
                      className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] transition-all"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[13px] font-bold text-slate-700">Description / Notes</label>
                <textarea 
                  placeholder="Details of the expense..."
                  className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF6B2C] min-h-[140px] transition-all resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>

            {/* Form Footer Buttons */}
            <div className="pt-6 sm:pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4">
              <button 
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-8 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full sm:w-auto px-10 py-3 bg-[#FF6B2C] text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-200 hover:bg-[#e85a1b] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSubmitting ? "Submitting..." : "Submit Expense"}
              </button>
            </div>
          </form>

          <div className="px-8 py-4 bg-slate-50 flex items-center justify-center gap-2 border-t border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Secured Enterprise Submission Portal</p>
          </div>
        </motion.div>

        <footer className="mt-8 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          © {new Date().getFullYear()} Neoteric Group • All Rights Reserved
        </footer>
      </div>
    </div>

  );
};

export default PublicExpenseSubmit;
