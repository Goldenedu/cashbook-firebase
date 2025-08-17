import React, { useState } from 'react';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, app } from '../firebase-config';
import './Login.css';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Login form submitted');
    setLoading(true);
    setError('');

    try {
      // Ensure local persistence so session survives reloads but can be cleared
      await setPersistence(auth, browserLocalPersistence);
      const trimmedEmail = email.trim();
      const trimmedPassword = password;
      console.log('Attempting to sign in with:', trimmedEmail);
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      console.log('Login successful, user:', userCredential.user);
      
      // Immediately call onLogin after successful authentication
      setLoading(false);
      if (onLogin) {
        onLogin();
      }
      
    } catch (err) {
      const details = { code: err.code, message: err.message, email: email, timestamp: new Date().toISOString() };
      console.error('Login error details:', details);
      setDebugInfo(details);
      
      let errorMessage = 'Failed to log in. Please check your email and password.';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Ask admin to create it in Firebase Authentication.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid credentials. If this email was created with another sign-in method or the password changed, use Forgot Password below or ask admin to reset it.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.code === 'auth/invalid-api-key') {
        errorMessage = 'Invalid Firebase API key. Check firebase-config.js.';
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Welcome to Goalden EDU</h1>
          <p>Please sign in to continue</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {debugInfo && (
          <div className="error-message" style={{ marginTop: 8, opacity: 0.9 }}>
            <div><strong>Auth error code:</strong> {debugInfo.code}</div>
            <div><strong>Auth message:</strong> {debugInfo.message}</div>
          </div>
        )}
        <div style={{ margin: '10px 0', fontSize: 12, color: '#6b7280' }}>
          <div><strong>Project:</strong> {app?.options?.projectId || 'unknown'}</div>
          <div><strong>Auth Domain:</strong> {app?.options?.authDomain || 'unknown'}</div>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          
          
          
        </form>
        
        <div className="login-footer">
          <p>© {new Date().getFullYear()} Goalden EDU. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
