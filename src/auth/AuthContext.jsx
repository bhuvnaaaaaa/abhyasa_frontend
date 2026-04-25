import { createContext, useContext, useState } from 'react';
import auth from '../utils/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Initialize auth state from localStorage
  const getInitialAuth = () => {
    const token = auth.getToken();
    if (token && auth.isActiveWithinHours(48)) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return { isAuthenticated: true, user: payload };
      } catch (err) {
        auth.clearAuth();
        return { isAuthenticated: false, user: null };
      }
    } else {
      auth.clearAuth();
      return { isAuthenticated: false, user: null };
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState(() => getInitialAuth().isAuthenticated);
  const [user, setUser] = useState(() => getInitialAuth().user);

  const login = (token) => {
    auth.setToken(token);
    setIsAuthenticated(true);
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser(payload);
    } catch (err) {
      console.error('Error decoding token:', err);
    }
  };

  const logout = () => {
    auth.clearAuth();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
