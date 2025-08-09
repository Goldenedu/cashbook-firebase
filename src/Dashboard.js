import React, { useState, useContext, useEffect } from 'react';
import './App.css';
import { DataProvider, useData } from './DataContext';
// Import all the individual app components
import BankApp from './components/BankApp';
import CashApp from './components/CashApp';
import CustomerApp from './components/CustomerApp';
import IncomeApp from './components/IncomeApp';
import OfficeApp from './components/OfficeApp';
import KitchenApp from './components/KitchenApp';
import SalaryApp from './components/SalaryApp';
import ReportingApp from './components/ReportingApp';
import DailyBalanceSummary from './components/DailyBalanceSummary';

// Enhanced Dashboard component with beautiful income, expense, and net balance sections
function Dashboard() {
  const { incomeEntries, officeEntries, salaryEntries, kitchenEntries, importCSVData } = useData();
  const [selectedFY, setSelectedFY] = useState('');
  const [availableFYs, setAvailableFYs] = useState([]);
  const [incomeData, setIncomeData] = useState({
    boarder: { registration: 0, services: 0, tuition: 0, hostel: 0 },
    semiBoarder: { registration: 0, services: 0, tuition: 0, ferry: 0 },
    day: { registration: 0, services: 0, ferry: 0, tuition: 0 },
    total: 0,
    byMethod: { cash: 0, kpay: 0, bank: 0 }
  });
  const [expenseData, setExpenseData] = useState({
    office: 0,
    salary: 0,
    kitchen: 0,
    total: 0
  });

  const [summaryData, setSummaryData] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    profitMargin: 0
  });

  // Handle CSV import for historical data
  const handleCSVImport = async (event, bookType) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const result = await importCSVData(file, bookType);
        alert(result); // Simple success message
        event.target.value = ''; // Reset file input
      } catch (error) {
        alert(`Import failed: ${error.message}`);
        event.target.value = ''; // Reset file input
      }
    }
  };

  // Auto-generate Financial Year based on current date (April-March)
  const generateCurrentFY = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
    
    let fyStartYear, fyEndYear;
    
    if (currentMonth >= 4) { // April to December
      fyStartYear = currentYear;
      fyEndYear = currentYear + 1;
    } else { // January to March
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

  // Enhanced calculation for income data with more detailed categorization
  const calculateIncomeData = () => {
    if (!incomeEntries || incomeEntries.length === 0) {
      return {
        boarder: { registration: 0, services: 0, tuition: 0, hostel: 0 },
        semiBoarder: { registration: 0, services: 0, tuition: 0, ferry: 0 },
        day: { registration: 0, services: 0, ferry: 0, tuition: 0 },
        total: 0,
        byMethod: { cash: 0, kpay: 0, bank: 0 }
      };
    }

    // Filter by selected FY if available, otherwise use all entries
    const filteredEntries = selectedFY ? 
      incomeEntries.filter(entry => entry.fy === selectedFY) : 
      incomeEntries;
    
    const data = {
      boarder: { registration: 0, services: 0, tuition: 0, hostel: 0 },
      semiBoarder: { registration: 0, services: 0, tuition: 0, ferry: 0 },
      day: { registration: 0, services: 0, ferry: 0, tuition: 0 },
      total: 0,
      byMethod: { cash: 0, kpay: 0, bank: 0 }
    };

    filteredEntries.forEach(entry => {
      const amount = parseFloat(entry.debit) || 0;
      const acHead = entry.acHead || '';
      const feesName = entry.feesName || '';
      const method = (entry.method || '').toLowerCase();
      
      // Categorize by payment method
      if (method === 'cash') data.byMethod.cash += amount;
      else if (method === 'kpay') data.byMethod.kpay += amount;
      else if (method === 'bank') data.byMethod.bank += amount;
      
      // Categorize based on A/C Head and Fees Name
      if (acHead === 'Boarder') {
        if (feesName === 'Registration') data.boarder.registration += amount;
        else if (feesName === 'Services') data.boarder.services += amount;
        else if (feesName === 'Tuition') data.boarder.tuition += amount;
        else if (feesName === 'Hostel') data.boarder.hostel += amount;
      } else if (acHead === 'Semi Boarder') {
        if (feesName === 'Registration') data.semiBoarder.registration += amount;
        else if (feesName === 'Services') data.semiBoarder.services += amount;
        else if (feesName === 'Tuition') data.semiBoarder.tuition += amount;
        else if (feesName === 'Ferry') data.semiBoarder.ferry += amount;
      } else if (acHead === 'Day') {
        if (feesName === 'Registration') data.day.registration += amount;
        else if (feesName === 'Services') data.day.services += amount;
        else if (feesName === 'Ferry') data.day.ferry += amount;
        else if (feesName === 'Tuition') data.day.tuition += amount;
      }
    });

    // Calculate total
    data.total = Object.values(data.boarder).reduce((sum, val) => sum + val, 0) +
                 Object.values(data.semiBoarder).reduce((sum, val) => sum + val, 0) +
                 Object.values(data.day).reduce((sum, val) => sum + val, 0);

    return data;
  };

  // Calculate student counts by grade and gender from Income & Invoice Book
  const calculateStudentCounts = () => {
    if (!selectedFY || !incomeEntries || incomeEntries.length === 0) {
      return {
        grades: {
          'KG': { male: 0, female: 0, total: 0 },
          'Pre': { male: 0, female: 0, total: 0 },
          'G_1': { male: 0, female: 0, total: 0 },
          'G_2': { male: 0, female: 0, total: 0 },
          'G_3': { male: 0, female: 0, total: 0 },
          'G_4': { male: 0, female: 0, total: 0 },
          'G_5': { male: 0, female: 0, total: 0 },
          'G_6': { male: 0, female: 0, total: 0 },
          'G_7': { male: 0, female: 0, total: 0 },
          'G_8': { male: 0, female: 0, total: 0 },
          'G_9': { male: 0, female: 0, total: 0 },
          'G_10': { male: 0, female: 0, total: 0 },
          'G_11': { male: 0, female: 0, total: 0 },
          'G_12': { male: 0, female: 0, total: 0 }
        },
        totals: { male: 0, female: 0, total: 0 }
      };
    }

    const filteredEntries = incomeEntries.filter(entry => entry.fy === selectedFY);
    const uniqueStudents = new Set(); // To track unique students
    const studentCounts = {
      grades: {
        'KG': { male: 0, female: 0, total: 0 },
        'Pre': { male: 0, female: 0, total: 0 },
        'G_1': { male: 0, female: 0, total: 0 },
        'G_2': { male: 0, female: 0, total: 0 },
        'G_3': { male: 0, female: 0, total: 0 },
        'G_4': { male: 0, female: 0, total: 0 },
        'G_5': { male: 0, female: 0, total: 0 },
        'G_6': { male: 0, female: 0, total: 0 },
        'G_7': { male: 0, female: 0, total: 0 },
        'G_8': { male: 0, female: 0, total: 0 },
        'G_9': { male: 0, female: 0, total: 0 },
        'G_10': { male: 0, female: 0, total: 0 },
        'G_11': { male: 0, female: 0, total: 0 },
        'G_12': { male: 0, female: 0, total: 0 }
      },
      totals: { male: 0, female: 0, total: 0 }
    };

    filteredEntries.forEach(entry => {
      const name = entry.name || '';
      const acName = entry.acName || '';
      const gender = entry.gender || '';
      
      if (name && acName && gender) {
        // Create unique key for student (name + acName + gender)
        const studentKey = `${name}_${acName}_${gender}`;
        
        // Only count if not already counted (avoid duplicates)
        if (!uniqueStudents.has(studentKey)) {
          uniqueStudents.add(studentKey);
          
          // Map acName to grade categories
          let gradeKey = '';
          if (acName.includes('K G-')) gradeKey = 'KG';
          else if (acName.includes('Pre-')) gradeKey = 'Pre';
          else if (acName.includes('G _1')) gradeKey = 'G_1';
          else if (acName.includes('G _2')) gradeKey = 'G_2';
          else if (acName.includes('G _3')) gradeKey = 'G_3';
          else if (acName.includes('G _4')) gradeKey = 'G_4';
          else if (acName.includes('G _5')) gradeKey = 'G_5';
          else if (acName.includes('G _6')) gradeKey = 'G_6';
          else if (acName.includes('G _7')) gradeKey = 'G_7';
          else if (acName.includes('G _8')) gradeKey = 'G_8';
          else if (acName.includes('G _9')) gradeKey = 'G_9';
          else if (acName.includes('G_10')) gradeKey = 'G_10';
          else if (acName.includes('G_11')) gradeKey = 'G_11';
          else if (acName.includes('G_12')) gradeKey = 'G_12';
          
          if (gradeKey && studentCounts.grades[gradeKey]) {
            if (gender.toLowerCase() === 'male') {
              studentCounts.grades[gradeKey].male++;
              studentCounts.totals.male++;
            } else if (gender.toLowerCase() === 'female') {
              studentCounts.grades[gradeKey].female++;
              studentCounts.totals.female++;
            }
            studentCounts.grades[gradeKey].total++;
            studentCounts.totals.total++;
          }
        }
      }
    });

    return studentCounts;
  };

  // Simplified calculation for expense data
  const calculateExpenseData = () => {
    const data = {
      office: 0,
      salary: 0,
      kitchen: 0,
      total: 0
    };

    console.log('=== DASHBOARD EXPENSE CALCULATION ===');
    console.log('Kitchen Entries Count:', kitchenEntries?.length || 0);
    console.log('Office Entries Count:', officeEntries?.length || 0);
    console.log('Salary Entries Count:', salaryEntries?.length || 0);
    
    if (kitchenEntries && kitchenEntries.length > 0) {
      console.log('Sample Kitchen Entry:', kitchenEntries[0]);
    }

    // Calculate Office Expenses - just sum all credit amounts
    if (officeEntries && officeEntries.length > 0) {
      data.office = officeEntries.reduce((total, entry) => {
        const credit = parseFloat(entry.credit) || 0;
        return total + credit;
      }, 0);
    }

    // Calculate Salary Expenses - just sum all credit amounts
    if (salaryEntries && salaryEntries.length > 0) {
      data.salary = salaryEntries.reduce((total, entry) => {
        const credit = parseFloat(entry.credit) || 0;
        return total + credit;
      }, 0);
    }

    // Calculate Kitchen Expenses - just sum all credit amounts
    if (kitchenEntries && kitchenEntries.length > 0) {
      data.kitchen = kitchenEntries.reduce((total, entry) => {
        const credit = parseFloat(entry.credit) || 0;
        console.log(`Kitchen Entry Credit: ${entry.credit} -> Parsed: ${credit}`);
        return total + credit;
      }, 0);
    }

    console.log('Calculated Expenses:', data);
    data.total = data.office + data.salary + data.kitchen;
    return data;
  };

  // Calculate summary data including net balance and profit margin
  const calculateSummaryData = (income, expense) => {
    const totalIncome = income.total || 0;
    const totalExpense = expense.total || 0;
    const netBalance = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? ((netBalance / totalIncome) * 100) : 0;
    
    return {
      totalIncome,
      totalExpense,
      netBalance,
      profitMargin
    };
  };



  // Initialize FY options and set current FY on component mount
  useEffect(() => {
    const fys = generateAvailableFYs();
    setAvailableFYs(fys);
    const currentFY = generateCurrentFY();
    setSelectedFY(currentFY);
  }, []);

  // Update income data when FY or entries change
  useEffect(() => {
    const data = calculateIncomeData();
    setIncomeData(data);
  }, [selectedFY, incomeEntries]);



  // Update expense data when FY or entries change
  useEffect(() => {
    const data = calculateExpenseData();
    setExpenseData(data);
  }, [selectedFY, officeEntries, salaryEntries, kitchenEntries]);

  // Update summary data when income or expense data changes
  useEffect(() => {
    const summary = calculateSummaryData(incomeData, expenseData);
    setSummaryData(summary);
  }, [incomeData, expenseData]);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US').format(Math.abs(amount || 0));
  };

  return (
    <>
      <div style={{
        padding: '30px',
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
      }}>
      {/* Header with Financial Year in Top-Left */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold', color: '#34495e', fontSize: '16px' }}>Financial Year:</label>
          <select 
            value={selectedFY} 
            onChange={(e) => setSelectedFY(e.target.value)}
            style={{ padding: '10px 15px', borderRadius: '6px', border: '2px solid #3498db', fontSize: '16px', minWidth: '120px' }}
          >
            <option value="">All Years</option>
            {availableFYs.map(fy => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#2c3e50',
            margin: '0'
          }}>
            📊 Financial Dashboard
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: '#6c757d',
            margin: '5px 0 0 0'
          }}>
            Comprehensive overview of income, expenses, and financial performance
          </p>
        </div>
      </div>


      {/* Summary Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '15px',
        marginBottom: '25px',
        maxWidth: '1000px',
        margin: '0 auto 25px auto'
      }}>
        {/* Total Income Card */}
        <div style={{
          backgroundColor: '#28a745',
          color: '#ffffff',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            fontSize: '2.5rem',
            opacity: '0.15'
          }}>💰</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: '600' }}>Total Income</h3>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '3px' }}>
            {formatAmount(summaryData.totalIncome)} MMK
          </div>
          <div style={{ fontSize: '0.7rem', opacity: '0.9' }}>
            📈 Revenue
          </div>
        </div>

        {/* Total Expense Card */}
        <div style={{
          backgroundColor: '#dc3545',
          color: '#ffffff',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            fontSize: '2.5rem',
            opacity: '0.15'
          }}>💸</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: '600' }}>Total Expenses</h3>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '3px' }}>
            {formatAmount(summaryData.totalExpense)} MMK
          </div>
          <div style={{ fontSize: '0.7rem', opacity: '0.9' }}>
            📉 Operating Costs
          </div>
        </div>

        {/* Net Balance Card */}
        <div style={{
          backgroundColor: summaryData.netBalance >= 0 ? 
            '#007bff' : '#dc3545',
          color: '#ffffff',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: `0 4px 15px ${summaryData.netBalance >= 0 ? 
            'rgba(0, 123, 255, 0.3)' : 'rgba(220, 53, 69, 0.3)'}`,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            fontSize: '2.5rem',
            opacity: '0.15'
          }}>{summaryData.netBalance >= 0 ? '📊' : '⚠️'}</div>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '0.9rem', 
            fontWeight: '600',
            color: '#ffffff'
          }}>Net Balance</h3>
          <div style={{ 
            fontSize: '1.4rem', 
            fontWeight: '700', 
            marginBottom: '3px',
            color: '#ffffff'
          }}>
            {summaryData.netBalance >= 0 ? '+' : ''}{formatAmount(summaryData.netBalance)} MMK
          </div>
          <div style={{ 
            fontSize: '0.7rem', 
            fontWeight: '500',
            color: '#ffffff'
          }}>
            {summaryData.netBalance >= 0 ? '✅ Profit' : '❌ Loss'}
          </div>
        </div>

        {/* Profit Margin Card */}
        <div style={{
          backgroundColor: '#6f42c1',
          color: '#ffffff',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: '0 4px 15px rgba(111, 66, 193, 0.3)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            fontSize: '2.5rem',
            opacity: '0.15'
          }}>📈</div>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '0.9rem', 
            fontWeight: '600',
            color: '#ffffff'
          }}>Profit Margin</h3>
          <div style={{ 
            fontSize: '1.4rem', 
            fontWeight: '700', 
            marginBottom: '3px',
            color: '#ffffff'
          }}>
            {summaryData.profitMargin.toFixed(1)}%
          </div>
          <div style={{ 
            fontSize: '0.7rem', 
            fontWeight: '500',
            color: '#ffffff'
          }}>
            📈 Performance
          </div>
        </div>
      </div>

      {/* Detailed Income Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '25px',
        marginBottom: '30px'
      }}>
        {/* Income Breakdown Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '15px',
          padding: '25px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            color: '#28a745',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            💰 Income Breakdown
          </h3>
          
          {/* Student Categories */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#495057', marginBottom: '15px', fontSize: '1.1rem' }}>By Student Category</h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {/* Boarder */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div>
                  <strong style={{ color: '#495057' }}>🏠 Boarder</strong>
                  <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                    Reg: {formatAmount(incomeData.boarder.registration)} | 
                    Services: {formatAmount(incomeData.boarder.services)}
                  </div>
                </div>
                <div style={{ fontWeight: '700', color: '#28a745', fontSize: '1.1rem' }}>
                  {formatAmount(Object.values(incomeData.boarder).reduce((sum, val) => sum + val, 0))} MMK
                </div>
              </div>
              
              {/* Semi Boarder */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div>
                  <strong style={{ color: '#495057' }}>🏫 Semi Boarder</strong>
                  <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                    Reg: {formatAmount(incomeData.semiBoarder.registration)} | 
                    Services: {formatAmount(incomeData.semiBoarder.services)}
                  </div>
                </div>
                <div style={{ fontWeight: '700', color: '#28a745', fontSize: '1.1rem' }}>
                  {formatAmount(Object.values(incomeData.semiBoarder).reduce((sum, val) => sum + val, 0))} MMK
                </div>
              </div>
              
              {/* Day */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div>
                  <strong style={{ color: '#495057' }}>🌅 Day Students</strong>
                  <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                    Reg: {formatAmount(incomeData.day.registration)} | 
                    Services: {formatAmount(incomeData.day.services)} | 
                    Ferry: {formatAmount(incomeData.day.ferry)}
                  </div>
                </div>
                <div style={{ fontWeight: '700', color: '#28a745', fontSize: '1.1rem' }}>
                  {formatAmount(Object.values(incomeData.day).reduce((sum, val) => sum + val, 0))} MMK
                </div>
              </div>
            </div>
          </div>
          
          {/* Payment Methods */}
          <div>
            <h4 style={{ color: '#495057', marginBottom: '8px', fontSize: '0.95rem' }}>By Payment Method</h4>
            <div style={{ 
              display: 'flex', 
              gap: '8px',
              maxWidth: '100%'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: '#e8f5e8',
                borderRadius: '6px',
                border: '1px solid #c3e6cb',
                height: '35px',
                flex: '1',
                minWidth: '110px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem' }}>Cash</span>
                </div>
                <div style={{ fontWeight: '700', color: '#28a745', fontSize: '0.85rem' }}>
                  {formatAmount(incomeData.byMethod.cash)}
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: '#e3f2fd',
                borderRadius: '6px',
                border: '1px solid #bbdefb',
                height: '35px',
                flex: '1',
                minWidth: '110px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem' }}>KPay</span>
                </div>
                <div style={{ fontWeight: '700', color: '#007bff', fontSize: '0.85rem' }}>
                  {formatAmount(incomeData.byMethod.kpay)}
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: '#fff3e0',
                borderRadius: '6px',
                border: '1px solid #ffcc02',
                height: '35px',
                flex: '1',
                minWidth: '110px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem' }}>Bank</span>
                </div>
                <div style={{ fontWeight: '700', color: '#ff9800', fontSize: '0.85rem' }}>
                  {formatAmount(incomeData.byMethod.bank)}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Expense Breakdown Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '15px',
          padding: '25px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            color: '#dc3545',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            💸 Expense Breakdown
          </h3>
          
          {/* By Expense Category */}
          <div>
            <h4 style={{ color: '#495057', marginBottom: '12px', fontSize: '0.95rem' }}>By Expense Category</h4>
            <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <div>
                    <strong style={{ color: '#495057' }}>🏢 Office Expenses</strong>
                  </div>
                  <div style={{ fontWeight: '700', color: '#dc3545', fontSize: '1.1rem' }}>
                    {formatAmount(expenseData.office)} MMK
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <div>
                    <strong style={{ color: '#495057' }}>💼 Salary Expenses</strong>
                  </div>
                  <div style={{ fontWeight: '700', color: '#dc3545', fontSize: '1.1rem' }}>
                    {formatAmount(expenseData.salary)} MMK
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <div>
                    <strong style={{ color: '#495057' }}>🍽️ Kitchen Expenses</strong>
                  </div>
                  <div style={{ fontWeight: '700', color: '#dc3545', fontSize: '1.1rem' }}>
                    {formatAmount(expenseData.kitchen)} MMK
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Balance Summary Component */}
      <DailyBalanceSummary />

    </>
  );
}

