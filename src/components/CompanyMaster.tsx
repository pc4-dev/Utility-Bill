import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  X,
  Save,
  Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { api } from '../services/api';
import { Company } from '../types';
import { toast } from 'react-hot-toast';

export const CompanyMaster: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    companyCode: '',
    status: 'Active' as 'Active' | 'Inactive',
    remarks: ''
  });

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Fetch companies error:', error);
      toast.error('Failed to load companies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpenModal = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        companyName: company.companyName,
        companyCode: company.companyCode,
        status: company.status,
        remarks: company.remarks || ''
      });
    } else {
      setEditingCompany(null);
      setFormData({
        companyName: '',
        companyCode: '',
        status: 'Active',
        remarks: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dataToSave = editingCompany 
        ? { ...formData, id: editingCompany.id || editingCompany._id }
        : formData;
      
      await api.saveCompany(dataToSave);
      toast.success(editingCompany ? 'Company updated successfully' : 'Company added successfully');
      setIsModalOpen(false);
      fetchCompanies();
    } catch (error: any) {
      console.error('Save company error:', error);
      toast.error(error.message || 'Failed to save company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this company?')) return;
    
    try {
      await api.deleteCompany(id);
      toast.success('Company deleted successfully');
      fetchCompanies();
    } catch (error) {
      console.error('Delete company error:', error);
      toast.error('Failed to delete company');
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.companyCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2 transition-colors">
            <Building2 className="w-6 h-6 text-primary" />
            Companies Master
          </h2>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider transition-colors pt-1">
            Manage your organizations and business entities
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Company
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border-light shadow-sm overflow-hidden transition-colors">
        <div className="p-4 border-b border-border-light flex items-center gap-3 transition-colors">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input 
              type="text"
              placeholder="Search companies by name or code..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-border-light rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-text-primary placeholder:text-gray-400 placeholder:font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-slate-800/50 transition-colors">
                <th className="py-4 px-6 text-left text-[10px] font-black text-text-secondary uppercase tracking-widest border-b border-border-light">Company Name</th>
                <th className="py-4 px-6 text-left text-[10px] font-black text-text-secondary uppercase tracking-widest border-b border-border-light">Company Code</th>
                <th className="py-4 px-6 text-center text-[10px] font-black text-text-secondary uppercase tracking-widest border-b border-border-light">Status</th>
                <th className="py-4 px-6 text-center text-[10px] font-black text-text-secondary uppercase tracking-widest border-b border-border-light">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light transition-colors">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-sm font-bold text-text-secondary uppercase tracking-widest">Loading Companies...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <Building className="w-16 h-16 text-text-secondary" />
                      <p className="text-sm font-bold text-text-secondary uppercase tracking-widest">No companies found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id || company._id} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <p className="text-sm font-black text-text-primary transition-colors">{company.companyName}</p>
                      {company.remarks && <p className="text-[10px] text-text-secondary font-medium mt-0.5 line-clamp-1">{company.remarks}</p>}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs font-mono font-bold px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded-md text-text-primary transition-colors border border-border-light">
                        {company.companyCode}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={cn(
                        "status-pill",
                        company.status === 'Active' 
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" 
                          : "bg-red-50 text-red-600 dark:bg-red-950/20"
                      )}>
                        {company.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {company.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenModal(company)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete((company.id || company._id)!)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-border-light transition-colors"
            >
              <div className="p-6 border-b border-border-light flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-text-primary leading-tight transition-colors">
                      {editingCompany ? 'Edit Company' : 'Add New Company'}
                    </h3>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">
                      {editingCompany ? 'Update existing entity details' : 'Create a new business entity'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-text-secondary" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5 transition-colors">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block ml-1 transition-colors">Company Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="Enter full company name"
                    className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-border-light rounded-xl text-sm font-bold text-text-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block ml-1 transition-colors">Company Code</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. NHT"
                      className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-border-light rounded-xl text-sm font-bold text-text-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all uppercase"
                      value={formData.companyCode}
                      onChange={(e) => setFormData({...formData, companyCode: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block ml-1 transition-colors">Status</label>
                    <select 
                      className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-border-light rounded-xl text-sm font-bold text-text-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest block ml-1 transition-colors">Remarks (Optional)</label>
                  <textarea 
                    placeholder="Add any additional notes or details..."
                    className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-border-light rounded-xl text-sm font-bold text-text-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all min-h-[100px] resize-none"
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                  ></textarea>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-border-light font-black text-[10px] uppercase tracking-widest text-text-secondary hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editingCompany ? 'Update' : 'Save'} Company
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
