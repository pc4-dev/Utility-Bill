import React, { useState, useEffect } from 'react';
import { BillType } from '../types';
import { X, Save, Tag, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';

interface BillTypeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<BillType>) => void;
  initialData?: BillType | null;
}

export const BillTypeForm: React.FC<BillTypeFormProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData 
}) => {
  const [formData, setFormData] = useState<Partial<BillType>>({
    name: '',
    description: '',
    icon: 'FileText'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        description: '',
        icon: 'FileText'
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = 'Category name is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const renderError = (field: string) => (
    <AnimatePresence>
      {errors[field] && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0, x: [0, -2, 2, -2, 2, 0] }}
          exit={{ opacity: 0, y: -5 }}
          className="text-[10px] text-red-500 mt-1 font-bold flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3" />
          {errors[field]}
        </motion.p>
      )}
    </AnimatePresence>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] overflow-hidden border border-gray-100 dark:border-slate-800 transition-colors"
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-50 dark:border-slate-800 flex items-center justify-between bg-gray-50/30 dark:bg-slate-800/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm transition-colors">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight transition-colors">
                {initialData ? 'Edit Category' : 'Add Category'}
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider transition-colors">Bill Type Management</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-2.5">
            <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 ml-1 transition-colors">Category Name</label>
            <div className="relative group">
              <Tag className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", errors.name ? "text-red-400" : "text-gray-400 group-focus-within:text-primary")} />
              <input 
                type="text"
                placeholder="e.g. Electricity, Water, Internet"
                className={cn(
                  "w-full pl-11 pr-4 py-3.5 bg-gray-50/50 dark:bg-slate-800/50 border rounded-2xl text-[15px] dark:text-gray-100 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500",
                  errors.name 
                    ? "border-red-500 ring-4 ring-red-50 dark:ring-red-950/20 focus:ring-red-100 dark:focus:ring-red-900/40 focus:border-red-600" 
                    : "border-gray-200 dark:border-slate-700 focus:ring-4 focus:ring-primary/5 focus:border-primary"
                )}
                value={formData.name}
                onChange={(e) => {
                  setFormData({...formData, name: e.target.value});
                  if (errors.name) setErrors(prev => { const { name, ...rest } = prev; return rest; });
                }}
              />
            </div>
            {renderError('name')}
          </div>

          <div className="space-y-2.5">
            <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 ml-1 transition-colors">Description (Optional)</label>
            <div className="relative group">
              <FileText className="absolute left-4 top-4 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
              <textarea 
                rows={3}
                placeholder="Briefly describe this category..."
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl text-[15px] dark:text-gray-100 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-[14px] hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-[14px] flex items-center justify-center gap-2 transition-all shadow-xl shadow-gray-200 hover:-translate-y-0.5"
            >
              <Save className="w-4 h-4" />
              Add Category
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
