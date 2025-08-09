import React, { useState } from 'react';
import { universalCSVImport, generateSampleCSV } from '../utils/csvImportFix';

const CSVImportTest = ({ onClose }) => {
  const [selectedBookType, setSelectedBookType] = useState('bank');
  const [importResult, setImportResult] = useState('');
  const [loading, setLoading] = useState(false);

  const bookTypes = [
    { value: 'bank', label: '🏦 Bank Book' },
    { value: 'cash', label: '💰 Cash Book' },
    { value: 'income', label: '📊 Income Book' },
    { value: 'office', label: '🏢 Office Expenses' },
    { value: 'salary', label: '💼 Salary Expenses' },
    { value: 'kitchen', label: '🍽️ Kitchen Expenses' }
  ];

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setImportResult('Processing CSV file...');

    universalCSVImport(
      file,
      selectedBookType,
      // Success callback
      (result) => {
        setLoading(false);
        let resultText = `✅ ${result.message}\n\n`;
        resultText += `📊 Import Statistics:\n`;
        resultText += `• Total rows processed: ${result.totalRows}\n`;
        resultText += `• Successful imports: ${result.successfulRows}\n`;
        resultText += `• Skipped rows: ${result.skippedRows}\n\n`;
        
        if (result.data.length > 0) {
          resultText += `📝 Sample imported data:\n`;
          const sample = result.data[0];
          Object.keys(sample).forEach(key => {
            if (key !== 'id' && key !== 'importedAt') {
              resultText += `• ${key}: "${sample[key]}"\n`;
            }
          });
        }
        
        setImportResult(resultText);
      },
      // Error callback
      (error) => {
        setLoading(false);
        setImportResult(`❌ Import Failed:\n\n${error}\n\n💡 Tips:\n• Make sure file has .csv extension\n• First row should contain column headers\n• Check for proper CSV formatting\n• Try the sample CSV first`);
      }
    );

    // Reset file input
    event.target.value = '';
  };

  const downloadSample = () => {
    const sampleContent = generateSampleCSV(selectedBookType);
    const blob = new Blob([sampleContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${selectedBookType}_book.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setImportResult(`📥 Sample CSV downloaded for ${selectedBookType} book!\n\nUse this file as a template for your data format.`);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        width: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>🔧 CSV Import Tester</h2>
          <button 
            onClick={onClose}
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#34495e' }}>
            Select Book Type:
          </label>
          <select 
            value={selectedBookType}
            onChange={(e) => setSelectedBookType(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #bdc3c7',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          >
            {bookTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#34495e' }}>
            Select CSV File:
          </label>
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileImport}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              border: '2px dashed #3498db',
              borderRadius: '6px',
              cursor: 'pointer',
              background: loading ? '#f8f9fa' : 'white'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={downloadSample}
            style={{
              flex: 1,
              padding: '12px',
              background: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            📥 Download Sample CSV
          </button>
          <button 
            onClick={() => setImportResult('')}
            style={{
              flex: 1,
              padding: '12px',
              background: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🗑️ Clear Results
          </button>
        </div>

        {importResult && (
          <div style={{
            background: '#f8f9fa',
            border: '1px solid #e1e8ed',
            borderRadius: '6px',
            padding: '15px',
            fontSize: '14px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            {importResult}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <small style={{ color: '#7f8c8d' }}>
            This tester uses the new universal CSV import system that fixes all book import issues
          </small>
        </div>
      </div>
    </div>
  );
};

export default CSVImportTest;
