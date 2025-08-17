import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase-config';
import './App.css';
import { DataProvider } from './DataContext';

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
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import RulesApp from './components/RulesApp';

// Icons for the sidebar
const NavIcon = ({ children }) => (
  <span className="nav-icon">
    {children}
  </span>
);

// Navigation item component
const NavItem = ({ icon, label, isActive, onClick }) => (
  <li className={`nav-item ${isActive ? 'active' : ''}`} onClick={onClick}>
    <NavIcon>{icon}</NavIcon>
    <span className="nav-label">{label}</span>
  </li>
);

// Navigation group component
const NavGroup = ({ title, children }) => (
  <div className="nav-group">
    <div className="nav-group-title">{title}</div>
    <ul className="nav-group-items">
      {children}
    </ul>
  </div>
);



// Protected Route component using Firebase auth state
const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Wrapper component to handle routing and app state
function AppWrapper({ subApps }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeApp, setActiveApp] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Check if user is logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Update active app based on route
  useEffect(() => {
    const path = location.pathname.substring(1) || 'dashboard';
    setActiveApp(path);
  }, [location]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavClick = (appId) => {
    setActiveApp(appId);
    navigate(`/${appId}`);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Use the subApps prop passed from the parent component

  // Find the current app component based on activeApp
  const CurrentApp = () => {
    const app = subApps.find(app => app.id === activeApp);
    return app ? app.component : <Dashboard />;
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={`app ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <h2 className="sidebar-title">Goalden EDU</h2>
            <span className="sidebar-cashbook">CashBook</span>
          </div>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {isSidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <NavGroup title="MAIN">
            {subApps.map((app) => (
              <NavItem
                key={app.id}
                icon={app.icon}
                label={app.name}
                isActive={activeApp === app.id}
                onClick={() => handleNavClick(app.id)}
              />
            ))}
          </NavGroup>
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-profile" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={handleLogout}
              className="logout-button"
              style={{
                background: '#ef4444',
                color: '#ffffff',
                fontWeight: 'bold',
                border: '2px solid #b91c1c',
                borderRadius: 8,
                padding: '10px 14px',
                width: '100%'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">

        
        <div className="content-container">
          <CurrentApp />
        </div>

      </div>
    </div>
  );
}

// Sub-applications definition
const subApps = [
  { id: 'dashboard', name: 'Dashboard', icon: '📊', component: <Dashboard /> },
  { id: 'bank', name: 'Bank', icon: '🏦', component: <BankApp /> },
  { id: 'cash', name: 'Cash', icon: '💵', component: <CashApp /> },
  { id: 'customer', name: 'Customer', icon: '👥', component: <CustomerApp /> },
  { id: 'income', name: 'Income', icon: '💰', component: <IncomeApp /> },
  { id: 'office', name: 'Office', icon: '🏢', component: <OfficeApp /> },
  { id: 'kitchen', name: 'Kitchen', icon: '🍽️', component: <KitchenApp /> },
  { id: 'salary', name: 'Salary', icon: '💼', component: <SalaryApp /> },
  { id: 'reporting', name: 'Reporting', icon: '📈', component: <ReportingApp /> },
  { id: 'rules', name: 'Rules', icon: '📜', component: <RulesApp /> },
];


// Login Wrapper component for proper navigation
const LoginWrapper = () => {
  const navigate = useNavigate();
  
  const handleLogin = () => {
    console.log('Login successful, navigating to dashboard...');
    navigate('/dashboard', { replace: true });
  };
  
  return <Login onLogin={handleLogin} />;
};

// Main App component with routing
function App() {
  // Manual login flow; no auto admin creation
  return (
    <Router>
      <DataProvider>
        <Routes>
          <Route path="/login" element={<LoginWrapper />} />
          {subApps.map((app) => (
            <Route 
              key={app.id} 
              path={`/${app.id}/*`} 
              element={
                <ProtectedRoute>
                  <AppWrapper subApps={subApps} />
                </ProtectedRoute>
              } 
            />
          ))}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </DataProvider>
    </Router>
  );
}

export default App;
