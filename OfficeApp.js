import React, { useState } from 'react';
import * as XLSX from 'xlsx';

function App() {
  const [entries, setEntries] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    bookVR: '',
    acHead: '',
    acName: '',
    description: '',
    advRef: '',
    method: '',
    debit: '',
    credit: '',
  });
  const [editIndex, setEditIndex] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [filterValues, setFilterValues] = useState({
    date: '',
    bookVR: '',
    acHead: '',
    acName: '',
    description: '',
    advRef: '',
    method: '',
    debit: '',
    credit: '',
    my: '',
  });

  // *** This is the missing function ***
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const acHeadOptions = {
    "Expense Petty Cash": ["Advance / Refund"],
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

  const formatNumber = (num) => {
    if (!num && num !== 0) return '';
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

  const calculateTotalExpenses = () => {
    return filteredEntries.reduce((total, entry) => {
      const debit = parseFloat(entry.debit) || 0;
      const credit = parseFloat(entry.credit) || 0;
      return total + (credit - debit);
    }, 0);
  };

  const calculateBalance = (debit, credit) => {
    return parseFloat(debit || 0) - parseFloat(credit || 0);
  };

  const clearForm = () => {
    setFormData({
      date: '',
      bookVR: '',
      acHead: '',
      acName: '',
      description: '',
      advRef: '',
      method: '',
      debit: '',
      credit: '',
    });
    setEditIndex(null);
    setSelectedRow(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    if (!formData.date) {
      alert('Please select a date');
      return;
    }

    const my = new Date(formData.date).toLocaleString('en-US', {
      month: 'short',
      year: '2-digit',
    });

    const sameMonthEntries = entries.filter((e) => e.my === my);
    const nextNumber = sameMonthEntries.length + 1;
    const autoBookVR = `Exp ${String(nextNumber).padStart(3, '0')}`;

    const balance = calculateBalance(formData.debit, formData.credit);

    const newEntry = {
      ...formData,
      bookVR: autoBookVR,
      debit: parseFloat(formData.debit) || 0,
      credit: parseFloat(formData.credit) || 0,
      balance,
      my,
    };

    setEntries([newEntry, ...entries]);
    clearForm();
  };

  const handleRowClick = (index) => {
    setSelectedRow(index);
  };

  const handleEdit = () => {
    if (selectedRow !== null) {
      setFormData({ ...entries[selectedRow] });
      setEditIndex(selectedRow);
    } else {
      alert('Please select a row to edit first.');
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
        debit: parseFloat(formData.debit) || 0,
        credit: parseFloat(formData.credit) || 0,
        balance,
        my,
      };
      setEntries(updated);
      clearForm();
    }
  };

  const handleDelete = () => {
    if (selectedRow !== null) {
      const updated = [...entries];
      updated.splice(selectedRow, 1);
      setEntries(updated);
      clearForm();
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'Effect Date',
      'Book&VR',
      'A/C Head',
      'A/C Name',
      'Name and Description',
      'Adv&Ref',
      'Method',
      'Debit',
      'Credit',
      'M&Y',
    ];
    const data = entries.map((e) => [
      e.date,
      e.bookVR,
      e.acHead,
      e.acName,
      e.description,
      e.advRef,
      e.method,
      e.debit,
      e.credit,
      e.my,
    ]);
    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Office Book');
    XLSX.writeFile(wb, 'Office.xlsx');
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const lines = evt.target.result.split('\n').filter((line) => line.trim() !== '');
      const dataLines = lines.slice(1);

      const newData = dataLines.map((line) => {
        const cols = line.split(',');
        return {
          date: cols[0] || '',
          bookVR: cols[1] || '',
          acHead: cols[2] || '',
          acName: cols[3] || '',
          description: cols[4] || '',
          advRef: cols[5] || '',
          method: cols[6] || '',
          debit: parseFloat(cols[7]) || '',
          credit: parseFloat(cols[8]) || '',
          my: cols[9] || '',
          balance: (parseFloat(cols[7]) || 0) - (parseFloat(cols[8]) || 0),
        };
      });

      setEntries(newData);
      clearForm();
      e.target.value = null;
    };

    reader.readAsText(file);
  };

  const filteredEntries = entries.filter((entry) =>
    Object.keys(filterValues).every((key) => {
      if (!filterValues[key]) return true;
      return entry[key]?.toString().toLowerCase().includes(filterValues[key].toLowerCase());
    })
  );

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>Office Expense Book</h1>
        <div
          style={{
            backgroundColor: '#1565c0',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 8,
            fontWeight: 'bold',
            fontSize: 16,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}
        >
          Total Expenses:&nbsp;
          {formatNumber(calculateTotalExpenses())} MMK
        </div>
      </div>

      {/* Form */}
      <div
        style={{
          marginBottom: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '6px',
          alignItems: 'center',
        }}
      >
        <input type="date" name="date" value={formData.date} onChange={handleInputChange} style={{ padding: '3px', fontSize: '12px' }} />
        <select name="acHead" value={formData.acHead} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px' }}>
          <option value="">A/C Head</option>
          {Object.keys(acHeadOptions).map((head) => (
            <option key={head} value={head}>{head}</option>
          ))}
        </select>
        <select name="acName" value={formData.acName} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px' }}>
          <option value="">A/C Name</option>
          {formData.acHead &&
            acHeadOptions[formData.acHead]?.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
        </select>
        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleInputChange}
          style={{
            padding: '1px',
            fontSize: '12px',
            width: '135%',
            resize: 'vertical',
            minHeight: '15px',
            gridColumn: 'span 5.5',
          }}
        />
        <select
          name="advRef"
          value={formData.advRef}
          onChange={handleInputChange}
          style={{ padding: '4px', fontSize: '12px', marginLeft: '50px' }}
        >
          <option value="">Adv/Ref</option>
          <option>Advance-Out</option>
          <option>Advance</option>
        </select>
        <select name="method" value={formData.method} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px' }}>
          <option value="">Method</option>
          <option value="Cash">Cash</option>
          <option value="Kpay">Kpay</option>
          <option value="Bank">Bank</option>
        </select>
        <input type="number" name="debit" placeholder="Debit" value={formData.debit} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px', textAlign: 'right' }} />
        <input type="number" name="credit" placeholder="Credit" value={formData.credit} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px', textAlign: 'right' }} />
        <input type="text" name="bookVR" placeholder="Book&VR" value={formData.bookVR} readOnly style={{ padding: '4px', fontSize: '11px', backgroundColor: '#eee' }} />
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={handleSave} style={{ backgroundColor: '#4CAF50', color: 'white', padding: '8px 35px', marginRight: 8 }}>Save</button>
        <button onClick={handleEdit} style={{ backgroundColor: '#2196F3', color: 'white', padding: '8px 35px', marginRight: 8 }}>Edit</button>
        <button onClick={handleUpdate} style={{ backgroundColor: '#FFC107', color: 'black', padding: '8px 35px', marginRight: 8 }}>Update</button>
        <button onClick={handleDelete} style={{ backgroundColor: '#f44336', color: 'white', padding: '8px 35px', marginRight: 8 }}>Delete</button>
        <button onClick={handleExportExcel} style={{ backgroundColor: '#9C27B0', color: 'white', padding: '8px 14px', marginRight: 8 }}>Export to Excel</button>
        <label style={{ backgroundColor: '#ccc', padding: '8px 14px', cursor: 'pointer', borderRadius: 4, fontWeight: 'bold', color: '#000', userSelect: 'none' }}>
          Import CSV
          <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Table with Filters */}
      <div style={{ maxHeight: '630px', overflowY: 'auto', marginTop: '10px' }}>
        <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', lineHeight: '1.2' }}>
          <colgroup>
            <col style={{ width: '70px' }} />   {/* Effect Date */}
            <col style={{ width: '40px' }} />   {/* Book&VR */}
            <col style={{ width: '140px' }} />  {/* A/C Head */}
            <col style={{ width: '140px' }} />  {/* A/C Name */}
            <col style={{ width: '300px' }} />  {/* Description */}
            <col style={{ width: '40px' }} />  {/* Adv&Ref */}
            <col style={{ width: '40px' }} />   {/* Method */}
            <col style={{ width: '80px' }} />  {/* Debit */}
            <col style={{ width: '80px' }} />  {/* Credit */}
            <col style={{ width: '40px' }} />   {/* M&Y */}
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: '#1565c0', color: 'white', textAlign: 'center', height: '28px' }}>
              {['Effect Date','Book&VR','A/C Head','A/C Name','Name and Description',
                'Adv&Ref','Method','Debit','Credit','M&Y'].map((col) => (
                <th key={col} style={{ position: 'sticky', top: 0, backgroundColor: '#1565c0' }}>{col}</th>
              ))}
            </tr>
            <tr>
              {Object.keys(filterValues).map((key) => (
                <th key={key}>
                  <input
                    type="text"
                    name={key}
                    value={filterValues[key]}
                    onChange={handleFilterChange}
                    style={{ width: '95%', fontSize: '11px', padding: '2px' }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry, index) => (
              <tr
                key={index}
                onClick={() => handleRowClick(index)}
                style={{ backgroundColor: selectedRow === index ? '#cce5ff' : 'transparent', cursor: 'pointer' }}
              >
                <td>{formatDate(entry.date)}</td>
                <td>{entry.bookVR}</td>
                <td>{entry.acHead}</td>
                <td>{entry.acName}</td>
                <td>{entry.description}</td>
                <td>{entry.advRef}</td>
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
