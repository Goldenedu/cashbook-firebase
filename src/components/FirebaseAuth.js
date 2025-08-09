import React, { useState, useEffect } from 'react';
import { authService } from '../firebase-services.js';
import './FirebaseAuth.css';

const FirebaseAuth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('goldeneduprivateschool@gmail.com');
  const [password, setPassword] = useState('Admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user);
      if (user && onAuthSuccess) {
        onAuthSuccess(user);
      }
    });

    return () => unsubscribe();
  }, [onAuthSuccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        // First try to sign in
        result = await authService.signIn(email, password);
        
        // If user doesn't exist and it's the admin account, create it automatically
        if (!result.success && 
            (result.error.includes('user-not-found') || result.error.includes('invalid-credential')) &&
            email === 'goldeneduprivateschool@gmail.com') {
          console.log('Admin account not found, creating it...');
          setError('Creating admin account...');
          result = await authService.signUp(email, password);
          if (result.success) {
            setError('');
            console.log('Admin account created successfully!');
          }
        }
      } else {
        result = await authService.signUp(email, password);
      }

      if (result.success) {
        if (onAuthSuccess) {
          onAuthSuccess(result.user);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };



  const handleSignOut = async () => {
    setLoading(true);
    const result = await authService.signOut();
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  if (user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Welcome, {user.email}!</h2>
            <p>You are successfully signed in to CashBook</p>
          </div>
          <button 
            onClick={handleSignOut}
            disabled={loading}
            className="auth-button logout-button"
          >
            {loading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isLogin ? 'Sign In' : 'Sign Up'} to CashBook</h2>
          <p>Access your financial data securely with Firebase</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="form-input"
              minLength="6"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="auth-button"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>



        <div className="auth-switch">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="switch-button"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FirebaseAuth;
