import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import { createServer } from "http";
import { Server } from "socket.io";
import { addDays, format, parseISO, isBefore, isAfter, startOfDay } from 'date-fns';
import fetch from "node-fetch";
import cron from "node-cron";

dotenv.config();

const WEBHOOK_URL = process.env.UTILITY_BILL_WEBHOOK_URL || "https://neoteric.cloud/webhook-test/utility-bill";
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

async function sendSlackNotification(action: string, bill: any, userDetails?: { name?: string, role?: string }) {
  if (!SLACK_WEBHOOK_URL) return;

  const isReminder = action === 'due_reminder';
  const isNew = action.includes('created');
  const isUpdate = action.includes('updated');
  const isDelete = action.includes('deleted');
  const isWorkflow = [
    'bill_verified', 
    'bill_approved', 
    'bill_rejected', 
    'payment_initiated', 
    'payment_confirmed', 
    'tally_entry'
  ].includes(action);
  
  let emoji = '🚀';
  let title = 'Notification';
  
  if (isReminder) {
    emoji = '⏰';
    title = 'Payment Due Reminder';
  } else if (isNew) {
    emoji = '🚀';
    title = 'New Bill Submitted';
  } else if (isUpdate) {
    emoji = '📝';
    title = 'Bill Updated';
  } else if (isDelete) {
    emoji = '🗑️';
    title = 'Bill Deleted';
  } else if (isWorkflow) {
    emoji = '⚙️';
    title = 'Workflow Status Updated';
    if (action === 'bill_verified') emoji = '✅';
    if (action === 'bill_approved') emoji = '🎯';
    if (action === 'bill_rejected') emoji = '❌';
    if (action === 'payment_initiated') emoji = '💸';
    if (action === 'payment_confirmed') emoji = '💰';
    if (action === 'tally_entry') emoji = '📊';
  }

  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const fileUrl = bill.fileUrl || (bill.attachments && bill.attachments[0]?.url);
  const amountStr = (bill.subcategory === 'pollution_control' || bill.utilityType === 'Pollution Control' || bill.utilityType === 'CTE' || bill.utilityType === 'CTO') 
    ? `₹${bill.amount?.toLocaleString('en-IN') || 0} Lakhs` 
    : `₹${bill.amount?.toLocaleString('en-IN') || 0}`;

  // Resolve user info and remarks
  let userName = 'System';
  let userRole = 'N/A';
  let remarks = '';

  if (userDetails && userDetails.name) {
    userName = userDetails.name;
    userRole = userDetails.role || 'N/A';
  } else if (bill.workflowLogs && bill.workflowLogs.length > 0) {
    const lastLog = bill.workflowLogs[bill.workflowLogs.length - 1];
    userName = lastLog.user || 'System';
    userRole = lastLog.userRole || 'N/A';
    remarks = lastLog.remarks || '';
  }

  const blocks: any[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *${title}*`
      }
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Bill Number:*\n${bill.billNumber || bill.billId || 'N/A'}` },
        { type: "mrkdwn", text: `🏢 *Property:*\n${bill.propertyName || 'N/A'}` },
        { type: "mrkdwn", text: `⚡ *Type:*\n${bill.utilityType || 'N/A'}` },
        { type: "mrkdwn", text: `💰 *Amount:*\n${amountStr}` },
        { type: "mrkdwn", text: `📅 *Due Date:*\n${bill.dueDate || 'N/A'}` },
        { type: "mrkdwn", text: `📌 *Current Status:*\n*${bill.status || 'Pending'}*` }
      ]
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `👤 *Updated By:*\n${userName} (${userRole})` }
      ]
    }
  ];

  if (remarks) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `💬 *Remarks:*\n${remarks}`
      }
    });
  }

  if (fileUrl) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `📎 *Document:* <${fileUrl}|View Document>`
      }
    });
  }

  if (isReminder) {
    blocks.push({
      type: "context",
      elements: [
        { type: "mrkdwn", text: "🚩 *Note:* This bill is due soon. Please ensure timely payment." }
      ]
    });
  } else {
    blocks.push({
      type: "context",
      elements: [
        { type: "mrkdwn", text: `🕒 *Action Time:* ${time}` }
      ]
    });
  }

  const message = { blocks };

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message)
    });
    console.log(`✅ Slack message sent for [${action}] - ${bill.billId || bill.billNumber}`);
  } catch (err) {
    console.error(`❌ Slack message failed for [${action}]:`, err);
  }
}

async function checkAndSendDueReminders() {
  if (mongoose.connection.readyState !== 1) return;
  
  console.log("🔍 Running scheduled reminder check for all bills...");
  
  try {
    const targetDate = addDays(startOfDay(new Date()), 3);
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    
    // Find all unpaid bills due in 3 days across all modules
    const upcomingBills = await Bill.find({
      dueDate: dateStr,
      status: { $nin: ['Paid', 'Approved', 'PAID', 'PAID_CONFIRMED', 'Payment Confirmed', 'SUCCESS'] } 
    });

    console.log(`📡 Found ${upcomingBills.length} bills due on ${dateStr}`);

    for (const bill of upcomingBills) {
      await triggerWebhook('due_reminder', bill);
      // Wait a bit between notifications to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (err) {
    console.error("❌ Error during due date reminder check:", err);
  }
}

async function triggerWebhook(action: string, data: any, userDetails?: { name?: string, role?: string }) {
  // Always trigger Slack if configured
  sendSlackNotification(action, data, userDetails);

  if (!WEBHOOK_URL) return;
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        timestamp: new Date().toISOString(),
        data
      }),
    });
    console.log(`✅ Webhook triggered [${action}]: Status ${response.status}`);
  } catch (err) {
    console.error(`❌ Webhook failed [${action}]:`, err);
  }
}

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(file: Express.Multer.File, folder: string = "utility-bills") {
  const isPdf = file.mimetype === 'application/pdf' || 
                file.originalname.toLowerCase().endsWith('.pdf');
  
  const uploadOptions: any = {
    folder: folder,
    resource_type: "auto", // "auto" is generally best as it detects image/video/raw
  };

  // If we want to allow PDFs to be viewed easily, sometimes "raw" is better or "image" for page rendering.
  // Using "auto" usually defaults PDFs to "image" or "raw" depending on size or account settings.
  // To ensure PDFs are handled as documents, we can force resource_type auto and let Cloudinary decide.
  
  try {
    const result = await cloudinary.uploader.upload(file.path, uploadOptions);
    // Delete local file after successful upload
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return {
      url: result.secure_url,
      name: file.originalname,
      type: file.mimetype
    };
  } catch (error) {
    // Even if upload fails, we should probably cleanup the local file 
    // unless we want to retry. But for this app, cleanup is requested.
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw error;
  }
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

// Socket.IO Connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  
  socket.on("join:dashboard", () => {
    socket.join("dashboard");
    console.log(`Socket ${socket.id} joined dashboard`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Separate OCR Processing Logic (Removed backend OCR to comply with Gemini API rules)
// OCR processing is now handled client-side in the frontend modules.

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsDir));

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn("⚠️ MONGODB_URI is not defined in environment variables. Database features will be unavailable.");
} else {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => {
      console.error("❌ MongoDB connection error:", err);
      console.info("The server will continue to run, but database-dependent routes will return 503.");
    });
}

// Schemas
const AttachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true }
}, { _id: false });

