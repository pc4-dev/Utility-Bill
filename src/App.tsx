import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { BillManagementHeader } from './components/BillManagementHeader';
import { DashboardOverview } from './components/DashboardOverview';
import { UnifiedDashboard } from './components/UnifiedDashboard';
import { BillList } from './components/BillList';
import { UtilityTypeFilters } from './components/UtilityTypeFilters';
import { BillModal } from './components/BillModal';
import { BillDetailsDrawer } from './components/BillDetailsDrawer';
import { WorkflowModal } from './components/WorkflowModal';
import { PaymentModal } from './components/PaymentModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { Reports } from './components/reports/Reports';
import { ElectricityModule } from './components/ElectricityModule';
import { TelecomModule } from './components/TelecomModule';
import { GovernmentBillsModule } from './components/GovernmentBillsModule';
import { SolarModule } from './components/SolarModule';
import { InsuranceModule } from './components/InsuranceModule';
import { PollutionControlModule } from './components/PollutionControlModule';
import { CategoryBillsPage } from './components/CategoryBillsPage';
import { Settings } from './components/Settings';
import { InsuranceReminderChecker } from './components/InsuranceReminderChecker';
import { PollutionReminderChecker } from './components/PollutionReminderChecker';
import { BillReminderChecker } from './components/BillReminderChecker';
import { Bill, BillStatus, Project, BillType } from './types';
import { 
  Plus, 
  Building2, 
  AlertCircle, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './utils';
import { api } from './services/api';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicBillForm } from './components/PublicBillForm';
import { ChatBot } from './components/ChatBot';
import { ThemeProvider } from './ThemeContext';
import { NotificationProvider } from './NotificationContext';
import { SocketProvider, useSocket } from './SocketContext';
import { Toaster, toast } from 'react-hot-toast';

