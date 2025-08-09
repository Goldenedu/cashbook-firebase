import React, { useState } from 'react';

const SimpleCSVTest = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setResult('Processing...');

    try {
      // Basic validation
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setResult('❌ Error: File must have .csv extension');
        setLoading(false);
        return;
      }

      // Read file
      const text = await file.text();
      
      // Basic parsing
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setResult('❌ Error: CSV must have at least 2 lines (header + data)');
        setLoading(false);
        return;
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Parse first data row as example
      const firstDataRow = lines[1].split(',').map(d => d.trim().replace(/"/g, ''));

      let resultText = '✅ CSV File Analysis:\n\n';
      resultText += `📁 File: ${file.name}\n`;
      resultText += `📏 Size: ${file.size} bytes\n`;
      resultText += `📊 Lines: ${lines.length}\n`;
      resultText += `📋 Columns: ${header.length}\n\n`;
      
      resultText += '📝 Headers:\n';
      header.forEach((h, i) => {
        resultText += `  ${i + 1}. "${h}"\n`;
      });
      
      resultText += '\n📄 First Data Row:\n';
      firstDataRow.forEach((d, i) => {
        resultText += `  ${header[i] || `Column ${i + 1}`}: "${d}"\n`;
      });

      resultText += '\n🎯 This CSV looks valid for import!';
      
      setResult(resultText);
      
    } catch (error) {
      setResult(`❌ Error reading file: ${error.message}`);
    }
    
    setLoading(false);
  };

  const createSampleCSV = () => {
    const sampleData = [
      'Date,Description,Amount,Category',
      '2024-01-01,Office supplies,150.00,Office',
      '2024-01-02,Salary payment,5000.00,Salary',
      '2024-01-03,Kitchen expenses,300.00,Kitchen'
    ].join('\n');

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_cashbook.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setResult('📥 Sample CSV downloaded! Use this as a template for your data.');
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'white',
      border: '2px solid #3498db',
      borderRadius: '12px',
      padding: '30px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
      zIndex: 1000,
      width: '500px',
      maxHeight: '80vh',
      overflow: 'auto'
    }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50', textAlign: 'center' }}>
        🔍 CSV Import Tester
      </h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#34495e' }}>
          Select your CSV file:
        </label>
        <input 
          type="file" 
          accept=".csv"
          onChange={handleFileUpload}
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '10px', 
            border: '2px dashed #bdc3c7', 
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        />
      </div>

      <button 
        onClick={createSampleCSV}
        style={{
          width: '100%',
          padding: '12px',
          background: '#27ae60',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        📥 Download Sample CSV
      </button>

      {result && (
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
          {result}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <small style={{ color: '#7f8c8d' }}>
          This tool helps you test CSV format before importing into CashBook
        </small>
      </div>
    </div>
  );
};

export default SimpleCSVTest;
