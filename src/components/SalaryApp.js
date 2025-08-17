import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../DataContext';

function SalaryApp() {
  const { salaryEntries, setSalaryEntries, addSalaryEntry, deleteSalaryEntry, updateFirestoreDoc, bulkReplaceSalary } = useData();
  const entries = salaryEntries;
  const setEntries = setSalaryEntries;

  // Dependent options: A/C Name depends on A/C Head
  // Salary Book: only HR head with two classes per user request
  const acHeadToNames = {
    'HR_Staff salaries & benefits': ['Staff Salary', 'Staff benefits']
  };

  const firstHead = Object.keys(acHeadToNames)[0];
  const firstName = acHeadToNames[firstHead][0];

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    fy: '',
    vrNo: '',
    acHead: firstHead,
    acName: firstName,
    description: '',
    method: 'Cash', // Method options: Cash, Kpay, Bank
    amount: '',
    entryDate: new Date().toLocaleDateString('en-GB')
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

    const datePrefix = `Staff-${day}${month}${year}`;

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
      acHead: firstHead,
      acName: firstName,
      description: '',
      method: 'Cash',
      amount: '',
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
    } else if (name === 'acHead') {
      const names = acHeadToNames[value] || [];
      setFormData(prev => ({
        ...prev,
        acHead: value,
        acName: names[0] || '',
      }));
    } else if (name === 'acName') {
      setFormData(prev => ({
        ...prev,
        acName: value,
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
      const newFilters = { ...prev, [name]: value };
      if (name === 'acHead') {
        // Reset A/C Name filter when head changes
        newFilters.acName = '';
      }
      console.log('New filters state:', newFilters);
      return newFilters;
    });
  };

  // A/C Name options are derived from acHeadToNames based on selected head

  // Get unique values for dropdown filters
  const uniqueFY = [...new Set(entries
    .map(entry => entry.fy || calculateFY(entry.date || entry.entryDate))
    .filter(Boolean)
  )];
  const uniqueVrNo = [...new Set(entries.map(entry => entry.vrNo).filter(Boolean))];
  const uniqueAcHead = [...new Set(entries.map(entry => entry.acHead).filter(Boolean))];
  const uniqueAcName = [...new Set(entries.map(entry => entry.acName).filter(Boolean))];
  const uniqueMethod = [...new Set(entries.map(entry => entry.method).filter(Boolean))];

  // Derived A/C Name options for the filter dropdown
  const allAcNames = Array.from(new Set(Object.values(acHeadToNames).flat()));
  const acNamesForFilter = filters.acHead ? (acHeadToNames[filters.acHead] || []) : allAcNames;

  const filteredEntries = entries.filter((entry) => {
    return (
      (filters.fy === '' || (((entry.fy || calculateFY(entry.date || entry.entryDate)) || '').toLowerCase().includes(filters.fy.toLowerCase()))) &&
      (filters.vrNo === '' || (entry.vrNo || '').toLowerCase().includes(filters.vrNo.toLowerCase())) &&
      (filters.acHead === '' || (entry.acHead || '').toLowerCase().includes(filters.acHead.toLowerCase())) &&
      (filters.acName === '' || (entry.acName || '').toLowerCase().includes(filters.acName.toLowerCase())) &&
      (filters.description === '' || (entry.description || '').toLowerCase().includes(filters.description.toLowerCase())) &&
      (filters.method === '' || (entry.method || '').toLowerCase().includes(filters.method.toLowerCase())) &&
      (filters.amount === '' || (entry.amount || '').toString().includes(filters.amount)) &&
      (filters.entryDate === '' || (entry.entryDate && entry.entryDate.includes(filters.entryDate)))
    );
  });

  // Helper: robustly parse various date formats to Date
  const parseDateSafe = (dateLike) => {
    if (!dateLike) return null;
    if (dateLike instanceof Date) return isNaN(dateLike) ? null : dateLike;
    const str = String(dateLike);
    // DD/MM/YYYY
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
        return isNaN(d) ? null : d;
      }
    }
    // DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
      const [dd, mm, yyyy] = str.split('-');
      const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
      return isNaN(d) ? null : d;
    }
    // Assume ISO YYYY-MM-DD or other Date-parsable formats
    const d = new Date(str);
    return isNaN(d) ? null : d;
  };

  // Helper: check if a date falls within the current FY (Apr 1 to Mar 31)
  const isInCurrentFY = (d) => {
    if (!d) return false;
    const today = new Date();
    const thisYear = today.getFullYear();
    const month = today.getMonth() + 1; // 1-12
    const fyStartYear = month >= 4 ? thisYear : thisYear - 1;
    const start = new Date(fyStartYear, 3, 1, 0, 0, 0, 0); // Apr 1
    const end = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999); // Mar 31 next year
    return d >= start && d <= end;
  };

  // Entries restricted to current FY for totals only (table remains unfiltered by FY)
  const fyEntries = entries.filter((e) => {
    const d = parseDateSafe(e.date || e.entryDate);
    return isInCurrentFY(d);
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
          await updateFirestoreDoc('office', String(existingId), entryToSave);
        }

        setEditIndex(null);
      } else {
        // Add flow handled by DataContext (adds id and appends to state)
        await addSalaryEntry(newEntry);
      }
    } catch (err) {
      console.error('Error saving salary entry:', err);
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
      console.log('office entry to delete:', entry);

      if (!entry.id) {
        // Soft delete from local state if the entry has no Firestore ID
        setEntries(prev => prev.filter((_, i) => i !== index));
        alert('Deleted locally. Note: This entry was not in the database.');
      } else {
        await deleteSalaryEntry(entry);
        alert('Salary entry deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting salary entry:', error);
      alert(`Error deleting salary entry: ${error.message}. Please try again.`);
    }
  };

  // 📌 Excel Export with headers (without Transfer)
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
      formatDate(entry.entryDate || new Date().toLocaleDateString('en-GB'))
    ]);

    const worksheetData = [headers, ...dataToExport];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Book');
    XLSX.writeFile(workbook, 'Salary_book.xlsx');
  };

  const importFromCSV = (e) => {
    const file = e.target.files[0];
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
        const toISO = (dateStr) => {
          if (!dateStr) return '';
          if (typeof dateStr === 'string' && dateStr.includes('/')) {
            const [dd, mm, yyyy] = dateStr.split('/');
            const d = new Date(parseInt(yyyy,10), parseInt(mm,10)-1, parseInt(dd,10));
            if (!isNaN(d)) {
              return `${String(d.getFullYear())}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            }
            return '';
          }
          if (typeof dateStr === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
            const [dd, mm, yyyy] = dateStr.split('-');
            const d = new Date(parseInt(yyyy,10), parseInt(mm,10)-1, parseInt(dd,10));
            if (!isNaN(d)) {
              return `${String(d.getFullYear())}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            }
            return '';
          }
          return dateStr; // assume ISO
        };

        const mapped = rows.map((row, idx) => {
          const rawDate = row['Date'] || row['date'] || '';
          const isoDate = toISO(rawDate) || rawDate || '';
          const fy = row['FY'] || row['fy'] || '';
          const csvVr = row['VR No'] || row['vrNo'] || row['Voucher'] || '';
          const acHead = row['A/C Head'] || row['acHead'] || row['Head'] || firstHead;
          let acName = row['A/C Name'] || row['acName'] || row['Name'] || '';
          const description = row['Description'] || row['description'] || row['Desc'] || '';
          const method = row['Method'] || row['method'] || 'Cash';
          const amountRaw = row['Amount'] || row['amount'] || '0';
          const amount = parseFloat(String(amountRaw).toString().replace(/,/g, '')) || 0;
          const transfer = row['Transfer'] || row['transfer'] || '';
          const entryDate = row['Entry Date'] || row['entryDate'] || todayGB;

          if (!acName || acName.trim() === '') {
            const names = acHeadToNames[acHead] || [];
            acName = names[0] || '';
          }

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

        // OVERWRITE existing using fast batched write (no row limit)
        const saved = await bulkReplaceSalary(mapped);
        setEntries(saved);
        alert(`Successfully imported ${saved.length} Salary entries (overwritten).`);
      } catch (err) {
        console.error('CSV Import Error:', err);
        alert('Failed to import CSV. Please check the file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Totals for header badges (current FY only)
  const totalExp = fyEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
  const totalBank = fyEntries
    .filter(e => (e.method || '').toLowerCase() === 'bank')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalCashExp = fyEntries
    .filter(e => (e.method || '').toLowerCase() === 'cash')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalKpayExp = fyEntries
    .filter(e => (e.method || '').toLowerCase() === 'kpay')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  return (
    <div style={{ padding: 15, backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
      {/* Header & Totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, backgroundColor: 'white', padding: '15px 20px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2c3e50', margin: 0, fontSize: 24 }}>Salary Book</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ backgroundColor: '#3498db', color: 'white', padding: '8px 12px', borderRadius: 6, fontWeight: 'bold', fontSize: 12 }}>
            Total Cash Exp: {formatNumber(totalCashExp)}
          </div>
          <div style={{ backgroundColor: '#3498db', color: 'white', padding: '8px 12px', borderRadius: 6, fontWeight: 'bold', fontSize: 12 }}>
            Total Kpay Exp: {formatNumber(totalKpayExp)}
          </div>
          <div style={{ backgroundColor: '#3498db', color: 'white', padding: '8px 12px', borderRadius: 6, fontWeight: 'bold', fontSize: 12 }}>
            Total Bank Exp: {formatNumber(totalBank)}
          </div>
          <div style={{ backgroundColor: '#2ecc71', color: 'white', padding: '8px 12px', borderRadius: 6, fontWeight: 'bold', fontSize: 12 }}>
            Total Exp: {formatNumber(totalExp)}
          </div>
          <div style={{ backgroundColor: '#9b59b6', color: 'white', padding: '6px 12px', borderRadius: 6, fontWeight: 'bold', fontSize: 12 }}>
            Total Entries: {fyEntries.length}
          </div>
        </div>
      </div>

      {/* Two-Line Beautiful Entry Form */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin: '6px 2px' }}>
        <h3 style={{ margin: 0, color: '#34495e', fontSize: '16px' }}>Add Salary Entry</h3>
      </div>
      <form id="salaryEntryForm" onSubmit={handleSubmit} style={{ backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #e0e0e0', width: '100%' }}>
        {/* First Row - 4 fields (A/C Head hidden) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 1fr 1fr', gap: 10, alignItems: 'center', marginBottom: 10 }}>
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
              height: '40px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <option value="">Select A/C Name</option>
            {(acHeadToNames[formData.acHead] || []).map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        
        {/* Second Row - 3 fields (Description a bit larger) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 10, alignItems: 'center', width: '100%' }}>
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
              height: '40px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
          <select
            name="method"
            value={formData.method}
            onChange={handleInputChange}
            style={{ 
              padding: 8, 
              border: '2px solid #3498db', 
              borderRadius: 6, 
              fontSize: 12, 
              fontWeight: 'bold',
              backgroundColor: '#f0f8ff',
              height: '40px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <option value="Cash">Cash</option>
            <option value="Kpay">Kpay</option>
            <option value="Bank">Bank</option>
          </select>
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
              height: '40px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
          {/* Transfer removed per request */}
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
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '140px' }}>A/C Name</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '250px' }}>Description</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '80px' }}>Method</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '100px' }}>Amount</th>
              {/* Transfer column removed per request */}
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', width: '90px', textAlign: 'center' }}>Actions</th>
            </tr>
            <tr style={{ backgroundColor: '#27ae60', color: 'white' }}>
              <th style={{ width: '90px', backgroundColor: '#27ae60', padding: '6px' }}>
                <input
                  type="date"
                  name="entryDate"
                  value={filters.entryDate}
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
              <th style={{ width: '140px', backgroundColor: '#27ae60', padding: '6px' }}>
                <select
                  name="acName"
                  value={filters.acName}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 4, border: 'none', fontSize: 12, borderRadius: 3, backgroundColor: 'white', color: '#333', fontWeight: 'bold' }}
                >
                  <option value="">All Name</option>
                  {acNamesForFilter.map(name => (
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
                  <option value="Cash">Cash</option>
                  <option value="Kpay">Kpay</option>
                  <option value="Bank">Bank</option>
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
                <td style={{ padding: 6, fontSize: 12, fontWeight: 'bold', borderRight: '1px solid #ecf0f1', width: '140px' }}>{entry.acName}</td>
                <td style={{ padding: 6, fontSize: 12, fontWeight: 'bold', borderRight: '1px solid #ecf0f1', width: '250px', wordWrap: 'break-word', maxWidth: '250px' }}>{entry.description}</td>
                <td style={{ padding: 6, fontSize: 12, fontWeight: 'bold', borderRight: '1px solid #ecf0f1', width: '80px' }}>{entry.method}</td>
                <td style={{ padding: 6, fontSize: 12, fontWeight: 'bold', textAlign: 'right', borderRight: '1px solid #ecf0f1', color: '#27ae60', width: '100px' }}>{formatNumber(entry.amount)}</td>
                {/* Transfer cell removed per request */}
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

export default SalaryApp;
