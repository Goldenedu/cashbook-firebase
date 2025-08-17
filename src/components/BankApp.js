import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../DataContext';

function BankApp() {
  const { bankEntries, setBankEntries, addBankEntry, deleteBankEntry, updateFirestoreDoc, bulkReplaceBank } = useData();
  const entries = bankEntries;
  const setEntries = setBankEntries;

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Auto set today's date
    fy: '',
    vrNo: '',
    acHead: 'Bank', // Auto Bank
    acName: '',
    description: '',
    method: 'Bank', // Auto Bank
    amount: '',
    transfer: '',
    entryDate: new Date().toLocaleDateString('en-GB') // Auto entry date
  });

  const [editIndex, setEditIndex] = useState(null);

  const [filters, setFilters] = useState({
    date: '',
    fy: '',
    vrNo: '',
    acHead: '',
    acName: '',
    description: '',
    method: '',
    amount: '',
    transfer: '',
    entryDate: ''
  });

  const [exportRange, setExportRange] = useState({
    startDate: '',
    endDate: ''
  });

  const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    return parseFloat(num).toLocaleString('en-US');
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

  // Auto-generate Financial Year (April to March)
  const calculateFY = (dateStr) => {
    if (!dateStr) return '';

    let d;
    // Support both 'YYYY-MM-DD' and 'DD/MM/YYYY'
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const parts = dateStr.split('/'); // DD/MM/YYYY
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        const day = parseInt(dd, 10);
        const month = parseInt(mm, 10) - 1; // 0-indexed
        const year = parseInt(yyyy, 10);
        d = new Date(year, month, day);
      }
    } else if (typeof dateStr === 'string' && dateStr.includes('-')) {
      // Handle DD-MM-YYYY and YYYY-MM-DD
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [dd, mm, yyyy] = dateStr.split('-');
        d = new Date(parseInt(yyyy,10), parseInt(mm,10)-1, parseInt(dd,10));
      } else {
        // ISO string like 'YYYY-MM-DD' parses reliably
        d = new Date(dateStr);
      }
    } else if (dateStr instanceof Date) {
      d = dateStr;
    } else {
      d = new Date(dateStr);
    }

    if (!(d instanceof Date) || isNaN(d)) return '';

    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 0-indexed -> 1-12

    // Financial year starts from April
    let fyStart = month >= 4 ? year : year - 1;
    let fyEnd = fyStart + 1;

    // Format: FY 25-26 (for 2025-2026)
    return `FY ${fyStart.toString().slice(-2)}-${fyEnd.toString().slice(-2)}`;
  };

  // Auto-generate VR No (format: CB-DDMMYY-001)
  const generateVRNo = (dateStr) => {
    if (!dateStr) return '';

    let d;
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      // DD/MM/YYYY
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
      }
    } else if (typeof dateStr === 'string' && dateStr.includes('-')) {
      // Handle DD-MM-YYYY and YYYY-MM-DD
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [dd, mm, yyyy] = dateStr.split('-');
        d = new Date(parseInt(yyyy,10), parseInt(mm,10)-1, parseInt(dd,10));
      } else {
        d = new Date(dateStr);
      }
    } else if (dateStr instanceof Date) {
      d = dateStr;
    } else {
      d = new Date(dateStr);
    }

    if (!(d instanceof Date) || isNaN(d)) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);

    const datePrefix = `BK-${day}${month}${year}`;

    // Count existing entries for this date to get next sequence number
    const sameDate = entries.filter(entry => {
      const ed = (typeof entry.date === 'string' && entry.date.includes('/'))
        ? (() => { const [dd, mm, yyyy] = entry.date.split('/'); return new Date(parseInt(yyyy,10), parseInt(mm,10)-1, parseInt(dd,10)); })()
        : new Date(entry.date);
      return ed instanceof Date && !isNaN(ed) && ed.toDateString() === d.toDateString();
    });

    const sequenceNo = String(sameDate.length + 1).padStart(3, '0');
    return `${datePrefix}-${sequenceNo}`;
  };

  const clearForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      date: today,
      fy: calculateFY(today),
      vrNo: generateVRNo(today),
      acHead: 'Bank',
      acName: '',
      description: '',
      method: 'Bank',
      amount: '',
      transfer: '',
      entryDate: new Date().toLocaleDateString('en-GB')
    });
    setEditIndex(null);
  };

  // Auto-generate FY and VR No when date changes
  useEffect(() => {
    if (formData.date) {
      setFormData(prev => ({
        ...prev,
        fy: calculateFY(formData.date),
        vrNo: generateVRNo(formData.date)
      }));
    }
  }, [formData.date, entries]); // Re-calculate when date or entries change

  const clearFilters = () => {
    setFilters({
      date: '',
      fy: '',
      vrNo: '',
      acHead: '',
      acName: '',
      description: '',
      method: '',
      amount: '',
      transfer: '',
      entryDate: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "date") {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        fy: calculateFY(value),
        vrNo: generateVRNo(value),
        entryDate: new Date().toLocaleDateString('en-GB') // Auto update entry date
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    console.log('Filter changed:', name, '=', value);
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [name]: value,
      };
      console.log('New filters state:', newFilters);
      return newFilters;
    });
  };

  // A/C Name options as per requirements
  const acNameOptions = [
    'Bank Opening Balances',
    'Bank Withdrawl', 
    'Bank Deposite',
    'Bank Interest'
  ];

  // Transfer options as per requirements
  const transferOptions = [
    'Office',
    'Kitchen', 
    'Salary',
    'Bank-Cash',
    'Bank-Kpay',
    'Bank-Others'
  ];

  // Get unique values for dropdown filters
  const uniqueFY = [...new Set(entries
    .map(entry => entry.fy || calculateFY(entry.date || entry.entryDate))
    .filter(Boolean)
  )];
  const uniqueVrNo = [...new Set(entries.map(entry => entry.vrNo).filter(Boolean))];
  const uniqueAcHead = [...new Set(entries.map(entry => entry.acHead).filter(Boolean))];
  const uniqueAcName = [...new Set(entries.map(entry => entry.acName).filter(Boolean))];
  const uniqueMethod = [...new Set(entries.map(entry => entry.method).filter(Boolean))];
  const uniqueTransfer = [...new Set(entries.map(entry => entry.transfer).filter(Boolean))];

  const filteredEntries = entries.filter((entry) => {
    return (
      (filters.date === '' || (entry.date && entry.date.includes(filters.date))) &&
      (filters.fy === '' || (((entry.fy || calculateFY(entry.date || entry.entryDate)) || '').toLowerCase().includes(filters.fy.toLowerCase()))) &&
      (filters.vrNo === '' || (entry.vrNo || '').toLowerCase().includes(filters.vrNo.toLowerCase())) &&
      (filters.acHead === '' || (entry.acHead || '').toLowerCase().includes(filters.acHead.toLowerCase())) &&
      (filters.acName === '' || (entry.acName || '').toLowerCase().includes(filters.acName.toLowerCase())) &&
      (filters.description === '' || (entry.description || '').toLowerCase().includes(filters.description.toLowerCase())) &&
      (filters.method === '' || (entry.method || '').toLowerCase().includes(filters.method.toLowerCase())) &&
      (filters.amount === '' || (entry.amount || '').toString().includes(filters.amount)) &&
      (filters.transfer === '' || (entry.transfer || '').toLowerCase().includes(filters.transfer.toLowerCase())) &&
      (filters.entryDate === '' || (entry.entryDate && entry.entryDate.includes(filters.entryDate)))
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.date || !formData.acName || !formData.description || !formData.amount) {
      alert('Please fill in all required fields (Date, A/C Name, Description, and Amount)');
      return;
    }

    const newEntry = {
      ...formData,
      amount: parseFloat(formData.amount),
      fy: calculateFY(formData.date),
      vrNo: generateVRNo(formData.date),
      entryDate: new Date().toISOString().split('T')[0]
    };

    try {
      if (editIndex !== null) {
        const existingId = entries[editIndex] && entries[editIndex].id ? entries[editIndex].id : null;
        const entryToSave = existingId ? { ...newEntry, id: existingId } : newEntry;

        // Update local state row
        setEntries(prev => prev.map((e, i) => (i === editIndex ? entryToSave : e)));

        // Persist to Firestore if this row has an id
        if (existingId) {
          await updateFirestoreDoc('bank', String(existingId), entryToSave);
        }

        setEditIndex(null);
      } else {
        // Add flow handled by DataContext (adds id and appends to state)
        await addBankEntry(newEntry);
      }
    } catch (err) {
      console.error('Error saving bank entry:', err);
      alert('Failed to save entry. Please try again.');
    }

    clearForm();
  };

  const handleEdit = (index) => {
    setFormData(entries[index]);
    setEditIndex(index);
  };

  const handleDelete = async (index) => {
    try {
      const entry = entries[index];
      console.log('Bank entry to delete:', entry);
      
      if (!entry.id) {
        // Soft delete from local state if the entry has no Firestore ID
        setEntries(prev => prev.filter((_, i) => i !== index));
        alert('Deleted locally. Note: This entry was not in the database.');
      } else {
        await deleteBankEntry(entry);
        alert('Bank entry deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting bank entry:', error);
      alert(`Error deleting bank entry: ${error.message}. Please try again.`);
    }
  };

  // 📌 Excel Export with headers
  const exportToExcel = () => {
    const headers = [
      "Date",
      "FY", 
      "VR No",
      "A/C Head",
      "A/C Name",
      "Description",
      "Method",
      "Amount",
      "Transfer",
      "Entry Date"
    ];

    const dataToExport = filteredEntries.map(entry => [
      formatDate(entry.date),
      entry.fy,
      entry.vrNo,
      entry.acHead,
      entry.acName,
      entry.description,
      entry.method,
      entry.amount,
      entry.transfer,
      formatDate(entry.entryDate || new Date().toLocaleDateString('en-GB'))
    ]);

    const worksheetData = [headers, ...dataToExport];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bank Book');
    XLSX.writeFile(workbook, 'bank_book.xlsx');
  };

  const importFromCSV = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rows.length) {
          alert('CSV has no data rows.');
          return;
        }

        const todayGB = new Date().toLocaleDateString('en-GB');

        const mapped = rows.map((row) => {
          const rawDate = row['Date'] || row['date'] || row['Entry Date'] || todayGB;
          const isoDate = (function normalizeToISO(dateStr){
            if (!dateStr) return '';
            if (typeof dateStr === 'string' && dateStr.includes('/')) {
              const [dd, mm, yyyy] = dateStr.split('/');
              const d = new Date(parseInt(yyyy,10), parseInt(mm,10)-1, parseInt(dd,10));
              if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
              return '';
            } else if (typeof dateStr === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
              const [dd, mm, yyyy] = dateStr.split('-');
              const d = new Date(parseInt(yyyy,10), parseInt(mm,10)-1, parseInt(dd,10));
              if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
              return '';
            }
            return dateStr; // assume ISO
          })(rawDate);

          const fy = row['FY'] || row['fy'] || calculateFY(isoDate);
          const csvVr = row['VR No'] || row['vrNo'] || '';
          const acHead = row['A/C Head'] || row['acHead'] || 'Bank';
          const acName = row['A/C Name'] || row['acName'] || '';
          const description = row['Description'] || row['description'] || '';
          const method = row['Method'] || row['method'] || 'Bank';
          const amountRaw = row['Amount'] || row['amount'] || '0';
          const amount = parseFloat(String(amountRaw).toString().replace(/,/g, '')) || 0;
          const transfer = row['Transfer'] || row['transfer'] || '';
          const entryDate = row['Entry Date'] || row['entryDate'] || todayGB;

          const computedFY = fy || calculateFY(isoDate);
          const vrNo = csvVr || generateVRNo(isoDate);

          return {
            date: isoDate,
            fy: computedFY,
            vrNo,
            acHead,
            acName,
            description,
            method,
            amount,
            transfer,
            entryDate
          };
        });

        const saved = await bulkReplaceBank(mapped);
        setEntries(saved);
        alert(`Successfully imported ${saved.length} entries (overwritten).`);
      } catch (err) {
        console.error('CSV/XLSX Import Error:', err);
        alert('Failed to import. Please check the file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const totalBalance = filteredEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);

  return (
    <div style={{ padding: 15, backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
      {/* Header & Totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, backgroundColor: 'white', padding: '15px 20px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2c3e50', margin: 0, fontSize: 24 }}>Bank Book</h2>
        <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
          <div style={{ backgroundColor: '#27ae60', color: 'white', padding: '8px 16px', borderRadius: 6, fontWeight: 'bold', fontSize: 14 }}>
            Total Balance: {formatNumber(totalBalance)}
          </div>
          <div style={{ backgroundColor: '#9b59b6', color: 'white', padding: '6px 12px', borderRadius: 6, fontWeight: 'bold', fontSize: 12 }}>
            Total Entries: {filteredEntries.length}
          </div>
        </div>
      </div>

      {/* Two-Line Beautiful Entry Form */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin: '6px 2px' }}>
        <h3 style={{ margin: 0, color: '#34495e', fontSize: '16px' }}>Add Bank Entry</h3>
      </div>
      <form id="bankEntryForm" onSubmit={handleSubmit} style={{ backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #e0e0e0' }}>
        {/* First Row - 5 fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 1fr 1fr 1.2fr', gap: 10, alignItems: 'center', marginBottom: 10 }}>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            required
            style={{ 
              padding: 8, 
              border: '2px solid #3498db', 
              borderRadius: 6, 
              fontSize: 12, 
              fontWeight: 'bold',
              backgroundColor: '#f0f8ff',
              height: '40px'
            }}
          />
          <input
            type="text"
            name="fy"
            value={formData.fy}
            readOnly
            placeholder="FY"
            style={{ 
              padding: 8, 
              border: '2px solid #95a5a6', 
              borderRadius: 6, 
              fontSize: 12, 
              fontWeight: 'bold',
              backgroundColor: '#f8f9fa',
              color: '#2c3e50',
              height: '40px'
            }}
          />
          <input
            type="text"
            name="vrNo"
            value={formData.vrNo}
            readOnly
            placeholder="VR No"
            style={{ 
              padding: 8, 
              border: '2px solid #95a5a6', 
              borderRadius: 6, 
              fontSize: 12, 
              fontWeight: 'bold',
              backgroundColor: '#f8f9fa',
              color: '#2c3e50',
              height: '40px'
            }}
          />
          <input
            type="text"
            name="acHead"
            value={formData.acHead}
            readOnly
            placeholder="A/C Head"
            style={{ 
              padding: 8, 
              border: '2px solid #95a5a6', 
              borderRadius: 6, 
              fontSize: 12, 
              fontWeight: 'bold',
              backgroundColor: '#f8f9fa',
              color: '#2c3e50',
              height: '40px'
            }}
          />
          <select
            name="acName"
            value={formData.acName}
            onChange={handleInputChange}
            required
            style={{ 
              padding: 8, 
              border: '2px solid #3498db', 
              borderRadius: 6, 
              fontSize: 12, 
              fontWeight: 'bold',
              backgroundColor: '#f0f8ff',
              height: '40px'
            }}
          >
            <option value="">Select A/C Name</option>
            {acNameOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        
        {/* Second Row - 4 fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr', gap: 10, alignItems: 'center' }}>
          <input
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Description"
            required
            style={{ 
              padding: 8, 
              border: '2px solid #3498db', 
              borderRadius: 6, 
              fontSize: 12, 
              fontWeight: 'bold',
              backgroundColor: '#f0f8ff',
              height: '40px'
            }}
          />
          <input
            type="text"
            name="method"
            value={formData.method}
            readOnly
            placeholder="Method"
            style={{ 
              padding: 8, 
              border: '2px solid #95a5a6', 
              borderRadius: 6, 
              fontSize: 12, 
              fontWeight: 'bold',
              backgroundColor: '#f8f9fa',
              color: '#2c3e50',
              height: '40px'
            }}
          />
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            placeholder="Amount"
            step="0.01"
            required
            style={{ 
              padding: 8, 
              border: '2px solid #3498db', 
              borderRadius: 6, 
              fontSize: 12, 
              fontWeight: 'bold',
              backgroundColor: '#f0f8ff',
              height: '40px'
            }}
          />
          <select
            name="transfer"
            value={formData.transfer}
            onChange={handleInputChange}
            style={{ 
              padding: 8, 
              border: '2px solid #3498db', 
              borderRadius: 6, 
              fontSize: 12, 
              fontWeight: 'bold',
              backgroundColor: '#f0f8ff',
              height: '40px'
            }}
          >
            <option value="">Select Transfer</option>
            {transferOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </form>

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '12px 15px', borderRadius: 8, marginBottom: 15, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        {/* Left Side - Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={handleSubmit}
            style={{ 
              padding: '10px 16px', 
              backgroundColor: editIndex !== null ? '#f39c12' : '#2ecc71', 
              color: 'white', 
              border: 'none', 
              borderRadius: 6, 
              cursor: 'pointer', 
              fontSize: 12, 
              fontWeight: 'bold',
              boxShadow: editIndex !== null ? '0 2px 4px rgba(243, 156, 18, 0.3)' : '0 2px 4px rgba(46, 204, 113, 0.3)'
            }}
          >
            {editIndex !== null ? '✓ Update Entry' : '+ Add Entry'}
          </button>
          <button
            type="button"
            onClick={clearForm}
            style={{ 
              padding: '10px 16px', 
              backgroundColor: '#e74c3c', 
              color: 'white', 
              border: 'none', 
              borderRadius: 6, 
              cursor: 'pointer', 
              fontSize: 12, 
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(231, 76, 60, 0.3)'
            }}
          >
            ✕ Clear Form
          </button>
        </div>

        {/* Right Side - Export/Import Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: '#2c3e50', fontWeight: 'bold' }}>
            Start Date:{' '}
            <input
              type="date"
              value={exportRange.startDate}
              onChange={e => setExportRange(prev => ({ ...prev, startDate: e.target.value }))}
              style={{ marginLeft: 5, padding: '6px', border: '1px solid #bdc3c7', borderRadius: 4, fontSize: 12, fontWeight: 'bold' }}
            />
          </label>
          <label style={{ fontSize: 12, color: '#2c3e50', fontWeight: 'bold' }}>
            End Date:{' '}
            <input
              type="date"
              value={exportRange.endDate}
              onChange={e => setExportRange(prev => ({ ...prev, endDate: e.target.value }))}
              style={{ marginLeft: 5, padding: '6px', border: '1px solid #bdc3c7', borderRadius: 4, fontSize: 12, fontWeight: 'bold' }}
            />
          </label>
          <button
            onClick={exportToExcel}
            style={{ 
              padding: '10px 16px', 
              backgroundColor: '#3498db', 
              color: 'white', 
              border: 'none', 
              borderRadius: 6, 
              cursor: 'pointer', 
              fontSize: 12, 
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(52, 152, 219, 0.3)'
            }}
          >
            Export Excel
          </button>
          <label
            style={{ 
              padding: '10px 16px', 
              backgroundColor: '#f39c12', 
              color: 'white', 
              borderRadius: 6, 
              cursor: 'pointer', 
              fontSize: 12, 
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(243, 156, 18, 0.3)'
            }}
          >
            Import CSV
            <input type="file" accept=".xlsx,.csv" onChange={importFromCSV} style={{ display: 'none' }} />
          </label>
        </div>
      </div>



      {/* Data Table */}
      <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '0', fontSize: '12px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#27ae60' }}>

            <tr style={{ backgroundColor: '#27ae60', color: 'white' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '90px' }}>Date</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '70px' }}>FY</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '100px' }}>VR No</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '90px' }}>A/C Head</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '140px' }}>A/C Name</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '250px' }}>Description</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '80px' }}>Method</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '100px' }}>Amount</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '100px' }}>Transfer</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '90px', textAlign: 'center' }}>Actions</th>
            </tr>
            <tr style={{ backgroundColor: '#27ae60', color: 'white' }}>
              <th style={{ width: '90px', backgroundColor: '#27ae60', padding: '6px' }}>
                <input
                  type="date"
                  name="date"
                  value={filters.date}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 4, border: 'none', fontSize: 12, borderRadius: 3, backgroundColor: 'white', color: '#333', fontWeight: 'bold' }}
                />
              </th>
              <th style={{ width: '70px', backgroundColor: '#27ae60', padding: '6px' }}>
                <select
                  name="fy"
                  value={filters.fy}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 4, border: 'none', fontSize: 12, borderRadius: 3, backgroundColor: 'white', color: '#333', fontWeight: 'bold' }}
                >
                  <option value="">All FY</option>
                  {uniqueFY.map(fy => (
                    <option key={fy} value={fy}>{fy}</option>
                  ))}
                </select>
              </th>
              <th style={{ width: '100px', backgroundColor: '#27ae60', padding: '6px' }}>
                <input
                  type="text"
                  name="vrNo"
                  value={filters.vrNo}
                  onChange={handleFilterChange}
                  placeholder="VR No"
                  style={{ width: '100%', padding: 4, border: 'none', fontSize: 12, borderRadius: 3, backgroundColor: 'white', color: '#333', fontWeight: 'bold' }}
                />
              </th>
              <th style={{ width: '90px', backgroundColor: '#27ae60', padding: '6px' }}>
                <select
                  name="acHead"
                  value={filters.acHead}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 4, border: 'none', fontSize: 12, borderRadius: 3, backgroundColor: 'white', color: '#333', fontWeight: 'bold' }}
                >
                  <option value="">All Head</option>
                  {uniqueAcHead.map(head => (
                    <option key={head} value={head}>{head}</option>
                  ))}
                </select>
              </th>
              <th style={{ width: '140px', backgroundColor: '#27ae60', padding: '6px' }}>
                <select
                  name="acName"
                  value={filters.acName}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 4, border: 'none', fontSize: 12, borderRadius: 3, backgroundColor: 'white', color: '#333', fontWeight: 'bold' }}
                >
                  <option value="">All Name</option>
                  {uniqueAcName.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </th>
              <th style={{ width: '250px', backgroundColor: '#27ae60', padding: '6px' }}>
                <input
                  type="text"
                  name="description"
                  placeholder="Description"
                  value={filters.description}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 4, border: 'none', fontSize: 12, borderRadius: 3, backgroundColor: 'white', color: '#333', fontWeight: 'bold' }}
                />
              </th>
              <th style={{ width: '80px', backgroundColor: '#27ae60', padding: '6px' }}>
                <select
                  name="method"
                  value={filters.method}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 4, border: 'none', fontSize: 12, borderRadius: 3, backgroundColor: 'white', color: '#333', fontWeight: 'bold' }}
                >
                  <option value="">All Method</option>
                  {uniqueMethod.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </th>
              <th style={{ width: '100px', backgroundColor: '#27ae60', padding: '6px' }}>
                <input
                  type="text"
                  name="amount"
                  placeholder="Amount"
                  value={filters.amount}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 4, border: 'none', fontSize: 12, borderRadius: 3, backgroundColor: 'white', color: '#333', fontWeight: 'bold' }}
                />
              </th>
              <th style={{ width: '100px', backgroundColor: '#27ae60', padding: '4px' }}>
                <select
                  name="transfer"
                  value={filters.transfer}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 4, border: 'none', fontSize: 12, borderRadius: 2, backgroundColor: 'white', color: '#333', fontWeight: 'bold' }}
                >
                  <option value="">All Transfer</option>
                  {uniqueTransfer.map(transfer => (
                    <option key={transfer} value={transfer}>{transfer}</option>
                  ))}
                </select>
              </th>
              <th style={{ textAlign: 'center', backgroundColor: '#27ae60' }}>
                <button 
                  onClick={clearFilters} 
                  style={{ 
                    padding: '2px 6px', 
                    fontSize: '9px', 
                    backgroundColor: '#e74c3c', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '2px', 
                    cursor: 'pointer' 
                  }}
                >
                  Clear
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #ecf0f1', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                <td style={{ padding: 6, fontSize: 12, fontWeight: 'bold', borderRight: '1px solid #ecf0f1', width: '90px' }}>{formatDate(entry.date)}</td>
                <td style={{ padding: 6, fontSize: 12, fontWeight: 'bold', borderRight: '1px solid #ecf0f1', width: '70px' }}>{entry.fy || calculateFY(entry.date || entry.entryDate)}</td>
                <td style={{ padding: 6, fontSize: 12, fontWeight: 'bold', borderRight: '1px solid #ecf0f1', width: '100px' }}>{entry.vrNo}</td>
                <td style={{ padding: 6, fontSize: 12, fontWeight: 'bold', borderRight: '1px solid #ecf0f1', width: '90px' }}>{entry.acHead}</td>
                <td style={{ padding: 6, fontSize: 12, fontWeight: 'bold', borderRight: '1px solid #ecf0f1', width: '140px' }}>{entry.acName}</td>
                <td style={{ padding: 6, fontSize: 12, fontWeight: 'bold', borderRight: '1px solid #ecf0f1', width: '250px', wordWrap: 'break-word', maxWidth: '250px' }}>{entry.description}</td>
                <td style={{ padding: 6, fontSize: 12, fontWeight: 'bold', borderRight: '1px solid #ecf0f1', width: '80px' }}>{entry.method}</td>
                <td style={{ padding: 6, fontSize: 12, fontWeight: 'bold', textAlign: 'right', borderRight: '1px solid #ecf0f1', color: '#27ae60', width: '100px' }}>{formatNumber(entry.amount)}</td>
                <td style={{ padding: 6, fontSize: 12, fontWeight: 'bold', borderRight: '1px solid #ecf0f1', width: '100px' }}>{entry.transfer}</td>
                <td style={{ padding: 6, fontSize: 12, fontWeight: 'bold', width: '90px', textAlign: 'center' }}>
                  <button onClick={() => handleEdit(index)} style={{ marginRight: 4, padding: '4px 8px', fontSize: 10, fontWeight: 'bold', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(index)} style={{ padding: '4px 8px', fontSize: 10, fontWeight: 'bold', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer' }}>Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BankApp;
