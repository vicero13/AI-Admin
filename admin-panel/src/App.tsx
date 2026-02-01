import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import ConfigPage from './pages/ConfigPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import DialogUploadPage from './pages/DialogUploadPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/knowledge" element={<KnowledgeBasePage />} />
        <Route path="/dialogs" element={<DialogUploadPage />} />
      </Routes>
    </Layout>
  );
}
