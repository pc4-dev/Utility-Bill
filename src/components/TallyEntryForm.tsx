import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  FileText, 
  X,
  Save,
  Info,
  Loader2,
  UploadCloud,
  Trash2,
  Check,
  Paperclip,
  AlertCircle,
  IndianRupee,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { Bill } from '../types';

interface TallyEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tallyData: any) => Promise<void>;
  bill: Bill | null;
}

export const TallyEntryForm: React.FC<TallyEntryFormProps> = ({ isOpen, onClose, onSave, bill }) => {
  const [remark, setRemark] = useState('');
  const [proofFile, setProofFile] = useState<{ url: string; name: string; type: string } | null>(null);
  
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMess, setErrorMess] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRemark('');
      setProofFile(null);
      setErrorMess('');
    }
  }, [isOpen]);

  // Handle Ctrl + V global image pastes when open
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const namedFile = new File([file], `screenshot_${Date.now()}.png`, { type: 'image/png' });
            await handleUploadFile(namedFile);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [isOpen]);

  if (!bill) return null;

  const handleUploadFile = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    if (!isImage && !isPdf) {
      setErrorMess('Supported format error. Please attach a valid PDF or Image file.');
      return;
    }

    setErrorMess('');
    setFileLoading(true);

    const formData = new FormData();
    formData.append('files', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.files && data.files.length > 0) {
          setProofFile({
            url: data.files[0].url,
            name: data.files[0].name || file.name,
            type: data.files[0].type || file.type
          });
        } else {
          setErrorMess('Parsing uploaded file info failed.');
        }
      } else {
        setErrorMess('Upload failed. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setErrorMess('Network error occurred during file upload.');
    } finally {
      setFileLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleUploadFile(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await handleUploadFile(file);
    }
  };

  const handleRemoveFile = () => {
    setProofFile(null);
    setErrorMess('');
  };

  const handlePasteLocally = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const namedFile = new File([file], `screenshot_${Date.now()}.png`, { type: 'image/png' });
          await handleUploadFile(namedFile);
          break;
        }
      }
    }
  };

  const validate = () => {
    if (!proofFile) {
      setErrorMess('Please attach a PDF bill/receipt or paste a Tally Screenshot to proceed.');
      return false;
    }
    setErrorMess('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate() && proofFile) {
      setIsSubmitting(true);
      try {
        const tallyPayload = {
          proofUrl: proofFile.url,
          proofName: proofFile.name,
          proofType: proofFile.type,
          remark: remark,
          narration: remark || 'Tally transaction completed with attached voucher proof.',
          ledgerName: 'N/A',
          expenseType: 'N/A',
          paymentMode: 'N/A',
          voucherType: 'Payment',
          referenceNumber: bill.billNumber || 'N/A'
        };
        await onSave(tallyPayload);
        onClose();
      } catch (err) {
        console.error('Save failed:', err);
        setErrorMess('Submission failed. Check network or permissions.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const provider = bill.serviceProvider || bill.insurerName || bill.operatorName || bill.companyName || bill.utilityType || 'N/A';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 15 }}
            className="relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-800 w-full max-w-4xl mx-auto"
            onPaste={handlePasteLocally}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 dark:bg-orange-500/15 flex items-center justify-center text-orange-600">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight">Tally Accounting Entry</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-none">Complete recording and update workflow to Paid</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[80vh] overflow-y-auto no-scrollbar">
              
              {/* Left Side: Form Controls */}
              <div className="lg:col-span-7 p-6 space-y-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* File Upload Zone */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-0.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Tally Proof Document / Screenshot
                      </label>
                      <span className="text-[9px] font-bold text-orange-500/90 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 rounded-full">
                        Drag/Paste Ready
                      </span>
                    </div>
                    
                    {!proofFile ? (
                      <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={cn(
                          "border border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all bg-slate-50/30 dark:bg-slate-800/5 min-h-[140px] relative overflow-hidden group cursor-pointer",
                          isDragActive ? "border-orange-500 bg-orange-50/10 dark:bg-orange-950/5" : "border-slate-200 dark:border-slate-800 hover:border-orange-400/80"
                        )}
                      >
                        <input 
                          type="file" 
                          accept=".pdf,image/*"
                          onChange={handleFileInputChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          id="tally-file-input"
                          disabled={fileLoading}
                        />
                        
                        {fileLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider animate-pulse">Uploading Document...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-orange-500/5 rounded-xl flex items-center justify-center text-orange-600 mb-2.5 group-hover:scale-105 transition-transform duration-200">
                              <UploadCloud className="w-5 h-5" />
                            </div>
                            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                              Click to upload or Drag & drop file
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                              Supports <span className="font-medium">PDF, PNG, JPG</span> or use <span className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-mono font-bold">Ctrl+V</span> to paste screenshots instantly.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Preview Box */
                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-850/20 relative overflow-hidden flex items-center gap-4">
                        
                        {proofFile.type.startsWith('image/') ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-750 flex items-center justify-center shrink-0 shadow-sm relative group">
                            <img 
                              src={proofFile.url} 
                              alt="Tally Screenshot Proof" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-red-500/5 border border-red-500/10 flex flex-col items-center justify-center text-red-500 shrink-0 shadow-sm gap-0.5">
                            <FileText className="w-5 h-5" />
                            <span className="text-[8px] font-extrabold uppercase tracking-widest">PDF</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={proofFile.name}>
                            {proofFile.name}
                          </h4>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Proof attached
                          </p>
                          <div className="flex gap-2 mt-1.5">
                            <button
                              type="button"
                              onClick={() => window.open(proofFile.url, '_blank')}
                              className="text-[9px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline"
                            >
                              Open Doc
                            </button>
                            <label 
                              htmlFor="tally-file-input-change" 
                              className="text-[9px] font-bold text-orange-500 hover:text-orange-600 underline cursor-pointer"
                            >
                              Replace
                            </label>
                            <input 
                              type="file" 
                              accept=".pdf,image/*"
                              onChange={handleFileInputChange}
                              className="hidden"
                              id="tally-file-input-change"
                              disabled={fileLoading}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Remarks - Optional */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-0.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Remarks</label>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Optional</span>
                    </div>
                    
                    <textarea
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-800/10 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all resize-none"
                      placeholder="Write notes, transaction ID, ledger references, or remarks..."
                    />
                  </div>

                  {/* Validation Error Banner */}
                  {errorMess && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-red-500/5 rounded-xl flex items-start gap-2 border border-red-500/10"
                    >
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-[10px] font-bold text-red-600 uppercase tracking-wider leading-none mb-1">Validation Alert</h4>
                        <p className="text-[11px] text-red-500 font-medium leading-normal">{errorMess}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Submission and Action Drawer Buttons */}
                  <div className="flex items-center gap-3 pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting || fileLoading}
                      className="flex-1 h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase tracking-wider text-[11px] rounded-xl shadow-md shadow-orange-500/10 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Complete Tally Entry
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-5 h-11 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Side: Bill Reference Metadata Sheet */}
              <div className="lg:col-span-5 bg-slate-50/50 dark:bg-slate-800/10 p-6 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-850 space-y-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-orange-500/5 rounded-lg flex items-center justify-center text-orange-600">
                    <Info className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Bill Context</h4>
                    <p className="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">Source details inside tally</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Property & Utility Info Badge */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Property & Utility</label>
                    <div className="p-3 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                      <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider leading-none mb-1">{bill.utilityType}</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">{bill.propertyName}</p>
                    </div>
                  </div>

                  {/* Payment Highlight */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Payable Amount</label>
                    <div className="p-3 bg-white dark:bg-slate-905 border border-slate-200/60 dark:border-slate-800/80 rounded-xl flex items-center justify-between">
                      <div className="text-xs text-slate-500 font-medium">To be updated inside Tally:</div>
                      <div className="flex items-center gap-0.5 text-base font-extrabold text-slate-800 dark:text-orange-500">
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>{bill.amount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Grid fields */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 border-t border-slate-100 dark:border-slate-850">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bill Number</label>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-250 font-mono break-all leading-tight">{bill.billNumber || 'N/A'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Provider</label>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-250 truncate leading-tight">{provider}</p>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-red-500">Due Date</label>
                      <p className="text-[11px] font-bold text-red-650 dark:text-red-400 leading-tight">
                        {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bill Cycle</label>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-250 leading-tight">{bill.month} {bill.year}</p>
                    </div>
                  </div>

                  {/* Acc ID Badge */}
                  {(bill.consumerNumber || bill.accountNumber) && (
                    <div className="p-2.5 bg-slate-100/50 dark:bg-slate-800/20 rounded-lg border border-slate-200/30 dark:border-slate-800 border-dashed">
                      <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5 block">Account Ref</label>
                      <p className="text-[10px] font-semibold font-mono text-slate-600 dark:text-slate-350">
                        {bill.consumerNumber || bill.accountNumber}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footnote instruction */}
                <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 leading-normal italic">
                    "This action completes the accounting trail, recording payment proof and logging the transaction to the database."
                  </p>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