const BillSchema = new mongoose.Schema({
  billId: { type: String, required: true },
  propertyName: { type: String, required: true },
  utilityType: { type: String, required: true },
  month: String,
  year: String,
  companyName: String,
  serviceProvider: String,
  billNumber: String,
  billDate: String,
  dueDate: String,
  reminderDate: String,
  priority: String,
  reminderDays: Number,
  ratePerUnit: Number,
  totalUnits: Number,
  baseAmount: Number,
  taxAmount: Number,
  depositAmount: Number,
  securityAmount: Number,
  fine: Number,
  amount: { type: Number, default: 0 },
  status: { type: String, default: 'Pending' },
  paymentDate: String,
  notes: String,
  locationType: String,
  accountNumber: String,
  policyNumber: String,
  assessmentId: String,
  contractId: String,
  mobileNumber: String,
  customerName: String,
  consumerNumber: String,
  meterNumber: String,
  // Detailed Billing fields (shared)
  energyCharges: Number,
  fixedCharges: Number,
  fixedCharge: Number, // Legacy alias
  electricityDuty: Number,
  surcharge: Number,
  rebate: Number,
  rebateIncentive: Number, // Legacy alias
  fppas: Number,
  additionalSD: Number,
  otherCharges: Number,
  monthBillAmount: Number,
  subsidyAmount: Number,
  interestOnSecurityDeposit: Number,
  ccbAdjustment: Number,
  lockCreditRebate: Number,
  currentMonthBillAmount: Number,
  // Solar specific units
  kwhImportUnits: Number,
  kwhExportUnits: Number,
  netUnits: Number,
  solarGenerationUnits: Number,
  exportAdjustment: Number,
  netBillPayable: Number,
  previousReading: Number,
  currentReading: Number,
  billingDemand: Number,
  maxDemand: Number,
  // Telecom specific fields
  phoneNumber: String,
  operatorName: String,
  billType: String,
  billingPeriod: String,
  planName: String,
  dataUsage: String,
  callCharges: Number,
  internetCharges: Number,
  // Property Tax (MCG) specific fields
  receiptNumber: String,
  propertyId: String,
  ownerName: String,
  address: String,
  assessmentYear: String,
  zoneWard: String,
  rateZone: String,
  usageType: String,
  constructionType: String,
  propertyArea: String,
  propertyTax: Number,
  educationCess: Number,
  samagraCess: Number,
  urbanTax: Number,
  garbageCharges: Number,
  samekit: Number,
  addSamekit: Number,
  samSwach: Number,
  sewaKar: Number,
  vyapakSwachataKar: Number,
  totalTax: Number,
  penalty: Number,
  advance: Number,
  netAmount: Number,
  paidAmount: Number,
  outstandingAmount: Number,
  pendingAmount: Number,
  modeOfPayment: String,
  chequeDate: String,
  chequeNumber: String,
  chequeBankName: String,
  upiReference: String,
  paymentTime: String,
  category: String,
  subcategory: String,
  // Pollution Control specific fields
  documentType: String,
  latitude: String,
  longitude: String,
  location: String,
  khasraNumber: String,
  consentNumber: String,
  authority: String,
  pollutionCategory: String,
  projectType: String,
  constructionDetails: String,
  capitalInvestment: Number,
  projectArea: String,
  unitsCount: String,
  dgSetDetails: String,
  stsDetails: String,
  hazardousWasteDetails: String,
  complianceConditions: String,
  productionCapacity: String,
  validityFrom: String,
  validityTo: String,
  hazardousWaste: String,
  // Insurance specific fields
  insurerName: String,
  insuredName: String,
  registrationNumber: String,
  vehicleMake: String,
  vehicleModel: String,
  manufacturingYear: String,
  engineNumber: String,
  chassisNumber: String,
  fuelType: String,
  seatingCapacity: String,
  idv: Number,
  ownDamagePremium: Number,
  thirdPartyPremium: Number,
  gstAmount: Number,
  packagePremium: Number,
  stampDuty: Number,
  receiptDate: String,
  receiptAmount: Number,
  paymentMode: String,
  payingParty: String,
  insuredCompanyName: String,
  numberOfEmployees: Number,
  numberOfDependents: Number,
  natureOfWork: String,
  netPremium: Number,
  sumInsured: Number,
  coverageType: String,
  tpaName: String,
  policyPeriod: String,
  // Expense specific fields
  expenseTitle: String,
  paidBy: String,
  vendorName: String,
  description: String,
  isPublic: { type: Boolean, default: false },
  // Diversion Tax (RD) specific fields
  depositorName: String,
  district: String,
  state: String,
  departmentName: String,
  purpose: String,
  challanPeriod: String,
  TIN: String,
  URN: String,
  CRN: String,
  CIN: String,
  challanNumber: String,
  transactionDate: String,
  transactionTime: String,
  headOfAccount: String,
  amountInWords: String,
  bankName: String,
  bankReferenceNumber: String,
  scrollNumber: String,
  scrollDate: String,
  transactionDateTime: String,
  transactionStatus: String,
  attachments: {
    type: [AttachmentSchema],
    default: []
  },
  verificationRemarks: String,
  verificationDate: String,
  verifiedBy: String,
  approvalRemarks: String,
  approvalDate: String,
  approvedBy: String,
  paymentInitiationRemarks: String,
  paymentInitiationDate: String,
  paymentInitiatedBy: String,
  paymentInitiationProofUrl: String,
  paymentInitiationProofName: String,
  paymentConfirmationRemarks: String,
  paymentConfirmationDate: String,
  paymentConfirmedBy: String,
  paymentConfirmationBankName: String,
  paymentConfirmationUpiMode: String,
  paymentConfirmationUpiReference: String,
  paymentConfirmationProofUrl: String,
  paymentConfirmationProofName: String,
  tallyEntryRemarks: String,
  tallyEntryDate: String,
  tallyEnteredBy: String,
  tallyProofUrl: String,
  tallyProofName: String,
  workflowLogs: [{
    stage: String,
    action: String,
    user: String,
    userRole: String,
    timestamp: String,
    remarks: String,
    proofUrl: String,
    proofName: String,
    bankName: String,
    upiMode: String,
    upiReference: String
  }],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Aggregation Helper
async function getReportData(filter: any) {
  const [totalStats, categoryStats, subcategoryStats, statusStats, monthlyTrend] = await Promise.all([
    Bill.aggregate([
      { $match: filter },
      { $group: { 
        _id: null, 
        totalAmount: { $sum: "$amount" },
        paidAmount: { $sum: { $cond: [{ $in: ["$status", ["Paid", "PAID", "PAID_CONFIRMED", "Payment Confirmed", "Approved", "Accepted", "SUCCESS"]] }, "$amount", 0] } },
        pendingAmount: { $sum: { $cond: [{ $in: ["$status", ["Pending", "PENDING", "IN_PROCESS", "OVERDUE"]] }, "$amount", 0] } },
        totalCount: { $sum: 1 }
      }}
    ]),
    Bill.aggregate([
      { $match: filter },
      { $group: { _id: "$category", total: { $sum: "$amount" } } }
    ]),
    Bill.aggregate([
      { $match: filter },
      { $group: { 
        _id: { 
          category: "$category", 
          subcategory: "$subcategory",
          docType: "$documentType" 
        }, 
        total: { $sum: "$amount" },
        paidAmount: { $sum: { $cond: [{ $in: ["$status", ["Paid", "PAID", "PAID_CONFIRMED", "Payment Confirmed", "Approved", "Accepted", "SUCCESS"]] }, "$amount", 0] } },
        pendingAmount: { $sum: { $cond: [{ $in: ["$status", ["Pending", "PENDING", "IN_PROCESS", "OVERDUE"]] }, "$amount", 0] } },
        totalCount: { $sum: 1 }
      } }
    ]),
    Bill.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    Bill.aggregate([
      { $match: filter },
      { $group: {
        _id: { 
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" }
        },
        total: { $sum: "$amount" }
      }},
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ])
  ]);

  const summary = totalStats[0] || { totalAmount: 0, paidAmount: 0, pendingAmount: 0, totalCount: 0 };
  
  return {
    ...summary,
    categoryData: categoryStats,
    subcategoryData: subcategoryStats,
    statusData: statusStats,
    monthlyTrend: monthlyTrend
  };
}

// Add compound indexes for Telecom and Solar to prevent duplicates
// Telecom Index: phoneNumber + billingPeriod + year + utilityType
BillSchema.index({ phoneNumber: 1, billingPeriod: 1, year: 1, utilityType: 1 }, { 
  unique: true, 
  partialFilterExpression: { 
    utilityType: { $in: ['Telecom', 'Data (Internet)', 'Landline', 'Mobile Recharge'] },
    phoneNumber: { $exists: true, $ne: "" },
    billingPeriod: { $exists: true, $ne: "" },
    year: { $exists: true, $ne: "" }
  } 
});

// Solar Index: consumerNumber + month + year + utilityType
BillSchema.index({ consumerNumber: 1, month: 1, year: 1, utilityType: 1 }, { 
  unique: true, 
  partialFilterExpression: { 
    utilityType: 'Solar Bill',
    consumerNumber: { $exists: true, $ne: "" },
    month: { $exists: true, $ne: "" },
    year: { $exists: true, $ne: "" }
  } 
});

const ProjectSchema = new mongoose.Schema({
  name: String,
  code: String,
  type: String,
  status: String,
  annualBudget: Number,
  monthlyBudget: Number,
  alertThreshold: Number
});

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: { type: String, default: "password123" } // Simplified for demo
});

const BillTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  icon: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SettingsSchema = new mongoose.Schema({
  companyName: { type: String, default: "Neoteric Group" },
  gstNumber: { type: String, default: "27AADCB2230M1Z2" },
  address: { type: String, default: "123 Business Park, Tech City, 400001" },
  currency: { type: String, default: "INR" },
  dateFormat: { type: String, default: "DD/MM/YYYY" },
  financialYear: { type: String, default: "Apr-Mar" },
  timezone: { type: String, default: "IST" },
  priorityLevels: { type: [String], default: ['Low', 'Normal', 'High', 'Urgent'] },
  reminderDays: { type: Number, default: 3 },
  largeAmountThreshold: { type: Number, default: 50000 },
  notifications: {
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    overdue: { type: Boolean, default: true },
    upcoming: { type: Boolean, default: true },
    dailySummary: { type: Boolean, default: false },
    weeklySummary: { type: Boolean, default: true },
    upcomingDays: { type: Number, default: 7 }
  },
  security: {
    twoFactor: { type: Boolean, default: false },
    sessionTimeout: { type: String, default: "30" }
  },
  paymentMethods: [{
    name: String,
    active: Boolean
  }]
});

const AuditLogSchema = new mongoose.Schema({
  user: String,
  action: String,
  details: String,
  timestamp: { type: Date, default: Date.now }
});

const CompanySchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  companyCode: { type: String, required: true, unique: true },
  status: { type: String, default: 'Active' },
  remarks: String
}, { timestamps: true });

const Bill = mongoose.model("Bill", BillSchema);
const Project = mongoose.model("Project", ProjectSchema);
const User = mongoose.model("User", UserSchema);
const BillType = mongoose.model("BillType", BillTypeSchema);
const Settings = mongoose.model("Settings", SettingsSchema);
const AuditLog = mongoose.model("AuditLog", AuditLogSchema);
const Company = mongoose.model("Company", CompanySchema);

// API Router
const apiRouter = express.Router();

// Health check
apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Public API Routes (No Auth Required)
apiRouter.post("/upload", (req, res, next) => {
  upload.array("files")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Multer error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Unknown upload error: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    const isCloudinaryConfigured = 
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET;

    const files = req.files as Express.Multer.File[];
    
    if (!isCloudinaryConfigured) {
      // Fallback to local if Cloudinary not fully configured
      const results = files.map(file => ({
        url: `/uploads/${file.filename}`,
        name: file.originalname,
        type: file.mimetype
      }));
      return res.json({ files: results });
    }

    const uploadPromises = files.map(file => uploadToCloudinary(file, "utility-bills"));
    const results = await Promise.all(uploadPromises);
    res.json({ files: results });
  } catch (err: any) {
    console.error("Detailed Upload Error:", err);
    res.status(500).json({ 
      error: "Upload failed", 
      message: err.message || "An unknown error occurred during upload",
      code: err.http_code || err.code
    });
  }
});

