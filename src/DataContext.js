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

  // CSV Import functionality
  const importCSVData = async (file, bookType) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          const data = [];

          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
              const values = lines[i].split(',').map(v => v.trim());
              const entry = {};
              headers.forEach((header, index) => {
                entry[header] = values[index] || '';
              });
              data.push(entry);
            }
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
              reject(new Error('Invalid book type'));
              return;
          }

          resolve(`Successfully imported ${data.length} entries to ${bookType} book`);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
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
