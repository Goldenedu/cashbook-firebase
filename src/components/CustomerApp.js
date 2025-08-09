import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../DataContext';
import { excelFormatCSVImport } from '../utils/excelFormatCSVImport';

function CustomerApp() {
  const { customers, setCustomers, deleteCustomer } = useData();

  // Dropdown options
  const acHeadOptions = ['Boarder', 'Semi Boarder', 'Day'];
  const acNameOptions = [
    'Pre-', 'K G-', 'G _1', 'G _2', 'G _3', 'G _4', 'G _5', 'G _6', 'G _7', 'G _8', 'G _9', 'G_10', 'G_11', 'G_12'
  ];
  const genderOptions = ['Male', 'Female'];

  const today = new Date().toISOString().split("T")[0];
  const [exportRange, setExportRange] = useState({ from: '', to: '' });

  // Helper function to format name automatically
  const formatName = (acName, gender, name) => {
    if (!acName || !gender || !name) return name;
    const genderInitial = gender === 'Male' ? 'M' : gender === 'Female' ? 'F' : '';
    return `${acName} ${genderInitial} ${name}`;
  };

  // Format date dd-mm-yyyy
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split("-");
    return `${day}-${month}-${year}`;
  };

  // Format FY based on date (financial year Apr-Mar)
  const formatFy = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JS month 0-11

    let fyStart, fyEnd;
    if (month >= 4) {
      fyStart = year;
      fyEnd = year + 1;
    } else {
      fyStart = year - 1;
      fyEnd = year;
    }
    return `FY ${String(fyStart).slice(-2)}-${String(fyEnd).slice(-2)}`;
  };

  // Generate next ID based on current FY
  const generateNextId = () => {
    const currentFY = formatFy(today);
    const customersInCurrentFY = customers.filter(customer => formatFy(customer.date) === currentFY);
    const nextNumber = customersInCurrentFY.length + 1;
    return `ID-${String(nextNumber).padStart(4, '0')}`;
  };

  const [formData, setFormData] = useState({
    date: today,
    customId: generateNextId(),
    acHead: '',
    acName: '',
    gender: '',
    name: '',
    remark: '',
  });
  const [editIndex, setEditIndex] = useState(null);

  const [filters, setFilters] = useState({
    date: '',
    customId: '',
    acHead: '',
    acName: '',
    gender: '',
    name: '',
    remark: '',
    fy: '',
  });

  // Create unique FY list from customers dynamically
  const fySet = new Set(customers.map(c => formatFy(c.date)).filter(fy => fy !== ''));
  const fyOptions = Array.from(fySet).sort((a, b) => (a > b ? -1 : 1));
  fyOptions.unshift(''); // empty for "All FY"

  // Filtered customers including FY filter
  const filteredCustomers = customers.filter((customer) => {
    const customerFy = formatFy(customer.date);
    return (
      (filters.date === '' || (customer.date && customer.date.includes(filters.date))) &&
      (filters.customId === '' || String(customer.customId || '').includes(filters.customId)) &&
      (filters.acHead === '' || customer.acHead === filters.acHead) &&
      (filters.acName === '' || customer.acName === filters.acName) &&
      (filters.gender === '' || customer.gender === filters.gender) &&
      (filters.name === '' || (customer.displayName || formatName(customer.acName, customer.gender, customer.name) || '').toLowerCase().includes(filters.name.toLowerCase())) &&
      (filters.remark === '' || (customer.remark || '').toLowerCase().includes(filters.remark.toLowerCase())) &&
      (filters.fy === '' || customerFy === filters.fy)
    );
  });

  // Load CSV data automatically on component mount
  useEffect(() => {
    const loadCustomerData = async () => {
      if (customers.length === 0) {
        try {
          const response = await fetch('/CBcsv/customer_list.csv');
          const csvData = await response.text();
          const lines = csvData.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          
          const parsedData = [];
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
              const values = lines[i].split(',').map(v => v.trim());
              const entry = {};
              
              // Map CSV headers to component properties
              headers.forEach((header, index) => {
                const value = values[index] || '';
                switch(header) {
                  case 'Date':
                    // Convert numeric date to proper date format
                    if (!isNaN(value) && value !== '') {
                      // Assuming it's Excel date serial number
                      const excelDate = new Date((value - 25569) * 86400 * 1000);
                      entry.date = excelDate.toISOString().split('T')[0];
                    } else {
                      entry.date = value;
                    }
                    break;
                  case 'ID':
                    // Ensure ID has proper format with ID- prefix
                    if (value && !value.startsWith('ID-')) {
                      entry.customId = `ID-${String(value).padStart(4, '0')}`;
                    } else {
                      entry.customId = value;
                    }
                    break;
                  case 'A/C Head':
                    entry.acHead = value;
                    break;
                  case 'A/C Name':
                    entry.acName = value;
                    break;
                  case 'Gender':
                    entry.gender = value;
                    break;
                  case 'Name':
                    entry.name = value;
                    break;
                  case 'Remark':
                    entry.remark = value;
                    break;
                  default:
                    entry[header] = value;
                }
              });
              
              entry.id = Date.now() + i;
              entry.displayName = formatName(entry.acName, entry.gender, entry.name);
              parsedData.push(entry);
            }
          }
          setCustomers(parsedData);
        } catch (error) {
          console.error('Error loading customer data:', error);
        }
      }
    };
    
    loadCustomerData();
  }, [customers.length, setCustomers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value,
      };
      
      // If date changes, regenerate ID based on new FY
      if (name === 'date') {
        const newFY = formatFy(value);
        const customersInNewFY = customers.filter(customer => formatFy(customer.date) === newFY);
        const nextNumber = customersInNewFY.length + 1;
        newData.customId = `ID-${String(nextNumber).padStart(4, '0')}`;
      }
      
      return newData;
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const displayName = formatName(formData.acName, formData.gender, formData.name);
    
    // Generate FY-based ID if not editing
    let customId = formData.customId;
    if (editIndex === null) {
      const selectedFY = formatFy(formData.date || today);
      const customersInSelectedFY = customers.filter(customer => formatFy(customer.date) === selectedFY);
      const nextNumber = customersInSelectedFY.length + 1;
      customId = `ID-${String(nextNumber).padStart(4, '0')}`;
    }

    const customerData = {
      ...formData,
      date: formData.date || today,
      customId: customId,
      displayName: displayName,
      entryDate: editIndex !== null ? customers[editIndex].entryDate : today,
      id: editIndex !== null ? customers[editIndex].id : Date.now()
    };

    if (editIndex !== null) {
      const updatedCustomers = [...customers];
      updatedCustomers[editIndex] = customerData;
      setCustomers(updatedCustomers);
    } else {
      setCustomers([customerData, ...customers]);
    }
    clearForm();
  };

  const clearForm = () => {
    const currentFY = formatFy(today);
    const customersInCurrentFY = customers.filter(customer => formatFy(customer.date) === currentFY);
    const nextNumber = customersInCurrentFY.length + 1;
    
    setFormData({
      date: today,
      customId: `ID-${String(nextNumber).padStart(4, '0')}`,
      acHead: '',
      acName: '',
      gender: '',
      name: '',
      remark: '',
    });
    setEditIndex(null);
  };

  const handleEdit = (index) => {
    setFormData(customers[index]);
    setEditIndex(index);
  };

  const handleDelete = async (index) => {
    try {
      const customer = customers[index];
      console.log('Customer to delete:', customer);
      
      if (!customer.id) {
        alert('Cannot delete: This customer was not properly saved to the database.');
        return;
      }
      
      await deleteCustomer(customer);
      alert('Customer deleted successfully!');
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert(`Error deleting customer: ${error.message}. Please try again.`);
    }
  };

  // --- Here is the updated exportToExcel function ---
  const exportToExcel = () => {
    let dataToExport = customers;
    if (exportRange.from && exportRange.to) {
      dataToExport = customers.filter(c => c.date >= exportRange.from && c.date <= exportRange.to);
    }

    // Map data to match exact table headers: Date, FY, ID, A/C Head, A/C Name, Gender, Name, Entry Name, Remark, Entry Date
    const exportDataPrepared = dataToExport.map(customer => ({
      'Date': customer.date,
      'FY': formatFy(customer.date),
      'ID': customer.customId || customer.id,
      'A/C Head': customer.acHead,
      'A/C Name': customer.acName,
      'Gender': customer.gender,
      'Name': customer.name || '',
      'Entry Name': customer.displayName || formatName(customer.acName, customer.gender, customer.name),
      'Remark': '',
      'Entry Date': customer.entryDate || customer.date
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportDataPrepared);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customer List');
    XLSX.writeFile(workbook, 'customer_list.xlsx');
  };

  const importFromExcel = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setCustomers(jsonData);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const importFromCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    excelFormatCSVImport(
      file,
      'customer',
      // Success callback
      (result) => {
        setCustomers(prev => [...prev, ...result.data]);
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

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>Customer List</h2>
        <div style={{ backgroundColor: '#34495e', color: 'white', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold' }}>
          Total Customers: {filteredCustomers.length}
        </div>
      </div>

      {/* Form Section */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
        <h3 style={{ marginBottom: '10px', color: '#34495e', fontSize: '16px' }}>Add Customer</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Date:</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '3px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Custom ID:</label>
            <input
              type="text"
              name="customId"
              value={formData.customId}
              onChange={handleInputChange}
              placeholder="Auto-generated"
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '3px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>A/C Head:</label>
            <select
              name="acHead"
              value={formData.acHead}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '3px' }}
            >
              <option value="">Select A/C Head</option>
              {acHeadOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>A/C Name:</label>
            <select
              name="acName"
              value={formData.acName}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '3px' }}
            >
              <option value="">Select A/C Name</option>
              {acNameOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Gender:</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '3px' }}
            >
              <option value="">Select Gender</option>
              {genderOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Enter name"
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '3px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Remark:</label>
            <input
              type="text"
              name="remark"
              value={formData.remark}
              onChange={handleInputChange}
              placeholder="Enter remark"
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '3px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              style={{
                backgroundColor: editIndex !== null ? '#f39c12' : '#27ae60',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {editIndex !== null ? 'Update' : 'Add'}
            </button>
            {editIndex !== null && (
              <button
                type="button"
                onClick={clearForm}
                style={{
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Simple Export/Import Controls - One Line */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="date"
          value={exportRange.from}
          onChange={(e) => setExportRange(prev => ({ ...prev, from: e.target.value }))}
          style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '3px' }}
          placeholder="Start Date"
        />
        <input
          type="date"
          value={exportRange.to}
          onChange={(e) => setExportRange(prev => ({ ...prev, to: e.target.value }))}
          style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '3px' }}
          placeholder="End Date"
        />
        <button
          onClick={exportToExcel}
          style={{
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Export Excel
        </button>
        <div>
          <input
            type="file"
            accept=".csv"
            onChange={importFromCSV}
            style={{ display: 'none' }}
            id="csv-import"
          />
          <label
            htmlFor="csv-import"
            style={{
              backgroundColor: '#9b59b6',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'inline-block'
            }}
          >
            Import CSV
          </label>
        </div>
      </div>

      {/* Customer Table Section */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          maxHeight: '500px', 
          overflowY: 'auto', 
          border: '1px solid #ddd', 
          borderRadius: '5px',
          position: 'relative'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead style={{ 
              position: 'sticky', 
              top: 0, 
              backgroundColor: '#34495e', 
              color: 'white',
              zIndex: 10
            }}>
              <tr>
                <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '60px' }}>Date</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '70px' }}>FY</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '60px' }}>ID</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '90px' }}>A/C Head</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '65px' }}>A/C Name</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '60px' }}>Gender</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '320px' }}>Name</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '120px' }}>Remark</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', width: '85px', textAlign: 'center' }}>Actions</th>
              </tr>
              {/* Filter Row */}
              <tr style={{ backgroundColor: '#2c3e50' }}>
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
                <select
                  name="fy"
                  value={filters.fy}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}
                >
                  {fyOptions.map((fy) => (
                    <option key={fy} value={fy}>{fy || 'All FY'}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <input
                  type="text"
                  name="customId"
                  value={filters.customId}
                  onChange={handleFilterChange}
                  placeholder="Filter ID"
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
                  <option value="">All A/C Head</option>
                  {acHeadOptions.map((option) => (
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
                  <option value="">All A/C Name</option>
                  {acNameOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <select
                  name="gender"
                  value={filters.gender}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}
                >
                  <option value="">All Gender</option>
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <input
                  type="text"
                  name="name"
                  value={filters.name}
                  onChange={handleFilterChange}
                  placeholder="Filter Name"
                  style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}
                />
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd' }}>
                <input
                  type="text"
                  name="remark"
                  value={filters.remark}
                  onChange={handleFilterChange}
                  placeholder="Filter Remark"
                  style={{ width: '100%', padding: '4px', border: 'none', fontSize: '11px' }}
                />
              </th>
              <th style={{ padding: '5px', border: '1px solid #ddd', textAlign: 'center' }}>
                <button
                  onClick={() => setFilters({ date: '', customId: '', acHead: '', acName: '', gender: '', name: '', remark: '', fy: '' })}
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
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: '10px', textAlign: 'center' }}>No customers found.</td>
              </tr>
            ) : (
              filteredCustomers.map((customer, index) => (
                <tr key={customer.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>{formatDate(customer.date)}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>{formatFy(customer.date)}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>{customer.customId}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>{customer.acHead}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>{customer.acName}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>{customer.gender}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>{customer.displayName}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>{customer.remark}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleEdit(index)}
                      style={{
                        backgroundColor: '#2980b9',
                        color: 'white',
                        border: 'none',
                        padding: '3px 6px',
                        marginRight: '3px',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      style={{
                        backgroundColor: '#c0392b',
                        color: 'white',
                        border: 'none',
                        padding: '3px 6px',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
}

export default CustomerApp;
