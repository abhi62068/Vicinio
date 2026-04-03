import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // <--- ADD THIS LINE

// Import Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ReceiverDashboard from './pages/ReceiverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import DispatchDashboard from './pages/DispatchDashboard';

const App = () => {
  return (
    <>
      {/* Updated position to top-center for better visibility */}
      <Toaster position="top-center" reverseOrder={false} /> 
      
      <Router>
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Dashboard Routes */}
            <Route path="/receiver" element={<ReceiverDashboard />} />
            <Route path="/provider" element={<ProviderDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/dispatch" element={<DispatchDashboard />} />

            {/* Default Redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </>
  );
};

export default App;