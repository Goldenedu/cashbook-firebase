import React, { useState } from 'react';

const CSVDebugHelper = () => {
  const [debugInfo, setDebugInfo] = useState('');
  const [csvContent, setCsvContent] = useState('');

  const analyzeCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setCsvContent(content);
      
      let analysis = `=== CSV FILE ANALYSIS ===\n\n`;
      analysis += `File name: ${file.name}\n`;
      analysis += `File size: ${file.size} bytes\n`;
      analysis += `File type: ${file.type}\n\n`;
      
      // Check file extension
      const hasCSVExtension = file.name.toLowerCase().endsWith('.csv');
      analysis += `✓ CSV Extension: ${hasCSVExtension ? 'YES' : 'NO'}\n`;
      
      // Check file size
      const sizeOK = file.size <= 10 * 1024 * 1024;
      analysis += `✓ Size OK (<10MB): ${sizeOK ? 'YES' : 'NO'}\n\n`;
      
      // Analyze content
      const lines = content.split(/\r?\n/);
      analysis += `Total lines: ${lines.length}\n`;
      analysis += `Non-empty lines: ${lines.filter(l => l.trim()).length}\n\n`;
      
      // Show first few lines
      analysis += `=== FIRST 5 LINES ===\n`;
      lines.slice(0, 5).forEach((line, i) => {
        analysis += `Line ${i + 1}: "${line}"\n`;
      });
      
      // Analyze header
      if (lines.length > 0) {
        const headerLine = lines[0];
        analysis += `\n=== HEADER ANALYSIS ===\n`;
        analysis += `Header line: "${headerLine}"\n`;
        
        // Try different parsing methods
        const simpleComma = headerLine.split(',');
        analysis += `Simple comma split (${simpleComma.length} columns): [${simpleComma.map(h => `"${h.trim()}"`).join(', ')}]\n`;
        
        // Check for quotes
        const hasQuotes = headerLine.includes('"');
        analysis += `Contains quotes: ${hasQuotes ? 'YES' : 'NO'}\n`;
        
        // Check for semicolons (European CSV format)
        const hasSemicolons = headerLine.includes(';');
        analysis += `Contains semicolons: ${hasSemicolons ? 'YES' : 'NO'}\n`;
        
        if (hasSemicolons) {
          const semicolonSplit = headerLine.split(';');
          analysis += `Semicolon split (${semicolonSplit.length} columns): [${semicolonSplit.map(h => `"${h.trim()}"`).join(', ')}]\n`;
        }
      }
      
      // Check for common issues
      analysis += `\n=== POTENTIAL ISSUES ===\n`;
      if (!hasCSVExtension) analysis += `❌ File doesn't have .csv extension\n`;
      if (!sizeOK) analysis += `❌ File is too large (>10MB)\n`;
      if (lines.length < 2) analysis += `❌ File has less than 2 lines (need header + data)\n`;
      if (lines[0] && !lines[0].includes(',') && !lines[0].includes(';')) {
        analysis += `❌ Header doesn't contain commas or semicolons\n`;
      }
      
      setDebugInfo(analysis);
    };
    
    reader.onerror = () => {
      setDebugInfo('❌ Error reading file');
    };
    
    reader.readAsText(file, 'UTF-8');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      analyzeCSV(file);
    }
  };

  const createSampleCSV = () => {
    const sampleContent = `Date,Description,Amount,Category
2024-01-01,Office supplies,150.00,Office
2024-01-02,Salary payment,5000.00,Salary
2024-01-03,"Equipment, computers",2500.00,Office`;
    
    const blob = new Blob([sampleContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_cashbook.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '20px', 
      right: '20px', 
      width: '400px', 
      background: 'white', 
      border: '2px solid #3498db', 
      borderRadius: '8px', 
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      maxHeight: '80vh',
      overflow: 'auto'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>🔍 CSV Debug Helper</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileSelect}
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>
      
      <button 
        onClick={createSampleCSV}
        style={{ 
          width: '100%', 
          padding: '10px', 
          background: '#27ae60', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          marginBottom: '15px',
          cursor: 'pointer'
        }}
      >
        📥 Download Sample CSV
      </button>
      
      {debugInfo && (
        <div style={{ 
          background: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          maxHeight: '300px',
          overflow: 'auto',
          border: '1px solid #e1e8ed'
        }}>
          {debugInfo}
        </div>
      )}
      
      {csvContent && (
        <div style={{ marginTop: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Raw CSV Content:</h4>
          <textarea 
            value={csvContent} 
            readOnly
            style={{ 
              width: '100%', 
              height: '150px', 
              fontSize: '11px', 
              fontFamily: 'monospace',
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '8px'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CSVDebugHelper;
