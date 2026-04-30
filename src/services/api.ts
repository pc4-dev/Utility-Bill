import { Bill, User, Project, AppNotification, BillType } from '../types';

const API_BASE = '/api';

const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> => {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err) {
    if (retries > 0 && err instanceof TypeError && err.message === 'Failed to fetch') {
      console.warn(`Fetch failed for ${url}, retrying in ${backoff}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      console.error(`Final fetch failure for ${url}:`, err);
    }
    throw err;
  }
};

const handleResponse = async (res: Response, defaultError: string) => {
  if (!res.ok) {
    let text = '';
    try {
      text = await res.text();
    } catch (e) {
      text = 'Could not read response text';
    }
    
    let errorMessage = defaultError;
    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.error || errorData.message || defaultError;
    } catch (e) {
      // If not JSON, use status text or a snippet of the response
      if (text.includes('<!doctype html>') || text.includes('<html') || text.includes('__cookie_check')) {
        errorMessage = "Session verification required by the platform. Please refresh the page or try again in a few seconds.";
      } else {
        errorMessage = `${defaultError} (${res.status} ${res.statusText}): ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`;
      }
    }
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    throw error;
  }
  
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await res.text();
    
    // Check if this is the platform's cookie check page
    if (text.includes('<!doctype html>') || text.includes('<html') || text.includes('__cookie_check')) {
      console.warn('Redirected to cookie check page. Attempting session refresh...');
      throw new Error("SESSION_REQUIRED: The platform requires session verification. Please try your request again.");
    }

    console.error('Non-JSON response from:', res.url, 'Status:', res.status, 'Content-Type:', contentType);
    throw new Error(`Server returned non-JSON response (${res.status}) from ${res.url}. Received: ${text.slice(0, 100)}...`);
  }
  
  return res.json();
};

export const api = {
  // Session helper
  ensureSession: async (): Promise<void> => {
    try {
      await fetch('/api/health', { credentials: 'include' });
    } catch (e) {
      console.warn('Failed to pre-verify session:', e);
    }
  },
  // Bills
  getBills: async (): Promise<Bill[]> => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/bills`, { credentials: 'include' });
      return handleResponse(res, 'Failed to fetch bills');
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        console.error('Network Error: Could not connect to the server at /api/bills. Is the backend running?');
      }
      throw err;
    }
  },

  getBillById: async (id: string | number): Promise<Bill> => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/bills/${id}`, { credentials: 'include' });
      return handleResponse(res, 'Failed to fetch bill details');
    } catch (err) {
      console.error('Fetch bill by id error:', err);
      throw err;
    }
  },

  getDashboardSummary: async (categories?: string[]): Promise<any> => {
    try {
      const url = categories ? `${API_BASE}/dashboard/summary?categories=${categories.join(',')}` : `${API_BASE}/dashboard/summary`;
      const res = await fetchWithRetry(url, { credentials: 'include' });
      return handleResponse(res, 'Failed to fetch dashboard summary');
    } catch (err) {
      console.error('Fetch dashboard summary network error:', err);
      throw err;
    }
  },
  
  saveBill: async (bill: Partial<Bill>): Promise<Bill> => {
    const method = bill.id || bill._id ? 'PUT' : 'POST';
    const url = bill.id || bill._id ? `${API_BASE}/bills/${bill.id || bill._id}` : `${API_BASE}/bills`;
    try {
      const res = await fetchWithRetry(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bill),
        credentials: 'include'
      });
      return handleResponse(res, 'Failed to save bill');
    } catch (err) {
      console.error('Save bill network error:', err);
      throw err;
    }
  },
  
  deleteBill: async (id: string | number): Promise<void> => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/bills/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        await handleResponse(res, 'Failed to delete bill');
      }
    } catch (err) {
      console.error('Delete bill network error:', err);
      throw err;
    }
  },
  
  verifyBill: async (id: string | number, remarks: string, userName?: string, userRole?: string): Promise<Bill> => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/bills/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks, userName, userRole }),
        credentials: 'include'
      });
      return handleResponse(res, 'Failed to verify bill');
    } catch (err) {
      console.error('Verify bill network error:', err);
      throw err;
    }
  },

  approveBill: async (id: string | number, remarks: string, userName?: string, userRole?: string): Promise<Bill> => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/bills/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks, userName, userRole }),
        credentials: 'include'
      });
      return handleResponse(res, 'Failed to approve bill');
    } catch (err) {
      throw err;
    }
  },

  rejectBill: async (id: string | number, remarks: string, userName?: string, userRole?: string): Promise<Bill> => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/bills/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks, userName, userRole }),
        credentials: 'include'
      });
      return handleResponse(res, 'Failed to reject bill');
    } catch (err) {
      throw err;
    }
  },

  initiatePayment: async (id: string | number, remarks: string, userName?: string, userRole?: string, proofUrl?: string, proofName?: string): Promise<Bill> => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/bills/${id}/initiate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks, userName, userRole, proofUrl, proofName }),
        credentials: 'include'
      });
      return handleResponse(res, 'Failed to initiate payment');
    } catch (err) {
      throw err;
    }
  },

  confirmPayment: async (
    id: string | number, 
    remarks: string, 
    userName?: string, 
    userRole?: string,
    paymentDate?: string,
    bankName?: string,
    upiMode?: string,
    upiReference?: string,
    proofUrl?: string,
    proofName?: string,
    amount?: number
  ): Promise<Bill> => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/bills/${id}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          remarks, 
          userName, 
          userRole, 
          paymentDate,
          bankName,
          upiMode,
          upiReference,
          proofUrl,
          proofName,
          amount
        }),
        credentials: 'include'
      });
      return handleResponse(res, 'Failed to confirm payment');
    } catch (err) {
      throw err;
    }
  },

  checkDuplicate: async (billData: any, isPublic: boolean = false): Promise<{ duplicate: boolean, message?: string }> => {
    const url = isPublic ? `${API_BASE}/public/bills/check-duplicate` : `${API_BASE}/bills/check-duplicate`;
    try {
      const res = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData),
        credentials: 'include'
      });
      return handleResponse(res, 'Failed to check for duplicate');
    } catch (err) {
      console.error('Check duplicate network error:', err);
      return { duplicate: false }; // Fail safe
    }
  },

  // Bill Types
  getBillTypes: async (): Promise<BillType[]> => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/bill-types`, { credentials: 'include' });
      return handleResponse(res, 'Failed to fetch bill types');
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        console.error('Network Error: Could not connect to the server at /api/bill-types. Is the backend running?');
      }
      throw err;
    }
  },

  saveBillType: async (billType: Partial<BillType>): Promise<BillType> => {
    const method = billType.id || billType._id ? 'PUT' : 'POST';
    const url = billType.id || billType._id ? `${API_BASE}/bill-types/${billType.id || billType._id}` : `${API_BASE}/bill-types`;
    const res = await fetchWithRetry(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(billType),
      credentials: 'include'
    });
    return handleResponse(res, 'Failed to save bill type');
  },

  deleteBillType: async (id: string | number): Promise<void> => {
    const res = await fetchWithRetry(`${API_BASE}/bill-types/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      await handleResponse(res, 'Failed to delete bill type');
    }
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const res = await fetchWithRetry(`${API_BASE}/users`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch users');
  },

  saveUser: async (user: Partial<User>): Promise<User> => {
    const method = user.id || user._id ? 'PUT' : 'POST';
    const url = user.id || user._id ? `${API_BASE}/users/${user.id || user._id}` : `${API_BASE}/users`;
    const res = await fetchWithRetry(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
      credentials: 'include'
    });
    return handleResponse(res, 'Failed to save user');
  },

  deleteUser: async (id: string): Promise<void> => {
    const res = await fetchWithRetry(`${API_BASE}/users/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      await handleResponse(res, 'Failed to delete user');
    }
  },

  // Settings
  getSettings: async (): Promise<any> => {
    const res = await fetchWithRetry(`${API_BASE}/settings`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch settings');
  },

  updateSettings: async (settings: any): Promise<any> => {
    const res = await fetchWithRetry(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
      credentials: 'include'
    });
    return handleResponse(res, 'Failed to update settings');
  },

  // Audit Logs
  getAuditLogs: async (): Promise<any[]> => {
    const res = await fetchWithRetry(`${API_BASE}/audit-logs`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch audit logs');
  },

  createAuditLog: async (log: any): Promise<any> => {
    const res = await fetchWithRetry(`${API_BASE}/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
      credentials: 'include'
    });
    return handleResponse(res, 'Failed to create audit log');
  },

  // Backup & Restore
  backupData: async (): Promise<any> => {
    const res = await fetchWithRetry(`${API_BASE}/backup`, { method: 'POST', credentials: 'include' });
    return handleResponse(res, 'Backup failed');
  },

  restoreData: async (data: any): Promise<any> => {
    const res = await fetchWithRetry(`${API_BASE}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    return handleResponse(res, 'Restore failed');
  },

  // Projects
  getProjects: async (): Promise<Project[]> => {
    const res = await fetchWithRetry(`${API_BASE}/projects`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch projects');
  },
  
  saveProject: async (project: Partial<Project>): Promise<Project> => {
    const method = project.id || project._id ? 'PUT' : 'POST';
    const url = project.id || project._id ? `${API_BASE}/projects/${project.id || project._id}` : `${API_BASE}/projects`;
    const res = await fetchWithRetry(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
      credentials: 'include'
    });
    return handleResponse(res, 'Failed to save project');
  },

  deleteProject: async (id: string): Promise<void> => {
    const res = await fetchWithRetry(`${API_BASE}/projects/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      await handleResponse(res, 'Failed to delete project');
    }
  },

  // Login
  login: async (email: string, password: string): Promise<{ user: User, token: string }> => {
    const res = await fetchWithRetry(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    return handleResponse(res, 'Login failed');
  },

  // Reports
  getReportSummary: async (): Promise<any> => {
    const res = await fetchWithRetry(`${API_BASE}/reports/summary`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch summary report');
  },

  getReportMonthly: async (): Promise<any[]> => {
    const res = await fetchWithRetry(`${API_BASE}/reports/monthly`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch monthly report');
  },

  getReportProperty: async (): Promise<any[]> => {
    const res = await fetchWithRetry(`${API_BASE}/reports/property`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch property report');
  },

  getReportUtility: async (): Promise<any[]> => {
    const res = await fetchWithRetry(`${API_BASE}/reports/utility`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch utility report');
  },

  getReportOverdue: async (): Promise<Bill[]> => {
    const res = await fetchWithRetry(`${API_BASE}/reports/overdue`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch overdue report');
  },
  
  getAdvancedReports: async (filters: { 
    month?: string, 
    year?: string, 
    startDate?: string, 
    endDate?: string, 
    category?: string, 
    subcategory?: string,
    documentType?: string,
    status?: string,
    property?: string,
    utilityType?: string
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    const res = await fetchWithRetry(`${API_BASE}/reports/advanced?${queryParams.toString()}`, { credentials: 'include' });
    return handleResponse(res, 'Failed to fetch advanced reports');
  },

  // File Upload
  uploadFiles: async (formData: FormData): Promise<{ files: { url: string, name: string, type: string }[] }> => {
    await api.ensureSession();
    const res = await fetchWithRetry(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    return handleResponse(res, 'Upload failed');
  },

  // Telecom Upload & Extraction
  uploadTelecom: async (formData: FormData): Promise<{ 
    fileUrl: string, 
    fileName: string, 
    mimeType: string, 
    extractedData: any,
    jobId: string
  }> => {
    await api.ensureSession();
    const res = await fetchWithRetry(`${API_BASE}/bills/upload-telecom`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    return handleResponse(res, 'Telecom upload and extraction failed');
  },

  // Government Bill Upload & Extraction
  uploadGovernmentBill: async (formData: FormData): Promise<{ 
    fileUrl: string, 
    fileName: string, 
    mimeType: string, 
    extractedData: any,
    jobId: string
  }> => {
    await api.ensureSession();
    const res = await fetchWithRetry(`${API_BASE}/bills/upload-government`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    return handleResponse(res, 'Government bill upload failed');
  },

  // Electricity Upload & Extraction
  uploadElectricity: async (formData: FormData): Promise<{ 
    fileUrl: string, 
    fileName: string, 
    mimeType: string, 
    extractedData: any,
    jobId: string
  }> => {
    await api.ensureSession();
    const res = await fetchWithRetry(`${API_BASE}/bills/upload-electricity`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    return handleResponse(res, 'Electricity bill upload failed');
  },

  // Solar Upload & Extraction
  uploadSolar: async (formData: FormData): Promise<{ 
    fileUrl: string, 
    fileName: string, 
    mimeType: string, 
    extractedData: any,
    jobId: string
  }> => {
    await api.ensureSession();
    const res = await fetchWithRetry(`${API_BASE}/bills/upload-solar`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    return handleResponse(res, 'Solar bill upload failed');
  },

  // Insurance Upload & Extraction
  uploadInsurance: async (formData: FormData): Promise<{ 
    fileUrl: string, 
    fileName: string, 
    mimeType: string, 
    extractedData: any,
    jobId: string
  }> => {
    await api.ensureSession();
    const res = await fetchWithRetry(`${API_BASE}/bills/upload-insurance`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    return handleResponse(res, 'Insurance document upload failed');
  },

  // Pollution Upload & Extraction
  uploadPollution: async (formData: FormData): Promise<{ 
    fileUrl: string, 
    fileName: string, 
    mimeType: string, 
    extractedData: any,
    jobId: string
  }> => {
    await api.ensureSession();
    const res = await fetchWithRetry(`${API_BASE}/bills/upload-pollution`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    return handleResponse(res, 'Pollution control document upload failed');
  }
};