// Advanced Reports Endpoints
apiRouter.get("/reports/advanced", async (req, res) => {
  try {
    const { month, year, startDate, endDate, category, status, property, utilityType, company } = req.query;
    const filterConditions: any[] = [];

    if (property) {
      filterConditions.push({ propertyName: { $regex: property as string, $options: 'i' } });
    }

    if (utilityType) {
      filterConditions.push({ utilityType: utilityType as string });
    }

    if (company) {
      filterConditions.push({ companyName: company as string });
    }

    // Handle Month/Year filtering specifically using stored fields if available, 
    // otherwise fallback to createdAt for date ranges
    if (month && year) {
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const mIdx = parseInt(month as string) - 1;
      const monthName = monthNames[mIdx];
      const m = parseInt(month as string);
      const y = parseInt(year as string);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);
      
      filterConditions.push({
        $or: [
          { month: monthName, year: year as string },
          { month: monthName, year: y },
          { month: m, year: y },
          { month: month as string, year: year as string },
          { bill_month: monthName, bill_year: y },
          { bill_month: monthName, bill_year: year as string },
          { createdAt: { $gte: start, $lte: end } }
        ]
      });
      
    } else if (year) {
      const y = parseInt(year as string);
      filterConditions.push({
        $or: [
          { year: year as string },
          { year: y },
          { bill_year: y },
          { bill_year: year as string },
          { createdAt: { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) } }
        ]
      });
    } else if (startDate && endDate) {
      filterConditions.push({
        createdAt: { 
          $gte: new Date(startDate as string), 
          $lte: new Date(endDate as string) 
        }
      });
    }

    if (category) {
      const categoriesArray = (category as string).split(',');
      const sub = req.query.subcategory as string;
      const catOr: any[] = [{ category: { $in: categoriesArray } }];
      
      if (sub) {
        catOr.push({ subcategory: sub });
        catOr.push({ subcategory: sub.replace(/_/g, ' ') }); // e.g. pollution_control -> pollution control
        catOr.push({ subcategory: sub.replace(/_/g, ' ') + ' bill' }); // e.g. solar -> solar bill
        
        // Legacy mapping for utilityType and bill_type
        const typeMap: any = {
          'solar': ['Solar Bill', 'Solar', 'Solar bill'],
          'electricity': ['Electricity', 'Electricity Bill'],
          'property_tax': ['Property Tax (MCG)', 'Property Tax', 'property_tax'],
          'diversion_tax': ['Diversion Tax (RD)', 'Diversion Tax', 'diversion_tax'],
          'pollution_control': ['Pollution Control', 'CTE', 'CTO']
        };
        if (typeMap[sub]) {
          catOr.push({ utilityType: { $in: typeMap[sub] } });
          const fuzzyMatch = typeMap[sub].map((s: string) => new RegExp(`^${s}$`, 'i'));
          catOr.push({ bill_type: { $in: fuzzyMatch } });
          catOr.push({ subcategory: { $in: typeMap[sub].map((s: string) => s.toLowerCase()) } });
        }
      }
      filterConditions.push({ $or: catOr });
    }
    
    if (status) filterConditions.push({ status: status });
    if (req.query.documentType) filterConditions.push({ documentType: req.query.documentType });

    const filter = filterConditions.length > 0 ? { $and: filterConditions } : {};

    const reportData = await getReportData(filter);
    
    // Detailed bills
    const bills = await Bill.find(filter).sort({ updatedAt: -1 }).limit(200);

    res.json({
      ...reportData,
      bills
    });
  } catch (err) {
    console.error("Report extraction error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// Telecom Upload & Extraction Endpoint
apiRouter.post("/bills/upload-telecom", upload.array("files", 1), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const file = files[0];

    const isCloudinaryConfigured = 
      !!(process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET);

    let fileUrl = '';
    if (isCloudinaryConfigured) {
      const result = await uploadToCloudinary(file, "telecom-bills");
      fileUrl = result.url;
    } else {
      fileUrl = `/uploads/${file.filename}`;
    }

    const jobId = `telecom-${Date.now()}`;
    
    res.json({
      jobId,
      fileUrl,
      fileName: file.originalname,
      message: "File uploaded successfully"
    });
  } catch (err: any) {
    console.error("Telecom upload error:", err);
    res.status(500).json({ 
      error: "Failed to process telecom bill",
      message: err.message || "Unknown error",
      details: err
    });
  }
});

// Government Bill Upload & Extraction Endpoint
apiRouter.post("/bills/upload-government", upload.array("files", 1), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const file = files[0];

    const isCloudinaryConfigured = 
      !!(process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET);

    let fileUrl = '';
    if (isCloudinaryConfigured) {
      const result = await uploadToCloudinary(file, "government-bills");
      fileUrl = result.url;
    } else {
      fileUrl = `/uploads/${file.filename}`;
    }

    const jobId = `gov-${Date.now()}`;

    res.json({
      jobId,
      fileUrl,
      fileName: file.originalname,
      message: "File uploaded successfully"
    });
  } catch (err) {
    console.error("Government bill upload error:", err);
    res.status(500).json({ error: "Failed to process government bill" });
  }
});

// Electricity Bill Upload & Extraction Endpoint
apiRouter.post("/bills/upload-electricity", upload.array("files", 1), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const file = files[0];

    const isCloudinaryConfigured = 
      !!(process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET);

    let fileUrl = '';
    if (isCloudinaryConfigured) {
      const result = await uploadToCloudinary(file, "electricity-bills");
      fileUrl = result.url;
    } else {
      fileUrl = `/uploads/${file.filename}`;
    }

    const jobId = `elec-${Date.now()}`;
    res.json({
      jobId,
      fileUrl,
      fileName: file.originalname,
      message: "File uploaded successfully"
    });
  } catch (err) {
    console.error("Electricity bill upload error:", err);
    res.status(500).json({ error: "Failed to process electricity bill" });
  }
});

// Insurance Document Upload Endpoint
apiRouter.post("/bills/upload-insurance", upload.array("files", 1), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const file = files[0];

    const isCloudinaryConfigured = 
      !!(process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET);

    let fileUrl = '';
    if (isCloudinaryConfigured) {
      const result = await uploadToCloudinary(file, "insurance-docs");
      fileUrl = result.url;
    } else {
      fileUrl = `/uploads/${file.filename}`;
    }

    const jobId = `ins-${Date.now()}`;

    res.json({
      jobId,
      fileUrl,
      fileName: file.originalname,
      message: "Insurance document uploaded successfully"
    });
  } catch (err) {
    console.error("Insurance upload error:", err);
    res.status(500).json({ error: "Failed to process insurance document" });
  }
});

// Solar Bill Upload Endpoint
apiRouter.post("/bills/upload-solar", upload.array("files", 1), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const file = files[0];

    const isCloudinaryConfigured = 
      !!(process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET);

    let fileUrl = '';
    if (isCloudinaryConfigured) {
      const result = await uploadToCloudinary(file, "solar-bills");
      fileUrl = result.url;
    } else {
      fileUrl = `/uploads/${file.filename}`;
    }

    const jobId = `solar-${Date.now()}`;

    res.json({
      jobId,
      fileUrl,
      fileName: file.originalname,
      message: "Solar bill uploaded successfully"
    });
  } catch (err) {
    console.error("Solar bill upload error:", err);
    res.status(500).json({ error: "Failed to process solar bill" });
  }
});

// Pollution Control Document Upload Endpoint
apiRouter.post("/bills/upload-pollution", upload.array("files", 1), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const file = files[0];

    const isCloudinaryConfigured = 
      !!(process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET);

    let fileUrl = '';
    if (isCloudinaryConfigured) {
      const result = await uploadToCloudinary(file, "pollution-control");
      fileUrl = result.url;
    } else {
      fileUrl = `/uploads/${file.filename}`;
    }

    const jobId = `pollution-${Date.now()}`;

    res.json({
      jobId,
      fileUrl,
      fileName: file.originalname,
      message: "Pollution control document uploaded successfully"
    });
  } catch (err) {
    console.error("Pollution upload error:", err);
    res.status(500).json({ error: "Failed to process pollution control document" });
  }
});

apiRouter.get("/public/projects", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const projects = await Project.find().sort({ name: 1 });
    res.json(projects);
  } catch (err) {
    console.error("Fetch public projects error:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

apiRouter.get("/public/bill-types", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const types = await BillType.find().sort({ name: 1 });
    res.json(types);
  } catch (err) {
    console.error("Fetch public bill types error:", err);
    res.status(500).json({ error: "Failed to fetch bill types" });
  }
});

