import React, { useState, useEffect } from 'react';
import FirebaseAuth from './components/FirebaseAuth';
import CSVDebugHelper from './components/CSVDebugHelper';
import { FirebaseDataProvider, useFirebaseData } from './FirebaseDataContext';
import { useData } from './DataContext'; // Your existing data context
import './App.css';

// Import your existing Dashboard component
import Dashboard from './Dashboard';

const FirebaseIntegratedApp = () => {
  const [user, setUser] = useState(null);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [showDebugHelper, setShowDebugHelper] = useState(false);

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
  };

  if (!user) {
    return <FirebaseAuth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <FirebaseDataProvider>
      <div className="firebase-app">
        {showDebugHelper && <CSVDebugHelper />}
        <SyncPanel show={showSyncPanel} onClose={() => setShowSyncPanel(false)} />
        <div className="app-header">
          <div className="header-left">
            <h1>CashBook with Firebase</h1>
            <span className="user-info">Welcome, {user.email}</span>
          </div>
          <div className="header-right">
            <SyncStatusIndicator />
            <button 
              className="sync-button"
              onClick={() => setShowSyncPanel(true)}
            >
              🔄 Sync
            </button>
            <button 
              className="sync-button"
              onClick={() => setShowDebugHelper(!showDebugHelper)}
              style={{ background: showDebugHelper ? '#e74c3c' : '#f39c12' }}
            >
              🔍 CSV Debug
            </button>
          </div>
        </div>
        
        {/* Your existing Dashboard component */}
        <Dashboard />
      </div>
    </FirebaseDataProvider>
  );
};

const SyncStatusIndicator = () => {
  const { syncStatus } = useFirebaseData();
  
  const getStatusColor = () => {
    switch (syncStatus) {
      case 'synced': return '#27ae60';
      case 'syncing': return '#f39c12';
      case 'error': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'synced': return 'Synced';
      case 'syncing': return 'Syncing...';
      case 'error': return 'Sync Error';
      default: return 'Not Connected';
    }
  };

  return (
    <div className="sync-status">
      <div 
        className="status-dot"
        style={{ backgroundColor: getStatusColor() }}
      ></div>
      <span className="status-text">{getStatusText()}</span>
    </div>
  );
};

const SyncPanel = ({ show, onClose }) => {
  const { syncLocalDataToFirebase, syncStatus } = useFirebaseData();
  const { 
    incomeEntries, 
    officeEntries, 
    salaryEntries, 
    kitchenEntries 
  } = useData(); // Your existing local data
  
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleSyncToFirebase = async () => {
    setSyncing(true);
    setSyncResult(null);
    
    const localData = {
      incomeEntries,
      officeEntries,
      salaryEntries,
      kitchenEntries
    };
    
    const result = await syncLocalDataToFirebase(localData);
    setSyncResult(result);
    setSyncing(false);
  };

  if (!show) return null;

  return (
    <div className="sync-panel-overlay">
      <div className="sync-panel">
        <div className="sync-panel-header">
          <h3>Sync with Firebase</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="sync-panel-content">
          <div className="sync-info">
            <p>Sync your local CashBook data with Firebase cloud storage.</p>
            <div className="data-summary">
              <div className="data-item">
                <span className="data-label">Income Entries:</span>
                <span className="data-count">{incomeEntries?.length || 0}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Office Expenses:</span>
                <span className="data-count">{officeEntries?.length || 0}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Salary Expenses:</span>
                <span className="data-count">{salaryEntries?.length || 0}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Kitchen Expenses:</span>
                <span className="data-count">{kitchenEntries?.length || 0}</span>
              </div>
            </div>
          </div>

          {syncResult && (
            <div className={`sync-result ${syncResult.success ? 'success' : 'error'}`}>
              {syncResult.success ? (
                <p>✅ Data successfully synced to Firebase!</p>
              ) : (
                <p>❌ Sync failed: {syncResult.error}</p>
              )}
            </div>
          )}

          <div className="sync-actions">
            <button 
              className="sync-action-button primary"
              onClick={handleSyncToFirebase}
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync to Firebase'}
            </button>
            <button 
              className="sync-action-button secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirebaseIntegratedApp;
