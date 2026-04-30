import React, { useState, useEffect } from 'react';
import { FileText, Calculator, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency, cn } from '../utils';
import { motion } from 'framer-motion';
import { useAuth } from '../AuthContext';
import { api } from '../services/api';
import { Bill, Project, BillStatus, BillType } from '../types';

export const NewBillFormPage: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    billType: '',
    billNumber: '',
    serviceProvider: '',
    companyName: 'GLR',
    projectName: '',
    billDate: '',
    dueDate: '',
    month: 'January',
    year: '2025',
    priority: 'Normal' as 'Low' | 'Normal' | 'High' | 'Urgent',
    reminderDate: '',
    baseAmount: 0,
    taxAmount: 0,
    depositAmount: 0,
    totalAmount: 0,
    billPdf: null as File | null,
    billPdfName: '',
    customUtilityType: '',
    accountNumber: '',
    policyNumber: '',
    assessmentId: '',
    contractId: '',
    mobileNumber: ''
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [existingBills, setExistingBills] = useState<Bill[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [duplicateFound, setDuplicateFound] = useState<any>(null);
  const [error, setError] = useState('');

  const companyNames = [
    'GLR', 'Gravity', 'Neoteric Housing LLP', 'Swastik', 'Heaven Heights',
    'Neoteric Construction', 'Others'
  ];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 2099 - 2025 + 1 }, (_, i) => (2025 + i).toString());

  const priorities = [
    { value: 'Normal' as const, label: 'Low' },
    { value: 'Normal' as const, label: 'Medium' },
    { value: 'Urgent' as const, label: 'High' },
    { value: 'Urgent' as const, label: 'Urgent' }
  ];

  useEffect(() => {
    // Ensure session is established
    fetch('/api/health', { credentials: 'include' }).catch(() => {});
    
    const loadData = async () => {
      try {
        const [loadedProjects, loadedBillTypes, loadedBills] = await Promise.all([
          api.getProjects(),
          api.getBillTypes(),
          api.getBills()
        ]);
        setProjects(loadedProjects);
        setBillTypes(loadedBillTypes);
        setExistingBills(loadedBills);
        
        if (loadedProjects.length > 0 && !formData.projectName) {
          setFormData(prev => ({ ...prev, projectName: loadedProjects[0].name }));
        }
        if (loadedBillTypes.length > 0 && !formData.billType) {
          setFormData(prev => ({ ...prev, billType: loadedBillTypes[0].name }));
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const total = Math.max(0, (Number(formData.baseAmount) + Number(formData.taxAmount)) - Number(formData.depositAmount));
    setFormData(prev => ({ ...prev, totalAmount: total }));
  }, [formData.baseAmount, formData.taxAmount, formData.depositAmount]);

  useEffect(() => {
    if (!formData.billNumber && !formData.accountNumber) {
      setDuplicateFound(null);
      return;
    }

    const duplicate = existingBills.find(eb => {
      const sameNum = (formData.billNumber && eb.billNumber === formData.billNumber) || 
                      (formData.accountNumber && (eb.accountNumber === formData.accountNumber || eb.consumerNumber === formData.accountNumber));
      
      const sameType = eb.utilityType === formData.billType || eb.billType === formData.billType;
      
      const samePeriod = (eb.month === formData.month && eb.year === formData.year) ||
                         (eb.dueDate === formData.dueDate && formData.dueDate !== '') ||
                         (eb.billDate === formData.billDate && formData.billDate !== '');

      return sameNum && sameType && samePeriod;
    });

    setDuplicateFound(duplicate || null);
  }, [formData.billNumber, formData.accountNumber, formData.billType, formData.month, formData.year, formData.dueDate, existingBills]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.billType === 'Other' && !formData.customUtilityType) {
      setError('Please specify the bill type');
      return;
    }

    if (duplicateFound) {
      setError(`A duplicate entry already exists in the system (Bill ID: ${duplicateFound.billId}). Please unique entry or correct the data.`);
      return;
    }

    try {
      // Ensure session is established before upload
      await fetch('/api/health', { credentials: 'include' }).catch(() => {});
      
      let attachments: any[] = [];
      
      // Upload file if exists
      if (formData.billPdf) {
        const uploadFormData = new FormData();
        uploadFormData.append('files', formData.billPdf);
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
          credentials: 'include'
        });
        
        if (uploadRes.ok) {
          const contentType = uploadRes.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const uploadData = await uploadRes.json();
            attachments = uploadData.files || [];
          } else {
            const text = await uploadRes.text();
            if (text.includes('<!doctype html>') || text.includes('<html')) {
              setError("Session verification required. Please try submitting again or refresh the page.");
              return;
            }
          }
        } else {
          const text = await uploadRes.text();
          if (text.includes('<!doctype html>') || text.includes('<html')) {
            setError("Session verification required. Please try submitting again or refresh the page.");
          } else {
            setError(`Upload failed: ${text.slice(0, 100)}`);
          }
          return;
        }
      }

      const newBillData = {
        bill_number: formData.billNumber,
        bill_type: formData.billType,
        customUtilityType: formData.billType === 'Other' ? formData.customUtilityType : undefined,
        project_name: formData.projectName,
        company_name: formData.companyName,
        bill_month: formData.month,
        bill_year: parseInt(formData.year),
        base_amount: formData.baseAmount,
        tax_amount: formData.taxAmount,
        deposit_amount: formData.depositAmount,
        total_amount: formData.totalAmount,
        bill_date: formData.billDate,
        due_date: formData.dueDate,
        reminder_date: formData.reminderDate,
        priority: formData.priority,
        service_provider: formData.serviceProvider,
        permanent_temporary: 'Permanent',
        status: 'Pending' as BillStatus,
        entered_by_name: user?.name || 'System',
        reminder_days: 5,
        attachments: attachments,
        fileUrl: attachments.length > 0 ? attachments[0].url : undefined,
        payments: [],
        accountNumber: formData.accountNumber,
        policyNumber: formData.policyNumber,
        assessmentId: formData.assessmentId,
        contractId: formData.contractId
      };

      await api.saveBill(newBillData);
      
      setIsSubmitted(true);
      setFormData({
        billType: 'Electricity',
        billNumber: '',
        serviceProvider: '',
        companyName: 'GLR',
        projectName: '',
        billDate: '',
        dueDate: '',
        month: 'January',
        year: '2025',
        priority: 'Normal',
        reminderDate: '',
        baseAmount: 0,
        taxAmount: 0,
        depositAmount: 0,
        totalAmount: 0,
        billPdf: null,
        billPdfName: '',
        accountNumber: '',
        policyNumber: '',
        assessmentId: '',
        contractId: '',
        customUtilityType: '',
        mobileNumber: ''
      });
      setTimeout(() => setIsSubmitted(false), 3000);
    } catch (err) {
      setError('An error occurred while submitting the bill');
    }
  };

  const inputClasses = "w-full p-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-400 outline-none transition-all";
  const labelClasses = "text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider";

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-5xl mx-auto space-y-8 pb-12"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-orange-400">
            Add {formData.billType === 'Other' ? formData.customUtilityType || 'New' : formData.billType} Bill
          </h1>
          <p className="text-gray-500 mt-1 font-medium">Create a new utility bill entry in the system</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
            <Calculator className="w-6 h-6" />
          </div>
          <div className="pr-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Current Total</p>
            <p className="text-lg font-black text-gray-900">{formatCurrency(formData.totalAmount)}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={labelClasses}>Bill Type</label>
            <select 
              className={inputClasses}
              value={formData.billType}
              onChange={(e) => setFormData({...formData, billType: e.target.value, customUtilityType: e.target.value === 'Other' ? formData.customUtilityType : ''})}
            >
              <option value="" disabled>Select Bill Type</option>
              {billTypes.map(t => <option key={t.id || t._id} value={t.name}>{t.name}</option>)}
              <option value="Other">Other</option>
            </select>
          </div>
          {formData.billType === 'Other' && (
            <div>
              <label className={labelClasses}>Specify Bill Type</label>
              <input 
                type="text"
                placeholder="e.g. Maintenance, Security"
                className={inputClasses}
                value={formData.customUtilityType}
                onChange={(e) => setFormData({...formData, customUtilityType: e.target.value})}
              />
            </div>
          )}
          <div>
            <label className={labelClasses}>Bill Number</label>
            <input 
              type="text" required
              placeholder="e.g. BILL/2025/001"
              className={inputClasses}
              value={formData.billNumber}
              onChange={(e) => setFormData({...formData, billNumber: e.target.value})}
            />
          </div>
          <div>
            <label className={labelClasses}>Service Provider</label>
            <input 
              type="text" required
              placeholder="e.g. Tata Power"
              className={inputClasses}
              value={formData.serviceProvider}
              onChange={(e) => setFormData({...formData, serviceProvider: e.target.value})}
            />
          </div>
        </div>

        {/* Dynamic Fields */}
        {(['Data (Internet)', 'Landline'].includes(formData.billType)) && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <label className={labelClasses}>
              {formData.billType === 'Landline' ? 'Landline Number' : 'Account Number / Consumer ID'}
            </label>
            <input 
              type="text"
              placeholder={formData.billType === 'Landline' ? 'e.g. 011-12345678' : 'e.g. 1234567890'}
              className={inputClasses}
              value={formData.accountNumber}
              onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
            />
          </div>
        )}

        {(['Property Tax (MCG)', 'Diversion Tax (RD)'].includes(formData.billType)) && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <label className={labelClasses}>Assessment ID / Property ID</label>
            <input 
              type="text"
              placeholder="e.g. TAX-998877"
              className={inputClasses}
              value={formData.assessmentId}
              onChange={(e) => setFormData({...formData, assessmentId: e.target.value})}
            />
          </div>
        )}

        {(['Labour Insurance', 'Asset Insurance'].includes(formData.billType)) && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <label className={labelClasses}>Policy Number</label>
            <input 
              type="text"
              placeholder="e.g. POL-554433"
              className={inputClasses}
              value={formData.policyNumber}
              onChange={(e) => setFormData({...formData, policyNumber: e.target.value})}
            />
          </div>
        )}

        {(['Air Conditioner AMC', 'Elevator AMC'].includes(formData.billType)) && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <label className={labelClasses}>Contract ID / AMC Number</label>
            <input 
              type="text"
              placeholder="e.g. AMC-2025-001"
              className={inputClasses}
              value={formData.contractId}
              onChange={(e) => setFormData({...formData, contractId: e.target.value})}
            />
          </div>
        )}

        {formData.billType === 'Mobile Recharge' && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <label className={labelClasses}>Mobile Number</label>
            <input 
              type="text"
              placeholder="e.g. +91 98765 43210"
              className={inputClasses}
              value={formData.mobileNumber || ''}
              onChange={(e) => setFormData({...formData, mobileNumber: e.target.value})}
            />
          </div>
        )}

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>Company Name</label>
            <input 
              type="text" required
              placeholder="e.g. Neoteric Properties"
              className={inputClasses}
              value={formData.companyName}
              onChange={(e) => setFormData({...formData, companyName: e.target.value})}
            />
          </div>
          <div>
            <label className={labelClasses}>Project Name</label>
            <select 
              required
              className={inputClasses}
              value={formData.projectName}
              onChange={(e) => setFormData({...formData, projectName: e.target.value})}
            >
              {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className={labelClasses}>Bill Date</label>
            <input 
              type="date" required
              className={inputClasses}
              value={formData.billDate}
              onChange={(e) => setFormData({...formData, billDate: e.target.value})}
            />
          </div>
          <div>
            <label className={labelClasses}>Due Date</label>
            <input 
              type="date" required
              className={inputClasses}
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
            />
          </div>
          <div>
            <label className={labelClasses}>Month</label>
            <select 
              className={inputClasses}
              value={formData.month}
              onChange={(e) => setFormData({...formData, month: e.target.value})}
            >
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClasses}>Year</label>
            <select 
              className={inputClasses}
              value={formData.year}
              onChange={(e) => setFormData({...formData, year: e.target.value})}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Row 4 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>Priority</label>
            <select 
              className={inputClasses}
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
            >
              {priorities.map((p, idx) => <option key={`${p.value}-${idx}`} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClasses}>Reminder Date (Optional)</label>
            <input 
              type="date"
              className={inputClasses}
              value={formData.reminderDate}
              onChange={(e) => setFormData({...formData, reminderDate: e.target.value})}
            />
          </div>
        </div>

        {/* Row 5 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={labelClasses}>Base Amount (₹)</label>
            <input 
              type="number" required min="0"
              className={inputClasses}
              value={formData.baseAmount}
              onChange={(e) => setFormData({...formData, baseAmount: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div>
            <label className={labelClasses}>Tax Amount (₹)</label>
            <input 
              type="number" required min="0"
              className={inputClasses}
              value={formData.taxAmount}
              onChange={(e) => setFormData({...formData, taxAmount: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div>
            <label className={labelClasses}>Deposit Amount (Optional - ₹)</label>
            <input 
              type="number" min="0"
              className={inputClasses}
              value={formData.depositAmount}
              onChange={(e) => setFormData({...formData, depositAmount: parseFloat(e.target.value) || 0})}
            />
          </div>
        </div>

        {/* Row 6 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClasses}>Total Amount (₹)</label>
            <input 
              type="number" readOnly
              className={cn(inputClasses, "bg-gray-50 cursor-not-allowed font-bold")}
              value={formData.totalAmount}
            />
          </div>
          <div>
            <label className={labelClasses}>Bill PDF (Accept .pdf only)</label>
            <div className="relative">
              <input 
                type="file" 
                accept=".pdf"
                className="hidden"
                id="new-bill-pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && file.type === 'application/pdf') {
                    setFormData({...formData, billPdf: file, billPdfName: file.name});
                  } else if (file) {
                    alert("Please upload a valid PDF file.");
                  }
                }}
              />
              <label 
                htmlFor="new-bill-pdf"
                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all"
              >
                <span className="text-gray-400 truncate">
                  {formData.billPdfName || "Select PDF file..."}
                </span>
                <Upload className="w-4 h-4 text-orange-400" />
              </label>
            </div>
          </div>
        </div>

        {/* Row 7 */}
        <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-2xl flex flex-col gap-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Calculated Total Amount</p>
                <p className="text-3xl font-black text-gray-900">₹ {formData.totalAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={isSubmitted || !!duplicateFound}
              className={cn(
                "px-12 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-3",
                isSubmitted 
                  ? "bg-green-500 text-white shadow-green-200" 
                  : duplicateFound
                    ? "bg-red-400 text-white cursor-not-allowed opacity-70 shadow-red-100"
                    : "bg-gray-900 text-white hover:bg-black hover:-translate-y-1 shadow-gray-200"
              )}
            >
              {isSubmitted ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Submitted
                </>
              ) : duplicateFound ? (
                'Duplicate Detected'
              ) : (
                `Add ${formData.billType === 'Other' ? formData.customUtilityType || '' : formData.billType} Bill`
              )}
            </button>
          </div>

          {duplicateFound && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 bg-red-100/50 border border-red-200 rounded-xl flex items-start gap-4"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-red-900 uppercase tracking-tighter">Existing Bill Found</p>
                <p className="text-xs text-red-700 mt-1">
                  A bill with this number/account for this period already exists as <b>{duplicateFound.billId}</b>.
                  Duplication is prevented to ensure audit accuracy.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </form>
    </motion.div>
  );
};