apiRouter.get("/public/companies", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const companies = await Company.find({ status: 'Active' }).sort({ companyName: 1 });
    res.json(companies);
  } catch (err) {
    console.error("Fetch public companies error:", err);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

apiRouter.post("/public/bills", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    console.log("Incoming public bill data:", JSON.stringify(req.body, null, 2));

    // Normalize month/year from billDate if missing
    if (req.body.billDate && (!req.body.month || !req.body.year)) {
      const bDate = new Date(req.body.billDate);
      if (!isNaN(bDate.getTime())) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (!req.body.month) req.body.month = monthNames[bDate.getMonth()];
        if (!req.body.year) req.body.year = bDate.getFullYear().toString();
      }
    }

    // Check for duplicates before saving
    const { utilityType, phoneNumber, billingPeriod, year, consumerNumber, month } = req.body;
    
    const telecomTypes = ['Telecom', 'Data (Internet)', 'Landline', 'Mobile Recharge'];
    if (telecomTypes.includes(utilityType) && phoneNumber && billingPeriod && year) {
      const existing = await Bill.findOne({ 
        utilityType, 
        phoneNumber, 
        billingPeriod, 
        year 
      });
      if (existing) {
        return res.status(409).json({ 
          error: "Duplicate Bill Detected", 
          message: "This bill is already filled in the list, kindly check."
        });
      }
    }

    if (utilityType === 'Solar Bill' && consumerNumber && month && year) {
      const existing = await Bill.findOne({ 
        utilityType: 'Solar Bill', 
        consumerNumber, 
        month, 
        year 
      });
      if (existing) {
        return res.status(409).json({ 
          error: "Duplicate Bill Detected", 
          message: "This bill is already filled in the list, kindly check."
        });
      }
    }
    
    // Sanitize attachments
    if (req.body.attachments) {
      if (typeof req.body.attachments === 'string') {
        try {
          req.body.attachments = JSON.parse(req.body.attachments);
        } catch (e) {
          console.error("Failed to parse attachments string:", e);
          req.body.attachments = [];
        }
      }
      
      if (Array.isArray(req.body.attachments)) {
        req.body.attachments = req.body.attachments.map(att => {
          if (typeof att === 'string') {
            try {
              return JSON.parse(att);
            } catch (e) {
              return null;
            }
          }
          return att;
        }).filter(Boolean);
      } else {
        req.body.attachments = [];
      }
    }

    const newBill = new Bill(req.body);
    await newBill.save();
    
    // Trigger webhook
    triggerWebhook('bill_created_public', newBill);
    
    // Emit real-time event
    io.emit("bill:created", newBill);
    
    res.status(201).json(newBill);
  } catch (err) {
    console.error("Create public bill error:", err);
    res.status(500).json({ 
      error: "Failed to create bill", 
      details: err instanceof Error ? err.message : String(err) 
    });
  }
});

apiRouter.get("/public/bills/electricity", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const bills = await Bill.find({ utilityType: 'Electricity' }).sort({ createdAt: -1 }).limit(100);
    res.json(bills);
  } catch (err) {
    console.error("Fetch public electricity bills error:", err);
    res.status(500).json({ error: "Failed to fetch bills" });
  }
});

apiRouter.post("/public/bills/check-duplicate", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const { utilityType, phoneNumber, billingPeriod, year, consumerNumber, month, billNumber, serviceProvider, id, _id } = req.body;
    const billIdToExclude = id || _id;

    // Base query conditions shared by all checks
    const baseFilter: any = {};
    if (billIdToExclude) {
      baseFilter._id = { $ne: billIdToExclude };
    }

    const telecomTypes = ['Telecom', 'Data (Internet)', 'Landline', 'Mobile Recharge'];
    
    // 1. Telecom Check (Phone + Period + Year)
    if (telecomTypes.includes(utilityType) && phoneNumber && billingPeriod && year) {
      const existing = await Bill.findOne({ 
        ...baseFilter,
        utilityType, 
        phoneNumber, 
        billingPeriod, 
        year 
      });
      if (existing) {
        return res.json({ 
          duplicate: true, 
          message: `Duplicate detected: This ${utilityType} bill for ${phoneNumber} in ${billingPeriod} ${year} already exists.`
        });
      }
    }

    // 2. Utility Check (Consumer No + Month + Year)
    if (consumerNumber && month && year) {
      const existing = await Bill.findOne({ 
        ...baseFilter,
        consumerNumber, 
        month, 
        year 
      });
      if (existing) {
        return res.json({ 
          duplicate: true, 
          message: `Duplicate detected: A bill for consumer ${consumerNumber} in ${month} ${year} already exists.`
        });
      }
    }

    // 3. Bill Number Check (Bill Number + Service Provider)
    if (billNumber && serviceProvider) {
      const existing = await Bill.findOne({ 
        ...baseFilter,
        billNumber, 
        serviceProvider 
      });
      if (existing) {
        return res.json({ 
          duplicate: true, 
          message: `Duplicate detected: Bill number ${billNumber} from ${serviceProvider} already exists.`
        });
      }
    }

    res.json({ duplicate: false });
  } catch (err) {
    console.error("Public check duplicate error:", err);
    res.status(500).json({ error: "Failed to check for duplicates" });
  }
});

// Authenticated API Routes
// --- Expense Related Routes ---
apiRouter.get("/expenses", async (req, res) => {
  try {
    const expenses = await Bill.find({ category: "expense" }).sort({ createdAt: -1 });
    res.json(expenses);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch expenses", message: err.message });
  }
});

apiRouter.post("/expenses/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const isCloudinaryConfigured = 
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET;

    let fileData;
    if (isCloudinaryConfigured) {
      fileData = await uploadToCloudinary(req.file, "expense-bills");
    } else {
      fileData = {
        url: `/uploads/${req.file.filename}`,
        name: req.file.originalname,
        type: req.file.mimetype
      };
    }

    res.json({
      fileUrl: fileData.url,
      fileName: fileData.name,
      mimeType: fileData.type
    });
  } catch (err: any) {
    res.status(500).json({ error: "Expense upload failed", message: err.message });
  }
});

apiRouter.post("/expenses/save", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const id = req.body._id || req.body.id;
    const billData = { 
      ...req.body, 
      category: "expense", 
      status: req.body.status || "Pending",
      utilityType: req.body.utilityType || req.body.subcategory || "Other Bill",
      attachments: req.body.attachments || (req.body.fileUrl ? [{ url: req.body.fileUrl, name: 'Expense Receipt', type: 'image/jpeg' }] : [])
    };

    if (!billData.billId) {
      billData.billId = `EXP-${Date.now().toString().slice(-6)}`;
    }

    let bill;
    if (id) {
      bill = await Bill.findByIdAndUpdate(id, billData, { new: true, runValidators: true });
      if (!bill) return res.status(404).json({ error: "Expense not found" });
      io.to("dashboard").emit("bill:updated", bill);
      await triggerWebhook("expense_updated", bill);
    } else {
      bill = new Bill(billData);
      await bill.save();
      io.to("dashboard").emit("bill:created", bill);
      await triggerWebhook("expense_created", bill);
    }
    
    res.status(id ? 200 : 201).json(bill);
  } catch (err: any) {
    console.error("Save expense error:", err);
    res.status(500).json({ error: "Failed to save expense", message: err.message });
  }
});

apiRouter.post("/expenses/public", async (req, res) => {
  try {
    const expenseData = { 
      ...req.body, 
      category: "expense", 
      isPublic: true, 
      status: req.body.status || "Pending",
      utilityType: req.body.utilityType || req.body.subcategory || "Other Bill",
      billId: req.body.billId || `PUB-EXP-${Date.now().toString().slice(-6)}`,
      attachments: req.body.attachments || (req.body.fileUrl ? [{ url: req.body.fileUrl, name: 'Expense Receipt', type: 'image/jpeg' }] : [])
    };
    const bill = new Bill(expenseData);
    await bill.save();

    io.to("dashboard").emit("bill:created", bill);
    await triggerWebhook("public_expense_created", bill);

    res.status(201).json(bill);
  } catch (err: any) {
    console.error("Public expense error:", err);
    res.status(500).json({ error: "Public expense submission failed", message: err.message });
  }
});

apiRouter.get("/bills", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected. Please check MONGODB_URI in settings." });
  }
  try {
    const bills = await Bill.find().sort({ updatedAt: -1 });
    res.json(bills);
  } catch (err) {
    console.error("Fetch bills error:", err);
    res.status(500).json({ error: "Failed to fetch bills" });
  }
});

