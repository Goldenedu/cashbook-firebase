import React, { useState } from 'react';
import { db, auth } from '../firebase-config';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const FirebaseTest = () => {
  const [testResult, setTestResult] = useState('');
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      console.log('Auth state changed:', currentUser ? currentUser.uid : 'No user');
    });
    return () => unsubscribe();
  }, []);

  const testFirebaseConnection = async () => {
    try {
      setTestResult('Testing Firebase connection...');
      
      if (!user) {
        setTestResult('❌ Error: No authenticated user found');
        return;
      }

      console.log('Testing with user:', user.uid);
      
      // Test 1: Try to add a document
      const testData = {
        userId: user.uid,
        testField: 'test value',
        timestamp: new Date(),
        id: Date.now()
      };

      console.log('Attempting to add document with data:', testData);
      
      const docRef = await addDoc(collection(db, 'test_collection'), testData);
      console.log('Document added successfully with ID:', docRef.id);
      
      // Test 2: Try to read the document back
      const q = query(collection(db, 'test_collection'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      console.log('Query executed, found', querySnapshot.size, 'documents');
      
      let foundDocs = [];
      querySnapshot.forEach((doc) => {
        foundDocs.push({ id: doc.id, ...doc.data() });
      });

      setTestResult(`✅ Firebase test successful!
      
User: ${user.uid}
Document added: ${docRef.id}
Documents found: ${foundDocs.length}
      
This means Firebase is working correctly. The issue might be elsewhere.`);

    } catch (error) {
      console.error('Firebase test error:', error);
      setTestResult(`❌ Firebase test failed:
      
Error: ${error.message}
Code: ${error.code}
      
This confirms the permission issue.`);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>🔧 Firebase Connection Test</h3>
      <p>User: {user ? user.email : 'Not authenticated'}</p>
      <button onClick={testFirebaseConnection} disabled={!user}>
        Test Firebase Connection
      </button>
      <pre style={{ 
        background: '#f5f5f5', 
        padding: '10px', 
        marginTop: '10px',
        whiteSpace: 'pre-wrap'
      }}>
        {testResult}
      </pre>
    </div>
  );
};

export default FirebaseTest;
