import React, { createContext, useContext, useState, useEffect } from 'react';
import { cashBookService } from './firebase-services';
import { authService } from './firebase-services';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  // Get current user for Firebase operations
  const [user, setUser] = useState(null);
  
  // Set up Firebase auth state listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  
  // Local data states (your existing data structure)
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [officeEntries, setOfficeEntries] = useState([]);
  const [salaryEntries, setSalaryEntries] = useState([]);
  const [kitchenEntries, setKitchenEntries] = useState([]);
  const [bankEntries, setBankEntries] = useState([]);
  const [cashEntries, setCashEntries] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Load data from Firebase when user is authenticated
  useEffect(() => {
    const loadFirebaseData = async () => {
      if (!user) return;
      
      try {
        console.log('Loading data from Firebase for user:', user.uid);
        
        // Load Income entries from Firebase
        const incomeResult = await cashBookService.getIncomeEntries(user.uid);
        if (incomeResult.success) {
          setIncomeEntries(incomeResult.data);
          console.log('Loaded', incomeResult.data.length, 'income entries from Firebase');
        }
        
        // Load Office entries from Firebase (expense type: office)
        const expenseResult = await cashBookService.getExpenseEntries(user.uid);
        if (expenseResult.success) {
          const officeEntries = expenseResult.data.filter(entry => entry.type === 'office');
          const salaryEntries = expenseResult.data.filter(entry => entry.type === 'salary');
          const kitchenEntries = expenseResult.data.filter(entry => entry.type === 'kitchen');
          
          setOfficeEntries(officeEntries);
          setSalaryEntries(salaryEntries);
          setKitchenEntries(kitchenEntries);
          
          console.log('Loaded', officeEntries.length, 'office entries from Firebase');
          console.log('Loaded', salaryEntries.length, 'salary entries from Firebase');
          console.log('Loaded', kitchenEntries.length, 'kitchen entries from Firebase');
        }
        
        // Load Bank entries from Firebase
        const bankResult = await cashBookService.getBankEntries(user.uid);
        if (bankResult.success) {
          setBankEntries(bankResult.data);
          console.log('Loaded', bankResult.data.length, 'bank entries from Firebase');
        }
        
        // Load Cash entries from Firebase
        const cashResult = await cashBookService.getCashEntries(user.uid);
        if (cashResult.success) {
          setCashEntries(cashResult.data);
          console.log('Loaded', cashResult.data.length, 'cash entries from Firebase');
        }
        
        // Load Customers from Firebase
        const customersResult = await cashBookService.getCustomers(user.uid);
        if (customersResult.success) {
          setCustomers(customersResult.data);
          console.log('Loaded', customersResult.data.length, 'customers from Firebase');
        }
        
      } catch (error) {
        console.error('Error loading data from Firebase:', error);
        // Fallback to localStorage if Firebase fails
        loadLocalData();
      }
    };

    const loadLocalData = () => {
      try {
        const savedIncomeEntries = localStorage.getItem('incomeEntries');
        const savedOfficeEntries = localStorage.getItem('officeEntries');
        const savedSalaryEntries = localStorage.getItem('salaryEntries');
        const savedKitchenEntries = localStorage.getItem('kitchenEntries');
        const savedBankEntries = localStorage.getItem('bankEntries');
        const savedCashEntries = localStorage.getItem('cashEntries');
        const savedCustomers = localStorage.getItem('customers');

        if (savedIncomeEntries) setIncomeEntries(JSON.parse(savedIncomeEntries));
        if (savedOfficeEntries) setOfficeEntries(JSON.parse(savedOfficeEntries));
        if (savedSalaryEntries) setSalaryEntries(JSON.parse(savedSalaryEntries));
        if (savedKitchenEntries) setKitchenEntries(JSON.parse(savedKitchenEntries));
        if (savedBankEntries) setBankEntries(JSON.parse(savedBankEntries));
        if (savedCashEntries) setCashEntries(JSON.parse(savedCashEntries));
        if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
      }
    };

    // Firebase is working! Load from Firebase when user is authenticated
    if (user) {
      console.log('🔥 Loading data from Firebase for user:', user.uid);
      loadFirebaseData();
    } else {
      console.log('📦 Loading data from localStorage (no user authenticated)');
      loadLocalData();
    }
  }, [user]);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('incomeEntries', JSON.stringify(incomeEntries));
  }, [incomeEntries]);

  useEffect(() => {
    localStorage.setItem('officeEntries', JSON.stringify(officeEntries));
  }, [officeEntries]);

  useEffect(() => {
    localStorage.setItem('salaryEntries', JSON.stringify(salaryEntries));
  }, [salaryEntries]);

  useEffect(() => {
    localStorage.setItem('kitchenEntries', JSON.stringify(kitchenEntries));
  }, [kitchenEntries]);

  useEffect(() => {
    localStorage.setItem('bankEntries', JSON.stringify(bankEntries));
  }, [bankEntries]);

  useEffect(() => {
    localStorage.setItem('cashEntries', JSON.stringify(cashEntries));
  }, [cashEntries]);

  useEffect(() => {
    localStorage.setItem('customers', JSON.stringify(customers));
  }, [customers]);

  // Enhanced CSV Import functionality with better parsing
  const importCSVData = async (file, bookType) => {
    return new Promise((resolve, reject) => {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        reject(new Error('Please select a CSV file (.csv extension required)'));
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('File size too large. Please select a file smaller than 10MB'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          
          // Handle different line endings
          const lines = csv.split(/\r?\n/);
          
          if (lines.length < 2) {
            reject(new Error('CSV file must have at least a header row and one data row'));
            return;
          }

          // Enhanced CSV parsing function to handle quoted fields
          const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  // Handle escaped quotes
                  current += '"';
                  i++; // Skip next quote
                } else {
                  // Toggle quote state
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            
            // Add the last field
            result.push(current.trim());
            return result;
          };

          // Parse header row
          const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());
          
          if (headers.length === 0 || headers.every(h => !h)) {
            reject(new Error('CSV file must have valid column headers'));
            return;
          }

          const data = [];
          let successfulRows = 0;
          let skippedRows = 0;

          // Parse data rows
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) {
              skippedRows++;
              continue; // Skip empty lines
            }

            try {
              const values = parseCSVLine(line);
              
              // Skip rows that are completely empty
              if (values.every(v => !v.trim())) {
                skippedRows++;
                continue;
              }

              const entry = {};
              headers.forEach((header, index) => {
                let value = values[index] || '';
                // Remove surrounding quotes if present
                value = value.replace(/^"(.*)"$/, '$1').trim();
                entry[header] = value;
              });

              // Add timestamp and ID for tracking
              entry.id = Date.now() + Math.random();
              entry.importedAt = new Date().toISOString();
              
              data.push(entry);
              successfulRows++;
            } catch (rowError) {
              console.warn(`Error parsing row ${i + 1}:`, rowError);
              skippedRows++;
            }
          }

          if (data.length === 0) {
            reject(new Error('No valid data rows found in CSV file'));
            return;
          }

          // Add imported data to appropriate state
          switch (bookType) {
            case 'income':
              setIncomeEntries(prev => [...prev, ...data]);
              break;
            case 'office':
              setOfficeEntries(prev => [...prev, ...data]);
              break;
            case 'salary':
              setSalaryEntries(prev => [...prev, ...data]);
              break;
            case 'kitchen':
              setKitchenEntries(prev => [...prev, ...data]);
              break;
            case 'bank':
              setBankEntries(prev => [...prev, ...data]);
              break;
            case 'cash':
              setCashEntries(prev => [...prev, ...data]);
              break;
            case 'customers':
              setCustomers(prev => [...prev, ...data]);
              break;
            default:
              reject(new Error('Invalid book type. Please select a valid book type.'));
              return;
          }

          const message = `Successfully imported ${successfulRows} entries to ${bookType} book` + 
                         (skippedRows > 0 ? ` (${skippedRows} rows skipped)` : '');
          resolve(message);
        } catch (error) {
          console.error('CSV Import Error:', error);
          reject(new Error(`Error reading CSV file: ${error.message}. Please check the format and try again.`));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file. Please try again.'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  // Add entry functions
  const addIncomeEntry = async (entry) => {
    const newEntry = { ...entry, id: Date.now() };
    
    console.log('🔄 Adding income entry:', newEntry);
    console.log('🔄 User ID:', user?.uid);
    
    // Add to local state immediately
    setIncomeEntries(prev => [...prev, newEntry]);
    
    // Save to Firebase
    if (user) {
      try {
        console.log('🔄 Calling Firebase addIncomeEntry...');
        const result = await cashBookService.addIncomeEntry(user.uid, newEntry);
        console.log('🔄 Firebase result:', result);
        
        if (result.success) {
          console.log('✅ Income entry saved to Firebase successfully with ID:', result.id);
        } else {
          console.error('❌ Firebase returned error:', result.error);
        }
      } catch (error) {
        console.error('❌ Error saving income entry to Firebase:', error);
        console.log('📦 Income entry saved to localStorage as fallback');
      }
    } else {
      console.log('📦 Income entry saved to localStorage (no user authenticated)');
    }
  };

  const addOfficeEntry = async (entry) => {
    const newEntry = { ...entry, id: Date.now() };
    
    console.log('🔄 Adding office entry:', newEntry);
    console.log('🔄 User ID:', user?.uid);
    
    // Add to local state immediately
    setOfficeEntries(prev => [...prev, newEntry]);
    
    // Save to Firebase
    if (user) {
      try {
        console.log('🔄 Calling Firebase addExpenseEntry (office)...');
        const result = await cashBookService.addExpenseEntry(user.uid, { ...newEntry, type: 'office' });
        console.log('🔄 Firebase result:', result);
        
        if (result.success) {
          console.log('✅ Office entry saved to Firebase successfully with ID:', result.id);
        } else {
          console.error('❌ Firebase returned error:', result.error);
        }
      } catch (error) {
        console.error('❌ Error saving office entry to Firebase:', error);
        console.log('📦 Office entry saved to localStorage as fallback');
      }
    } else {
      console.log('📦 Office entry saved to localStorage (no user authenticated)');
    }
  };

  const addSalaryEntry = async (entry) => {
    const newEntry = { ...entry, id: Date.now() };
    
    console.log('🔄 Adding salary entry:', newEntry);
    console.log('🔄 User ID:', user?.uid);
    
    // Add to local state immediately
    setSalaryEntries(prev => [...prev, newEntry]);
    
    // Save to Firebase
    if (user) {
      try {
        console.log('🔄 Calling Firebase addExpenseEntry (salary)...');
        const result = await cashBookService.addExpenseEntry(user.uid, { ...newEntry, type: 'salary' });
        console.log('🔄 Firebase result:', result);
        
        if (result.success) {
          console.log('✅ Salary entry saved to Firebase successfully with ID:', result.id);
        } else {
          console.error('❌ Firebase returned error:', result.error);
        }
      } catch (error) {
        console.error('❌ Error saving salary entry to Firebase:', error);
        console.log('📦 Salary entry saved to localStorage as fallback');
      }
    } else {
      console.log('📦 Salary entry saved to localStorage (no user authenticated)');
    }
  };

  const addKitchenEntry = async (entry) => {
    const newEntry = { ...entry, id: Date.now() };
    
    console.log('🔄 Adding kitchen entry:', newEntry);
    console.log('🔄 User ID:', user?.uid);
    
    // Add to local state immediately
    setKitchenEntries(prev => [...prev, newEntry]);
    
    // Save to Firebase
    if (user) {
      try {
        console.log('🔄 Calling Firebase addExpenseEntry (kitchen)...');
        const result = await cashBookService.addExpenseEntry(user.uid, { ...newEntry, type: 'kitchen' });
        console.log('🔄 Firebase result:', result);
        
        if (result.success) {
          console.log('✅ Kitchen entry saved to Firebase successfully with ID:', result.id);
        } else {
          console.error('❌ Firebase returned error:', result.error);
        }
      } catch (error) {
        console.error('❌ Error saving kitchen entry to Firebase:', error);
        console.log('📦 Kitchen entry saved to localStorage as fallback');
      }
    } else {
      console.log('📦 Kitchen entry saved to localStorage (no user authenticated)');
    }
  };

  const addBankEntry = async (entry) => {
    const newEntry = { ...entry, id: Date.now() };
    
    console.log('🔄 Adding bank entry:', newEntry);
    console.log('🔄 User ID:', user?.uid);
    
    // Add to local state immediately
    setBankEntries(prev => [...prev, newEntry]);
    
    // Save to Firebase (now that we know it works!)
    if (user) {
      try {
        console.log('🔄 Calling Firebase addBankEntry...');
        const result = await cashBookService.addBankEntry(user.uid, newEntry);
        console.log('🔄 Firebase result:', result);
        
        if (result.success) {
          console.log('✅ Bank entry saved to Firebase successfully with ID:', result.id);
        } else {
          console.error('❌ Firebase returned error:', result.error);
        }
      } catch (error) {
        console.error('❌ Error saving bank entry to Firebase:', error);
        // Keep localStorage as fallback
        console.log('📦 Bank entry saved to localStorage as fallback');
      }
    } else {
      console.log('📦 Bank entry saved to localStorage (no user authenticated)');
    }
  };

  const addCashEntry = async (entry) => {
    const newEntry = { ...entry, id: Date.now() };
    
    console.log('🔄 Adding cash entry:', newEntry);
    console.log('🔄 User ID:', user?.uid);
    
    // Add to local state immediately
    setCashEntries(prev => [...prev, newEntry]);
    
    // Save to Firebase (now that we know it works!)
    if (user) {
      try {
        console.log('🔄 Calling Firebase addCashEntry...');
        const result = await cashBookService.addCashEntry(user.uid, newEntry);
        console.log('🔄 Firebase result:', result);
        
        if (result.success) {
          console.log('✅ Cash entry saved to Firebase successfully with ID:', result.id);
        } else {
          console.error('❌ Firebase returned error:', result.error);
        }
      } catch (error) {
        console.error('❌ Error saving cash entry to Firebase:', error);
        // Keep localStorage as fallback
        console.log('📦 Cash entry saved to localStorage as fallback');
      }
    } else {
      console.log('📦 Cash entry saved to localStorage (no user authenticated)');
    }
  };

  const addCustomer = async (customer) => {
    const newCustomer = { ...customer, id: Date.now() };
    
    console.log('🔄 Adding customer:', newCustomer);
    console.log('🔄 User ID:', user?.uid);
    
    // Add to local state immediately
    setCustomers(prev => [...prev, newCustomer]);
    
    // Save to Firebase
    if (user) {
      try {
        console.log('🔄 Calling Firebase addCustomer...');
        const result = await cashBookService.addCustomer(user.uid, newCustomer);
        console.log('🔄 Firebase result:', result);
        
        if (result.success) {
          console.log('✅ Customer saved to Firebase successfully with ID:', result.id);
        } else {
          console.error('❌ Firebase returned error:', result.error);
        }
      } catch (error) {
        console.error('❌ Error saving customer to Firebase:', error);
        console.log('📦 Customer saved to localStorage as fallback');
      }
    } else {
      console.log('📦 Customer saved to localStorage (no user authenticated)');
    }
  };

  // Update entry functions
  const updateIncomeEntry = (id, updatedEntry) => {
    setIncomeEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updatedEntry } : entry
    ));
  };

  const updateOfficeEntry = (id, updatedEntry) => {
    setOfficeEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updatedEntry } : entry
    ));
  };

  const updateSalaryEntry = (id, updatedEntry) => {
    setSalaryEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updatedEntry } : entry
    ));
  };

  const updateKitchenEntry = (id, updatedEntry) => {
    setKitchenEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updatedEntry } : entry
    ));
  };

  const updateBankEntry = (id, updatedEntry) => {
    setBankEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updatedEntry } : entry
    ));
  };

  const updateCashEntry = (id, updatedEntry) => {
    setCashEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updatedEntry } : entry
    ));
  };

  const updateCustomer = (id, updatedCustomer) => {
    setCustomers(prev => prev.map(customer => 
      customer.id === id ? { ...customer, ...updatedCustomer } : customer
    ));
  };

  // Delete entry functions
  const deleteIncomeEntry = (id) => {
    setIncomeEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const deleteOfficeEntry = (id) => {
    setOfficeEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const deleteSalaryEntry = (id) => {
    setSalaryEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const deleteKitchenEntry = (id) => {
    setKitchenEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const deleteBankEntry = (id) => {
    setBankEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const deleteCashEntry = (id) => {
    setCashEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const deleteCustomer = (id) => {
    setCustomers(prev => prev.filter(customer => customer.id !== id));
  };

  // Overwrite functions for CSV imports (replace all existing data)
  const overwriteIncomeEntries = async (newEntries) => {
    console.log('🔄 Overwriting income entries with', newEntries.length, 'new entries');
    
    // Update local state immediately
    setIncomeEntries(newEntries);
    
    // Clear and replace Firebase data
    if (user) {
      try {
        console.log('🔄 Calling Firebase replaceIncomeEntries...');
        const result = await cashBookService.replaceIncomeEntries(user.uid, newEntries);
        if (result.success) {
          console.log('✅ Income entries overwritten in Firebase successfully:', result.count, 'entries');
        } else {
          console.error('❌ Firebase overwrite failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Error overwriting income entries:', error);
      }
    }
  };

  const overwriteOfficeEntries = async (newEntries) => {
    console.log('🔄 Overwriting office entries with', newEntries.length, 'new entries');
    setOfficeEntries(newEntries);
    if (user) {
      try {
        console.log('🔄 Calling Firebase replaceExpenseEntries (office)...');
        const result = await cashBookService.replaceExpenseEntries(user.uid, newEntries, 'office');
        if (result.success) {
          console.log('✅ Office entries overwritten in Firebase successfully:', result.count, 'entries');
        } else {
          console.error('❌ Firebase overwrite failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Error overwriting office entries:', error);
      }
    }
  };

  const overwriteSalaryEntries = async (newEntries) => {
    console.log('🔄 Overwriting salary entries with', newEntries.length, 'new entries');
    setSalaryEntries(newEntries);
    if (user) {
      try {
        console.log('🔄 Calling Firebase replaceExpenseEntries (salary)...');
        const result = await cashBookService.replaceExpenseEntries(user.uid, newEntries, 'salary');
        if (result.success) {
          console.log('✅ Salary entries overwritten in Firebase successfully:', result.count, 'entries');
        } else {
          console.error('❌ Firebase overwrite failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Error overwriting salary entries:', error);
      }
    }
  };

  const overwriteKitchenEntries = async (newEntries) => {
    console.log('🔄 Overwriting kitchen entries with', newEntries.length, 'new entries');
    setKitchenEntries(newEntries);
    if (user) {
      try {
        console.log('🔄 Calling Firebase replaceExpenseEntries (kitchen)...');
        const result = await cashBookService.replaceExpenseEntries(user.uid, newEntries, 'kitchen');
        if (result.success) {
          console.log('✅ Kitchen entries overwritten in Firebase successfully:', result.count, 'entries');
        } else {
          console.error('❌ Firebase overwrite failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Error overwriting kitchen entries:', error);
      }
    }
  };

  const overwriteBankEntries = async (newEntries) => {
    console.log('🔄 Overwriting bank entries with', newEntries.length, 'new entries');
    setBankEntries(newEntries);
    if (user) {
      try {
        console.log('🔄 Calling Firebase replaceBankEntries...');
        const result = await cashBookService.replaceBankEntries(user.uid, newEntries);
        if (result.success) {
          console.log('✅ Bank entries overwritten in Firebase successfully:', result.count, 'entries');
        } else {
          console.error('❌ Firebase overwrite failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Error overwriting bank entries:', error);
      }
    }
  };

  const overwriteCashEntries = async (newEntries) => {
    console.log('🔄 Overwriting cash entries with', newEntries.length, 'new entries');
    setCashEntries(newEntries);
    if (user) {
      try {
        console.log('🔄 Calling Firebase replaceCashEntries...');
        const result = await cashBookService.replaceCashEntries(user.uid, newEntries);
        if (result.success) {
          console.log('✅ Cash entries overwritten in Firebase successfully:', result.count, 'entries');
        } else {
          console.error('❌ Firebase overwrite failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Error overwriting cash entries:', error);
      }
    }
  };

  const value = {
    // Data states
    incomeEntries,
    officeEntries,
    salaryEntries,
    kitchenEntries,
    bankEntries,
    cashEntries,
    customers,

    // Setter functions
    setIncomeEntries,
    setOfficeEntries,
    setSalaryEntries,
    setKitchenEntries,
    setBankEntries,
    setCashEntries,
    setCustomers,

    // Add functions
    addIncomeEntry,
    addOfficeEntry,
    addSalaryEntry,
    addKitchenEntry,
    addBankEntry,
    addCashEntry,
    addCustomer,

    // Update functions
    updateIncomeEntry,
    updateOfficeEntry,
    updateSalaryEntry,
    updateKitchenEntry,
    updateBankEntry,
    updateCashEntry,
    updateCustomer,

    // Delete functions
    deleteIncomeEntry,
    deleteOfficeEntry,
    deleteSalaryEntry,
    deleteKitchenEntry,
    deleteBankEntry,
    deleteCashEntry,
    deleteCustomer,

    // Overwrite functions for CSV imports
    overwriteIncomeEntries,
    overwriteOfficeEntries,
    overwriteSalaryEntries,
    overwriteKitchenEntries,
    overwriteBankEntries,
    overwriteCashEntries,

    // Utility functions
    importCSVData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataProvider;
