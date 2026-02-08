import React from 'react';
import { TextField } from '@mui/material';
import { formatHeightInput } from '../utils/heightFormatter';

/**
 * HeightInput component with auto-formatting
 * Formats height as user types (e.g., '62' becomes '6'2"')
 */
const HeightInput = ({ value, onChange, name = 'height', ...otherProps }) => {
  const handleChange = (e) => {
    const rawValue = e.target.value;
    const formattedValue = formatHeightInput(rawValue);
    
    // Create a synthetic event with the formatted value
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        name,
        value: formattedValue,
      },
    };
    
    onChange(syntheticEvent);
  };

  return (
    <TextField
      fullWidth
      label="Height"
      name={name}
      value={value}
      onChange={handleChange}
      placeholder={`6'2"`}
      helperText={`e.g., 6'2"`}
      inputProps={{
        inputMode: 'numeric', // Show numeric keyboard on mobile
        pattern: '[0-9]*', // Additional hint for mobile keyboards
      }}
      {...otherProps}
    />
  );
};

export default HeightInput;
