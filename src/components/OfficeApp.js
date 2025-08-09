import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../DataContext';
import { excelFormatCSVImport } from '../utils/excelFormatCSVImport';

function OfficeApp() {
  const { officeEntries, setOfficeEntries, addOfficeEntry, deleteOfficeEntry, updateFirestoreDoc } = useData();
  const entries = officeEntries;
  const setEntries = setOfficeEntries;
  const [formData, setFormData] = useState({
    date: '',
    fy: '',
    vrNo: '',
    acHead: 'Advance / Refund',
    acClass: 'Advance / Refund',
    method: 'Cash',
    credit: '',
    description: '',
    entryDate: new Date().toISOString().split('T')[0], // Auto-fill with current date
  });
  const [editIndex, setEditIndex] = useState(null);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const acHeadOptions = {
    "Advance / Refund": ["Advance / Refund"],
    "Admin Expenses": [
      "Stationary Cost", "Gov Honourable & Social Cost", "School Honourable Ceremony",
      "Bank Interest Charges", "Donation Cost", "Social Expense", "Student Refund Allowed",
      "Building maintenances & Others", "Libray Expense", "Other Expense",
      "HOME: 1 Exp", "HOME: 2 Exp"
    ],
    "Vehicle related expenses": [
      "Car Fuel Cost", "Car repari & Service", "Cycle Fuel Cost", "Cycle repari & Service",
      "Vehicle Others Cost", "Engine Power Fuel & services", "Others Fuel & services",
      "HOME: 1 Exp", "HOME: 2 Exp"
    ],
    "Building construction": ["Materials", "Labour", "Others"],
    "Assets Materials": ["Tv, CCTV, Equipments,…", "Sports Materials", "Lab & Teachig Aids"],
    "HR_Staff salaries & benefits": ["Staff Salary", "Staff benefits"],
    "Drawing Account:": ["Withdrawals by owner: 1", "Withdrawals by owner: 2"],
    "Adjustement Account": ["Adjustment"]
  };

  const [filters, setFilters] = useState({
    date: '',
    fy: '',
    vrNo: '',
    acHead: '',
    acClass: '',
    method: '',
    description: '',
    credit: '',
    entryDate: '',
  });

  const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    return parseFloat(num).toLocaleString('en-US');
  };

  const calculateFY = (dateStr) => {
    if (!dateStr) return '';
    
    let d;
    // Handle DD-MM-YYYY format from CSV
    if (dateStr.includes('-') && dateStr.split('-').length === 3) {
      const parts = dateStr.split('-');
      if (parts[0].length === 2) {
        // DD-MM-YYYY format
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        // YYYY-MM-DD format
        d = new Date(dateStr);
      }
    } else {
      d = new Date(dateStr);
    }
    
    if (isNaN(d)) {
      console.log(`Invalid date: ${dateStr}`);
      return '';
    }
    
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    let fyStart = month >= 4 ? year : year - 1;
    let fyEnd = fyStart + 1;
    const fy = `${fyStart.toString().slice(-2)}-${fyEnd.toString().slice(-2)}`;
    return fy;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    
    // Handle different date formats
    let d;
    if (dateStr.includes('/')) {
      // Handle MM/DD/YYYY or DD/MM/YYYY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // Assume DD/MM/YYYY format
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 2) {
          // DD-MM-YYYY format
          d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          // YYYY-MM-DD format
          d = new Date(dateStr);
        }
      }
    } else {
      d = new Date(dateStr);
    }
    
    if (isNaN(d)) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const generateVRNo = (dateStr) => {
    if (!dateStr) return '';
    
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    const datePrefix = `${day}${month}${year}`;
    
    // Count existing entries for the same date
    const sameDate = entries.filter(entry => {
      if (!entry.date) return false;
      const entryDate = new Date(entry.date);
      return entryDate.toDateString() === d.toDateString();
    });
    
    const sequence = String(sameDate.length + 1).padStart(3, '0');
    return `Exp-${datePrefix}-${sequence}`;
  };

  const clearForm = () => {
    setFormData({
      date: '',
      fy: '',
      vrNo: '',
      acHead: 'Advance / Refund',
      acClass: 'Advance / Refund',
      method: 'Cash',
      credit: '',
      description: '',
    });
    setEditIndex(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "date") {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        fy: calculateFY(value) ? `FY ${calculateFY(value)}` : '',
        vrNo: generateVRNo(value)
      }));
    } else if (name === "acHead") {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        acClass: acHeadOptions[value] ? acHeadOptions[value][0] : ''
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
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Get unique values for dropdown filters
  const uniqueFY = [...new Set(entries.map(entry => entry.fy).filter(Boolean))];
  const uniqueAcHead = [...new Set(entries.map(entry => entry.acHead).filter(Boolean))];
  const uniqueAcClass = [...new Set(entries.map(entry => entry.acClass).filter(Boolean))];
  const uniqueMethod = [...new Set(entries.map(entry => entry.method).filter(Boolean))];

  const filteredEntries = entries.filter((entry) => {
    return (
      (filters.date === '' || (entry.date && entry.date.includes(filters.date))) &&
      (filters.fy === '' || (entry.fy?.toLowerCase() || '').includes(filters.fy.toLowerCase())) &&
      (filters.acHead === '' || (entry.acHead || '').toLowerCase().includes(filters.acHead.toLowerCase())) &&
      (filters.acName === '' || (entry.acName || '').toLowerCase().includes(filters.acName.toLowerCase())) &&
      (filters.description === '' || (entry.description || '').toLowerCase().includes(filters.description.toLowerCase())) &&
      (filters.method === '' || (entry.method || '').toLowerCase().includes(filters.method.toLowerCase())) &&
      (filters.debit === '' || (entry.debit || '').toString().includes(filters.debit)) &&
      (filters.credit === '' || (entry.credit || '').toString().includes(filters.credit))
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editIndex !== null) {
        const existingEntry = entries[editIndex];
        if (!existingEntry.id) {
          alert('Cannot update: This entry was not properly saved to the database.');
          return;
        }
        
        // Update in Firebase
        await updateFirestoreDoc('office', existingEntry.id, formData);
        
        // Update local state
        const updatedEntries = [...entries];
        updatedEntries[editIndex] = { ...formData, id: existingEntry.id };
        setEntries(updatedEntries);
      } else {
        await addOfficeEntry(formData);
      }
      clearForm();
      alert('Office entry saved successfully!');
    } catch (error) {
      console.error('Error saving office entry:', error);
      alert('Error saving office entry. Please try again.');
    }
  };

  const handleEdit = (index) => {
    setFormData(entries[index]);
    setEditIndex(index);
  };

  const handleDelete = async (index) => {
    try {
      const entry = entries[index];
      console.log('Office entry to delete:', entry);
      
      if (!entry.id) {
        alert('Cannot delete: This entry was not properly saved to the database.');
        return;
      }
      
      await deleteOfficeEntry(entry);
      alert('Office entry deleted successfully!');
    } catch (error) {
      console.error('Error deleting office entry:', error);
      alert(`Error deleting office entry: ${error.message}. Please try again.`);
    }
  };

  const exportToExcel = () => {
    let dataToExport = entries;
    
    // Filter by date range if provided
    if (dateRange.startDate || dateRange.endDate) {
      dataToExport = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
        
        if (startDate && entryDate < startDate) return false;
        if (endDate && entryDate > endDate) return false;
        return true;
      });
    }
    
    // Format data for export with headers matching table column order exactly
    const exportData = dataToExport.map(entry => {
      const formattedEntry = {};
      // Match exact table column order: Date, FY, VR No., A/C Head, A/C Class, Description, Method, Credit, Entry Date
      formattedEntry['Date'] = formatDate(entry.date);
      formattedEntry['FY'] = entry.fy || '';
      formattedEntry['VR No.'] = entry.vrNo || '';
      formattedEntry['A/C Head'] = entry.acHead || 'Advance / Refund';
      formattedEntry['A/C Class'] = entry.acClass || 'Advance / Refund';
      formattedEntry['Description'] = entry.description || '';
      formattedEntry['Method'] = entry.method || 'Cash';
      formattedEntry['Credit'] = parseFloat(entry.credit || 0);
      formattedEntry['Remark'] = entry.remark || '';
      formattedEntry['Entry Date'] = formatDate(entry.entryDate || new Date().toISOString().split('T')[0]);
      return formattedEntry;
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Office Expense Book');
    
    const dateRangeStr = dateRange.startDate || dateRange.endDate 
      ? `_${dateRange.startDate || 'start'}_to_${dateRange.endDate || 'end'}`
      : '';
    
    XLSX.writeFile(workbook, `Office_expense_book${dateRangeStr}.xlsx`);
  };

  const importFromCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    excelFormatCSVImport(
      file,
      'office',
      // Success callback
      (result) => {
        setOfficeEntries(prev => [...prev, ...result.data]);
        alert(`✅ ${result.message}\n\nImported ${result.successfulRows} entries successfully!\n\nFormat: Excel export format (same columns and order)`);
      },
      // Error callback
      (error) => {
        alert(`❌ CSV Import Failed:\n\n${error}\n\n💡 Solution:\n• CSV must match Excel export format exactly\n• Use the CSV Fix tool to download correct sample`);
      }
    );

    // Reset file input
    e.target.value = '';
  };



  const totalExpenses = filteredEntries.reduce((sum, entry) => sum + (parseFloat(entry.credit) || 0), 0);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#8e44ad', margin: 0 }}>Office Expense Book</h2>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#8e44ad', color: 'white', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold' }}>
            Total Office Expense: {formatNumber(totalExpenses)}
          </div>
          <div style={{ backgroundColor: '#3498db', color: 'white', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold' }}>
            Total Entries: {filteredEntries.length}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '5px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        
        {/* Single Row: Date, FY, VR No., A/C Head, A/C Class, Method, Credit */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) minmax(50px, 0.5fr) minmax(120px, 1fr) minmax(150px, 1.5fr) minmax(150px, 1.5fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr)', gap: '8px', marginBottom: '10px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', color: '#2c3e50', fontSize: '11px' }}>Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '11px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', color: '#2c3e50', fontSize: '11px' }}>FY</label>
            <input
              type="text"
              name="fy"
              value={formData.fy}
              onChange={handleInputChange}
              placeholder="FY"
              readOnly
              style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '11px', backgroundColor: '#f8f9fa' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', color: '#2c3e50', fontSize: '11px' }}>VR No.</label>
            <input
              type="text"
              name="vrNo"
              value={formData.vrNo}
              onChange={handleInputChange}
              placeholder="Auto-generated"
              readOnly
              style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '11px', backgroundColor: '#f8f9fa' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', color: '#2c3e50', fontSize: '11px' }}>A/C Head</label>
            <select
              name="acHead"
              value={formData.acHead}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '11px' }}
            >
              {Object.keys(acHeadOptions).map(head => (
                <option key={head} value={head}>{head}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', color: '#2c3e50', fontSize: '11px' }}>A/C Class</label>
            <select
              name="acClass"
              value={formData.acClass}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '11px' }}
            >
              {acHeadOptions[formData.acHead]?.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', color: '#2c3e50', fontSize: '11px' }}>Method</label>
            <select
              name="method"
              value={formData.method}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '11px' }}
            >
              <option value="Cash">Cash</option>
              <option value="Kpay">Kpay</option>
              <option value="Bank">Bank</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', color: '#2c3e50', fontSize: '11px' }}>Credit</label>
            <input
              type="number"
              name="credit"
              value={formData.credit}
              onChange={handleInputChange}
              placeholder="Credit"
              style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '11px' }}
            />
          </div>
        </div>
        
        {/* Second Row: Description (full width) */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', color: '#2c3e50', fontSize: '11px' }}>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter description"
            rows={2}
            style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#8e44ad', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>
            {editIndex !== null ? 'Update' : 'Add'} Entry
          </button>
          <button type="button" onClick={clearForm} style={{ padding: '8px 15px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>
            Clear
          </button>
          <input type="file" accept=".csv" onChange={importFromCSV} style={{ display: 'none' }} id="csv-input" />
          <label htmlFor="csv-input" style={{ padding: '8px 15px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', display: 'inline-block', fontSize: '12px' }}>
            Import CSV
          </label>
          
          {/* Date Range for Export */}
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginLeft: '10px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#2c3e50' }}>Start:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              style={{ padding: '4px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '11px', width: '130px' }}
            />
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#2c3e50' }}>End:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              style={{ padding: '4px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '11px', width: '130px' }}
            />
          </div>
          
          <button type="button" onClick={exportToExcel} style={{ padding: '8px 15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>
            Export Excel
          </button>
        </div>
      </form>

      <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '0', fontSize: '11px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#8e44ad' }}>
            <tr style={{ backgroundColor: '#8e44ad', color: 'white' }}>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '80px' }}>Date</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '50px' }}>FY</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '120px' }}>VR No.</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '100px' }}>A/C Head</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '100px' }}>A/C Class</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '350px' }}>Description</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '60px' }}>Method</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '85px' }}>Credit</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '80px' }}>Actions</th>
            </tr>
            <tr>
              <th style={{ padding: '3px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', backgroundColor: '#8e44ad' }}>
                <input
                  type="date"
                  name="date"
                  placeholder="Date"
                  value={filters.date}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '2px', border: 'none', fontSize: '10px', backgroundColor: 'white', color: '#333', lineHeight: '1.2' }}
                />
              </th>
              <th style={{ padding: '3px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', backgroundColor: '#8e44ad' }}>
                <select
                  name="fy"
                  value={filters.fy}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '2px', border: 'none', fontSize: '9px', borderRadius: '2px', backgroundColor: 'white', color: '#333' }}
                >
                  <option value="">All FY</option>
                  {uniqueFY.map(fy => (
                    <option key={fy} value={fy}>{fy}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '3px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', backgroundColor: '#8e44ad' }}>
                <input
                  type="text"
                  name="vrNo"
                  placeholder="VR No."
                  value={filters.vrNo}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '2px', border: 'none', fontSize: '10px', backgroundColor: 'white', color: '#333', lineHeight: '1.2' }}
                />
              </th>
              <th style={{ padding: '3px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', backgroundColor: '#8e44ad' }}>
                <select
                  name="acHead"
                  value={filters.acHead}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '2px', border: 'none', fontSize: '9px', borderRadius: '2px', backgroundColor: 'white', color: '#333' }}
                >
                  <option value="">All A/C Head</option>
                  {uniqueAcHead.map(acHead => (
                    <option key={acHead} value={acHead}>{acHead}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '3px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', backgroundColor: '#8e44ad' }}>
                <select
                  name="acClass"
                  value={filters.acClass}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '2px', border: 'none', fontSize: '9px', borderRadius: '2px', backgroundColor: 'white', color: '#333' }}
                >
                  <option value="">All A/C Class</option>
                  {uniqueAcClass.map(acClass => (
                    <option key={acClass} value={acClass}>{acClass}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '3px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', backgroundColor: '#8e44ad' }}>
                <input
                  type="text"
                  name="description"
                  placeholder="Description"
                  value={filters.description}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '2px', border: 'none', fontSize: '10px', backgroundColor: 'white', color: '#333', lineHeight: '1.2' }}
                />
              </th>
              <th style={{ padding: '3px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', backgroundColor: '#8e44ad' }}>
                <select
                  name="method"
                  value={filters.method}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '2px', border: 'none', fontSize: '9px', borderRadius: '2px', backgroundColor: 'white', color: '#333' }}
                >
                  <option value="">All Method</option>
                  {uniqueMethod.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '3px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', backgroundColor: '#8e44ad' }}>
                <input
                  type="text"
                  name="credit"
                  placeholder="Credit"
                  value={filters.credit}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '2px', border: 'none', fontSize: '10px', backgroundColor: 'white', color: '#333', lineHeight: '1.2' }}
                />
              </th>
              <th style={{ padding: '3px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', backgroundColor: '#8e44ad' }}>
                <button
                  onClick={() => setFilters({ date: '', fy: '', vrNo: '', acHead: '', acClass: '', method: '', description: '', credit: '' })}
                  style={{ padding: '2px 6px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '10px', lineHeight: '1.2' }}
                >
                  Clear
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry, index) => (
              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                <td style={{ padding: '4px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', width: '80px' }}>{formatDate(entry.date)}</td>
                <td style={{ padding: '4px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', width: '50px' }}>{entry.fy || ''}</td>
                <td style={{ padding: '4px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', width: '120px' }}>{entry.vrNo || ''}</td>
                <td style={{ padding: '4px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', width: '100px' }}>{entry.acHead}</td>
                <td style={{ padding: '4px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', width: '100px' }}>{entry.acClass || ''}</td>
                <td style={{ padding: '4px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', width: '350px', wordWrap: 'break-word' }}>{entry.description}</td>
                <td style={{ padding: '4px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', width: '60px', textAlign: 'center' }}>{entry.method || 'Cash'}</td>
                <td style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'right', color: '#8e44ad', fontSize: '11px', lineHeight: '1.2', width: '85px', fontWeight: 'bold' }}>{formatNumber(entry.credit)}</td>
                <td style={{ padding: '4px', border: '1px solid #ddd', fontSize: '11px', lineHeight: '1.2', width: '80px', textAlign: 'right' }}>
                  <button onClick={() => handleEdit(index)} style={{ marginRight: '2px', padding: '2px 4px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '9px' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(index)} style={{ padding: '2px 4px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '9px' }}>
                    Del
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OfficeApp;
