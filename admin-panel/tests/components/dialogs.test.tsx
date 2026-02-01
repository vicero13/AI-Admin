import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileUploader from '../../src/components/dialogs/FileUploader';
import DialogPreview from '../../src/components/dialogs/DialogPreview';

describe('FileUploader', () => {
  it('should render upload area', () => {
    render(<FileUploader onFileSelect={() => {}} />);
    expect(screen.getByText(/Drag & drop/)).toBeInTheDocument();
    expect(screen.getByText(/JSON, CSV, TXT, XLSX/)).toBeInTheDocument();
  });

  it('should have hidden file input', () => {
    const { container } = render(<FileUploader onFileSelect={() => {}} />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('hidden');
  });
});

describe('DialogPreview', () => {
  const sampleDialogs = [
    {
      exampleId: 'dialog-1',
      situation: 'Test situation',
      clientType: 'new' as const,
      messages: [
        { role: 'client' as const, text: 'Hello' },
        { role: 'manager' as const, text: 'Hi there!' },
      ],
      outcome: 'successful',
      quality: 0.9,
      learnings: [],
      keyPhrases: [],
      tags: [],
      metadata: {},
    },
    {
      exampleId: 'dialog-2',
      situation: 'Another situation',
      clientType: 'returning' as const,
      messages: [{ role: 'client' as const, text: 'Question' }],
      outcome: 'neutral',
      quality: 0.8,
      learnings: [],
      keyPhrases: [],
      tags: [],
      metadata: {},
    },
  ];

  it('should render dialog count', () => {
    render(<DialogPreview dialogs={sampleDialogs} onRemove={() => {}} />);
    expect(screen.getByText(/Parsed 2 dialog/)).toBeInTheDocument();
  });

  it('should render dialog situations', () => {
    render(<DialogPreview dialogs={sampleDialogs} onRemove={() => {}} />);
    expect(screen.getByText('Test situation')).toBeInTheDocument();
    expect(screen.getByText('Another situation')).toBeInTheDocument();
  });

  it('should render messages', () => {
    render(<DialogPreview dialogs={sampleDialogs} onRemove={() => {}} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('should call onRemove with index', () => {
    const onRemove = jest.fn();
    render(<DialogPreview dialogs={sampleDialogs} onRemove={onRemove} />);
    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('should show message count and metadata', () => {
    render(<DialogPreview dialogs={sampleDialogs} onRemove={() => {}} />);
    expect(screen.getByText(/2 messages/)).toBeInTheDocument();
    expect(screen.getByText(/1 messages/)).toBeInTheDocument();
  });
});
