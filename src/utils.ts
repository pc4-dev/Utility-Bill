import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: any, options?: { inLakhs?: boolean }) => {
  const value = (typeof amount === 'number' && !isNaN(amount)) ? amount : 0;
  if (options?.inLakhs) {
    return `₹${(value / 100000).toFixed(2)} Lakhs`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'Paid': return 'text-status-paid bg-status-paid-bg';
    case 'Pending': return 'text-status-pending bg-status-pending-bg';
    case 'Overdue': return 'text-status-overdue bg-status-overdue-bg';
    case 'Payment Confirmed': return 'text-status-confirmed bg-status-confirmed-bg';
    case 'IN_PROCESS': return 'text-status-process bg-status-process-bg';
    case 'Rejected': return 'text-status-rejected bg-status-rejected-bg';
    default: return 'text-text-secondary bg-gray-100';
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Low': return 'text-blue-600 bg-blue-50';
    case 'Normal': return 'text-green-600 bg-green-50';
    case 'High': return 'text-orange-600 bg-orange-50';
    case 'Urgent': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

export const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
};

export const downloadFile = async (url: string, fileName: string) => {
  try {
    // Try to fetch only if it's same-origin to avoid CORS errors
    const isSameOrigin = url.startsWith('/') || url.startsWith(window.location.origin);
    
    if (isSameOrigin) {
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        return;
      }
    }
    
    // Fallback for cross-origin or if fetch fails: open in new tab
    // We use a link element to be more reliable than window.open
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    // If everything fails, at least try window.open as a last resort
    console.warn('Download fallback triggered:', error);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
