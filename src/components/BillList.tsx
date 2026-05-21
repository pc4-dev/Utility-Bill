import React, { useMemo } from 'react';
import { Bill, BillStatus } from '../types';
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  getSortedRowModel, 
  SortingState,
  getPaginationRowModel
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SearchX, 
  MoreVertical, 
  Eye, 
  Edit2, 
  Trash2, 
  Download, 
  CheckCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Skeleton } from './ui/Skeleton';
import { cn, formatCurrency } from '../utils';
import { toast } from 'react-hot-toast';

interface BillListProps {
  bills: Bill[];
  onEdit: (bill: Bill) => void;
  onView: (bill: Bill) => void;
  onMarkPaid: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
  onVerify?: (bill: Bill) => void;
  onApprove?: (bill: Bill) => void;
  onInitiatePayment?: (bill: Bill) => void;
  onConfirmPayment?: (bill: Bill) => void;
  isLoading?: boolean;
}

const StatusBadge = ({ status }: { status?: BillStatus }) => {
  const getStatusStyles = (s?: string) => {
    const normalized = s?.toUpperCase() || '';
    if (normalized.includes('PAID') || normalized === 'COMPLETED' || normalized === 'TALLY ENTRY' || normalized === 'PAYMENT CONFIRMED') 
      return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
    if (normalized.includes('PENDING') || normalized === 'IN PROGRESS' || normalized === 'PAYMENT INITIATED') 
      return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
    if (normalized === 'OVERDUE') 
      return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800';
    if (normalized === 'VERIFIED' || normalized === 'APPROVED')
      return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
    return 'bg-gray-50 text-gray-700 border-gray-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  };

  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
      getStatusStyles(status)
    )}>
      {status || 'Unknown'}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const getPriorityStyles = (p: string) => {
    const normalized = p.toUpperCase();
    if (normalized === 'HIGH' || normalized === 'URGENT') return 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400';
    if (normalized === 'NORMAL') return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400';
    return 'bg-gray-50 text-gray-500 dark:bg-slate-800 dark:text-slate-400';
  };

  return (
    <span className={cn(
      "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight",
      getPriorityStyles(priority)
    )}>
      {priority}
    </span>
  );
};

