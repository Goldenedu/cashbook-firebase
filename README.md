# CashBook Firebase Integration

A comprehensive CashBook application with Firebase integration for Mac, Windows, and mobile platforms.

## Features

- 🔥 **Firebase Integration**: Real-time data synchronization with Firebase Firestore
- 🔐 **Authentication**: Secure user authentication with Firebase Auth
- 💻 **Cross-Platform**: Works on Mac, Windows, and mobile devices
- 📊 **Comprehensive Tracking**: Income, expenses, bank transactions, and customer management
- 🔄 **Real-time Sync**: Automatic data synchronization across devices
- 📱 **Responsive Design**: Mobile-friendly interface
- 🖥️ **Desktop App**: Electron-based desktop application

## Project Structure

```
CashBook/
├── src/
│   ├── components/
│   │   ├── FirebaseAuth.js         # Authentication component
│   │   ├── FirebaseAuth.css        # Auth styles
│   │   └── [existing components]   # Your existing components
│   ├── Dashboard.js                # Your existing dashboard (unchanged)
│   ├── DataContext.js              # Your existing data context (unchanged)
│   ├── FirebaseApp.js              # Firebase-integrated app wrapper
│   ├── FirebaseApp.css             # Firebase app styles
│   └── FirebaseDataContext.js      # Firebase data management
├── public/
│   └── electron.js                 # Electron main process
├── firebase-config.js              # Firebase configuration
├── firebase-services.js            # Firebase service functions
├── package.json                    # Dependencies and scripts
└── README.md                       # This file
```

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Install Additional Dependencies**
   ```bash
   npm install electron-is-dev
   ```

## Firebase Setup

Your Firebase configuration is already set up in `firebase-config.js` with your provided credentials:

- Project ID: `cashbook-32125`
- Auth Domain: `cashbook-32125.firebaseapp.com`
- Storage Bucket: `cashbook-32125.firebasestorage.app`

## Running the Application

### Web Version
```bash
npm start
```
Opens the app in your browser at `http://localhost:3000`

### Desktop Version (Electron)
```bash
# Development mode
npm run electron-dev

# Or run separately
npm start
# In another terminal:
npm run electron
```

### Building for Production

#### Web Build
```bash
npm run build
```

#### Desktop Build
```bash
# Build for current platform
npm run dist

# Build for all platforms
npm run build-electron
```

## Usage

1. **Authentication**: Sign up or sign in with your email and password
2. **Data Sync**: Your existing local data can be synced to Firebase using the sync panel
3. **Real-time Updates**: Changes are automatically synchronized across all your devices
4. **Offline Support**: The app works offline and syncs when connection is restored

## Firebase Services

The app includes comprehensive Firebase services:

- **Authentication**: Sign up, sign in, sign out
- **Firestore Database**: Real-time data storage and synchronization
- **Collections**:
  - `income_entries`: Income and invoice data
  - `expense_entries`: Office, salary, and kitchen expenses
  - `bank_entries`: Bank transaction records
  - `cash_entries`: Cash transaction records
  - `customers`: Customer information

## Integration with Existing Code

This Firebase integration is designed to work alongside your existing CashBook code without modifying it:

- Your existing `Dashboard.js` remains unchanged
- Your existing `DataContext.js` continues to work
- Firebase integration is added as a separate layer
- Data can be synced between local storage and Firebase

## Cross-Platform Compatibility

- **Mac**: Native macOS app with proper menu integration
- **Windows**: Windows executable with NSIS installer
- **Mobile**: Responsive web interface that works on mobile browsers
- **Linux**: AppImage support for Linux distributions

## Development

### File Structure
- Keep your existing components unchanged
- Firebase integration files are separate
- Styles are modular and don't conflict with existing CSS

### Adding New Features
1. Add Firebase service functions in `firebase-services.js`
2. Update `FirebaseDataContext.js` for state management
3. Create new components in `src/components/`

## Security

- Firebase security rules should be configured in the Firebase console
- User data is isolated by user ID
- Authentication is required for all data operations

## Deployment

### Web Deployment
Deploy the `build` folder to any static hosting service (Netlify, Vercel, etc.)

### Desktop Distribution
Use the built executables from the `dist` folder

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify Firebase configuration
3. Ensure internet connection for Firebase features

## License

MIT License - feel free to modify and distribute as needed.