apiRouter.post("/bills", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const { triggeredBy, ...billData } = req.body;
    console.log("Incoming bill data:", JSON.stringify(billData, null, 2));

    // Normalize month/year from billDate if missing
    if (billData.billDate && (!billData.month || !billData.year)) {
      const bDate = new Date(billData.billDate);
      if (!isNaN(bDate.getTime())) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (!billData.month) billData.month = monthNames[bDate.getMonth()];
        if (!billData.year) billData.year = bDate.getFullYear().toString();
      }
    }

    // Check for duplicates before saving
    const { utilityType, phoneNumber, billingPeriod, year, consumerNumber, month } = billData;
    
    const telecomTypes = ['Telecom', 'Data (Internet)', 'Landline', 'Mobile Recharge'];
    if (telecomTypes.includes(utilityType) && phoneNumber && billingPeriod && year) {
      const existing = await Bill.findOne({ 
        utilityType, 
        phoneNumber, 
        billingPeriod, 
        year 
      });
      if (existing && existing._id.toString() !== billData._id && existing._id.toString() !== billData.id) {
        return res.status(409).json({ 
          error: "Duplicate Bill Detected", 
          message: "This bill is already filled in the list, kindly check."
        });
      }
    }

    if (utilityType === 'Solar Bill' && consumerNumber && month && year) {
      const existing = await Bill.findOne({ 
        utilityType: 'Solar Bill', 
        consumerNumber, 
        month, 
        year 
      });
      if (existing && existing._id.toString() !== billData._id && existing._id.toString() !== billData.id) {
        return res.status(409).json({ 
          error: "Duplicate Bill Detected", 
          message: "This bill is already filled in the list, kindly check."
        });
      }
    }
    
    // Sanitize attachments
    if (billData.attachments) {
      if (typeof billData.attachments === 'string') {
        try {
          billData.attachments = JSON.parse(billData.attachments);
        } catch (e) {
          console.error("Failed to parse attachments string:", e);
          billData.attachments = [];
        }
      }
      
      if (Array.isArray(billData.attachments)) {
        billData.attachments = billData.attachments.map(att => {
          if (typeof att === 'string') {
            try {
              return JSON.parse(att);
            } catch (e) {
              return null;
            }
          }
          return att;
        }).filter(Boolean);
      } else {
        billData.attachments = [];
      }
    }

    const newBill = new Bill({
      ...billData,
      workflowLogs: [{
        stage: 'Bill Received',
        action: 'Uploaded',
        user: triggeredBy?.name || billData.entered_by_name || 'System',
        userRole: triggeredBy?.role || 'DATA_ENTRY',
        timestamp: new Date().toISOString(),
        remarks: 'Bill document successfully received and indexed.'
      }]
    });
    await newBill.save();
    
    // Trigger webhook
    triggerWebhook('bill_created', newBill, triggeredBy);
    
    // Emit real-time event
    io.emit("bill:created", newBill);
    io.emit("dashboard_update");
    
    res.status(201).json(newBill);
  } catch (err) {
    console.error("Create bill error:", err);
    res.status(500).json({ 
      error: "Failed to create bill",
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

apiRouter.post("/bills/check-duplicate", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const { utilityType, phoneNumber, billingPeriod, year, consumerNumber, month, billNumber, serviceProvider, id, _id } = req.body;
    const billIdToExclude = id || _id;

    // Base query conditions shared by all checks
    const baseFilter: any = {};
    if (billIdToExclude) {
      baseFilter._id = { $ne: billIdToExclude };
    }

    const telecomTypes = ['Telecom', 'Data (Internet)', 'Landline', 'Mobile Recharge'];
    
    // 1. Telecom Check (Phone + Period + Year)
    if (telecomTypes.includes(utilityType) && phoneNumber && billingPeriod && year) {
      const existing = await Bill.findOne({ 
        ...baseFilter,
        utilityType, 
        phoneNumber, 
        billingPeriod, 
        year 
      });
      if (existing) {
        return res.json({ 
          duplicate: true, 
          message: `Duplicate detected: This ${utilityType} bill for ${phoneNumber} in ${billingPeriod} ${year} already exists.`
        });
      }
    }

    // 2. Utility Check (Consumer No + Month + Year)
    if (consumerNumber && month && year) {
      const existing = await Bill.findOne({ 
        ...baseFilter,
        consumerNumber, 
        month, 
        year 
      });
      if (existing) {
        return res.json({ 
          duplicate: true, 
          message: `Duplicate detected: A bill for consumer ${consumerNumber} in ${month} ${year} already exists.`
        });
      }
    }

    // 3. Bill Number Check (Bill Number + Service Provider)
    if (billNumber && serviceProvider) {
      const existing = await Bill.findOne({ 
        ...baseFilter,
        billNumber, 
        serviceProvider 
      });
      if (existing) {
        return res.json({ 
          duplicate: true, 
          message: `Duplicate detected: Bill number ${billNumber} from ${serviceProvider} already exists.`
        });
      }
    }

    res.json({ duplicate: false });
  } catch (err) {
    console.error("Check duplicate error:", err);
    res.status(500).json({ error: "Failed to check for duplicates" });
  }
});

// Companies
apiRouter.get("/companies", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const companies = await Company.find().sort({ companyName: 1 });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

apiRouter.post("/companies", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const company = new Company(req.body);
    await company.save();
    res.status(201).json(company);
  } catch (err: any) {
    if (err.code === 11000) return res.status(409).json({ error: "Company code already exists" });
    res.status(500).json({ error: "Failed to create company" });
  }
});

apiRouter.put("/companies/:id", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!company) return res.status(404).json({ error: "Company not found" });
    res.json(company);
  } catch (err: any) {
    if (err.code === 11000) return res.status(409).json({ error: "Company code already exists" });
    res.status(500).json({ error: "Failed to update company" });
  }
});

apiRouter.delete("/companies/:id", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const result = await Company.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: "Company not found" });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete company" });
  }
});

apiRouter.get("/bills/:id", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    res.json(bill);
  } catch (err) {
    console.error("Get bill error:", err);
    res.status(500).json({ error: "Failed to fetch bill" });
  }
});

apiRouter.put("/bills/:id", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const { triggeredBy, ...billData } = req.body;
    
    if (!billData.category && billData.utilityType) {
      const utility = ['Electricity', 'Water', 'Solar Bill'];
      const telecom = ['Telecom', 'Data (Internet)', 'Landline', 'Mobile Recharge'];
      const insurance = ['Labour Insurance', 'Asset Insurance', 'Insurance', 'Vehicle Insurance', 'Employee Insurance', 'General Insurance'];
      const government = ['Property Tax (MCG)', 'Diversion Tax (RD)', 'Pollution Control', 'CTE', 'CTO', 'Waste Management', 'Pest Control', 'Fire Safety Audit', 'Electrical Safety Audit', 'Air Conditioner AMC', 'Elevator AMC'];
      
      const type = billData.utilityType;
      if (utility.includes(type)) {
        billData.category = 'utility';
        billData.subcategory = type.toLowerCase().replace(/\s+/g, '_');
      } else if (telecom.includes(type)) {
        billData.category = 'telecom';
        billData.subcategory = type.toLowerCase().replace(/\s+/g, '_');
      } else if (insurance.includes(type)) {
        billData.category = 'insurance';
        if (type === 'Vehicle Insurance') billData.subcategory = 'vehicle_insurance';
        else if (type === 'Employee Insurance') billData.subcategory = 'employee_insurance';
        else billData.subcategory = 'general_insurance';
      } else if (government.includes(type)) {
        billData.category = 'government_tax';
        if (['Pollution Control', 'CTE', 'CTO'].includes(type)) billData.subcategory = 'pollution_control';
        else billData.subcategory = type.toLowerCase().replace(/\s+/g, '_');
      } else {
        billData.category = 'other';
        billData.subcategory = type.toLowerCase().replace(/\s+/g, '_');
      }
    }

    const updatedBill = await Bill.findByIdAndUpdate(req.params.id, billData, { new: true });
    
    // Trigger webhook
    if (updatedBill) {
      triggerWebhook('bill_updated', updatedBill, triggeredBy);
    }
    
    // Emit real-time event
    if (updatedBill) {
      io.emit("bill:updated", updatedBill);
      io.emit("dashboard_update");
    }
    
    res.json(updatedBill);
  } catch (err) {
    console.error("Update bill error:", err);
    res.status(500).json({ error: "Failed to update bill" });
  }
});

apiRouter.post("/bills/:id/verify", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const { remarks, userName, userRole } = req.body;
    const log = {
      stage: 'Verification',
      action: 'Verified',
      user: userName || 'System',
      userRole: userRole || 'VERIFIER',
      timestamp: new Date().toISOString(),
      remarks
    };
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Verified',
        verificationRemarks: remarks,
        verificationDate: log.timestamp,
        verifiedBy: userName,
        $push: { workflowLogs: log }
      },
      { new: true }
    );
    if (updatedBill) {
      triggerWebhook('bill_verified', updatedBill);
      io.emit("bill:updated", updatedBill);
      io.emit("dashboard_update");
    }
    res.json(updatedBill);
  } catch (err) {
    res.status(500).json({ error: "Failed to verify bill" });
  }
});

apiRouter.post("/bills/:id/approve", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const { remarks, userName, userRole } = req.body;
    const log = {
      stage: 'Approval',
      action: 'Approved',
      user: userName || 'System',
      userRole: userRole || 'APPROVER',
      timestamp: new Date().toISOString(),
      remarks
    };
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Approved',
        approvalRemarks: remarks,
        approvalDate: log.timestamp,
        approvedBy: userName,
        $push: { workflowLogs: log }
      },
      { new: true }
    );
    if (updatedBill) {
      triggerWebhook('bill_approved', updatedBill);
      io.emit("bill:updated", updatedBill);
      io.emit("dashboard_update");
    }
    res.json(updatedBill);
  } catch (err) {
    res.status(500).json({ error: "Failed to approve bill" });
  }
});

apiRouter.post("/bills/:id/reject", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const { remarks, userName, userRole } = req.body;
    const log = {
      stage: 'Approval',
      action: 'Rejected',
      user: userName || 'System',
      userRole: userRole || 'APPROVER',
      timestamp: new Date().toISOString(),
      remarks
    };
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Rejected',
        approvalRemarks: remarks,
        approvalDate: log.timestamp,
        approvedBy: userName,
        $push: { workflowLogs: log }
      },
      { new: true }
    );
    if (updatedBill) {
      triggerWebhook('bill_rejected', updatedBill);
      io.emit("bill:updated", updatedBill);
      io.emit("dashboard_update");
    }
    res.json(updatedBill);
  } catch (err) {
    res.status(500).json({ error: "Failed to reject bill" });
  }
});