export const BillList: React.FC<BillListProps> = ({ 
  bills, 
  onEdit, 
  onView, 
  onMarkPaid, 
  onDelete,
  onVerify,
  onApprove,
  onInitiatePayment,
  onConfirmPayment,
  isLoading 
}) => {
  const { user } = useAuth();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState({});

  const columns = useMemo(() => [
    {
      accessorKey: 'billId',
      header: 'Bill No',
      cell: ({ row }: any) => <span className="font-mono text-[11px] font-bold text-orange-600">{row.original.billId || (row.original.id || row.original._id)?.slice(-6).toUpperCase()}</span>,
    },
    {
      accessorKey: 'propertyName',
      header: 'Bill Name / Property',
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-text-primary line-clamp-1">{row.original.propertyName}</span>
          <span className="text-[10px] text-text-secondary">{row.original.companyName}</span>
        </div>
      ),
    },
    {
      accessorKey: 'utilityType',
      header: 'Category',
      cell: ({ row }: any) => <span className="text-[10px] font-bold text-gray-500">{row.original.utilityType}</span>,
    },
    {
      accessorKey: 'billDate',
      header: 'Bill Date',
      cell: ({ row }: any) => <span className="text-[11px] text-gray-600">{row.original.billDate || 'N/A'}</span>,
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }: any) => (
        <span className={cn(
          "text-[11px] font-medium",
          row.original.status?.toUpperCase() === 'OVERDUE' ? "text-rose-600 font-black" : "text-gray-600"
        )}>
          {row.original.dueDate || 'N/A'}
        </span>
      ),
    },
    {
      id: 'units',
      header: 'Units (Imp/Exp)',
      cell: ({ row }: any) => {
        const bill = row.original;
        if (bill.utilityType === 'Solar Bill') {
          return (
            <div className="flex flex-col text-[10px]">
              <span className="text-blue-600 font-bold">I: {bill.kwhImportUnits || 0}</span>
              <span className="text-orange-600 font-bold">E: {bill.kwhExportUnits || 0}</span>
            </div>
          );
        }
        if (bill.utilityType === 'Electricity') {
          return <span className="text-[10px] font-bold text-gray-500">{bill.totalUnits || 0} Units</span>;
        }
        if (bill.utilityType === 'Diversion Tax (RD)') {
          return <span className="text-[10px] font-bold text-orange-600">₹{(bill.diversionTaxAmount || 0).toLocaleString()}</span>;
        }
        return <span className="text-[10px] text-gray-400">-</span>;
      }
    },
    {
      accessorKey: 'amount',
      header: ({ column }: any) => (
        <button className="flex items-center gap-1 hover:text-orange-600 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Amount <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: ({ row }: any) => (
        <span className={cn(
          "text-xs font-black transition-colors",
          (row.original.amount || 0) < 0 ? "text-red-600 dark:text-red-400" : "text-text-primary"
        )}>
          {formatCurrency(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }: any) => <PriorityBadge priority={row.original.priority || 'Normal'} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }: any) => {
        const bill = row.original;
        const [isOpen, setIsOpen] = React.useState(false);

        return (
          <div className="relative flex justify-end">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-400 hover:text-orange-600"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {isOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden py-1"
                  >
                    <button onClick={() => { onView(bill); setIsOpen(false); }} className="w-full px-4 py-2 text-left text-[11px] font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5" /> View Details
                    </button>
                    <button onClick={() => { onEdit(bill); setIsOpen(false); }} className="w-full px-4 py-2 text-left text-[11px] font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2">
                      <Edit2 className="w-3.5 h-3.5" /> Edit Record
                    </button>
                    <button 
                      onClick={() => { 
                        if (bill.fileUrl) {
                          window.open(bill.fileUrl, '_blank');
                        } else {
                          toast.error('No document attached');
                        }
                        setIsOpen(false); 
                      }} 
                      className="w-full px-4 py-2 text-left text-[11px] font-bold text-gray-600 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </button>
                    {!['Paid', 'PAID', 'COMPLETED'].includes(bill.status) && (
                      <button onClick={() => { onMarkPaid(bill); setIsOpen(false); }} className="w-full px-4 py-2 text-left text-[11px] font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5" /> Mark as Paid
                      </button>
                    )}
                    <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />
                    <button onClick={() => { onDelete(bill); setIsOpen(false); }} className="w-full px-4 py-2 text-left text-[11px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5" /> Delete Bill
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        );
      }
    }
  ], [onEdit, onView, onMarkPaid, onDelete, user]);

  const table = useReactTable({
    data: bills,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } }
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-50 dark:border-slate-800 bg-gray-50/30">
          <Skeleton className="h-6 w-32 rounded ml-2" />
        </div>
        <div className="p-0">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 dark:border-slate-800 last:border-0">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white dark:bg-slate-900 p-16 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 flex flex-col items-center justify-center text-center transition-colors shadow-sm"
      >
        <div className="w-16 h-16 bg-orange-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-orange-400 mb-4 transition-colors">
          <SearchX className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-text-primary tracking-tight">No records found</h3>
        <p className="text-gray-400 text-xs mt-2 max-w-xs font-medium">
          We couldn't find any bills matching your selection. Try adjusting your filters or adding a new record.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-20">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-gray-50/80 dark:bg-slate-800/80 backdrop-blur-md transition-colors">
                  {headerGroup.headers.map((header) => (
                    <th 
                      key={header.id}
                      className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 transition-colors"
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr 
                  key={row.id} 
                  onClick={() => onView(row.original)}
                  className="group hover:bg-orange-50/30 dark:hover:bg-orange-900/10 cursor-pointer border-b border-gray-50 dark:border-slate-800/50 last:border-0 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-3 transition-colors">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800">
            <div className="text-[11px] font-bold text-gray-400">
              Showing <span className="text-text-primary">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> to <span className="text-text-primary">{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, bills.length)}</span> of <span className="text-text-primary">{bills.length}</span> records
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => table.previousPage()} 
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(table.getPageCount(), 5) }, (_, i) => (
                  <button 
                    key={i}
                    onClick={() => table.setPageIndex(i)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-[11px] font-black transition-all",
                      table.getState().pagination.pageIndex === i 
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                        : "text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => table.nextPage()} 
                disabled={!table.getCanNextPage()}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
