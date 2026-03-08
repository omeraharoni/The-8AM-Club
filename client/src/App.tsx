import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AuthForm from './features/Auth/AuthForm';
import Dashboard from './features/Dashboard/Dashboard';
import './App.css';

function App() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('token');
    } catch (e) {
      console.error('LocalStorage not available:', e);
      return null;
    }
  });
  const navigate = useNavigate();

  const handleLoginSuccess = (newToken: string) => {
    try {
      localStorage.setItem('token', newToken);
    } catch (e) {
      console.error('Failed to save token:', e);
    }
    queryClient.clear();
    setToken(newToken);
    navigate('/dashboard/log');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
    } catch (e) {
      console.error('Failed to remove token:', e);
    }
    queryClient.clear();
    setToken(null);
    navigate('/login');
  };

  return (
    <div className="app">
      <Routes>
        <Route 
          path="/login" 
          element={!token ? <AuthForm onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/dashboard/log" />} 
        />
        <Route 
          path="/dashboard/*" 
          element={token ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to={token ? "/dashboard/log" : "/login"} />} />
      </Routes>
    </div>
  );
}

export default App;
