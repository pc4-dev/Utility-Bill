import React, { useState, useEffect } from 'react';
import { Bill, Project } from '../types';
import { 
  X, 
  Upload, 
  IndianRupee, 
  Calendar, 
  FileText, 
  AlertCircle,
  Zap,
  CheckCircle2,
  Loader2,
  Plus,
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Download,
  Eye,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, downloadFile } from '../utils';
import { Type } from "@google/genai";
import { generateContentWithRetry } from '../services/geminiService';
import { PdfViewer } from './PdfViewer';

export const PublicElectricityView: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'extracting' | 'verify' | 'success'>('upload');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());

  const [formData, setFormData] = useState<Partial<Bill>>({
    propertyName: '',
    utilityType: 'Electricity',
    month: currentMonth,
    year: currentYear,
    companyName: '',
    customCompanyName: '',
    serviceProvider: '',
    billNumber: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    reminderDate: '',
    priority: 'Normal',
    reminderDays: 3,
    totalUnits: 0,
    amount: 0,
    status: 'Pending' as any,
    notes: '',
    customerName: '',
    consumerNumber: '',
    meterNumber: '',
    energyCharges: 0,
    fppas: 0,
    fixedCharge: 0,
    electricityDuty: 0,
    additionalSD: 0,
    otherCharges: 0,
    monthBillAmount: 0,
    subsidyAmount: 0,
    interestOnSecurityDeposit: 0,
    ccbAdjustment: 0,
    lockCreditRebate: 0,
    rebateIncentive: 0,
    currentMonthBillAmount: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsRes = await fetch('/api/public/projects');
        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setProjects(data);
        }
      } catch (err) {
        console.error('Fetch projects error:', err);
      }
    };
    fetchProjects();
  }, []);

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

  const handleFileUpload = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleExtract = async () => {
    if (!selectedFile) return;
    setIsExtracting(true);
    setStep('extracting');
    
    try {
      // 1. Upload for server-side link
      const uploadFormData = new FormData();
      uploadFormData.append('files', selectedFile);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData
      });

      let fileUrl = '';
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        fileUrl = uploadData.files[0]?.url;
      }

      // 2. Client-side extraction via Gemini
      const fileData = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: fileData, mimeType: mimeType === "application/pdf" ? "application/pdf" : "image/jpeg" } },
            { text: `Extract all details from this electricity bill.
            Return a JSON object with:
            - customerName: full name of consumer
            - consumerNumber: Consumer/Account ID number
            - billNumber: invoice/bill number
            - billingDate: "YYYY-MM-DD"
            - dueDate: "YYYY-MM-DD"
            - billingPeriod: period mentioned (e.g., April 2024 or 01-Apr to 30-Apr)
            - amount: total amount payable (net) 
            - totalUnits: total units consumed
            - serviceProvider: electricity board name (e.g., DHBVN, Tata Power)
            - fixedCharge: amount for fixed charges
            - electricityDuty: tax/duty amount
            - additionalSD: additional security deposit
            - subsidyAmount: any government subsidy
            - energyCharges: charge for units consumed
            - otherCharges: total of miscellaneous charges
            - lockCreditRebate: any rebate or credit
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
              serviceProvider: { type: Type.STRING },
              fixedCharge: { type: Type.NUMBER },
              electricityDuty: { type: Type.NUMBER },
              additionalSD: { type: Type.NUMBER },
              subsidyAmount: { type: Type.NUMBER },
              energyCharges: { type: Type.NUMBER },
              otherCharges: { type: Type.NUMBER },
              lockCreditRebate: { type: Type.NUMBER }
            }
          }
        }
      });

      let responseText = response.text || "{}";
      responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const extractedData = JSON.parse(responseText);

      setFormData(prev => ({
        ...prev,
        customerName: extractedData.customerName || '',
        consumerNumber: extractedData.consumerNumber || '',
        billNumber: extractedData.billNumber || '',
        billDate: extractedData.billingDate || extractedData.billDate || new Date().toISOString().split('T')[0],
        dueDate: extractedData.dueDate || new Date().toISOString().split('T')[0],
        billingPeriod: extractedData.billingPeriod || '',
        amount: extractedData.amount || 0,
        totalUnits: extractedData.totalUnits || 0,
        serviceProvider: extractedData.serviceProvider || '',
        fixedCharge: extractedData.fixedCharge || 0,
        electricityDuty: extractedData.electricityDuty || 0,
        additionalSD: extractedData.additionalSD || 0,
        subsidyAmount: extractedData.subsidyAmount || 0,
        energyCharges: extractedData.energyCharges || 0,
        otherCharges: extractedData.otherCharges || 0,
        lockCreditRebate: extractedData.lockCreditRebate || 0,
        currentMonthBillAmount: extractedData.amount || 0,
        fileUrl,
        attachments: fileUrl ? [{ url: fileUrl, name: selectedFile.name, type: selectedFile.type }] : []
      }));

    } catch (err) {
      console.error('Upload/Extract error:', err);
    } finally {
      setIsExtracting(false);
      setStep('verify');
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.propertyName) newErrors.propertyName = 'Project is required';
    if (!formData.companyName) newErrors.companyName = 'Company is required';
    if (formData.amount === undefined || formData.amount === null) newErrors.amount = 'Amount is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const bDate = formData.billDate ? new Date(formData.billDate) : new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const month = monthNames[bDate.getMonth()];
      const year = bDate.getFullYear().toString();

      const submissionData = {
        ...formData,
        month,
        year,
        propertyName: formData.propertyName === 'Others' ? formData.customPropertyName : formData.propertyName,
        companyName: formData.companyName === 'Others' ? formData.customCompanyName : formData.companyName,
        billId: `ELEC-${year}-${Math.floor(1000 + Math.random() * 9000).toString()}`
      };

      const response = await fetch('/api/public/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        setStep('success');
      } else {
        const data = await response.json();
        setErrors({ submit: data.message || 'Submission failed' });
      }
    } catch (err) {
      setErrors({ submit: 'Failed to submit bill' });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 md:p-16 rounded-[2.5rem] shadow-2xl text-center max-w-lg w-full border border-gray-100"
        >
          <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4">Data submitted successfully.</h2>
          <p className="text-gray-500 font-medium text-lg mb-10">Will add another.</p>
          <button 
            onClick={() => {
              setStep('upload');
              setFormData({ 
                utilityType: 'Electricity', 
                month: currentMonth, 
                year: currentYear, 
                billDate: new Date().toISOString().split('T')[0], 
                status: 'Pending' as any,
                priority: 'Normal',
                reminderDays: 3,
                amount: 0,
                totalUnits: 0
              });
              setSelectedFile(null);
              setPreviewUrl(null);
            }}
            className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold text-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-orange-100"
          >
            <Plus className="w-5 h-5" />
            Add Another Bill
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] py-12 px-4 font-sans">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4 mb-12 max-w-2xl mx-auto lg:max-w-none">
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center shadow-inner">
            <Zap className="text-orange-600 w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Electricity Form</h1>
            <p className="text-gray-500 font-medium text-sm">Public Utility Submission Portal</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100/50 max-w-2xl mx-auto"
            >
              <div className="text-center mb-10">
                <h2 className="text-2xl font-black text-gray-900 mb-2">Upload Your Bill</h2>
                <p className="text-gray-400 font-medium tracking-wide">AI will automatically extract the details</p>
              </div>
              
              <div className="relative group">
                <input 
                  type="file" 
                  id="bill-upload"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  accept="application/pdf,image/*"
                />
                <label 
                  htmlFor="bill-upload"
                  className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-gray-100 rounded-[3rem] bg-gray-50/30 hover:bg-orange-50/30 hover:border-orange-200 transition-all cursor-pointer text-center"
                >
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-orange-500" />
                  </div>
                  <span className="text-gray-700 font-bold text-lg mb-2">
                    {selectedFile ? selectedFile.name : 'Click to select or drag and drop'}
                  </span>
                  <span className="text-gray-400 text-sm font-medium">PDF, JPG or PNG (Up to 10MB)</span>
                </label>
              </div>

              {selectedFile && (
                <div className="mt-8 flex justify-center">
                  <button 
                    onClick={handleExtract}
                    className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-black transition-all flex items-center gap-3 shadow-xl"
                  >
                    <Zap className="w-5 h-5 fill-current" />
                    Extract Details
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 'extracting' && (
            <motion.div
              key="extracting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-20 rounded-[2.5rem] border border-gray-100 shadow-sm text-center max-w-2xl mx-auto"
            >
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <Zap className="w-10 h-10 text-orange-500 absolute inset-0 m-auto animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-3 uppercase tracking-widest">Extracting Details...</h2>
              <p className="text-gray-400 font-bold animate-pulse">Our AI is reading your bill information</p>
            </motion.div>
          )}

          {step === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
            >
              {/* Left Column: Editable Form */}
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl space-y-8">
                <div className="flex items-center justify-between pb-6 border-b border-gray-50">
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Review & Verify</h2>
                  <button onClick={() => setStep('upload')} className="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-[0.2em]">Project</label>
                      <select 
                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-orange-500/10 transition-all appearance-none cursor-pointer"
                        value={formData.propertyName}
                        onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                      >
                        <option value="" disabled>Select Project</option>
                        {Array.from(new Set(projects.map(p => p.name))).map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        <option value="Others">Others</option>
                      </select>
                      {errors.propertyName && <p className="text-red-500 text-[10px] font-black uppercase ml-1">{errors.propertyName}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-[0.2em]">Company / Entity</label>
                      <select 
                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-orange-500/10 transition-all appearance-none cursor-pointer"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      >
                        <option value="" disabled>Select Company</option>
                        <option value="GLR">GLR</option>
                        <option value="Gravity">Gravity</option>
                        <option value="Neoteric Housing LLP">Neoteric Housing LLP</option>
                        <option value="Swastik">Swastik</option>
                        <option value="Others">Others</option>
                      </select>
                      {errors.companyName && <p className="text-red-500 text-[10px] font-black uppercase ml-1">{errors.companyName}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-[0.2em]">Bill Amount (₹)</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="number"
                          className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl text-lg font-black focus:ring-4 focus:ring-orange-500/10 transition-all text-orange-600"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0, currentMonthBillAmount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      {errors.amount && <p className="text-red-500 text-[10px] font-black uppercase ml-1">{errors.amount}</p>}
                    </div>

                     <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-[0.2em]">Due Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="date"
                          className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-orange-500/10 transition-all"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        />
                      </div>
                      {errors.dueDate && <p className="text-red-500 text-[10px] font-black uppercase ml-1">{errors.dueDate}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-[0.2em]">Consumer Number</label>
                      <input 
                        type="text"
                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-orange-500/10 transition-all"
                        value={formData.consumerNumber || ''}
                        onChange={(e) => setFormData({ ...formData, consumerNumber: e.target.value })}
                        placeholder="e.g. 123456789"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-[0.2em]">Bill Number</label>
                      <input 
                        type="text"
                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-orange-500/10 transition-all"
                        value={formData.billNumber || ''}
                        onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Billing Breakdown</h3>
                      <div className="h-px flex-1 bg-gray-50"></div>
                    </div>
                    
                    <div className="bg-gray-50/50 rounded-2xl overflow-hidden border border-gray-100">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100/50">
                            <th className="py-2.5 px-4 font-bold text-gray-500">Description</th>
                            <th className="py-2.5 px-4 font-bold text-gray-500 text-right">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          <tr>
                            <td className="py-2.5 px-4 text-gray-500 font-bold">Energy Charges</td>
                            <td className="py-2.5 px-4"><input type="number" value={formData.energyCharges || ''} onChange={(e) => setFormData({ ...formData, energyCharges: parseFloat(e.target.value) })} className="w-full bg-transparent text-right font-black outline-none" /></td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 text-gray-500 font-bold">FPPAS (Adj. Surcharge)</td>
                            <td className="py-2.5 px-4"><input type="number" value={formData.fppas || ''} onChange={(e) => setFormData({ ...formData, fppas: parseFloat(e.target.value) })} className="w-full bg-transparent text-right font-black outline-none" /></td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 text-gray-500 font-bold">Fixed Charges</td>
                            <td className="py-2.5 px-4"><input type="number" value={formData.fixedCharge || ''} onChange={(e) => setFormData({ ...formData, fixedCharge: parseFloat(e.target.value) })} className="w-full bg-transparent text-right font-black outline-none" /></td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 text-gray-500 font-bold">Electricity Duty</td>
                            <td className="py-2.5 px-4"><input type="number" value={formData.electricityDuty || ''} onChange={(e) => setFormData({ ...formData, electricityDuty: parseFloat(e.target.value) })} className="w-full bg-transparent text-right font-black outline-none" /></td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 text-gray-500 font-bold">Additional SD</td>
                            <td className="py-2.5 px-4"><input type="number" value={formData.additionalSD || ''} onChange={(e) => setFormData({ ...formData, additionalSD: parseFloat(e.target.value) })} className="w-full bg-transparent text-right font-black outline-none" /></td>
                          </tr>
                          <tr>
                            <td className="py-3 px-5 text-gray-500 font-bold">Total Units</td>
                            <td className="py-3 px-5"><input type="number" value={formData.totalUnits || ''} onChange={(e) => setFormData({ ...formData, totalUnits: parseFloat(e.target.value) })} className="w-full bg-transparent text-right font-black outline-none font-mono" /></td>
                          </tr>
                          <tr className="bg-orange-50/30">
                            <td className="py-2.5 px-4 font-bold text-gray-900 border-t border-orange-100">Month Bill Amount</td>
                            <td className="py-2.5 px-4 border-t border-orange-100"><input type="number" value={formData.monthBillAmount || ''} onChange={(e) => setFormData({ ...formData, monthBillAmount: parseFloat(e.target.value) })} className="w-full bg-transparent text-right font-bold text-gray-900 outline-none" /></td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 text-gray-500 font-bold">Subsidy Amount (-)</td>
                            <td className="py-2.5 px-4"><input type="number" value={formData.subsidyAmount || ''} onChange={(e) => setFormData({ ...formData, subsidyAmount: parseFloat(e.target.value) })} className="w-full bg-transparent text-right font-black outline-none" /></td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 text-gray-500 font-bold">Lock Credit Rebate (-)</td>
                            <td className="py-2.5 px-4"><input type="number" value={formData.lockCreditRebate || ''} onChange={(e) => setFormData({ ...formData, lockCreditRebate: parseFloat(e.target.value) })} className="w-full bg-transparent text-right font-black outline-none" /></td>
                          </tr>
                          <tr className="bg-orange-500 text-white">
                            <td className="py-3 px-4 font-black">Current Month Bill Amount</td>
                            <td className="py-3 px-4">
                              <input 
                                type="number" 
                                value={formData.currentMonthBillAmount || ''} 
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setFormData({ ...formData, currentMonthBillAmount: val, amount: val });
                                }} 
                                className="w-full bg-transparent text-right font-black outline-none text-white" 
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setStep('upload')}
                      className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-[12px] hover:bg-gray-200 transition-all"
                    >
                      Re-upload
                    </button>
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[12px] hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-3"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Confirm Submission
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Bill Preview */}
              <div className="sticky top-12 space-y-6">
                <div className="bg-white p-4 rounded-[3rem] border border-gray-100 shadow-xl aspect-[3/4.2] relative group overflow-hidden">
                  {previewUrl && (
                    selectedFile?.type === 'application/pdf' ? (
                      <PdfViewer file={selectedFile} className="w-full h-full rounded-3xl" />
                    ) : (
                      <div className="w-full h-full overflow-auto rounded-3xl bg-gray-50 flex items-center justify-center p-2">
                        <img src={previewUrl} alt="Bill Preview" className="max-w-full h-auto shadow-sm rounded-lg" />
                      </div>
                    )
                  )}
                  <div className="absolute top-8 right-8 flex flex-col gap-3">
                    <button 
                      onClick={() => window.open(previewUrl || '', '_blank')}
                      className="w-12 h-12 bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl flex items-center justify-center text-gray-700 hover:text-orange-500 transition-all"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => previewUrl && downloadFile(previewUrl, selectedFile?.name || 'bill')}
                      className="w-12 h-12 bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl flex items-center justify-center text-gray-700 hover:text-orange-500 transition-all"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 flex gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <AlertCircle className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-orange-900 uppercase tracking-widest">Manual Audit Required</h4>
                    <p className="text-xs text-orange-800/60 font-bold mt-1.5 leading-relaxed">Always verify the AI-extracted values against the original document on the left. Specialized fonts or hand-written notes can sometimes be misread.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
