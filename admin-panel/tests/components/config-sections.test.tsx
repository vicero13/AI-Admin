import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Section from '../../src/components/config/Section';
import ServerSection from '../../src/components/config/ServerSection';
import AISection from '../../src/components/config/AISection';
import LoggingSection from '../../src/components/config/LoggingSection';
import RedisSection from '../../src/components/config/RedisSection';
import DatabaseSection from '../../src/components/config/DatabaseSection';
import TelegramSection from '../../src/components/config/TelegramSection';

describe('Section', () => {
  it('should render collapsed by default', () => {
    render(<Section title="Test Section"><div>Content</div></Section>);
    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should expand on click', () => {
    render(<Section title="Test Section"><div>Content</div></Section>);
    fireEvent.click(screen.getByText('Test Section'));
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should render expanded when defaultOpen is true', () => {
    render(<Section title="Open" defaultOpen><div>Visible</div></Section>);
    expect(screen.getByText('Visible')).toBeInTheDocument();
  });
});

describe('ServerSection', () => {
  it('should render port and host fields when expanded', () => {
    render(<ServerSection data={{ port: 3000, host: '0.0.0.0' }} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Server'));
    expect(screen.getByText('Port')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
  });

  it('should call onChange with correct path', () => {
    const onChange = jest.fn();
    render(<ServerSection data={{ port: 3000, host: '0.0.0.0' }} onChange={onChange} />);
    fireEvent.click(screen.getByText('Server'));
    fireEvent.change(screen.getByDisplayValue('0.0.0.0'), { target: { value: 'localhost' } });
    expect(onChange).toHaveBeenCalledWith('server.host', 'localhost');
  });
});

describe('AISection', () => {
  const aiData = {
    provider: 'anthropic',
    model: 'claude-3-sonnet',
    temperature: 0.7,
    maxTokens: 500,
    cacheEnabled: true,
    cacheTTL: 1800,
  };

  it('should render all AI fields when expanded', () => {
    render(<AISection data={aiData} onChange={() => {}} />);
    fireEvent.click(screen.getByText('AI Engine'));
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('Max Tokens')).toBeInTheDocument();
    expect(screen.getByText('Cache Enabled')).toBeInTheDocument();
  });

  it('should call onChange for temperature slider', () => {
    const onChange = jest.fn();
    render(<AISection data={aiData} onChange={onChange} />);
    fireEvent.click(screen.getByText('AI Engine'));
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.5' } });
    expect(onChange).toHaveBeenCalledWith('ai.temperature', 0.5);
  });
});

describe('LoggingSection', () => {
  it('should render level select', () => {
    render(<LoggingSection data={{ level: 'info' }} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Logging'));
    expect(screen.getByText('Level')).toBeInTheDocument();
  });

  it('should call onChange on level change', () => {
    const onChange = jest.fn();
    render(<LoggingSection data={{ level: 'info' }} onChange={onChange} />);
    fireEvent.click(screen.getByText('Logging'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'debug' } });
    expect(onChange).toHaveBeenCalledWith('logging.level', 'debug');
  });
});

describe('RedisSection', () => {
  it('should show only toggle when disabled', () => {
    render(<RedisSection data={{ enabled: false, host: 'localhost', port: 6379, db: 0, keyPrefix: 'ai:' }} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Redis'));
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.queryByText('Host')).not.toBeInTheDocument();
  });

  it('should show all fields when enabled', () => {
    render(<RedisSection data={{ enabled: true, host: 'localhost', port: 6379, db: 0, keyPrefix: 'ai:' }} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Redis'));
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('Key Prefix')).toBeInTheDocument();
  });
});

describe('DatabaseSection', () => {
  it('should not show postgres fields when type is memory', () => {
    render(<DatabaseSection data={{ type: 'memory', postgres: {} }} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Database'));
    expect(screen.queryByText('Max Connections')).not.toBeInTheDocument();
  });

  it('should show postgres fields when type is postgres', () => {
    const pg = { host: 'localhost', port: 5432, database: 'test', user: 'u', password: 'p', maxConnections: 10 };
    render(<DatabaseSection data={{ type: 'postgres', postgres: pg }} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Database'));
    expect(screen.getByText('Max Connections')).toBeInTheDocument();
  });
});

describe('TelegramSection', () => {
  it('should render webhook fields', () => {
    render(<TelegramSection data={{ webhook: { url: '', path: '/webhook', secret: '' } }} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Telegram'));
    expect(screen.getByText('Webhook URL')).toBeInTheDocument();
    expect(screen.getByText('Webhook Path')).toBeInTheDocument();
    expect(screen.getByText('Webhook Secret')).toBeInTheDocument();
  });
});
