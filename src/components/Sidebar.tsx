import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  FileText, 
  Building2, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  PieChart,
  HelpCircle,
  Tag,
  ChevronDown,
  Zap,
  Droplets,
  Wifi,
  Flame,
  Wrench,
  MoreHorizontal,
  Sun,
  Phone,
  ShieldCheck,
  Bug,
  Wind,
  ArrowUpCircle,
  FileCheck,
  ShieldAlert,
  Trash2,
  Smartphone,
  User,
  Receipt
} from 'lucide-react';
import { cn } from '../utils';
import { useAuth } from '../AuthContext';
import { api } from '../services/api';
import { BillType } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  isOpen, 
  onClose,
  isCollapsed,
  setIsCollapsed
}) => {
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const { logout, user } = useAuth();

  useEffect(() => {
    // No need to fetch bill types here as they are not used in the sidebar
    // and are already fetched in App.tsx if needed
  }, []);

  const getUtilityIcon = (type: string) => {
    switch (type) {
      case 'Electricity': return Zap;
      case 'Telecom': return Smartphone;
      case 'Water': return Droplets;
      case 'Solar Bill': return Sun;
      case 'Data (Internet)': return Wifi;
      case 'Landline': return Phone;
      case 'Property Tax (MCG)': 
      case 'Diversion Tax (RD)': return Building2;
      case 'Pollution Control': return ShieldCheck;
      case 'Labour Insurance':
      case 'Asset Insurance': return ShieldAlert;
      case 'Air Conditioner AMC': return Wind;
      case 'Elevator AMC': return ArrowUpCircle;
      case 'Waste Management': return FileText;
      case 'Pest Control': return Bug;
      case 'Fire Safety Audit': return Flame;
      case 'Electrical Safety Audit': return FileCheck;
      case 'Insurance': return ShieldCheck;
      default: return MoreHorizontal;
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bills', label: 'Bill Management', icon: FileText },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'electricity', label: 'Electricity', icon: Zap },
    { id: 'telecom', label: 'Telecom', icon: Smartphone },
    { id: 'solar', label: 'Solar Bills', icon: Sun },
    { id: 'government', label: 'Government Bills', icon: Building2 },
    { id: 'pollution', label: 'Pollution Control', icon: ShieldCheck },
    { id: 'insurance', label: 'Insurance', icon: ShieldCheck },
    { id: 'expenses', label: 'Other Expenses', icon: Receipt },
    { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
  ];

  const filteredItems = menuItems.filter(item => {
    // If user has specific permissions defined for this module, use them
    if (user?.permissions && user.permissions[item.id]) {
      return user.permissions[item.id].view;
    }

    // Role based restrictions (fallback for legacy or predefined roles)
    if (user?.role === 'EA') {
      return item.id === 'expenses';
    }
    if (user?.role === 'INSURANCE_ENTRY') {
      return item.id === 'insurance' || item.id === 'dashboard' || item.id === 'reports';
    }
    if (user?.role === 'GOV_TAX_ENTRY') {
      return item.id === 'government' || item.id === 'pollution' || item.id === 'dashboard' || item.id === 'reports';
    }
    if (user?.role === 'DATA_ENTRY') {
      return item.id === 'electricity' || item.id === 'telecom' || item.id === 'solar' || item.id === 'dashboard';
    }
    if (user?.role === 'ACCOUNT_MANAGEMENT') {
      return item.id === 'electricity' || item.id === 'telecom' || item.id === 'solar' || item.id === 'dashboard' || item.id === 'insurance';
    }
    if (user?.role === 'ACCOUNT_EXECUTIVE_2') {
      return item.id === 'electricity' || item.id === 'telecom' || item.id === 'solar' || item.id === 'dashboard' || item.id === 'reports';
    }

    // Admin only restrictions
    if (item.adminOnly) {
      return user?.role === 'ADMIN';
    }

    return true;
  });

  const helpItemVisible = !(user?.role === 'INSURANCE_ENTRY' || user?.role === 'GOV_TAX_ENTRY');

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
          onClick={onClose}
        />
      )}

      <div 
        className={cn(
          "h-screen bg-white dark:bg-sidebar-bg text-slate-700 dark:text-slate-300 transition-all duration-300 flex flex-col fixed lg:sticky top-0 z-[70] lg:z-50 border-r border-slate-100 dark:border-slate-800 shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
          isCollapsed ? "w-[80px]" : "w-[280px]",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
      {/* Brand Section */}
      <div className={cn(
        "h-20 flex flex-col justify-center px-6 shrink-0 transition-all",
        isCollapsed ? "items-center px-0" : "px-6"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#F97316] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
            <span className="text-white font-black text-lg">N</span>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-slate-900 leading-none tracking-tight">Neoteric</h1>
            </div>
          )}
        </div>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              if (window.innerWidth < 1024 && onClose) onClose();
            }}
            className={cn(
              "w-full flex items-center h-11 px-3 rounded-xl transition-all duration-200 group relative mb-1",
              activeTab === item.id 
                ? "text-orange-600 bg-orange-50/50" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/80"
            )}
          >
            {/* Active Indicator Line */}
            {activeTab === item.id && (
              <motion.div 
                layoutId="active-nav-line"
                className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-l-full shadow-[0_0_12px_rgba(249,115,22,0.4)]"
              />
            )}

            <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", activeTab === item.id ? "text-orange-500" : "text-slate-400 group-hover:text-slate-600")} />
            {!isCollapsed && (
              <span className={cn("ml-3 text-[13px] tracking-tight transition-all", activeTab === item.id ? "font-bold" : "font-medium")}>
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Profile Section */}
      <div className="mt-auto border-t border-slate-50 dark:border-slate-800 p-4 shrink-0">
        <div className={cn(
          "flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-800",
          isCollapsed && "justify-center p-2"
        )}>
          <div className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 shadow-sm relative overflow-hidden group shrink-0">
            <User className="w-5 h-5 transition-transform group-hover:scale-110" />
            {isCollapsed && (
              <button 
                onClick={() => setIsCollapsed(false)}
                className="absolute inset-0 bg-primary/10 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-primary"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-slate-900 truncate leading-none uppercase tracking-tight">{user?.name || 'GUEST USER'}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 opacity-70">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          )}

          {!isCollapsed && (
             <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors bg-white rounded-lg border border-slate-100 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {!isCollapsed && (
          <button
            onClick={logout}
            className="w-full h-10 flex items-center justify-center gap-2 mt-3 text-red-500 text-[11px] font-bold uppercase tracking-wider hover:bg-red-50 rounded-xl transition-all group"
          >
            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Sign Out
          </button>
        )}
      </div>
      </div>
    </>
  );
};
