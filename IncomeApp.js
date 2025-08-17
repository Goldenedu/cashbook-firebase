import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

function App() {
  const [entries, setEntries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [editIndex, setEditIndex] = useState(null);

  const [formData, setFormData] = useState({
    invoiceNo: '',
    date: new Date().toISOString().split('T')[0],
    acHead: '',
    acName: '',
    gender: '',
    name: '',
    feesName: '',
    method: '',
    debit: ''
  });

  const [filterValues, setFilterValues] = useState({});
  const [filteredEntries, setFilteredEntries] = useState([]);

  // Dropdown options
  const acHeadOptions = ['Boarder', 'Semi Boarder', 'Day'];
  const acNameOptions = ['Pre-', 'KG--', 'G_1', 'G_2', 'G_3', 'G_4', 'G_5', 'G_6', 'G_7', 'G_8', 'G_9', 'G_10', 'G_11', 'G_12'];
  const genderOptions = ['Male', 'Female'];
  const feesNameOptions = ['Registration', 'Services', 'Ferry', 'Tuition', 'Hostel'];
  const methodOptions = ['Cash', 'Kpay', 'Bank'];

  // Load sample customers data
  useEffect(() => {
    const sampleCustomers = [
      { id: 1, acHead: 'Boarder', acName: 'G_1', gender: 'Male', name: 'Mg Mg', displayName: 'G_1 M Mg Mg' },
      { id: 2, acHead: 'Boarder', acName: 'G_1', gender: 'Female', name: 'Ma Ma', displayName: 'G_1 F Ma Ma' },
      { id: 3, acHead: 'Boarder', acName: 'G_2', gender: 'Male', name: 'Ko Ko', displayName: 'G_2 M Ko Ko' },
      { id: 4, acHead: 'Semi Boarder', acName: 'G_3', gender: 'Female', name: 'Thida', displayName: 'G_3 F Thida' },
      { id: 5, acHead: 'Day', acName: 'G_4', gender: 'Male', name: 'Aung Aung', displayName: 'G_4 M Aung Aung' },
    ];
    setCustomers(sampleCustomers);
  }, []);

  // Filter entries based on filter values
  useEffect(() => {
    const filtered = entries.filter(entry =>
      Object.keys(filterValues).every(field => {
        const filterVal = filterValues[field]?.toLowerCase() || '';
        return entry[field]?.toString().toLowerCase().includes(filterVal);
      })
    );
    setFilteredEntries(filtered);

    if (selectedRow !== null && !filtered.includes(entries[selectedRow])) {
      setSelectedRow(null);
      setEditIndex(null);
    }
  }, [entries, filterValues, selectedRow]);

  // Generate invoice number
  const generateInvoiceNo = () => {
    const today = new Date();
    const ddmmyy = today.toLocaleDateString('en-GB').split('/').map(part => part.padStart(2, '0')).join('').slice(0, 6);
    
    const todayEntries = entries.filter(entry => 
      entry.invoiceNo && entry.invoiceNo.startsWith(ddmmyy)
    );
    
    const sequenceNo = (todayEntries.length + 1).toString().padStart(3, '0');
    return `${ddmmyy}-${sequenceNo}`;
  };

  // Auto-fill name based on A/C Head, A/C Name, and Gender
  const getAutoFilledName = (acHead, acName, gender) => {
    if (acHead === 'Boarder' && acName === 'G_1' && gender === 'Male') {
      return 'G_1 M Mg Mg';
    }
    if (acHead && acName && gender) {
      const genderInitial = gender === 'Male' ? 'M' : 'F';
      return `${acName} ${genderInitial} `;
    }
    return '';
  };

  // Get filtered customers based on current form selection
  const getFilteredCustomers = () => {
    return customers.filter(customer => {
      return (
        (!formData.acHead || customer.acHead === formData.acHead) &&
        (!formData.acName || customer.acName === formData.acName) &&
        (!formData.gender || customer.gender === formData.gender)
      );
    });
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value,
    };

    // Auto-fill name when A/C Head, A/C Name, or Gender changes
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

  // Handle customer selection from modal
  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({
      ...prev,
      acHead: customer.acHead,
      acName: customer.acName,
      gender: customer.gender,
      name: customer.displayName,
    }));
    setShowCustomerModal(false);
  };

  // Add new entry
  const handleAdd = () => {
    if (!formData.date || !formData.acHead || !formData.acName || !formData.gender || !formData.name || !formData.feesName || !formData.method || !formData.debit) {
      alert('Please fill in all required fields');
      return;
    }

    const invoiceNo = generateInvoiceNo();
    const newEntry = {
      ...formData,
      invoiceNo,
      debit: parseFloat(formData.debit) || 0,
      id: Date.now(),
    };

    setEntries([newEntry, ...entries]);
    clearForm();
    alert(`Entry saved with Invoice No: ${invoiceNo}`);
  };

  // Clear form
  const clearForm = () => {
    setFormData({
      invoiceNo: '',
      date: new Date().toISOString().split('T')[0],
      acHead: '',
      acName: '',
      gender: '',
      name: '',
      feesName: '',
      method: '',
      debit: ''
    });
    setEditIndex(null);
    setSelectedRow(null);
  };

  // Handle row click
  const handleRowClick = (index) => {
    setSelectedRow(index);
  };

  // Handle edit
  const handleEdit = () => {
    if (selectedRow !== null) {
      setFormData({ ...filteredEntries[selectedRow] });
      const realIndex = entries.indexOf(filteredEntries[selectedRow]);
      setEditIndex(realIndex);
    }
  };

  // Handle update
  const handleUpdate = () => {
    if (editIndex !== null) {
      const updated = [...entries];
      updated[editIndex] = {
        ...formData,
        debit: parseFloat(formData.debit) || 0,
      };
      setEntries(updated);
      clearForm();
      alert('Entry updated successfully');
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (editIndex !== null) {
      const updated = [...entries];
      updated.splice(editIndex, 1);
      setEntries(updated);
      clearForm();
      alert('Entry deleted successfully');
    }
  };

  // Format number
  const formatNumber = (num) => {
    if (!num && num !== 0) return '';
    return parseFloat(num).toLocaleString();
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Print invoice function (without Gender field)
  const printInvoice = (entry) => {
    const printWindow = window.open('', '_blank');
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${entry.invoiceNo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .invoice-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .invoice-details { margin-bottom: 20px; }
          .invoice-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .invoice-table th { background-color: #f2f2f2; font-weight: bold; }
          .total { text-align: right; font-weight: bold; margin-top: 20px; font-size: 18px; }
          .company-info { text-align: center; margin-bottom: 20px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="company-info">
          <h2>CASHBOOK SYSTEM</h2>
          <p>Income & Invoice Management</p>
        </div>
        
        <div class="invoice-header">
          <h1>INCOME INVOICE</h1>
          <h2>Invoice No: ${entry.invoiceNo}</h2>
        </div>
        
        <div class="invoice-details">
          <p><strong>Date:</strong> ${formatDate(entry.date)}</p>
          <p><strong>A/C Head:</strong> ${entry.acHead}</p>
          <p><strong>A/C Name:</strong> ${entry.acName}</p>
          <p><strong>Customer Name:</strong> ${entry.name}</p>
        </div>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Fees Type</th>
              <th>Payment Method</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${entry.name}</td>
              <td>${entry.feesName}</td>
              <td>${entry.method}</td>
              <td style="text-align: right;">${formatNumber(entry.debit)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="total">
          <p>Total Amount: ${formatNumber(entry.debit)} MMK</p>
        </div>
        
        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
          <p>Thank you for your payment!</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  // Export to Excel
  const handleExportExcel = () => {
    const headers = ['Invoice No', 'Date', 'A/C Head', 'A/C Name', 'Gender', 'Name', 'Fees Name', 'Method', 'Debit'];
    const data = entries.map(e => [
      e.invoiceNo,
      e.date,
      e.acHead,
      e.acName,
      e.gender,
      e.name,
      e.feesName,
      e.method,
      e.debit,
    ]);
    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Income & Invoice');
    XLSX.writeFile(wb, 'income_invoice_data.xlsx');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#2c3e50', marginBottom: '20px', textAlign: 'center' }}>Income & Invoice Book</h1>

      {/* Entry Form */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '10px', 
        marginBottom: '20px', 
        padding: '20px', 
        border: '2px solid #3498db', 
        borderRadius: '10px', 
        backgroundColor: '#f8f9fa' 
      }}>
        <input 
          type="date" 
          name="date" 
          value={formData.date} 
          onChange={handleInputChange} 
          style={{ padding: '8px', fontSize: '14px', borderRadius: '5px', border: '1px solid #ddd' }} 
        />
        
        <select name="acHead" value={formData.acHead} onChange={handleInputChange} 
          style={{ padding: '8px', fontSize: '14px', borderRadius: '5px', border: '1px solid #ddd' }}>
          <option value="">A/C Head</option>
          {acHeadOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        
        <select name="acName" value={formData.acName} onChange={handleInputChange} 
          style={{ padding: '8px', fontSize: '14px', borderRadius: '5px', border: '1px solid #ddd' }}>
          <option value="">A/C Name</option>
          {acNameOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        
        <select name="gender" value={formData.gender} onChange={handleInputChange} 
          style={{ padding: '8px', fontSize: '14px', borderRadius: '5px', border: '1px solid #ddd' }}>
          <option value="">Gender</option>
          {genderOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        
        <div style={{ display: 'flex', gap: '5px' }}>
          <input 
            type="text" 
            name="name" 
            placeholder="Name" 
            value={formData.name} 
            onChange={handleInputChange} 
            style={{ padding: '8px', fontSize: '14px', borderRadius: '5px', border: '1px solid #ddd', flex: 1 }} 
          />
          <button 
            onClick={() => setShowCustomerModal(true)}
            style={{ 
              padding: '8px 12px', 
              fontSize: '12px', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer' 
            }}
            title="Select from Customer List"
          >
            📋
          </button>
        </div>
        
        <select name="feesName" value={formData.feesName} onChange={handleInputChange} 
          style={{ padding: '8px', fontSize: '14px', borderRadius: '5px', border: '1px solid #ddd' }}>
          <option value="">Fees Name</option>
          {feesNameOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        
        <select name="method" value={formData.method} onChange={handleInputChange} 
          style={{ padding: '8px', fontSize: '14px', borderRadius: '5px', border: '1px solid #ddd' }}>
          <option value="">Method</option>
          {methodOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        
        <input 
          type="number" 
          name="debit" 
          placeholder="Debit Amount" 
          value={formData.debit} 
          onChange={handleInputChange} 
          style={{ padding: '8px', fontSize: '14px', borderRadius: '5px', border: '1px solid #ddd', textAlign: 'right' }} 
        />
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={handleAdd} 
          style={{ backgroundColor: '#28a745', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          Add Entry
        </button>
        <button onClick={handleEdit} 
          style={{ backgroundColor: '#007bff', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Edit
        </button>
        <button onClick={handleUpdate} 
          style={{ backgroundColor: '#ffc107', color: 'black', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Update
        </button>
        <button onClick={handleDelete} 
          style={{ backgroundColor: '#dc3545', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Delete
        </button>
        <button onClick={handleExportExcel} 
          style={{ backgroundColor: '#6f42c1', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Export Excel
        </button>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 1000, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '10px', 
            maxWidth: '800px', 
            maxHeight: '600px', 
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Select Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} 
                style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
              Filtered by: {formData.acHead && `A/C Head: ${formData.acHead}`} {formData.acName && `A/C Name: ${formData.acName}`} {formData.gender && `Gender: ${formData.gender}`}
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>A/C Head</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>A/C Name</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Gender</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Display Name</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredCustomers().map((customer, index) => (
                  <tr key={customer.id} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{customer.acHead}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{customer.acName}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{customer.gender}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold', color: '#2c3e50' }}>{customer.displayName}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleCustomerSelect(customer)}
                        style={{ 
                          backgroundColor: '#28a745', 
                          color: 'white', 
                          border: 'none', 
                          padding: '5px 10px', 
                          borderRadius: '3px', 
                          cursor: 'pointer' 
                        }}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {getFilteredCustomers().length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                No customers found matching the current selection.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Table */}
      <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '5px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#343a40', color: 'white' }}>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Inv No</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Date</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>A/C Head</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>A/C Name</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Gender</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Name</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Fees Name</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Method</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Debit</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Actions</th>
            </tr>
            <tr>
              {['invoiceNo', 'date', 'acHead', 'acName', 'gender', 'name', 'feesName', 'method', 'debit'].map((field, idx) => (
                <th key={idx} style={{ padding: '5px', backgroundColor: '#e9ecef' }}>
                  <input
                    type="text"
                    placeholder="Filter"
                    value={filterValues[field] || ''}
                    style={{ width: '100%', fontSize: '12px', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
                    onChange={(e) =>
                      setFilterValues(prev => ({ ...prev, [field]: e.target.value }))
                    }
                  />
                </th>
              ))}
              <th style={{ padding: '5px', backgroundColor: '#e9ecef' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry, index) => (
              <tr
                key={entry.id}
                onClick={() => handleRowClick(index)}
                style={{
                  backgroundColor: selectedRow === index ? '#cce5ff' : (index % 2 === 0 ? '#f8f9fa' : 'white'),
                  cursor: 'pointer'
                }}
              >
                <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>{entry.invoiceNo}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatDate(entry.date)}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{entry.acHead}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{entry.acName}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{entry.gender}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{entry.name}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{entry.feesName}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{entry.method}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: '#28a745' }}>
                  {formatNumber(entry.debit)}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      printInvoice(entry);
                    }}
                    style={{ 
                      backgroundColor: '#17a2b8', 
                      color: 'white', 
                      border: 'none', 
                      padding: '5px 10px', 
                      borderRadius: '3px', 
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    title="Print Invoice"
                  >
                    🖨️ Print
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#d4edda', 
        borderRadius: '10px', 
        border: '1px solid #c3e6cb' 
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#155724' }}>Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            Total Entries: <span style={{ color: '#007bff' }}>{filteredEntries.length}</span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            Total Income: <span style={{ color: '#28a745' }}>{formatNumber(filteredEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0))} MMK</span>
          </div>
          {methodOptions.map(method => {
            const methodTotal = filteredEntries
              .filter(entry => entry.method === method)
              .reduce((sum, entry) => sum + (entry.debit || 0), 0);
            return methodTotal > 0 ? (
              <div key={method} style={{ fontSize: '14px' }}>
                {method}: <span style={{ color: '#6c757d', fontWeight: 'bold' }}>{formatNumber(methodTotal)} MMK</span>
              </div>
            ) : null;
          })}
        </div>
      </div>

      {filteredEntries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          <h3>No entries yet</h3>
          <p>Start by adding your first income entry above.</p>
        </div>
      )}
    </div>
  );
}

export default App;
