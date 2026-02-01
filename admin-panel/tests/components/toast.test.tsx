import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider, useToast } from '../../src/components/ui/Toast';

function TestComponent() {
  const { toast } = useToast();
  return (
    <div>
      <button onClick={() => toast('success', 'Saved successfully')}>Show Success</button>
      <button onClick={() => toast('error', 'Save failed')}>Show Error</button>
      <button onClick={() => toast('info', 'Processing...')}>Show Info</button>
    </div>
  );
}

function renderWithToast() {
  return render(
    <ToastProvider>
      <TestComponent />
    </ToastProvider>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should show success toast when triggered', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should show error toast when triggered', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('should show info toast when triggered', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('Show Info'));
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('should show multiple toasts', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('should dismiss toast on close button click', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();

    const closeButton = screen.getByText('\u00D7');
    fireEvent.click(closeButton);
    expect(screen.queryByText('Saved successfully')).not.toBeInTheDocument();
  });

  it('should auto-dismiss after 4 seconds', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4100);
    });

    expect(screen.queryByText('Saved successfully')).not.toBeInTheDocument();
  });

  it('should show correct icon for success', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('\u2713')).toBeInTheDocument();
  });

  it('should show correct icon for error', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('\u2717')).toBeInTheDocument();
  });
});
