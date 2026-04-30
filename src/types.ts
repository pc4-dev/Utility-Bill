export type Role = 'ADMIN' | 'MANAGER' | 'DATA_ENTRY' | 'GOV_TAX_ENTRY' | 'INSURANCE_ENTRY' | 'VERIFIER' | 'APPROVER' | 'ACCOUNT_MANAGEMENT' | 'ACCOUNT_MANAGER' | string;

export interface ModulePermissions {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
}

export interface WorkflowLog {
  stage: string;
  action: string;
  user: string;
  userRole: string;
  timestamp: string;
  remarks?: string;
  proofUrl?: string;
  proofName?: string;
  bankName?: string;
  upiMode?: string;
  upiReference?: string;
  amount?: number;
  paymentDate?: string;
}

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  permissions?: {
    [module: string]: ModulePermissions;
  };
}

export type BillStatus = 'Paid' | 'Pending' | 'Overdue' | 'PAID' | 'PENDING' | 'OVERDUE' | 'Approved' | 'Verified' | 'Payment Initiated' | 'Payment Confirmed' | 'Rejected';

export const WORKFLOW_STATUSES: BillStatus[] = [
  'Paid',
  'Pending',
  'Overdue',
  'Approved',
  'Verified',
  'Payment Initiated',
  'Payment Confirmed',
  'Rejected'
];
export type UtilityType = 
  | 'Electricity' 
  | 'Telecom'
  | 'Water' 
  | 'Solar Bill' 
  | 'Data (Internet)' 
  | 'Landline' 
  | 'Property Tax (MCG)' 
  | 'Diversion Tax (RD)' 
  | 'Pollution Control' 
  | 'CTE'
  | 'CTO'
  | 'Labour Insurance' 
  | 'Asset Insurance' 
  | 'Vehicle Insurance'
  | 'Employee Insurance'
  | 'General Insurance'
  | 'Air Conditioner AMC' 
  | 'Elevator AMC' 
  | 'Waste Management' 
  | 'Pest Control' 
  | 'Fire Safety Audit' 
  | 'Electrical Safety Audit' 
  | 'Mobile Recharge'
  | 'Insurance'
  | 'Other';

