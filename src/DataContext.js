import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  // Local data states (your existing data structure)
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [officeEntries, setOfficeEntries] = useState([]);
  const [salaryEntries, setSalaryEntries] = useState([]);
  const [kitchenEntries, setKitchenEntries] = useState([]);
  const [bankEntries, setBankEntries] = useState([]);
  const [cashEntries, setCashEntries] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Load data from localStorage on component mount
  useEffect(() => {
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

    loadLocalData();
  }, []);

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

  const addBankEntry = (entry) => {
    setBankEntries(prev => [...prev, { ...entry, id: Date.now() }]);
  };

  const addCashEntry = (entry) => {
    setCashEntries(prev => [...prev, { ...entry, id: Date.now() }]);
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
