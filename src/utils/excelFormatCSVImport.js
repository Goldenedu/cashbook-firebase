// Excel-Format CSV Import - Matches exact Excel export format for each book type
// This ensures CSV import works with the same format as Excel export

// Book type column mappings (matching Excel export format exactly)
const BOOK_FORMATS = {
  bank: {
    columns: ["Date", "FY", "A/C Head", "A/C Name", "Description", "Method", "Debit", "Credit", "Transfer", "Entry Date"],
    requiredFields: ["Date", "Description"],
    sampleData: [
      ["2024-01-15", "FY 2024-25", "Current Account", "Main Bank", "Office supplies purchase", "Cash", "5000", "", "", "2024-01-15"],
      ["2024-01-16", "FY 2024-25", "Savings Account", "Reserve Fund", "Monthly deposit", "Transfer", "", "10000", "From Current", "2024-01-16"]
    ]
  },
  cash: {
    columns: ["Date", "FY", "A/C Head", "A/C Name", "Description", "Method", "Debit", "Credit", "Transfer", "Entry Date"],
    requiredFields: ["Date", "Description"],
    sampleData: [
      ["2024-01-15", "FY 2024-25", "Cash in Hand", "Petty Cash", "Office supplies", "Cash", "500", "", "", "2024-01-15"],
      ["2024-01-16", "FY 2024-25", "Cash in Hand", "Main Cash", "Sales receipt", "Cash", "", "2000", "", "2024-01-16"]
    ]
  },
  income: {
    columns: ["Date", "FY", "A/C Head", "A/C Name", "Description", "Method", "Credit", "Entry Date"],
    requiredFields: ["Date", "Description", "Credit"],
    sampleData: [
      ["2024-01-15", "FY 2024-25", "Service Income", "Consulting", "Monthly consulting fee", "Bank Transfer", "25000", "2024-01-15"],
      ["2024-01-16", "FY 2024-25", "Product Sales", "Software", "License sales", "Cash", "15000", "2024-01-16"]
    ]
  },
  office: {
    columns: ["Date", "FY", "A/C Head", "A/C Class", "Description", "Method", "Credit", "Remark", "Entry Date"],
    requiredFields: ["Date", "Description", "Credit"],
    sampleData: [
      ["2024-01-15", "FY 2024-25", "Office Expenses", "Supplies", "Stationery purchase", "Cash", "1500", "Monthly supplies", "2024-01-15"],
      ["2024-01-16", "FY 2024-25", "Office Expenses", "Utilities", "Electricity bill", "Bank Transfer", "3000", "Monthly bill", "2024-01-16"]
    ]
  },
  salary: {
    columns: ["Date", "FY", "A/C Head", "A/C Class", "Description", "Method", "Credit", "Entry Date"],
    requiredFields: ["Date", "Description", "Credit"],
    sampleData: [
      ["2024-01-15", "FY 2024-25", "Staff salaries & benefits", "Salary", "Monthly salary - John Doe", "Bank Transfer", "45000", "2024-01-15"],
      ["2024-01-16", "FY 2024-25", "Staff salaries & benefits", "Benefits", "Health insurance premium", "Cash", "5000", "2024-01-16"]
    ]
  },
  kitchen: {
    columns: ["Date", "FY", "A/C Head", "A/C Class", "Description", "Method", "Credit", "Remark", "Entry Date"],
    requiredFields: ["Date", "Description", "Credit"],
    sampleData: [
      ["2024-01-15", "FY 2024-25", "Kitchen", "Rice", "Rice purchase - 50kg", "Cash", "2500", "Monthly stock", "2024-01-15"],
      ["2024-01-16", "FY 2024-25", "Kitchen", "Vegetables", "Fresh vegetables", "Cash", "800", "Daily purchase", "2024-01-16"]
    ]
  },
  customer: {
    columns: ["Name", "Phone", "Email", "Address", "Entry Date"],
    requiredFields: ["Name"],
    sampleData: [
      ["John Smith", "123-456-7890", "john@email.com", "123 Main St, City", "2024-01-15"],
      ["Jane Doe", "098-765-4321", "jane@email.com", "456 Oak Ave, Town", "2024-01-16"]
    ]
  }
};

// Parse CSV line handling quoted fields properly
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(field => field.replace(/^"|"$/g, '')); // Remove surrounding quotes
};

