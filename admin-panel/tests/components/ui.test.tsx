import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Toggle from '../../src/components/ui/Toggle';
import Slider from '../../src/components/ui/Slider';
import NumberInput from '../../src/components/ui/NumberInput';
import SelectInput from '../../src/components/ui/SelectInput';
import TextInput from '../../src/components/ui/TextInput';
import TagInput from '../../src/components/ui/TagInput';
import TextArrayEditor from '../../src/components/ui/TextArrayEditor';
import SaveButton from '../../src/components/ui/SaveButton';
import StatusBadge from '../../src/components/ui/StatusBadge';

describe('Toggle', () => {
  it('should render with label', () => {
    render(<Toggle label="Enable cache" checked={false} onChange={() => {}} />);
    expect(screen.getByText('Enable cache')).toBeInTheDocument();
  });

  it('should call onChange when toggled', () => {
    const onChange = jest.fn();
    render(<Toggle label="Test" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('should reflect checked state', () => {
    render(<Toggle label="Test" checked={true} onChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});

describe('Slider', () => {
  it('should render label and value', () => {
    render(<Slider label="Temperature" value={0.7} min={0} max={1} step={0.1} onChange={() => {}} />);
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('0.7')).toBeInTheDocument();
  });

  it('should call onChange with number value', () => {
    const onChange = jest.fn();
    render(<Slider label="Temp" value={0.5} min={0} max={1} step={0.1} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.8' } });
    expect(onChange).toHaveBeenCalledWith(0.8);
  });
});

describe('NumberInput', () => {
  it('should render label and value', () => {
    render(<NumberInput label="Port" value={3000} onChange={() => {}} />);
    expect(screen.getByText('Port')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(3000);
  });

  it('should call onChange with number', () => {
    const onChange = jest.fn();
    render(<NumberInput label="Port" value={3000} onChange={onChange} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '4000' } });
    expect(onChange).toHaveBeenCalledWith(4000);
  });
});

describe('SelectInput', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  it('should render options', () => {
    render(<SelectInput label="Choose" value="a" options={options} onChange={() => {}} />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('should call onChange with selected value', () => {
    const onChange = jest.fn();
    render(<SelectInput label="Choose" value="a" options={options} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('TextInput', () => {
  it('should render with value', () => {
    render(<TextInput label="Host" value="localhost" onChange={() => {}} />);
    expect(screen.getByDisplayValue('localhost')).toBeInTheDocument();
  });

  it('should call onChange', () => {
    const onChange = jest.fn();
    render(<TextInput label="Host" value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '0.0.0.0' } });
    expect(onChange).toHaveBeenCalledWith('0.0.0.0');
  });
});

describe('TagInput', () => {
  it('should render existing tags', () => {
    render(<TagInput label="Tags" tags={['tag1', 'tag2']} onChange={() => {}} />);
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
  });

  it('should add tag on Enter', () => {
    const onChange = jest.fn();
    render(<TagInput label="Tags" tags={['existing']} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Enter + Add');
    fireEvent.change(input, { target: { value: 'new-tag' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['existing', 'new-tag']);
  });

  it('should not add duplicate tags', () => {
    const onChange = jest.fn();
    render(<TagInput label="Tags" tags={['existing']} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Enter + Add');
    fireEvent.change(input, { target: { value: 'existing' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should remove tag on click', () => {
    const onChange = jest.fn();
    render(<TagInput label="Tags" tags={['a', 'b']} onChange={onChange} />);
    const removeButtons = screen.getAllByText('\u00D7');
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith(['b']);
  });
});

describe('TextArrayEditor', () => {
  it('should render items', () => {
    render(<TextArrayEditor label="Items" items={['Hello', 'World']} onChange={() => {}} />);
    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument();
    expect(screen.getByDisplayValue('World')).toBeInTheDocument();
  });

  it('should add item on + click', () => {
    const onChange = jest.fn();
    render(<TextArrayEditor label="Items" items={['one']} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Add'));
    expect(onChange).toHaveBeenCalledWith(['one', '']);
  });

  it('should remove item', () => {
    const onChange = jest.fn();
    render(<TextArrayEditor label="Items" items={['a', 'b']} onChange={onChange} />);
    const removeButtons = screen.getAllByText('\u00D7');
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('should update item text', () => {
    const onChange = jest.fn();
    render(<TextArrayEditor label="Items" items={['old']} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('old'), { target: { value: 'new' } });
    expect(onChange).toHaveBeenCalledWith(['new']);
  });
});

describe('SaveButton', () => {
  it('should render with default label', () => {
    render(<SaveButton saving={false} onClick={() => {}} />);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should show Saving... when saving', () => {
    render(<SaveButton saving={true} onClick={() => {}} />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('should be disabled when saving', () => {
    render(<SaveButton saving={true} onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should call onClick', () => {
    const onClick = jest.fn();
    render(<SaveButton saving={false} onClick={onClick} />);
    fireEvent.click(screen.getByText('Save'));
    expect(onClick).toHaveBeenCalled();
  });

  it('should support custom label', () => {
    render(<SaveButton saving={false} onClick={() => {}} label="Update" />);
    expect(screen.getByText('Update')).toBeInTheDocument();
  });
});

describe('StatusBadge', () => {
  it('should render online status', () => {
    render(<StatusBadge status="online" label="Running" />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('should render offline status', () => {
    render(<StatusBadge status="offline" label="Stopped" />);
    expect(screen.getByText('Stopped')).toBeInTheDocument();
  });
});
