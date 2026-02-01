import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Sidebar from '../../src/components/layout/Sidebar';
import Header from '../../src/components/layout/Header';
import Layout from '../../src/components/layout/Layout';

describe('Sidebar', () => {
  it('should render title', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText('AI-Admin Panel')).toBeInTheDocument();
  });

  it('should render all navigation links', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
    expect(screen.getByText('Dialogs')).toBeInTheDocument();
  });

  it('should highlight active link', () => {
    render(
      <MemoryRouter initialEntries={['/config']}>
        <Sidebar />
      </MemoryRouter>
    );
    const configLink = screen.getByText('Configuration');
    expect(configLink.className).toContain('bg-blue-600');
  });
});

describe('Header', () => {
  it('should render description text', () => {
    render(<Header />);
    expect(screen.getByText(/Manage your AI assistant/)).toBeInTheDocument();
  });
});

describe('Layout', () => {
  it('should render children with sidebar and header', () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </MemoryRouter>
    );
    expect(screen.getByText('AI-Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
