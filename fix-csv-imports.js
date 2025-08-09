const fs = require('fs');
const path = require('path');

// Component to book type mapping
const componentMapping = {
  'BankApp.js': 'bank',
  'CashApp.js': 'cash', 
  'IncomeApp.js': 'income',
  'OfficeApp.js': 'office',
  'SalaryApp.js': 'salary',
  'KitchenApp.js': 'kitchen',
  'CustomerApp.js': 'customer'
};

// Universal CSV import function template
const getUniversalImportFunction = (bookType, stateUpdater) => `
  const importFromCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    universalCSVImport(
      file,
      '${bookType}',
      // Success callback
      (result) => {
        ${stateUpdater}(prev => [...prev, ...result.data]);
        alert(\`✅ \${result.message}\\n\\nImported \${result.successfulRows} entries successfully!\`);
      },
      // Error callback
      (error) => {
        alert(\`❌ CSV Import Failed:\\n\\n\${error}\\n\\n💡 Tips:\\n• Check file format (.csv)\\n• Ensure proper headers\\n• Try the CSV Fix tool for testing\`);
      }
    );

    // Reset file input
    e.target.value = '';
  };`;

// State updater mapping
const stateUpdaters = {
  'BankApp.js': 'setBankEntries',
  'CashApp.js': 'setCashEntries',
  'IncomeApp.js': 'setIncomeEntries', 
  'OfficeApp.js': 'setOfficeEntries',
  'SalaryApp.js': 'setSalaryEntries',
  'KitchenApp.js': 'setKitchenEntries',
  'CustomerApp.js': 'setCustomers'
};

const componentsDir = path.join(__dirname, 'src', 'components');

Object.keys(componentMapping).forEach(filename => {
  const filePath = path.join(componentsDir, filename);
  
  if (fs.existsSync(filePath)) {
    console.log(`Fixing ${filename}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import if not present
    if (!content.includes("import { universalCSVImport }")) {
      const importLine = "import { universalCSVImport } from '../utils/csvImportFix';";
      
      // Find the last import line
      const lines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, importLine);
        content = lines.join('\n');
      }
    }
    
    // Replace the importFromCSV function
    const bookType = componentMapping[filename];
    const stateUpdater = stateUpdaters[filename];
    const newFunction = getUniversalImportFunction(bookType, stateUpdater);
    
    // Find and replace the old function
    const functionRegex = /const importFromCSV = \(e\) => \{[\s\S]*?\n  \};/;
    
    if (functionRegex.test(content)) {
      content = content.replace(functionRegex, newFunction.trim());
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed ${filename}`);
    } else {
      console.log(`⚠️  Could not find importFromCSV function in ${filename}`);
    }
  }
});

console.log('🎉 All CSV import functions have been updated!');
