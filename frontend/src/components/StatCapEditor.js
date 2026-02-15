import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Tooltip,
  Alert,
  Button,
  CircularProgress,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { getStatGroupsForPosition } from '../constants/statCaps';
import playerService from '../services/playerService';

/**
 * StatCapEditor Component
 * Visual editor for managing stat caps with block-based UI
 * 
 * Props:
 * - position: Player position (required)
 * - statCaps: Current stat caps object
 * - onChange: Callback when stat caps change
 * - readOnly: Whether to display in read-only mode
 */
const StatCapEditor = ({ position, statCaps = {}, onChange, readOnly = false, dynastyId, playerId, archetype }) => {
  const statGroups = getStatGroupsForPosition(position);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const fileInputRef = useRef(null);

  if (!position || statGroups.length === 0) {
    return (
      <Alert severity="info">
        Select a position to view stat cap groups
      </Alert>
    );
  }

  // Initialize stat caps for a group if not present
  const getGroupData = (groupName) => {
    return statCaps[groupName] || {
      purchased_blocks: 0,
      capped_blocks: [],
    };
  };

  // Handle purchased blocks change
  const handlePurchasedChange = (groupName, value) => {
    if (readOnly) return;
    
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0 || numValue > 20) return;

    const groupData = getGroupData(groupName);
    const cappedCount = groupData.capped_blocks?.length || 0;

    // Ensure purchased + capped doesn't exceed 20
    if (numValue + cappedCount > 20) return;

    const updatedStatCaps = {
      ...statCaps,
      [groupName]: {
        ...groupData,
        purchased_blocks: numValue,
      },
    };
    onChange(updatedStatCaps);
  };

  // Handle block click to toggle capped status
  const handleBlockClick = (groupName, blockNumber) => {
    if (readOnly) return;

    const groupData = getGroupData(groupName);
    const cappedBlocks = groupData.capped_blocks || [];
    const purchasedBlocks = groupData.purchased_blocks || 0;

    // Can't cap a purchased block
    if (blockNumber <= purchasedBlocks) return;

    const isCapped = cappedBlocks.includes(blockNumber);
    let newCappedBlocks;

    if (isCapped) {
      // Remove from capped
      newCappedBlocks = cappedBlocks.filter(b => b !== blockNumber);
    } else {
      // Add to capped
      newCappedBlocks = [...cappedBlocks, blockNumber].sort((a, b) => a - b);
    }

    const updatedStatCaps = {
      ...statCaps,
      [groupName]: {
        ...groupData,
        capped_blocks: newCappedBlocks,
      },
    };
    onChange(updatedStatCaps);
  };

  // Handle stat group screenshot upload
  const handleStatGroupUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!dynastyId || !playerId) {
      setUploadError('Player must be saved before uploading stat group screenshots');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const result = await playerService.uploadStatGroupScreenshot(
        dynastyId,
        playerId,
        file,
        position,
        archetype
      );

      if (result.stat_caps) {
        // Merge OCR results with existing stat caps (OCR values take precedence)
        const mergedStatCaps = { ...statCaps, ...result.stat_caps };
        onChange(mergedStatCaps);
        setUploadSuccess('Stat groups updated from screenshot');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to process screenshot';
      setUploadError(errorMessage);
      console.error('Stat group upload error:', error);
    } finally {
      setUploading(false);
      // Reset the file input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Render a single stat group
  const renderStatGroup = (groupName) => {
    const groupData = getGroupData(groupName);
    const purchasedBlocks = groupData.purchased_blocks || 0;
    const cappedBlocks = groupData.capped_blocks || [];

    return (
      <Paper key={groupName} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {groupName}
          </Typography>
          {!readOnly && (
            <TextField
              size="small"
              type="number"
              label="Purchased"
              value={purchasedBlocks}
              onChange={(e) => handlePurchasedChange(groupName, e.target.value)}
              inputProps={{ min: 0, max: 20, style: { width: '60px' } }}
              sx={{ width: '120px' }}
            />
          )}
          {readOnly && (
            <Typography variant="body2" color="text.secondary">
              Purchased: {purchasedBlocks} | Capped: {cappedBlocks.length}
            </Typography>
          )}
        </Box>

        {/* Block grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: 0.5 }}>
          {Array.from({ length: 20 }, (_, i) => i + 1).map((blockNum) => {
            const isPurchased = blockNum <= purchasedBlocks;
            const isCapped = cappedBlocks.includes(blockNum);
            
            let bgColor = '#424242'; // Available (dark gray)
            let cursor = 'pointer';
            let tooltip = `Block ${blockNum}`;

            if (isPurchased) {
              bgColor = '#ff9800'; // Purchased (orange)
              cursor = 'not-allowed';
              tooltip = `Block ${blockNum} - Purchased`;
            } else if (isCapped) {
              bgColor = '#bdbdbd'; // Capped (light gray)
              tooltip = `Block ${blockNum} - Capped (click to uncap)`;
            } else {
              tooltip = `Block ${blockNum} - Available (click to cap)`;
            }

            if (readOnly) {
              cursor = 'default';
            }

            return (
              <Tooltip key={blockNum} title={tooltip} arrow>
                <Box
                  onClick={() => !readOnly && handleBlockClick(groupName, blockNum)}
                  sx={{
                    aspectRatio: '1',
                    backgroundColor: bgColor,
                    border: '1px solid #333',
                    borderRadius: '2px',
                    cursor: readOnly ? 'default' : cursor,
                    position: 'relative',
                    transition: 'all 0.2s',
                    '&:hover': readOnly ? {} : {
                      transform: isPurchased ? 'none' : 'scale(1.1)',
                      boxShadow: isPurchased ? 'none' : 2,
                    },
                    // Diagonal stripes for capped blocks
                    ...(isCapped && {
                      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)',
                    }),
                  }}
                />
              </Tooltip>
            );
          })}
        </Box>

        {/* Legend */}
        <Box sx={{ display: 'flex', gap: 2, mt: 1, fontSize: '0.75rem' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, backgroundColor: '#ff9800', border: '1px solid #333' }} />
            <Typography variant="caption">Purchased</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, backgroundColor: '#424242', border: '1px solid #333' }} />
            <Typography variant="caption">Available</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box 
              sx={{ 
                width: 12, 
                height: 12, 
                backgroundColor: '#bdbdbd', 
                border: '1px solid #333',
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(255,255,255,0.3) 1px, rgba(255,255,255,0.3) 2px)',
              }} 
            />
            <Typography variant="caption">Capped</Typography>
          </Box>
        </Box>
      </Paper>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Stat Caps {readOnly ? '' : '(Click blocks to cap/uncap)'}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {readOnly 
          ? 'Stat cap visualization showing purchased, available, and capped upgrade blocks.'
          : 'Set purchased blocks and click individual blocks to toggle capped status. Purchased blocks must start from block 1.'
        }
      </Typography>
      {!readOnly && dynastyId && playerId && (
        <Box sx={{ mb: 2 }}>
          {uploadError && (
            <Alert severity="error" sx={{ mb: 1 }} onClose={() => setUploadError(null)}>
              {uploadError}
            </Alert>
          )}
          {uploadSuccess && (
            <Alert severity="success" sx={{ mb: 1 }} onClose={() => setUploadSuccess(null)}>
              {uploadSuccess}
            </Alert>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            ref={fileInputRef}
            onChange={handleStatGroupUpload}
            style={{ display: 'none' }}
          />
          <Button
            variant="outlined"
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Processing...' : 'Upload Stat Group Screenshot'}
          </Button>
        </Box>
      )}
      {statGroups.map(renderStatGroup)}
    </Box>
  );
};

export default StatCapEditor;
