import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Toaster } from 'sonner';

// Layouts
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './layouts/ProtectedRoute';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import BecomeDonor from './pages/BecomeDonor';
import RequestBlood from './pages/RequestBlood';
import DonorDirectory from './pages/DonorDirectory';
import RequestDirectory from './pages/RequestDirectory';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/become-donor" element={<BecomeDonor />} />
            <Route path="/request-blood" element={<RequestBlood />} />
            <Route path="/donors" element={<DonorDirectory />} />
            <Route path="/requests" element={<RequestDirectory />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
