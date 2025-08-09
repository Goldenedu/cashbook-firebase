import React, { createContext, useContext, useState, useEffect } from 'react';
import { cashBookService } from './firebase-services';
import { useAuth } from './components/FirebaseAuth';

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
  const { user } = useAuth();
  
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

    if (user) {
      loadFirebaseData();
    } else {
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
  const addIncomeEntry = (entry) => {
    setIncomeEntries(prev => [...prev, { ...entry, id: Date.now() }]);
  };

  const addOfficeEntry = (entry) => {
    setOfficeEntries(prev => [...prev, { ...entry, id: Date.now() }]);
  };

  const addSalaryEntry = (entry) => {
    setSalaryEntries(prev => [...prev, { ...entry, id: Date.now() }]);
  };

  const addKitchenEntry = (entry) => {
    setKitchenEntries(prev => [...prev, { ...entry, id: Date.now() }]);
  };

  const addBankEntry = async (entry) => {
    const newEntry = { ...entry, id: Date.now() };
    
    // Add to local state immediately for UI responsiveness
    setBankEntries(prev => [...prev, newEntry]);
    
    // Save to Firebase Firestore for permanent storage
    if (user) {
      try {
        await cashBookService.addBankEntry(user.uid, newEntry);
        console.log('Bank entry saved to Firebase successfully');
      } catch (error) {
        console.error('Error saving bank entry to Firebase:', error);
        // Could add error handling here (e.g., show user notification)
      }
    }
  };

  const addCashEntry = async (entry) => {
    const newEntry = { ...entry, id: Date.now() };
    
    // Add to local state immediately for UI responsiveness
    setCashEntries(prev => [...prev, newEntry]);
    
    // Save to Firebase Firestore for permanent storage
    if (user) {
      try {
        await cashBookService.addCashEntry(user.uid, newEntry);
        console.log('Cash entry saved to Firebase successfully');
      } catch (error) {
        console.error('Error saving cash entry to Firebase:', error);
        // Could add error handling here (e.g., show user notification)
      }
    }
  };

  const addCustomer = (customer) => {
    setCustomers(prev => [...prev, { ...customer, id: Date.now() }]);
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
