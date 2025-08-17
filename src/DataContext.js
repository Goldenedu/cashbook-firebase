import React, { createContext, useContext, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db } from './firebase-config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy,
  writeBatch 
} from 'firebase/firestore';

const DataContext = createContext();
const LOCAL_MODE = String(process.env.REACT_APP_LOCAL_MODE || '').toLowerCase() === 'true';

// Local storage helpers for LOCAL_MODE
const inMemoryStore = {};
const hasLS = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const lsKey = (collectionName) => `cb_${collectionName}`;
const readLS = (collectionName) => {
  try {
    if (hasLS) {
      const raw = window.localStorage.getItem(lsKey(collectionName));
      return raw ? JSON.parse(raw) : [];
    }
    return Array.isArray(inMemoryStore[collectionName]) ? inMemoryStore[collectionName] : [];
  } catch (e) {
    console.warn('Failed to read local storage for', collectionName, e);
    return Array.isArray(inMemoryStore[collectionName]) ? inMemoryStore[collectionName] : [];
  }
};
const writeLS = (collectionName, arr) => {
  try {
    if (hasLS) {
      window.localStorage.setItem(lsKey(collectionName), JSON.stringify(arr || []));
    } else {
      inMemoryStore[collectionName] = Array.isArray(arr) ? arr : [];
    }
  } catch (e) {
    console.warn('Failed to write local storage for', collectionName, e);
    inMemoryStore[collectionName] = Array.isArray(arr) ? arr : [];
  }
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};



