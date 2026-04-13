import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Button,
  IconButton,
  Chip,
  Collapse,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  HourglassTop as HourglassTopIcon,
} from '@mui/icons-material';
import playerService from '../services/playerService';

/**
 * Banner shown on the roster page when there are active, completed, or failed
 * video processing jobs. Allows the user to track progress and open the review
 * dialog for completed jobs.
 */
const VideoProcessingBanner = ({ dynastyId, onOpenReview }) => {
  const [uploads, setUploads] = useState([]);
  const [dismissed, setDismissed] = useState({});
  const pollTimerRef = useRef(null);

  const fetchUploads = useCallback(async () => {
    if (!dynastyId) return;
    try {
      const data = await playerService.getVideoUploads(dynastyId);
      setUploads(data.uploads || []);
    } catch (err) {
      // Silently fail – banner is non-critical
      console.error('Failed to fetch video uploads:', err);
    }
  }, [dynastyId]);

  useEffect(() => {
    fetchUploads();

    // Poll every 5 seconds while there are processing uploads
    pollTimerRef.current = setInterval(fetchUploads, 5000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [fetchUploads]);

  // Stop polling when there are no active processing uploads
  useEffect(() => {
    const hasProcessing = uploads.some(u => u.processing_status === 'processing');
    if (!hasProcessing && pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    } else if (hasProcessing && !pollTimerRef.current) {
      pollTimerRef.current = setInterval(fetchUploads, 5000);
    }
  }, [uploads, fetchUploads]);

  const handleDismiss = (uploadId) => {
    setDismissed(prev => ({ ...prev, [uploadId]: true }));
  };

  const visibleUploads = uploads.filter(u => !dismissed[u.id]);

  if (visibleUploads.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      {visibleUploads.map((upload) => (
        <Collapse key={upload.id} in={!dismissed[upload.id]}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              borderLeft: 4,
              borderColor:
                upload.processing_status === 'processing' ? 'info.main' :
                upload.processing_status === 'pending_review' ? 'success.main' :
                'error.main',
            }}
          >
            {/* Icon */}
            {upload.processing_status === 'processing' && (
              <HourglassTopIcon color="info" />
            )}
            {upload.processing_status === 'pending_review' && (
              <CheckCircleIcon color="success" />
            )}
            {upload.processing_status === 'failed' && (
              <ErrorIcon color="error" />
            )}

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {upload.processing_status === 'processing' && (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Video processing in progress...
                  </Typography>
                  {upload.total_frames !== null && upload.total_frames !== undefined ? (
                    <>
                      <Typography variant="caption" color="text.secondary">
                        Analyzing frame {upload.frames_analyzed || 0} of {upload.total_frames}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={upload.total_frames > 0 ? ((upload.frames_analyzed || 0) / upload.total_frames) * 100 : 0}
                        sx={{ mt: 0.5 }}
                      />
                    </>
                  ) : (
                    <>
                      <Typography variant="caption" color="text.secondary">
                        Extracting frames from video...
                      </Typography>
                      <LinearProgress sx={{ mt: 0.5 }} />
                    </>
                  )}
                </>
              )}

              {upload.processing_status === 'pending_review' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Video processing complete!
                  </Typography>
                  <Chip
                    label="Ready for Review"
                    color="success"
                    size="small"
                    variant="outlined"
                  />
                </Box>
              )}

              {upload.processing_status === 'failed' && (
                <Typography variant="body2" color="error">
                  Video processing failed. Please try uploading again.
                </Typography>
              )}
            </Box>

            {/* Actions */}
            {upload.processing_status === 'pending_review' && (
              <Button
                variant="contained"
                size="small"
                onClick={() => onOpenReview(upload.id)}
              >
                Review Changes
              </Button>
            )}

            {upload.processing_status === 'failed' && (
              <IconButton size="small" onClick={() => handleDismiss(upload.id)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Paper>
        </Collapse>
      ))}
    </Box>
  );
};

export default VideoProcessingBanner;
