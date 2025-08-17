import React, { useState } from 'react';
import * as XLSX from 'xlsx';

function App() {
  const [entries, setEntries] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    acHead: '',
    acName: '',
    description: '',
    unit: '',
    price: '',
    method: '',
    credit: '',
  });
  const [editIndex, setEditIndex] = useState(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);

  const [filters, setFilters] = useState({
    date: '',
    acHead: '',
    acName: '',
    description: '',
    unit: '',
    price: '',
    method: '',
    credit: '',
    my: ''
  });

  const acHeadOptions = {
    "Kitchen": [
      "Rice", "Oil", "Chicken/Pork/Mutton", "Fish, Dried fish, prawn",
      "Chicken/Duck Eggs", "Beans", "Vegetables", "Others",
      "HOME: 1 Exp", "HOME: 1 Exp"
    ]
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
      acHead: '',
      acName: '',
      description: '',
      unit: '',
      price: '',
      method: '',
      credit: '',
    });
    setEditIndex(null);
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

    const balance = calculateBalance(formData.debit, formData.credit);

    const newEntry = {
      ...formData,
      credit: parseFloat(formData.credit) || 0,
      balance,
      my,
    };

    setEntries([newEntry, ...entries]);
    clearForm();
  };

  const handleRowClick = (index) => {
    setSelectedRowIndex(index); // row highlight only
  };

  const handleEdit = () => {
    if (selectedRowIndex !== null) {
      setFormData({ ...entries[selectedRowIndex] });
      setEditIndex(selectedRowIndex);
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
      setSelectedRowIndex(null);
    }
  };

  const handleDelete = () => {
    if (selectedRowIndex !== null) {
      const updated = [...entries];
      updated.splice(selectedRowIndex, 1);
      setEntries(updated);
      clearForm();
      setSelectedRowIndex(null);
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'Effect Date',
      'A/C Head',
      'A/C Name',
      'Name and Description',
      'Unit',
      'Price',
      'Method',
      'Credit',
      'M&Y',
    ];
    const data = entries.map((e) => [
      e.date,
      e.acHead,
      e.acName,
      e.description,
      e.unit,
      e.price,
      e.method,
      e.credit,
      e.my,
    ]);
    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kitchen Book');
    XLSX.writeFile(wb, 'Kitchen.xlsx');
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
          acHead: cols[1] || '',
          acName: cols[2] || '',
          description: cols[3] || '',
          unit: cols[4] || '',
          price: cols[5] || '',
          method: cols[6] || '',
          credit: parseFloat(cols[7]) || '',
          my: cols[8] || '',
          balance: (parseFloat(cols[7]) || 0),
        };
      });

      setEntries(newData);
      clearForm();
      e.target.value = null;
    };

    reader.readAsText(file);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value.toLowerCase() }));
  };

  const filteredEntries = entries.filter((entry) =>
    Object.keys(filters).every((key) => {
      if (!filters[key]) return true;
      const entryValue = entry[key] ? String(entry[key]).toLowerCase() : '';
      return entryValue.includes(filters[key]);
    })
  );

  return (
    <div style={{ padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>Office Expense Book</h1>
        <div style={{
          backgroundColor: '#1565c0',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: 8,
          fontWeight: 'bold',
          fontSize: 16,
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        }}>
          Total Kitchen Expenses:&nbsp;
          {formatNumber(calculateTotalExpenses())} MMK
        </div>
      </div>

      {/* Form */}
      <div style={{
        marginBottom: 15,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 2fr 0.6fr 0.6fr 0.6fr 1fr',
        gap: '8px',
        alignItems: 'center',
      }}>
        <input type="date" name="date" value={formData.date} onChange={handleInputChange} style={{ padding: '1px', fontSize: '12px', width: '95%' }} />
        <select name="acHead" value={formData.acHead} onChange={handleInputChange} style={{ padding: '3px', fontSize: '12px', width: '95%' }}>
          <option value="">A/C Head</option>
          {Object.keys(acHeadOptions).map((head) => (
            <option key={head} value={head}>{head}</option>
          ))}
        </select>
        <select name="acName" value={formData.acName} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px', width: '100%' }}>
          <option value="">A/C Name</option>
          {formData.acHead &&
            acHeadOptions[formData.acHead]?.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
        </select>
        <input type="text" name="description" placeholder="Description" value={formData.description} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px', width: '98%' }} />
        <input type="text" name="unit" placeholder="Unit" value={formData.unit} onChange={handleInputChange} style={{ padding: '2px', fontSize: '12px', width: '95%' }} />
        <input type="number" name="price" placeholder="Price" value={formData.price} onChange={handleInputChange} style={{ padding: '2px', fontSize: '12px', width: '95%' }} />
        <select name="method" value={formData.method} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px', width: '100%' }}>
          <option value="">Method</option>
          <option value="Cash">Cash</option>
          <option value="Kpay">Kpay</option>
          <option value="Bank">Bank</option>
        </select>
        <input type="number" name="credit" placeholder="Credit" value={formData.credit} onChange={handleInputChange} style={{ padding: '4px', fontSize: '12px', width: '100%', textAlign: 'right' }} />
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={handleSave} style={{ backgroundColor: '#39df3eff', color: 'white', padding: '6px 26px', marginRight: 8,fontWeight: 'bold', fontSize: '14px' }}>Save</button>
        <button onClick={handleEdit} style={{ backgroundColor: '#2196F3', color: 'white', padding: '6px 35px', marginRight: 8,fontWeight: 'bold', fontSize: '14px' }}>Edit</button>
        <button onClick={handleUpdate} style={{ backgroundColor: '#FFC107', color: 'black', padding: '6px 26px', marginRight: 8,fontWeight: 'bold', fontSize: '14px' }}>Update</button>
        <button onClick={handleDelete} style={{ backgroundColor: '#f1291aff', color: 'white', padding: '6px 26px', marginRight: 8,fontWeight: 'bold', fontSize: '14px' }}>Delete</button>
        <button onClick={handleExportExcel} style={{ backgroundColor: '#9C27B0', color: 'white', padding: '6px 18px', marginRight: 8,fontWeight: 'bold', fontSize: '14px' }}>Export to Excel</button>
        <label style={{ backgroundColor: '#ccc', padding: '8px 14px', cursor: 'pointer', borderRadius: 4, fontWeight: 'bold', color: '#000', userSelect: 'none' }}>
          Import CSV
          <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Table */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "auto",
          paddingTop: "8px",
          minHeight: "250px",
          height: "calc(100vh - 480px)", // အပေါ်ကို တိုးပြီး အောက်မှာ နေရာကျန်
          marginBottom: "35px",          // အောက်မှာ နေရာလေး ထားပေးတယ်
          border: "1px solid #ccc",      // screen ဘောင်ထဲမှာ မြင်ရအောင် border ထည့်
          borderRadius: "6px"
        }}
      >
        <table
          border="1"
          cellPadding="6"
          style={{
            width: "100%",
            borderCollapse: "collapse",
            borderSpacing: 0,
            fontSize: "12px",
            lineHeight: "1.2",
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "7%" }} />
          </colgroup>

          <thead
            style={{
              position: "sticky",
              top: 0,
              background: "#1565c0",
              color: "white",
              zIndex: 3,
              borderBottom: "2px solid #ccc",
              borderTop: "none",
              margin: 0,     // 👈 ထည့်
              padding: 0     // 👈 ထည့်
            }}
          >
            <tr style={{ textAlign: "center", height: "30px" }}>

              <th>Effect Date</th>
              <th>A/C Head</th>
              <th>A/C Name</th>
              <th>Name and Description</th>
              <th>Unit</th>
              <th>Price</th>
              <th>Method</th>
              <th>Credit</th>
              <th>M&Y</th>
            </tr>
            <tr style={{ background: "#f0f0f0" }}>
              {Object.keys(filters).map((key) => (
                <th key={key}>
                  <input
                    name={key}
                    value={filters[key]}
                    onChange={handleFilterChange}
                    placeholder={`Search ${key}`}
                    style={{ width: "95%", fontSize: "11px", padding: "2px" }}
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
                style={{
                  backgroundColor: selectedRowIndex === index ? '#e0f3ff' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <td>{formatDate(entry.date)}</td>
                <td>{entry.acHead}</td>
                <td>{entry.acName}</td>
                <td>{entry.description}</td>
                <td>{entry.unit}</td>
                <td>{entry.price}</td>
                <td>{entry.method}</td>
                <td style={{ textAlign: "right" }}>{formatNumber(entry.credit)}</td>
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
