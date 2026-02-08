/**
 * Utility functions for formatting player height input
 * Formats input like '62' to '6'2"'
 */

/**
 * Format height value as user types
 * @param {string} value - The raw input value
 * @returns {string} - The formatted height string (e.g., "6'2\"")
 */
export const formatHeightInput = (value) => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // If empty, return empty string
  if (!digits) {
    return '';
  }
  
  // If only one digit, just return it (partial input)
  if (digits.length === 1) {
    return digits;
  }
  
  // If two or more digits, format as feet'inches"
  const feet = digits[0];
  const inches = digits.slice(1);
  
  // Return formatted string
  return `${feet}'${inches}"`;
};

/**
 * Parse formatted height back to raw digits for form submission
 * @param {string} formattedHeight - The formatted height (e.g., "6'2\"")
 * @returns {string} - The raw digits (e.g., "62")
 */
export const parseHeight = (formattedHeight) => {
  if (!formattedHeight) return '';
  return formattedHeight.replace(/\D/g, '');
};

/**
 * Validate height is within acceptable range (5'0" to 6'11")
 * @param {string} height - The formatted height string
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidHeight = (height) => {
  const digits = parseHeight(height);
  if (!digits || digits.length < 2) return false;
  
  const feet = parseInt(digits[0], 10);
  const inches = parseInt(digits.slice(1), 10);
  
  // Players should be between 5'0" and 6'11"
  if (feet < 5 || feet > 6) return false;
  if (inches < 0 || inches > 11) return false;
  
  return true;
};
