import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  
  console.log('ProtectedRoute - loading:', loading); // Debug log
  console.log('ProtectedRoute - user:', user); // Debug log
  console.log('ProtectedRoute - isAuthenticated():', isAuthenticated()); // Debug log
  
  // Force re-render when user state changes
  useEffect(() => {
    console.log('ProtectedRoute - User state changed:', user);
  }, [user]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated()) {
    return children;
  } else {
    return <Navigate to="/login" replace />;
  }
}

function AppRoutes() {
  const { user, isAuthenticated } = useAuth();
  
  console.log('AppRoutes - user:', user); // Debug log
  console.log('AppRoutes - isAuthenticated:', isAuthenticated()); // Debug log
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
