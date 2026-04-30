import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Save, Plus, Edit2, Trash2, Key, Shield, Upload, CheckCircle, Bell, Database, Clock, Lock, Link as LinkIcon, Download, LogOut, FileJson, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';

import { Bill, User, Project, BillType, SystemSettings, AuditLog } from '../types';
import { api } from '../services/api';
import { BillTypeList } from './BillTypeList';
import { BillTypeForm } from './BillTypeForm';
import { UserForm } from './UserForm';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { toast } from 'react-hot-toast';

export const Settings: React.FC<{ bills?: Bill[] }> = ({ bills = [] }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch (err) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (updatedSettings?: Partial<SystemSettings>) => {
    try {
      const toSave = updatedSettings ? { ...settings, ...updatedSettings } : settings;
      const data = await api.updateSettings(toSave as SystemSettings);
      setSettings(data);
      toast.success('Settings saved successfully!');
      
      // Log activity
      await api.createAuditLog({
        user: user?.name || 'Admin',
        action: 'Update Settings',
        details: `Updated ${Object.keys(updatedSettings || {}).join(', ') || 'System Settings'}`
      });
    } catch (err) {
      toast.error('Failed to save settings');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-orange-50 dark:border-slate-800 text-center transition-colors">
        <Shield className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
        <h3 className="text-xl font-black text-text-primary mb-2 transition-colors">Access Restricted</h3>
        <p className="text-text-secondary font-medium transition-colors">You do not have permission to view settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary transition-colors">System Settings</h2>
          <p className="text-sm text-text-secondary mt-1 transition-colors transition-colors">Manage company details, users, and bill configurations.</p>
        </div>
      </div>

      <div className="flex gap-6 border-b border-gray-200 dark:border-slate-800 overflow-x-auto pb-1 transition-colors">
        <button 
          onClick={() => setActiveTab('general')} 
          className={cn("pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap transition-colors", activeTab === 'general' ? "text-orange-600 border-orange-600" : "text-text-secondary border-transparent hover:text-text-primary")}
        >
          General Settings
        </button>
        <button 
          onClick={() => setActiveTab('users')} 
          className={cn("pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap transition-colors", activeTab === 'users' ? "text-orange-600 border-orange-600" : "text-text-secondary border-transparent hover:text-text-primary")}
        >
          User & Role Management
        </button>
        <button 
          onClick={() => setActiveTab('bills')} 
          className={cn("pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap transition-colors", activeTab === 'bills' ? "text-orange-600 border-orange-600" : "text-text-secondary border-transparent hover:text-text-primary")}
        >
          Bill Configuration
        </button>
        <button 
          onClick={() => setActiveTab('bill-types')} 
          className={cn("pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap transition-colors", activeTab === 'bill-types' ? "text-orange-600 border-orange-600" : "text-text-secondary border-transparent hover:text-text-primary")}
        >
          Bill Categories
        </button>
        <button 
          onClick={() => setActiveTab('notifications')} 
          className={cn("pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap transition-colors", activeTab === 'notifications' ? "text-orange-600 border-orange-600" : "text-text-secondary border-transparent hover:text-text-primary")}
        >
          Notification Settings
        </button>
        <button 
          onClick={() => setActiveTab('backup')} 
          className={cn("pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap transition-colors", activeTab === 'backup' ? "text-orange-600 border-orange-600" : "text-text-secondary border-transparent hover:text-text-primary")}
        >
          Backup & Restore
        </button>
        <button 
          onClick={() => setActiveTab('audit')} 
          className={cn("pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap transition-colors", activeTab === 'audit' ? "text-orange-600 border-orange-600" : "text-text-secondary border-transparent hover:text-text-primary")}
        >
          Audit & Activity Logs
        </button>
        <button 
          onClick={() => setActiveTab('security')} 
          className={cn("pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap transition-colors", activeTab === 'security' ? "text-orange-600 border-orange-600" : "text-text-secondary border-transparent hover:text-text-primary")}
        >
          Security Settings
        </button>
        <button 
          onClick={() => setActiveTab('integrations')} 
          className={cn("pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap transition-colors", activeTab === 'integrations' ? "text-orange-600 border-orange-600" : "text-text-secondary border-transparent hover:text-text-primary")}
        >
          Integration Settings
        </button>
        <button 
          onClick={() => setActiveTab('projects')} 
          className={cn("pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap transition-colors", activeTab === 'projects' ? "text-orange-600 border-orange-600" : "text-text-secondary border-transparent hover:text-text-primary")}
        >
          Project Management
        </button>
        <button 
          onClick={() => setActiveTab('payments')} 
          className={cn("pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap transition-colors", activeTab === 'payments' ? "text-orange-600 border-orange-600" : "text-text-secondary border-transparent hover:text-text-primary")}
        >
          Payment Methods
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-orange-50 dark:border-slate-800 p-8 transition-colors">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'general' && <GeneralSettings settings={settings} onSave={handleSave} />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'bills' && <BillConfiguration settings={settings} onSave={handleSave} />}
            {activeTab === 'bill-types' && <BillTypeManagement />}
            {activeTab === 'notifications' && <NotificationSettings settings={settings} onSave={handleSave} />}
            {activeTab === 'backup' && <BackupRestoreSettings />}
            {activeTab === 'audit' && <AuditLogsSettings />}
            {activeTab === 'security' && <SecuritySettings settings={settings} onSave={handleSave} />}
            {activeTab === 'integrations' && <IntegrationSettings settings={settings} onSave={handleSave} />}
            {activeTab === 'projects' && <ProjectManagement />}
            {activeTab === 'payments' && <PaymentMethodConfiguration settings={settings} onSave={handleSave} />}
          </>
        )}
      </div>
    </div>
  );
};