function App() {
  const [activeApp, setActiveApp] = useState('dashboard');
  const [username] = useState('User'); // You can implement proper authentication later

  const renderActiveApp = () => {
    switch (activeApp) {
      case 'bank':
        return <BankApp />;
      case 'cash':
        return <CashApp />;
      case 'customer':
        return <CustomerApp />;
      case 'income':
        return <IncomeApp />;
      case 'office':
        return <OfficeApp />;
      case 'kitchen':
        return <KitchenApp />;
      case 'salary':
        return <SalaryApp />;
      case 'reporting':
        return <ReportingApp />;
      default:
        return <Dashboard setActiveApp={setActiveApp} />;
    }
  };

  return (
    <DataProvider>
      <div className="app">
        <div className="sidebar">
          <div className="sidebar-header">
            <h2 className="sidebar-title">Goalden EDU</h2>
            <h3 className="sidebar-cashbook">CashBook System</h3>
          </div>
          <nav className="sidebar-nav">
            <button 
              className={activeApp === 'dashboard' ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveApp('dashboard')}
            >
              <span className="nav-icon">🏠</span>
              Dashboard
            </button>
            
            <div className="nav-group">
              <div className="nav-group-title">Cash Management</div>
              <button 
                className={activeApp === 'cash' ? 'nav-item active' : 'nav-item'}
                onClick={() => setActiveApp('cash')}
              >
                <span className="nav-icon">💰</span>
                Cash Book
              </button>
              <button 
                className={activeApp === 'bank' ? 'nav-item active' : 'nav-item'}
                onClick={() => setActiveApp('bank')}
              >
                <span className="nav-icon">🏦</span>
                Bank Book
              </button>
            </div>

            <div className="nav-group">
              <div className="nav-group-title">Customer & Revenue</div>
              <button 
                className={activeApp === 'customer' ? 'nav-item active' : 'nav-item'}
                onClick={() => setActiveApp('customer')}
              >
                <span className="nav-icon">👥</span>
                Customer List
              </button>
              <button 
                className={activeApp === 'income' ? 'nav-item active' : 'nav-item'}
                onClick={() => setActiveApp('income')}
              >
                <span className="nav-icon">📊</span>
                Income & Invoice Book
              </button>
            </div>

            <div className="nav-group">
              <div className="nav-group-title">Expenses</div>
              <button 
                className={activeApp === 'office' ? 'nav-item active' : 'nav-item'}
                onClick={() => setActiveApp('office')}
              >
                <span className="nav-icon">🏢</span>
                Office Exp Book
              </button>
              <button 
                className={activeApp === 'salary' ? 'nav-item active' : 'nav-item'}
                onClick={() => setActiveApp('salary')}
              >
                <span className="nav-icon">💼</span>
                Salary Exp Book
              </button>
              <button 
                className={activeApp === 'kitchen' ? 'nav-item active' : 'nav-item'}
                onClick={() => setActiveApp('kitchen')}
              >
                <span className="nav-icon">🍽️</span>
                Kitchen Exp Book
              </button>
            </div>

            <div className="nav-group">
              <div className="nav-group-title">Analytics</div>
              <button 
                className={activeApp === 'reporting' ? 'nav-item active' : 'nav-item'}
                onClick={() => setActiveApp('reporting')}
              >
                <span className="nav-icon">📈</span>
                Reporting
              </button>
            </div>
          </nav>
          <div className="sidebar-footer">
            <button className="logout-btn">Logout</button>
          </div>
        </div>

        <div className="main-content">
          {renderActiveApp()}
        </div>
      </div>
    </DataProvider>
  );
}

export default App;
