import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import FirebaseApp from './FirebaseApp';
import { DataProvider } from './DataContext'; // Your existing data context
import reportWebVitals from './reportWebVitals';

// Import Firebase App styles
import './FirebaseApp.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DataProvider>
      <FirebaseApp />
    </DataProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
