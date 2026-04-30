import React, { useState, useEffect } from 'react';
import { X, Save, User as UserIcon, Mail, Shield, Lock, AlertCircle, Check, ChevronDown, ChevronRight, Settings, FileText, LayoutGrid, Database, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Role, ModulePermissions } from '../types';
import { cn } from '../utils';

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<User>) => void;
  initialData?: User | null;
}

const MODULES = [
  { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutGrid },
  { id: 'electricity', label: 'Electricity Bills', icon: FileText },
  { id: 'telecom', label: 'Telecom Bills', icon: FileText },
  { id: 'solar', label: 'Solar Bills', icon: FileText },
  { id: 'insurance', label: 'Insurance Details', icon: Shield },
  { id: 'government', label: 'Gov & Tax Bills', icon: FileText },
  { id: 'pollution', label: 'Pollution Control', icon: FileText },
  { id: 'reports', label: 'Reports & Analytics', icon: History },
  { id: 'settings', label: 'System Settings', icon: Settings },
];

const PERMISSION_KEYS: (keyof ModulePermissions)[] = ['view', 'add', 'edit', 'delete', 'approve'];

export const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'MANAGER',
  });
  const [customRole, setCustomRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, ModulePermissions>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedModule, setExpandedModule] = useState<string | null>('bills');

  useEffect(() => {
    if (initialData) {
      const isPredefined = ['ADMIN', 'MANAGER', 'DATA_ENTRY', 'VERIFIER', 'APPROVER', 'GOV_TAX_ENTRY', 'INSURANCE_ENTRY', 'ACCOUNT_MANAGEMENT', 'ACCOUNT_MANAGER'].includes(initialData.role);
      setFormData({
        name: initialData.name,
        email: initialData.email,
        role: initialData.role,
      });
      setIsCustomRole(!isPredefined);
      setCustomRole(!isPredefined ? initialData.role : '');
      setPermissions(initialData.permissions || {});
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'MANAGER',
      });
      setIsCustomRole(false);
      setCustomRole('');
      setPermissions({});
    }
    setErrors({});
  }, [initialData, isOpen]);

  const togglePermission = (moduleId: string, perm: keyof ModulePermissions) => {
    setPermissions(prev => {
      const currentModulePerms = prev[moduleId] || { view: false, add: false, edit: false, delete: false, approve: false };
      return {
        ...prev,
        [moduleId]: {
          ...currentModulePerms,
          [perm]: !currentModulePerms[perm]
        }
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = 'Full name is required';
    if (!formData.email?.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (isCustomRole && !customRole.trim()) {
      newErrors.customRole = 'Role name is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const submissionData = {
      ...formData,
      role: isCustomRole ? customRole.trim() : formData.role,
      permissions
    };

    onSubmit(submissionData);
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden my-auto"
          >
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center shadow-inner">
                  <UserIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">
                    {initialData ? 'Update User' : 'Create Access Profile'}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                    {initialData ? 'Configure individual access rights' : 'Set up credentials & system permissions'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[70vh]">
              <div className="p-8 space-y-8">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                      Individual Name
                    </label>
                    <div className="relative group">
                      <UserIcon className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors z-10", errors.name ? "text-red-400" : "text-gray-400 group-focus-within:text-orange-500")} />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (errors.name) setErrors(prev => { const { name, ...rest } = prev; return rest; });
                        }}
                        className={cn(
                          "w-full pl-12 pr-4 py-4 bg-gray-50 border-2 rounded-2xl text-sm font-bold focus:outline-none transition-all placeholder:font-medium placeholder:text-gray-300",
                          errors.name 
                            ? "border-red-500 ring-4 ring-red-50 focus:border-red-600" 
                            : "border-transparent focus:bg-white focus:border-orange-500 focus:ring-8 focus:ring-orange-500/5"
                        )}
                        placeholder="Full name"
                      />
                      {renderError('name')}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors z-10", errors.email ? "text-red-400" : "text-gray-400 group-focus-within:text-orange-500")} />
                      <input
                        type="text"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (errors.email) setErrors(prev => { const { email, ...rest } = prev; return rest; });
                        }}
                        className={cn(
                          "w-full pl-12 pr-4 py-4 bg-gray-50 border-2 rounded-2xl text-sm font-bold focus:outline-none transition-all placeholder:font-medium placeholder:text-gray-300",
                          errors.email 
                            ? "border-red-500 ring-4 ring-red-50 focus:border-red-600" 
                            : "border-transparent focus:bg-white focus:border-orange-500 focus:ring-8 focus:ring-orange-500/5"
                        )}
                        placeholder="Corporate email"
                      />
                      {renderError('email')}
                    </div>
                  </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Designation & Role
                    </label>
                    <button 
                      type="button"
                      onClick={() => setIsCustomRole(!isCustomRole)}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all",
                        isCustomRole 
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-200" 
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                      )}
                    >
                      Custom Role
                    </button>
                  </div>

                  {isCustomRole ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="relative group">
                        <Shield className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors z-10", errors.customRole ? "text-red-400" : "text-orange-500")} />
                        <input
                          type="text"
                          value={customRole}
                          onChange={(e) => {
                            setCustomRole(e.target.value);
                            if (errors.customRole) setErrors(prev => { const { customRole, ...rest } = prev; return rest; });
                          }}
                          className={cn(
                            "w-full pl-12 pr-4 py-4 bg-orange-50/30 border-2 rounded-2xl text-sm font-bold focus:outline-none transition-all",
                            errors.customRole 
                              ? "border-red-500 ring-4 ring-red-50 focus:border-red-600" 
                              : "border-orange-200 focus:bg-white focus:border-orange-500 focus:ring-8 focus:ring-orange-500/5"
                          )}
                          placeholder="Type custom role name (e.g. Regional Supervisor)"
                        />
                      </div>
                      {renderError('customRole')}
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(['ADMIN', 'MANAGER', 'DATA_ENTRY', 'VERIFIER', 'APPROVER', 'GOV_TAX_ENTRY', 'INSURANCE_ENTRY', 'ACCOUNT_MANAGEMENT', 'ACCOUNT_MANAGER'] as Role[]).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setFormData({ ...formData, role })}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 group",
                            formData.role === role
                              ? "bg-white border-orange-500 text-orange-700 shadow-xl shadow-orange-100"
                              : "bg-gray-50/50 border-transparent text-gray-400 hover:bg-white hover:border-gray-200 hover:shadow-lg"
                          )}
                        >
                          <Shield className={cn("w-5 h-5 transition-transform group-hover:scale-110", formData.role === role ? "text-orange-600" : "text-gray-300")} />
                          <span className="text-[9px] font-black uppercase tracking-wider text-center leading-tight">
                            {role === 'GOV_TAX_ENTRY' ? 'Gov Tax' : 
                             role === 'INSURANCE_ENTRY' ? 'Insurance' : 
                             role === 'ACCOUNT_MANAGEMENT' ? 'Account Mgmt' :
                             role === 'ACCOUNT_MANAGER' ? 'Account Mgr' :
                             role.replace('_', ' ')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Permissions Matrix */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                    Access Permissions Matrix
                  </label>
                  
                  <div className="space-y-3 bg-gray-50/50 rounded-3xl p-4 border border-gray-100">
                    {MODULES.map((module) => {
                      const isExpanded = expandedModule === module.id;
                      const modulePerms = permissions[module.id] || { view: false, add: false, edit: false, delete: false, approve: false };
                      const activeCount = Object.values(modulePerms).filter(Boolean).length;

                      return (
                        <div key={module.id} className="overflow-hidden bg-white rounded-2xl border border-gray-100 transition-all hover:shadow-sm">
                          <button
                            type="button"
                            onClick={() => setExpandedModule(isExpanded ? null : module.id)}
                            className="w-full flex items-center justify-between p-4 focus:outline-none"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                                activeCount > 0 ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-400"
                              )}>
                                <module.icon className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <p className={cn("text-xs font-black tracking-tight", activeCount > 0 ? "text-gray-900" : "text-gray-500")}>
                                  {module.label}
                                </p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">
                                  {activeCount > 0 ? `${activeCount}/${PERMISSION_KEYS.length} enabled` : 'Restricted Access'}
                                </p>
                              </div>
                            </div>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-gray-50"
                              >
                                <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
                                  {PERMISSION_KEYS.map((perm) => (
                                    <button
                                      key={perm}
                                      type="button"
                                      onClick={() => togglePermission(module.id, perm)}
                                      className={cn(
                                        "flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2",
                                        modulePerms[perm]
                                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-inner"
                                          : "bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100"
                                      )}
                                    >
                                      {modulePerms[perm] && <Check className="w-3 h-3" />}
                                      {perm}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-8 bg-gray-50/50 flex gap-4 sticky bottom-0 border-t border-gray-100 z-10 backdrop-blur-md">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-gray-50 transition-all font-sans"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-3 py-4 bg-orange-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 font-sans group"
                >
                  <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  {initialData ? 'Update Permissions' : 'Create User Profile'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