apiRouter.post("/bills/:id/initiate-payment", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const { remarks, userName, userRole, proofUrl, proofName } = req.body;
    const log = {
      stage: 'Payment Initiation',
      action: 'Payment Initiated',
      user: userName || 'System',
      userRole: userRole || 'ADMIN',
      timestamp: new Date().toISOString(),
      remarks,
      proofUrl,
      proofName
    };
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Payment Initiated',
        paymentInitiationRemarks: remarks,
        paymentInitiationDate: log.timestamp,
        paymentInitiatedBy: userName,
        paymentInitiationProofUrl: proofUrl,
        paymentInitiationProofName: proofName,
        $push: { workflowLogs: log }
      },
      { new: true }
    );
    if (updatedBill) {
      triggerWebhook('payment_initiated', updatedBill);
      io.emit("bill:updated", updatedBill);
      io.emit("dashboard_update");
    }
    res.json(updatedBill);
  } catch (err) {
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

apiRouter.post("/bills/:id/confirm-payment", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const { remarks, userName, userRole, paymentDate, bankName, upiMode, upiReference, proofUrl, proofName, amount } = req.body;
    const log = {
      stage: 'Payment Confirmation',
      action: 'Payment Confirmed',
      user: userName || 'System',
      userRole: userRole || 'ADMIN',
      timestamp: new Date().toISOString(),
      remarks,
      bankName,
      upiMode,
      upiReference,
      proofUrl,
      proofName,
      amount: amount ? Number(amount) : undefined,
      paymentDate: paymentDate
    };
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Payment Confirmed',
        paymentConfirmationRemarks: remarks,
        paymentConfirmationDate: log.timestamp,
        paymentConfirmedBy: userName,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        paidAmount: amount ? Number(amount) : undefined,
        paymentConfirmationBankName: bankName,
        paymentConfirmationUpiMode: upiMode,
        paymentConfirmationUpiReference: upiReference,
        paymentConfirmationProofUrl: proofUrl,
        paymentConfirmationProofName: proofName,
        $push: { workflowLogs: log }
      },
      { new: true }
    );
    if (updatedBill) {
      triggerWebhook('payment_confirmed', updatedBill);
      io.emit("bill:updated", updatedBill);
      io.emit("dashboard_update");
    }
    res.json(updatedBill);
  } catch (err) {
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

apiRouter.post("/bills/:id/tally-entry", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const { remarks, userName, userRole, tallyData } = req.body;
    
    let combinedRemarks = remarks || '';
    if (tallyData) {
      let tallySummary = '[Tally Entry] Recorded';
      if (tallyData.ledgerName && tallyData.ledgerName !== 'N/A') {
        tallySummary = `[Tally Entry] Ledger: ${tallyData.ledgerName}, Type: ${tallyData.expenseType}, Mode: ${tallyData.paymentMode}, Voucher: ${tallyData.voucherType}, Ref: ${tallyData.referenceNumber}`;
      } else if (tallyData.proofUrl) {
        tallySummary = `[Tally Entry] Proof attached: ${tallyData.proofName || 'document'}`;
      }
      combinedRemarks = remarks ? `${remarks}` : tallySummary;
    }

    const log = {
      stage: 'Tally Entry',
      action: 'Tally Entry',
      user: userName || 'System',
      userRole: userRole || 'ADMIN',
      timestamp: new Date().toISOString(),
      remarks: combinedRemarks,
      proofUrl: tallyData?.proofUrl || '',
      proofName: tallyData?.proofName || '',
      ...tallyData
    };
    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Paid',
        tallyEntryRemarks: combinedRemarks,
        tallyEntryDate: log.timestamp,
        tallyEnteredBy: userName,
        tallyProofUrl: tallyData?.proofUrl || '',
        tallyProofName: tallyData?.proofName || '',
        $push: { workflowLogs: log }
      },
      { new: true }
    );
    if (updatedBill) {
      triggerWebhook('tally_entry', updatedBill);
      io.emit("bill:updated", updatedBill);
      io.emit("dashboard_update");
    }
    res.json(updatedBill);
  } catch (err) {
    res.status(500).json({ error: "Failed to record tally entry" });
  }
});

apiRouter.delete("/bills/:id", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const { triggeredBy } = req.body;
    const bill = await Bill.findById(req.params.id);
    
    if (bill) {
      await Bill.findByIdAndDelete(req.params.id);
      
      // Trigger Slack notification for deletion
      triggerWebhook('bill_deleted', bill, triggeredBy);
      
      // Emit real-time event
      io.emit("bill:deleted", { id: req.params.id });
      io.emit("dashboard_update");
      
      res.json({ message: "Bill deleted" });
    } else {
      res.status(404).json({ error: "Bill not found" });
    }
  } catch (err) {
    console.error("Delete bill error:", err);
    res.status(500).json({ error: "Failed to delete bill" });
  }
});

// Dashboard Summary API
apiRouter.get("/dashboard/summary", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const { categories, company } = req.query;
    const filter: any = {};
    if (categories && categories !== 'all') {
      filter.category = { $in: (categories as string).split(',') };
    }
    if (company && company !== 'all') {
      filter.companyName = company;
    }

    const totalDocuments = await Bill.countDocuments(filter);
    const totalAmountResult = await Bill.aggregate([
      { $match: filter },
      { $group: { _id: null, sum: { $sum: "$amount" } } }
    ]);
    const totalAmount = totalAmountResult[0]?.sum || 0;

    const categoryStats = await Bill.aggregate([
      { $match: filter },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    const categoryCounts = categoryStats.reduce((acc: any, curr) => {
      if (curr._id) acc[curr._id] = curr.count;
      return acc;
    }, { utility: 0, telecom: 0, insurance: 0, government_tax: 0, government_compliance: 0, expense: 0 });

    const subcategoryStats = await Bill.aggregate([
      { $match: filter },
      { $group: { _id: "$subcategory", count: { $sum: 1 } } }
    ]);
    const subcategoryCounts = subcategoryStats.reduce((acc: any, curr) => {
      if (curr._id) acc[curr._id] = curr.count;
      return acc;
    }, {});

    const statusStats = await Bill.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const statusCounts = statusStats.reduce((acc: any, curr) => {
      if (curr._id) acc[curr._id] = curr.count;
      return acc;
    }, { Paid: 0, Pending: 0, Overdue: 0 });

    const now = new Date();
    const next7Days = addDays(now, 7);
    const dateLimit = format(next7Days, 'yyyy-MM-dd');
    const dateNow = format(now, 'yyyy-MM-dd');

    // Robust overdue filter: not in paid/completed statuses and dueDate is in the past, or explicitly Overdue status
    const overdueFilter = {
      ...filter,
      $or: [
        { status: 'Overdue' },
        { 
          status: { $nin: ['Paid', 'Payment Confirmed', 'Tally Entry'] }, 
          dueDate: { $lt: dateNow, $ne: '' } 
        }
      ]
    };

    const overdueCount = await Bill.countDocuments(overdueFilter);
    statusCounts.Overdue = overdueCount;
    statusCounts.OVERDUE = overdueCount;

    // Detailed Expense Breakdown
    const expenseBreakdown = await Bill.aggregate([
      { $match: { ...filter, category: 'expense' } },
      { $group: { _id: "$subcategory", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
      { $sort: { amount: -1 } }
    ]);

    const recentDocuments = await Bill.find(filter).sort({ updatedAt: -1 }).limit(10);

    // Monthly Trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTrends = await Bill.aggregate([
      { $match: { ...filter, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          amount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const trendData = monthlyTrends.map(t => ({
      month: format(new Date(t._id.year, t._id.month - 1), 'MMM yyyy'),
      amount: t.amount,
      count: t.count
    }));

    // Overdue Summary using robust overdueFilter
    const overdueBillsTotal = await Bill.aggregate([
      { $match: overdueFilter },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$amount" } } }
    ]);

    const overdueSummary = {
      count: overdueBillsTotal[0]?.count || 0,
      amount: overdueBillsTotal[0]?.amount || 0
    };

    // Fetch all pending/overdue bills that are due within 7 days or overdue (excluding paid or confirmed bills)
    const pendingBills = await Bill.find({
      ...filter,
      status: { $nin: ['Paid', 'Payment Confirmed', 'Tally Entry'] },
      $or: [
        { dueDate: { $lte: dateLimit, $gte: dateNow, $ne: '' } },
        { dueDate: { $lt: dateNow, $ne: '' } },
        { status: 'Overdue' }
      ]
    }).sort({ dueDate: 1 });

    // Insurance policies expiring soon
    let expiringInsurance = [];
    let includeInsurance = true;
    if (filter.category) {
      if (typeof filter.category === 'string') {
        if (filter.category !== 'insurance') {
          includeInsurance = false;
        }
      } else if (filter.category.$in && !filter.category.$in.includes('insurance')) {
        includeInsurance = false;
      }
    }

    if (includeInsurance) {
      const expiringInsuranceFilter: any = {
        ...filter,
        category: 'insurance',
        dueDate: { $lte: dateLimit, $gte: dateNow },
        status: { $ne: 'Paid' }
      };
      expiringInsurance = await Bill.find(expiringInsuranceFilter).sort({ dueDate: 1 });
    }

    // Combine and deduplicate
    const alertMap = new Map();

    pendingBills.forEach(bill => {
      alertMap.set(bill._id.toString(), {
        type: bill.status === 'Overdue' || (bill.dueDate && bill.dueDate < dateNow) ? 'expiry' : 'due',
        message: `${bill.utilityType} bill for ${bill.propertyName} is ${bill.status === 'Overdue' || (bill.dueDate && bill.dueDate < dateNow) ? 'OVERDUE' : 'due soon'}`,
        date: bill.dueDate,
        amount: bill.amount,
        billId: bill._id,
        category: bill.category
      });
    });

    expiringInsurance.forEach(bill => {
      if (!alertMap.has(bill._id.toString())) {
        alertMap.set(bill._id.toString(), {
          type: 'expiry',
          message: `Insurance Policy expiring soon for ${bill.propertyName}`,
          date: bill.dueDate,
          amount: bill.amount,
          billId: bill._id,
          category: 'insurance',
          policyNumber: bill.policyNumber,
          insurerName: bill.insurerName,
          propertyName: bill.propertyName
        });
      }
    });

    // Pollution CTOs expiring soon (30 day window)
    let expiringPollution = [];
    let includePollution = true;
    if (filter.category) {
      if (typeof filter.category === 'string') {
        if (filter.category !== 'government_compliance' && filter.category !== 'government_tax') {
          includePollution = false;
        }
      } else if (filter.category.$in && !filter.category.$in.includes('government_compliance') && !filter.category.$in.includes('government_tax')) {
        includePollution = false;
      }
    }

    if (includePollution) {
      const expiringPollutionFilter: any = {
        subcategory: 'pollution_control',
        documentType: 'CTO',
        validityTo: { 
          $lte: format(addDays(now, 30), 'yyyy-MM-dd'), 
          $gte: dateNow 
        }
      };
      if (filter.companyName) {
        expiringPollutionFilter.companyName = filter.companyName;
      }
      expiringPollution = await Bill.find(expiringPollutionFilter).sort({ validityTo: 1 });
    }

    expiringPollution.forEach(bill => {
      if (!alertMap.has(bill._id.toString())) {
        alertMap.set(bill._id.toString(), {
          type: 'expiry',
          message: `Pollution CTO expiring soon for ${bill.propertyName}`,
          date: bill.validityTo,
          amount: 0,
          billId: bill._id,
          category: 'government_compliance',
          consentNumber: bill.consentNumber,
          propertyName: bill.propertyName
        });
      }
    });

    // Slice "due" and "expiry" alerts independently so older expiry alerts never crowd out upcoming/due bills
    const dueAlerts = Array.from(alertMap.values())
      .filter((a: any) => a.type === 'due')
      .sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      })
      .slice(0, 20);

    const expiryAlerts = Array.from(alertMap.values())
      .filter((a: any) => a.type === 'expiry')
      .sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      })
      .slice(0, 20);

    const alerts = [...dueAlerts, ...expiryAlerts];

    res.json({
      totalDocuments,
      totalAmount,
      categoryCounts,
      subcategoryCounts,
      recentDocuments,
      alerts,
      trendData,
      overdueSummary,
      statusCounts,
      expenseBreakdown
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

apiRouter.get("/projects", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const projects = await Project.find().sort({ name: 1 });
    res.json(projects);
  } catch (err) {
    console.error("Fetch projects error:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

apiRouter.get("/bill-types", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const types = await BillType.find().sort({ name: 1 });
    res.json(types);
  } catch (err) {
    console.error("Fetch bill types error:", err);
    res.status(500).json({ error: "Failed to fetch bill types" });
  }
});

apiRouter.post("/bill-types", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const { id, _id, ...data } = req.body;
    const typeId = id || _id;
    
    let billType;
    if (typeId) {
      billType = await BillType.findByIdAndUpdate(typeId, { ...data, updatedAt: new Date() }, { new: true });
    } else {
      billType = new BillType(data);
      await billType.save();
    }
    res.status(201).json(billType);
  } catch (err) {
    console.error("Save bill type error:", err);
    res.status(500).json({ error: "Failed to save bill type" });
  }
});

apiRouter.put("/bill-types/:id", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const updatedType = await BillType.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    res.json(updatedType);
  } catch (err) {
    console.error("Update bill type error:", err);
    res.status(500).json({ error: "Failed to update bill type" });
  }
});

apiRouter.delete("/bill-types/:id", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    await BillType.findByIdAndDelete(req.params.id);
    res.json({ message: "Bill type deleted" });
  } catch (err) {
    console.error("Delete bill type error:", err);
    res.status(500).json({ error: "Failed to delete bill type" });
  }
});