const MainApp: React.FC = () => {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bills, setBills] = useState<Bill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [workflowActionType, setWorkflowActionType] = useState<'verify' | 'approve' | 'initiate' | 'confirm'>('verify');
  const [workflowActionTitle, setWorkflowActionTitle] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [filters, setFilters] = useState({
    search: '',
    property: '',
    type: '',
    status: '',
    date: ''
  });

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [allBills, allProjects, allBillTypes] = await Promise.all([
        api.getBills(),
        api.getProjects(),
        api.getBillTypes()
      ]);
      setBills(allBills);
      setProjects(allProjects);
      setBillTypes(allBillTypes);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('/api/health', { credentials: 'include' });
        if (res.ok) {
          setBackendStatus('connected');
        } else {
          setBackendStatus('error');
        }
      } catch (e) {
        setBackendStatus('error');
      }
    };
    
    checkBackend();
    fetchData();
  }, [fetchData]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleBillCreated = (newBill: Bill) => {
      setBills(prev => {
        // Prevent duplicates
        if (prev.some(b => (b.id || b._id) === (newBill.id || newBill._id))) return prev;
        return [newBill, ...prev];
      });
    };

    const handleBillUpdated = (updatedBill: Bill) => {
      setBills(prev => prev.map(b => 
        (b.id || b._id) === (updatedBill.id || updatedBill._id) ? updatedBill : b
      ));
    };

    const handleBillDeleted = (data: { id: string }) => {
      setBills(prev => prev.filter(b => (b.id || b._id) !== data.id));
    };

    socket.on('bill:created', handleBillCreated);
    socket.on('bill:updated', handleBillUpdated);
    socket.on('bill:deleted', handleBillDeleted);

    return () => {
      socket.off('bill:created', handleBillCreated);
      socket.off('bill:updated', handleBillUpdated);
      socket.off('bill:deleted', handleBillDeleted);
    };
  }, [socket]);

  const handleSaveBill = async (data: Partial<Bill>) => {
    try {
      const isUpdate = !!(data.id || data._id);
      await api.saveBill(data);
      setIsModalOpen(false);
      setEditingBill(null);
      toast.success(isUpdate ? 'Bill updated successfully!' : 'Bill saved successfully!');
      fetchData();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save bill');
    }
  };

  const handleMarkPaid = async (updatedBill: Bill) => {
    try {
      await api.saveBill(updatedBill);
      toast.success('Bill marked as paid');
      fetchData();
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to update status');
    }
  };

  const handleDeleteBill = (billOrId: Bill | string | number) => {
    const id = typeof billOrId === 'object' ? (billOrId.id || (billOrId as any)._id) : billOrId;
    setBillToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteBill = async () => {
    if (!billToDelete) return;
    
    setIsDeleting(true);
    try {
      await api.deleteBill(billToDelete);
      fetchData();
      toast.success('Bill deleted successfully');
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete bill');
    } finally {
      setIsDeleting(false);
      setBillToDelete(null);
    }
  };

  const handleWorkflowAction = async (remarks: string, proofFile?: File, extraDetails?: { bankName?: string, upiMode?: string, upiReference?: string }) => {
    if (!editingBill) return;
    const id = editingBill.id || (editingBill as any)._id;
    try {
      let updatedBill: Bill;
      if (workflowActionType === 'verify') {
        updatedBill = await api.verifyBill(id, remarks, user?.name, user?.role);
        toast.success('Bill verified successfully');
      } else if (workflowActionType === 'approve') {
        updatedBill = await api.approveBill(id, remarks, user?.name, user?.role);
        toast.success('Bill approved successfully');
      } else if (workflowActionType === 'initiate') {
        let proofUrl = '';
        let proofName = '';
        
        if (proofFile) {
          const formData = new FormData();
          formData.append('files', proofFile);
          const uploadRes = await api.uploadFiles(formData);
          if (uploadRes.files && uploadRes.files.length > 0) {
            proofUrl = uploadRes.files[0].url;
            proofName = uploadRes.files[0].name;
          }
        }
        
        updatedBill = await api.initiatePayment(id, remarks, user?.name, user?.role, proofUrl, proofName);
        toast.success('Payment initiated successfully');
      } else {
        let proofUrl = '';
        let proofName = '';
        
        if (proofFile) {
          const formData = new FormData();
          formData.append('files', proofFile);
          const uploadRes = await api.uploadFiles(formData);
          if (uploadRes.files && uploadRes.files.length > 0) {
            proofUrl = uploadRes.files[0].url;
            proofName = uploadRes.files[0].name;
          }
        }

        updatedBill = await api.confirmPayment(
          id, 
          remarks, 
          user?.name, 
          user?.role, 
          undefined, 
          extraDetails?.bankName,
          extraDetails?.upiMode,
          extraDetails?.upiReference,
          proofUrl,
          proofName
        );
        toast.success('Payment confirmed successfully');
      }
      
      // Update editing bill state to refresh the details modal in real-time
      setEditingBill(updatedBill);
      
      setIsVerificationModalOpen(false);
      // Removed setIsDetailsModalOpen(false) to keep the details view open for the next step
    } catch (err) {
      console.error('Workflow error:', err);
      throw err;
    }
  };

  const handleWorkflowReject = async (remarks: string) => {
    if (!editingBill || !editingBill.id) return;
    try {
      const id = editingBill.id;
      const updatedBill = await api.rejectBill(id, remarks, user?.name, user?.role);
      toast.success('Bill rejected successfully');
      setEditingBill(updatedBill);
      setIsVerificationModalOpen(false);
    } catch (err) {
      console.error('Rejection error:', err);
      throw err;
    }
  };

  const filteredBills = bills.filter(bill => {
    const matchesSearch = filters.search ? (
      bill.billId.toLowerCase().includes(filters.search.toLowerCase()) ||
      bill.propertyName.toLowerCase().includes(filters.search.toLowerCase())
    ) : true;
    const matchesProperty = filters.property ? bill.propertyName === filters.property : true;
    const matchesType = filters.type ? bill.utilityType === filters.type : true;
    const matchesStatus = filters.status ? bill.status === filters.status : true;
    const matchesDate = filters.date ? bill.billDate === filters.date : true;
    const matchesRegion = (filters as any).region ? (
      (bill.district?.toLowerCase().includes((filters as any).region.toLowerCase())) ||
      (bill.zoneWard?.toLowerCase().includes((filters as any).region.toLowerCase()))
    ) : true;

    return matchesSearch && matchesProperty && matchesType && matchesStatus && matchesDate && matchesRegion;
  });

  // Calculate Dashboard Stats
  const dashboardStats = [
    { status: 'PAID', count: bills.filter(b => b.status === 'Paid' || b.status === 'Payment Confirmed').length, total_amount: bills.filter(b => b.status === 'Paid' || b.status === 'Payment Confirmed').reduce((sum, b) => sum + b.amount, 0) },
    { status: 'OVERDUE', count: bills.filter(b => b.status === 'Overdue').length, total_amount: bills.filter(b => b.status === 'Overdue').reduce((sum, b) => sum + b.amount, 0) },
    { status: 'PENDING', count: bills.filter(b => b.status === 'Pending' || b.status === 'PENDING').length, total_amount: bills.filter(b => b.status === 'Pending' || b.status === 'PENDING').reduce((sum, b) => sum + b.amount, 0) },
    { status: 'IN_PROCESS', count: bills.filter(b => b.status === 'Verified' || b.status === 'Approved' || b.status === 'Payment Initiated').length, total_amount: bills.filter(b => b.status === 'Verified' || b.status === 'Approved' || b.status === 'Payment Initiated').reduce((sum, b) => sum + b.amount, 0) },
    { status: 'CLOSED', count: 0, total_amount: 0 },
  ];

  const financialStats = {
    total_pending: bills.filter(b => b.status !== 'Paid' && b.status !== 'Payment Confirmed').reduce((sum, b) => sum + b.amount, 0),
    total_paid: bills.filter(b => b.status === 'Paid' || b.status === 'Payment Confirmed').reduce((sum, b) => sum + b.amount, 0),
  };

  const byPriority = [
    { priority: 'URGENT', count: bills.filter(b => b.priority === 'Urgent').length },
    { priority: 'CRITICAL', count: bills.filter(b => b.priority === 'High').length },
    { priority: 'NORMAL', count: bills.filter(b => b.priority === 'Normal').length },
    { priority: 'LOW', count: bills.filter(b => b.priority === 'Low').length },
  ];

  const byType = Array.from(new Set(bills.map(b => b.utilityType))).map(type => ({
    type,
    count: bills.filter(b => b.utilityType === type).length
  }));

  const properties = Array.from(new Set(projects.map(p => p.name)));

  return (
    <div className="flex min-h-screen bg-content-bg">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header activeTab={activeTab} onMenuClick={() => setIsSidebarOpen(true)} />
        <InsuranceReminderChecker bills={bills} />
        <PollutionReminderChecker bills={bills} />
        <BillReminderChecker bills={bills} />
        
        {backendStatus === 'error' && (
          <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold text-sm">Connection Error</p>
              <p className="text-xs opacity-90">Could not connect to the backend server. Please ensure the server is running on port 3000.</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="ml-auto px-3 py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <UnifiedDashboard onNavigate={setActiveTab} />
            </motion.div>
          )}

          {activeTab === 'bills' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <BillManagementHeader 
                totalBills={bills.length}
                properties={properties}
                onAddBill={() => {
                  setEditingBill(null);
                  setIsModalOpen(true);
                }}
                onSearchChange={(val) => setFilters({ ...filters, search: val })}
                onFilterChange={(key, val) => setFilters({ ...filters, [key]: val })}
              />

              <SummaryCards bills={bills} />

              <UtilityTypeFilters 
                selectedType={filters.type}
                onSelectType={(type) => setFilters({ ...filters, type })}
                billTypes={billTypes}
              />

              <BillList 
                bills={filteredBills} 
                isLoading={isLoading}
                onEdit={(bill) => {
                  setEditingBill(bill);
                  setIsModalOpen(true);
                }}
                onView={(bill) => {
                  setEditingBill(bill);
                  setIsDetailsModalOpen(true);
                }}
                onMarkPaid={(bill) => {
                  setEditingBill(bill);
                  setIsPaymentModalOpen(true);
                }}
                onDelete={handleDeleteBill}
                onVerify={(bill) => {
                  setEditingBill(bill);
                  setWorkflowActionType('verify');
                  setWorkflowActionTitle('Verify Bill');
                  setIsVerificationModalOpen(true);
                }}
                onApprove={(bill) => {
                  setEditingBill(bill);
                  setWorkflowActionType('approve');
                  setWorkflowActionTitle('Approve Bill');
                  setIsVerificationModalOpen(true);
                }}
                onInitiatePayment={(bill) => {
                  setEditingBill(bill);
                  setWorkflowActionType('initiate');
                  setWorkflowActionTitle('Initiate Payment');
                  setIsVerificationModalOpen(true);
                }}
                onConfirmPayment={(bill) => {
                  setEditingBill(bill);
                  setWorkflowActionType('confirm');
                  setWorkflowActionTitle('Confirm Payment');
                  setIsVerificationModalOpen(true);
                }}
              />
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Reports />
            </motion.div>
          )}

          {activeTab === 'electricity' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ElectricityModule />
            </motion.div>
          )}

          {activeTab === 'telecom' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <TelecomModule />
            </motion.div>
          )}

          {activeTab === 'government' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GovernmentBillsModule />
            </motion.div>
          )}

          {activeTab === 'solar' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <SolarModule />
            </motion.div>
          )}

          {activeTab === 'insurance' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <InsuranceModule />
            </motion.div>
          )}

          {activeTab === 'pollution' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PollutionControlModule />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Settings bills={bills} />
            </motion.div>
          )}

          {activeTab.startsWith('category:') && (
            <CategoryBillsPage 
              categoryName={activeTab.split(':')[1]}
              bills={bills}
              projects={projects}
              isLoading={isLoading}
              onEdit={(bill) => {
                setEditingBill(bill);
                setIsModalOpen(true);
              }}
              onView={(bill) => {
                setEditingBill(bill);
                setIsDetailsModalOpen(true);
              }}
              onMarkPaid={(bill) => {
                setEditingBill(bill);
                setIsPaymentModalOpen(true);
              }}
              onDelete={handleDeleteBill}
              onAdd={() => {
                setEditingBill({ utilityType: activeTab.split(':')[1] } as any);
                setIsModalOpen(true);
              }}
            />
          )}

          {activeTab !== 'bills' && activeTab !== 'reports' && activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'electricity' && activeTab !== 'telecom' && activeTab !== 'government' && activeTab !== 'solar' && activeTab !== 'insurance' && activeTab !== 'pollution' && !activeTab.startsWith('category:') && (
            <div className="bg-white p-12 rounded-xl border border-border-light text-center">
              <p className="text-text-secondary font-medium">The {activeTab} module is coming soon.</p>
            </div>
          )}
        </div>
      </main>

      <BillModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBill(null);
        }}
        onSubmit={handleSaveBill}
        onDelete={handleDeleteBill}
        initialData={editingBill}
        properties={properties}
        billTypes={billTypes}
        userRole={user?.role}
      />

      <BillDetailsDrawer
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setEditingBill(null);
          fetchData(); // Refresh list when closing details
        }}
        bill={editingBill}
        onEdit={(bill) => {
          setIsDetailsModalOpen(false);
          setEditingBill(bill);
          setIsModalOpen(true);
        }}
        onMarkPaid={(bill) => {
          setIsDetailsModalOpen(false);
          setEditingBill(bill);
          setIsPaymentModalOpen(true);
        }}
        onDelete={handleDeleteBill}
        onVerify={(bill) => {
          setEditingBill(bill);
          setWorkflowActionType('verify');
          setIsVerificationModalOpen(true);
        }}
        onApprove={(bill) => {
          setEditingBill(bill);
          setWorkflowActionType('approve');
          setIsVerificationModalOpen(true);
        }}
        onInitiatePayment={(bill) => {
          setEditingBill(bill);
          setWorkflowActionType('initiate');
          setIsVerificationModalOpen(true);
        }}
        onConfirmPayment={(bill) => {
          setEditingBill(bill);
          setWorkflowActionType('confirm');
          setIsVerificationModalOpen(true);
        }}
      />

      <WorkflowModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        bill={editingBill}
        actionType={workflowActionType}
        title={workflowActionTitle}
        onConfirm={handleWorkflowAction}
        onReject={handleWorkflowReject}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setEditingBill(null);
        }}
        bill={editingBill}
        onPaymentSuccess={handleMarkPaid}
      />
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteBill}
        isLoading={isDeleting}
        title="Delete Bill Entry"
        message="Are you sure you want to remove this bill? This record will be permanently deleted from the system."
      />
      <ChatBot bills={bills} />
    </div>
  );
};

