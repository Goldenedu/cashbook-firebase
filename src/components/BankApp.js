import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../DataContext';
import { excelFormatCSVImport } from '../utils/excelFormatCSVImport';

function BankApp() {
  const { bankEntries, setBankEntries, addBankEntry, deleteBankEntry, updateFirestoreDoc } = useData();
  const entries = bankEntries;
  const setEntries = setBankEntries;

  const [formData, setFormData] = useState({
    date: '',
    acHead: 'Bank',
    acName: '',
    description: '',
    method: 'Bank',
    debit: '',
    credit: '',
    transfer: '',
    fy: ''
  });

  const [editIndex, setEditIndex] = useState(null);

  const [filters, setFilters] = useState({
    date: '',
    fy: '',
    acHead: '',
    acName: '',
    description: '',
    method: '',
    debit: '',
    credit: '',
    transfer: ''
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
    console.log(`Date: ${dateStr} -> FY: ${fy}`);
    return fy;
  };

  const clearForm = () => {
    setFormData({
      date: '',
      acHead: 'Bank',
      acName: '',
      description: '',
      method: 'Bank',
      debit: '',
      credit: '',
      transfer: '',
      fy: ''
    });
    setEditIndex(null);
  };

  const clearFilters = () => {
    setFilters({
      date: '',
      fy: '',
      acHead: '',
      acName: '',
      description: '',
      method: '',
      debit: '',
      credit: '',
      transfer: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "date") {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        fy: calculateFY(value) ? `FY ${calculateFY(value)}` : ''
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

  // Get unique values for dropdown filters
  const uniqueFY = [...new Set(entries.map(entry => entry.fy).filter(Boolean))];
  const uniqueAcHead = [...new Set(entries.map(entry => entry.acHead).filter(Boolean))];
  const uniqueAcName = [...new Set(entries.map(entry => entry.acName).filter(Boolean))];
  const uniqueMethod = [...new Set(entries.map(entry => entry.method).filter(Boolean))];
  const uniqueTransfer = [...new Set(entries.map(entry => entry.transfer).filter(Boolean))];

  const filteredEntries = entries.filter((entry) => {
    const entryDate = new Date(entry.date);
    const startDate = exportRange.startDate ? new Date(exportRange.startDate) : null;
    const endDate = exportRange.endDate ? new Date(exportRange.endDate) : null;

    return (
      (filters.date === '' || (entry.date && entry.date.includes(filters.date))) &&
      (filters.fy === '' || (entry.fy?.toLowerCase() || '').includes(filters.fy.toLowerCase())) &&
      (filters.acHead === '' || (entry.acHead || '').toLowerCase().includes(filters.acHead.toLowerCase())) &&
      (filters.acName === '' || (entry.acName || '').toLowerCase().includes(filters.acName.toLowerCase())) &&
      (filters.description === '' || (entry.description || '').toLowerCase().includes(filters.description.toLowerCase())) &&
      (filters.method === '' || (entry.method || '').toLowerCase().includes(filters.method.toLowerCase())) &&
      (filters.debit === '' || (entry.debit || '').toString().includes(filters.debit)) &&
      (filters.credit === '' || (entry.credit || '').toString().includes(filters.credit)) &&
      (filters.transfer === '' || (entry.transfer || '').toLowerCase().includes(filters.transfer.toLowerCase())) &&
      (!startDate || entryDate >= startDate) &&
      (!endDate || entryDate <= endDate)
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
        
        const entryData = {
          ...formData,
          debit: formData.debit ? parseFloat(formData.debit) || 0 : 0,
          credit: formData.credit ? parseFloat(formData.credit) || 0 : 0
        };
        
        // Update in Firebase
        await updateFirestoreDoc('bank', existingEntry.id, entryData);
        
        // Update local state
        const updatedEntries = [...entries];
        updatedEntries[editIndex] = { ...entryData, id: existingEntry.id };
        setEntries(updatedEntries);
      } else {
        const entryData = {
          ...formData,
          debit: formData.debit ? parseFloat(formData.debit) || 0 : 0,
          credit: formData.credit ? parseFloat(formData.credit) || 0 : 0,
          timestamp: new Date().toISOString()
        };
        
        console.log('Processed bank entry data:', entryData);
        await addBankEntry(entryData);
      }
      clearForm();
      alert('Bank entry saved successfully!');
    } catch (error) {
      console.error('Error saving bank entry:', error);
      alert('Error saving bank entry. Please try again.');
    }
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
        alert('Cannot delete: This entry was not properly saved to the database.');
        return;
      }
      
      await deleteBankEntry(entry);
      alert('Bank entry deleted successfully!');
    } catch (error) {
      console.error('Error deleting bank entry:', error);
      alert(`Error deleting bank entry: ${error.message}. Please try again.`);
    }
  };

  // 📌 Excel Export with headers (UI table + Entry Date)
  const exportToExcel = () => {
    const headers = [
      "Date",
      "FY",
      "A/C Head",
      "A/C Name",
      "Description",
      "Method",
      "Debit",
      "Credit",
      "Transfer",
      "Entry Date"
    ];

    const dataToExport = filteredEntries.map(entry => [
      formatDate(entry.date),
      entry.fy,
      entry.acHead,
      entry.acName,
      entry.description,
      entry.method,
      entry.debit,
      entry.credit,
      entry.transfer,
      formatDate(entry.timestamp || entry.entryDate || entry.date || new Date().toISOString().split('T')[0])
    ]);

    const worksheetData = [headers, ...dataToExport];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bank Book');
    XLSX.writeFile(workbook, 'bank_book.xlsx');
  };

  const importFromCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    excelFormatCSVImport(
      file,
      'bank',
      // Success callback
      (result) => {
        setBankEntries(prev => [...prev, ...result.data]);
        alert(`✅ ${result.message}\n\nImported ${result.successfulRows} entries successfully!\n\nFormat: Excel export format (same columns and order)`);
      },
      // Error callback
      (error) => {
        alert(`❌ CSV Import Failed:\n\n${error}\n\n💡 Solution:\n• CSV must match Excel export format exactly\n• Use: Date, FY, A/C Head, A/C Name, Description, Method, Debit, Credit, Transfer, Entry Date\n• Try the CSV Fix tool to download correct sample`);
      }
    );

    // Reset file input
    e.target.value = '';
  };

  const totalDebit = filteredEntries.reduce((sum, entry) => sum + (parseFloat(entry.debit) || 0), 0);
  const totalCredit = filteredEntries.reduce((sum, entry) => sum + (parseFloat(entry.credit) || 0), 0);
  const netBalance = totalDebit - totalCredit;

  return (
    <div style={{ padding: 15, backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
      {/* Header & Totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, backgroundColor: 'white', padding: '15px 20px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#2c3e50', margin: 0, fontSize: 24 }}>Bank Book</h2>
        <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
          <div style={{ backgroundColor: '#3498db', color: 'white', padding: '6px 12px', borderRadius: 6, fontWeight: 'bold', fontSize: 12 }}>
            Total Debit: {formatNumber(totalDebit)}
          </div>
          <div style={{ backgroundColor: '#2ecc71', color: 'white', padding: '6px 12px', borderRadius: 6, fontWeight: 'bold', fontSize: 12 }}>
            Total Credit: {formatNumber(totalCredit)}
          </div>
          <div style={{ backgroundColor: netBalance >= 0 ? '#2ecc71' : '#e74c3c', color: 'white', padding: '6px 12px', borderRadius: 6, fontWeight: 'bold', fontSize: 12 }}>
            Net Balance: {formatNumber(netBalance)}
          </div>
          <div style={{ backgroundColor: '#9b59b6', color: 'white', padding: '6px 12px', borderRadius: 6, fontWeight: 'bold', fontSize: 12 }}>
            Total Entries: {filteredEntries.length}
          </div>
        </div>
      </div>

      {/* Compact Entry Form */}
      <form id="bankEntryForm" onSubmit={handleSubmit} style={{ backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        {/* First row - Main form fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            required
            style={{ padding: 6, border: '1px solid #bdc3c7', borderRadius: 4, fontSize: 12 }}
          />
          <input
            type="text"
            name="fy"
            value={formData.fy}
            readOnly
            placeholder="Fiscal Year"
            style={{ padding: 6, border: '1px solid #bdc3c7', borderRadius: 4, backgroundColor: '#ecf0f1', fontSize: 12 }}
          />
          <input
            type="text"
            name="acHead"
            value={formData.acHead}
            onChange={handleInputChange}
            placeholder="Account Head"
            required
            style={{ padding: 6, border: '1px solid #bdc3c7', borderRadius: 4, fontSize: 12 }}
          />
          <select
            name="acName"
            value={formData.acName}
            onChange={handleInputChange}
            required
            style={{ padding: 6, border: '1px solid #bdc3c7', borderRadius: 4, fontSize: 12 }}
          >
            <option value="">Select A/C Name</option>
            <option>Opening</option>
            <option>Deposite</option>
            <option>Withdrawl</option>
            <option>Interest</option>
          </select>


          <input
            type="number"
            name="debit"
            value={formData.debit}
            onChange={handleInputChange}
            placeholder="Debit"
            step="0.01"
            style={{ padding: 6, border: '1px solid #bdc3c7', borderRadius: 4, fontSize: 12 }}
          />
          <input
            type="number"
            name="credit"
            value={formData.credit}
            onChange={handleInputChange}
            placeholder="Credit"
            step="0.01"
            style={{ padding: 6, border: '1px solid #bdc3c7', borderRadius: 4, fontSize: 12 }}
          />
        </div>
        
        {/* Second row - Transfer, Method, Description */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 10, marginBottom: 12 }}>          
          <select
            name="transfer"
            value={formData.transfer}
            onChange={handleInputChange}
            style={{ padding: 6, border: '1px solid #bdc3c7', borderRadius: 4, fontSize: 12 }}
          >
            <option value="">Select Transfer</option>
            <option>Office Exp</option>
            <option>Kitchen Exp</option>
            <option>Salary Exp</option>
            <option>Bank-Cash</option>
            <option>Bank-Kpay</option>
            <option>Bank-Bank</option>
          </select>
          <select
            name="method"
            value={formData.method}
            onChange={handleInputChange}
            style={{ padding: 6, border: '1px solid #bdc3c7', borderRadius: 4, fontSize: 12 }}
          >
            <option value="">Select Method</option>
            <option value="Bank">Bank</option>
            <option value="Bank-Bank">Bank-Bank</option>
          </select>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Description (extended for longer text)"
            style={{ 
              padding: 6, 
              border: '1px solid #bdc3c7', 
              borderRadius: 4, 
              fontSize: 12
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>
            {editIndex !== null ? 'Update' : 'Add'} Entry
          </button>
          <button type="button" onClick={clearForm} style={{ padding: '8px 16px', backgroundColor: '#7f8c8d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            Clear
          </button>
        </div>
      </form>

      {/* Export/Import Controls */}
      <div style={{ marginBottom: 15, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'white', padding: '12px 15px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <label style={{ fontSize: 12, color: '#2c3e50' }}>
          Start Date:{' '}
          <input
            type="date"
            value={exportRange.startDate}
            onChange={e => setExportRange(prev => ({ ...prev, startDate: e.target.value }))}
            style={{ marginLeft: 5, padding: 4, border: '1px solid #bdc3c7', borderRadius: 4, fontSize: 11 }}
          />
        </label>
        <label style={{ fontSize: 12, color: '#2c3e50' }}>
          End Date:{' '}
          <input
            type="date"
            value={exportRange.endDate}
            onChange={e => setExportRange(prev => ({ ...prev, endDate: e.target.value }))}
            style={{ marginLeft: 5, padding: 4, border: '1px solid #bdc3c7', borderRadius: 4, fontSize: 11 }}
          />
        </label>
        <button
          onClick={exportToExcel}
          style={{ padding: '8px 12px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}
        >
          Export Excel
        </button>

        <label
          style={{ padding: '8px 12px', backgroundColor: '#e67e22', color: 'white', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}
        >
          Import CSV
          <input type="file" accept=".csv" onChange={importFromCSV} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Data Table */}
      <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '0', fontSize: '11px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#27ae60' }}>

            <tr style={{ backgroundColor: '#27ae60', color: 'white' }}>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '80px' }}>Date</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '60px' }}>FY</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '80px' }}>A/C Head</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '90px' }}>A/C Name</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '300px' }}>Description</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '70px' }}>Method</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '85px' }}>Debit</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '85px' }}>Credit</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '85px' }}>Transfer</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2', width: '80px', textAlign: 'center' }}>Actions</th>
            </tr>
            <tr style={{ backgroundColor: '#27ae60', color: 'white' }}>
              <th style={{ width: '80px', backgroundColor: '#27ae60', padding: '4px' }}>
                <input
                  type="date"
                  name="date"
                  value={filters.date}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 2, border: 'none', fontSize: 9, borderRadius: 2, backgroundColor: 'white', color: '#333' }}
                />
              </th>
              <th style={{ width: '60px', backgroundColor: '#27ae60', padding: '4px' }}>
                <select
                  name="fy"
                  value={filters.fy}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 2, border: 'none', fontSize: 9, borderRadius: 2, backgroundColor: 'white', color: '#333' }}
                >
                  <option value="">All FY</option>
                  {uniqueFY.map(fy => (
                    <option key={fy} value={fy}>{fy}</option>
                  ))}
                </select>
              </th>
              <th style={{ width: '80px', backgroundColor: '#27ae60', padding: '4px' }}>
                <select
                  name="acHead"
                  value={filters.acHead}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 2, border: 'none', fontSize: 9, borderRadius: 2, backgroundColor: 'white', color: '#333' }}
                >
                  <option value="">All Head</option>
                  {uniqueAcHead.map(head => (
                    <option key={head} value={head}>{head}</option>
                  ))}
                </select>
              </th>
              <th style={{ width: '90px', backgroundColor: '#27ae60', padding: '4px' }}>
                <select
                  name="acName"
                  value={filters.acName}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 2, border: 'none', fontSize: 9, borderRadius: 2, backgroundColor: 'white', color: '#333' }}
                >
                  <option value="">All Name</option>
                  {uniqueAcName.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </th>
              <th style={{ width: '300px', backgroundColor: '#27ae60', padding: '4px' }}>
                <input
                  type="text"
                  name="description"
                  placeholder="Description"
                  value={filters.description}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 2, border: 'none', fontSize: 9, borderRadius: 2, backgroundColor: 'white', color: '#333' }}
                />
              </th>
              <th style={{ width: '70px', backgroundColor: '#27ae60', padding: '4px' }}>
                <select
                  name="method"
                  value={filters.method}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 2, border: 'none', fontSize: 9, borderRadius: 2, backgroundColor: 'white', color: '#333' }}
                >
                  <option value="">All Method</option>
                  {uniqueMethod.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </th>
              <th style={{ width: '85px', backgroundColor: '#27ae60', padding: '4px' }}>
                <input
                  type="text"
                  name="debit"
                  placeholder="Debit"
                  value={filters.debit}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 2, border: 'none', fontSize: 9, borderRadius: 2, backgroundColor: 'white', color: '#333' }}
                />
              </th>
              <th style={{ width: '85px', backgroundColor: '#27ae60', padding: '4px' }}>
                <input
                  type="text"
                  name="credit"
                  placeholder="Credit"
                  value={filters.credit}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 2, border: 'none', fontSize: 9, borderRadius: 2, backgroundColor: 'white', color: '#333' }}
                />
              </th>
              <th style={{ width: '85px', backgroundColor: '#27ae60', padding: '4px' }}>
                <select
                  name="transfer"
                  value={filters.transfer}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: 2, border: 'none', fontSize: 9, borderRadius: 2, backgroundColor: 'white', color: '#333' }}
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
                <td style={{ padding: 4, fontSize: 11, borderRight: '1px solid #ecf0f1', width: '80px' }}>{formatDate(entry.date)}</td>
                <td style={{ padding: 4, fontSize: 11, borderRight: '1px solid #ecf0f1', width: '60px' }}>{entry.fy}</td>
                <td style={{ padding: 4, fontSize: 11, borderRight: '1px solid #ecf0f1', width: '80px' }}>{entry.acHead}</td>
                <td style={{ padding: 4, fontSize: 11, borderRight: '1px solid #ecf0f1', width: '90px' }}>{entry.acName}</td>
                <td style={{ padding: 4, fontSize: 11, borderRight: '1px solid #ecf0f1', width: '300px', wordWrap: 'break-word', maxWidth: '300px' }}>{entry.description}</td>
                <td style={{ padding: 4, fontSize: 11, borderRight: '1px solid #ecf0f1', width: '70px' }}>{entry.method}</td>
                <td style={{ padding: 4, fontSize: 11, textAlign: 'right', borderRight: '1px solid #ecf0f1', color: '#e74c3c', fontWeight: 'bold', width: '85px' }}>{formatNumber(entry.debit)}</td>
                <td style={{ padding: 4, fontSize: 11, textAlign: 'right', borderRight: '1px solid #ecf0f1', color: '#2ecc71', fontWeight: 'bold', width: '85px' }}>{formatNumber(entry.credit)}</td>
                <td style={{ padding: 4, fontSize: 11, borderRight: '1px solid #ecf0f1', width: '85px' }}>{entry.transfer}</td>
                <td style={{ padding: 4, fontSize: 11, width: '80px', textAlign: 'center' }}>
                  <button onClick={() => handleEdit(index)} style={{ marginRight: 2, padding: '2px 4px', fontSize: 9, backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: 2, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(index)} style={{ padding: '2px 4px', fontSize: 9, backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: 2, cursor: 'pointer' }}>Del</button>
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