apiRouter.post("/projects", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const newProject = new Project(req.body);
    await newProject.save();
    res.status(201).json(newProject);
  } catch (err) {
    console.error("Create project error:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

apiRouter.put("/projects/:id", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const updatedProject = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedProject);
  } catch (err) {
    console.error("Update project error:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

apiRouter.get("/users", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

apiRouter.post("/users", async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

apiRouter.put("/users/:id", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

apiRouter.delete("/users/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

apiRouter.get("/settings", async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({
        paymentMethods: [
          { name: 'Bank Transfer', active: true },
          { name: 'Cheque', active: true },
          { name: 'UPI', active: true },
          { name: 'Cash', active: true },
        ]
      });
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

apiRouter.put("/settings", async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (settings) {
      Object.assign(settings, req.body);
      await settings.save();
    } else {
      settings = new Settings(req.body);
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

apiRouter.get("/audit-logs", async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

apiRouter.post("/audit-logs", async (req, res) => {
  try {
    const log = new AuditLog(req.body);
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: "Failed to create audit log" });
  }
});

apiRouter.post("/backup", async (req, res) => {
  try {
    const data = {
      bills: await Bill.find(),
      projects: await Project.find(),
      users: await User.find(),
      billTypes: await BillType.find(),
      settings: await Settings.findOne()
    };
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Backup failed" });
  }
});

apiRouter.post("/restore", async (req, res) => {
  try {
    const { bills, projects, users, billTypes, settings } = req.body;
    if (bills) { await Bill.deleteMany({}); await Bill.insertMany(bills); }
    if (projects) { await Project.deleteMany({}); await Project.insertMany(projects); }
    if (users) { await User.deleteMany({}); await User.insertMany(users); }
    if (billTypes) { await BillType.deleteMany({}); await BillType.insertMany(billTypes); }
    if (settings) { await Settings.deleteMany({}); await Settings.create(settings); }
    res.json({ message: "Restore successful" });
  } catch (err) {
    res.status(500).json({ error: "Restore failed" });
  }
});

apiRouter.delete("/projects/:id", async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete project" });
  }
});

apiRouter.post("/login", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not connected" });
  }
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && user.password === password) {
      res.json({ user, token: "mock-jwt-token" });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Reports API Routes
apiRouter.get("/reports/summary", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const summary = await Bill.aggregate([
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          paidAmount: {
            $sum: { $cond: [{ $eq: ["$status", "Paid"] }, "$amount", 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, "$amount", 0] }
          },
          overdueAmount: {
            $sum: { $cond: [{ $eq: ["$status", "Overdue"] }, "$amount", 0] }
          }
        }
      }
    ]);
    res.json(summary[0] || {
      totalCount: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch summary report" });
  }
});

apiRouter.get("/reports/monthly", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const monthly = await Bill.aggregate([
      {
        $group: {
          _id: { month: "$month", year: "$year" },
          totalBills: { $sum: 1 },
          paidAmount: {
            $sum: { $cond: [{ $eq: ["$status", "Paid"] }, "$amount", 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, "$amount", 0] }
          },
          overdueAmount: {
            $sum: { $cond: [{ $eq: ["$status", "Overdue"] }, "$amount", 0] }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    res.json(monthly);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch monthly report" });
  }
});

apiRouter.get("/reports/property", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const propertyReport = await Bill.aggregate([
      {
        $group: {
          _id: "$propertyName",
          totalBills: { $sum: 1 },
          paidAmount: {
            $sum: { $cond: [{ $eq: ["$status", "Paid"] }, "$amount", 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, "$amount", 0] }
          },
          overdueAmount: {
            $sum: { $cond: [{ $eq: ["$status", "Overdue"] }, "$amount", 0] }
          }
        }
      },
      { $sort: { paidAmount: -1 } }
    ]);
    res.json(propertyReport);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch property report" });
  }
});

apiRouter.get("/reports/utility", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const utilityReport = await Bill.aggregate([
      {
        $group: {
          _id: "$utilityType",
          totalBills: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);
    res.json(utilityReport);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch utility report" });
  }
});

apiRouter.get("/reports/overdue", async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Database not connected" });
  try {
    const now = new Date();
    const dateNow = format(now, 'yyyy-MM-dd');
    const overdueBills = await Bill.find({
      $or: [
        { status: "Overdue" },
        { 
          status: { $nin: ['Paid', 'Payment Confirmed', 'Tally Entry'] }, 
          dueDate: { $lt: dateNow, $ne: '' } 
        }
      ]
    }).sort({ dueDate: 1 });
    res.json(overdueBills);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch overdue report" });
  }
});

// Catch-all for undefined API routes
apiRouter.use((req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// Mount the API router
app.use("/api", apiRouter);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Server Error:", err);
  res.status(err.status || 500).json({ 
    error: err.message || "Internal Server Error"
  });
});

// Seeding function
async function seedDatabase() {
  if (mongoose.connection.readyState !== 1) {
    console.log("Skipping database seeding: No connection.");
    return;
  }
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create([
        { name: "Admin User", email: "admin@neoteric.in", role: "ADMIN", password: "password123" },
        { name: "Manager User", email: "manager@neoteric.in", role: "MANAGER", password: "password123" },
        { name: "Data Entry User", email: "dataentry@neoteric.in", role: "DATA_ENTRY", password: "password123" }
      ]);
      console.log("Seeded initial users");
    }

    const projectCount = await Project.countDocuments();
    const hasNewProject = await Project.findOne({ name: "Neoteric Head office" });
    
    if (projectCount === 0 || !hasNewProject) {
      if (projectCount > 0) {
        await Project.deleteMany({});
      }
      await Project.create([
        { name: "Neoteric Head office", code: "NHO", type: "Office", status: "Active" },
        { name: "Regal Garden", code: "RG", type: "Residential", status: "Active" },
        { name: "Garden City", code: "GC", type: "Residential", status: "Active" },
        { name: "Eden Garden", code: "EG", type: "Residential", status: "Active" },
        { name: "Zen Garden", code: "ZG", type: "Residential", status: "Active" },
        { name: "Nature park", code: "NP", type: "Residential", status: "Active" },
        { name: "Hyde park", code: "HP", type: "Residential", status: "Active" },
        { name: "Neo Meridian", code: "NM", type: "Commercial", status: "Active" },
        { name: "One business Center", code: "OBC", type: "Commercial", status: "Active" },
        { name: "wildflower", code: "WF", type: "Residential", status: "Active" },
        { name: "Marigold", code: "MG", type: "Residential", status: "Active" },
        { name: "Others", code: "OTH", type: "Other", status: "Active" }
      ]);
      console.log("Seeded initial projects");
    }

    const billTypeCount = await BillType.countDocuments();
    const requiredTypes = [
      { name: 'Electricity', description: 'Monthly electricity consumption bills', icon: 'Zap' },
      { name: 'Telecom', description: 'Mobile, Landline and Broadband bills', icon: 'Smartphone' },
      { name: 'Water', description: 'Water supply and usage bills', icon: 'Droplets' },
      { name: 'Solar Bill', description: 'Solar energy generation and usage', icon: 'Sun' },
      { name: 'Data (Internet)', description: 'Broadband and data services', icon: 'Wifi' },
      { name: 'Landline', description: 'Fixed line telephone services', icon: 'Phone' },
      { name: 'Property Tax (MCG)', description: 'Municipal Corporation property tax', icon: 'Building' },
      { name: 'Diversion Tax (RD)', description: 'Revenue department diversion tax', icon: 'FileText' },
      { name: 'Pollution Control', description: 'Environmental safety and compliance (CTE, CTO)', icon: 'Wind' },
      { name: 'CTE', description: 'Consent to Establish (Pollution Control)', icon: 'Wind' },
      { name: 'CTO', description: 'Consent to Operate (Pollution Control)', icon: 'Activity' },
      { name: 'Labour Insurance', description: 'Workforce insurance premiums', icon: 'ShieldCheck' },
      { name: 'Asset Insurance', description: 'Property and asset insurance', icon: 'ShieldAlert' },
      { name: 'Vehicle Insurance', description: 'Insurance for company vehicles', icon: 'Car' },
      { name: 'Employee Insurance', description: 'Group health and life insurance for employees', icon: 'Users' },
      { name: 'General Insurance', description: 'Other business insurance policies', icon: 'Briefcase' },
      { name: 'Air Conditioner AMC', description: 'AC maintenance contracts', icon: 'Activity' },
      { name: 'Elevator AMC', description: 'Lift maintenance contracts', icon: 'ArrowUpCircle' },
      { name: 'Waste Management', description: 'Garbage collection and disposal', icon: 'Trash2' },
      { name: 'Pest Control', description: 'Regular pest control services', icon: 'Bug' },
      { name: 'Fire Safety Audit', description: 'Annual fire safety inspections', icon: 'Flame' },
      { name: 'Electrical Safety Audit', description: 'Periodic electrical safety checks', icon: 'Zap' },
      { name: 'Mobile Recharge', description: 'Prepaid and postpaid mobile recharges', icon: 'Smartphone' },
      { name: 'Insurance', description: 'Comprehensive insurance policies', icon: 'ShieldCheck' }
    ];

    for (const type of requiredTypes) {
      await BillType.findOneAndUpdate(
        { name: type.name },
        { $setOnInsert: type },
        { upsert: true, new: true }
      );
    }
    console.log("Ensured all required bill types exist");

    const initialCompanies = [
      { companyName: "Swastik Grah Nirman Company", companyCode: "SGNC", status: "Active" },
      { companyName: "GLR Real Estate Pvt Ltd.", companyCode: "GLR", status: "Active" },
      { companyName: "Neoteric Properties Pvt Ltd.", companyCode: "NPPL", status: "Active" },
      { companyName: "Gravity Infrastructure Pvt. Ltd.", companyCode: "GIPL", status: "Active" },
      { companyName: "Reyan Infrastructure Company", companyCode: "RIC", status: "Active" },
      { companyName: "Rahul Gupta", companyCode: "RG", status: "Active" },
      { companyName: "Ramjidas Gupta", companyCode: "RJG", status: "Active" },
      { companyName: "Heaven Heights Pvt Ltd", companyCode: "HHPL", status: "Active" },
      { companyName: "Neoteric Housing India LLP", companyCode: "NHILLP", status: "Active" },
      { companyName: "Neoteric Recreational and Hospitality Service Pvt Ltd.", companyCode: "NRHSPL", status: "Active" }
    ];

    for (const company of initialCompanies) {
      await Company.findOneAndUpdate(
        { companyCode: company.companyCode },
        { $setOnInsert: company },
        { upsert: true, new: true }
      );
    }
    console.log("Ensured all initial companies exist");

    const billCount = await Bill.countDocuments();
    if (billCount === 0) {
      const today = new Date();
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      
      await Bill.create([
        {
          billId: "BILL-2024-001",
          propertyName: "Skyline Towers",
          utilityType: "Electricity",
          amount: 45000,
          billDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 5)),
          dueDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 20)),
          status: "Paid",
          paymentDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 18)),
          notes: "Monthly electricity bill for common areas"
        },
        {
          billId: "BILL-2024-002",
          propertyName: "Tech Park Alpha",
          utilityType: "Water",
          amount: 12500,
          billDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 10)),
          dueDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 25)),
          status: "Paid",
          paymentDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 22)),
          notes: "Water usage for Block A"
        },
        {
          billId: "BILL-2024-003",
          propertyName: "Neoteric Residency",
          utilityType: "Maintenance",
          amount: 85000,
          billDate: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
          dueDate: formatDate(new Date(today.getFullYear(), today.getMonth(), 15)),
          status: "Pending",
          notes: "Quarterly maintenance charges"
        },
        {
          billId: "BILL-2024-004",
          propertyName: "Gwalior Business Center",
          utilityType: "Electricity",
          amount: 120000,
          billDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 28)),
          dueDate: formatDate(new Date(today.getFullYear(), today.getMonth(), 10)),
          status: "Overdue",
          notes: "High consumption due to summer AC usage"
        }
      ]);
      console.log("Seeded initial bills");
    }
  } catch (err) {
    console.error("Seeding error:", err);
  }
}

