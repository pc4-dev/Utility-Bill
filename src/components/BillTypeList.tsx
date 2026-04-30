import React from 'react';
import { BillType } from '../types';
import { Edit2, Trash2, Tag, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDateDisplay } from '../utils';

interface BillTypeListProps {
  billTypes: BillType[];
  onEdit: (billType: BillType) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export const BillTypeList: React.FC<BillTypeListProps> = ({ 
  billTypes, 
  onEdit, 
  onDelete,
  isLoading 
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-32"></div>
        ))}
      </div>
    );
  }

  if (billTypes.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-4">
          <Tag className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-gray-900">No bill types defined</h3>
        <p className="text-xs text-gray-500 max-w-xs mt-1">
          Start by adding a new bill type to categorize your utility expenses.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence mode="popLayout">
        {billTypes.map((type) => (
          <motion.div
            key={type.id || type._id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                <Tag className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 transition-opacity">
                <button 
                  onClick={() => onEdit(type)}
                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => onDelete(type.id || type._id!)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-1">{type.name}</h3>
              {type.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{type.description}</p>
              )}
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <Calendar className="w-3 h-3" />
                Created {type.createdAt ? formatDateDisplay(type.createdAt.split('T')[0]) : 'Recently'}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
