import { useState, useEffect } from 'react';
import studScoreService from '../services/studScoreService';
import dynastyService from '../services/dynastyService';

/**
 * Custom hook that returns the set of attribute names configured in the
 * stud score config for a given dynasty, position, and archetype.
 *
 * Returns null when loading or when no position is selected (meaning show all attributes).
 * Returns a Set of attribute strings when attributes have been determined.
 */
export function useStudScoreAttributes(dynastyId, position, archetype) {
  const [relevantAttributes, setRelevantAttributes] = useState(null);
  const [presetId, setPresetId] = useState(null);
  const [presetLoaded, setPresetLoaded] = useState(false);

  // Load preset ID from dynasty (once per dynastyId)
  useEffect(() => {
    if (!dynastyId) {
      setPresetLoaded(true);
      return;
    }

    let cancelled = false;

    dynastyService.getDynasty(dynastyId).then(dynasty => {
      if (!cancelled) {
        setPresetId(dynasty.selected_preset_id || null);
        setPresetLoaded(true);
      }
    }).catch(() => {
      if (!cancelled) {
        setPresetId(null);
        setPresetLoaded(true);
      }
    });

    return () => { cancelled = true; };
  }, [dynastyId]);

  // Load attributes when preset/position/archetype changes
  useEffect(() => {
    if (!presetLoaded || !position) {
      setRelevantAttributes(null);
      return;
    }

    let cancelled = false;

    const fetchAttributes = async () => {
      try {
        let attributeNames = new Set();

        if (presetId) {
          const weights = await studScoreService.getWeights(presetId, position, archetype || null);
          if (weights && weights.length > 0) {
            weights.forEach(w => attributeNames.add(w.attribute_name));
          }
        }

        // Fall back to default weights if no custom weights found
        if (attributeNames.size === 0) {
          const defaults = await studScoreService.getDefaultWeights(position);
          if (defaults) {
            Object.keys(defaults).forEach(attr => attributeNames.add(attr));
          }
        }

        // Always include OVR
        attributeNames.add('OVR');

        if (!cancelled) {
          setRelevantAttributes(attributeNames);
        }
      } catch (error) {
        console.error('Error fetching stud score attributes:', error);
        // On error, return null to show all attributes as fallback
        if (!cancelled) {
          setRelevantAttributes(null);
        }
      }
    };

    fetchAttributes();

    return () => { cancelled = true; };
  }, [presetId, presetLoaded, position, archetype]);

  return relevantAttributes;
}
