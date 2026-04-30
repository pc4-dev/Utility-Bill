import React, { useState, useEffect } from 'react';
import { Bill } from '../types';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Smartphone, 
  Building2, 
  ArrowRight,
  Loader2,
  ShieldCheck,
  ChevronRight,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency, formatDateDisplay } from '../utils';
import { api } from '../services/api';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  onPaymentSuccess: (bill: Bill) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  bill, 
  onPaymentSuccess 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    bank: '',
    mode: '',
    transactionRef: ''
  });

  useEffect(() => {
    if (bill) {
      setFormData(prev => ({
        ...prev,
        amount: (bill.amount ?? 0).toString(),
        bank: bill.bankName || '',
        transactionRef: bill.bankReferenceNumber || bill.upiReference || bill.chequeNumber || ''
      }));
    }
  }, [bill]);

  if (!bill) return null;

  const banks = [
    'HDFC Bank',
    'ICICI Bank',
    'State Bank of India (SBI)',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'Punjab National Bank',
    'Bank of Baroda',
    'Union Bank of India',
    'Canara Bank',
    'Others'
  ];

  const modes = [
    'UPI (Google Pay/PhonePe/Paytm)',
    'Net Banking',
    'Internet Banking',
    'Credit/Debit Card',
    'Cheque',
    'Cash',
    'Challan',
    'Others'
  ];

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || Number(formData.amount) === 0) {
      setErrorMessage('Please enter a valid non-zero amount');
      return;
    }
    if (!formData.paymentDate) {
      setErrorMessage('Please select a payment date');
      return;
    }
    if (!formData.bank) {
      setErrorMessage('Please select a bank');
      return;
    }
    if (!formData.mode) {
      setErrorMessage('Please select a payment mode');
      return;
    }
    if (!formData.transactionRef) {
      setErrorMessage('Please enter a transaction reference');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const updatedBill = {
        ...bill,
        status: 'Payment Confirmed' as const,
        paymentDate: formData.paymentDate,
        paidAmount: Number(formData.amount),
        modeOfPayment: formData.mode,
        bankName: formData.bank,
        bankReferenceNumber: formData.transactionRef,
        notes: `${bill.notes || ''}\nPayment of ${formData.amount} via ${formData.mode} (${formData.bank}) Ref: ${formData.transactionRef}`.trim()
      };

      await onPaymentSuccess(updatedBill);
      setPaymentStatus('success');
      
      setTimeout(() => {
        onClose();
        setTimeout(() => {
          setPaymentStatus('idle');
          setFormData({
            amount: (bill.amount ?? 0).toString(),
            paymentDate: new Date().toISOString().split('T')[0],
            bank: '',
            mode: '',
            transactionRef: ''
          });
        }, 500);
      }, 2500);
    } catch (err: any) {
      setPaymentStatus('error');
      setErrorMessage(err.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isProcessing ? undefined : onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
          >
            {paymentStatus === 'success' ? (
              <div className="p-12 text-center">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle2 className="w-10 h-10" />
                </motion.div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Payment Confirmed!</h2>
                <p className="text-gray-500 font-medium">Your payment details have been recorded successfully.</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                  <div>
                    <h2 className="text-lg font-black text-gray-900">Payment Details</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Enter manual payment information</p>
                  </div>
                  {!isProcessing && (
                    <button 
                      onClick={onClose}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <form onSubmit={handlePayment} className="p-6 space-y-5">
                  {/* Bill Summary Mini */}
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-orange-400 uppercase leading-none mb-1">{bill.utilityType}</p>
                        <p className="text-xs font-bold text-gray-900 leading-none">{bill.propertyName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Due Amount</p>
                      <p className="text-sm font-black text-gray-900 leading-none">{formatCurrency(bill.amount)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                        <input 
                          type="number"
                          className="w-full pl-7 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                          value={formData.amount}
                          onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Payment Date</label>
                      <input 
                        type="date"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        value={formData.paymentDate}
                        onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Select Bank</label>
                      <select 
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                        value={formData.bank}
                        onChange={(e) => setFormData({...formData, bank: e.target.value})}
                      >
                        <option value="">Choose Bank</option>
                        {banks.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Select Mode</label>
                      <select 
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                        value={formData.mode}
                        onChange={(e) => setFormData({...formData, mode: e.target.value})}
                      >
                        <option value="">Choose Mode</option>
                        {modes.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Transaction Ref</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text"
                        placeholder="Enter Transaction ID / Reference No."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        value={formData.transactionRef}
                        onChange={(e) => setFormData({...formData, transactionRef: e.target.value})}
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p className="text-[11px] font-bold">{errorMessage}</p>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[12px] flex items-center justify-center gap-2 transition-all shadow-xl",
                        isProcessing 
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                          : "bg-primary hover:bg-primary-dark text-white shadow-primary/20 hover:-translate-y-0.5"
                      )}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          Confirm Payment
                          <ShieldCheck className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    This will mark the bill as payment confirmed
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