// Convert CSV data to entry object based on book type
const createEntryFromCSV = (values, bookType, columns) => {
  const entry = {
    id: Date.now() + Math.random(),
    entryDate: new Date().toISOString().split('T')[0]
  };

  columns.forEach((column, index) => {
    const value = (values[index] || '').trim();
    
    switch (column) {
      case 'Date':
        if (value) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            entry.date = date.toISOString().split('T')[0];
          }
        }
        break;
      case 'FY':
        entry.fy = value;
        break;
      case 'A/C Head':
        entry.acHead = value;
        break;
      case 'A/C Name':
        entry.acName = value;
        break;
      case 'A/C Class':
        entry.acClass = value;
        break;
      case 'Description':
        entry.description = value;
        break;
      case 'Method':
        entry.method = value || 'Cash';
        break;
      case 'Debit':
        if (value && !isNaN(parseFloat(value))) {
          entry.debit = parseFloat(value);
        }
        break;
      case 'Credit':
        if (value && !isNaN(parseFloat(value))) {
          entry.credit = parseFloat(value);
        }
        break;
      case 'Transfer':
        entry.transfer = value;
        break;
      case 'Remark':
        entry.remark = value;
        break;
      case 'Entry Date':
        // Use current date for entry date
        break;
      case 'Name':
        entry.name = value;
        break;
      case 'Phone':
        entry.phone = value;
        break;
      case 'Email':
        entry.email = value;
        break;
      case 'Address':
        entry.address = value;
        break;
    }
  });

  return entry;
};

// Main Excel-format CSV import function
export const excelFormatCSVImport = (file, bookType, onSuccess, onError) => {
  if (!file) {
    onError('No file selected');
    return;
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    onError('Please select a CSV file');
    return;
  }

  const bookFormat = BOOK_FORMATS[bookType];
  if (!bookFormat) {
    onError(`Unsupported book type: ${bookType}`);
    return;
  }

  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const csvText = e.target.result;
      const lines = csvText.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        onError('CSV file must have at least a header row and one data row');
        return;
      }

      // Parse header and validate
      const headers = parseCSVLine(lines[0]);
      const expectedColumns = bookFormat.columns;
      
      // Check if headers match expected format
      const headerMismatch = [];
      expectedColumns.forEach((expected, index) => {
        if (headers[index] !== expected) {
          headerMismatch.push(`Column ${index + 1}: Expected "${expected}", found "${headers[index] || 'missing'}"`);
        }
      });

      if (headerMismatch.length > 0) {
        onError(`CSV format doesn't match Excel export format:\n\n${headerMismatch.join('\n')}\n\nExpected columns: ${expectedColumns.join(', ')}\n\nTip: Export to Excel first to see the correct format, then use that same format for CSV import.`);
        return;
      }

      // Parse data rows
      const importedEntries = [];
      const errors = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        // Skip empty rows
        if (values.every(v => !v.trim())) continue;
        
        try {
          const entry = createEntryFromCSV(values, bookType, expectedColumns);
          
          // Validate required fields
          const missingFields = [];
          bookFormat.requiredFields.forEach(field => {
            const fieldKey = field.toLowerCase().replace(/[^a-z]/g, '');
            if (!entry[fieldKey] && !entry[field.toLowerCase()]) {
              missingFields.push(field);
            }
          });
          
          if (missingFields.length > 0) {
            errors.push(`Row ${i + 1}: Missing required fields: ${missingFields.join(', ')}`);
            continue;
          }
          
          importedEntries.push(entry);
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      if (errors.length > 0 && importedEntries.length === 0) {
        onError(`Import failed:\n\n${errors.join('\n')}`);
        return;
      }

      // Success
      const result = {
        data: importedEntries,
        totalRows: lines.length - 1,
        successfulRows: importedEntries.length,
        skippedRows: (lines.length - 1) - importedEntries.length,
        errors: errors,
        message: `Successfully imported ${importedEntries.length} entries from CSV`
      };

      onSuccess(result);
      
    } catch (error) {
      onError(`Error parsing CSV file: ${error.message}`);
    }
  };

  reader.onerror = () => {
    onError('Error reading file');
  };

  reader.readAsText(file);
};

// Generate sample CSV in Excel export format
export const generateExcelFormatSampleCSV = (bookType) => {
  const bookFormat = BOOK_FORMATS[bookType];
  if (!bookFormat) {
    return 'Unsupported book type';
  }

  const headers = bookFormat.columns.join(',');
  const sampleRows = bookFormat.sampleData.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');

  return `${headers}\n${sampleRows}`;
};
