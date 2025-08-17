import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../DataContext';

// Stat Card Component
const StatCard = ({ title, value, change, icon, color, isCurrency = true }) => (
  <div className="stat-card" style={{ '--accent-color': color }}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <span className="stat-title">{title}</span>
      <div className="stat-value">
        {isCurrency ? `$${value.toLocaleString()}` : value}
      </div>
      {change && (
        <div className={`stat-change ${change >= 0 ? 'positive' : 'negative'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last period
        </div>
      )}
    </div>
  </div>
);

// Progress Bar Component
const ProgressBar = ({ value, max, color }) => (
  <div className="progress-bar">
    <div 
      className="progress-fill" 
      style={{
        width: `${(value / max) * 100}%`,
        backgroundColor: color
      }}
    />
  </div>
);

// Recent Transactions Component
const RecentTransactions = ({ transactions }) => (
  <div className="recent-transactions">
    <h3>Recent Transactions</h3>
    <div className="transactions-list">
      {transactions.map((txn, index) => (
        <div key={index} className="transaction-item">
          <div className="transaction-icon">
            {txn.type === 'income' ? '⬆️' : '⬇️'}
          </div>
          <div className="transaction-details">
            <div className="transaction-title">{txn.title}</div>
            <div className="transaction-meta">
              <span className="transaction-category">{txn.category}</span>
              <span className="transaction-date">{txn.date}</span>
            </div>
          </div>
          <div className={`transaction-amount ${txn.type}`}>
            {txn.type === 'income' ? '+' : '-'}${txn.amount}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Main Dashboard Component
const Dashboard = ({ setActiveApp }) => {
  const { incomeEntries, officeEntries, salaryEntries, kitchenEntries, bankEntries, cashEntries } = useData();
  const [isLoading, setIsLoading] = useState(true);

  // FY helper (Apr–Mar)
  const fyOf = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const s = m >= 4 ? y : y - 1;
    const e = s + 1;
    return `FY ${String(s).slice(-2)}-${String(e).slice(-2)}`;
  };

  const currentFY = fyOf(new Date().toISOString().split('T')[0]);
  // Build FY options: current FY, previous 2 FYs, next 2 FYs (Apr–Mar)
  const fyOptions = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startYear = month >= 4 ? year : year - 1; // FY start year
    const fmt = (y) => `FY ${String(y).slice(-2)}-${String(y + 1).slice(-2)}`;
    const arr = [];
    for (let k = 2; k >= -2; k--) { // next 2 down to old 2 for descending order
      arr.push(fmt(startYear + k));
    }
    return arr;
  }, []);
  const [selectedFY, setSelectedFY] = useState(currentFY);

  // Filters by FY
  const inFY = (e) => (e.fy || fyOf(e.date || e.entryDate)) === selectedFY;
  const incomeFY = useMemo(() => incomeEntries.filter(inFY), [incomeEntries, selectedFY]);
  const officeFY = useMemo(() => officeEntries.filter(inFY), [officeEntries, selectedFY]);
  const salaryFY = useMemo(() => salaryEntries.filter(inFY), [salaryEntries, selectedFY]);
  const kitchenFY = useMemo(() => kitchenEntries.filter(inFY), [kitchenEntries, selectedFY]);
  const bankFY = useMemo(() => bankEntries.filter(inFY), [bankEntries, selectedFY]);
  const cashFY = useMemo(() => cashEntries.filter(inFY), [cashEntries, selectedFY]);

  const toAmt = (x) => parseFloat(x?.amount ?? x?.debit ?? 0) || 0;

  // Income by A/C Head
  const incBoarder = incomeFY.filter(e => (e.acHead || '').toLowerCase() === 'boarder').reduce((s, e) => s + toAmt(e), 0);
  const incSemi = incomeFY.filter(e => (e.acHead || '').toLowerCase() === 'semi boarder').reduce((s, e) => s + toAmt(e), 0);
  const incDay = incomeFY.filter(e => (e.acHead || '').toLowerCase() === 'day').reduce((s, e) => s + toAmt(e), 0);
  const totalIncome = incBoarder + incSemi + incDay;

  // Expenses
  const expOffice = officeFY.reduce((s, e) => s + toAmt(e), 0);
  const expSalary = salaryFY.reduce((s, e) => s + toAmt(e), 0);
  const expKitchen = kitchenFY.reduce((s, e) => s + toAmt(e), 0);
  const totalExpenses = expOffice + expSalary + expKitchen;

  // Balances
  const bankTotal = bankFY.reduce((s, e) => s + toAmt(e), 0);
  const cashCash = cashFY.filter(e => (e.method || '').toLowerCase() === 'cash').reduce((s, e) => s + toAmt(e), 0);
  const cashKpay = cashFY.filter(e => (e.method || '').toLowerCase() === 'kpay').reduce((s, e) => s + toAmt(e), 0);
  const totalBalance = bankTotal + cashCash + cashKpay;

  const netIncome = totalIncome - totalExpenses;
  const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

  // Student List (Column 2) — depends on FY via incomeFY
  const grades = useMemo(() => [
    'Pre','KG',
    'G_1','G_2','G_3','G_4','G_5','G_6','G_7','G_8','G_9','G_10','G_11','G_12'
  ], []);

  const extractGrade = (e) => {
    const raw = String(e?.acName || e?.acHead || e?.class || e?.grade || '').trim().toUpperCase();
    if (!raw) return '';
    if (raw.startsWith('PRE')) return 'Pre';
    if (raw === 'KG' || raw.startsWith('K G') || raw.startsWith('K-G')) return 'KG';
    const m = raw.match(/G[_\-\s]?(\d{1,2})/);
    if (m) return `G_${parseInt(m[1], 10)}`;
    return '';
  };

  const extractGender = (e) => {
    const g = String(e?.gender || e?.Gender || e?.idGender || '').toLowerCase();
    if (g.startsWith('m')) return 'male';
    if (g.startsWith('f')) return 'female';
    const disp = String(e?.displayName || e?.name || '').toUpperCase();
    if (/-M-/.test(disp)) return 'male';
    if (/-F-/.test(disp)) return 'female';
    return '';
  };

  const studentCounts = useMemo(() => {
    const map = {};
    grades.forEach(g => { map[g] = { male: 0, female: 0 }; });
    incomeFY.forEach(e => {
      const gr = extractGrade(e);
      const sex = extractGender(e);
      if (!gr || !grades.includes(gr)) return;
      if (sex === 'male') map[gr].male += 1;
      if (sex === 'female') map[gr].female += 1;
    });
    return map;
  }, [incomeFY, grades]);

  const studentTotals = useMemo(() => {
    let male = 0, female = 0;
    grades.forEach(g => { male += studentCounts[g]?.male || 0; female += studentCounts[g]?.female || 0; });
    return { male, female, total: male + female };
  }, [studentCounts, grades]);

  useEffect(() => {
    setIsLoading(false);
  }, [selectedFY, incomeEntries, officeEntries, salaryEntries, kitchenEntries, bankEntries, cashEntries]);

  // Removed legacy mock-dashboard effect using setDashboardData
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  const card = {
    background: '#fff',
    border: '1px solid #e6eaf2',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 10px 28px rgba(17, 24, 39, 0.06)'
  };

  const row = { display: 'flex', gap: 20 };
  const col = (w) => ({ flex: `0 0 ${w}`, maxWidth: w });
  const line = { display: 'flex', justifyContent: 'space-between', margin: '6px 0', fontWeight: 'bold' };
  const small = { fontSize: 12, color: '#5b6370', fontWeight: 'bold' };

  // Section-specific styles
  const incomeCard = {
    ...card,
    background: 'linear-gradient(180deg, #e8fbf0 0%, #ffffff 60%)',
    borderColor: '#a5e4b7'
  };
  const balanceCard = {
    ...card,
    background: 'linear-gradient(180deg, #eaf3ff 0%, #ffffff 60%)',
    borderColor: '#a9cffc'
  };
  const expenseCard = {
    ...card,
    background: 'linear-gradient(180deg, #fff5ea 0%, #ffffff 60%)',
    borderColor: '#ffcf99'
  };
  const netCard = {
    ...card,
    background: 'linear-gradient(180deg, #f2efff 0%, #ffffff 60%)',
    borderColor: '#d1c7ff'
  };
  const sectionTitle = (color) => ({
    fontWeight: 'bold',
    color,
    padding: '4px 10px',
    borderRadius: 8,
    background: `${color}1A` // ~10% tint using hex alpha
  });

  // Reusable button-box style for balances
  const balancePill = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 10,
    fontWeight: 'bold',
    fontSize: 16,
    border: '2px solid transparent',
    background: '#ffffff'
  };

  return (
    <div className="dashboard" style={{
      background: 'radial-gradient(1200px 600px at -10% -10%, #f9fbff 0%, #f3f6fb 35%, #ffffff 100%)',
      padding: 10,
      borderRadius: 12
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={small}>FY Filter (auto)</span>
          <select value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)} style={{ height: 32, border: '2px solid #3498db', borderRadius: 6, background: '#eaf4fe', fontWeight: 'bold' }}>
            {fyOptions.map(fy => (<option key={fy} value={fy}>{fy}</option>))}
          </select>
        </div>
      </div>

      {/* Top Balances Bar */}
      <div style={{ ...balanceCard, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8 }}>
          <span style={small}>FY: {selectedFY}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(200px, 1fr))', gap: 12, justifyItems: 'stretch', alignItems: 'stretch' }}>
          <div style={{ ...balancePill, color: '#0b63b6', borderColor: '#0b63b6', background: '#f2f8ff', justifyContent: 'space-between', width: '100%' }}>
            <span>Bank Balances</span>
            <span style={{ fontSize: 20 }}>{bankTotal.toLocaleString()}</span>
          </div>
          <div style={{ ...balancePill, color: '#2e7d32', borderColor: '#2e7d32', background: '#edf9f1', justifyContent: 'space-between', width: '100%' }}>
            <span>Cash Balances</span>
            <span style={{ fontSize: 20 }}>{cashCash.toLocaleString()}</span>
          </div>
          <div style={{ ...balancePill, color: '#6b21a8', borderColor: '#6b21a8', background: '#f7f0ff', justifyContent: 'space-between', width: '100%' }}>
            <span>Kpay Balances</span>
            <span style={{ fontSize: 20 }}>{cashKpay.toLocaleString()}</span>
          </div>
          <div style={{ ...balancePill, color: '#111827', borderColor: '#374151', background: '#f9fafb', justifyContent: 'space-between', width: '100%' }}>
            <span>Total Balances</span>
            <span style={{ fontSize: 20 }}>{totalBalance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main two-column layout */}
      <div style={{ ...row }}>
        {/* Left Column: Income, Expense, Net */}
        <div style={{ ...col('58%'), display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ ...incomeCard }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
              <div style={sectionTitle('#2e7d32')}>INCOME SECTION</div>
              <span style={small}>FY: {selectedFY}</span>
            </div>
            <div style={{ ...line, fontSize: 16 }}><span>1. Boarder</span><span style={{ display:'flex', gap:8, alignItems:'center' }}><span style={{ fontSize: 18 }}>{incBoarder.toLocaleString()} <span style={small}>MMK</span></span><span style={small}>{pct(incBoarder, totalIncome)}%</span></span></div>
            <div style={{ ...line, fontSize: 16 }}><span>2. Semi Boarder</span><span style={{ display:'flex', gap:8, alignItems:'center' }}><span style={{ fontSize: 18 }}>{incSemi.toLocaleString()} <span style={small}>MMK</span></span><span style={small}>{pct(incSemi, totalIncome)}%</span></span></div>
            <div style={{ ...line, fontSize: 16 }}><span>3. Day</span><span style={{ display:'flex', gap:8, alignItems:'center' }}><span style={{ fontSize: 18 }}>{incDay.toLocaleString()} <span style={small}>MMK</span></span><span style={small}>{pct(incDay, totalIncome)}%</span></span></div>
            <hr/>
            <div style={{ ...line, fontSize: 18 }}>
              <span>Total</span>
              <span style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: 20 }}>{totalIncome.toLocaleString()} <span style={small}>MMK</span></span>
                <span style={small}>100%</span>
              </span>
            </div>
          </div>

          <div style={{ ...expenseCard }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
              <div style={sectionTitle('#c05621')}>EXPENSE SECTION</div>
              <span style={small}>FY: {selectedFY}</span>
            </div>
            <div style={line}><span>1. Office Expense</span><span style={{ display:'flex', gap:8, alignItems:'center' }}><span>{expOffice.toLocaleString()}</span><span style={small}>{pct(expOffice, totalExpenses)}%</span></span></div>
            <div style={line}><span>2. Salary Expense</span><span style={{ display:'flex', gap:8, alignItems:'center' }}><span>{expSalary.toLocaleString()}</span><span style={small}>{pct(expSalary, totalExpenses)}%</span></span></div>
            <div style={line}><span>3. Kitchen Expense</span><span style={{ display:'flex', gap:8, alignItems:'center' }}><span>{expKitchen.toLocaleString()}</span><span style={small}>{pct(expKitchen, totalExpenses)}%</span></span></div>
            <hr/>
            <div style={{ ...line, fontSize: 14 }}>
              <span>Total</span>
              <span style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontWeight: 'bold' }}>{totalExpenses.toLocaleString()}</span>
                <span style={small}>{pct(totalExpenses, totalIncome + totalExpenses)}%</span>
              </span>
            </div>
          </div>

          <div style={{ ...netCard }}>
            <div style={{ ...line, fontSize: 16 }}>
              <span>Net Income</span>
              <span style={{ fontWeight: 'bold' }}>{netIncome.toLocaleString()} <span style={small}>({pct(netIncome, totalIncome)}%)</span></span>
            </div>
          </div>
        </div>

        {/* Right Column: Student List (FY based) */}
        <div style={{ ...col('40%'), display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ ...card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
              <div style={sectionTitle('#374151')}>STUDENT LIST (FY)</div>
              <span style={{ ...small }}>FY: {selectedFY}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#eaf4fe' }}>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Students</th>
                    <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Male</th>
                    <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Female</th>
                    <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g) => {
                    const row = studentCounts[g] || { male: 0, female: 0 };
                    const total = row.male + row.female;
                    const label = g === 'Pre' ? 'Pre_Students' : g === 'KG' ? 'KG_Students' : `${g} Students`;
                    return (
                      <tr key={g}>
                        <td style={{ padding: '6px 8px', borderBottom: '1px dashed #eee' }}>{label}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px dashed #eee' }}>{row.male}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px dashed #eee' }}>{row.female}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px dashed #eee', fontWeight: 'bold' }}>{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>Total</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#0b63b6' }}>{studentTotals.male}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#c05621' }}>{studentTotals.female}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{studentTotals.total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
// Helper function to get category colors
function getCategoryColor(category) {
  const colors = {
    tuition: '#4CAF50',
    registration: '#2196F3',
    services: '#FFC107',
    other: '#9E9E9E',
    salary: '#F44336',
    office: '#9C27B0',
    kitchen: '#FF9800'
  };
  return colors[category] || '#607D8B';
}

export default Dashboard;
