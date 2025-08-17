import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../DataContext';

function CustomerApp() {
  const { customers, setCustomers, deleteCustomer, addCustomer, updateFirestoreDoc, importCSVData } = useData();

  // Dropdown options
  const acHeadOptions = ['Boarder', 'Semi Boarder', 'Day'];
  const acNameOptions = [
    'Pre-', 'K G-', 'G _1', 'G _2', 'G _3', 'G _4', 'G _5', 'G _6', 'G _7', 'G _8', 'G _9', 'G_10', 'G_11', 'G_12'
  ];
  const genderOptions = ['Male', 'Female'];

  const today = new Date().toISOString().split("T")[0];
  const [exportRange, setExportRange] = useState({ from: '', to: '' });

  // Helper function to compose display name automatically
  // New format: A/C Name-GenderInitial-ID-Name (e.g., G_10-M-ID-0001-Ma Ma)
  const composeDisplayName = (acName, gender, customId, name) => {
    if (!acName || !gender || !name) return name || '';
    const genderInitial = gender === 'Male' ? 'M' : gender === 'Female' ? 'F' : '';
    const idPart = customId ? customId : '';
    return `${acName}-${genderInitial}${idPart ? `-${idPart}` : ''}-${name}`;
  };

  // Format date dd-mm-yyyy (accepts yyyy-mm-dd, dd-mm-yyyy, dd/mm/yyyy)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    if (typeof dateString !== 'string') {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${dd}-${mm}-${yyyy}`;
    }
    // Normalize separators
    const s = dateString.replaceAll('/', '-');
    const parts = s.split('-');
    if (parts.length !== 3) return dateString;
    if (parts[0].length === 4) {
      // yyyy-mm-dd
      const [yyyy, mm, dd] = parts;
      return `${dd}-${mm}-${yyyy}`;
    } else {
      // dd-mm-yyyy
      const [dd, mm, yyyy] = parts;
      return `${dd}-${mm}-${yyyy}`;
    }
  };

  // Format FY based on date (financial year Apr-Mar)
  const formatFy = (dateString) => {
    if (!dateString) return '';
    let date;
    // Try to handle ISO (YYYY-MM-DD), DD-MM-YYYY and DD/MM/YYYY
    if (typeof dateString === 'string') {
      const standardized = dateString.includes('/') ? dateString.replaceAll('/', '-') : dateString;
      const parts = standardized.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // ISO
          date = new Date(standardized);
        } else {
          // DD-MM-YYYY -> convert to ISO
          const [dd, mm, yyyy] = parts;
          date = new Date(`${yyyy}-${mm}-${dd}`);
        }
      } else {
        date = new Date(standardized);
      }
    } else {
      date = new Date(dateString);
    }
    if (isNaN(date.getTime())) return '';

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
      (filters.name === '' || (customer.displayName || composeDisplayName(customer.acName, customer.gender, customer.customId, customer.name) || '').toLowerCase().includes(filters.name.toLowerCase())) &&
      (filters.remark === '' || (customer.remark || '').toLowerCase().includes(filters.remark.toLowerCase())) &&
      (filters.fy === '' || customerFy === filters.fy)
    );
  });

  // Ensure table shows newest first regardless of insertion/load order
  const sortedFilteredCustomers = [...filteredCustomers].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  // FY-based totals for header (respect selected FY filter if provided; else today's FY)
  const currentFYLabel = (filters.fy && filters.fy.trim()) ? filters.fy : formatFy(today);
  const customersInCurrentFY = customers.filter(c => formatFy(c.date) === currentFYLabel);

  // Helper: normalize string (trim + lowercase)
  const norm = (s) => (s || '').toString().trim().toLowerCase();

  // Totals: simple counts per head (no de-dup by name), normalized compare
  const countsByHead = acHeadOptions.reduce((acc, head) => {
    acc[head] = customersInCurrentFY.filter(c => norm(c.acHead) === norm(head)).length;
    return acc;
  }, {});

  // Total: number of entries in current FY
  const totalCustomersFY = customersInCurrentFY.length;

  // Gender-based totals for current FY
  const maleCountFY = customersInCurrentFY.filter(c => (c.gender || '').toLowerCase() === 'male').length;
  const femaleCountFY = customersInCurrentFY.filter(c => (c.gender || '').toLowerCase() === 'female').length;
  const totalCountFY = totalCustomersFY;

  // Customer data now fully managed by DataContext (Firestore or LOCAL_MODE LS).
  // No component-level localStorage persistence.

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Generate FY-based ID if not editing
    let customId = formData.customId;
    if (editIndex === null) {
      const selectedFY = formatFy(formData.date || today);
      const customersInSelectedFY = customers.filter(customer => formatFy(customer.date) === selectedFY);
      const nextNumber = customersInSelectedFY.length + 1;
      customId = `ID-${String(nextNumber).padStart(4, '0')}`;
    }

    // Compose displayName using the final customId
    const displayName = composeDisplayName(formData.acName, formData.gender, customId, formData.name);

    const baseData = {
      ...formData,
      date: formData.date || today,
      customId,
      displayName,
      entryDate: editIndex !== null ? customers[editIndex].entryDate : today,
    };

    if (editIndex !== null) {
      // Persist update like Bank Book
      const existing = customers[editIndex];
      try {
        await updateFirestoreDoc('customers', existing.id, baseData);
        const updated = customers.map((c, i) => (i === editIndex ? { ...existing, ...baseData } : c));
        setCustomers(updated);
      } catch (err) {
        console.error('Failed to update customer:', err);
        alert('Update failed. Please try again.');
      }
    } else {
      // Persist add like Bank Book; DataContext will update state
      try {
        await addCustomer(baseData);
      } catch (err) {
        console.error('Failed to add customer:', err);
        alert('Save failed. Please try again.');
      }
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

    // Enforce exact header order and labels (requested)
    const headers = [
      'Date',
      'FY',
      'ID',
      'A/C Head',
      'A/C Name',
      'Gender',
      'Name',
      'Remark',
      'Entry Date'
    ];

    // Make Name column match the table display: "ID Name [A/C Name]"
    const rows = dataToExport.map(customer => [
      formatDate(customer.date),
      formatFy(customer.date),
      customer.customId || customer.id,
      customer.acHead,
      customer.acName,
      customer.gender,
      `${customer.customId || ''} ${customer.name || ''} [${customer.acName || ''}]`,
      customer.remark || '',
      formatDate(customer.entryDate || customer.date)
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
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
  

const handleImportCSV = async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const msg = await importCSVData(file, 'customers');
    console.log(msg);
    alert('Import completed. Existing data was overwritten.');
  } catch (err) {
    console.error('Customer CSV import failed:', err);
    alert(`Import failed: ${err.message || err}`);
  } finally {
    // reset input value so selecting the same file again re-triggers onChange
    e.target.value = '';
  }
};

return (
  <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px', flexWrap: 'wrap' }}>
      <h2 style={{ margin: 0, color: '#2c3e50' }}>Customer List</h2>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {acHeadOptions.map(head => (
          <div key={head} style={{ backgroundColor: '#2c3e50', color: 'white', padding: '6px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
            {head}: {countsByHead[head] || 0}
          </div>
        ))}
        <div style={{ backgroundColor: '#34495e', color: 'white', padding: '6px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
          Total Customers: {totalCustomersFY}
        </div>
      </div>
    </div>

      {/* Form Section */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, color: '#34495e', fontSize: '16px' }}>Add Customer</h3>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#2980b9', color: 'white', padding: '6px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
              Total Male: {maleCountFY}
            </div>
            <div style={{ backgroundColor: '#e91e63', color: 'white', padding: '6px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
              Total Female: {femaleCountFY}
            </div>
            <div style={{ backgroundColor: '#34495e', color: 'white', padding: '6px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
              Total: {totalCountFY}
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          {/* First line: 5 boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', alignItems: 'end', marginBottom: '8px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Date:</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                style={{ width: '100%', padding: 8, border: '2px solid #3498db', borderRadius: 6, fontWeight: 'bold', fontSize: 12, backgroundColor: '#f0f8ff', height: '40px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Custom ID:</label>
              <input
                type="text"
                name="customId"
                value={formData.customId}
                onChange={handleInputChange}
                placeholder="Auto-generated"
                style={{ width: '100%', padding: 8, border: '2px solid #3498db', borderRadius: 6, fontWeight: 'bold', fontSize: 12, backgroundColor: '#f0f8ff', height: '40px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>A/C Head:</label>
              <select
                name="acHead"
                value={formData.acHead}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: 8, border: '2px solid #3498db', borderRadius: 6, fontWeight: 'bold', fontSize: 12, backgroundColor: '#f0f8ff', height: '40px' }}
              >
                <option value="">Select A/C Head</option>
                {acHeadOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>A/C Name:</label>
              <select
                name="acName"
                value={formData.acName}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: 8, border: '2px solid #3498db', borderRadius: 6, fontWeight: 'bold', fontSize: 12, backgroundColor: '#f0f8ff', height: '40px' }}
              >
                <option value="">Select A/C Name</option>
                {acNameOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Gender:</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: 8, border: '2px solid #3498db', borderRadius: 6, fontWeight: 'bold', fontSize: 12, backgroundColor: '#f0f8ff', height: '40px' }}
              >
                <option value="">Select Gender</option>
                {genderOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Second line: Name, Remark, Add, Export (with calendars), Import CSV */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto auto auto', gap: '8px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Name:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter name"
                style={{ width: '100%', padding: 8, border: '2px solid #3498db', borderRadius: 6, fontWeight: 'bold', fontSize: 12, backgroundColor: '#f0f8ff', height: '40px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Remark:</label>
              <input
                type="text"
                name="remark"
                value={formData.remark}
                onChange={handleInputChange}
                placeholder="Enter remark"
                style={{ width: '100%', maxWidth: '220px', padding: 8, border: '2px solid #3498db', borderRadius: 6, fontWeight: 'bold', fontSize: 12, backgroundColor: '#f0f8ff', height: '40px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                style={{
                  backgroundColor: editIndex !== null ? '#f39c12' : '#2ecc71',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: 6,
                  height: '40px',
                  minWidth: '110px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              >
                {editIndex !== null ? 'Update' : 'Add'}
              </button>
              {editIndex !== null && (
                <button
                  type="button"
                  onClick={clearForm}
                  style={{
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: 6,
                    height: '40px',
                    minWidth: '110px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="date"
                value={exportRange.from}
                onChange={(e) => setExportRange(prev => ({ ...prev, from: e.target.value }))}
                style={{ width: '140px', padding: 8, border: '2px solid #3498db', borderRadius: 6, fontWeight: 'bold', fontSize: 12, backgroundColor: '#f0f8ff', height: '40px' }}
                placeholder="Start Date"
              />
              <input
                type="date"
                value={exportRange.to}
                onChange={(e) => setExportRange(prev => ({ ...prev, to: e.target.value }))}
                style={{ width: '140px', padding: 8, border: '2px solid #3498db', borderRadius: 6, fontWeight: 'bold', fontSize: 12, backgroundColor: '#f0f8ff', height: '40px' }}
                placeholder="End Date"
              />
              <button
                type="button"
                onClick={exportToExcel}
                style={{
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: 6,
                  height: '40px',
                  minWidth: '110px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              >
                Export
              </button>
            </div>
            <div>
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleImportCSV}
                style={{ display: 'none' }}
                id="csv-import"
              />
              <label
                htmlFor="csv-import"
                style={{
                  backgroundColor: '#9b59b6',
                  color: 'white',
                  border: 'none',
                  padding: '0 16px',
                  borderRadius: 6,
                  height: '40px',
                  minWidth: '110px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Import CSV
              </label>
            </div>
            
          </div>
        </form>
      </div>

      {/* Export/Import controls are included in the second line of the form above */}

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
            {sortedFilteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: '10px', textAlign: 'center' }}>No customers found.</td>
              </tr>
            ) : (
              sortedFilteredCustomers.map((customer, index) => (
                <tr key={customer.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>{formatDate(customer.date)}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>{formatFy(customer.date)}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>{customer.customId}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>{customer.acHead}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>{customer.acName}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>{customer.gender}</td>
                  <td style={{ padding: '5px', border: '1px solid #ddd', fontSize: '12px' }}>
                    {`${customer.customId || ''} ${customer.name || ''} [${customer.acName || ''}]`}
                  </td>
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
