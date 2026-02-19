/**
 * Helper utilities for working with preset attribute weights
 */

/**
 * Extract relevant attributes from a weights array
 * Weights is an array of objects: { attribute_name, weight, archetype, ... }
 * Returns an array of attribute names that have non-zero weights
 * 
 * @param {Array} weights - Array of weight objects from the API
 * @returns {Array<string>} Array of relevant attribute names
 */
export const getRelevantAttributes = (weights) => {
  if (!weights || !Array.isArray(weights)) {
    return [];
  }

  // Get unique attributes that have a non-zero weight
  const attributeSet = new Set();
  
  weights.forEach(weightObj => {
    if (weightObj.weight > 0 && weightObj.attribute_name) {
      attributeSet.add(weightObj.attribute_name);
    }
  });

  return Array.from(attributeSet);
};

/**
 * Merge position defaults with archetype-specific weights
 * Archetype-specific weights override position defaults
 * 
 * @param {Array} weights - Array of weight objects (both defaults and archetype-specific)
 * @returns {Object} Merged weights object: { attributeName: weight }
 */
export const mergeWeights = (weights) => {
  if (!weights || !Array.isArray(weights)) {
    return {};
  }

  const merged = {};

  // First pass: add all position defaults (archetype IS NULL)
  weights.forEach(weightObj => {
    if (!weightObj.archetype) {
      merged[weightObj.attribute_name] = weightObj.weight;
    }
  });

  // Second pass: override with archetype-specific weights
  weights.forEach(weightObj => {
    if (weightObj.archetype) {
      merged[weightObj.attribute_name] = weightObj.weight;
    }
  });

  return merged;
};

/**
 * Get missing attributes for a player based on preset weights
 * 
 * @param {Object} player - Player object with attributes
 * @param {Array} weights - Array of weight objects from preset
 * @returns {Array<string>} Array of attribute names that are missing (undefined/null/empty)
 */
export const getMissingAttributes = (player, weights) => {
  if (!player || !weights || !Array.isArray(weights)) {
    return [];
  }

  const relevantAttributes = getRelevantAttributes(weights);
  const playerAttributes = player.attributes || {};

  return relevantAttributes.filter(attrName => {
    const value = playerAttributes[attrName];
    return value === undefined || value === null || value === '';
  });
};

/**
 * Filter attributes to only those relevant to the position/archetype preset
 * Used to show only relevant attributes in Add/Edit forms
 * 
 * @param {Array} allAttributes - Array of all possible attribute names
 * @param {Array} weights - Array of weight objects from preset
 * @returns {Array<string>} Filtered array of relevant attribute names
 */
export const filterRelevantAttributes = (allAttributes, weights) => {
  if (!allAttributes || !Array.isArray(allAttributes)) {
    return [];
  }

  if (!weights || !Array.isArray(weights) || weights.length === 0) {
    // If no weights, return all attributes (fallback)
    return allAttributes;
  }

  const relevantSet = new Set(getRelevantAttributes(weights));
  
  return allAttributes.filter(attr => relevantSet.has(attr));
};