const GeneralSettings = ({ settings, onSave }: { settings: SystemSettings | null, onSave: (data: Partial<SystemSettings>) => void }) => {
  const [formData, setFormData] = useState({
    companyName: settings?.companyName || '',
    gstNumber: settings?.gstNumber || '',
    address: settings?.address || '',
    currency: settings?.currency || 'INR',
    dateFormat: settings?.dateFormat || 'DD/MM/YYYY',
    financialYear: settings?.financialYear || 'Apr-Mar',
    timezone: settings?.timezone || 'IST'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 bg-gray-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-all cursor-pointer">
          <Upload className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-bold uppercase transition-colors">Upload Logo</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-text-primary transition-colors">Company Logo</h3>
          <p className="text-xs text-text-secondary mt-1 transition-colors">Recommended size: 256x256px. Max 2MB.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block transition-colors">Company Name</label>
          <input 
            type="text" 
            name="companyName"
            value={formData.companyName} 
            onChange={handleChange}
            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-orange-500 transition-all" 
          />
        </div>
        <div>
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block transition-colors">GST Number</label>
          <input 
            type="text" 
            name="gstNumber"
            value={formData.gstNumber} 
            onChange={handleChange}
            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-orange-500 transition-all" 
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block transition-colors">Company Address</label>
          <textarea 
            rows={3} 
            name="address"
            value={formData.address} 
            onChange={handleChange}
            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-orange-500 transition-all" 
          />
        </div>
        <div>
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block transition-colors">Default Currency</label>
          <select 
            name="currency"
            value={formData.currency} 
            onChange={handleChange}
            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-orange-500 transition-all"
          >
            <option value="INR" className="bg-white dark:bg-slate-900">₹ (INR)</option>
            <option value="USD" className="bg-white dark:bg-slate-900">$ (USD)</option>
            <option value="EUR" className="bg-white dark:bg-slate-900">€ (EUR)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block transition-colors">Date Format</label>
          <select 
            name="dateFormat"
            value={formData.dateFormat} 
            onChange={handleChange}
            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-orange-500 transition-all"
          >
            <option value="DD/MM/YYYY" className="bg-white dark:bg-slate-900">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY" className="bg-white dark:bg-slate-900">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD" className="bg-white dark:bg-slate-900">YYYY-MM-DD</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block transition-colors transition-colors">Financial Year</label>
          <select 
            name="financialYear"
            value={formData.financialYear} 
            onChange={handleChange}
            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-orange-500 transition-all"
          >
            <option value="Apr-Mar" className="bg-white dark:bg-slate-900">April - March</option>
            <option value="Jan-Dec" className="bg-white dark:bg-slate-900">January - December</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block transition-colors">Time Zone</label>
          <select 
            name="timezone"
            value={formData.timezone} 
            onChange={handleChange}
            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-orange-500 transition-all"
          >
            <option value="IST" className="bg-white dark:bg-slate-900 transition-colors">Asia/Kolkata (IST)</option>
            <option value="UTC" className="bg-white dark:bg-slate-900 transition-colors">UTC</option>
          </select>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex justify-end transition-colors transition-colors">
        <button onClick={() => onSave(formData)} className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 dark:shadow-orange-950/20">
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const loadUsers = async () => {
    try {
      const loadedUsers = await api.getUsers();
      setUsers(loadedUsers);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUser(id);
      toast.success('User deleted successfully');
      loadUsers();
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const handleSaveUser = async (userData: Partial<User>) => {
    try {
      if (editingUser) {
        await api.saveUser({ ...editingUser, ...userData });
        toast.success('User updated successfully');
      } else {
        await api.saveUser(userData);
        toast.success('User added successfully');
      }
      setIsFormOpen(false);
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      toast.error(editingUser ? 'Failed to update user' : 'Failed to add user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-text-primary transition-colors">Users & Roles</h3>
        <button 
          onClick={() => {
            setEditingUser(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-white transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800 transition-colors">
                <th className="py-4 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider transition-colors">Name</th>
                <th className="py-4 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider transition-colors">Email</th>
                <th className="py-4 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider transition-colors">Role</th>
                <th className="py-4 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right transition-colors">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 transition-colors">
            {users.map((u, index) => (
              <tr key={u.id || u._id || u.email || `user-${index}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-4 text-sm font-bold text-text-primary transition-colors">{u.name}</td>
                <td className="py-4 px-4 text-sm text-text-secondary transition-colors">{u.email}</td>
                <td className="py-4 px-4">
                  <span className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold transition-colors",
                    u.role === 'ADMIN' ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" : 
                    u.role === 'MANAGER' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : 
                    u.role === 'GOV_TAX_ENTRY' ? "bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-500 border border-orange-100 dark:border-orange-900/20" :
                    u.role === 'INSURANCE_ENTRY' ? "bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-500 border border-purple-100 dark:border-purple-900/20" :
                    u.role === 'ACCOUNT_MANAGEMENT' ? "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-500 border border-emerald-100 dark:border-emerald-900/20" :
                    u.role === 'ACCOUNT_MANAGER' ? "bg-cyan-50 dark:bg-cyan-900/10 text-cyan-600 dark:text-cyan-500 border border-cyan-100 dark:border-cyan-900/20" :
                    "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                  )}>
                    {u.role}
                  </span>
                </td>
                <td className="py-4 px-4 text-right space-x-2">
                  <button 
                    onClick={() => {
                      setEditingUser(u);
                      setIsFormOpen(true);
                    }}
                    className="p-2 text-text-secondary hover:text-blue-600 transition-colors" 
                    title="Edit User"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-text-secondary hover:text-orange-600 transition-colors" title="Reset Password"><Key className="w-4 h-4" /></button>
                  <button 
                    onClick={() => handleDelete(u.id || u._id || '')}
                    className="p-2 text-text-secondary hover:text-red-600 transition-colors" 
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>

      <UserForm 
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleSaveUser}
        initialData={editingUser}
      />

      <div className="mt-8 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-800 transition-colors">
        <h4 className="text-sm font-bold text-text-primary mb-4 transition-colors">Role Permissions Reference</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {['ADMIN', 'MANAGER', 'DATA_ENTRY', 'GOV_TAX_ENTRY', 'INSURANCE_ENTRY', 'ACCOUNT_MANAGEMENT', 'ACCOUNT_MANAGER'].map(role => (
            <div key={role} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
              <p className="text-sm font-bold text-text-primary mb-2 transition-colors transition-colors">{role.replace('_', ' ')}</p>
              <div className="flex flex-wrap gap-2">
                {['View', 'Edit', 'Approve', 'Delete', 'Initiate', 'Confirm'].map(perm => {
                  let active = false;
                  if (role === 'ADMIN' || role === 'MANAGER') active = true;
                  else if (role === 'DATA_ENTRY' && (perm === 'View' || perm === 'Edit' || perm === 'Verify')) active = true;
                  else if (role === 'ACCOUNT_MANAGEMENT' && (perm === 'View' || perm === 'Initiate')) active = true;
                  else if (role === 'ACCOUNT_MANAGER' && (perm === 'View' || perm === 'Confirm')) active = true;
                  else if ((role === 'GOV_TAX_ENTRY' || role === 'INSURANCE_ENTRY') && (perm === 'View' || perm === 'Edit')) active = true;
                  
                  return (
                    <span key={perm} className={cn("text-[10px] px-2 py-1 rounded-md font-bold transition-all transition-colors", active ? "bg-green-50 dark:bg-emerald-900/30 text-green-600 dark:text-emerald-400" : "bg-gray-50 dark:bg-slate-800 text-text-secondary opacity-50")}>
                      {perm}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BillTypeManagement = () => {
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<BillType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteBillType(itemToDelete);
      toast.success('Bill type deleted');
      setIsDeleteModalOpen(false);
      fetchBillTypes();
    } catch (err) {
      console.error('Failed to delete bill type:', err);
      toast.error('Failed to delete bill type');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-text-primary transition-colors transition-colors">Bill Categories</h3>
          <p className="text-xs text-text-secondary mt-1 transition-colors transition-colors">Manage different types of utility bills for your properties</p>
        </div>
        <button 
          onClick={() => {
            setEditingType(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 dark:shadow-orange-950/20"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
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

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Delete Bill Category"
        message="Are you sure you want to remove this bill category? Bills already linked to this category will become uncategorized."
      />
    </div>
  );
};

const BillConfiguration = ({ settings, onSave }: { settings: SystemSettings | null, onSave: (data: Partial<SystemSettings>) => void }) => {
  const [formData, setFormData] = useState({
    reminderDays: settings?.reminderDays || 3,
    largeAmountThreshold: settings?.largeAmountThreshold || 50000
  });

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block transition-colors">Priority Levels</label>
          <div className="space-y-2">
            {(settings?.priorityLevels || ['Low', 'Normal', 'High', 'Urgent']).map((level, index) => (
              <div key={level || index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-text-primary transition-colors">
                {level}
                <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-slate-600" />
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block transition-colors">Default Reminder Days</label>
            <div className="relative">
              <input 
                type="number" 
                value={formData.reminderDays} 
                onChange={(e) => setFormData({ ...formData, reminderDays: parseInt(e.target.value) || 0 })}
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-orange-500 transition-colors" 
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-secondary font-medium transition-colors">Days before due</span>
            </div>
          </div>
          
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block transition-colors">Large Amount Alert Threshold</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-secondary font-bold transition-colors">₹</span>
              <input 
                type="number" 
                value={formData.largeAmountThreshold} 
                onChange={(e) => setFormData({ ...formData, largeAmountThreshold: parseInt(e.target.value) || 0 })}
                className="w-full pl-8 p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-orange-500 transition-colors" 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex justify-end transition-colors">
        <button onClick={() => onSave(formData)} className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 dark:shadow-orange-950/20">
          <Save className="w-4 h-4" />
          Save Configuration
        </button>
      </div>
    </div>
  );
};

const NotificationSettings = ({ settings, onSave }: { settings: SystemSettings | null, onSave: (data: Partial<SystemSettings>) => void }) => {
  const [notifSettings, setNotifSettings] = useState(settings?.notifications || {
    email: true,
    whatsapp: false,
    overdue: true,
    upcoming: true,
    dailySummary: false,
    weeklySummary: true,
    upcomingDays: 7
  });

  const toggle = (key: keyof typeof notifSettings) => {
    setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-text-primary border-b border-gray-100 dark:border-slate-800 pb-2 transition-colors">Channels</h3>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 transition-all">
            <div>
              <p className="text-sm font-bold text-text-primary transition-colors">Email Notifications</p>
              <p className="text-xs text-text-secondary transition-colors">Receive alerts via email</p>
            </div>
            <button onClick={() => toggle('email')} className={cn("transition-colors", notifSettings.email ? "text-orange-500" : "text-gray-300 dark:text-slate-600")}>
              {notifSettings.email ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 transition-all">
            <div>
              <p className="text-sm font-bold text-text-primary transition-colors">WhatsApp Notifications</p>
              <p className="text-xs text-text-secondary transition-colors">Receive alerts via WhatsApp</p>
            </div>
            <button onClick={() => toggle('whatsapp')} className={cn("transition-colors", notifSettings.whatsapp ? "text-orange-500" : "text-gray-300 dark:text-slate-600")}>
              {notifSettings.whatsapp ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-text-primary border-b border-gray-100 dark:border-slate-800 pb-2 transition-colors">Alert Types</h3>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 transition-all">
            <div>
              <p className="text-sm font-bold text-text-primary transition-colors">Overdue Alerts</p>
              <p className="text-xs text-text-secondary transition-colors">When bills cross due date</p>
            </div>
            <button onClick={() => toggle('overdue')} className={cn("transition-colors", notifSettings.overdue ? "text-orange-500" : "text-gray-300 dark:text-slate-600")}>
              {notifSettings.overdue ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 transition-all">
            <div>
              <p className="text-sm font-bold text-text-primary transition-colors">Upcoming Due Alerts</p>
              <div className="flex items-center gap-2 mt-1">
                <input 
                  type="number" 
                  value={notifSettings.upcomingDays} 
                  onChange={(e) => setNotifSettings(prev => ({ ...prev, upcomingDays: parseInt(e.target.value) || 7 }))}
                  className="w-16 p-1 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded outline-none focus:border-orange-500 transition-colors"
                />
                <span className="text-xs text-text-secondary transition-colors">days before</span>
              </div>
            </div>
            <button onClick={() => toggle('upcoming')} className={cn("transition-colors", notifSettings.upcoming ? "text-orange-500" : "text-gray-300 dark:text-slate-600")}>
              {notifSettings.upcoming ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>
        </div>

        <div className="space-y-4 md:col-span-2">
          <h3 className="text-sm font-bold text-text-primary border-b border-gray-100 dark:border-slate-800 pb-2 transition-colors transition-colors">Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 transition-all">
              <div>
                <p className="text-sm font-bold text-text-primary transition-colors">Daily Summary</p>
                <p className="text-xs text-text-secondary transition-colors">Morning digest of pending tasks</p>
              </div>
              <button onClick={() => toggle('dailySummary')} className={cn("transition-colors", notifSettings.dailySummary ? "text-orange-500" : "text-gray-300 dark:text-slate-600")}>
                {notifSettings.dailySummary ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 transition-all">
              <div>
                <p className="text-sm font-bold text-text-primary transition-colors">Weekly Report</p>
                <p className="text-xs text-text-secondary transition-colors">Financial summary every Monday</p>
              </div>
              <button onClick={() => toggle('weeklySummary')} className={cn("transition-colors", notifSettings.weeklySummary ? "text-orange-500" : "text-gray-300 dark:text-slate-600")}>
                {notifSettings.weeklySummary ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex justify-end transition-colors">
        <button onClick={() => onSave({ notifications: notifSettings })} className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 dark:shadow-orange-950/20">
          <Save className="w-4 h-4" />
          Save Notifications
        </button>
      </div>
    </div>
  );
};

const BackupRestoreSettings = () => {
  const [loading, setLoading] = useState(false);

  const handleManualBackup = async () => {
    setLoading(true);
    try {
      const data = await api.backupData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `utility-bill-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup generated and download started');
    } catch (err) {
      toast.error('Backup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: This will overwrite all current data. Are you sure you want to proceed?')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        await api.restoreData(data);
        toast.success('Data restored successfully! Reloading...');
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        toast.error('Restore failed. Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-1 transition-colors">Manual Backup</h3>
            <p className="text-xs text-text-secondary mb-4 transition-colors">Download a complete JSON snapshot of your data.</p>
            <button 
              onClick={handleManualBackup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 border-2 border-orange-500 text-orange-600 dark:text-orange-400 rounded-xl text-sm font-bold hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download Backup (JSON)
            </button>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-slate-800 transition-colors">
            <h3 className="text-sm font-bold text-text-primary mb-1 transition-colors transition-colors">Auto Backup Frequency</h3>
            <p className="text-xs text-text-secondary mb-4 transition-colors">Schedule automatic cloud backups.</p>
            <select className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-orange-500 transition-colors">
              <option value="daily" className="bg-white dark:bg-slate-900">Daily</option>
              <option value="weekly" className="bg-white dark:bg-slate-900">Weekly</option>
              <option value="monthly" className="bg-white dark:bg-slate-900">Monthly</option>
            </select>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-1 transition-colors">Restore from Backup</h3>
            <p className="text-xs text-text-secondary mb-4 transition-colors">Upload a previous JSON backup file to restore data.</p>
            
            <label className="w-full h-32 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 transition-all cursor-pointer">
              <Upload className="w-6 h-6 mb-2" />
              <span className="text-xs font-bold">Click to upload JSON file</span>
              <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
            </label>
            
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl flex gap-2 text-red-600 dark:text-red-400 transition-colors">
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium leading-relaxed">
                <strong>Warning:</strong> Restoring from a backup will overwrite current data. This action cannot be undone. Please ensure you have a recent backup before proceeding.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AuditLogsSettings = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await api.getAuditLogs();
        setLogs(data);
      } catch (err) {
        toast.error('Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <select className="p-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-text-primary outline-none focus:ring-2 focus:ring-orange-500 transition-colors">
            <option value="" className="bg-white dark:bg-slate-900">All Users</option>
          </select>
          <input type="date" className="p-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-text-primary outline-none focus:ring-2 focus:ring-orange-500 transition-colors" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-text-primary rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
          <Download className="w-4 h-4" />
          Export Logs
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 transition-colors">
                  <th className="py-3 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider transition-colors">Timestamp</th>
                  <th className="py-3 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider transition-colors">User</th>
                  <th className="py-3 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider transition-colors">Action</th>
                  <th className="py-3 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider transition-colors">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 transition-colors transition-colors">
                {logs.map((log, index) => (
                  <tr key={log.id || log._id || `log-${index}`} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                    <td className="py-3 px-4 text-xs text-text-secondary">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-text-primary">{log.user}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-[10px] font-bold text-text-secondary transition-colors transition-colors">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-text-secondary">{log.details}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-text-secondary text-sm italic">No logs found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const SecuritySettings = ({ settings, onSave }: { settings: SystemSettings | null, onSave: (data: Partial<SystemSettings>) => void }) => {
  const [securitySettings, setSecuritySettings] = useState(settings?.security || {
    twoFactor: false,
    sessionTimeout: '30'
  });

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 transition-colors">
            <div>
              <p className="text-sm font-bold text-text-primary transition-colors">Two-Factor Authentication</p>
              <p className="text-xs text-text-secondary transition-colors">Require 2FA for all admin users</p>
            </div>
            <button 
              onClick={() => setSecuritySettings({ ...securitySettings, twoFactor: !securitySettings.twoFactor })} 
              className={cn("transition-colors", securitySettings.twoFactor ? "text-orange-500" : "text-gray-300 dark:text-slate-600")}
            >
              {securitySettings.twoFactor ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block transition-colors">Session Timeout</label>
            <select 
              value={securitySettings.sessionTimeout}
              onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
              className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
            >
              <option value="15" className="bg-white dark:bg-slate-900">15 Minutes</option>
              <option value="30" className="bg-white dark:bg-slate-900">30 Minutes</option>
              <option value="60" className="bg-white dark:bg-slate-900">1 Hour</option>
              <option value="never" className="bg-white dark:bg-slate-900">Never</option>
            </select>
          </div>

          <div className="pt-4">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-all">
              <LogOut className="w-4 h-4" />
              Force Logout All Devices
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-text-primary mb-4 transition-colors">Recent Login Activity</h3>
          <div className="space-y-3">
            {[
              { os: 'Mac OS - Chrome', ip: '192.168.1.1', time: 'Current Session', current: true },
              { os: 'iOS - Safari', ip: '117.20.34.1', time: '2 hours ago', current: false },
              { os: 'Windows - Edge', ip: '117.20.34.1', time: 'Yesterday', current: false },
            ].map((session, i) => (
              <div key={i} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 flex justify-between items-center transition-colors">
                <div>
                  <p className="text-xs font-bold text-text-primary transition-colors">{session.os}</p>
                  <p className="text-[10px] text-text-secondary transition-colors">{session.ip}</p>
                </div>
                {session.current ? (
                  <span className="px-2 py-1 bg-green-100 dark:bg-emerald-900/30 text-green-700 dark:text-emerald-400 rounded text-[10px] font-bold transition-colors">Active</span>
                ) : (
                  <span className="text-[10px] text-text-secondary transition-colors">{session.time}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex justify-end transition-colors">
        <button onClick={() => onSave({ security: securitySettings })} className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 dark:shadow-orange-950/20">
          <Save className="w-4 h-4" />
          Save Security Settings
        </button>
      </div>
    </div>
  );
};

const IntegrationSettings = ({ settings, onSave }: { settings: SystemSettings | null, onSave: (data: Partial<SystemSettings>) => void }) => {
  return (
    <div className="space-y-8 max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl shadow-sm flex items-center justify-center transition-colors">
              <span className="font-bold text-blue-500">@</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary transition-colors">SMTP Email Setup</h3>
              <p className="text-[10px] text-text-secondary transition-colors">Configure custom email server</p>
            </div>
          </div>
          <div className="space-y-2">
            <input type="text" placeholder="SMTP Host" className="w-full p-2 text-xs bg-white dark:bg-slate-900 text-text-primary border border-gray-200 dark:border-slate-700 rounded-lg outline-none transition-colors" />
            <input type="text" placeholder="Port" className="w-full p-2 text-xs bg-white dark:bg-slate-900 text-text-primary border border-gray-200 dark:border-slate-700 rounded-lg outline-none transition-colors" />
            <button className="w-full py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-800 dark:hover:bg-white transition-colors">Configure</button>
          </div>
        </div>

        <div className="p-5 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl shadow-sm flex items-center justify-center transition-colors">
              <span className="font-bold text-green-500">WA</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary transition-colors">WhatsApp API</h3>
              <p className="text-[10px] text-text-secondary transition-colors">Connect Meta Business API</p>
            </div>
          </div>
          <div className="space-y-2">
            <input type="text" placeholder="API Key" className="w-full p-2 text-xs bg-white dark:bg-slate-900 text-text-primary border border-gray-200 dark:border-slate-700 rounded-lg outline-none transition-colors" />
            <input type="text" placeholder="Phone Number ID" className="w-full p-2 text-xs bg-white dark:bg-slate-900 text-text-primary border border-gray-200 dark:border-slate-700 rounded-lg outline-none transition-colors" />
            <button className="w-full py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-800 dark:hover:bg-white transition-colors">Configure</button>
          </div>
        </div>

        <div className="p-5 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl shadow-sm flex items-center justify-center transition-colors">
              <span className="font-bold text-purple-500">$</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary transition-colors">Payment Gateway</h3>
              <p className="text-[10px] text-text-secondary transition-colors">Stripe config</p>
            </div>
          </div>
          <div className="space-y-2">
            <input type="text" placeholder="Merchant ID" className="w-full p-2 text-xs bg-white dark:bg-slate-900 text-text-primary border border-gray-200 dark:border-slate-700 rounded-lg outline-none transition-colors" />
            <input type="text" placeholder="Secret Key" className="w-full p-2 text-xs bg-white dark:bg-slate-900 text-text-primary border border-gray-200 dark:border-slate-700 rounded-lg outline-none transition-colors" />
            <button className="w-full py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-800 dark:hover:bg-white transition-colors">Configure</button>
          </div>
        </div>

        <div className="p-5 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-4 transition-colors">
          <div className="flex items-center gap-3 transition-colors">
            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl shadow-sm flex items-center justify-center transition-colors">
              <FileJson className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary transition-colors">Tally Export Format</h3>
              <p className="text-[10px] text-text-secondary transition-colors transition-colors">Configure XML export mapping</p>
            </div>
          </div>
          <div className="space-y-2 text-text-primary">
            <select className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg outline-none transition-colors">
              <option className="bg-white dark:bg-slate-900">Default Tally Prime Format</option>
            </select>
            <button className="w-full py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-800 dark:hover:bg-white transition-colors mt-9">Configure Mapping</button>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex justify-end transition-colors">
        <button onClick={() => onSave({})} className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 dark:shadow-orange-950/20">
          <Save className="w-4 h-4" />
          Save Integrations
        </button>
      </div>
    </div>
  );
};

const ProjectManagement = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const loadProjects = async () => {
    try {
      const loadedProjects = await api.getProjects();
      setProjects(loadedProjects);
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteProject(itemToDelete);
      toast.success('Project deleted successfully');
      setIsDeleteModalOpen(false);
      loadProjects();
    } catch (err) {
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleEditProject = async (project: Project) => {
    const name = window.prompt('Enter project name:', project.name);
    if (name && name.trim()) {
      try {
        await api.saveProject({ ...project, name: name.trim() });
        toast.success('Project updated successfully');
        loadProjects();
      } catch (err) {
        toast.error('Failed to update project');
      }
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    setIsAdding(true);
    try {
      await api.saveProject({ name: newProjectName.trim() });
      toast.success('Project added successfully');
      setNewProjectName('');
      loadProjects();
    } catch (err) {
      toast.error('Failed to add project');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/20 p-6 rounded-2xl transition-colors">
        <h3 className="text-sm font-bold text-text-primary mb-4 transition-colors">Add New Project</h3>
        <form onSubmit={handleAddProject} className="flex gap-4">
          <input 
            type="text" 
            placeholder="Enter Project Name (e.g. Swastik Heights)"
            className="flex-1 p-3 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/30 rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
          <button 
            type="submit"
            disabled={isAdding || !newProjectName.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 dark:shadow-orange-950/20 disabled:opacity-50"
          >
            {isAdding ? <Clock className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Project
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-text-primary transition-colors">Project List</h3>
          <p className="text-xs text-text-secondary mt-1 transition-colors">Manage projects linked to bills. Projects appear in the Bill Entry form.</p>
        </div>

        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 transition-colors">
                    <th className="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider transition-colors">Project Name</th>
                    <th className="py-4 px-6 text-xs font-bold text-text-secondary uppercase tracking-wider text-right transition-colors">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800 transition-colors">
                  {projects.map((project, index) => (
                    <tr key={project.id || project._id || `project-${index}`} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors group">
                      <td className="py-4 px-6 text-sm font-bold text-text-primary">{project.name}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditProject(project)}
                            className="p-2 text-text-secondary hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(project.id || project._id || '')}
                            className="p-2 text-text-secondary hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-12 text-center text-text-secondary text-sm italic">No projects registered yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Delete Project"
        message="Are you sure you want to delete this project? Existing bills will still reference this project name."
      />
    </div>
  );
};

const PaymentMethodConfiguration = ({ settings, onSave }: { settings: SystemSettings | null, onSave: (data: Partial<SystemSettings>) => void }) => {
  const [methods, setMethods] = useState(settings?.paymentMethods || [
    { id: '1', name: 'Bank Transfer', active: true },
    { id: '2', name: 'Cheque', active: true },
    { id: '3', name: 'UPI', active: true },
    { id: '4', name: 'Cash', active: true },
  ]);

  const handleToggle = (id: string) => {
    setMethods(methods.map(m => m.id === id ? { ...m, active: !m.active } : m));
  };

  const handleEditMethod = (id: string, currentName: string) => {
    const name = window.prompt('Enter payment method name:', currentName);
    if (name) {
      setMethods(methods.map(m => m.id === id ? { ...m, name } : m));
    }
  };

  const handleAddMethod = () => {
    const name = window.prompt('Enter payment method name:');
    if (name) {
      setMethods([...methods, { id: Date.now().toString(), name, active: true }]);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-text-primary transition-colors transition-colors">Payment Methods</h3>
            <p className="text-xs text-text-secondary mt-1 transition-colors transition-colors">Configure available payment methods for bill entry. These will appear in the payment dropdown.</p>
          </div>
          <button 
            onClick={handleAddMethod}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-text-primary rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-all transition-colors transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Method
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 transition-colors">
                  <th className="py-3 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider transition-colors">Method Name</th>
                  <th className="py-3 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider transition-colors">Status</th>
                  <th className="py-3 px-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right transition-colors">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 transition-colors">
                {methods.map((method, index) => (
                  <tr key={method.id || method._id || `method-${index}`} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                    <td className="py-3 px-4 text-sm font-bold text-text-primary transition-colors">{method.name}</td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold transition-colors",
                        method.active ? "bg-green-100 dark:bg-emerald-900/30 text-green-700 dark:text-emerald-400" : "bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-400"
                      )}>
                        {method.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditMethod((method.id || method._id || '').toString(), method.name)}
                          className="p-1.5 text-text-secondary hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggle((method.id || method._id || '').toString())}
                          className="p-1.5 text-text-secondary hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" 
                          title={method.active ? "Deactivate" : "Activate"}
                        >
                          {method.active ? <ToggleRight className="w-4 h-4 text-green-500 dark:text-emerald-400" /> : <ToggleLeft className="w-4 h-4 dark:text-slate-600" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex justify-end transition-colors">
        <button onClick={() => onSave({ paymentMethods: methods })} className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 dark:shadow-orange-950/20">
          <Save className="w-4 h-4" />
          Save Configuration
        </button>
      </div>
    </div>
  );
};