async function removeDuplicateBills() {
  if (mongoose.connection.readyState !== 1) return;
  console.log("🔍 Checking for duplicate bills in Telecom and Solar...");
  
  try {
    // Telecom Duplicates
    const telecomTypes = ['Telecom', 'Data (Internet)', 'Landline', 'Mobile Recharge'];
    const telecomDuplicates = await Bill.aggregate([
      { $match: { utilityType: { $in: telecomTypes }, phoneNumber: { $exists: true, $ne: "" } } },
      { $group: {
          _id: { phoneNumber: "$phoneNumber", billingPeriod: "$billingPeriod", year: "$year", utilityType: "$utilityType" },
          count: { $sum: 1 },
          ids: { $push: "$_id" }
      }},
      { $match: { count: { $gt: 1 } } }
    ]);

    for (const dup of telecomDuplicates) {
      const removeIds = dup.ids.slice(1);
      await Bill.deleteMany({ _id: { $in: removeIds } });
      console.log(`🗑️ Removed ${removeIds.length} duplicate Telecom bills for ${dup._id.phoneNumber} (${dup._id.billingPeriod})`);
    }

    // Solar Duplicates
    const solarDuplicates = await Bill.aggregate([
      { $match: { utilityType: 'Solar Bill', consumerNumber: { $exists: true, $ne: "" } } },
      { $group: {
          _id: { consumerNumber: "$consumerNumber", month: "$month", year: "$year" },
          count: { $sum: 1 },
          ids: { $push: "$_id" }
      }},
      { $match: { count: { $gt: 1 } } }
    ]);

    for (const dup of solarDuplicates) {
      const removeIds = dup.ids.slice(1);
      await Bill.deleteMany({ _id: { $in: removeIds } });
      console.log(`🗑️ Removed ${removeIds.length} duplicate Solar bills for Consumer ${dup._id.consumerNumber} (${dup._id.month}/${dup._id.year})`);
    }
  } catch (err) {
    console.error("❌ Cleanup error:", err);
  }
}

// Migration function to assign category to existing bills
async function migrateBills() {
  if (mongoose.connection.readyState !== 1) return;
  
  // First clean up duplicates
  await removeDuplicateBills();

  const bills = await Bill.find({ category: { $exists: false } });
  if (bills.length > 0) {
    console.log(`Migrating ${bills.length} bills to include category...`);
    const utility = ['Electricity', 'Water', 'Solar Bill'];
    const telecom = ['Telecom', 'Data (Internet)', 'Landline', 'Mobile Recharge'];
    const insurance = ['Labour Insurance', 'Asset Insurance', 'Insurance', 'Vehicle Insurance', 'Employee Insurance', 'General Insurance'];
    const government = ['Property Tax (MCG)', 'Diversion Tax (RD)', 'Pollution Control', 'CTE', 'CTO', 'Waste Management', 'Pest Control', 'Fire Safety Audit', 'Electrical Safety Audit', 'Air Conditioner AMC', 'Elevator AMC'];

    for (const bill of bills) {
      const type = bill.utilityType;
      if (utility.includes(type)) bill.category = 'utility';
      else if (telecom.includes(type)) bill.category = 'telecom';
      else if (insurance.includes(type)) bill.category = 'insurance';
      else if (government.includes(type)) bill.category = 'government_tax';
      else bill.category = 'other';
      
      if (!bill.subcategory) {
        if (type === 'Vehicle Insurance') bill.subcategory = 'vehicle_insurance';
        else if (type === 'Employee Insurance') bill.subcategory = 'employee_insurance';
        else if (['Insurance', 'General Insurance'].includes(type)) bill.subcategory = 'general_insurance';
        else if (['Pollution Control', 'CTE', 'CTO'].includes(type)) bill.subcategory = 'pollution_control';
        else bill.subcategory = type.toLowerCase().replace(/\s+/g, '_');
      }
      await bill.save();
    }
    console.log('Migration complete.');
  }
}

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const buildPath = path.join(process.cwd(), "build");
    app.use(express.static(buildPath));
    app.use((req, res) => {
      res.sendFile(path.join(buildPath, "index.html"));
    });
  }

  // Seed data and start reminder checks after connection
  mongoose.connection.once("open", () => {
    seedDatabase();
    migrateBills();
    
    // Set reminder schedule at 10 AM and 4 PM IST
    cron.schedule('0 10,16 * * *', () => {
      console.log('⏰ Running scheduled reminders at 10 AM / 4 PM IST');
      checkAndSendDueReminders();
    }, {
      timezone: "Asia/Kolkata"
    });
    
    console.log("🗓️ Reminder schedule set for 10:00 and 16:00 IST");
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
