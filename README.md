# Combined CashBook Application

A comprehensive financial management application that integrates multiple accounting modules into a single, unified interface.

## Features

### Integrated Modules
- **Bank Book**: Manage bank account transactions
- **Cash Book**: Track cash transactions
- **Income Book**: Record income entries
- **Office Expense Book**: Track office-related expenses
- **Kitchen Expense Book**: Manage kitchen and food-related expenses
- **Customer List**: Maintain customer information
- **Reporting & Analytics**: Generate comprehensive reports

### Key Capabilities
- ✅ Add, edit, and delete entries across all modules
- ✅ Excel import/export functionality
- ✅ Real-time calculations and summaries
- ✅ Responsive design for desktop and mobile
- ✅ Firebase integration ready
- ✅ Modern React-based architecture

## Installation

1. Clone or download the project
2. Navigate to the project directory:
   ```bash
   cd CombinedCashBook
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Development

Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## Building for Production

Create a production build:
```bash
npm run build
```

## Firebase Deployment

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase (if not already done):
   ```bash
   firebase init hosting
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Deploy to Firebase Hosting:
   ```bash
   firebase deploy
   ```

## Project Structure

```
CombinedCashBook/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── BankApp.js
│   │   ├── CashApp.js
│   │   ├── CustomerApp.js
│   │   ├── IncomeApp.js
│   │   ├── OfficeApp.js
│   │   ├── KitchenApp.js
│   │   └── ReportingApp.js
│   ├── App.js
│   ├── App.css
│   ├── firebase-config.js
│   ├── index.js
│   └── index.css
├── firebase.json
├── package.json
└── README.md
```

## Original Files

The original application files are preserved in their original form:
- `BankApp.js`
- `CashApp.js` 
- `CustomerApp.js`
- `IncomeApp.js`
- `OfficeApp.js`
- `KitchenApp.js`
- `ReportingApp.js`
- `dashboard.html`

These have been converted to React components and integrated into the main application without modifying the original source logic.

## Firebase Configuration

The Firebase configuration is stored in `src/firebase-config.js` and can be imported wherever Firebase services are needed. The configuration includes:

- Authentication
- Firestore Database
- Analytics
- Hosting

## Technologies Used

- React 18
- Firebase 10
- XLSX (for Excel functionality)
- Modern CSS with responsive design

## Usage

1. **Navigation**: Use the sidebar to switch between different modules
2. **Data Entry**: Fill out forms to add new entries
3. **Excel Operations**: Import existing data or export current data
4. **Reporting**: View summaries and generate comprehensive reports
5. **Responsive Design**: Works on desktop, tablet, and mobile devices

## Support

For issues or questions, please refer to the original module documentation or contact the development team.
