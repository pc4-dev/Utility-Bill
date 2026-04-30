import React, { useState } from 'react';
import { Bill } from '../types';
import { X, CheckCircle2, Loader2, AlertCircle, Upload, FileText, File, History, Building2, ShieldCheck, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface WorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    remarks: string, 
    proofFile?: File, 
    extraDetails?: { 
      bankName?: string; 
      upiMode?: string; 
      upiReference?: string; 
      amount?: number;
      paymentDate?: string;
    }
  ) => Promise<void>;
  onReject?: (remarks: string) => Promise<void>;
  bill: Bill | null;
  actionType: 'verify' | 'approve' | 'initiate' | 'confirm';
  title?: string;
}

export const WorkflowModal: React.FC<WorkflowModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onReject,
  bill,
  actionType,
  title
}) => {
  const [remarks, setRemarks] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState('');
  const [upiMode, setUpiMode] = useState('');
  const [upiReference, setUpiReference] = useState('');
  const [amount, setAmount] = useState(bill?.amount?.toString() || '0');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bill) return null;

  const config = {
    verify: {
      title: 'Verify Bill',
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
      color: 'green',
      buttonText: 'Confirm Verification',
      submittingText: 'Verifying...'
    },
    approve: {
      title: 'Approve Bill',
      icon: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
      color: 'blue',
      buttonText: 'Confirm Approval',
      submittingText: 'Approving...'
    },
    initiate: {
      title: 'Initiate Payment',
      icon: <CheckCircle2 className="w-5 h-5 text-orange-600" />,
      color: 'orange',
      buttonText: 'Initiate Payment',
      submittingText: 'Initiating...'
    },
    confirm: {
      title: 'Confirm Payment',
      icon: <CheckCircle2 className="w-5 h-5 text-purple-600" />,
      color: 'purple',
      buttonText: 'Confirm Payment',
      submittingText: 'Confirming...'
    }
  }[actionType];

  const banks = [
    'HDFC Bank',
    'ICICI Bank',
    'State Bank of India (SBI)',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'IDFC First Bank',
    'IndusInd Bank',
    'YES Bank',
    'Other'
  ];

  const upiModes = [
    'Net Banking',
    'IMPS / NEFT / RTGS',
    'PhonePe (UPI)',
    'Google Pay (GPay)',
    'Paytm (UPI)',
    'WhatsApp Pay',
    'Bank App UPI',
    'Credit Card',
    'Debit Card',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) {
      setError(`Please provide ${actionType} remarks`);
      return;
    }

    if ((actionType === 'initiate' || actionType === 'confirm') && !proofFile) {
      setError("Please upload a payment proof (screenshot/PDF)");
      return;
    }

    if (actionType === 'confirm') {
      if (!amount || Number(amount) === 0) {
        setError("Please enter a valid amount");
        return;
      }
      if (!paymentDate) {
        setError("Please select a payment date");
        return;
      }
      if (!bankName) {
        setError("Please select a bank");
        return;
      }
      if (!upiMode) {
        setError("Please select a payment mode");
        return;
      }
      if (!upiReference) {
        setError("Please enter transaction reference number");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(
        remarks, 
        proofFile || undefined, 
        actionType === 'confirm' ? { bankName, upiMode, upiReference, amount: Number(amount), paymentDate } : undefined
      );
      onClose();
      setRemarks('');
      setProofFile(null);
      setBankName('');
      setUpiMode('');
      setUpiReference('');
      setAmount((bill?.amount || 0).toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : `${actionType} failed`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!remarks.trim()) {
      setError("Please provide rejection remarks");
      return;
    }

    if (!onReject) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onReject(remarks);
      onClose();
      setRemarks('');
      setProofFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800"
          >
            <div className="p-6 border-b border-gray-50 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  actionType === 'verify' ? "bg-green-50 dark:bg-green-900/20" :
                  actionType === 'approve' ? "bg-blue-50 dark:bg-blue-900/20" :
                  actionType === 'initiate' ? "bg-orange-50 dark:bg-orange-900/20" :
                  "bg-purple-50 dark:bg-purple-900/20"
                )}>
                  {config.icon}
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                    {title || config.title}
                  </h2>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                    {bill.consumerNumber && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">CNo:</span>
                        <span className="text-[9px] font-black text-gray-700 dark:text-gray-200 uppercase">{bill.consumerNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Proj:</span>
                      <span className="text-[9px] font-black text-gray-700 dark:text-gray-200 uppercase">{bill.propertyName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Due:</span>
                      <span className="text-[9px] font-black text-gray-700 dark:text-gray-200 uppercase">{bill.dueDate ? new Date(bill.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Date:</span>
                      <span className="text-[9px] font-black text-gray-700 dark:text-gray-200 uppercase">{bill.billDate ? new Date(bill.billDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto no-scrollbar bg-white dark:bg-slate-900">
              {actionType === 'confirm' && (
                <div className="mx-6 mt-6 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/50 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-orange-600 uppercase tracking-[0.2em] leading-none mb-1">{bill.utilityType}</p>
                      <p className="text-sm font-black text-gray-900 dark:text-white leading-none">{bill.propertyName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Due Amount</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white leading-none">₹{bill.amount.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {actionType === 'confirm' && bill.paymentInitiationRemarks && (
                <div className="mx-6 mt-6 p-4 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-2xl">
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <History className="w-3 h-3" />
                    Initiation Details
                  </p>
                  <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400 leading-relaxed italic">
                    "{bill.paymentInitiationRemarks}"
                  </p>
                  <div className="mt-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    <span>{bill.paymentInitiatedBy}</span>
                    <span>{bill.paymentInitiationDate ? new Date(bill.paymentInitiationDate).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {actionType === 'confirm' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">
                          Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                          <input
                            type="number"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm font-black text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">
                          Payment Date
                        </label>
                        <input
                          type="date"
                          required
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">
                          Select Bank
                        </label>
                        <select
                          required
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all"
                        >
                          <option value="">Choose Bank</option>
                          {banks.map(bank => (
                            <option key={bank} value={bank}>{bank}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">
                          Payment Method
                        </label>
                        <select
                          required
                          value={upiMode}
                          onChange={(e) => setUpiMode(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all"
                        >
                          <option value="">Choose Method</option>
                          {upiModes.map(mode => (
                            <option key={mode} value={mode}>{mode}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">
                        Transaction Ref / ID
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          required
                          type="text"
                          value={upiReference}
                          onChange={(e) => setUpiReference(e.target.value)}
                          placeholder="Enter Transaction ID or Reference"
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">
                  {actionType} Remarks / Notes
                </label>
                <textarea
                  required
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={`Enter details about the ${actionType} process...`}
                  className={cn(
                    "w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 transition-all min-h-[120px] resize-none",
                    actionType === 'verify' ? "focus:ring-green-500/10 focus:border-green-500" :
                    actionType === 'approve' ? "focus:ring-blue-500/10 focus:border-blue-500" :
                    actionType === 'initiate' ? "focus:ring-orange-500/10 focus:border-orange-500" :
                    "focus:ring-purple-500/10 focus:border-purple-500"
                  )}
                />
              </div>

              {(actionType === 'initiate' || actionType === 'confirm') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">
                    Upload Payment Proof (Required)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="payment-proof"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setProofFile(file);
                      }}
                    />
                    <label
                      htmlFor="payment-proof"
                      className={cn(
                        "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
                        proofFile 
                          ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800" 
                          : "bg-gray-50 border-gray-100 dark:bg-slate-800 dark:border-slate-800 hover:bg-gray-100/50"
                      )}
                    >
                      {proofFile ? (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm">
                            {proofFile.type.includes('pdf') ? (
                              <FileText className="w-6 h-6 text-red-500" />
                            ) : (
                              <File className="w-6 h-6 text-blue-500" />
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-black text-gray-900 dark:text-white truncate max-w-[200px]">
                              {proofFile.name}
                            </p>
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest leading-none mt-1">
                              File Ready for Upload
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                            Upload Screenshot or PDF
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium mt-1">
                            Any proof needs to be provided
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 border border-gray-100 dark:border-slate-800 text-gray-500 font-bold uppercase tracking-widest text-[11px] rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                {actionType === 'approve' && onReject && (
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-4 bg-red-600 text-white font-black uppercase tracking-widest text-[12px] rounded-2xl transition-all shadow-xl shadow-red-500/25 hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Reject Bill
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 px-6 py-4 text-white font-black uppercase tracking-widest text-[12px] rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50",
                    actionType === 'verify' ? "bg-green-600 hover:bg-green-700 shadow-green-500/25" :
                    actionType === 'approve' ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25" :
                    actionType === 'initiate' ? "bg-orange-600 hover:bg-orange-700 shadow-orange-500/25" :
                    "bg-primary hover:bg-primary/90 shadow-primary/25"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {config.submittingText}
                    </>
                  ) : (
                    <>
                      {actionType === 'confirm' ? 'Confirm Payment' : config.buttonText}
                      {actionType === 'confirm' ? <ShieldCheck className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </>
                  )}
                </button>
              </div>

              {actionType === 'confirm' && (
                <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">
                  THIS WILL MARK THE BILL AS PAYMENT CONFIRMED
                </p>
              )}
            </form>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
