import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
  onLogout?: () => void;
}

export default function Layout({ children, onLogout }: LayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar onLogout={onLogout} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
