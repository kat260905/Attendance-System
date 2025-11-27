import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in on app start
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      // In a real app, you'd check for stored token and validate it
      // For now, we'll simulate checking auth status
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setError('Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Attempting login with:', credentials); // Debug log
      
      const response = await authAPI.login(credentials);
      console.log('Login response:', response); // Debug log
      
      const userData = response.data.user;
      console.log('User data:', userData); // Debug log
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setLoading(false); // Ensure loading is set to false after successful login
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error); // Debug log
      console.error('Error response:', error.response); // Debug log
      const errorMessage = error.response?.data?.error || 'Login failed';
      setError(errorMessage);
      setLoading(false); // Ensure loading is set to false on error
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.register(userData);
      const newUser = response.data.user;
      
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      return { success: true, user: newUser };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setError(null);
  };

  const isAuthenticated = () => {
    return user !== null;
  };

  const isFaculty = () => {
<<<<<<< HEAD
    return user?.role === 'FACULTY';
  };

  const isAdmin = () => {
    return user?.role === 'ADMIN';
=======
    return user?.role === 'faculty';
  };

  const isAdmin = () => {
    return user?.role === 'admin';
>>>>>>> 2dc142d37b65257d66a1c8deb937623108ff4c2c
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated,
    isFaculty,
    isAdmin,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


