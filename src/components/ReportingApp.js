import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../DataContext';

function ReportingApp() {
  const { 
    bankEntries = [], 
    cashEntries = [], 
    incomeEntries = [], 
    officeEntries = [], 
    kitchenEntries = [],
    invoices = [],
    customers = []
  } = useData();

  const [reportType, setReportType] = useState('summary');
  const [bookFilter, setBookFilter] = useState('all');
  const [selectedFY, setSelectedFY] = useState('');
  const [availableFYs, setAvailableFYs] = useState([]); // New filter for book types
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Real data from all modules
  const allData = {
    bank: bankEntries || [],
    cash: cashEntries || [],
    income: incomeEntries || [],
    office: officeEntries || [],
    kitchen: kitchenEntries || [],
    invoices: invoices || [],
    customers: customers || []
  };

  const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '0';
    return new Intl.NumberFormat().format(num);
  };

  // FY Generation Functions (same as Dashboard)
  const generateCurrentFY = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // January is 0
    
    let fyStartYear, fyEndYear;
    if (currentMonth >= 4) { // April onwards is new FY
      fyStartYear = currentYear;
      fyEndYear = currentYear + 1;
    } else { // January to March is previous FY
      fyStartYear = currentYear - 1;
      fyEndYear = currentYear;
    }
    
    return `${fyStartYear.toString().slice(-2)}-${fyEndYear.toString().slice(-2)}`;
  };

  // Generate available FY options (last 3 years + current + next 2 years)
  const generateAvailableFYs = () => {
    const currentFY = generateCurrentFY();
    const currentFYStart = parseInt(currentFY.split('-')[0]);
    const fys = [];
    
    for (let i = -3; i <= 2; i++) {
      const startYear = currentFYStart + i;
      const endYear = startYear + 1;
      fys.push(`${startYear.toString().padStart(2, '0')}-${endYear.toString().padStart(2, '0')}`);
    }
    
    return fys;
  };

  // Filter data based on selected book type
  const getFilteredData = () => {
    switch (bookFilter) {
      case 'all':
        return allData; // Return all books data
      case 'cash':
        return { cash: allData.cash }; // Only cash book
      case 'income':
        return { income: allData.income, invoices: allData.invoices }; // Income & Invoice book
      case 'office':
        return { office: allData.office }; // Office expenses book
      case 'salary':
        return { salary: allData.salary || [] }; // Salary expenses book
      case 'kitchen':
        return { kitchen: allData.kitchen }; // Kitchen book
      case 'bank':
        return { bank: allData.bank }; // Bank book
      default:
        return allData;
    }
  };

  const calculateTotals = (data) => {
    const totals = {
      bankCredit: 0, bankDebit: 0,
      cashCredit: 0, cashDebit: 0,
      incomeCredit: 0, incomeDebit: 0,
      officeCredit: 0, officeDebit: 0,
      salaryCredit: 0, salaryDebit: 0,
      kitchenCredit: 0, kitchenDebit: 0
    };

    Object.keys(data).forEach(bookType => {
      if (Array.isArray(data[bookType])) {
        data[bookType].forEach(entry => {
          const credit = parseFloat(entry.credit || 0);
          const debit = parseFloat(entry.debit || 0);
          
          totals[`${bookType}Credit`] += credit;
          totals[`${bookType}Debit`] += debit;
        });
      }
    });

    return totals;
  };

  // Calculate Daily Balances based on user's corrected method
  const calculateDailyBalances = (data) => {
    const balances = {
      bank: 0,
      cash: 0,
      officeBank: 0,
      officeCash: 0,
      officeKpay: 0,
      salaryBank: 0,
      salaryCash: 0,
      salaryKpay: 0,
      kitchenBank: 0,
      kitchenCash: 0,
      kitchenKpay: 0,
      advanceCash: 0,
      advanceKpay: 0,
      // Bank transfers to other categories
      bankToCash: 0,
      bankToOffice: 0,
      bankToSalary: 0,
      bankToKitchen: 0
    };

    // 1. Bank Balance: Debit - Credit
    if (data.bank) {
      data.bank.forEach(entry => {
        balances.bank += parseFloat(entry.debit || 0) - parseFloat(entry.credit || 0);
      });
    }

    // 2. Cash Balance: Debit - Credit
    if (data.cash) {
      data.cash.forEach(entry => {
        balances.cash += parseFloat(entry.debit || 0) - parseFloat(entry.credit || 0);
      });
    }

    // 3. Calculate transfers using Transfer field format
    // Track transfers TO expense books from Cash and Bank books
    let transfers = {
      office: { cash: 0, kpay: 0, bank: 0 },
      salary: { cash: 0, kpay: 0, bank: 0 },
      kitchen: { cash: 0, kpay: 0, bank: 0 }
    };

    // Process Cash Book transfers using exact Transfer field values
    if (data.cash) {
      data.cash.forEach(entry => {
        if (entry.credit && entry.transfer) {
          const transfer = entry.transfer;
          const method = (entry.method || 'cash').toLowerCase();
          const amount = parseFloat(entry.credit || 0);
          
          // Match exact Transfer field values from Cash Book
          if (transfer === 'Office Exp') {
            if (method === 'cash') transfers.office.cash += amount;
            else if (method === 'kpay') transfers.office.kpay += amount;
            else if (method === 'bank') transfers.office.bank += amount;
          }
          else if (transfer === 'Salary Exp') {
            if (method === 'cash') transfers.salary.cash += amount;
            else if (method === 'kpay') transfers.salary.kpay += amount;
            else if (method === 'bank') transfers.salary.bank += amount;
          }
          else if (transfer === 'Kitchen Exp') {
            if (method === 'cash') transfers.kitchen.cash += amount;
            else if (method === 'kpay') transfers.kitchen.kpay += amount;
            else if (method === 'bank') transfers.kitchen.bank += amount;
          }
          // Note: "Cash-Bank" and "Kpay-Bank" transfers are inter-book transfers, not to expense books
        }
      });
    }

    // Process Bank Book transfers using exact Transfer field values
    if (data.bank) {
      data.bank.forEach(entry => {
        if (entry.credit && entry.transfer) {
          const transfer = entry.transfer;
          const method = (entry.method || 'bank').toLowerCase();
          const amount = parseFloat(entry.credit || 0);
          
          // Match exact Transfer field values from Bank Book
          if (transfer === 'Office Exp') {
            if (method === 'cash') transfers.office.cash += amount;
            else if (method === 'kpay') transfers.office.kpay += amount;
            else if (method === 'bank') {
              transfers.office.bank += amount;
              // Bank transfers TO Office (positive for Bank row)
              balances.bankToOffice += amount;
            }
          }
          else if (transfer === 'Salary Exp') {
            if (method === 'cash') transfers.salary.cash += amount;
            else if (method === 'kpay') transfers.salary.kpay += amount;
            else if (method === 'bank') {
              transfers.salary.bank += amount;
              // Bank transfers TO Salary (positive for Bank row)
              balances.bankToSalary += amount;
            }
          }
          else if (transfer === 'Kitchen Exp') {
            if (method === 'cash') transfers.kitchen.cash += amount;
            else if (method === 'kpay') transfers.kitchen.kpay += amount;
            else if (method === 'bank') {
              transfers.kitchen.bank += amount;
              // Bank transfers TO Kitchen (positive for Bank row)
              balances.bankToKitchen += amount;
            }
          }
          // Track inter-book transfers for Bank row display
          else if (transfer === 'Bank-Cash') {
            balances.bankToCash += amount;
          }
        }
      });
    }

    // 4. Calculate spending from expense books by method
    let expenseSpending = {
      office: { cash: 0, kpay: 0, bank: 0 },
      salary: { cash: 0, kpay: 0, bank: 0 },
      kitchen: { cash: 0, kpay: 0, bank: 0 }
    };

    // Office Exp Book spending by method
    if (data.office) {
      data.office.forEach(entry => {
        const method = (entry.method || 'cash').toLowerCase();
        const amount = parseFloat(entry.credit || 0);
        
        if (method === 'cash') expenseSpending.office.cash += amount;
        else if (method === 'kpay') expenseSpending.office.kpay += amount;
        else if (method === 'bank') expenseSpending.office.bank += amount;
      });
    }

    // Salary Exp Book spending by method
    if (data.salary) {
      data.salary.forEach(entry => {
        const method = (entry.method || 'cash').toLowerCase();
        const amount = parseFloat(entry.credit || 0);
        
        if (method === 'cash') expenseSpending.salary.cash += amount;
        else if (method === 'kpay') expenseSpending.salary.kpay += amount;
        else if (method === 'bank') expenseSpending.salary.bank += amount;
      });
    }

    // Kitchen Exp Book spending by method
    if (data.kitchen) {
      data.kitchen.forEach(entry => {
        const method = (entry.method || 'cash').toLowerCase();
        const amount = parseFloat(entry.credit || 0);
        
        if (method === 'cash') expenseSpending.kitchen.cash += amount;
        else if (method === 'kpay') expenseSpending.kitchen.kpay += amount;
        else if (method === 'bank') expenseSpending.kitchen.bank += amount;
      });
    }

    // 5. Calculate balances: Transfers IN (from Cash + Bank books) - Spending OUT (from expense books)
    balances.officeCash = transfers.office.cash - expenseSpending.office.cash;
    balances.officeKpay = transfers.office.kpay - expenseSpending.office.kpay;
    balances.officeBank = transfers.office.bank - expenseSpending.office.bank;

    // 6. Calculate Salary and Kitchen balances using the same corrected logic
    balances.salaryCash = transfers.salary.cash - expenseSpending.salary.cash;
    balances.salaryKpay = transfers.salary.kpay - expenseSpending.salary.kpay;
    balances.salaryBank = transfers.salary.bank - expenseSpending.salary.bank;

    // 7. Kitchen balances using corrected logic
    balances.kitchenCash = transfers.kitchen.cash - expenseSpending.kitchen.cash;
    balances.kitchenKpay = transfers.kitchen.kpay - expenseSpending.kitchen.kpay;
    balances.kitchenBank = transfers.kitchen.bank - expenseSpending.kitchen.bank;

    // 8. Calculate net Bank transfers: Bank transfers OUT - What came back from expense books using Bank method
    balances.bankToOffice = balances.bankToOffice - expenseSpending.office.bank;
    balances.bankToSalary = balances.bankToSalary - expenseSpending.salary.bank;
    balances.bankToKitchen = balances.bankToKitchen - expenseSpending.kitchen.bank;

    // 8. Advance: Office Book, A/C Head 'Advance', split by Method (Cash and Kpay)
    if (data.office) {
      data.office.forEach(entry => {
        if (entry.acHead && entry.acHead.toLowerCase().includes('advance') && entry.credit) {
          const method = (entry.method || 'cash').toLowerCase();
          const amount = parseFloat(entry.credit || 0);
          
          // Split Advance by method - Cash goes to Cash row, Kpay goes to Kpay row
          if (method === 'cash') {
            balances.advanceCash += amount;
          } else if (method === 'kpay') {
            balances.advanceKpay += amount;
          }
        }
      });
    }

    return balances;
  };

  // Calculate Student Summary from Income & Invoice Book
  const calculateStudentSummary = (incomeData, selectedFY) => {
    if (!incomeData || !selectedFY) return {};

    // Filter by selected FY
    const filteredEntries = incomeData.filter(entry => entry.fy === selectedFY);
    
    // Map A/C Class to student groups
    const classMapping = {
      'Pre-': 'Pre_Students',
      'KG-': 'KG_Students', 
      'K G-': 'KG_Students',
      'G_1': 'G_1_Students',
      'G_2': 'G_2_Students',
      'G_3': 'G_3_Students',
      'G_4': 'G_4_Students',
      'G_5': 'G_5_Students',
      'G_6': 'G_6_Students',
      'G_7': 'G_7_Students',
      'G_8': 'G_8_Students',
      'G_9': 'G_9_Students',
      'G_10': 'G_10_Students',
      'G_11': 'G_11_Students',
      'G_12': 'G_12_Students'
    };

    const studentCounts = {
      Pre_Students: { male: 0, female: 0 },
      KG_Students: { male: 0, female: 0 },
      G_1_Students: { male: 0, female: 0 },
      G_2_Students: { male: 0, female: 0 },
      G_3_Students: { male: 0, female: 0 },
      G_4_Students: { male: 0, female: 0 },
      G_5_Students: { male: 0, female: 0 },
      G_6_Students: { male: 0, female: 0 },
      G_7_Students: { male: 0, female: 0 },
      G_8_Students: { male: 0, female: 0 },
      G_9_Students: { male: 0, female: 0 },
      G_10_Students: { male: 0, female: 0 },
      G_11_Students: { male: 0, female: 0 },
      G_12_Students: { male: 0, female: 0 }
    };

    // Track unique students to avoid double counting
    const uniqueStudents = new Set();

    filteredEntries.forEach(entry => {
      const acClass = entry.acClass || '';
      const gender = (entry.gender || '').toLowerCase();
      const name = entry.acName || '';

      // Skip if no name or already counted this student
      if (!name || uniqueStudents.has(name.toLowerCase())) return;

      // Find matching class group
      let studentGroup = null;
      for (const [classPrefix, groupName] of Object.entries(classMapping)) {
        if (acClass.startsWith(classPrefix)) {
          studentGroup = groupName;
          break;
        }
      }

      if (studentGroup && studentCounts[studentGroup]) {
        uniqueStudents.add(name.toLowerCase());
        
        if (gender === 'male' || gender === 'm') {
          studentCounts[studentGroup].male++;
        } else if (gender === 'female' || gender === 'f') {
          studentCounts[studentGroup].female++;
        }
      }
    });

    return studentCounts;
  };

  const filteredData = getFilteredData();
  const totals = calculateTotals(filteredData);
  const dailyBalances = calculateDailyBalances(filteredData);
  const studentSummary = calculateStudentSummary(allData.income || [], selectedFY);
  const totalIncome = totals.incomeCredit + totals.bankCredit + totals.cashCredit;
  const totalExpenses = totals.officeDebit + totals.kitchenDebit + totals.bankDebit + totals.cashDebit;
  const netProfit = totalIncome - totalExpenses;

  // Initialize FY options and set current FY on component mount
  useEffect(() => {
    const fys = generateAvailableFYs();
    setAvailableFYs(fys);
    const currentFY = generateCurrentFY();
    setSelectedFY(currentFY);
  }, []);

  const exportReport = () => {
    const workbook = XLSX.utils.book_new();
    const filteredData = getFilteredData();
    
    // Get book filter name for report title
    const bookFilterNames = {
      'all': 'All Books',
      'cash': 'Cash Book',
      'income': 'Income & Invoice Book',
      'office': 'Office Exp Book',
      'salary': 'Salary Exp Book',
      'kitchen': 'Kitchen Book',
      'bank': 'Bank Book'
    };
    
    const reportTitle = `CashBook Report - ${bookFilterNames[bookFilter]}`;
    
    // 1. Summary Sheet - Overview and totals
    const summaryData = [
      [reportTitle, '', '', '', ''],
      ['Generated on:', new Date().toLocaleDateString(), '', '', ''],
      ['Report Period:', dateRange.startDate || 'All Time', 'to', dateRange.endDate || 'Current', ''],
      ['Book Filter:', bookFilterNames[bookFilter], '', '', ''],
      ['', '', '', '', ''],
      ['FINANCIAL SUMMARY', '', '', '', ''],
      ['Category', 'Total Debit', 'Total Credit', 'Net Balance', 'Entry Count']
    ];

    // Add summary rows based on filtered data
    if (filteredData.bank) {
      summaryData.push(['Bank Book', formatNumber(totals.bankDebit), formatNumber(totals.bankCredit), formatNumber(totals.bankCredit - totals.bankDebit), filteredData.bank.length]);
    }
    if (filteredData.cash) {
      summaryData.push(['Cash Book', formatNumber(totals.cashDebit), formatNumber(totals.cashCredit), formatNumber(totals.cashCredit - totals.cashDebit), filteredData.cash.length]);
    }
    if (filteredData.income) {
      summaryData.push(['Income & Invoice Book', formatNumber(totals.incomeDebit), formatNumber(totals.incomeCredit), formatNumber(totals.incomeCredit - totals.incomeDebit), filteredData.income.length]);
    }
    if (filteredData.office) {
      summaryData.push(['Office Exp Book', formatNumber(totals.officeDebit), formatNumber(totals.officeCredit), formatNumber(totals.officeCredit - totals.officeDebit), filteredData.office.length]);
    }
    if (filteredData.kitchen) {
      summaryData.push(['Kitchen Exp Book', formatNumber(totals.kitchenDebit), formatNumber(totals.kitchenCredit), formatNumber(totals.kitchenCredit - totals.kitchenDebit), filteredData.kitchen.length]);
    }
    if (filteredData.salary) {
      summaryData.push(['Salary Exp Book', formatNumber(totals.salaryDebit), formatNumber(totals.salaryCredit), formatNumber(totals.salaryCredit - totals.salaryDebit), (filteredData.salary || []).length]);
    }

    // Continue with totals
    const totalIncome = totals.incomeCredit + totals.bankCredit + totals.cashCredit;
    const totalExpenses = totals.officeDebit + totals.kitchenDebit + totals.bankDebit + totals.cashDebit + totals.salaryDebit;
    const netProfit = totalIncome - totalExpenses;

    summaryData.push(
      ['', '', '', '', ''],
      ['OVERALL TOTALS', '', '', '', ''],
      ['Total Income', '', formatNumber(totalIncome), '', ''],
      ['Total Expenses', formatNumber(totalExpenses), '', '', ''],
      ['Net Profit/Loss', '', '', formatNumber(netProfit), ''],
      ['', '', '', '', ''],
      ['ADDITIONAL DATA', '', '', '', ''],
      ['Total Invoices', (filteredData.invoices || []).length, '', '', ''],
      ['Total Customers', (filteredData.customers || allData.customers || []).length, '', '', ''],
      ['Total Entries', Object.values(filteredData).reduce((total, arr) => total + (Array.isArray(arr) ? arr.length : 0), 0), '', '', '']
    );
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // 2. Combined Data Sheet - Data from filtered modules
    const combinedData = [];
    
    // Add entries from filtered data
    if (filteredData.bank) {
      filteredData.bank.forEach(entry => {
        combinedData.push({
          'Book Name': 'Bank Book',
          'Date': entry.date || '',
          'FY': entry.fy || '',
          'VR No': entry.vrNo || '',
          'A/C Head': entry.acHead || 'Bank',
          'A/C Name': entry.acName || '',
          'Entry Name': entry.name || entry.customerName || '',
          'Description': entry.description || '',
          'Fees Name': entry.feesName || '',
          'Method': entry.method || '',
          'Debit': entry.debit || 0,
          'Credit': entry.credit || 0,
          'Transfer': entry.transfer || '',
          'ID': entry.vrNo || entry.accountNo || entry.customId || '',
          'Gender': entry.gender || '',
          'Entry Date': entry.entryDate || entry.timestamp || entry.date || new Date().toISOString().split('T')[0],
          'Remark': entry.remark || ''
        });
      });
    }
    
    // Add Cash entries
    if (filteredData.cash) {
      filteredData.cash.forEach(entry => {
        combinedData.push({
          'Book Name': 'Cash Book',
          'Date': entry.date || '',
          'FY': entry.fy || '',
          'VR No': entry.vrNo || '',
          'A/C Head': entry.acHead || 'Cash',
          'A/C Name': entry.acName || '',
          'Entry Name': entry.name || entry.customerName || '',
          'Description': entry.description || '',
          'Fees Name': entry.feesName || '',
          'Method': entry.method || '',
          'Debit': entry.debit || 0,
          'Credit': entry.credit || 0,
          'Transfer': entry.transfer || '',
          'ID': entry.vrNo || entry.customId || '',
          'Gender': entry.gender || '',
          'Entry Date': entry.entryDate || entry.timestamp || entry.date || new Date().toISOString().split('T')[0],
          'Remark': entry.remark || ''
        });
      });
    }
    
    // Add Income entries
    if (filteredData.income) {
      filteredData.income.forEach(entry => {
        // Generate FY in correct format for Income entries
        const generateFY = (dateStr) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          const month = date.getMonth() + 1;
          const year = date.getFullYear();
          
          let fyStart, fyEnd;
          if (month >= 4) {
            fyStart = year;
            fyEnd = year + 1;
          } else {
            fyStart = year - 1;
            fyEnd = year;
          }
          
          return `FY ${fyStart.toString().slice(-2)}-${fyEnd.toString().slice(-2)}`;
        };

        combinedData.push({
          'Book Name': 'Income & Invoice Book',
          'Date': entry.date || '',
          'FY': generateFY(entry.date) || entry.fy || '',
          'VR No': entry.vrNo || '',
          'A/C Head': entry.acHead || 'Income',
          'A/C Name': entry.acName || '',
          'Entry Name': entry.name || entry.customerName || '',
          'Description': entry.description || '',
          'Fees Name': entry.feesName || '',
          'Method': entry.method || '',
          'Debit': entry.debit || 0,
          'Credit': entry.credit || 0,
          'Transfer': entry.transfer || '',
          'ID': entry.customId || entry.customerId || entry.customerID || entry.vrNo || entry.accountNo || '',
          'Gender': entry.gender || '',
          'Entry Date': entry.entryDate || entry.timestamp || '',
          'Remark': entry.remark || ''
        });
      });
    }
    
    // Add Office entries
    if (filteredData.office) {
      filteredData.office.forEach(entry => {
        combinedData.push({
          'Book Name': 'Office Exp Book',
          'Date': entry.date || '',
          'FY': entry.fy || '',
          'VR No': entry.vrNo || '',
          'A/C Head': entry.acHead || 'Office Expense',
          'A/C Name': entry.acName || '',
          'Entry Name': entry.name || entry.customerName || '',
          'Description': entry.description || '',
          'Fees Name': entry.feesName || '',
          'Method': entry.method || '',
          'Debit': entry.debit || 0,
          'Credit': entry.credit || 0,
          'Transfer': entry.transfer || '',
          'ID': entry.vrNo || entry.customId || '',
          'Gender': entry.gender || '',
          'Entry Date': entry.entryDate || entry.timestamp || '',
          'Remark': entry.remark || ''
        });
      });
    }
    
    // Add Kitchen entries
    if (filteredData.kitchen) {
      filteredData.kitchen.forEach(entry => {
        combinedData.push({
          'Book Name': 'Kitchen Exp Book',
          'Date': entry.date || '',
          'FY': entry.fy || '',
          'VR No': entry.vrNo || '',
          'A/C Head': entry.acHead || 'Kitchen Expense',
          'A/C Name': entry.acName || '',
          'Entry Name': entry.name || entry.customerName || '',
          'Description': entry.description || '',
          'Fees Name': entry.feesName || '',
          'Method': entry.method || '',
          'Debit': entry.debit || 0,
          'Credit': entry.credit || 0,
          'Transfer': entry.transfer || '',
          'ID': entry.vrNo || entry.customId || '',
          'Gender': entry.gender || '',
          'Entry Date': entry.entryDate || entry.timestamp || '',
          'Remark': entry.remark || ''
        });
      });
    }
    
    // Add Salary entries
    if (filteredData.salary) {
      filteredData.salary.forEach(entry => {
        combinedData.push({
          'Book Name': 'Salary Exp Book',
          'Date': entry.date || '',
          'FY': entry.fy || '',
          'VR No': entry.vrNo || '',
          'A/C Head': entry.acHead || 'Salary Expense',
          'A/C Name': entry.acName || '',
          'Entry Name': entry.name || entry.customerName || '',
          'Description': entry.description || '',
          'Fees Name': entry.feesName || '',
          'Method': entry.method || '',
          'Debit': entry.debit || 0,
          'Credit': entry.credit || 0,
          'Transfer': entry.transfer || '',
          'ID': entry.vrNo || entry.customId || '',
          'Gender': entry.gender || '',
          'Entry Date': entry.entryDate || entry.timestamp || '',
          'Remark': entry.remark || ''
        });
      });
    }
    
    // Sort combined data by date
    combinedData.sort((a, b) => new Date(a.Date) - new Date(b.Date));
    
    const sumDataSheet = XLSX.utils.json_to_sheet(combinedData);
    XLSX.utils.book_append_sheet(workbook, sumDataSheet, 'Sum Data');

    // 3. Individual module sheets based on filtered data
    if (bookFilter === 'all') {
      // For "All Books", create individual sheets for each book type
      if (filteredData.bank && filteredData.bank.length > 0) {
        const bankFormattedData = filteredData.bank.map(entry => ({
          'Date': entry.date || '',
          'FY': entry.fy || '',
          'VR No': entry.vrNo || '',
          'A/C Head': entry.acHead || 'Bank',
          'A/C Name': entry.acName || '',
          'Entry Name': entry.name || entry.customerName || '',
          'Description': entry.description || '',
          'Fees Name': entry.feesName || '',
          'Method': entry.method || '',
          'Debit': entry.debit || 0,
          'Credit': entry.credit || 0,
          'Transfer': entry.transfer || '',
          'ID': entry.vrNo || entry.accountNo || entry.customId || '',
          'Gender': entry.gender || '',
          'Entry Date': entry.entryDate || entry.timestamp || entry.date || new Date().toISOString().split('T')[0],
          'Remark': entry.remark || ''
        }));
        const bankSheet = XLSX.utils.json_to_sheet(bankFormattedData);
        XLSX.utils.book_append_sheet(workbook, bankSheet, 'Bank');
      }
      
      if (filteredData.cash && filteredData.cash.length > 0) {
        const cashFormattedData = filteredData.cash.map(entry => ({
          'Date': entry.date || '',
          'FY': entry.fy || '',
          'VR No': entry.vrNo || '',
          'A/C Head': entry.acHead || 'Cash',
          'A/C Name': entry.acName || '',
          'Entry Name': entry.name || entry.customerName || '',
          'Description': entry.description || '',
          'Fees Name': entry.feesName || '',
          'Method': entry.method || '',
          'Debit': entry.debit || 0,
          'Credit': entry.credit || 0,
          'Transfer': entry.transfer || '',
          'ID': entry.vrNo || entry.customId || '',
          'Gender': entry.gender || '',
          'Entry Date': entry.entryDate || entry.timestamp || entry.date || new Date().toISOString().split('T')[0],
          'Remark': entry.remark || ''
        }));
        const cashSheet = XLSX.utils.json_to_sheet(cashFormattedData);
        XLSX.utils.book_append_sheet(workbook, cashSheet, 'Cash');
      }
      
      if (filteredData.income && filteredData.income.length > 0) {
        const generateFY = (dateStr) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          const month = date.getMonth() + 1;
          const year = date.getFullYear();
          let fyStart, fyEnd;
          if (month >= 4) {
            fyStart = year;
            fyEnd = year + 1;
          } else {
            fyStart = year - 1;
            fyEnd = year;
          }
          return `FY ${fyStart.toString().slice(-2)}-${fyEnd.toString().slice(-2)}`;
        };
        
        const incomeFormattedData = filteredData.income.map(entry => ({
          'Date': entry.date || '',
          'FY': generateFY(entry.date) || entry.fy || '',
          'VR No': entry.vrNo || '',
          'A/C Head': entry.acHead || 'Income',
          'A/C Name': entry.acName || '',
          'Entry Name': entry.name || entry.customerName || '',
          'Description': entry.description || '',
          'Fees Name': entry.feesName || '',
          'Method': entry.method || '',
          'Debit': entry.debit || 0,
          'Credit': entry.credit || 0,
          'Transfer': entry.transfer || '',
          'ID': entry.customId || entry.customerId || entry.customerID || entry.vrNo || entry.accountNo || '',
          'Gender': entry.gender || '',
          'Entry Date': entry.entryDate || entry.timestamp || entry.date || new Date().toISOString().split('T')[0],
          'Remark': entry.remark || ''
        }));
        const incomeSheet = XLSX.utils.json_to_sheet(incomeFormattedData);
        XLSX.utils.book_append_sheet(workbook, incomeSheet, 'Income');
      }
      
      if (filteredData.office && filteredData.office.length > 0) {
        const officeFormattedData = filteredData.office.map(entry => ({
          'Date': entry.date || '',
          'FY': entry.fy || '',
          'VR No': entry.vrNo || '',
          'A/C Head': entry.acHead || 'Office Expense',
          'A/C Name': entry.acName || '',
          'Entry Name': entry.name || entry.customerName || '',
          'Description': entry.description || '',
          'Fees Name': entry.feesName || '',
          'Method': entry.method || '',
          'Debit': entry.debit || 0,
          'Credit': entry.credit || 0,
          'Transfer': entry.transfer || '',
          'ID': entry.vrNo || entry.customId || '',
          'Gender': entry.gender || '',
          'Entry Date': entry.entryDate || entry.timestamp || entry.date || new Date().toISOString().split('T')[0],
          'Remark': entry.remark || ''
        }));
        const officeSheet = XLSX.utils.json_to_sheet(officeFormattedData);
        XLSX.utils.book_append_sheet(workbook, officeSheet, 'Office');
      }
      
      if (filteredData.kitchen && filteredData.kitchen.length > 0) {
        const kitchenFormattedData = filteredData.kitchen.map(entry => ({
          'Date': entry.date || '',
          'FY': entry.fy || '',
          'VR No': entry.vrNo || '',
          'A/C Head': entry.acHead || 'Kitchen Expense',
          'A/C Name': entry.acName || '',
          'Entry Name': entry.name || entry.customerName || '',
          'Description': entry.description || '',
          'Fees Name': entry.feesName || '',
          'Method': entry.method || '',
          'Debit': entry.debit || 0,
          'Credit': entry.credit || 0,
          'Transfer': entry.transfer || '',
          'ID': entry.vrNo || entry.customId || '',
          'Gender': entry.gender || '',
          'Entry Date': entry.entryDate || entry.timestamp || entry.date || new Date().toISOString().split('T')[0],
          'Remark': entry.remark || ''
        }));
        const kitchenSheet = XLSX.utils.json_to_sheet(kitchenFormattedData);
        XLSX.utils.book_append_sheet(workbook, kitchenSheet, 'Kitchen');
      }
      
      if (filteredData.salary && filteredData.salary.length > 0) {
        const salaryFormattedData = filteredData.salary.map(entry => ({
          'Date': entry.date || '',
          'FY': entry.fy || '',
          'VR No': entry.vrNo || '',
          'A/C Head': entry.acHead || 'Salary Expense',
          'A/C Name': entry.acName || '',
          'Entry Name': entry.name || entry.customerName || '',
          'Description': entry.description || '',
          'Fees Name': entry.feesName || '',
          'Method': entry.method || '',
          'Debit': entry.debit || 0,
          'Credit': entry.credit || 0,
          'Transfer': entry.transfer || '',
          'ID': entry.vrNo || entry.customId || '',
          'Gender': entry.gender || '',
          'Entry Date': entry.entryDate || entry.timestamp || entry.date || new Date().toISOString().split('T')[0],
          'Remark': entry.remark || ''
        }));
        const salarySheet = XLSX.utils.json_to_sheet(salaryFormattedData);
        XLSX.utils.book_append_sheet(workbook, salarySheet, 'Salary');
      }
    } else {
      // For individual book selection, create only the selected book sheet
      Object.keys(filteredData).forEach(bookType => {
        if (filteredData[bookType] && filteredData[bookType].length > 0) {
          const sheet = XLSX.utils.json_to_sheet(filteredData[bookType]);
          const sheetName = bookType.charAt(0).toUpperCase() + bookType.slice(1);
          XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
        }
      });
    }
    
    // Add additional sheets for invoices and customers if available
    if (filteredData.invoices && filteredData.invoices.length > 0) {
      const invoicesSheet = XLSX.utils.json_to_sheet(filteredData.invoices);
      XLSX.utils.book_append_sheet(workbook, invoicesSheet, 'Invoices');
    }
    
    if (allData.customers && allData.customers.length > 0) {
      const customersSheet = XLSX.utils.json_to_sheet(allData.customers);
      XLSX.utils.book_append_sheet(workbook, customersSheet, 'Customers');
    }

    // Generate filename based on filter
    const filename = `CashBook_${bookFilterNames[bookFilter].replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const renderSummaryReport = () => (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>






      {/* Daily Balances Table */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e1e8ed'
      }}>
        <h3 style={{ 
          color: '#2c3e50', 
          margin: '0 0 12px 0',
          fontSize: '18px',
          borderBottom: '2px solid #3498db',
          paddingBottom: '5px',
          display: 'inline-block'
        }}>
          📊 Daily Balances Summary
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', backgroundColor: 'white' }}>
          <thead>
            <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}></th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Bank</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Cash</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Office</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Salary</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Kitchen</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Advance</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#2c3e50' }}>Total Balances</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f8f9fa' }}>1. Bank</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', color: dailyBalances.bank >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: '#f8f9fa' }}>
                {formatNumber(dailyBalances.bank)}
              </td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', color: dailyBalances.bankToCash >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: '#f8f9fa' }}>
                {formatNumber(dailyBalances.bankToCash)}
              </td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', color: dailyBalances.officeBank >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: '#f8f9fa' }}>
                {formatNumber(dailyBalances.officeBank)}
              </td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', color: dailyBalances.salaryBank >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: '#f8f9fa' }}>
                {formatNumber(dailyBalances.salaryBank)}
              </td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', color: dailyBalances.kitchenBank >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: '#f8f9fa' }}>
                {formatNumber(dailyBalances.kitchenBank)}
              </td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#f8f9fa' }}>-</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: (dailyBalances.bank + dailyBalances.bankToCash + dailyBalances.officeBank + dailyBalances.salaryBank + dailyBalances.kitchenBank) >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: '#f8f9fa' }}>
                {formatNumber(dailyBalances.bank + dailyBalances.bankToCash + dailyBalances.officeBank + dailyBalances.salaryBank + dailyBalances.kitchenBank)}
              </td>
            </tr>
            <tr style={{ backgroundColor: 'white' }}>
              <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: 'white' }}>2. Cash</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: 'white' }}>-</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', color: dailyBalances.cash >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: 'white' }}>
                {formatNumber(dailyBalances.cash)}
              </td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: 'white' }}>-</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: 'white' }}>-</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: 'white' }}>-</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', color: dailyBalances.advanceCash >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: 'white' }}>
                {formatNumber(dailyBalances.advanceCash)}
              </td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: (dailyBalances.cash + dailyBalances.advanceCash) >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: 'white' }}>
                {formatNumber(dailyBalances.cash + dailyBalances.advanceCash)}
              </td>
            </tr>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f8f9fa' }}>3. Kpay</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', color: dailyBalances.officeKpay >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: '#f8f9fa' }}>
                {formatNumber(dailyBalances.officeKpay)}
              </td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#f8f9fa' }}>-</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', color: dailyBalances.officeKpay >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: '#f8f9fa' }}>
                {formatNumber(dailyBalances.officeKpay)}
              </td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', color: dailyBalances.salaryKpay >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: '#f8f9fa' }}>
                {formatNumber(dailyBalances.salaryKpay)}
              </td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', color: dailyBalances.kitchenKpay >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: '#f8f9fa' }}>
                {formatNumber(dailyBalances.kitchenKpay)}
              </td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', color: dailyBalances.advanceKpay >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: '#f8f9fa' }}>
                {formatNumber(dailyBalances.advanceKpay)}
              </td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: (dailyBalances.officeKpay + dailyBalances.salaryKpay + dailyBalances.kitchenKpay + dailyBalances.advanceKpay) >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: '#f8f9fa' }}>
                {formatNumber(dailyBalances.officeKpay + dailyBalances.salaryKpay + dailyBalances.kitchenKpay + dailyBalances.advanceKpay)}
              </td>
            </tr>

            <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
              <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>Total</td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
                {formatNumber(dailyBalances.bank + dailyBalances.officeBank)}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
                {formatNumber(dailyBalances.cash + dailyBalances.officeCash)}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
                {formatNumber(dailyBalances.officeKpay)}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
                {formatNumber(dailyBalances.salaryKpay)}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
                {formatNumber(dailyBalances.kitchenKpay)}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
                {formatNumber(dailyBalances.advanceCash + dailyBalances.advanceKpay)}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>
                {formatNumber(
                  dailyBalances.bank + dailyBalances.cash + 
                  dailyBalances.officeBank + dailyBalances.officeCash + dailyBalances.officeKpay +
                  dailyBalances.salaryBank + dailyBalances.salaryCash + dailyBalances.salaryKpay +
                  dailyBalances.kitchenBank + dailyBalances.kitchenCash + dailyBalances.kitchenKpay +
                  dailyBalances.advanceCash + dailyBalances.advanceKpay
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>



      {/* Category Balances Table */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e1e8ed'
      }}>
        <h3 style={{ 
          color: '#2c3e50', 
          margin: '0 0 12px 0',
          fontSize: '18px',
          borderBottom: '2px solid #9b59b6',
          paddingBottom: '5px',
          display: 'inline-block'
        }}>
          📋 Category Balances
        </h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', backgroundColor: 'white' }}>
          <thead>
            <tr style={{ backgroundColor: '#9b59b6', color: 'white' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', backgroundColor: '#9b59b6', color: 'white' }}>Category</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#9b59b6', color: 'white' }}>Total Debit</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#9b59b6', color: 'white' }}>Total Credit</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#9b59b6', color: 'white' }}>Net Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f8f9fa' }}>Bank</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', backgroundColor: '#f8f9fa' }}>{formatNumber(totals.bankDebit)}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', backgroundColor: '#f8f9fa' }}>{formatNumber(totals.bankCredit)}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: (totals.bankCredit - totals.bankDebit) >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: '#f8f9fa' }}>
                {formatNumber(totals.bankCredit - totals.bankDebit)}
              </td>
            </tr>
            <tr style={{ backgroundColor: 'white' }}>
              <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: 'white' }}>Cash</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', backgroundColor: 'white' }}>{formatNumber(totals.cashDebit)}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', backgroundColor: 'white' }}>{formatNumber(totals.cashCredit)}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: (totals.cashCredit - totals.cashDebit) >= 0 ? '#27ae60' : '#e74c3c', backgroundColor: 'white' }}>
                {formatNumber(totals.cashCredit - totals.cashDebit)}
              </td>
            </tr>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f8f9fa' }}>Income</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', backgroundColor: '#f8f9fa' }}>{formatNumber(totals.incomeDebit)}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', backgroundColor: '#f8f9fa' }}>{formatNumber(totals.incomeCredit)}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: '#27ae60', backgroundColor: '#f8f9fa' }}>
                {formatNumber(totals.incomeCredit - totals.incomeDebit)}
              </td>
            </tr>
            <tr style={{ backgroundColor: 'white' }}>
              <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: 'white' }}>Office Expenses</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', backgroundColor: 'white' }}>{formatNumber(totals.officeDebit)}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', backgroundColor: 'white' }}>{formatNumber(totals.officeCredit)}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: '#e74c3c', backgroundColor: 'white' }}>
                {formatNumber(totals.officeCredit - totals.officeDebit)}
              </td>
            </tr>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: '#f8f9fa' }}>Kitchen Expenses</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', backgroundColor: '#f8f9fa' }}>{formatNumber(totals.kitchenDebit)}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', backgroundColor: '#f8f9fa' }}>{formatNumber(totals.kitchenCredit)}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: '#e74c3c', backgroundColor: '#f8f9fa' }}>
                {formatNumber(totals.kitchenCredit - totals.kitchenDebit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Student List Summary Table */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e1e8ed'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <h3 style={{ 
            color: '#2c3e50', 
            margin: 0,
            fontSize: '18px',
            borderBottom: '2px solid #e74c3c',
            paddingBottom: '5px',
            display: 'inline-block'
          }}>
            👥 Student List Summary
          </h3>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            backgroundColor: '#f8f9fa',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #e1e8ed'
          }}>
            <label style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '13px' }}>FY:</label>
            <select 
              value={selectedFY} 
              onChange={(e) => setSelectedFY(e.target.value)}
              style={{ 
                padding: '8px 12px', 
                border: '2px solid #3498db', 
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#2c3e50',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              {availableFYs.map(fy => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', backgroundColor: 'white' }}>
          <thead>
            <tr style={{ backgroundColor: '#e74c3c', color: 'white' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', backgroundColor: '#e74c3c', color: 'white' }}>Grade</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#e74c3c', color: 'white' }}>Male</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#e74c3c', color: 'white' }}>Female</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: '#e74c3c', color: 'white' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(studentSummary).map(([grade, counts], index) => (
              <tr key={grade} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>{grade}</td>
                <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>{counts.male || 0}</td>
                <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>{counts.female || 0}</td>
                <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                  {(counts.male || 0) + (counts.female || 0)}
                </td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#e74c3c', color: 'white' }}>
              <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>Total</td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                {Object.values(studentSummary).reduce((sum, counts) => sum + (counts.male || 0), 0)}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                {Object.values(studentSummary).reduce((sum, counts) => sum + (counts.female || 0), 0)}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                {Object.values(studentSummary).reduce((sum, counts) => sum + (counts.male || 0) + (counts.female || 0), 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDetailedReport = () => {
    const filteredData = getFilteredData();
    
    if (bookFilter === 'all') {
      // Combined table for all books with headers
      const allEntries = [];
      
      // Combine all entries with book type identifier
      Object.keys(filteredData).forEach(bookType => {
        if (Array.isArray(filteredData[bookType])) {
          filteredData[bookType].forEach(entry => {
            allEntries.push({
              ...entry,
              bookType: bookType.charAt(0).toUpperCase() + bookType.slice(1)
            });
          });
        }
      });
      
      // Sort by date
      allEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      return (
        <div>
          <h3 style={{ 
            color: '#2c3e50', 
            marginBottom: '15px',
            borderBottom: '2px solid #3498db',
            paddingBottom: '5px'
          }}>
            Combined Data from All Books ({allEntries.length} total entries)
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Book Type</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Date</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>A/C Head</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>A/C Name</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Description</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Debit</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {allEntries.map((entry, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                  <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold', color: '#2c3e50' }}>
                    {entry.bookType}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.date}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.acHead}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.acName}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.description}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#e74c3c' }}>
                    {entry.debit ? formatNumber(entry.debit) : ''}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#27ae60' }}>
                    {entry.credit ? formatNumber(entry.credit) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else {
      // Individual book display
      return (
        <div>
          {Object.keys(filteredData).map(category => (
            <div key={category} style={{ marginBottom: '30px' }}>
              <h3 style={{ 
                color: '#2c3e50', 
                marginBottom: '15px',
                textTransform: 'capitalize',
                borderBottom: '2px solid #3498db',
                paddingBottom: '5px'
              }}>
                {category} Book ({(filteredData[category] || []).length} entries)
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Date</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>A/C Head</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>A/C Name</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Description</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Debit</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {(filteredData[category] || []).map((entry, index) => (
                    <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.date}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.acHead}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.acName}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.description}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#e74c3c' }}>
                        {entry.debit ? formatNumber(entry.debit) : ''}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#27ae60' }}>
                        {entry.credit ? formatNumber(entry.credit) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header with Title and Summary Boxes */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <h2 style={{ color: '#2c3e50', margin: 0, fontSize: '28px' }}>Reports & Analytics</h2>
        
        {/* Summary Boxes - Compact Horizontal Layout */}
        <div style={{ 
          display: 'flex', 
          gap: '15px',
          flexWrap: 'wrap'
        }}>
          <div style={{ 
            padding: '10px 15px', 
            backgroundColor: '#e8f5e8', 
            borderRadius: '8px', 
            border: '2px solid #27ae60',
            minWidth: '130px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h4 style={{ color: '#27ae60', margin: '0 0 3px 0', fontSize: '11px', fontWeight: 'bold' }}>Total Income</h4>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#27ae60', margin: 0 }}>{formatNumber(totalIncome)}</p>
          </div>
          <div style={{ 
            padding: '10px 15px', 
            backgroundColor: '#fdf2e9', 
            borderRadius: '8px', 
            border: '2px solid #e67e22',
            minWidth: '130px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h4 style={{ color: '#e67e22', margin: '0 0 3px 0', fontSize: '11px', fontWeight: 'bold' }}>Total Expenses</h4>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#e67e22', margin: 0 }}>{formatNumber(totalExpenses)}</p>
          </div>
          <div style={{ 
            padding: '10px 15px', 
            backgroundColor: netProfit >= 0 ? '#e8f5e8' : '#fadbd8', 
            borderRadius: '8px', 
            border: `2px solid ${netProfit >= 0 ? '#27ae60' : '#e74c3c'}`,
            minWidth: '130px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h4 style={{ color: netProfit >= 0 ? '#27ae60' : '#e74c3c', margin: '0 0 3px 0', fontSize: '11px', fontWeight: 'bold' }}>Net Profit/Loss</h4>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: netProfit >= 0 ? '#27ae60' : '#e74c3c', margin: 0 }}>{formatNumber(netProfit)}</p>
          </div>
        </div>
      </div>
      
      <div style={{ marginBottom: '15px', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#f8f9fa' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', fontSize: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px', minWidth: '80px' }}>Report Type:</label>
            <select 
              value={reportType} 
              onChange={(e) => setReportType(e.target.value)}
              style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', minWidth: '120px' }}
            >
              <option value="summary">Summary Report</option>
              <option value="detailed">Detailed Report</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px', minWidth: '75px' }}>Book Filter:</label>
            <select 
              value={bookFilter} 
              onChange={(e) => setBookFilter(e.target.value)}
              style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', minWidth: '140px' }}
            >
              <option value="all">All Books</option>
              <option value="cash">Cash Book</option>
              <option value="income">Income & Invoice Book</option>
              <option value="office">Office Exp Book</option>
              <option value="salary">Salary Exp Book</option>
              <option value="kitchen">Kitchen Book</option>
              <option value="bank">Bank Book</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px', minWidth: '40px' }}>From:</label>
            <input 
              type="date" 
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', minWidth: '130px' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '13px', minWidth: '25px' }}>To:</label>
            <input 
              type="date" 
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              style={{ padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', minWidth: '130px' }}
            />
          </div>
          
          <button 
            onClick={exportReport}
            style={{ 
              padding: '7px 15px', 
              backgroundColor: '#27ae60', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              minWidth: '120px',
              marginLeft: '10px'
            }}
          >
            📊 Export to Excel
          </button>
        </div>
      </div>

      {/* Always show summary report content - no detailed report table */}
      {renderSummaryReport()}
    </div>
  );
}

export default ReportingApp;
