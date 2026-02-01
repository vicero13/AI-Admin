import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
  { to: '/knowledge', label: 'Knowledge Base', icon: '📚' },
  { to: '/conversations', label: 'Conversations', icon: '💬' },
  { to: '/stats', label: 'Statistics', icon: '📈' },
  { to: '/chat-config', label: 'Chat Config', icon: '🤖' },
  { to: '/converter', label: 'Converter', icon: '🔄' },
  { to: '/offices', label: 'Offices', icon: '🏢' },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">AI-Admin Panel</h1>
        <p className="text-xs text-gray-400 mt-1">Management Console</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-700">
        <button
          onClick={logout}
          className="w-full px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
