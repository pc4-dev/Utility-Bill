import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import toast from 'react-hot-toast';
import { Bill } from './types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuth();
  const { addNotification } = useNotifications();

  useEffect(() => {
    // Only connect if authenticated (optional, but good practice)
    // For this app, we'll connect and then maybe join rooms if needed
    const newSocket = io(window.location.origin, {
      transports: ['websocket'],
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewBill = (bill: Bill) => {
      toast.success(`New bill generated for ${bill.propertyName}`, {
        duration: 5000,
        icon: '📄',
      });
      addNotification(
        'New Bill Generated',
        `A new ${bill.utilityType} bill of ${bill.amount} has been added.`,
        bill.propertyName,
        'Info'
      );
    };

    const handleBillProcessing = (data: { status: string; jobId: string; fileName: string }) => {
      toast.loading(`Processing ${data.fileName}...`, {
        id: data.jobId,
        duration: 10000,
      });
      addNotification(
        'Processing Started',
        `Started extracting data from ${data.fileName}`,
        'System',
        'Info'
      );
    };

    const handleBillExtracted = (data: { jobId: string; data: any; fileUrl: string; fileName: string; utilityType: string }) => {
      toast.success(`Data extracted from ${data.fileName}`, {
        id: data.jobId,
      });
      addNotification(
        'Data Extracted',
        `Successfully extracted data from ${data.fileName}. Form is ready for verification.`,
        data.utilityType,
        'Success'
      );
      
      // Dispatch custom event for modules to listen to
      const event = new CustomEvent('bill:extracted', { detail: data });
      window.dispatchEvent(event);
    };

    const handleBillError = (data: { jobId: string; message: string }) => {
      toast.error(`Extraction failed: ${data.message}`, {
        id: data.jobId,
      });
      addNotification(
        'Extraction Failed',
        `Could not extract data: ${data.message}`,
        'Error',
        'Error'
      );
    };

    socket.on('bill:created', handleNewBill);
    socket.on('bill_processing', handleBillProcessing);
    socket.on('bill_extracted', handleBillExtracted);
    socket.on('bill_error', handleBillError);

    return () => {
      socket.off('bill:created', handleNewBill);
      socket.off('bill_processing', handleBillProcessing);
      socket.off('bill_extracted', handleBillExtracted);
      socket.off('bill_error', handleBillError);
    };
  }, [socket, addNotification]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
