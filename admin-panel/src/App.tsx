import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import ConfigPage from './pages/ConfigPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import DialogUploadPage from './pages/DialogUploadPage';
import OfficesPage from './pages/OfficesPage';
import LocationsPage from './pages/LocationsPage';
import MediaPage from './pages/MediaPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('admin_token')
  );

  const handleLogin = (newToken: string) => {
    localStorage.setItem('admin_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Layout onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/knowledge" element={<KnowledgeBasePage />} />
        <Route path="/dialogs" element={<DialogUploadPage />} />
        <Route path="/offices" element={<OfficesPage />} />
        <Route path="/locations" element={<LocationsPage />} />
        <Route path="/media" element={<MediaPage />} />
      </Routes>
    </Layout>
  );
}
