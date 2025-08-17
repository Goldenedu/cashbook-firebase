import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../DataContext';

function IncomeApp() {
  const { incomeEntries, setIncomeEntries, customers, addIncomeEntry, deleteIncomeEntry, updateFirestoreDoc, importCSVData, rulesEntries } = useData();
  const entries = incomeEntries;
  const setEntries = setIncomeEntries;
  
  // Dropdown options
  const acHeadOptions = ['Boarder', 'Semi Boarder', 'Day'];
  const acNameOptions = ['Pre-', 'K G-', 'G _1', 'G _2', 'G _3', 'G _4', 'G _5', 'G _6', 'G _7', 'G _8', 'G _9', 'G_10', 'G_11', 'G_12'];
  const genderOptions = ['Male', 'Female'];
  const feesNameOptions = ['Registration', 'Services', 'Ferry'];
  const methodOptions = ['Cash', 'Kpay', 'Bank'];

  const [formData, setFormData] = useState({
    vrNo: '',
    date: new Date().toISOString().split('T')[0], // Set today's date by default
    fy: '', // Auto-generated FY
    id: '', // Customer ID from Customer List
    acHead: '',
    acName: '',
    gender: '',
    name: '',
    customerName: '',
    feesName: '',
    autoFees: '',
    method: '',
    debit: '',
    entryDate: new Date().toISOString().split('T')[0], // Auto Fees Entry Date (read-only)
  });
  const [editIndex, setEditIndex] = useState(null);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const [filters, setFilters] = useState({
    vrNo: '',
    date: '',
    fy: '', // Include FY in filters initial state
    acHead: '',
    acName: '',
    gender: '',
    id: '',
    name: '',
    feesName: '',
    autoFees: '',
    debit: '',
    method: '',
  });

  // Auto-generate FY based on April-March fiscal year
  const generateFY = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const year = date.getFullYear();
    
    let fyStart, fyEnd;
    if (month >= 4) { // April to December
      fyStart = year;
      fyEnd = year + 1;
    } else { // January to March
      fyStart = year - 1;
      fyEnd = year;
    }
    
    return `FY ${fyStart.toString().slice(-2)}-${fyEnd.toString().slice(-2)}`;
  };

  // Auto-generate VR number (Voucher Receipt No)
  const generateVRNo = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(-2);
    const ddmmyy = `${dd}${mm}${yy}`;
    
    // Count VRs created today
    const todayVRs = entries.filter(entry => 
      entry.vrNo && entry.vrNo.startsWith(ddmmyy)
    );
    
    const sequenceNo = (todayVRs.length + 1).toString().padStart(3, '0');
    return `${ddmmyy}-${sequenceNo}`;
  };

  // Generate next Customer ID based on current FY (same format as Customer List)
  const generateNextCustomerId = () => {
    const currentFY = generateFY(new Date().toISOString().split('T')[0]);
    const customersInCurrentFY = customers.filter(customer => {
      const customerFY = generateFY(customer.date);
      return customerFY === currentFY;
    });
    const nextNumber = customersInCurrentFY.length + 1;
    return `ID-${String(nextNumber).padStart(4, '0')}`;
  };

  // Helper: get fee amount from Rules based on A/C Head, A/C Name (A/C Class in Rules), and Fees Name
  const getAutoFeeAmount = (acHead, acName, feesName) => {
    const valid = ['Registration', 'Services'];
    if (!acHead || !acName || !valid.includes(feesName)) return null;
    const rule = (rulesEntries || []).find(r => String(r.acHead) === String(acHead) && String(r.acClass) === String(acName));
    if (!rule) return null;
    const key = feesName === 'Registration' ? 'registration' : 'services';
    const val = Number(rule?.[key] ?? 0);
    return isNaN(val) ? null : val;
  };

  // Auto-generate VR No and FY when component loads
  useEffect(() => {
    if (!formData.vrNo && formData.date) {
      setFormData(prev => ({
        ...prev,
        vrNo: generateVRNo(),
        fy: generateFY(formData.date)
      }));
    }
  }, []);

  // Auto-generate VR No and FY when date changes
  useEffect(() => {
    if (formData.date) {
      setFormData(prev => ({
        ...prev,
        vrNo: !formData.vrNo ? generateVRNo() : prev.vrNo,
        fy: generateFY(formData.date),
        entryDate: prev.entryDate || new Date().toISOString().split('T')[0]
      }));
    }
  }, [formData.date]);

  // Recalculate Auto Fees and Amount when dependencies change
  useEffect(() => {
    const fees = formData.feesName;
    const amount = getAutoFeeAmount(formData.acHead, formData.acName, fees);
    if (amount !== null) {
      setFormData(prev => ({
        ...prev,
        autoFees: String(amount),
        debit: String(amount),
      }));
    } else if (fees && !['Registration', 'Services'].includes(fees)) {
      // Non-applicable fees (e.g., Ferry): clear autoFees tag
      if (formData.autoFees) {
        setFormData(prev => ({ ...prev, autoFees: '' }));
      }
    }
  }, [formData.acHead, formData.acName, formData.feesName, rulesEntries]);

  // Get filtered customers for name selection (filtered by FY, ID, A/C Head, A/C Name, Gender)
  const getFilteredCustomers = () => {
    const currentFY = formData.fy || generateFY(new Date().toISOString().split('T')[0]);
    return customers.filter(customer => {
      const customerFY = generateFY(customer.date);
      return (
        customerFY === currentFY &&
        (formData.acHead === '' || customer.acHead === formData.acHead) &&
        (formData.acName === '' || customer.acName === formData.acName) &&
        (formData.gender === '' || customer.gender === formData.gender) &&
        // Additional filtering by ID if needed
        (customer.customId || customer.id)
      );
    });
  };

  // CSV Import functionality (centralized via DataContext)
  const importFromCSV = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      const msg = await importCSVData(file, 'income');
      alert(msg || 'Imported income entries successfully (existing data overwritten).');
    } catch (err) {
      console.error('Income CSV import failed:', err);
      alert(`Income CSV import failed: ${err.message || err}`);
    } finally {
      if (e && e.target) e.target.value = '';
    }
  };

  // Auto-fill name logic
  const getAutoFilledName = (acHead, acName, gender) => {
    if (acHead === 'Boarder' && acName === 'G_1' && gender === 'Male') {
      return 'G_1 M Mg Mg';
    }
    return '';
  };

  const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    return parseFloat(num).toLocaleString();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const calculateBalance = (debit, credit) => {
    return parseFloat(debit || 0) - parseFloat(credit || 0);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newFormData = {
      ...formData,
      [name]: value,
    };

    // Auto-fill name when conditions are met
    if (name === 'acHead' || name === 'acName' || name === 'gender') {
      const autoName = getAutoFilledName(
        name === 'acHead' ? value : formData.acHead,
        name === 'acName' ? value : formData.acName,
        name === 'gender' ? value : formData.gender
      );
      if (autoName) {
        newFormData.name = autoName;
      }
    }

    // Auto Fees handling and auto amount
    if (name === 'feesName') {
      if (value === 'Registration' || value === 'Services') {
        const amt = getAutoFeeAmount(newFormData.acHead, newFormData.acName, value);
        newFormData.autoFees = amt !== null ? String(amt) : '';
        if (amt !== null) newFormData.debit = String(amt);
      } else {
        // For non-applicable fees like Ferry
        newFormData.autoFees = '';
      }
    }

    // If A/C Head or A/C Name changes while a valid auto fee is selected, recompute amount
    if ((name === 'acHead' || name === 'acName') && (newFormData.feesName === 'Registration' || newFormData.feesName === 'Services')) {
      const amt = getAutoFeeAmount(
        name === 'acHead' ? value : newFormData.acHead,
        name === 'acName' ? value : newFormData.acName,
        newFormData.feesName
      );
      if (amt !== null) {
        newFormData.debit = String(amt);
        newFormData.autoFees = String(amt);
      }
    }

    setFormData(newFormData);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const clearForm = () => {
    const newVRNo = generateVRNo(); // Generate new VR No for next entry
    setFormData({
      vrNo: newVRNo,
      date: new Date().toISOString().split('T')[0], // Reset to today's date
      fy: generateFY(new Date().toISOString().split('T')[0]),
      id: '',
      acHead: '',
      acName: '',
      gender: '',
      name: '',
      customerName: '',
      feesName: '',
      autoFees: '',
      method: '',
      debit: '',
      entryDate: new Date().toISOString().split('T')[0],
    });
    setEditIndex(null);
  };

  const exportToExcel = () => {
    let dataToExport = entries;
    
    // Filter by date range if provided
    if (exportStartDate && exportEndDate) {
      dataToExport = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        const startDate = new Date(exportStartDate);
        const endDate = new Date(exportEndDate);
        return entryDate >= startDate && entryDate <= endDate;
      });
    }
    
    // Export exactly as requested headers, matching table data
    const headers = [
      'Date', 'FY', 'VR No', 'A/C Head', 'A/C Name', 'ID Name', 'Fees Name', 'Method', 'Amount', 'Auto Fees', 'Remark', 'Entry Date'
    ];
    const rows = dataToExport.map(entry => {
      // Prefer explicit fields to reconstruct ID Name format; fallback to entry.name
      const idName = (
        (entry.id || entry.customId) && entry.customerName && entry.acName
          ? `${entry.id || entry.customId} ${entry.customerName} [${entry.acName}]`
          : (entry.name || '')
      );
      return [
        formatDate(entry.date),
        entry.fy || generateFY(entry.date),
        String(entry.vrNo || ''),
        entry.acHead || '',
        entry.acName || '',
        idName, // ID Name
        entry.feesName || '',
        entry.method || '',
        entry.debit ?? '', // Amount
        entry.autoFees ?? '', // Auto Fees
        entry.remark || '', // Remark (empty if not used)
        formatDate(entry.entryDate || entry.date)
      ];
    });
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Income Entries');
    
    const today = new Date().toISOString().split('T')[0];
    const dateRange = exportStartDate && exportEndDate ? `_${exportStartDate}_to_${exportEndDate}` : '';
    XLSX.writeFile(workbook, `income_entries${dateRange}_${today}.xlsx`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.vrNo || !formData.date || !formData.acHead || !formData.acName || 
        (!formData.method && editIndex === null) || !formData.name || !formData.feesName || !formData.debit) {
      alert('Please fill in all required fields');
      return;
    }
    const allowedMethods = ['Cash','Kpay','Bank'];
    if (formData.method && !allowedMethods.includes(String(formData.method))) {
      alert('Invalid Method. Please select Cash, Kpay, or Bank.');
      return;
    }
    const debitNum = Number(formData.debit);
    if (!Number.isFinite(debitNum) || debitNum <= 0) {
      alert('Amount must be a positive number.');
      return;
    }

    const entryData = {
      ...formData,
      fy: formData.fy || generateFY(formData.date),
      vrNo: formData.vrNo || generateVRNo(),
      debit: Number(formData.debit) || 0,
      id: editIndex !== null ? entries[editIndex]?.id : (formData.id || generateNextCustomerId()),
      customerName: formData.customerName || '', // Raw customer name for Entry Name column
      entryDate: new Date().toISOString().split('T')[0], // Current date when entry is created
    };
    console.log('Saving Income entry payload:', entryData, 'editIndex:', editIndex);

    try {
      if (editIndex !== null) {
        const existingEntry = entries[editIndex];
        const idStr = String(existingEntry?.id || '');
        const looksLikeLegacyId = !idStr || /^ID-\d{3,5}$/i.test(idStr);
        if (!looksLikeLegacyId) {
          // Normal update path
          console.log('Updating income doc id:', idStr);
          await updateFirestoreDoc('income', idStr, entryData);
          const updatedEntries = [...entries];
          updatedEntries[editIndex] = { ...entryData, id: idStr };
          setEntries(updatedEntries);
        } else {
          // Legacy row without a real Firestore doc; create a new one and replace locally
          console.warn('Legacy income row without real Firestore id detected. Creating new doc instead of update. Old id:', idStr);
          const newCreated = await addIncomeEntry(entryData);
          const updatedEntries = [...entries];
          updatedEntries[editIndex] = newCreated;
          setEntries(updatedEntries);
        }
      } else {
         console.log('Adding new income entry');
         await addIncomeEntry(entryData);
      }
      clearForm();
      alert('Income entry saved successfully!');
    } catch (error) {
      console.error('Error saving income entry:', error);
      alert(`Error saving income entry: ${error.message || error}. Please try again.`);
    }
  };

  const selectCustomer = (customer) => {
    const idVal = customer.customId || customer.id;
    // Display format: ID Name [A/C Name]
    const display = `${idVal} ${customer.name} [${customer.acName}]`;
    setFormData({
      ...formData,
      id: idVal, // Auto-populate ID from Customer List
      acHead: customer.acHead,
      acName: customer.acName,
      gender: customer.gender,
      name: display, // e.g., "ID-0016 Mg Moe Thu [G_10]"
      customerName: customer.name, // Raw customer name
    });
    setShowCustomerList(false);
  };

  const printInvoiceDirectly = (entry) => {
    const printWindow = window.open('', '_blank');
    const cleanedName = cleanName(entry.name);
    const monthYear = getMonthFromDate(entry.date);
    // ... (rest of the code remains the same)
    
    const invoiceContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Voucher Receipt ${entry.vrNo}</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            margin: 0; 
            padding: 10px;
            width: 2.6in;
            font-size: 12px;
            line-height: 1.2;
          }
          .receipt-container {
            width: 100%;
            border: 1px dashed #000;
            padding: 8px;
          }
          .header {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .left { text-align: left; }
          .right { text-align: right; }
          .center { text-align: center; }
          .name {
            font-size: 13px;
            font-weight: bold;
            margin: 5px 0;
          }
          .details {
            margin: 5px 0;
          }
          .amount {
            font-size: 14px;
            font-weight: bold;
            text-align: right;
            margin: 8px 0;
          }
          .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 11px;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 5px 0;
          }
          @media print { 
            .no-print { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">VOUCHER RECEIPT</div>
          
          <div class="row">
            <span class="left">VR No: ${entry.vrNo}</span>
            <span class="right">Date: ${formatDate(entry.date)}</span>
          </div>
          
          <div class="name">${cleanedName}</div>
          
          <div class="row">
            <span class="left">${entry.acName}</span>
            <span class="right">${entry.acHead}</span>
          </div>
          
          <div class="divider"></div>
          
          <div class="row">
            <span class="left">${monthYear} ${entry.feesName}</span>
            <span class="right">${entry.method}</span>
          </div>
          
          <div class="amount">${formatNumber(entry.debit)} MMK</div>
          
          <div class="divider"></div>
          
          <div class="footer">Thank You!</div>
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #27ae60; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px;">Print</button>
          <button onclick="window.close()" style="padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer;">Close</button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(invoiceContent);
    printWindow.document.close();
  };

  const handleEdit = (index) => {
    const entry = filteredEntries[index];
    if (!entry) return;
    if (!entry.id) {
      alert('Cannot edit: This entry has no database ID. Please re-import/save the row first.');
      return;
    }
    setFormData(entry);
    // Map to original entries index by id to ensure correct update
    const origIdx = entries.findIndex(e => String(e.id) === String(entry.id));
    if (origIdx === -1) {
      alert('Original entry not found in current data. Please refresh and try again.');
      return;
    }
    setEditIndex(origIdx);
  };

  const handleDelete = async (index) => {
    try {
      const entry = filteredEntries[index];
      console.log('Income entry to delete:', entry);
      
      if (!entry.id) {
        alert('Cannot delete: This entry was not properly saved to the database.');
        return;
      }
      
      await deleteIncomeEntry(entry);
      alert('Income entry deleted successfully!');
    } catch (error) {
      console.error('Error deleting income entry:', error);
      alert(`Error deleting income entry: ${error.message}. Please try again.`);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    return (
      (filters.vrNo === '' || (entry.vrNo || '').includes(filters.vrNo)) &&
      (filters.date === '' || (entry.date && entry.date.includes(filters.date))) &&
      (filters.fy === '' || ((entry.fy || generateFY(entry.date) || '').includes(filters.fy))) &&
      (filters.acHead === '' || (entry.acHead || '').toLowerCase().includes(filters.acHead.toLowerCase())) &&
      (filters.acName === '' || (entry.acName || '').toLowerCase().includes(filters.acName.toLowerCase())) &&
      (filters.name === '' || (entry.name || '').toLowerCase().includes(filters.name.toLowerCase())) &&
      (filters.feesName === '' || (entry.feesName || '').toLowerCase().includes(filters.feesName.toLowerCase())) &&
      (filters.autoFees === '' || (entry.autoFees || '').toLowerCase().includes(filters.autoFees.toLowerCase())) &&
      (filters.method === '' || (entry.method || '').toLowerCase().includes(filters.method.toLowerCase())) &&
      (filters.debit === '' || (entry.debit || '').toString().includes(filters.debit))
    );
  });

  const totalDebit = filteredEntries.reduce((sum, entry) => sum + (parseFloat(entry.debit) || 0), 0);

  // FY-dependent totals and counts (April–March FY)
  const currentFYLabel = generateFY(new Date().toISOString().split('T')[0]);
  const fyEntries = entries.filter(e => (e.fy || generateFY(e.date)) === currentFYLabel);
  const fyTotalIncome = fyEntries.reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0);
  const fyTotalCount = fyEntries.length;
  // Amount totals by A/C Head based on current FY and current table filters
  const norm = (s) => (s || '').toLowerCase();
  const fyFilteredEntries = filteredEntries.filter(e => (e.fy || generateFY(e.date)) === currentFYLabel);
  const amountByHead = (head) => fyFilteredEntries
    .filter(e => norm(e.acHead) === norm(head))
    .reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0);
  const fyBoarderAmount = amountByHead('Boarder');
  const fySemiBoarderAmount = amountByHead('Semi Boarder');
  const fyDayAmount = amountByHead('Day');
  // Method totals based on current FY and current table filters
  const totalByMethod = (method) => fyFilteredEntries
    .filter(e => norm(e.method) === norm(method))
    .reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0);
  const fyCashTotal = totalByMethod('Cash');
  const fyKpayTotal = totalByMethod('Kpay');
  const fyBankTotal = totalByMethod('Bank');
  const fyMethodTotal = fyCashTotal + fyKpayTotal + fyBankTotal;

  // Helper function to get month name from date
  const getMonthFromDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = date.getFullYear().toString().slice(-2);
    return `${monthNames[date.getMonth()]} ${year}`;
  };

  // Clean name by removing prefixes
  const cleanName = (fullName) => {
    if (!fullName) return '';
    // Remove prefixes like "G_1 M", "Pre- F", etc.
    return fullName.replace(/^(G_\d+|Pre-|KG--)\s*[MF]\s*/, '').trim();
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header with Title and FY totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ color: '#27ae60', margin: 0 }}>Income & Invoice Book</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ backgroundColor: '#2c3e50', color: 'white', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
            {currentFYLabel}
          </div>
          <div style={{ backgroundColor: '#34495e', color: 'white', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
            Boarder: {formatNumber(fyBoarderAmount)}
          </div>
          <div style={{ backgroundColor: '#8e44ad', color: 'white', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
            Semi Boarder: {formatNumber(fySemiBoarderAmount)}
          </div>
          <div style={{ backgroundColor: '#16a085', color: 'white', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
            Day: {formatNumber(fyDayAmount)}
          </div>
          <div style={{ backgroundColor: '#27ae60', color: 'white', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
            Total Income: {formatNumber(fyTotalIncome)}
          </div>
          <div style={{ backgroundColor: '#7f8c8d', color: 'white', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
            Total Entries: {fyTotalCount}
          </div>
        </div>
      </div>

      {/* Entry section controls moved into the form (second line) */}

      {/* Entry Form - two lines as requested */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 14, color: '#2c3e50' }}>Entry Form</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 'bold', fontSize: 12 }}>
            <span>Cash: {formatNumber(fyCashTotal)}</span>
            <span>Kpay: {formatNumber(fyKpayTotal)}</span>
            <span>Bank: {formatNumber(fyBankTotal)}</span>
            <span style={{ color: '#27ae60' }}>Total: {formatNumber(fyMethodTotal)}</span>
          </div>
        </div>
        {/* First line: Date, FY, VR No, A/C Head, A/C Name, Gender, Fees Name, Auto Fees (window-fit) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: 8 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>Date</label>
            <input type="date" name="date" value={formData.date} onChange={handleInputChange}
              style={{ height: 40, width: '100%', padding: '0 10px', border: '2px solid #3498db', borderRadius: 6, background: '#ecf6ff', fontWeight: 'bold', fontSize: 12 }} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>FY</label>
            <input type="text" name="fy" value={formData.fy} readOnly
              style={{ height: 40, width: '100%', padding: '0 10px', border: '2px solid #b0bec5', borderRadius: 6, background: '#f1f5f9', fontWeight: 'bold', fontSize: 12 }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>VR No</label>
            <input type="text" name="vrNo" value={formData.vrNo} readOnly
              style={{ height: 40, width: '100%', padding: '0 10px', border: '2px solid #b0bec5', borderRadius: 6, background: '#f1f5f9', fontWeight: 'bold', fontSize: 12 }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>A/C Head</label>
            <select name="acHead" value={formData.acHead} onChange={handleInputChange}
              style={{ height: 40, width: '100%', padding: '0 10px', border: '2px solid #3498db', borderRadius: 6, background: '#ecf6ff', fontWeight: 'bold', fontSize: 12 }} required>
              <option value="">Select</option>
              {acHeadOptions.map(option => (<option key={option} value={option}>{option}</option>))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>A/C Name</label>
            <select name="acName" value={formData.acName} onChange={handleInputChange}
              style={{ height: 40, width: '100%', padding: '0 10px', border: '2px solid #3498db', borderRadius: 6, background: '#ecf6ff', fontWeight: 'bold', fontSize: 12 }} required>
              <option value="">Select</option>
              {acNameOptions.map(option => (<option key={option} value={option}>{option}</option>))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>Gender</label>
            <select name="gender" value={formData.gender} onChange={handleInputChange}
              style={{ height: 40, width: '100%', padding: '0 10px', border: '2px solid #3498db', borderRadius: 6, background: '#ecf6ff', fontWeight: 'bold', fontSize: 12 }} required>
              <option value="">Select</option>
              {genderOptions.map(option => (<option key={option} value={option}>{option}</option>))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>Fees Name</label>
            <select name="feesName" value={formData.feesName} onChange={handleInputChange}
              style={{ height: 40, width: '100%', padding: '0 10px', border: '2px solid #3498db', borderRadius: 6, background: '#ecf6ff', fontWeight: 'bold', fontSize: 12 }} required>
              <option value="">Select</option>
              {feesNameOptions.map(option => (<option key={option} value={option}>{option}</option>))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>Auto Fees</label>
            <input
              type="text"
              name="autoFees"
              value={formData.autoFees}
              readOnly
              placeholder="Auto"
              style={{ height: 40, width: '100%', padding: '0 10px', border: formData.autoFees ? '2px solid #f1c40f' : '2px solid #b0bec5', borderRadius: 6, background: formData.autoFees ? '#fffbea' : '#f1f5f9', fontWeight: 'bold', fontSize: 12, color: '#7a5b00' }}
            />
          </div>
        </div>

        {/* Second line: Method, Amount, ID Name, + Add Entry, ✕ Clear, Start, End, Export Excel, Import CSV (sticky toolbar) */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#ffffff',
          display: 'flex',
          gap: 8,
          alignItems: 'end',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          padding: '6px 0',
          borderBottom: '1px solid #eee'
        }}>
          <div style={{ width: 120 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>Method</label>
            <select name="method" value={formData.method} onChange={handleInputChange}
              style={{ height: 40, width: '100%', padding: '0 10px', border: '2px solid #3498db', borderRadius: 6, background: '#ecf6ff', fontWeight: 'bold', fontSize: 12 }} required>
              <option value="">Select</option>
              {methodOptions.map(option => (<option key={option} value={option}>{option}</option>))}
            </select>
          </div>
          <div style={{ width: 110 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>Amount</label>
            <input type="number" name="debit" value={formData.debit} onChange={handleInputChange} placeholder="0.00" step="0.01"
              style={{ height: 40, width: '100%', padding: '0 10px', border: '2px solid #3498db', borderRadius: 6, background: '#ecf6ff', fontWeight: 'bold', fontSize: 12 }} required />
          </div>
          <div style={{ width: 480 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>ID Name</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Auto-filled or select"
                style={{ height: 40, width: '100%', padding: '0 10px', border: '2px solid #3498db', borderRadius: 6, background: '#ecf6ff', fontWeight: 'bold', fontSize: 12 }} required />
              <button type="button" onClick={() => setShowCustomerList(true)}
                style={{ height: 40, padding: '0 8px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold', fontSize: 12, cursor: 'pointer' }}>Select</button>
            </div>
          </div>
          <button type="submit"
            style={{ height: 40, padding: '0 14px', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold', fontSize: 12, cursor: 'pointer' }}>
            {editIndex !== null ? 'Update' : '+ Add Entry'}
          </button>
          <button type="button" onClick={clearForm}
            style={{ height: 40, padding: '0 14px', backgroundColor: '#7f8c8d', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold', fontSize: 12, cursor: 'pointer' }}>
            ✕ Clear
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
            <label style={{ fontWeight: 'bold', fontSize: '12px' }}>Start:</label>
            <input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)}
              style={{ height: 40, padding: '0 10px', border: '2px solid #3498db', borderRadius: 6, fontWeight: 'bold', fontSize: 12, background: '#ecf6ff' }} />
            <label style={{ fontWeight: 'bold', fontSize: '12px' }}>End:</label>
            <input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)}
              style={{ height: 40, padding: '0 10px', border: '2px solid #3498db', borderRadius: 6, fontWeight: 'bold', fontSize: 12, background: '#ecf6ff' }} />
            <button type="button" onClick={exportToExcel}
              style={{ height: 40, padding: '0 14px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 12 }}>
              Export Excel
            </button>
            <label htmlFor="csvImport" style={{ height: 40, display: 'flex', alignItems: 'center', padding: '0 14px', backgroundColor: '#3498db', color: 'white', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 12 }}>
              Import CSV
            </label>
            <input id="csvImport" type="file" accept=".xlsx,.csv" onChange={importFromCSV} style={{ display: 'none' }} />
          </div>
        </div>
      </form>

      {/* Table View - Below Entry Form */}
      <div style={{ overflow: 'auto', maxHeight: '65vh', marginBottom: '15px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white' }}>
            <tr style={{ backgroundColor: '#27ae60', color: 'white' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '80px' }}>Date</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '60px' }}>FY</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '90px' }}>VR No</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '100px' }}>A/C Head</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '100px' }}>A/C Name</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '220px' }}>ID Name</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '110px' }}>Fees Name</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '90px' }}>Method</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '90px' }}>Amount</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '110px' }}>Auto Fees</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '140px' }}>Actions</th>
            </tr>
            <tr style={{ backgroundColor: '#27ae60', color: 'white' }}>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <input type="date" name="date" value={filters.date} onChange={handleFilterChange} style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }} />
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <input type="text" name="fy" placeholder="FY" value={filters.fy} onChange={handleFilterChange} style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }} />
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <input type="text" name="vrNo" placeholder="VR No" value={filters.vrNo} onChange={handleFilterChange} style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }} />
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <select name="acHead" value={filters.acHead} onChange={handleFilterChange} style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}>
                  <option value="">All</option>
                  {acHeadOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <select name="acName" value={filters.acName} onChange={handleFilterChange} style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}>
                  <option value="">All</option>
                  {acNameOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <input type="text" name="name" placeholder="ID Name" value={filters.name} onChange={handleFilterChange} style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }} />
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <select name="feesName" value={filters.feesName} onChange={handleFilterChange} style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}>
                  <option value="">All</option>
                  {feesNameOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <select name="method" value={filters.method} onChange={handleFilterChange} style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}>
                  <option value="">All</option>
                  {methodOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <input type="text" name="debit" placeholder="Amount" value={filters.debit} onChange={handleFilterChange} style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }} />
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <input type="number" name="autoFees" value={filters.autoFees} onChange={handleFilterChange} placeholder="AutoAmt" style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }} />
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd', textAlign: 'center' }}>
                <button
                  onClick={() => setFilters({ vrNo: '', date: '', fy: '', acHead: '', acName: '', name: '', feesName: '', autoFees: '', method: '', debit: '' })}
                  style={{ padding: '4px 8px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '10px' }}
                >
                  Clear
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ padding: '10px', textAlign: 'center' }}>No entries found.</td>
              </tr>
            ) : (
              filteredEntries.map((entry, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{formatDate(entry.date)}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{entry.fy || generateFY(entry.date)}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{entry.vrNo}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{entry.acHead}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{entry.acName}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{entry.name}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{entry.feesName}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{entry.method}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', textAlign: 'right', color: '#27ae60', fontSize: '11px', fontWeight: 'bold' }}>{formatNumber(entry.debit)}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', textAlign: 'right', fontSize: '11px' }}>{formatNumber(entry.autoFees)}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px', textAlign: 'center' }}>
                    <button onClick={() => handleEdit(index)} style={{ marginRight: '3px', padding: '3px 6px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '9px' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(index)} style={{ marginRight: '3px', padding: '3px 6px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '9px' }}>
                      Delete
                    </button>
                    <button onClick={() => printInvoiceDirectly(entry)} style={{ padding: '3px 6px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '9px' }}>
                      Print
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Customer List Modal - Enhanced Design */}
      {showCustomerList && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '5px', maxWidth: '900px', maxHeight: '500px', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '15px', fontSize: '16px' }}>Select Customer (FY: {formData.fy || generateFY(new Date().toISOString().split('T')[0])})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#27ae60', color: 'white' }}>
                  <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', width: '60px' }}>FY</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', width: '50px' }}>ID</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', width: '90px' }}>A/C Name</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', width: '80px' }}>A/C Head</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', width: '70px' }}>Gender</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', width: '200px' }}>Name</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', width: '70px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredCustomers().map((customer, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                    <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '10px' }}>{generateFY(customer.date)}</td>
                    <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '10px' }}>{customer.customId || customer.id}</td>
                    <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '10px' }}>{customer.acName}</td>
                    <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '10px' }}>{customer.acHead}</td>
                    <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '10px' }}>{customer.gender}</td>
                    <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '10px' }}>
                      {`${customer.customId || customer.id} ${customer.name} [${customer.acName}]`}
                    </td>
                    <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '10px' }}>
                      <button
                        onClick={() => selectCustomer(customer)}
                        style={{ padding: '3px 6px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '9px' }}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => setShowCustomerList(false)}
              style={{ padding: '10px 20px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default IncomeApp;
