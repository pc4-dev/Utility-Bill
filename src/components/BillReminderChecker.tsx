import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../NotificationContext';
import { Bill } from '../types';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import toast from 'react-hot-toast';

interface Props {
  bills: Bill[];
}

/**
 * Checks for Utility, Telecom, and Solar bills nearing their due date and generates in-app notifications.
 * Requirement: 3 days before due date.
 */
export const BillReminderChecker: React.FC<Props> = ({ bills }) => {
  const { addNotification, notifications } = useNotifications();
  const checkedRef = useRef<string[]>([]); // Keep track of bills checked in this session

  useEffect(() => {
    if (!bills.length) return;

    // Filter for all pending/overdue bills that have a due date
    const billsToCheck = bills.filter(b => 
      (b.status === 'Pending' || b.status === 'Overdue' || b.status === 'PENDING') &&
      b.utilityType !== 'Insurance' && // Handled by InsuranceReminderChecker
      b.subcategory !== 'pollution_control' // Handled by PollutionReminderChecker
    );
    
    const today = startOfDay(new Date());

    billsToCheck.forEach(bill => {
      if (!bill.dueDate) return;

      const dueDate = parseISO(bill.dueDate);
      const daysUntilDue = differenceInDays(dueDate, today);
      
      // Lead days defined by user: 3 days
      const leadDays = 3;

      // Check if we already alerted for this specific bill during this session
      const billKey = `${bill.id || bill._id}-${daysUntilDue}`;
      if (checkedRef.current.includes(billKey)) return;

      // Notify if within lead days OR if overdue
      if (daysUntilDue <= leadDays) {
        const isOverdue = daysUntilDue < 0;
        const title = isOverdue ? `⚠️ ${bill.utilityType} Bill Overdue` : `🔔 ${bill.utilityType} Bill Due Soon`;
        
        const description = isOverdue
          ? `The ${bill.utilityType} bill for ${bill.propertyName} was due on ${bill.dueDate}. Amount: ₹${bill.amount.toLocaleString()}. Please pay immediately.`
          : `The ${bill.utilityType} bill for ${bill.propertyName} is due in ${daysUntilDue} days (${bill.dueDate}). Amount: ₹${bill.amount.toLocaleString()}.`;
        
        const type = isOverdue ? 'CRITICAL' : daysUntilDue <= 1 ? 'WARNING' : 'INFO';

        // Check if we already have a similar notification in the logs to prevent duplicates
        const alreadyInLog = notifications.some(n => 
          n.relatedName === bill.propertyName && 
          n.title === title &&
          (differenceInDays(new Date(), new Date(n.timestamp)) < 1)
        );

        if (!alreadyInLog) {
          addNotification(title, description, bill.propertyName, type as any);
          
          if (isOverdue) {
            toast.error(description, { duration: 6000, icon: '⚠️' });
          } else if (daysUntilDue <= 3) {
            toast.error(description, { duration: 5000, icon: '🔔' });
          }

          console.log(`[BILL_ALERT] Notification generated for ${bill.billId}.`);
          checkedRef.current.push(billKey);
        }
      }
    });
  }, [bills, addNotification, notifications]);

  return null;
};
