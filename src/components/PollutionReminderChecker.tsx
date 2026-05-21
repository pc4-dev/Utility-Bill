import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../NotificationContext';
import { Bill } from '../types';
import { differenceInDays, parseISO, startOfDay, addMonths } from 'date-fns';
import toast from 'react-hot-toast';

interface Props {
  bills: Bill[];
}

/**
 * Checks for Pollution Control (CTO) documents nearing expiry and generates in-app notifications.
 * Requirement: 7 months before expiry date for CTO.
 */
export const PollutionReminderChecker: React.FC<Props> = ({ bills }) => {
  const { addNotification, notifications } = useNotifications();
  const checkedRef = useRef<string[]>([]); // Keep track of bills checked in this session

  useEffect(() => {
    if (!bills.length) return;

    const ctoBills = bills.filter(b => 
      b.subcategory === 'pollution_control' && 
      b.documentType === 'CTO' &&
      b.validityTo
    );
    
    const today = startOfDay(new Date());

    ctoBills.forEach(bill => {
      if (!bill.validityTo) return;

      const expiryDate = parseISO(bill.validityTo);
      const daysUntilExpiry = differenceInDays(expiryDate, today);
      
      // 7 months is approximately 210 days
      const leadDays = 210; 

      // Check if we already alerted for this specific bill during this session
      const billKey = `${bill.id || bill._id}-${daysUntilExpiry}`;
      if (checkedRef.current.includes(billKey)) return;

      if (daysUntilExpiry <= leadDays) {
        const isExpired = daysUntilExpiry < 0;
        const title = isExpired ? '⚠️ Pollution Consent Expired' : '🔔 CTO Renewal Reminder';
        
        const description = isExpired
          ? `Pollution Consent (CTO) for ${bill.propertyName} expired on ${bill.validityTo}. Please start the renewal process immediately.`
          : `Pollution Consent (CTO) for ${bill.propertyName} is expiring in ${Math.ceil(daysUntilExpiry / 30)} months (${bill.validityTo}). Please initiate the NEXT PROCESS for renewal.`;
        
        const type = isExpired ? 'CRITICAL' : daysUntilExpiry <= 30 ? 'WARNING' : 'INFO';

        // Check if we already have a similar notification in the logs to prevent duplicates
        const alreadyInLog = notifications.some(n => 
          n.relatedName === bill.propertyName && 
          n.title === title &&
          (differenceInDays(new Date(), new Date(n.timestamp)) < 7) // Don't notify twice in a week for pollution
        );

        if (!alreadyInLog) {
          addNotification(title, description, bill.propertyName, type as any);
          
          if (isExpired) {
            toast.error(description, { duration: 6000, icon: '⚠️' });
          } else if (daysUntilExpiry <= 30) {
            toast.error(description, { duration: 5000, icon: '🔔' });
          } else if (daysUntilExpiry <= 210 && !checkedRef.current.includes(billKey)) {
             // Just show a small info toast if it's the first time seeing it in the 7 month window
             toast.success(description, { duration: 4000, icon: '📋' });
          }

          console.log(`[POLLUTION_ALERT] Notification generated for ${bill.consentNumber}.`);
          checkedRef.current.push(billKey);
        }
      }
    });
  }, [bills, addNotification, notifications]);

  return null;
};
