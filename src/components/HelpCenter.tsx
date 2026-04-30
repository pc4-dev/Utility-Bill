import React from 'react';
import { motion } from 'framer-motion';
import { 
  Info, 
  GitMerge, 
  FileText, 
  LayoutDashboard,
  CheckCircle2,
  Building2,
  Users,
  Bell,
  ShieldCheck,
  LifeBuoy
} from 'lucide-react';

export const HelpCenter: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8 pb-12"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Help Center</h2>
        <p className="text-sm text-gray-500 font-medium mt-1">Guides and documentation for the Utility Bill Workflow Management System.</p>
      </div>

      {/* 1. System Overview */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-orange-50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Info className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-gray-900">1. System Overview</h3>
        </div>
        <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>This is a Real Estate Bill & Financial Workflow Management System.</span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>It manages project-based bills efficiently.</span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>It tracks approvals across multiple departments.</span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>It monitors payments and ensures timely processing.</span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>It provides analytics & alerts for budget and overdue tracking.</span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>It works with role-based access to ensure security and proper delegation.</span>
          </p>
        </div>
      </section>

      {/* 2. Workflow Process Guide */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-orange-50">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
            <GitMerge className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-gray-900">2. Workflow Process Guide</h3>
        </div>
        
        <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-orange-200 before:to-transparent">
          
          {/* Step 1 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-orange-100 text-orange-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              <span className="font-bold text-sm">1</span>
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-1">Bill Uploaded by Admin</h4>
              <p className="text-xs text-gray-500 leading-relaxed">The Admin initiates the process by uploading the bill details, selecting the project, and setting the priority and due date.</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-orange-100 text-orange-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              <span className="font-bold text-sm">2</span>
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-1">Payment Prepared by Account Executive</h4>
              <p className="text-xs text-gray-500 leading-relaxed">The Account Executive reviews the uploaded bill and prepares the payment details, ensuring all information is accurate.</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-orange-100 text-orange-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              <span className="font-bold text-sm">3</span>
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-1">Payment Approved by Account Head</h4>
              <p className="text-xs text-gray-500 leading-relaxed">The Account Head verifies the prepared payment against the budget and approves it for final processing.</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-orange-100 text-orange-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              <span className="font-bold text-sm">4</span>
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-1">Payment Confirmed by Account Manager</h4>
              <p className="text-xs text-gray-500 leading-relaxed">The Account Manager executes the payment and confirms the transaction details in the system.</p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-green-100 text-green-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-green-50 p-4 rounded-2xl border border-green-100 shadow-sm">
              <h4 className="font-bold text-green-900 mb-1">Final Entry Completed</h4>
              <p className="text-xs text-green-700 leading-relaxed">The bill is marked as closed, and the final accounting entry is recorded for auditing purposes.</p>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Bill Management Guide */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-orange-50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-gray-900">3. Bill Management Guide</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">How to create a bill</h4>
            <p className="text-xs text-gray-600 leading-relaxed">Click the "Add New Bill" button in the sidebar or Bill Management page. Fill in the required details such as Bill Number, Type, and Amount, then submit.</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">How to select a project</h4>
            <p className="text-xs text-gray-600 leading-relaxed">During bill creation, use the "Project Name" dropdown. Only active projects configured in Settings will appear here.</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">How to set priority</h4>
            <p className="text-xs text-gray-600 leading-relaxed">Select Normal, Urgent, or Critical priority. Critical bills are highlighted in red and pushed to the top of the queue.</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">How due date works</h4>
            <p className="text-xs text-gray-600 leading-relaxed">The due date determines when a bill becomes Overdue. The system automatically sends alerts as the due date approaches.</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">What is Detailed Bill View</h4>
            <p className="text-xs text-gray-600 leading-relaxed">Clicking on a bill card expands it to show the full workflow history, payment records, and detailed breakdown of amounts.</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">How status changes automatically</h4>
            <p className="text-xs text-gray-600 leading-relaxed">As users complete workflow steps (e.g., Payment Prepared), the bill's status automatically updates from Pending to In Process, Paid, and Closed.</p>
          </div>
        </div>
      </section>

      {/* 4. Dashboard Guide */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-orange-50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-gray-900">4. Dashboard Guide</h3>
        </div>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-gray-900 text-sm mb-3">Status Meanings</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">Total Bills</span>
                <p className="text-xs text-gray-600">All bills currently tracked in the system across all statuses.</p>
              </div>
              <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/50">
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block mb-1">Pending</span>
                <p className="text-xs text-gray-600">Newly uploaded bills awaiting initial processing.</p>
              </div>
              <div className="p-4 rounded-xl border border-yellow-100 bg-yellow-50/50">
                <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider block mb-1">In Process</span>
                <p className="text-xs text-gray-600">Bills currently moving through the approval workflow.</p>
              </div>
              <div className="p-4 rounded-xl border border-red-100 bg-red-50/50">
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider block mb-1">Overdue</span>
                <p className="text-xs text-gray-600">Bills that have passed their designated due date.</p>
              </div>
              <div className="p-4 rounded-xl border border-green-100 bg-green-50/50">
                <span className="text-xs font-bold text-green-600 uppercase tracking-wider block mb-1">Paid</span>
                <p className="text-xs text-gray-600">Bills where payment has been processed and confirmed.</p>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Closed</span>
                <p className="text-xs text-gray-600">Fully resolved bills with final accounting entries completed.</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">Account Department Financial Summary</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              The financial summary provides a real-time overview of the organization's liabilities and completed payments. 
              <strong> Total Pending Amount</strong> represents the sum of all bills that have not yet been paid, helping the finance team manage cash flow. 
              <strong> Total Paid Amount</strong> tracks the total expenditure for completed bills. 
              These metrics are automatically updated as bills progress through the workflow.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Project & Budget Guide */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-orange-50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-gray-900">5. Project & Budget Guide</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">How to add project</h4>
            <p className="text-xs text-gray-600 leading-relaxed">Go to Settings &gt; Projects. Click "Add Project" and enter the project name, code, type, and status.</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">How to configure project budget</h4>
            <p className="text-xs text-gray-600 leading-relaxed">In the project settings, set the Annual Budget and Alert Threshold. This determines when budget warnings are triggered.</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">What is Budget Alert (80%)</h4>
            <p className="text-xs text-gray-600 leading-relaxed">A warning triggered when total project expenses reach the configured threshold (e.g., 80%) of the annual budget.</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">What is Critical Alert (100%)</h4>
            <p className="text-xs text-gray-600 leading-relaxed">A critical alert triggered when project expenses equal or exceed 100% of the allocated annual budget.</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 md:col-span-2">
            <h4 className="font-bold text-gray-900 text-sm mb-2">How Budget Usage % works</h4>
            <p className="text-xs text-gray-600 leading-relaxed">The system automatically calculates the ratio of total bill amounts linked to a project against its annual budget. This percentage is displayed in the Analytics dashboard and triggers alerts on the main Dashboard.</p>
          </div>
        </div>
      </section>

      {/* 6. Roles & Permissions Guide */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-orange-50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-gray-900">6. Roles & Permissions Guide</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <div className="w-24 shrink-0 font-bold text-sm text-gray-900">Admin</div>
            <div className="text-sm text-gray-600">Full Control. Can manage users, settings, projects, and oversee all bills.</div>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <div className="w-24 shrink-0 font-bold text-sm text-gray-900">Account Executive</div>
            <div className="text-sm text-gray-600">Responsible for bill entry and payment preparation.</div>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <div className="w-24 shrink-0 font-bold text-sm text-gray-900">Account Head</div>
            <div className="text-sm text-gray-600">Approval authority. Verifies prepared payments against budgets.</div>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <div className="w-24 shrink-0 font-bold text-sm text-gray-900">Account Manager</div>
            <div className="text-sm text-gray-600">Payment confirmation. Executes payments and finalizes transactions.</div>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <div className="w-24 shrink-0 font-bold text-sm text-gray-900">Viewer</div>
            <div className="text-sm text-gray-600">Read-only access to dashboards and reports. Cannot modify data.</div>
          </div>
        </div>
      </section>

      {/* 7. Alerts & Notifications */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-orange-50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <Bell className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-gray-900">7. Alerts & Notifications</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <h4 className="font-bold text-gray-900 text-sm mb-1">Overdue Alert</h4>
            <p className="text-xs text-gray-600">Triggered when a bill passes its due date without payment.</p>
          </div>
          <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <h4 className="font-bold text-gray-900 text-sm mb-1">Upcoming Due Alert</h4>
            <p className="text-xs text-gray-600">Warning sent a few days before a bill's due date.</p>
          </div>
          <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <h4 className="font-bold text-gray-900 text-sm mb-1">Budget Warning</h4>
            <p className="text-xs text-gray-600">Alerts when project expenses reach the configured threshold.</p>
          </div>
          <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <h4 className="font-bold text-gray-900 text-sm mb-1">Large Amount Alert</h4>
            <p className="text-xs text-gray-600">Special notification for bills exceeding standard limits.</p>
          </div>
          <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50 md:col-span-2">
            <h4 className="font-bold text-gray-900 text-sm mb-1">Email Summary</h4>
            <p className="text-xs text-gray-600">Periodic email reports summarizing pending actions and system status.</p>
          </div>
        </div>
      </section>

      {/* 8. Backup & Security */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-orange-50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-gray-900">8. Backup & Security <span className="text-sm font-medium text-gray-400 ml-2">(if enabled)</span></h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">Manual Backup</h4>
            <p className="text-xs text-gray-600 leading-relaxed">Admins can trigger a manual backup of all system data from the Settings &gt; Security page.</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">Restore Process</h4>
            <p className="text-xs text-gray-600 leading-relaxed">Data can be restored from previous backups by contacting system support or using the Admin restore tool.</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">Two-Factor Authentication</h4>
            <p className="text-xs text-gray-600 leading-relaxed">Enhances security by requiring a secondary verification code during login.</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-sm mb-2">Session Timeout</h4>
            <p className="text-xs text-gray-600 leading-relaxed">Automatically logs users out after a period of inactivity to protect sensitive financial data.</p>
          </div>
        </div>
      </section>

      {/* 9. Troubleshooting */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-orange-50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-gray-900">9. Troubleshooting</h3>
        </div>
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <h4 className="font-bold text-gray-900 text-sm mb-1">Bill not updating</h4>
            <p className="text-xs text-gray-600">Ensure you have the correct role permissions to modify the bill at its current workflow stage.</p>
          </div>
          <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <h4 className="font-bold text-gray-900 text-sm mb-1">Payment not reflecting</h4>
            <p className="text-xs text-gray-600">Check if the payment was fully confirmed by the Account Manager. Pending payments do not update totals.</p>
          </div>
          <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <h4 className="font-bold text-gray-900 text-sm mb-1">Project not visible</h4>
            <p className="text-xs text-gray-600">Verify in Settings &gt; Projects that the project status is set to 'Active'.</p>
          </div>
          <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <h4 className="font-bold text-gray-900 text-sm mb-1">Dashboard mismatch</h4>
            <p className="text-xs text-gray-600">Clear any active filters on the Dashboard to see the complete data overview.</p>
          </div>
          <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <h4 className="font-bold text-gray-900 text-sm mb-1">Login issue</h4>
            <p className="text-xs text-gray-600">Clear your browser cache or contact the Admin to reset your credentials.</p>
          </div>
        </div>
      </section>

    </motion.div>
  );
};
