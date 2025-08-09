// Universal CSV Import Fix for All CashBook Components
// This replaces the problematic CSV import functions in all book components

export const universalCSVImport = (file, bookType, onSuccess, onError) => {
  if (!file) {
    onError('No file selected');
    return;
  }

  // Validate file
  if (!file.name.toLowerCase().endsWith('.csv')) {
    onError('Please select a CSV file (.csv extension required)');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    onError('File size too large. Please select a file smaller than 10MB');
    return;
  }

  const reader = new FileReader();
  
  reader.onload = (event) => {
    try {
      const csvText = event.target.result;
      
      // Handle different line endings
      const lines = csvText.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        onError('CSV file must have at least a header row and one data row');
        return;
      }

      // Enhanced CSV parsing function
      const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              // Handle escaped quotes
              current += '"';
              i++; // Skip next quote
            } else {
              // Toggle quote state
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        // Add the last field
        result.push(current.trim());
        return result;
      };

      // Parse headers
      const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());
      console.log('CSV Headers:', headers);

      if (headers.length === 0 || headers.every(h => !h)) {
        onError('CSV file must have valid column headers');
        return;
      }

      const csvData = [];
      let successfulRows = 0;
      let skippedRows = 0;

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = parseCSVLine(lines[i]).map(v => v.replace(/"/g, '').trim());
          
          // Skip completely empty rows
          if (values.every(v => !v)) {
            skippedRows++;
            continue;
          }

          // Create entry based on book type
          const entry = createEntryForBookType(bookType, headers, values);
          
          if (entry) {
            csvData.push(entry);
            successfulRows++;
          } else {
            skippedRows++;
          }
        } catch (rowError) {
          console.warn(`Error parsing row ${i + 1}:`, rowError);
          skippedRows++;
        }
      }

      if (csvData.length === 0) {
        onError('No valid data rows found in CSV file');
        return;
      }

      // Success callback with data and stats
      onSuccess({
        data: csvData,
        successfulRows,
        skippedRows,
        totalRows: lines.length - 1,
        message: `Successfully imported ${successfulRows} entries` + 
                (skippedRows > 0 ? ` (${skippedRows} rows skipped)` : '')
      });

    } catch (error) {
      console.error('CSV Import Error:', error);
      onError(`Error reading CSV file: ${error.message}. Please check the format and try again.`);
    }
  };

  reader.onerror = () => {
    onError('Failed to read file. Please try again.');
  };

  reader.readAsText(file, 'UTF-8');
};

// Helper function to create entries based on book type
const createEntryForBookType = (bookType, headers, values) => {
  const entry = {
    id: Date.now() + Math.random(),
    importedAt: new Date().toISOString()
  };

  // Calculate FY from date
  const calculateFY = (dateStr) => {
    if (!dateStr) return '';
    
    let d;
    if (dateStr.includes('-') && dateStr.split('-').length === 3) {
      const parts = dateStr.split('-');
      if (parts[0].length === 2) {
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        d = new Date(dateStr);
      }
    } else {
      d = new Date(dateStr);
    }
    
    if (isNaN(d)) return '';
    
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const fyStart = month >= 4 ? year : year - 1;
    const fyEnd = fyStart + 1;
    return `${fyStart.toString().slice(-2)}-${fyEnd.toString().slice(-2)}`;
  };

  // Map common fields
  headers.forEach((header, index) => {
    const value = values[index] || '';
    const headerLower = header.toLowerCase();
    
    // Date field
    if (headerLower.includes('date') || index === 0) {
      entry.date = value;
      if (value) {
        const fy = calculateFY(value);
        entry.fy = fy ? `FY ${fy}` : '';
      }
    }
    // Description
    else if (headerLower.includes('description') || headerLower.includes('desc')) {
      entry.description = value;
    }
    // Amount fields
    else if (headerLower.includes('amount')) {
      const cleanValue = value.replace(/[",]/g, '').trim();
      if (cleanValue && !isNaN(parseFloat(cleanValue))) {
        entry.amount = parseFloat(cleanValue);
      }
    }
    else if (headerLower.includes('debit')) {
      const cleanValue = value.replace(/[",]/g, '').trim();
      if (cleanValue && !isNaN(parseFloat(cleanValue))) {
        entry.debit = parseFloat(cleanValue);
      }
    }
    else if (headerLower.includes('credit')) {
      const cleanValue = value.replace(/[",]/g, '').trim();
      if (cleanValue && !isNaN(parseFloat(cleanValue))) {
        entry.credit = parseFloat(cleanValue);
      }
    }
    // Category/Type
    else if (headerLower.includes('category') || headerLower.includes('type')) {
      entry.category = value;
    }
    // Method
    else if (headerLower.includes('method') || headerLower.includes('payment')) {
      entry.method = value;
    }
    // Account fields
    else if (headerLower.includes('account') || headerLower.includes('a/c')) {
      if (headerLower.includes('name')) {
        entry.acName = value;
      } else if (headerLower.includes('head')) {
        entry.acHead = value;
      }
    }
    // Generic field mapping
    else {
      entry[header] = value;
    }
  });

  // Set defaults based on book type
  switch (bookType) {
    case 'bank':
      entry.acHead = entry.acHead || 'Bank';
      entry.method = entry.method || 'Bank';
      break;
    case 'cash':
      entry.acHead = entry.acHead || 'Cash';
      entry.method = entry.method || 'Cash';
      break;
    case 'income':
      entry.type = entry.type || 'Income';
      break;
    case 'office':
      entry.type = entry.type || 'Office';
      break;
    case 'salary':
      entry.type = entry.type || 'Salary';
      break;
    case 'kitchen':
      entry.type = entry.type || 'Kitchen';
      break;
    default:
      break;
  }

  return entry;
};

// Sample CSV generator for each book type
export const generateSampleCSV = (bookType) => {
  const samples = {
    bank: [
      'Date,A/C Head,A/C Name,Description,Method,Debit,Credit,Transfer',
      '2024-01-01,Bank,Main Account,Office supplies,Bank,150.00,,',
      '2024-01-02,Bank,Main Account,Salary payment,Bank,,5000.00,',
      '2024-01-03,Bank,Savings,Transfer to savings,Bank,1000.00,,'
    ],
    cash: [
      'Date,Description,Amount,Type',
      '2024-01-01,Petty cash expenses,50.00,Expense',
      '2024-01-02,Cash collection,200.00,Income',
      '2024-01-03,Office supplies,75.00,Expense'
    ],
    income: [
      'Date,Description,Amount,Category,Method',
      '2024-01-01,Student fees,15000.00,Tuition,Cash',
      '2024-01-02,Registration fees,5000.00,Registration,Bank',
      '2024-01-03,Hostel fees,8000.00,Hostel,KPay'
    ],
    office: [
      'Date,Description,Amount,Category',
      '2024-01-01,Office supplies,150.00,Supplies',
      '2024-01-02,Electricity bill,300.00,Utilities',
      '2024-01-03,Internet charges,100.00,Communications'
    ],
    salary: [
      'Date,Description,Amount,Employee',
      '2024-01-01,Monthly salary,50000.00,Teaching Staff',
      '2024-01-02,Bonus payment,10000.00,Admin Staff',
      '2024-01-03,Overtime pay,5000.00,Support Staff'
    ],
    kitchen: [
      'Date,Description,Amount,Category',
      '2024-01-01,Vegetables,200.00,Groceries',
      '2024-01-02,Rice purchase,500.00,Staples',
      '2024-01-03,Cooking gas,150.00,Utilities'
    ]
  };

  const sampleData = samples[bookType] || samples.bank;
  return sampleData.join('\n');
};
