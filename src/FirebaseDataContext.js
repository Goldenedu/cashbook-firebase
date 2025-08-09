import React, { createContext, useContext, useState, useEffect } from 'react';
import { cashBookService, authService } from '../firebase-services.js';

const FirebaseDataContext = createContext();

export const useFirebaseData = () => {
  const context = useContext(FirebaseDataContext);
  if (!context) {
    throw new Error('useFirebaseData must be used within a FirebaseDataProvider');
  }
  return context;
};

export const FirebaseDataProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Firebase data states
  const [firebaseIncomeEntries, setFirebaseIncomeEntries] = useState([]);
  const [firebaseExpenseEntries, setFirebaseExpenseEntries] = useState([]);
  const [firebaseBankEntries, setFirebaseBankEntries] = useState([]);
  const [firebaseCashEntries, setFirebaseCashEntries] = useState([]);
  const [firebaseCustomers, setFirebaseCustomers] = useState([]);
  
  // Sync status
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        // Start real-time listeners when user is authenticated
        setupRealtimeListeners(user.uid);
      } else {
        // Clear data when user signs out
        clearAllData();
      }
    });

    return () => unsubscribe();
  }, []);

  const setupRealtimeListeners = (userId) => {
    setSyncStatus('syncing');
    
    // Income entries listener
    const unsubscribeIncome = cashBookService.subscribeToIncomeEntries(userId, (entries) => {
      setFirebaseIncomeEntries(entries);
    });

    // Expense entries listener
    const unsubscribeExpense = cashBookService.subscribeToExpenseEntries(userId, (entries) => {
      setFirebaseExpenseEntries(entries);
    });

    // Customers listener
    const unsubscribeCustomers = cashBookService.subscribeToCustomers(userId, (customers) => {
      setFirebaseCustomers(customers);
    });

    setSyncStatus('synced');

    // Return cleanup function
    return () => {
      unsubscribeIncome();
      unsubscribeExpense();
      unsubscribeCustomers();
    };
  };

  const clearAllData = () => {
    setFirebaseIncomeEntries([]);
    setFirebaseExpenseEntries([]);
    setFirebaseBankEntries([]);
    setFirebaseCashEntries([]);
    setFirebaseCustomers([]);
    setSyncStatus('idle');
  };

  // Firebase CRUD operations
  const firebaseOperations = {
    // Income operations
    async addIncomeEntry(entry) {
      if (!user) return { success: false, error: 'User not authenticated' };
      setSyncStatus('syncing');
      const result = await cashBookService.addIncomeEntry(user.uid, entry);
      setSyncStatus(result.success ? 'synced' : 'error');
      return result;
    },

    // Expense operations
    async addExpenseEntry(entry) {
      if (!user) return { success: false, error: 'User not authenticated' };
      setSyncStatus('syncing');
      const result = await cashBookService.addExpenseEntry(user.uid, entry);
      setSyncStatus(result.success ? 'synced' : 'error');
      return result;
    },

    // Bank operations
    async addBankEntry(entry) {
      if (!user) return { success: false, error: 'User not authenticated' };
      setSyncStatus('syncing');
      const result = await cashBookService.addBankEntry(user.uid, entry);
      setSyncStatus(result.success ? 'synced' : 'error');
      return result;
    },

    // Cash operations
    async addCashEntry(entry) {
      if (!user) return { success: false, error: 'User not authenticated' };
      setSyncStatus('syncing');
      const result = await cashBookService.addCashEntry(user.uid, entry);
      setSyncStatus(result.success ? 'synced' : 'error');
      return result;
    },

    // Customer operations
    async addCustomer(customer) {
      if (!user) return { success: false, error: 'User not authenticated' };
      setSyncStatus('syncing');
      const result = await cashBookService.addCustomer(user.uid, customer);
      setSyncStatus(result.success ? 'synced' : 'error');
      return result;
    },

    // Bulk sync operations
    async syncLocalDataToFirebase(localData) {
      if (!user) return { success: false, error: 'User not authenticated' };
      
      setSyncStatus('syncing');
      const results = {
        income: [],
        expense: [],
        bank: [],
        cash: [],
        customers: []
      };

      try {
        // Sync income entries
        if (localData.incomeEntries) {
          for (const entry of localData.incomeEntries) {
            const result = await cashBookService.addIncomeEntry(user.uid, entry);
            results.income.push(result);
          }
        }

        // Sync expense entries (office, salary, kitchen)
        if (localData.officeEntries) {
          for (const entry of localData.officeEntries) {
            const result = await cashBookService.addExpenseEntry(user.uid, { ...entry, type: 'office' });
            results.expense.push(result);
          }
        }

        if (localData.salaryEntries) {
          for (const entry of localData.salaryEntries) {
            const result = await cashBookService.addExpenseEntry(user.uid, { ...entry, type: 'salary' });
            results.expense.push(result);
          }
        }

        if (localData.kitchenEntries) {
          for (const entry of localData.kitchenEntries) {
            const result = await cashBookService.addExpenseEntry(user.uid, { ...entry, type: 'kitchen' });
            results.expense.push(result);
          }
        }

        setSyncStatus('synced');
        return { success: true, results };
      } catch (error) {
        setSyncStatus('error');
        return { success: false, error: error.message };
      }
    }
  };

  const value = {
    // Auth state
    user,
    loading,
    
    // Firebase data
    firebaseIncomeEntries,
    firebaseExpenseEntries,
    firebaseBankEntries,
    firebaseCashEntries,
    firebaseCustomers,
    
    // Sync status
    syncStatus,
    
    // Operations
    ...firebaseOperations,
    
    // Utility functions
    clearAllData,
    setupRealtimeListeners
  };

  return (
    <FirebaseDataContext.Provider value={value}>
      {children}
    </FirebaseDataContext.Provider>
  );
};

export default FirebaseDataProvider;
