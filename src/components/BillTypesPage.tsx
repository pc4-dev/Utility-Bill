import React, { useState, useEffect } from 'react';
import { BillType } from '../types';
import { api } from '../services/api';
import { BillTypeForm } from './BillTypeForm';
import { BillTypeList } from './BillTypeList';
import { Plus, Tag, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export const BillTypesPage: React.FC = () => {
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<BillType | null>(null);

  const fetchBillTypes = async () => {
    setIsLoading(true);
    try {
      const data = await api.getBillTypes();
      setBillTypes(data);
    } catch (err) {
      console.error('Failed to fetch bill types:', err);
      toast.error('Failed to load bill types');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillTypes();
  }, []);

  const handleSubmit = async (data: Partial<BillType>) => {
    try {
      await api.saveBillType(data);
      toast.success(editingType ? 'Bill type updated' : 'Bill type added');
      setIsFormOpen(false);
      setEditingType(null);
      fetchBillTypes();
    } catch (err) {
      console.error('Failed to save bill type:', err);
      toast.error('Failed to save bill type');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bill type?')) return;
    
    try {
      await api.deleteBillType(id);
      toast.success('Bill type deleted');
      fetchBillTypes();
    } catch (err) {
      console.error('Failed to delete bill type:', err);
      toast.error('Failed to delete bill type');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Bill Categories</h1>
          <p className="text-gray-500 font-medium">Manage different types of utility bills for your properties</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchBillTypes}
            className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
            title="Refresh List"
          >
            <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
          </button>
          <button 
            onClick={() => {
              setEditingType(null);
              setIsFormOpen(true);
            }}
            className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-3xl flex items-center gap-4">
        <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
          <Tag className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-black text-gray-900">Dynamic Bill Categorization</p>
          <p className="text-xs text-gray-500 font-medium">Define custom bill types here to use them across the entire management system.</p>
        </div>
      </div>

      <BillTypeList 
        billTypes={billTypes}
        isLoading={isLoading}
        onEdit={(type) => {
          setEditingType(type);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
      />

      <BillTypeForm 
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingType(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingType}
      />
    </div>
  );
};

// Helper for cn
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
