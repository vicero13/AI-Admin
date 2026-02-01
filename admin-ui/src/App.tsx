import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import ConversationsPage from './pages/ConversationsPage';
import StatsPage from './pages/StatsPage';
import ChatConfigPage from './pages/ChatConfigPage';
import ConverterPage from './pages/ConverterPage';
import OfficesPage from './pages/OfficesPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="knowledge" element={<KnowledgeBasePage />} />
            <Route path="conversations" element={<ConversationsPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="chat-config" element={<ChatConfigPage />} />
            <Route path="converter" element={<ConverterPage />} />
            <Route path="offices" element={<OfficesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