export interface Bill {
  id?: string;
  _id?: string;
  billId: string; // Monospace ID
  propertyName: string;
  utilityType: UtilityType;
  customUtilityType?: string;
  month: string;
  year: string;
  companyName: string;
  customCompanyName?: string;
  customPropertyName?: string;
  customOperatorName?: string;
  serviceProvider: string;
  billNumber: string;
  billDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  reminderDate?: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  reminderDays: number;
  ratePerUnit?: number;
  totalUnits?: number;
  baseAmount?: number;
  taxAmount: number;
  depositAmount: number;
  securityAmount?: number;
  fine?: number;
  amount: number; // Total Amount
  status: BillStatus;
  paymentDate?: string; // YYYY-MM-DD
  submissionDateTime?: string; // ISO String for form submission time
  notes?: string;
  category?: 'utility' | 'telecom' | 'insurance' | 'government_tax' | 'government_compliance' | 'other';
  subcategory?: string;
  locationType?: string;
  // Aliases for compatibility
  total_amount?: number;
  project_name?: string;
  bill_type?: string;
  due_date?: string;
  bill_number?: string;
  company_name?: string;
  // Specialized fields
  accountNumber?: string;
  policyNumber?: string;
  policyPeriod?: string;
  entered_by_name?: string;
  assessmentId?: string;
  contractId?: string;
  mobileNumber?: string;
  customerName?: string;
  consumerNumber?: string;
  meterNumber?: string;
  billingPeriod?: string;
  // Electricity specific fields
  energyCharges?: number;
  fppas?: number;
  fixedCharge?: number;
  electricityDuty?: number;
  additionalSD?: number;
  otherCharges?: number;
  monthBillAmount?: number;
  subsidyAmount?: number;
  interestOnSecurityDeposit?: number;
  ccbAdjustment?: number;
  lockCreditRebate?: number;
  rebateIncentive?: number;
  currentMonthBillAmount?: number;
  // Solar specific fields
  kwhImportUnits?: number;
  kwhExportUnits?: number;
  netUnits?: number;
  solarGenerationUnits?: number;
  exportAdjustment?: number;
  netBillPayable?: number;
  totalAmount?: number;
  totalDemandAmount?: number;
  payments?: any[];
  // Shared electricity/solar reading fields
  previousReading?: number;
  currentReading?: number;
  billingDemand?: number;
  maxDemand?: number;
  surcharge?: number;
  fixedCharges?: number; // Aliased for consistency in prompts
  rebate?: number;
  // Telecom specific fields
  phoneNumber?: string;
  operatorName?: string;
  billType?: 'Mobile' | 'Landline' | 'Broadband';
  planName?: string;
  dataUsage?: string;
  callCharges?: number;
  internetCharges?: number;
  // Property Tax (MCG) specific fields
  receiptNumber?: string;
  propertyId?: string;
  ownerName?: string;
  address?: string;
  district?: string;
  state?: string;
  assessmentYear?: string;
  zoneWard?: string;
  rateZone?: string;
  usageType?: string;
  constructionType?: string;
  propertyArea?: string;
  propertyTax?: number;
  educationCess?: number;
  samagraCess?: number;
  urbanTax?: number;
  garbageCharges?: number;
  samekit?: number;
  addSamekit?: number;
  samSwach?: number;
  sewaKar?: number;
  vyapakSwachataKar?: number;
  totalTax?: number;
  penalty?: number;
  advance?: number;
  netAmount?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  pendingAmount?: number;
  modeOfPayment?: string;
  chequeDate?: string;
  chequeNumber?: string;
  chequeBankName?: string;
  upiReference?: string;
  paymentTime?: string;
  // Pollution Control specific fields
  documentType?: string;
  issueDate?: string;
  latitude?: string;
  longitude?: string;
  location?: string;
  khasraNumber?: string;
  consentNumber?: string;
  authority?: string;
  pollutionCategory?: 'Orange' | 'Green' | 'Red';
  projectType?: 'Residential' | 'Industrial';
  constructionDetails?: string;
  capitalInvestment?: number;
  projectArea?: string;
  unitsCount?: string;
  validityFrom?: string;
  validityTo?: string;
  productionCapacity?: string;
  hazardousWaste?: string;
  dgSetDetails?: string;
  stsDetails?: string;
  hazardousWasteDetails?: string;
  complianceConditions?: string;
  // Insurance specific fields
  insurerName?: string;
  insuredName?: string;
  // Vehicle Insurance
  registrationNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  manufacturingYear?: string;
  engineNumber?: string;
  chassisNumber?: string;
  fuelType?: string;
  seatingCapacity?: string;
  idv?: number;
  ownDamagePremium?: number;
  thirdPartyPremium?: number;
  gstAmount?: number;
  packagePremium?: number;
  stampDuty?: number;
  receiptDate?: string;
  receiptAmount?: number;
  paymentMode?: string;
  payingParty?: string;
  // Employee Insurance
  insuredCompanyName?: string;
  numberOfEmployees?: number;
  numberOfDependents?: number;
  natureOfWork?: string;
  netPremium?: number;
  sumInsured?: number;
  coverageType?: string;
  tpaName?: string;
  intermediaryId?: string;
  intermediaryName?: string;
  industryType?: string;
  // General Insurance
  // Diversion Tax (RD) specific fields
  depositorName?: string;
  departmentName?: string;
  purpose?: string;
  challanPeriod?: string;
  TIN?: string;
  URN?: string;
  CRN?: string;
  CIN?: string;
  challanNumber?: string;
  transactionDate?: string;
  transactionTime?: string;
  headOfAccount?: string;
  amountInWords?: string;
  bankName?: string;
  bankReferenceNumber?: string;
  scrollNumber?: string;
  scrollDate?: string;
  transactionDateTime?: string;
  transactionStatus?: string;
  attachments?: {
    url: string;
    name: string;
    type: string;
  }[];
  fileUrl?: string; // Keeping for backward compatibility
  verificationRemarks?: string;
  verificationDate?: string;
  verifiedBy?: string;
  approvalRemarks?: string;
  approvalDate?: string;
  approvedBy?: string;
  paymentInitiationRemarks?: string;
  paymentInitiationDate?: string;
  paymentInitiatedBy?: string;
  paymentInitiationProofUrl?: string;
  paymentInitiationProofName?: string;
  paymentConfirmationRemarks?: string;
  paymentConfirmationDate?: string;
  paymentConfirmedBy?: string;
  paymentConfirmationBankName?: string;
  paymentConfirmationUpiMode?: string;
  paymentConfirmationUpiReference?: string;
  paymentConfirmationProofUrl?: string;
  paymentConfirmationProofName?: string;
  workflowLogs?: WorkflowLog[];
  createdAt?: string;
}

export interface Project {
  id?: string;
  _id?: string;
  name: string;
  code: string;
  type: string;
  status: string;
  annualBudget: number;
  alertThreshold: number;
}

export type NotificationType = 'INFO' | 'WARNING' | 'CRITICAL' | 'Info' | 'Success' | 'Error';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  relatedName: string; // Bill / Project Name
  timestamp: string;
  type: NotificationType;
  read: boolean;
}

export interface BillType {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  icon?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SystemSettings {
  id?: string;
  _id?: string;
  companyName: string;
  gstNumber: string;
  address: string;
  currency: string;
  dateFormat: string;
  financialYear: string;
  timezone: string;
  priorityLevels: string[];
  reminderDays: number;
  largeAmountThreshold: number;
  notifications: {
    email: boolean;
    whatsapp: boolean;
    overdue: boolean;
    upcoming: boolean;
    dailySummary: boolean;
    weeklySummary: boolean;
    upcomingDays: number;
  };
  security: {
    twoFactor: boolean;
    sessionTimeout: string;
  };
  paymentMethods: {
    id?: string;
    _id?: string;
    name: string;
    active: boolean;
  }[];
}

export interface AuditLog {
  id?: string;
  _id?: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
}
