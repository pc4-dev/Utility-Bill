import React, { useState, useEffect } from 'react';
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
  User
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
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
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
    { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
  ];

  const filteredItems = menuItems.filter(item => {
    // If user has specific permissions defined for this module, use them
    if (user?.permissions && user.permissions[item.id]) {
      return user.permissions[item.id].view;
    }

    // Role based restrictions (fallback for legacy or predefined roles)
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
      return item.id === 'electricity' || item.id === 'telecom' || item.id === 'solar' || item.id === 'dashboard';
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
          "h-screen bg-sidebar-bg text-slate-700 dark:text-slate-300 transition-all duration-300 flex flex-col fixed lg:sticky top-0 z-[70] lg:z-50 border-r border-slate-100 dark:border-slate-800",
          isCollapsed ? "w-[80px]" : "w-[320px]",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
      {/* Brand Section */}
      <div className="h-24 flex flex-col justify-center px-6 border-b border-slate-50/50 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F97316] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
            <span className="text-white font-black text-xl">N</span>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-xl font-bold text-slate-900 leading-none">Neoteric</h1>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-3 opacity-80 leading-tight">
            Utility Bill Management System
          </p>
        )}
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-orange-200 transition-colors">
        {/* Navigation itemsdirectly without headers or boxes */}
        <div>
          <div className="space-y-1">
            {filteredItems.slice(0, 3).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1024 && onClose) onClose();
                }}
                className={cn(
                  "w-full flex items-center h-12 px-4 rounded-none transition-all duration-200 group relative border-r-4",
                  activeTab === item.id 
                    ? "text-slate-900 border-orange-500 bg-orange-50/30" 
                    : "text-slate-500 hover:text-slate-900 border-transparent hover:bg-slate-50/50"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", activeTab === item.id ? "text-orange-500" : "text-slate-400 group-hover:text-slate-600")} />
                {!isCollapsed && (
                  <span className={cn("ml-3 text-[13px] tracking-tight", activeTab === item.id ? "font-bold" : "font-semibold")}>{item.label}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Second group directly without header */}
        <div>
          <div className="space-y-1">
            {filteredItems.slice(3).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1024 && onClose) onClose();
                }}
                className={cn(
                  "w-full flex items-center h-12 px-4 rounded-none transition-all duration-200 group relative border-r-4",
                  activeTab === item.id 
                    ? "text-slate-900 border-orange-500 bg-orange-50/30" 
                    : "text-slate-500 hover:text-slate-900 border-transparent hover:bg-slate-50/50"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", activeTab === item.id ? "text-orange-500" : "text-slate-400 group-hover:text-slate-600")} />
                {!isCollapsed && (
                  <span className={cn("ml-3 text-[13px] tracking-tight", activeTab === item.id ? "font-bold" : "font-semibold")}>{item.label}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Profile Section */}
      <div className="mt-auto border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 shadow-sm relative overflow-hidden group shrink-0">
            <User className="w-6 h-6 transition-transform group-hover:scale-110" />
            {isCollapsed && (
              <button 
                onClick={() => setIsCollapsed(false)}
                className="absolute inset-0 bg-primary/10 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-primary"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate uppercase tracking-tight">{user?.name || 'GUEST USER'}</p>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-0.5">+91 XXXXX XXXXX</p>
            </div>
          )}

          {!isCollapsed && (
             <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 text-slate-300 hover:text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {!isCollapsed && (
          <button
            onClick={logout}
            className="w-full h-8 flex items-center justify-center gap-2 mt-4 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        )}
      </div>
      </div>
    </>
  );
};
