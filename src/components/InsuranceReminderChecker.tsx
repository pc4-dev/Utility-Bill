import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../NotificationContext';
import { Bill } from '../types';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import toast from 'react-hot-toast';

interface Props {
  bills: Bill[];
}

/**
 * Checks for insurance policies nearing expiry and generates in-app notifications.
 * This component runs silently in the background of the application.
 */
export const InsuranceReminderChecker: React.FC<Props> = ({ bills }) => {
  const { addNotification, notifications } = useNotifications();
  const checkedRef = useRef<string[]>([]); // Keep track of bills checked in this session

  useEffect(() => {
    if (!bills.length) return;

    const insuranceBills = bills.filter(b => 
      b.utilityType === 'Insurance' && 
      (b.status === 'Pending' || b.status === 'Overdue')
    );
    
    const today = startOfDay(new Date());

    insuranceBills.forEach(bill => {
      if (!bill.dueDate) return;

      const expiryDate = parseISO(bill.dueDate);
      const daysUntilExpiry = differenceInDays(expiryDate, today);
      
      // 7 months is approximately 210 days
      const leadDays = 210; 

      // Check if we already alerted for this specific bill during this session to avoid loop/spam
      const billKey = `${bill.id || bill._id}-${daysUntilExpiry}`;
      if (checkedRef.current.includes(billKey)) return;

      if (daysUntilExpiry <= leadDays) {
        const isExpired = daysUntilExpiry < 0;
        const title = isExpired ? '⚠️ Policy Expired' : '🔔 Policy Expiry Alert';
        
        let prefix = 'Insurance';
        if (bill.subcategory === 'vehicle_insurance') prefix = 'Vehicle Insurance';
        else if (bill.subcategory === 'employee_insurance') prefix = 'Employee Insurance';
        else if (bill.subcategory === 'general_insurance') prefix = 'General Insurance';

        const description = isExpired
          ? `${prefix} policy ${bill.policyNumber || 'N/A'} for ${bill.propertyName} expired on ${bill.dueDate}. Please renew immediately.`
          : `${prefix} policy ${bill.policyNumber || 'N/A'} for ${bill.propertyName} is expiring in ${daysUntilExpiry > 30 ? Math.ceil(daysUntilExpiry / 30) + ' months' : daysUntilExpiry + ' days'} (${bill.dueDate}).`;
        
        const type = isExpired ? 'CRITICAL' : daysUntilExpiry <= 30 ? 'WARNING' : 'INFO';

        // Check if we already have a similar notification in the logs to prevent duplicates across refreshes
        const alreadyInLog = notifications.some(n => 
          n.relatedName === bill.propertyName && 
          n.title === title &&
          (differenceInDays(new Date(), new Date(n.timestamp)) < 1) // Don't notify twice in a day
        );

        if (!alreadyInLog) {
          addNotification(title, description, bill.propertyName, type);
          
          if (isExpired) {
            toast.error(description, { duration: 6000, icon: '⚠️' });
          } else if (daysUntilExpiry <= 7) {
            toast.error(description, { duration: 5000, icon: '🔔' });
          }

          console.log(`[EXPIRY_ALERT] Notification generated for ${bill.policyNumber}. Simulation: Email alert sent to user.`);
          checkedRef.current.push(billKey);
        }
      }
    });
  }, [bills, addNotification, notifications]);

  return null;
};
