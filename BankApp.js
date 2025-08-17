import React, { useState } from 'react';
import * as XLSX from 'xlsx';

function App() {
  const [entries, setEntries] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    acHead: 'Bank',
    acName: '',
    description: '',
    transfer: '',
    method: '',
    debit: '',
    credit: '',
  });
  const [editIndex, setEditIndex] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [filters, setFilters] = useState({
    date: '',
    acHead: '',
    acName: '',
    description: '',
    transfer: '',
    method: '',
    debit: '',
    credit: '',
    my: '',
  });

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

  const calculateMethodBalances = (data) => {
    const methodTotals = {};
    data.forEach((entry) => {
      const method = entry.method || 'Unknown';
      const debit = parseFloat(entry.debit) || 0;
      const credit = parseFloat(entry.credit) || 0;

      if (!methodTotals[method]) {
        methodTotals[method] = 0;
      }
      methodTotals[method] += debit - credit;
    });
    return methodTotals;
  };

  const calculateBalance = (debit, credit) => {
    return parseFloat(debit || 0) - parseFloat(credit || 0);
  };

  const clearForm = () => {
    setFormData({
      date: '',
      acHead: '',
      acName: '',
      description: '',
      transfer: '',
      method: '',
      debit: '',
      credit: '',
    });
    setEditIndex(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const filteredEntries = entries.filter((entry) => {
    return (
      (filters.date === '' || entry.date.includes(filters.date)) &&
      (filters.acHead === '' || entry.acHead.toLowerCase().includes(filters.acHead.toLowerCase())) &&
      (filters.acName === '' || entry.acName.toLowerCase().includes(filters.acName.toLowerCase())) &&
      (filters.description === '' || entry.description.toLowerCase().includes(filters.description.toLowerCase())) &&
      (filters.transfer === '' || entry.transfer.toLowerCase().includes(filters.transfer.toLowerCase())) &&
      (filters.method === '' || entry.method.toLowerCase().includes(filters.method.toLowerCase())) &&
      (filters.debit === '' || String(entry.debit).includes(filters.debit)) &&
      (filters.credit === '' || String(entry.credit).includes(filters.credit)) &&
      (filters.my === '' || entry.my.toLowerCase().includes(filters.my.toLowerCase()))
    );
  });

  const handleSave = () => {
    if (!formData.date) {
      alert('Please select a date');
      return;
    }
    const balance = calculateBalance(formData.debit, formData.credit);
    const my = new Date(formData.date).toLocaleString('en-US', {
      month: 'short',
      year: '2-digit',
    });

    const newEntry = {
      ...formData,
      debit: parseFloat(formData.debit) || '',
      credit: parseFloat(formData.credit) || '',
      balance,
      my,
    };
    setEntries([newEntry, ...entries]);
    clearForm();
  };

  const handleRowClick = (index) => {
    setSelectedRow(index); // highlight only
  };

  const handleEdit = () => {
    if (selectedRow !== null) {
      setFormData({ ...entries[selectedRow] });
      setEditIndex(selectedRow);
    } else {
      alert("Please select a row to edit");
    }
  };

  const handleUpdate = () => {
    if (editIndex !== null) {
      const updated = [...entries];
      const balance = calculateBalance(formData.debit, formData.credit);
      const my = new Date(formData.date).toLocaleString('en-US', {
        month: 'short',
        year: '2-digit',
      });
      updated[editIndex] = {
        ...formData,
        debit: parseFloat(formData.debit) || '',
        credit: parseFloat(formData.credit) || '',
        balance,
        my,
      };
      setEntries(updated);
      clearForm();
      setSelectedRow(null);
    }
  };

  const handleDelete = () => {
    if (selectedRow !== null) {
      const updated = [...entries];
      updated.splice(selectedRow, 1);
      setEntries(updated);
      clearForm();
      setSelectedRow(null);
    }
  };

  const handleExportExcel = () => {
    const headers = ['Effect Date', 'A/C Head', 'A/C Name', 'Name and Description', 'Transfer', 'Method', 'Debit', 'Credit', 'M&Y'];
    const data = entries.map(e => [
      e.date,
      e.acHead,
      e.acName,
      e.description,
      e.transfer,
      e.method,
      e.debit,
      e.credit,
      e.my,
    ]);
    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BankBook');
    XLSX.writeFile(wb, 'BankBook.xlsx');
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const lines = evt.target.result.split('\n').filter(line => line.trim() !== '');
      const dataLines = lines.slice(1);

      const newData = dataLines.map(line => {
        const cols = line.split(',');
        return {
          date: cols[0] || '',
          acHead: cols[1] || '',
          acName: cols[2] || '',
          description: cols[3] || '',
          transfer: cols[4] || '',
          method: cols[5] || '',
          debit: parseFloat(cols[6]) || '',
          credit: parseFloat(cols[7]) || '',
          my: cols[8] || '',
          balance: (parseFloat(cols[6]) || 0) - (parseFloat(cols[7]) || 0),
        };
      });

      setEntries(newData);
      clearForm();
      e.target.value = null;
    };

    reader.readAsText(file);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>Bank Book</h1>
        <div style={{
          backgroundColor: '#1565c0',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: 8,
          fontWeight: 'bold',
          fontSize: 16,
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
        }}>
          Bank Balance:&nbsp;
          {Object.entries(calculateMethodBalances(filteredEntries)).map(([method, amount], index, arr) => (
            <span key={method}>
              {method} - {formatNumber(amount)} MMK{index < arr.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          marginBottom: 15,
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <input type="date" name="date" value={formData.date} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px' }} />
        <select name="acHead" value={formData.acHead} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px' }}>
          <option value="Bank">Bank</option>
        </select>
        <select name="acName" value={formData.acName} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px' }}>
          <option value="">A/C Name</option>
          <option>Opening</option>
          <option>Deposite</option>
          <option>Withdrawl</option>
          <option>Interest</option>
        </select>
        <input type="text" name="description" placeholder="Description" value={formData.description} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px' }} />
        <select name="transfer" value={formData.transfer} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px' }}>
          <option value="">Transfer</option>
          <option>Office Exp</option>
          <option>Kitchen Exp</option>
          <option>Salary Exp</option>
          <option>Kpay-Bank</option>
          <option>Cash-Bank</option>
          <option>Others</option>
        </select>
        <select name="method" value={formData.method} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px' }}>
          <option value="">Method</option>
          <option value="Bank">Bank</option>
        </select>
        <input type="number" name="debit" placeholder="Debit" value={formData.debit} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px', textAlign: 'right' }} />
        <input type="number" name="credit" placeholder="Credit" value={formData.credit} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px', textAlign: 'right' }} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <button onClick={handleSave} style={{ backgroundColor: '#4CAF50', color: 'white', padding: '10px 35px', marginRight: 8 }}>Save</button>
        <button onClick={handleEdit} style={{ backgroundColor: '#2196F3', color: 'white', padding: '10px 35px', marginRight: 8 }}>Edit</button>
        <button onClick={handleUpdate} style={{ backgroundColor: '#FFC107', color: 'black', padding: '10px 35px', marginRight: 8 }}>Update</button>
        <button onClick={handleDelete} style={{ backgroundColor: '#f44336', color: 'white', padding: '10px 35px', marginRight: 8 }}>Delete</button>
        <button onClick={handleExportExcel} style={{ backgroundColor: '#9C27B0', color: 'white', padding: '10px 14px', marginRight: 8 }}>Export to Excel</button>
        <label style={{ backgroundColor: '#ccc', padding: '8px 14px', cursor: 'pointer', borderRadius: 4, fontWeight: 'bold', color: '#000', userSelect: 'none' }}>
          Import CSV
          <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
        </label>
      </div>

      <div style={{ maxHeight: '620px', overflowY: 'auto' }}>
        <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', lineHeight: '1.2' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#1565c0', color: 'white', zIndex: 10 }}>
            <tr style={{ textAlign: 'center', height: '28px' }}>
              <th>Effect Date</th>
              <th>A/C Head</th>
              <th>A/C Name</th>
              <th>Name and Description</th>
              <th>Transfer</th>
              <th>Method</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>M&Y</th>
            </tr>
            <tr style={{ backgroundColor: '#eeeeee', textAlign: 'center', height: '28px' }}>
              <th><input type="text" name="date" value={filters.date} onChange={handleFilterChange} placeholder="Filter Effect Date" style={{ width: '90%', fontSize: '10px', padding: '2px' }} /></th>
              <th><input type="text" name="acHead" value={filters.acHead} onChange={handleFilterChange} placeholder="Filter A/C Head" style={{ width: '90%', fontSize: '10px', padding: '2px' }} /></th>
              <th><input type="text" name="acName" value={filters.acName} onChange={handleFilterChange} placeholder="Filter A/C Name" style={{ width: '90%', fontSize: '10px', padding: '2px' }} /></th>
              <th><input type="text" name="description" value={filters.description} onChange={handleFilterChange} placeholder="Filter Description" style={{ width: '90%', fontSize: '10px', padding: '2px' }} /></th>
              <th><input type="text" name="transfer" value={filters.transfer} onChange={handleFilterChange} placeholder="Filter Transfer" style={{ width: '90%', fontSize: '10px', padding: '2px' }} /></th>
              <th><input type="text" name="method" value={filters.method} onChange={handleFilterChange} placeholder="Filter Method" style={{ width: '90%', fontSize: '10px', padding: '2px' }} /></th>
              <th><input type="text" name="debit" value={filters.debit} onChange={handleFilterChange} placeholder="Filter Debit" style={{ width: '90%', fontSize: '10px', padding: '2px' }} /></th>
              <th><input type="text" name="credit" value={filters.credit} onChange={handleFilterChange} placeholder="Filter Credit" style={{ width: '90%', fontSize: '10px', padding: '2px' }} /></th>
              <th><input type="text" name="my" value={filters.my} onChange={handleFilterChange} placeholder="Filter M&Y" style={{ width: '90%', fontSize: '10px', padding: '2px' }} /></th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry, index) => (
              <tr key={index}
                onClick={() => handleRowClick(index)}
                style={{
                  backgroundColor: selectedRow === index ? '#cce5ff' : 'transparent',
                  cursor: 'pointer'
                }}>
                <td>{formatDate(entry.date)}</td>
                <td>{entry.acHead}</td>
                <td>{entry.acName}</td>
                <td>{entry.description}</td>
                <td>{entry.transfer}</td>
                <td>{entry.method}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(entry.debit)}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(entry.credit)}</td>
                <td>{entry.my}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
