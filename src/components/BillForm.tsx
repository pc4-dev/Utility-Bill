import React, { useState, useEffect } from 'react';
import { X, Zap, Calculator, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, cn } from '../utils';
import { api } from '../services/api';
import { Project } from '../types';

interface BillFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const BillForm: React.FC<BillFormProps> = ({ onClose, onSubmit }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    bill_type: 'Electricity',
    bill_month: 'January',
    bill_year: 2025,
    project_name: '',
    company_name: '',
    custom_company_name: '',
    permanent_temporary: 'Permanent',
    service_provider: '',
    bill_number: '',
    bill_date: '',
    due_date: '',
    priority: 'NORMAL',
    reminder_days: 3,
    reminder_date: '',
    electricity_rate: 0,
    electricity_units: 0,
    base_amount: 0,
    tax_amount: 0,
    deposit_amount: 0,
    security_amount: 0,
    total_amount: 0,
    bill_pdf: null as File | null,
    bill_pdf_name: '',
    description: '',
    customUtilityType: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadProjects = async () => {
      const loadedProjects = await api.getProjects();
      setProjects(loadedProjects);
      if (loadedProjects.length > 0 && !formData.project_name) {
        setFormData(prev => ({ ...prev, project_name: loadedProjects[0].name }));
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    const total = Math.max(0, (formData.base_amount + formData.tax_amount + (formData.security_amount || 0)) - formData.deposit_amount);
    
    let rate = formData.electricity_rate;
    if (formData.bill_type === 'Electricity' && formData.electricity_units > 0) {
      rate = total / formData.electricity_units;
    }
    
    setFormData(prev => ({ 
      ...prev, 
      total_amount: total,
      electricity_rate: rate
    }));
  }, [formData.base_amount, formData.electricity_units, formData.tax_amount, formData.deposit_amount, formData.security_amount, formData.bill_type]);

  // Auto-calculate Reminder Date from Due Date
  useEffect(() => {
    if (formData.due_date && formData.reminder_days) {
      const dueDate = new Date(formData.due_date);
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(dueDate.getDate() - formData.reminder_days);
      if (!isNaN(reminderDate.getTime())) {
        setFormData(prev => ({ ...prev, reminder_date: reminderDate.toISOString().split('T')[0] }));
      }
    }
  }, [formData.due_date, formData.reminder_days]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!formData.project_name) newErrors.project_name = 'Project name is required';
    if (!formData.company_name) newErrors.company_name = 'Company name is required';
    if (formData.company_name === 'Others' && !formData.custom_company_name) {
      newErrors.custom_company_name = 'Please specify company name';
    }
    if (!formData.service_provider) newErrors.service_provider = 'Service provider is required';
    if (!formData.bill_number) newErrors.bill_number = 'Bill number is required';
    if (!formData.bill_date) newErrors.bill_date = 'Bill date is required';
    if (!formData.due_date) newErrors.due_date = 'Due date is required';
    if (!formData.bill_pdf) newErrors.bill_pdf = 'Documentation (PDF) is required';
    
    if (formData.bill_type === 'Others' && !formData.customUtilityType) {
      newErrors.customUtilityType = 'Please specify the bill type';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      const firstError = Object.keys(newErrors)[0];
      const element = document.getElementsByName(firstError)[0];
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    onSubmit(formData);
  };

  const renderError = (field: string) => (
    <AnimatePresence>
      {errors[field] && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0, x: [0, -2, 2, -2, 2, 0] }}
          exit={{ opacity: 0, y: -10 }}
          className="text-[10px] text-red-500 mt-1 font-bold flex items-center gap-1 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded-md border border-red-100 dark:border-red-900/30 w-fit"
        >
          <AlertCircle className="w-3 h-3" />
          {errors[field]}
        </motion.p>
      )}
    </AnimatePresence>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-slate-800 transition-colors"
      >
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-text-primary shadow-sm transition-colors">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary transition-colors">Add New Bill</h2>
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wider transition-colors">Fill in the details to initiate workflow</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-white dark:bg-slate-900 transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 pb-2 transition-colors">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Bill Type</label>
                  <select 
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                    value={formData.bill_type}
                    onChange={(e) => setFormData({...formData, bill_type: e.target.value, customUtilityType: e.target.value === 'Others' ? formData.customUtilityType : ''})}
                  >
                    <option className="dark:bg-slate-900">Electricity</option>
                    <option className="dark:bg-slate-900">Solar Bill</option>
                    <option className="dark:bg-slate-900">Telecom</option>
                    <option className="dark:bg-slate-900">Water</option>
                    <option className="dark:bg-slate-900">CTE</option>
                    <option className="dark:bg-slate-900">CTO</option>
                    <option className="dark:bg-slate-900">Vehicle Insurance</option>
                    <option className="dark:bg-slate-900">Employee Insurance</option>
                    <option className="dark:bg-slate-900">General Insurance</option>
                    <option className="dark:bg-slate-900">Property Tax</option>
                    <option className="dark:bg-slate-900">Diversion Tax</option>
                    <option className="dark:bg-slate-900">Maintenance</option>
                    <option className="dark:bg-slate-900">Others</option>
                  </select>
                </div>
                {formData.bill_type === 'Others' && (
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Specify Bill Type</label>
                    <input 
                      type="text"
                      placeholder="e.g. Security, Cleaning"
                      className={cn(
                      "w-full p-2.5 bg-white dark:bg-slate-800 border rounded-lg text-sm text-text-primary focus:ring-2 outline-none transition-all",
                      errors.customUtilityType 
                        ? "border-red-500 bg-red-50/10 focus:ring-red-500/20" 
                        : "border-gray-200 dark:border-slate-700 focus:ring-primary/10"
                    )}
                    value={formData.customUtilityType}
                    onChange={(e) => {
                      setFormData({...formData, customUtilityType: e.target.value});
                      if (errors.customUtilityType) setErrors(prev => { const { customUtilityType, ...rest } = prev; return rest; });
                    }}
                  />
                  {renderError('customUtilityType')}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Month</label>
                    <select 
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-primary transition-all"
                      value={formData.bill_month}
                      onChange={(e) => setFormData({...formData, bill_month: e.target.value})}
                    >
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m} className="dark:bg-slate-900">{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Year</label>
                    <select 
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-primary transition-all"
                      value={formData.bill_year}
                      onChange={(e) => setFormData({...formData, bill_year: parseInt(e.target.value)})}
                    >
                      {Array.from({length: 75}, (_, i) => 2025 + i).map(y => <option key={y} className="dark:bg-slate-900">{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Project Name</label>
                  <select 
                    name="project_name"
                    required
                    className={cn(
                      "w-full p-2.5 bg-white dark:bg-slate-800 border rounded-lg text-sm text-text-primary focus:ring-2 outline-none transition-all",
                      errors.project_name 
                        ? "border-red-500 bg-red-50/10 focus:ring-red-500/20" 
                        : "border-gray-200 dark:border-slate-700 focus:ring-primary/10"
                    )}
                    value={formData.project_name}
                    onChange={(e) => {
                      setFormData({...formData, project_name: e.target.value});
                      if (errors.project_name) setErrors(prev => { const { project_name, ...rest } = prev; return rest; });
                    }}
                  >
                    <option value="" className="dark:bg-slate-900">Select Project</option>
                    {projects.map(p => <option key={p.id} value={p.name} className="dark:bg-slate-900">{p.name}</option>)}
                  </select>
                  {renderError('project_name')}
                </div>
              </div>
            </div>

            {/* Provider Info */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 pb-2 transition-colors transition-colors">Provider Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors transition-colors">Company Name</label>
                  <select 
                    name="company_name"
                    required
                    className={cn(
                      "w-full p-2.5 bg-white dark:bg-slate-800 border rounded-lg text-sm text-text-primary focus:ring-2 outline-none transition-all",
                      errors.company_name 
                        ? "border-red-500 bg-red-50/10 focus:ring-red-500/20" 
                        : "border-gray-200 dark:border-slate-700 focus:ring-primary/10"
                    )}
                    value={formData.company_name}
                    onChange={(e) => {
                      setFormData({...formData, company_name: e.target.value});
                      if (errors.company_name) setErrors(prev => { const { company_name, ...rest } = prev; return rest; });
                    }}
                  >
                    <option value="" className="dark:bg-slate-900">Select Company</option>
                    <option value="GLR" className="dark:bg-slate-900">GLR</option>
                    <option value="Gravity" className="dark:bg-slate-900">Gravity</option>
                    <option value="Neoteric Housing LLP" className="dark:bg-slate-900">Neoteric Housing LLP</option>
                    <option value="Swastik" className="dark:bg-slate-900">Swastik</option>
                    <option value="Heaven Heights" className="dark:bg-slate-900">Heaven Heights</option>
                    <option value="Neoteric Construction" className="dark:bg-slate-900">Neoteric Construction</option>
                    <option value="Others" className="dark:bg-slate-900">Others</option>
                  </select>
                    {renderError('company_name')}
                </div>
                {formData.company_name === 'Others' && (
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Specify Company Name</label>
                    <input 
                      name="custom_company_name"
                      type="text" required
                      placeholder="Enter company name"
                      className={cn(
                        "w-full p-2.5 bg-white dark:bg-slate-800 border rounded-lg text-sm text-text-primary focus:ring-2 outline-none transition-all",
                        errors.custom_company_name 
                          ? "border-red-500 bg-red-50/10 focus:ring-red-500/20" 
                          : "border-gray-200 dark:border-slate-700 focus:ring-primary/10"
                      )}
                      value={formData.custom_company_name}
                      onChange={(e) => {
                        setFormData({...formData, custom_company_name: e.target.value});
                        if (errors.custom_company_name) setErrors(prev => { const { custom_company_name, ...rest } = prev; return rest; });
                      }}
                    />
                    {renderError('custom_company_name')}
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Service Provider</label>
                  <input 
                    name="service_provider"
                    type="text" required
                    className={cn(
                      "w-full p-2.5 bg-white dark:bg-slate-800 border rounded-lg text-sm text-text-primary focus:ring-2 outline-none transition-all",
                      errors.service_provider 
                        ? "border-red-500 bg-red-50/10 focus:ring-red-500/20" 
                        : "border-gray-200 dark:border-slate-700 focus:ring-primary/10"
                    )}
                    value={formData.service_provider}
                    onChange={(e) => {
                      setFormData({...formData, service_provider: e.target.value});
                      if (errors.service_provider) setErrors(prev => { const { service_provider, ...rest } = prev; return rest; });
                    }}
                  />
                  {renderError('service_provider')}
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Bill Number</label>
                  <input 
                    name="bill_number"
                    type="text" required
                    className={cn(
                      "w-full p-2.5 bg-white dark:bg-slate-800 border rounded-lg text-sm text-text-primary focus:ring-2 outline-none transition-all",
                      errors.bill_number 
                        ? "border-red-500 bg-red-50/10 focus:ring-red-500/20" 
                        : "border-gray-200 dark:border-slate-700 focus:ring-primary/10"
                    )}
                    value={formData.bill_number}
                    onChange={(e) => {
                      setFormData({...formData, bill_number: e.target.value});
                      if (errors.bill_number) setErrors(prev => { const { bill_number, ...rest } = prev; return rest; });
                    }}
                  />
                  {renderError('bill_number')}
                </div>
              </div>
            </div>

            {/* Dates & Priority */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 pb-2 transition-colors">Schedule & Priority</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Bill Date</label>
                    <input 
                      name="bill_date"
                      type="date" required
                      className={cn(
                        "w-full p-2.5 bg-white dark:bg-slate-800 border rounded-lg text-sm text-text-primary focus:ring-2 outline-none transition-all",
                        errors.bill_date 
                          ? "border-red-500 bg-red-50/10 focus:ring-red-500/20" 
                          : "border-gray-200 dark:border-slate-700 focus:ring-primary/10"
                      )}
                      value={formData.bill_date}
                      onChange={(e) => {
                        setFormData({...formData, bill_date: e.target.value});
                        if (errors.bill_date) setErrors(prev => { const { bill_date, ...rest } = prev; return rest; });
                      }}
                    />
                    {renderError('bill_date')}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Due Date</label>
                    <input 
                      name="due_date"
                      type="date" required
                      className={cn(
                        "w-full p-2.5 bg-white dark:bg-slate-800 border rounded-lg text-sm text-text-primary focus:ring-2 outline-none transition-all",
                        errors.due_date 
                          ? "border-red-500 bg-red-50/10 focus:ring-red-500/20" 
                          : "border-gray-200 dark:border-slate-700 focus:ring-primary/10"
                      )}
                      value={formData.due_date}
                      onChange={(e) => {
                        setFormData({...formData, due_date: e.target.value});
                        if (errors.due_date) setErrors(prev => { const { due_date, ...rest } = prev; return rest; });
                      }}
                    />
                    {renderError('due_date')}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Reminder Date (Optional)</label>
                  <input 
                    type="date"
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-primary transition-all"
                    value={formData.reminder_date}
                    onChange={(e) => setFormData({...formData, reminder_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Priority</label>
                  <select 
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-primary transition-all"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="NORMAL" className="dark:bg-slate-900">Normal</option>
                    <option value="URGENT" className="dark:bg-slate-900">Urgent</option>
                    <option value="CRITICAL" className="dark:bg-slate-900">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Reminder Days</label>
                  <input 
                    type="number"
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-primary transition-all"
                    value={formData.reminder_days}
                    onChange={(e) => setFormData({...formData, reminder_days: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-gray-100 dark:border-slate-800 pb-2 transition-colors">Additional Details</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Upload Bill PDF (Required)</label>
                <div className="relative">
                  <input 
                    name="bill_pdf"
                    type="file" 
                    accept=".pdf"
                    className="hidden"
                    id="bill-pdf-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.size <= 5 * 1024 * 1024) {
                        setFormData({...formData, bill_pdf: file, bill_pdf_name: file.name});
                        setErrors(prev => {
                          const next = { ...prev };
                          delete next.bill_pdf;
                          return next;
                        });
                      } else if (file) {
                        alert("File size must be less than 5MB and format must be PDF");
                      }
                    }}
                  />
                  <label 
                    htmlFor="bill-pdf-upload"
                    className={cn(
                      "w-full p-2.5 bg-white dark:bg-slate-800 border rounded-lg text-sm flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-all",
                      errors.bill_pdf 
                        ? "border-red-500 bg-red-50/10" 
                        : "border-gray-200 dark:border-slate-700"
                    )}
                  >
                    <span className={cn("truncate", errors.bill_pdf ? "text-red-500 font-bold" : "text-text-secondary")}>
                      {formData.bill_pdf_name || "Choose PDF file..."}
                    </span>
                    <span className={cn("font-bold text-[10px] uppercase", errors.bill_pdf ? "text-red-600" : "text-text-primary")}>Browse</span>
                  </label>
                  {renderError('bill_pdf')}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Description / Notes</label>
                <textarea 
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-primary min-h-[100px] transition-all"
                  placeholder="Enter any additional notes here..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-gray-200 dark:border-slate-800 transition-colors">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-6 border-b border-gray-100 dark:border-slate-800 pb-2 transition-colors">Financial Calculations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Base Amount</label>
                <input 
                  type="number"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-primary outline-none focus:ring-1 focus:ring-primary/10 transition-all"
                  value={formData.base_amount}
                  onChange={(e) => setFormData({...formData, base_amount: parseFloat(e.target.value) || 0})}
                />
              </div>

              {formData.bill_type === 'Electricity' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Total Units</label>
                    <input 
                      type="number"
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-primary outline-none focus:ring-1 focus:ring-primary/10 transition-all"
                      value={formData.electricity_units}
                      onChange={(e) => setFormData({...formData, electricity_units: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block flex items-center gap-1 transition-colors">
                      <Zap className="w-3 h-3 text-yellow-500" /> Rate Per Unit
                    </label>
                    <input 
                      type="text"
                      readOnly
                      className="w-full p-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-primary outline-none cursor-not-allowed transition-all"
                      value={formData.electricity_rate.toFixed(2)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors transition-colors">Security Amount</label>
                    <input 
                      type="number"
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-primary outline-none focus:ring-1 focus:ring-primary/10 transition-all"
                      value={formData.security_amount}
                      onChange={(e) => setFormData({...formData, security_amount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors transition-colors">Tax Amount</label>
                <input 
                  type="number"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-primary outline-none focus:ring-1 focus:ring-primary/10 transition-all"
                  value={formData.tax_amount}
                  onChange={(e) => setFormData({...formData, tax_amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Deposit Amount</label>
                <input 
                  type="number"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-text-primary outline-none focus:ring-1 focus:ring-primary/10 transition-all"
                  value={formData.deposit_amount}
                  onChange={(e) => setFormData({...formData, deposit_amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary mb-1 block transition-colors">Total Amount (₹)</label>
                <input 
                  type="text"
                  readOnly
                  className="w-full p-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-bold text-text-primary outline-none cursor-not-allowed transition-all"
                  value={formatCurrency(formData.total_amount)}
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between transition-colors">
              <div>
                <p className="text-xs font-bold text-text-secondary uppercase">Calculated Total</p>
                <h2 className="text-4xl font-black text-text-primary">{formatCurrency(formData.total_amount)}</h2>
              </div>
              <button 
                type="submit"
                className="px-10 py-4 bg-white dark:bg-slate-800 border border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 rounded-xl font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white dark:hover:bg-slate-100 dark:hover:text-slate-900 transition-all shadow-lg shadow-gray-100 dark:shadow-slate-950/20"
              >
                Submit Bill
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