const LoginView: React.FC = () => {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] relative overflow-hidden flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background Decorative Elements - All Orange focused */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-orange-500/[0.02] rounded-full blur-[150px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[440px] relative z-10"
      >
        {/* Branding Header */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-[24px] shadow-2xl shadow-orange-500/10 mb-6 border border-orange-100"
          >
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center">
              <Building2 className="text-primary w-8 h-8" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Neoteric Properties</h1>
          <p className="text-orange-600 font-bold tracking-wide text-sm">Utility Management Made Smart</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[32px] shadow-[0_32px_64px_rgba(249,115,22,0.08)] border border-orange-50 p-8 sm:p-10 relative overflow-hidden">
          <div className="relative z-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back 👋</h2>
              <p className="text-gray-500 font-medium">Sign in to continue managing your utilities</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[14px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-primary focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Password</label>
                  <button type="button" className="text-[11px] font-bold text-primary hover:text-orange-700 transition-colors uppercase tracking-wider">
                    Forgot Password?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-[14px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-primary focus:bg-white transition-all"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-1">
                <button 
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                    rememberMe ? "bg-primary border-primary text-white" : "bg-gray-50 border-gray-200"
                  )}
                >
                  {rememberMe && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <span className="text-sm font-medium text-gray-500 cursor-pointer select-none hover:text-primary transition-colors" onClick={() => setRememberMe(!rememberMe)}>
                  Remember me
                </span>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-bold">{error}</p>
                </motion.div>
              )}

              <motion.button 
                whileHover={{ scale: 1.01, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.15em] text-[13px] hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/25 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            &copy; 2024 Neoteric Properties &bull; Gwalior, India
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <SocketProvider>
              <Toaster position="top-right" />
              <Routes>
                <Route path="/public-form" element={<PublicBillForm />} />
                <Route path="/*" element={<AppContent />} />
              </Routes>
            </SocketProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-content-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return user ? <MainApp /> : <LoginView />;
}
