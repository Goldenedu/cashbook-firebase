import React, { useState, useEffect } from 'react';
import { useData } from '../DataContext';

const DailyBalanceSummary = () => {
  const { 
    bankEntries, 
    cashEntries, 
    officeEntries, 
    salaryEntries, 
    kitchenEntries, 
    incomeEntries 
  } = useData();

  const [dailyBalances, setDailyBalances] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState('7'); // Default to last 7 days
  const [summaryStats, setSummaryStats] = useState({
    totalDays: 0,
    avgDailyBalance: 0,
    highestBalance: 0,
    lowestBalance: 0
  });

  // Calculate daily balances for all categories
  const calculateDailyBalances = () => {
    const allEntries = [
      ...(bankEntries || []).map(entry => ({ ...entry, category: 'Bank' })),
      ...(cashEntries || []).map(entry => ({ ...entry, category: 'Cash' })),
      ...(officeEntries || []).map(entry => ({ ...entry, category: 'Office' })),
      ...(salaryEntries || []).map(entry => ({ ...entry, category: 'Salary' })),
      ...(kitchenEntries || []).map(entry => ({ ...entry, category: 'Kitchen' })),
      ...(incomeEntries || []).map(entry => ({ ...entry, category: 'Advance' })) // Using income as advance
    ];

    // Group entries by date
    const entriesByDate = {};
    
    allEntries.forEach(entry => {
      const date = entry.date || entry.transactionDate;
      if (!date) return;
      
      const dateKey = new Date(date).toISOString().split('T')[0];
      if (!entriesByDate[dateKey]) {
        entriesByDate[dateKey] = {
          date: dateKey,
          Bank: { credit: 0, debit: 0, balance: 0 },
          Cash: { credit: 0, debit: 0, balance: 0 },
          Office: { credit: 0, debit: 0, balance: 0 },
          Salary: { credit: 0, debit: 0, balance: 0 },
          Kitchen: { credit: 0, debit: 0, balance: 0 },
          Advance: { credit: 0, debit: 0, balance: 0 },
          totalBalance: 0
        };
      }

      const category = entry.category;
      const amount = parseFloat(entry.amount || entry.credit || entry.debit || 0);
      
      // Determine if it's credit or debit based on entry structure and category
      if (entry.credit && parseFloat(entry.credit) > 0) {
        // Office, Salary, Kitchen are expenses - treat credits as debits (subtractions)
        if (category === 'Office' || category === 'Salary' || category === 'Kitchen') {
          entriesByDate[dateKey][category].debit += parseFloat(entry.credit);
        } else {
          entriesByDate[dateKey][category].credit += parseFloat(entry.credit);
        }
      } else if (entry.debit && parseFloat(entry.debit) > 0) {
        // Office, Salary, Kitchen debits remain as debits (subtractions)
        // Bank, Cash, Advance debits are actual debits
        entriesByDate[dateKey][category].debit += parseFloat(entry.debit);
      } else if (entry.amount) {
        // For entries with just amount
        if (category === 'Office' || category === 'Salary' || category === 'Kitchen') {
          // These categories are expenses - always subtract
          entriesByDate[dateKey][category].debit += Math.abs(amount);
        } else {
          // Bank, Cash, Advance - positive is credit, negative is debit
          if (amount >= 0) {
            entriesByDate[dateKey][category].credit += amount;
          } else {
            entriesByDate[dateKey][category].debit += Math.abs(amount);
          }
        }
      }
    });

    // Calculate balances and sort by date
    const dailyBalanceArray = Object.values(entriesByDate).map(dayData => {
      let totalBalance = 0;
      
      ['Bank', 'Cash', 'Office', 'Salary', 'Kitchen', 'Advance'].forEach(category => {
        dayData[category].balance = dayData[category].credit - dayData[category].debit;
        totalBalance += dayData[category].balance;
      });
      
      dayData.totalBalance = totalBalance;
      return dayData;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    return dailyBalanceArray;
  };

  // Filter balances based on selected date range
  const getFilteredBalances = (balances) => {
    if (selectedDateRange === 'all') return balances;
    
    const days = parseInt(selectedDateRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return balances.filter(balance => new Date(balance.date) >= cutoffDate);
  };

  // Calculate summary statistics
  const calculateSummaryStats = (balances) => {
    if (balances.length === 0) {
      return { totalDays: 0, avgDailyBalance: 0, highestBalance: 0, lowestBalance: 0 };
    }

    const totalBalances = balances.map(b => b.totalBalance);
    const sum = totalBalances.reduce((acc, val) => acc + val, 0);
    
    return {
      totalDays: balances.length,
      avgDailyBalance: sum / balances.length,
      highestBalance: Math.max(...totalBalances),
      lowestBalance: Math.min(...totalBalances)
    };
  };

  useEffect(() => {
    const allBalances = calculateDailyBalances();
    const filteredBalances = getFilteredBalances(allBalances);
    setDailyBalances(filteredBalances);
    setSummaryStats(calculateSummaryStats(filteredBalances));
  }, [bankEntries, cashEntries, officeEntries, salaryEntries, kitchenEntries, incomeEntries, selectedDateRange]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getAmountClass = (amount) => {
    if (amount > 0) return 'positive-amount';
    if (amount < 0) return 'negative-amount';
    return 'neutral-amount';
  };

  return (
    <div className="daily-balance-summary">
      <div className="summary-header">
        <h2>📊 Daily Balance Summary</h2>
        <div className="date-range-selector">
          <label htmlFor="dateRange">Show last: </label>
          <select 
            id="dateRange" 
            value={selectedDateRange} 
            onChange={(e) => setSelectedDateRange(e.target.value)}
          >
            <option value="7">7 days</option>
            <option value="15">15 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-value">{summaryStats.totalDays}</div>
          <div className="stat-label">Total Days</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${getAmountClass(summaryStats.avgDailyBalance)}`}>
            {formatCurrency(summaryStats.avgDailyBalance)}
          </div>
          <div className="stat-label">Avg Daily Balance</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${getAmountClass(summaryStats.highestBalance)}`}>
            {formatCurrency(summaryStats.highestBalance)}
          </div>
          <div className="stat-label">Highest Balance</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${getAmountClass(summaryStats.lowestBalance)}`}>
            {formatCurrency(summaryStats.lowestBalance)}
          </div>
          <div className="stat-label">Lowest Balance</div>
        </div>
      </div>

      {/* Daily Balance Table */}
      <div className="balance-table-container">
        <table className="balance-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Bank</th>
              <th>Cash</th>
              <th>Office</th>
              <th>Salary</th>
              <th>Kitchen</th>
              <th>Advance</th>
              <th>Total Balance</th>
            </tr>
          </thead>
          <tbody>
            {dailyBalances.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  No transaction data available for the selected period
                </td>
              </tr>
            ) : (
              dailyBalances.map((dayBalance, index) => (
                <tr key={index} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                  <td className="date-cell">{formatDate(dayBalance.date)}</td>
                  <td className={getAmountClass(dayBalance.Bank.balance)}>
                    {formatCurrency(dayBalance.Bank.balance)}
                  </td>
                  <td className={getAmountClass(dayBalance.Cash.balance)}>
                    {formatCurrency(dayBalance.Cash.balance)}
                  </td>
                  <td className={getAmountClass(dayBalance.Office.balance)}>
                    {formatCurrency(dayBalance.Office.balance)}
                  </td>
                  <td className={getAmountClass(dayBalance.Salary.balance)}>
                    {formatCurrency(dayBalance.Salary.balance)}
                  </td>
                  <td className={getAmountClass(dayBalance.Kitchen.balance)}>
                    {formatCurrency(dayBalance.Kitchen.balance)}
                  </td>
                  <td className={getAmountClass(dayBalance.Advance.balance)}>
                    {formatCurrency(dayBalance.Advance.balance)}
                  </td>
                  <td className={`total-balance ${getAmountClass(dayBalance.totalBalance)}`}>
                    {formatCurrency(dayBalance.totalBalance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Calculation Method Explanation */}
      <div className="calculation-method">
        <h3>🧮 Calculation Method</h3>
        <div className="method-explanation">
          <div className="method-row">
            <strong>Income Categories (Added +):</strong> Bank, Cash, Advance
          </div>
          <div className="method-row">
            <strong>Expense Categories (Subtracted -):</strong> Office, Salary, Kitchen
          </div>
          <div className="method-formula">
            <strong>Daily Balance = </strong>
            <span className="positive-amount">(Bank + Cash + Advance)</span>
            <span> - </span>
            <span className="negative-amount">(Office + Salary + Kitchen)</span>
          </div>
        </div>
      </div>

      {/* Detailed breakdown for each day (expandable) */}
      {dailyBalances.length > 0 && (
        <div className="balance-breakdown">
          <h3>💡 Quick Insights</h3>
          <div className="insights">
            <p>
              <strong>Period:</strong> {formatDate(dailyBalances[dailyBalances.length - 1]?.date)} to {formatDate(dailyBalances[0]?.date)}
            </p>
            <p>
              <strong>Net Change:</strong> 
              <span className={getAmountClass(dailyBalances[0]?.totalBalance - dailyBalances[dailyBalances.length - 1]?.totalBalance)}>
                {formatCurrency((dailyBalances[0]?.totalBalance || 0) - (dailyBalances[dailyBalances.length - 1]?.totalBalance || 0))}
              </span>
            </p>
            <p>
              <strong>Most Active Category:</strong> 
              {(() => {
                const categoryTotals = ['Bank', 'Cash', 'Office', 'Salary', 'Kitchen', 'Advance'].map(cat => ({
                  name: cat,
                  total: dailyBalances.reduce((sum, day) => sum + Math.abs(day[cat].credit) + Math.abs(day[cat].debit), 0)
                }));
                const mostActive = categoryTotals.reduce((max, cat) => cat.total > max.total ? cat : max, categoryTotals[0]);
                return mostActive.name;
              })()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyBalanceSummary;
