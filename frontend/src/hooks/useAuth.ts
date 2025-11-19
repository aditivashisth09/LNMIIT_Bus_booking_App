import { useState } from 'react';

interface AuthData {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'admin' | 'conductor'; // UPDATED
  token: string;
}

// This helper function runs synchronously to get the initial state
const getInitialAuth = (): AuthData | null => {
  const storedAuth = localStorage.getItem('lnmBusAuth');
  if (storedAuth) {
    try {
      // Try to parse the stored data
      return JSON.parse(storedAuth) as AuthData;
    } catch (e) {
      console.error('Failed to parse auth data from localStorage', e);
      // Clear corrupted data
      localStorage.removeItem('lnmBusAuth');
      return null;
    }
  }
  return null;
};

export const useAuth = () => {
  // THE FIX: Initialize state by calling getInitialAuth directly
  // This ensures 'auth' is populated on the very first render.
  const [auth, setAuth] = useState<AuthData | null>(() => getInitialAuth());

  // The old useEffect that set state from localStorage is no longer needed
  // and should be removed.

  const saveAuth = (data: AuthData) => {
    try {
      localStorage.setItem('lnmBusAuth', JSON.stringify(data));
      setAuth(data);
    } catch (e) {
      console.error('Failed to save auth data to localStorage', e);
    }
  };

  const clearAuth = () => {
    localStorage.removeItem('lnmBusAuth');
    setAuth(null);
  };

  return {
    auth,
    saveAuth,
    clearAuth,
    token: auth?.token,
    role: auth?.role,
    isAuthenticated: !!auth, // This will now be correct on the first render
  };
};