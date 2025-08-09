import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../DataContext';

function IncomeApp() {
  const { incomeEntries, setIncomeEntries, customers, addIncomeEntry, deleteIncomeEntry, updateFirestoreDoc } = useData();
  const entries = incomeEntries;
  const setEntries = setIncomeEntries;
  
  // Dropdown options
  const acHeadOptions = ['Boarder', 'Semi Boarder', 'Day'];
  const acNameOptions = ['Pre-', 'K G-', 'G _1', 'G _2', 'G _3', 'G _4', 'G _5', 'G _6', 'G _7', 'G _8', 'G _9', 'G_10', 'G_11', 'G_12'];
  const genderOptions = ['Male', 'Female'];
  const feesNameOptions = ['Registration', 'Services', 'Ferry'];
  const methodOptions = ['Cash', 'Kpay', 'Bank', 'Others'];

  const [formData, setFormData] = useState({
    vrNo: '',
    date: new Date().toISOString().split('T')[0], // Set today's date by default
    fy: '', // Auto-generated FY
    id: '', // Customer ID from Customer List
    acHead: '',
    acName: '',
    gender: '',
    name: '',
    feesName: '',
    method: '',
    debit: '',
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
    fy: '',
    acHead: '',
    acName: '',
    gender: '',
    name: '',
    feesName: '',
    method: '',
    debit: '',
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
        fy: generateFY(formData.date)
      }));
    }
  }, [formData.date]);

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

  // CSV Import functionality
  const importFromCSV = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvData = event.target.result;
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const parsedData = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            const entry = {};
            headers.forEach((header, index) => {
              entry[header] = values[index] || '';
            });
            // Auto-generate FY for imported entries
            if (entry.date) {
              entry.fy = generateFY(entry.date);
            }
            parsedData.push(entry);
          }
        }
        setEntries(parsedData);
        alert(`Imported ${parsedData.length} entries successfully (existing data overwritten)!`);
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset file input
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
      acHead: '',
      acName: '',
      gender: '',
      name: '',
      feesName: '',
      method: '',
      debit: '',
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
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport.map(entry => ({
      'VR No': String(entry.vrNo || ''), // Convert to string to prevent scientific notation
      'Date': formatDate(entry.date),
      'FY': entry.fy || generateFY(entry.date),
      'ID': entry.id || '',
      'A/C Head': entry.acHead,
      'A/C Name': entry.acName,
      'Gender': entry.gender || '',
      'Name': entry.name, // Full formatted name (e.g., "Pre- M Mg-မောင်သန့်စင်")
      'Entry Name': entry.customerName || entry.rawName || '', // Raw customer name from customer list
      'Fees Name': entry.feesName,
      'Method': entry.method,
      'Debit': entry.debit,
      'Remark': '',
      'Entry Date': entry.entryDate || entry.date
    })));
    
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
        !formData.name || !formData.feesName || !formData.method || !formData.debit) {
      alert('Please fill in all required fields');
      return;
    }

    const entryData = {
      ...formData,
      debit: parseFloat(formData.debit),
      id: editIndex !== null ? entries[editIndex].id : (formData.id || generateNextCustomerId()),
      customerName: formData.customerName || '', // Raw customer name for Entry Name column
      entryDate: new Date().toISOString().split('T')[0], // Current date when entry is created
    };

    try {
      if (editIndex !== null) {
        const existingEntry = entries[editIndex];
        if (!existingEntry.id) {
          alert('Cannot update: This entry was not properly saved to the database.');
          return;
        }
        
        // Update in Firebase
        await updateFirestoreDoc('income', existingEntry.id, entryData);
        
        // Update local state
        const updatedEntries = [...entries];
        updatedEntries[editIndex] = { ...entryData, id: existingEntry.id };
        setEntries(updatedEntries);
      } else {
        await addIncomeEntry(entryData);
      }
      clearForm();
      alert('Income entry saved successfully!');
    } catch (error) {
      console.error('Error saving income entry:', error);
      alert('Error saving income entry. Please try again.');
    }
  };

  const selectCustomer = (customer) => {
    const customerName = `${customer.acName} ${customer.gender === 'Male' ? 'M' : 'F'} ${customer.name}`;
    setFormData({
      ...formData,
      id: customer.customId || customer.id, // Auto-populate ID from Customer List
      acHead: customer.acHead,
      acName: customer.acName,
      gender: customer.gender,
      name: customerName, // Full formatted name (e.g., "Pre- M Mg-မောင်သန့်စင်")
      customerName: customer.name, // Raw customer name from customer list (e.g., "Mg-မောင်သန့်စင်")
    });
    setShowCustomerList(false);
  };

  const printInvoiceDirectly = (entry) => {
    const printWindow = window.open('', '_blank');
    const cleanedName = cleanName(entry.name);
    const monthYear = getMonthFromDate(entry.date);
    
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
    setFormData(entries[index]);
    setEditIndex(index);
  };

  const handleDelete = async (index) => {
    try {
      const entry = entries[index];
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
      (filters.acHead === '' || (entry.acHead || '').toLowerCase().includes(filters.acHead.toLowerCase())) &&
      (filters.acName === '' || (entry.acName || '').toLowerCase().includes(filters.acName.toLowerCase())) &&
      (filters.name === '' || (entry.name || '').toLowerCase().includes(filters.name.toLowerCase())) &&
      (filters.feesName === '' || (entry.feesName || '').toLowerCase().includes(filters.feesName.toLowerCase())) &&
      (filters.method === '' || (entry.method || '').toLowerCase().includes(filters.method.toLowerCase())) &&
      (filters.debit === '' || (entry.debit || '').toString().includes(filters.debit))
    );
  });

  const totalDebit = filteredEntries.reduce((sum, entry) => sum + (parseFloat(entry.debit) || 0), 0);

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
      {/* Header with Title and Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ color: '#27ae60', margin: 0 }}>Income & Invoice Book</h2>
        <div style={{ backgroundColor: '#27ae60', color: 'white', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', fontSize: '14px' }}>
          Total Income: {formatNumber(totalDebit)} MMK | Total Entries: {filteredEntries.length}
        </div>
      </div>

      {/* Export Controls */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '5px' }}>
        <label style={{ fontWeight: 'bold' }}>Start Date:</label>
        <input
          type="date"
          value={exportStartDate}
          onChange={(e) => setExportStartDate(e.target.value)}
          style={{ padding: '5px', border: '1px solid #ddd', borderRadius: '3px' }}
        />
        <label style={{ fontWeight: 'bold' }}>End Date:</label>
        <input
          type="date"
          value={exportEndDate}
          onChange={(e) => setExportEndDate(e.target.value)}
          style={{ padding: '5px', border: '1px solid #ddd', borderRadius: '3px' }}
        />
        <button
          onClick={exportToExcel}
          style={{ padding: '8px 15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
        >
          Export Excel
        </button>
        <label htmlFor="csvImport" style={{ padding: '8px 15px', backgroundColor: '#3498db', color: 'white', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>
          Import CSV
        </label>
        <input
          id="csvImport"
          type="file"
          accept=".csv"
          onChange={importFromCSV}
          style={{ display: 'none' }}
        />
      </div>

      {/* Entry Form */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '5px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: '15px', color: '#2c3e50', fontSize: '16px' }}>Entry Form</h3>
        
        {/* First Line: VR No, Date, FY, A/C Head, A/C Name, Gender */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>VR No:</label>
            <input
              type="text"
              name="vrNo"
              value={formData.vrNo}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px' }}
              placeholder="Auto-generated"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>Date:</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>FY:</label>
            <input
              type="text"
              name="fy"
              value={formData.fy}
              readOnly
              style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: '#f8f9fa' }}
              placeholder="Auto-generated"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>A/C Head:</label>
            <select
              name="acHead"
              value={formData.acHead}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px' }}
              required
            >
              <option value="">Select A/C Head</option>
              {acHeadOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>A/C Name:</label>
            <select
              name="acName"
              value={formData.acName}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px' }}
              required
            >
              <option value="">Select A/C Name</option>
              {acNameOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>Gender:</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px' }}
              required
            >
              <option value="">Select Gender</option>
              {genderOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Line: Fees Name, Method, Debit, Name */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: '10px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>Fees Name:</label>
            <select
              name="feesName"
              value={formData.feesName}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px' }}
              required
            >
              <option value="">Select Fees Name</option>
              {feesNameOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>Method:</label>
            <select
              name="method"
              value={formData.method}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px' }}
              required
            >
              <option value="">Select Method</option>
              {methodOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>Debit:</label>
            <input
              type="number"
              name="debit"
              value={formData.debit}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px' }}
              placeholder="0.00"
              step="0.01"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '3px', fontWeight: 'bold', fontSize: '12px' }}>Name:</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                style={{ flex: 1, padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px' }}
                placeholder="Auto-filled or select from list"
                required
              />
              <button
                type="button"
                onClick={() => setShowCustomerList(true)}
                style={{ padding: '6px 10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}
              >
                Select
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            style={{ padding: '10px 20px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            {editIndex !== null ? 'Update' : 'Add'}
          </button>
          <button
            type="button"
            onClick={clearForm}
            style={{ padding: '10px 20px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Clear
          </button>
        </div>
      </form>

      {/* Table View - Below Entry Form */}
      <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ backgroundColor: '#27ae60', color: 'white' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '80px' }}>VR No</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '70px' }}>Date</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '50px' }}>FY</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '80px' }}>A/C Head</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '80px' }}>A/C Name</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '200px' }}>Name</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '80px' }}>Fees Name</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '80px' }}>Method</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '80px' }}>Debit</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '120px' }}>Actions</th>
            </tr>
            <tr style={{ backgroundColor: '#27ae60', color: 'white' }}>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <input
                  type="text"
                  name="vrNo"
                  placeholder="Filter VR No"
                  value={filters.vrNo}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}
                />
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <input
                  type="date"
                  name="date"
                  value={filters.date}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}
                />
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <input
                  type="text"
                  name="fy"
                  placeholder="Filter FY"
                  value={filters.fy}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}
                />
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <select
                  name="acHead"
                  value={filters.acHead}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}
                >
                  <option value="">All</option>
                  {acHeadOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <select
                  name="acName"
                  value={filters.acName}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}
                >
                  <option value="">All</option>
                  {acNameOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <input
                  type="text"
                  name="name"
                  placeholder="Filter Name"
                  value={filters.name}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}
                />
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <select
                  name="feesName"
                  value={filters.feesName}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}
                >
                  <option value="">All</option>
                  {feesNameOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <select
                  name="method"
                  value={filters.method}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}
                >
                  <option value="">All</option>
                  {methodOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <input
                  type="text"
                  name="debit"
                  placeholder="Filter Debit"
                  value={filters.debit}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}
                />
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd', textAlign: 'center' }}>
                <button
                  onClick={() => setFilters({ vrNo: '', date: '', fy: '', acHead: '', acName: '', gender: '', name: '', feesName: '', method: '', debit: '' })}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                >
                  Clear
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ padding: '10px', textAlign: 'center' }}>No entries found.</td>
              </tr>
            ) : (
              filteredEntries.map((entry, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{entry.vrNo}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{formatDate(entry.date)}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{entry.fy || generateFY(entry.date)}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{entry.acHead}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{entry.acName}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{entry.name}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{entry.feesName}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '11px' }}>{entry.method}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', textAlign: 'right', color: '#27ae60', fontSize: '11px', fontWeight: 'bold' }}>{formatNumber(entry.debit)}</td>
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
                  <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', width: '80px' }}>A/C Class</th>
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
                    <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '10px' }}>{(customer.displayName || customer.name)} {customer.customId || customer.id}</td>
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