export const DataProvider = ({ children }) => {
  // Shared data states
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [bankEntries, setBankEntries] = useState([]);
  const [cashEntries, setCashEntries] = useState([]);
  const [officeEntries, setOfficeEntries] = useState([]);
  const [kitchenEntries, setKitchenEntries] = useState([]);
  const [salaryEntries, setSalaryEntries] = useState([]);
  const [rulesEntries, setRulesEntries] = useState([]);

  // Firebase Firestore functions
  const saveToFirestore = async (collectionName, data) => {
    if (LOCAL_MODE) {
      const arr = readLS(collectionName);
      const id = `local_${collectionName}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const item = { ...data, id, timestamp: new Date().toISOString() };
      arr.unshift(item); // keep newest first for tables that expect desc
      writeLS(collectionName, arr);
      return id;
    }
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        timestamp: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      throw error;
    }
  };

  // Generic bulk replace helper (no row limit; chunked Firestore batch writes)
  const bulkReplaceGeneric = async (collectionName, entries, normalizeFn, setStateFn) => {
    try {
      const toISO = (val) => {
        if (!val) return '';
        if (typeof val !== 'string') {
          const d = new Date(val);
          if (isNaN(d)) return '';
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }
        const s = val.replaceAll('/', '-');
        const parts = s.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) return s; // already yyyy-mm-dd
          const [dd, mm, yyyy] = parts;
          return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
        }
        return s;
      };
      const calcFY = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d)) return '';
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const fyStart = month >= 4 ? year : year - 1;
        const fyEnd = fyStart + 1;
        return `FY ${String(fyStart).slice(-2)}-${String(fyEnd).slice(-2)}`;
      };

      const normalized = (entries || []).map((e) => {
        const iso = toISO(e.date || e.entryDate || e.Date || '');
        const base = { ...e, date: iso || e.date || '' };
        const withFy = { ...base, fy: base.fy || base.FY || (iso ? calcFY(iso) : '') };
        return normalizeFn ? normalizeFn(withFy, { toISO, calcFY }) : withFy;
      });

      // Sort newest first by date (fallback to entryDate)
      normalized.sort((a, b) => new Date(b.date || b.entryDate || 0) - new Date(a.date || a.entryDate || 0));

      if (LOCAL_MODE) {
        writeLS(collectionName, normalized);
        setStateFn(normalized);
        return normalized;
      }

      const existing = await loadFromFirestore(collectionName);
      const chunk = (arr, size) => {
        const out = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };

      // Delete existing in batches
      for (const group of chunk(existing, 450)) {
        const batch = writeBatch(db);
        for (const item of group) {
          if (item && item.id) batch.delete(doc(db, collectionName, String(item.id)));
        }
        await batch.commit();
      }

      // Insert new in batches
      const inserted = [];
      for (const group of chunk(normalized, 450)) {
        const batch = writeBatch(db);
        const tempGroup = [];
        for (const item of group) {
          const ref = doc(collection(db, collectionName));
          batch.set(ref, { ...item, timestamp: new Date() });
          tempGroup.push({ ...item, id: ref.id });
        }
        await batch.commit();
        inserted.push(...tempGroup);
      }

      inserted.sort((a, b) => new Date(b.date || b.entryDate || 0) - new Date(a.date || a.entryDate || 0));
      setStateFn(inserted);
      return inserted;
    } catch (err) {
      console.error(`bulkReplaceGeneric(${collectionName}) failed:`, err);
      throw err;
    }
  };

  // Wrappers for each collection
  const bulkReplaceBank = async (entries) => {
    return bulkReplaceGeneric('bank', entries, (e) => ({ ...e }), setBankEntries);
  };

  const bulkReplaceOffice = async (entries) => {
    return bulkReplaceGeneric('office', entries, (e) => ({ ...e }), setOfficeEntries);
  };

  const bulkReplaceKitchen = async (entries) => {
    return bulkReplaceGeneric('kitchen', entries, (e) => ({ ...e }), setKitchenEntries);
  };

  const bulkReplaceSalary = async (entries) => {
    return bulkReplaceGeneric('salary', entries, (e) => ({ ...e }), setSalaryEntries);
  };

  const bulkReplaceIncome = async (entries) => {
    return bulkReplaceGeneric('income', entries, (e) => ({ ...e }), setIncomeEntries);
  };

  const bulkReplaceCustomers = async (entries) => {
    // Preserve both date and entryDate if present
    return bulkReplaceGeneric('customers', entries, (e) => ({ ...e }), setCustomers);
  };

  const addRuleEntry = async (entry) => {
    try {
      const docId = await saveToFirestore('rules', entry);
      const newEntry = { ...entry, id: docId };
      setRulesEntries(prev => [newEntry, ...prev]);
      return newEntry;
    } catch (error) {
      console.error('Error adding rule entry:', error);
      throw error;
    }
  };

  const loadFromFirestore = async (collectionName) => {
    if (LOCAL_MODE) {
      return readLS(collectionName);
    }
    try {
      // Fetch all docs without requiring 'timestamp' to exist
      const querySnapshot = await getDocs(collection(db, collectionName));
      const data = [];
      querySnapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort newest first by available fields: timestamp, then date, then entryDate
      const toTime = (item) => {
        // Firestore Timestamp or JS Date
        const t = item.timestamp;
        if (t && typeof t.toDate === 'function') {
          return t.toDate().getTime();
        }
        if (t instanceof Date) {
          return t.getTime();
        }
        // Fall back to ISO/string date fields
        const dStr = item.date || item.entryDate || '';
        const d = dStr ? new Date(dStr) : null;
        return d && !isNaN(d) ? d.getTime() : 0;
      };

      data.sort((a, b) => toTime(b) - toTime(a));
      return data;
    } catch (error) {
      console.error('Error loading from Firestore:', error);
      return [];
    }
  };

  const updateFirestoreDoc = async (collectionName, docId, data) => {
    if (LOCAL_MODE) {
      const arr = readLS(collectionName);
      const idx = arr.findIndex((x) => String(x.id) === String(docId));
      if (idx !== -1) {
        arr[idx] = { ...arr[idx], ...data, id: arr[idx].id, timestamp: new Date().toISOString() };
        writeLS(collectionName, arr);
        return;
      }
      // If not found, append as new
      const item = { ...data, id: String(docId), timestamp: new Date().toISOString() };
      arr.unshift(item);
      writeLS(collectionName, arr);
      return;
    }
    try {
      const idStr = String(docId);
      if (!idStr) {
        throw new Error(`Invalid document id for update: ${docId}`);
      }
      await updateDoc(doc(db, collectionName, idStr), {
        ...data,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error updating Firestore document:', error);
      throw error;
    }
  };

  const deleteFromFirestore = async (collectionName, docId) => {
    if (LOCAL_MODE) {
      const arr = readLS(collectionName);
      const next = arr.filter((x) => String(x.id) !== String(docId));
      writeLS(collectionName, next);
      return;
    }
    try {
      const idStr = String(docId);
      if (!idStr) {
        throw new Error(`Invalid document id for delete: ${docId}`);
      }
      await deleteDoc(doc(db, collectionName, idStr));
    } catch (error) {
      console.error('Error deleting from Firestore:', error);
      throw error;
    }
  };

  // Bulk replace all Cash entries with provided list (no row limit; chunked batches)
  const bulkReplaceCash = async (entries) => {
    try {
      // Normalize entries: ensure date ISO, fy present if possible
      const toISO = (val) => {
        if (!val) return '';
        if (typeof val !== 'string') {
          const d = new Date(val);
          if (isNaN(d)) return '';
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }
        const s = val.replaceAll('/', '-');
        const parts = s.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            return s; // already yyyy-mm-dd
          }
          const [dd, mm, yyyy] = parts;
          return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
        }
        return s;
      };
      const calcFY = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d)) return '';
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const fyStart = month >= 4 ? year : year - 1;
        const fyEnd = fyStart + 1;
        return `FY ${String(fyStart).slice(-2)}-${String(fyEnd).slice(-2)}`;
      };

      // Prepare cleaned entries
      const cleaned = (entries || []).map((e) => {
        const iso = toISO(e.date || e.entryDate || e.Date || '');
        return {
          ...e,
          date: iso || e.date || '',
          fy: e.fy || e.FY || (iso ? calcFY(iso) : ''),
        };
      });

      // Sort newest first by date
      cleaned.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      if (LOCAL_MODE) {
        // Overwrite local store entirely
        writeLS('cash', cleaned);
        setCashEntries(cleaned);
        return cleaned;
      }

      // Load existing doc IDs to delete
      const existing = await loadFromFirestore('cash');

      // Helper to chunk an array
      const chunk = (arr, size) => {
        const out = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };

      // Delete in batches (max 500 ops per batch)
      for (const group of chunk(existing, 450)) {
        const batch = writeBatch(db);
        for (const item of group) {
          if (item && item.id) {
            batch.delete(doc(db, 'cash', String(item.id)));
          }
        }
        await batch.commit();
      }

      // Insert in batches (max 500 ops per batch)
      const inserted = [];
      for (const group of chunk(cleaned, 450)) {
        const batch = writeBatch(db);
        const tempGroup = [];
        for (const item of group) {
          const ref = doc(collection(db, 'cash'));
          batch.set(ref, { ...item, timestamp: new Date() });
          tempGroup.push({ ...item, id: ref.id });
        }
        await batch.commit();
        inserted.push(...tempGroup);
      }

      // Update local state newest first
      inserted.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setCashEntries(inserted);
      return inserted;
    } catch (err) {
      console.error('bulkReplaceCash failed:', err);
      throw err;
    }
  };

  // Load data from Firestore on component mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [
          customersData,
          invoicesData,
          incomeData,
          bankData,
          cashData,
          officeData,
          kitchenData,
          salaryData,
          rulesData
        ] = await Promise.all([
          loadFromFirestore('customers'),
          loadFromFirestore('invoices'),
          loadFromFirestore('income'),
          loadFromFirestore('bank'),
          loadFromFirestore('cash'),
          loadFromFirestore('office'),
          loadFromFirestore('kitchen'),
          loadFromFirestore('salary'),
          loadFromFirestore('rules')
        ]);

        setCustomers(customersData);
        setInvoices(invoicesData);
        setIncomeEntries(incomeData);
        setBankEntries(bankData);
        setCashEntries(cashData);
        setOfficeEntries(officeData);
        setKitchenEntries(kitchenData);
        setSalaryEntries(salaryData);
        setRulesEntries(rulesData);
      } catch (error) {
        console.error('Error loading data from Firestore:', error);
      }
    };

    loadAllData();
  }, []);

  // Enhanced functions that save to Firestore
  const addCustomer = async (customer) => {
    try {
      const docId = await saveToFirestore('customers', customer);
      const newCustomer = { ...customer, id: docId };
      // Keep newest first, like Bank Book
      setCustomers(prev => [newCustomer, ...prev]);
      return newCustomer;
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  };

  const addInvoice = async (invoice) => {
    try {
      const docId = await saveToFirestore('invoices', invoice);
      const newInvoice = { ...invoice, id: docId };
      setInvoices(prev => [...prev, newInvoice]);
      
      // Also add to income entries and save to Firebase
      const incomeEntry = {
        date: newInvoice.date,
        acHead: 'Sales Revenue',
        acName: `Invoice ${newInvoice.invoiceNumber}`,
        description: `Invoice for ${newInvoice.customerName} - ${newInvoice.items.map(item => item.description).join(', ')}`,
        transfer: 'Credit',
        method: 'Invoice',
        debit: 0,
        credit: newInvoice.total
      };
      
      const incomeDocId = await saveToFirestore('income', incomeEntry);
      const newIncomeEntry = { ...incomeEntry, id: incomeDocId };
      setIncomeEntries(prev => [...prev, newIncomeEntry]);
      
      return newInvoice;
    } catch (error) {
      console.error('Error adding invoice:', error);
      throw error;
    }
  };

  const addIncomeEntry = async (entry) => {
    try {
      const docId = await saveToFirestore('income', entry);
      const newEntry = { ...entry, id: docId };
      // Prepend newest first, consistent with Bank Book behavior
      setIncomeEntries(prev => [newEntry, ...prev]);
      return newEntry;
    } catch (error) {
      console.error('Error adding income entry:', error);
      throw error;
    }
  };

  const addBankEntry = async (entry) => {
    try {
      const docId = await saveToFirestore('bank', entry);
      const newEntry = { ...entry, id: docId };
      setBankEntries(prev => [newEntry, ...prev]);
      return newEntry;
    } catch (error) {
      console.error('Error adding bank entry:', error);
      throw error;
    }
  };

  const addCashEntry = async (entry) => {
    try {
      const docId = await saveToFirestore('cash', entry);
      const newEntry = { ...entry, id: docId };
      setCashEntries(prev => [...prev, newEntry]);
      return newEntry;
    } catch (error) {
      console.error('Error adding cash entry:', error);
      throw error;
    }
  };

  const addOfficeEntry = async (entry) => {
    try {
      const docId = await saveToFirestore('office', entry);
      const newEntry = { ...entry, id: docId };
      // Keep newest first, consistent with Bank Book
      setOfficeEntries(prev => [newEntry, ...prev]);
      return newEntry;
    } catch (error) {
      console.error('Error adding office entry:', error);
      throw error;
    }
  };

  const addKitchenEntry = async (entry) => {
    try {
      const docId = await saveToFirestore('kitchen', entry);
      const newEntry = { ...entry, id: docId };
      setKitchenEntries(prev => [...prev, newEntry]);
      return newEntry;
    } catch (error) {
      console.error('Error adding kitchen entry:', error);
      throw error;
    }
  };

  const addSalaryEntry = async (entry) => {
    try {
      const docId = await saveToFirestore('salary', entry);
      const newEntry = { ...entry, id: docId };
      setSalaryEntries(prev => [...prev, newEntry]);
      return newEntry;
    } catch (error) {
      console.error('Error adding salary entry:', error);
      throw error;
    }
  };

  // Delete functions for all book components
  const deleteIncomeEntry = async (entryToDelete) => {
    try {
      console.log('Attempting to delete income entry:', entryToDelete);
      
      if (entryToDelete && entryToDelete.id) {
        console.log('Deleting from Firebase with ID:', entryToDelete.id);
        await deleteFromFirestore('income', entryToDelete.id);
        console.log('Successfully deleted from Firebase');
        
        // Remove from local state by filtering out the entry with matching ID
        setIncomeEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id));
        console.log('Removed from local state');
      } else {
        console.error('Cannot delete: Entry has no Firebase ID', entryToDelete);
        throw new Error('Entry does not have a valid Firebase ID');
      }
    } catch (error) {
      console.error('Error deleting income entry:', error);
      throw error;
    }
  };

  const deleteBankEntry = async (entryToDelete) => {
    try {
      console.log('Attempting to delete bank entry:', entryToDelete);
      
      if (entryToDelete && entryToDelete.id) {
        console.log('Deleting from Firebase with ID:', entryToDelete.id);
        await deleteFromFirestore('bank', entryToDelete.id);
        console.log('Successfully deleted from Firebase');
        
        // Remove from local state by filtering out the entry with matching ID
        setBankEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id));
        console.log('Removed from local state');
      } else {
        console.error('Cannot delete: Entry has no Firebase ID', entryToDelete);
        throw new Error('Entry does not have a valid Firebase ID');
      }
    } catch (error) {
      console.error('Error deleting bank entry:', error);
      throw error;
    }
  };

  const deleteCashEntry = async (entryToDelete) => {
    try {
      console.log('Attempting to delete cash entry:', entryToDelete);
      
      if (entryToDelete && entryToDelete.id) {
        console.log('Deleting from Firebase with ID:', entryToDelete.id);
        await deleteFromFirestore('cash', entryToDelete.id);
        console.log('Successfully deleted from Firebase');
        
        // Remove from local state by filtering out the entry with matching ID
        setCashEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id));
        console.log('Removed from local state');
      } else {
        console.error('Cannot delete: Entry has no Firebase ID', entryToDelete);
        throw new Error('Entry does not have a valid Firebase ID');
      }
    } catch (error) {
      console.error('Error deleting cash entry:', error);
      throw error;
    }
  };

  const deleteOfficeEntry = async (entryToDelete) => {
    try {
      console.log('Attempting to delete office entry:', entryToDelete);
      
      if (entryToDelete && entryToDelete.id) {
        console.log('Deleting from Firebase with ID:', entryToDelete.id);
        await deleteFromFirestore('office', entryToDelete.id);
        console.log('Successfully deleted from Firebase');
        
        // Remove from local state by filtering out the entry with matching ID
        setOfficeEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id));
        console.log('Removed from local state');
      } else {
        console.error('Cannot delete: Entry has no Firebase ID', entryToDelete);
        throw new Error('Entry does not have a valid Firebase ID');
      }
    } catch (error) {
      console.error('Error deleting office entry:', error);
      throw error;
    }
  };

  const deleteKitchenEntry = async (entryToDelete) => {
    try {
      console.log('Attempting to delete kitchen entry:', entryToDelete);
      
      if (entryToDelete && entryToDelete.id) {
        console.log('Deleting from Firebase with ID:', entryToDelete.id);
        await deleteFromFirestore('kitchen', entryToDelete.id);
        console.log('Successfully deleted from Firebase');
        
        // Remove from local state by filtering out the entry with matching ID
        setKitchenEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id));
        console.log('Removed from local state');
      } else {
        console.error('Cannot delete: Entry has no Firebase ID', entryToDelete);
        throw new Error('Entry does not have a valid Firebase ID');
      }
    } catch (error) {
      console.error('Error deleting kitchen entry:', error);
      throw error;
    }
  };

  const deleteSalaryEntry = async (entryToDelete) => {
    try {
      console.log('Attempting to delete salary entry:', entryToDelete);
      
      if (entryToDelete && entryToDelete.id) {
        console.log('Deleting from Firebase with ID:', entryToDelete.id);
        await deleteFromFirestore('salary', entryToDelete.id);
        console.log('Successfully deleted from Firebase');
        
        // Remove from local state by filtering out the entry with matching ID
        setSalaryEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id));
        console.log('Removed from local state');
      } else {
        console.error('Cannot delete: Entry has no Firebase ID', entryToDelete);
        throw new Error('Entry does not have a valid Firebase ID');
      }
    } catch (error) {
      console.error('Error deleting salary entry:', error);
      throw error;
    }
  };

  const deleteCustomer = async (customerToDelete) => {
    try {
      console.log('Attempting to delete customer:', customerToDelete);
      
      if (customerToDelete && customerToDelete.id) {
        console.log('Deleting from Firebase with ID:', customerToDelete.id);
        await deleteFromFirestore('customers', customerToDelete.id);
        console.log('Successfully deleted from Firebase');
        
        // Remove from local state by filtering out the entry with matching ID
        setCustomers(prev => prev.filter(customer => customer.id !== customerToDelete.id));
        console.log('Removed from local state');
      } else {
        console.error('Cannot delete: Customer has no Firebase ID', customerToDelete);
        throw new Error('Customer does not have a valid Firebase ID');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  };
  const deleteRuleEntry = async (entryToDelete) => {
    try {
      console.log('Attempting to delete rule entry:', entryToDelete);
      if (entryToDelete && entryToDelete.id) {
        console.log('Deleting from Firebase with ID:', entryToDelete.id);
        await deleteFromFirestore('rules', entryToDelete.id);
        console.log('Successfully deleted from Firebase');
        setRulesEntries(prev => prev.filter(entry => String(entry.id) !== String(entryToDelete.id)));
        console.log('Removed from local state');
      } else {
        console.error('Cannot delete: Entry has no Firebase ID', entryToDelete);
        throw new Error('Entry does not have a valid Firebase ID');
      }
    } catch (error) {
      console.error('Error deleting rule entry:', error);
      throw error;
    }
  };

  // Helper function to add income entry from invoice (deprecated - now handled in addInvoice)
  const addIncomeFromInvoice = (invoice) => {
    console.warn('addIncomeFromInvoice is deprecated. Income entries from invoices are now saved directly to Firebase.');
    const incomeEntry = {
      date: invoice.date,
      acHead: 'Sales Revenue',
      acName: `Invoice ${invoice.invoiceNumber}`,
      description: `Invoice for ${invoice.customerName} - ${invoice.items.map(item => item.description).join(', ')}`,
      transfer: 'Credit',
      method: 'Invoice',
      debit: 0,
      credit: invoice.total
    };
    return incomeEntry;
  };

  // Helper function to update income entry when invoice is updated
  const updateIncomeFromInvoice = (oldInvoice, newInvoice) => {
    // Remove old entry
    setIncomeEntries(prev => prev.filter(entry => 
      entry.id !== `invoice_${oldInvoice.invoiceNumber}_${oldInvoice.date}`
    ));
    
    // Add new entry
    addIncomeFromInvoice(newInvoice);
  };

  // One-time CSV import function for historical data
  const importCSVData = (file, bookType) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Add unique IDs to imported data
          const dataWithIds = jsonData.map((row, index) => ({
            ...row,
            id: row.id || `imported_${Date.now()}_${index}`
          }));

          // Update the appropriate state based on book type
          switch (bookType) {
            case 'customers': {
              // Map incoming CSV to Customer fields, filter out blank rows,
              // overwrite existing in Firestore/local store, and ensure valid IDs
              const toISO = (val) => {
                if (!val) return '';
                if (typeof val !== 'string') {
                  const d = new Date(val);
                  if (isNaN(d)) return '';
                  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                }
                const s = val.replaceAll('/', '-');
                const parts = s.split('-');
                if (parts.length === 3) {
                  if (parts[0].length === 4) {
                    // already yyyy-mm-dd
                    return s;
                  }
                  // dd-mm-yyyy -> iso
                  const [dd, mm, yyyy] = parts;
                  return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
                }
                return s;
              };

              const norm = (x) => (typeof x === 'string' ? x.trim() : x || '');
              const genderInitial = (g) => (g === 'Male' ? 'M' : g === 'Female' ? 'F' : '');

              const mapped = dataWithIds
                .map((row, i) => {
                  const date = toISO(row['Date'] ?? row.date ?? '');
                  const customId = norm(row['ID'] ?? row.idCustom ?? row.customId ?? '');
                  const acHead = norm(row['A/C Head'] ?? row.acHead ?? '');
                  const acName = norm(row['A/C Name'] ?? row.acName ?? '');
                  const gender = norm(row['Gender'] ?? row.gender ?? '');
                  const name = norm(row['Name'] ?? row.name ?? '');
                  const remark = norm(row['Remark'] ?? row.remark ?? '');
                  const displayNameCsv = norm(row['Entry Name'] ?? row.entryName ?? '');

                  const disp = displayNameCsv || (
                    acName && gender && customId && name
                      ? `${acName}-${genderInitial(gender)}-${customId}-${name}`
                      : ''
                  );

                  return {
                    id: row.id || `imported_${Date.now()}_${i}`,
                    date,
                    customId,
                    acHead,
                    acName,
                    gender,
                    name,
                    remark,
                    displayName: disp,
                  };
                })
                // Remove residual blank rows (no meaningful fields)
                .filter((r) => r.name || r.customId || r.acName || r.acHead || r.gender);

              // Newest first
              const sorted = mapped.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

              // Overwrite using chunked bulkReplace (no row limit, handles LOCAL_MODE internally)
              (async () => {
                try {
                  await bulkReplaceCustomers(sorted);
                } catch (err) {
                  console.error('Error overwriting customers from CSV via bulkReplace:', err);
                }
              })();
              break;
            }
            case 'bank':
              // Map CSV columns to Bank Book structure and overwrite existing data
              {
                const todayStr = new Date().toISOString().split('T')[0];

                const parseDate = (dateStr) => {
                  if (!dateStr) return '';
                  if (typeof dateStr === 'string' && dateStr.includes('/')) {
                    const [dd, mm, yyyy] = dateStr.split('/');
                    const d = new Date(parseInt(yyyy,10), parseInt(mm,10)-1, parseInt(dd,10));
                    if (!isNaN(d)) return `${String(d.getFullYear())}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    return '';
                  }
                  // assume ISO
                  return dateStr;
                };

                const calcFY = (dateStr) => {
                  if (!dateStr) return '';
                  let d;
                  if (typeof dateStr === 'string' && dateStr.includes('/')) {
                    const [dd, mm, yyyy] = dateStr.split('/');
                    d = new Date(parseInt(yyyy,10), parseInt(mm,10)-1, parseInt(dd,10));
                  } else {
                    d = new Date(dateStr);
                  }
                  if (isNaN(d)) return '';
                  const year = d.getFullYear();
                  const month = d.getMonth() + 1;
                  const fyStart = month >= 4 ? year : year - 1;
                  const fyEnd = fyStart + 1;
                  return `FY ${String(fyStart).slice(-2)}-${String(fyEnd).slice(-2)}`;
                };

                const genVRNoForDate = (dStr, existingList) => {
                  if (!dStr) return '';
                  let d;
                  if (dStr.includes('/')) {
                    const [dd, mm, yyyy] = dStr.split('/');
                    d = new Date(parseInt(yyyy,10), parseInt(mm,10)-1, parseInt(dd,10));
                  } else {
                    d = new Date(dStr);
                  }
                  if (isNaN(d)) return '';
                  const day = String(d.getDate()).padStart(2,'0');
                  const month = String(d.getMonth()+1).padStart(2,'0');
                  const year = String(d.getFullYear()).slice(-2);
                  const datePrefix = `CB-${day}${month}${year}`;
                  const sameDateCount = existingList.filter(e => {
                    const ed = new Date(e.date);
                    return !isNaN(ed) && ed.toDateString() === d.toDateString();
                  }).length;
                  const seq = String(sameDateCount + 1).padStart(3,'0');
                  return `${datePrefix}-${seq}`;
                };

                const mapped = [];
                for (let i = 0; i < jsonData.length; i++) {
                  const row = jsonData[i];
                  const rawDate = row['Date'] ?? row['date'] ?? '';
                  const normalizedDate = parseDate(rawDate);
                  const fy = row['FY'] ?? row['fy'] ?? '';
                  const vrFromCsv = row['VR No'] ?? row['vrNo'] ?? '';
                  const acHead = row['A/C Head'] ?? row['acHead'] ?? 'Bank';
                  const acName = row['A/C Name'] ?? row['acName'] ?? '';
                  const description = row['Description'] ?? row['description'] ?? '';
                  const method = row['Method'] ?? row['method'] ?? 'Bank';
                  const amount = Number(row['Amount'] ?? row['amount'] ?? 0) || 0;
                  const transfer = row['Transfer'] ?? row['transfer'] ?? '';
                  const entryDate = row['Entry Date'] ?? row['entryDate'] ?? todayStr;

                  const mappedRow = {
                    id: row.id || `imported_${Date.now()}_${i}`,
                    date: normalizedDate || rawDate || '',
                    fy: fy || calcFY(rawDate || normalizedDate),
                    vrNo: vrFromCsv || '', // fill after date normalization below if empty
                    acHead,
                    acName,
                    description,
                    method,
                    amount,
                    transfer,
                    entryDate
                  };

                  if (!mappedRow.vrNo) {
                    mappedRow.vrNo = genVRNoForDate(mappedRow.date || rawDate, mapped);
                  }

                  mapped.push(mappedRow);
                }

                // Overwrite existing
                setBankEntries(mapped);
              }
              break;
            case 'cash':
              setCashEntries(prev => [...prev, ...dataWithIds]);
              break;
            case 'income': {
              // Overwrite existing income entries using chunked bulkReplace
              (async () => {
                try {
                  // Normalize date/FY and map exact headers from export
                  const toISO = (val) => {
                    if (!val) return '';
                    if (typeof val !== 'string') {
                      const d = new Date(val);
                      if (isNaN(d)) return '';
                      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    }
                    const s = String(val).replaceAll('/', '-');
                    const parts = s.split('-');
                    if (parts.length === 3) {
                      if (parts[0].length === 4) return s; // yyyy-mm-dd
                      const [dd, mm, yyyy] = parts;
                      return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
                    }
                    return s;
                  };
                  const calcFY = (dateStr) => {
                    if (!dateStr) return '';
                    const d = new Date(dateStr);
                    if (isNaN(d)) return '';
                    const year = d.getFullYear();
                    const month = d.getMonth() + 1;
                    const fyStart = month >= 4 ? year : year - 1;
                    const fyEnd = fyStart + 1;
                    return `FY ${String(fyStart).slice(-2)}-${String(fyEnd).slice(-2)}`;
                  };
                  const parseNum = (v) => {
                    if (v === null || v === undefined || v === '') return 0;
                    const n = Number(String(v).replace(/,/g, ''));
                    return isNaN(n) ? 0 : n;
                  };
                  const mapped = (dataWithIds || []).map((row) => {
                    // Accept exact headers from export and fallback keys
                    const rawDate = row['Date'] ?? row.date ?? '';
                    const isoDate = toISO(rawDate);
                    const vrNo = row['VR No'] ?? row.vrNo ?? '';
                    const acHead = row['A/C Head'] ?? row.acHead ?? '';
                    const acNameCol = row['A/C Name'] ?? row.acName ?? '';
                    const idNameRaw = row['ID Name'] ?? row.name ?? '';
                    const feesName = row['Fees Name'] ?? row.feesName ?? '';
                    const method = row['Method'] ?? row.method ?? '';
                    const debit = parseNum(row['Amount'] ?? row.amount ?? row.debit ?? 0);
                    const autoFees = parseNum(row['Auto Fees'] ?? row.autoFees ?? 0);
                    const remark = row['Remark'] ?? row.remark ?? '';
                    const entryDateRaw = row['Entry Date'] ?? row.entryDate ?? rawDate;
                    const entryDate = toISO(entryDateRaw);
                    const fy = row['FY'] ?? row.fy ?? (isoDate ? calcFY(isoDate) : '');

                    // Parse "ID Name [A/C Name]" into parts when possible
                    let parsedId = '';
                    let parsedCustomerName = '';
                    let parsedAcName = '';
                    const m = String(idNameRaw).match(/^\s*(ID-\d{3,5})\s+(.+?)\s*\[(.+)\]\s*$/);
                    if (m) {
                      parsedId = m[1];
                      parsedCustomerName = m[2];
                      parsedAcName = m[3];
                    }

                    const acName = acNameCol || parsedAcName;
                    const id = parsedId || '';
                    const customerName = parsedCustomerName || '';

                    return {
                      date: isoDate || rawDate || '',
                      fy,
                      vrNo: String(vrNo || ''),
                      acHead,
                      acName,
                      name: idNameRaw, // preserve original combined string
                      id,
                      customerName,
                      feesName,
                      method,
                      debit,
                      autoFees,
                      remark,
                      entryDate: entryDate || isoDate || rawDate || ''
                    };
                  });
                  await bulkReplaceIncome(mapped);
                } catch (err) {
                  console.error('Error overwriting income from CSV via bulkReplace:', err);
                }
              })();
              break;
            }
            case 'office':
              setOfficeEntries(prev => [...prev, ...dataWithIds]);
              break;
            case 'salary':
              setSalaryEntries(prev => [...prev, ...dataWithIds]);
              break;
            case 'kitchen':
              setKitchenEntries(prev => [...prev, ...dataWithIds]);
              break;
            case 'invoices':
              setInvoices(prev => [...prev, ...dataWithIds]);
              break;
            default:
              reject(new Error(`Unknown book type: ${bookType}`));
              return;
          }

          resolve(`Successfully imported ${dataWithIds.length} records to ${bookType}`);
        } catch (error) {
          reject(new Error(`Error parsing CSV: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };

      reader.readAsBinaryString(file);
    });
  };



  const value = {
    // Data states
    customers,
    setCustomers,
    invoices,
    setInvoices,
    incomeEntries,
    setIncomeEntries,
    bankEntries,
    setBankEntries,
    cashEntries,
    setCashEntries,
    officeEntries,
    setOfficeEntries,
    kitchenEntries,
    setKitchenEntries,
    salaryEntries,
    setSalaryEntries,
    rulesEntries,
    setRulesEntries,
    
    // Firestore functions
    addCustomer,
    addInvoice,
    addIncomeEntry,
    addBankEntry,
    addCashEntry,
    addOfficeEntry,
    addKitchenEntry,
    addSalaryEntry,
    addRuleEntry,
    deleteIncomeEntry,
    deleteBankEntry,
    deleteCashEntry,
    deleteOfficeEntry,
    deleteKitchenEntry,
    deleteSalaryEntry,
    deleteCustomer,
    deleteRuleEntry,
    saveToFirestore,
    loadFromFirestore,
    updateFirestoreDoc,
    deleteFromFirestore,
    bulkReplaceCash,
    bulkReplaceBank,
    bulkReplaceOffice,
    bulkReplaceKitchen,
    bulkReplaceSalary,
    bulkReplaceIncome,
    bulkReplaceCustomers,
    
    // Helper functions
    addIncomeFromInvoice,
    updateIncomeFromInvoice,
    importCSVData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
