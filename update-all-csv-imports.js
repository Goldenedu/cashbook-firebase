const fs = require('fs');
const path = require('path');

// Update all remaining components to use Excel-format CSV import
const componentsToUpdate = [
  'CashApp.js',
  'IncomeApp.js', 
  'OfficeApp.js',
  'SalaryApp.js',
  'KitchenApp.js',
  'CustomerApp.js'
];

const componentBookTypes = {
  'CashApp.js': 'cash',
  'IncomeApp.js': 'income',
  'OfficeApp.js': 'office', 
  'SalaryApp.js': 'salary',
  'KitchenApp.js': 'kitchen',
  'CustomerApp.js': 'customer'
};

const stateSetters = {
  'CashApp.js': 'setCashEntries',
  'IncomeApp.js': 'setIncomeEntries',
  'OfficeApp.js': 'setOfficeEntries',
  'SalaryApp.js': 'setSalaryEntries', 
  'KitchenApp.js': 'setKitchenEntries',
  'CustomerApp.js': 'setCustomers'
};

const componentsDir = path.join(__dirname, 'src', 'components');

componentsToUpdate.forEach(filename => {
  const filePath = path.join(componentsDir, filename);
  
  if (fs.existsSync(filePath)) {
    console.log(`Updating ${filename}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update import statement
    content = content.replace(
      /import { universalCSVImport } from '\.\.\/utils\/csvImportFix';/g,
      "import { excelFormatCSVImport } from '../utils/excelFormatCSVImport';"
    );
    
    // Update function call and parameters
    const bookType = componentBookTypes[filename];
    const stateSetter = stateSetters[filename];
    
    const newImportFunction = `
  const importFromCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    excelFormatCSVImport(
      file,
      '${bookType}',
      // Success callback
      (result) => {
        ${stateSetter}(prev => [...prev, ...result.data]);
        alert(\`✅ \${result.message}\\n\\nImported \${result.successfulRows} entries successfully!\\n\\nFormat: Excel export format (same columns and order)\`);
      },
      // Error callback
      (error) => {
        alert(\`❌ CSV Import Failed:\\n\\n\${error}\\n\\n💡 Solution:\\n• CSV must match Excel export format exactly\\n• Use the CSV Fix tool to download correct sample\`);
      }
    );

    // Reset file input
    e.target.value = '';
  };`;

    // Replace the existing importFromCSV function
    const functionRegex = /const importFromCSV = \(e\) => \{[\s\S]*?\n  \};/;
    
    if (functionRegex.test(content)) {
      content = content.replace(functionRegex, newImportFunction.trim());
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated ${filename}`);
    } else {
      console.log(`⚠️  Could not find importFromCSV function in ${filename}`);
    }
  }
});

console.log('🎉 All components updated to use Excel-format CSV import!');
