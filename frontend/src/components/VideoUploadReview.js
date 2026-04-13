import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CloudUpload as CloudUploadIcon,
  Videocam as VideocamIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import playerService from '../services/playerService';
import useMobileDetect from '../hooks/useMobileDetect';

// Attribute display names for diffs
const ATTR_DISPLAY = {
  jersey_number: 'Jersey #',
  overall_rating: 'Overall',
  SPD: 'Speed', ACC: 'Acceleration', AGI: 'Agility', COD: 'Change of Dir',
  STR: 'Strength', JMP: 'Jump', STA: 'Stamina', TGH: 'Toughness', INJ: 'Injury',
  AWR: 'Awareness', PRC: 'Play Recognition',
  CAR: 'Carrying', BCV: 'Ball Carrier Vision', BTK: 'Break Tackle', TRK: 'Trucking',
  SFA: 'Stiff Arm', SPM: 'Spin Move', JKM: 'Juke Move',
  CTH: 'Catching', CIT: 'Catch in Traffic', SPC: 'Spectacular Catch',
  SRR: 'Short Route', MRR: 'Med Route', DRR: 'Deep Route', RLS: 'Release',
  THP: 'Throw Power', SAC: 'Short Acc', MAC: 'Med Acc', DAC: 'Deep Acc',
  TUP: 'Throw Under Pressure', BSK: 'Break Sack', PAC: 'Play Action', RUN: 'Run',
  PBK: 'Pass Block', PBP: 'Pass Block Power', PBF: 'Pass Block Finesse',
  RBK: 'Run Block', RBP: 'Run Block Power', RBF: 'Run Block Finesse',
  LBK: 'Lead Block', IBL: 'Impact Block',
  TAK: 'Tackle', POW: 'Power', BSH: 'Block Shed', FMV: 'Finesse Moves',
  PMV: 'Power Moves', PUR: 'Pursuit', MCV: 'Man Cover', ZCV: 'Zone Cover',
  PRS: 'Press', RET: 'Return', KPW: 'Kick Power', KAC: 'Kick Accuracy', LSP: 'Long Snap',
};

const STEPS = {
  UPLOAD: 'upload',
  PROCESSING: 'processing',
  REVIEW: 'review',
  DONE: 'done',
};

const VideoUploadReview = ({ open, onClose, dynastyId, onPlayersUpdated, resumeUploadId }) => {
  const { isMobile } = useMobileDetect();
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ totalFrames: null, framesAnalyzed: 0 });
  const [results, setResults] = useState(null);
  const [checkedNew, setCheckedNew] = useState({});
  const [checkedUpdates, setCheckedUpdates] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const pollTimerRef = useRef(null);
  const elapsedTimerRef = useRef(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      // If resuming a specific upload, start polling directly
      if (resumeUploadId) {
        setStep(STEPS.PROCESSING);
        setUploadId(resumeUploadId);
        setError(null);
        setProgress({ totalFrames: null, framesAnalyzed: 0 });
        setResults(null);
        setCheckedNew({});
        setCheckedUpdates({});
        setSaving(false);
        setSaveResult(null);
        setElapsedSeconds(0);
        setStatusMessage('Reconnecting to video processing...');
        startPolling(dynastyId, resumeUploadId);
        startElapsedTimer();
      } else {
        setStep(STEPS.UPLOAD);
        setVideoFile(null);
        setUploadId(null);
        setError(null);
        setProgress({ totalFrames: null, framesAnalyzed: 0 });
        setResults(null);
        setCheckedNew({});
        setCheckedUpdates({});
        setSaving(false);
        setSaveResult(null);
        setElapsedSeconds(0);
        setStatusMessage('');
      }
    }
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resumeUploadId]);

  const formatElapsed = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const startElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    setElapsedSeconds(0);
    elapsedTimerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  }, []);

  const stopElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setVideoFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.webm', '.avi'],
    },
    multiple: false,
    maxSize: 200 * 1024 * 1024, // 200MB
  });

  // Compute status message based on progress
  useEffect(() => {
    if (step !== STEPS.PROCESSING) return;
    if (progress.totalFrames === null || progress.totalFrames === undefined) {
      setStatusMessage('Uploading video and extracting frames...');
    } else if (progress.framesAnalyzed === 0) {
      setStatusMessage(`Found ${progress.totalFrames} frames. Starting analysis...`);
    } else if (progress.framesAnalyzed < progress.totalFrames) {
      setStatusMessage(`Analyzing frame ${progress.framesAnalyzed} of ${progress.totalFrames}...`);
    } else {
      setStatusMessage('Comparing results with your current roster...');
    }
  }, [step, progress]);

  // Start polling for results
  const startPolling = useCallback((dynId, upId) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    // Do an immediate first poll
    const doPoll = async () => {
      try {
        const data = await playerService.getVideoResults(dynId, upId);

        if (data.status === 'processing') {
          setProgress({
            totalFrames: data.totalFrames,
            framesAnalyzed: data.framesAnalyzed || 0,
          });
        } else if (data.status === 'pending_review') {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          stopElapsedTimer();
          setResults(data);
          // Initialize all checkboxes to checked
          const newChecks = {};
          (data.newPlayers || []).forEach(p => { newChecks[p.tempId] = true; });
          setCheckedNew(newChecks);
          const updateChecks = {};
          (data.updatedPlayers || []).forEach(p => { updateChecks[p.tempId] = true; });
          setCheckedUpdates(updateChecks);
          setStep(STEPS.REVIEW);
        } else if (data.status === 'failed') {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          stopElapsedTimer();
          const errMsg = Array.isArray(data.errors) && data.errors.length > 0
            ? data.errors[0].message || 'Processing failed'
            : 'Video processing failed. Please try again.';
          setError(errMsg);
          setStep(STEPS.UPLOAD);
        }
      } catch (err) {
        console.error('Polling error:', err);
        // Don't stop polling on transient errors
      }
    };

    // Initial immediate poll
    doPoll();
    pollTimerRef.current = setInterval(doPoll, 3000);
  }, [stopElapsedTimer]);

  const handleUpload = async () => {
    if (!videoFile) {
      setError('Please select a video file');
      return;
    }

    setError(null);
    setStep(STEPS.PROCESSING);
    setStatusMessage('Uploading video...');
    startElapsedTimer();

    try {
      const data = await playerService.uploadVideo(dynastyId, videoFile, 'tesseract');
      setUploadId(data.uploadId);
      setStatusMessage('Video uploaded. Processing has started...');
      startPolling(dynastyId, data.uploadId);
    } catch (err) {
      stopElapsedTimer();
      const msg = err.response?.data?.error || 'Failed to upload video. Please try again.';
      setError(msg);
      setStep(STEPS.UPLOAD);
    }
  };

  const handleToggleNewPlayer = (tempId) => {
    setCheckedNew(prev => ({ ...prev, [tempId]: !prev[tempId] }));
  };

  const handleToggleUpdatePlayer = (tempId) => {
    setCheckedUpdates(prev => ({ ...prev, [tempId]: !prev[tempId] }));
  };

  const handleSelectAllNew = (checked) => {
    const updated = {};
    (results?.newPlayers || []).forEach(p => { updated[p.tempId] = checked; });
    setCheckedNew(updated);
  };

  const handleSelectAllUpdates = (checked) => {
    const updated = {};
    (results?.updatedPlayers || []).forEach(p => { updated[p.tempId] = checked; });
    setCheckedUpdates(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const approvedNew = Object.entries(checkedNew).filter(([, v]) => v).map(([k]) => k);
    const approvedUpdates = Object.entries(checkedUpdates).filter(([, v]) => v).map(([k]) => k);

    if (approvedNew.length === 0 && approvedUpdates.length === 0) {
      setError('No players selected. Check at least one player to save.');
      setSaving(false);
      return;
    }

    try {
      const result = await playerService.approveVideoResults(
        dynastyId,
        uploadId,
        approvedNew,
        approvedUpdates
      );
      setSaveResult(result);
      setStep(STEPS.DONE);
      if (onPlayersUpdated) onPlayersUpdated();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const getAttrName = (field) => ATTR_DISPLAY[field] || field;

  const newPlayerCount = results?.newPlayers?.length || 0;
  const updatePlayerCount = results?.updatedPlayers?.length || 0;
  const checkedNewCount = Object.values(checkedNew).filter(Boolean).length;
  const checkedUpdateCount = Object.values(checkedUpdates).filter(Boolean).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <VideocamIcon color="primary" />
        Upload Roster Video
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* UPLOAD STEP */}
        {step === STEPS.UPLOAD && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload a video of you scrolling through the in-game roster screen. The system will
              extract frames, OCR each one, and present the results for your review before saving.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Supported formats: MP4, MOV, WebM, AVI (max 200 MB, max 5 minutes).
            </Typography>

            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.400',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragActive ? 'action.hover' : 'background.default',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
              }}
            >
              <input {...getInputProps()} />
              <VideocamIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop the video here' : 'Drag & drop a video here'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or click to select a file
              </Typography>
            </Box>

            {videoFile && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`${videoFile.name} (${(videoFile.size / (1024 * 1024)).toFixed(1)} MB)`}
                  onDelete={() => setVideoFile(null)}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            )}
          </Box>
        )}

        {/* PROCESSING STEP */}
        {step === STEPS.PROCESSING && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Processing Video...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {statusMessage}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Elapsed: {formatElapsed(elapsedSeconds)}
            </Typography>
            {progress.totalFrames != null ? (
              <Box sx={{ mt: 2, maxWidth: 400, mx: 'auto' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Frame {progress.framesAnalyzed} of {progress.totalFrames}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={progress.totalFrames > 0 ? (progress.framesAnalyzed / progress.totalFrames) * 100 : 0}
                />
              </Box>
            ) : (
              <Box sx={{ mt: 2, maxWidth: 400, mx: 'auto' }}>
                <LinearProgress />
              </Box>
            )}
            <Alert severity="info" sx={{ mt: 3, textAlign: 'left', maxWidth: 500, mx: 'auto' }}>
              You can close this dialog and the processing will continue in the background. 
              A banner will appear on this page when results are ready for review.
            </Alert>
          </Box>
        )}

        {/* REVIEW STEP */}
        {step === STEPS.REVIEW && results && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Found {newPlayerCount} new player(s) and {updatePlayerCount} update(s).
              {results.unchangedCount > 0 && ` ${results.unchangedCount} player(s) unchanged.`}
              {' '}Check the ones you want to save.
            </Alert>

            {/* New Players Section */}
            {newPlayerCount > 0 && (
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 'bold' }}>
                    New Players ({checkedNewCount}/{newPlayerCount} selected)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checkedNewCount === newPlayerCount}
                          indeterminate={checkedNewCount > 0 && checkedNewCount < newPlayerCount}
                          onChange={(e) => handleSelectAllNew(e.target.checked)}
                        />
                      }
                      label="Select All"
                    />
                  </Box>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox" />
                          <TableCell>#</TableCell>
                          <TableCell>Position</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Overall</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {results.newPlayers.map((player) => (
                          <TableRow key={player.tempId} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={!!checkedNew[player.tempId]}
                                onChange={() => handleToggleNewPlayer(player.tempId)}
                              />
                            </TableCell>
                            <TableCell>{player.jersey_number}</TableCell>
                            <TableCell>
                              <Chip label={player.position} size="small" color="primary" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              {player.first_name} {player.last_name}
                              {player.attributes?.SUFFIX && ` ${player.attributes.SUFFIX}`}
                            </TableCell>
                            <TableCell>{player.overall_rating}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Updated Players Section */}
            {updatePlayerCount > 0 && (
              <Accordion defaultExpanded sx={{ mt: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 'bold' }}>
                    Player Updates ({checkedUpdateCount}/{updatePlayerCount} selected)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checkedUpdateCount === updatePlayerCount}
                          indeterminate={checkedUpdateCount > 0 && checkedUpdateCount < updatePlayerCount}
                          onChange={(e) => handleSelectAllUpdates(e.target.checked)}
                        />
                      }
                      label="Select All"
                    />
                  </Box>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox" />
                          <TableCell>Player</TableCell>
                          <TableCell>Changes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {results.updatedPlayers.map((player) => (
                          <TableRow key={player.tempId} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={!!checkedUpdates[player.tempId]}
                                onChange={() => handleToggleUpdatePlayer(player.tempId)}
                              />
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {player.first_name} {player.last_name}
                                </Typography>
                                <Chip label={player.position} size="small" color="primary" variant="outlined" />
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {player.diffs.map((diff, idx) => (
                                  <Chip
                                    key={idx}
                                    size="small"
                                    label={
                                      <span>
                                        {getAttrName(diff.field)}:{' '}
                                        <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>
                                          {diff.oldValue ?? '—'}
                                        </span>
                                        {' → '}
                                        <strong>{diff.newValue}</strong>
                                      </span>
                                    }
                                    variant="outlined"
                                    color={
                                      typeof diff.newValue === 'number' && typeof diff.oldValue === 'number'
                                        ? (diff.newValue > diff.oldValue ? 'success' :
                                           diff.newValue < diff.oldValue ? 'error' : 'default')
                                        : 'default'
                                    }
                                  />
                                ))}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Unchanged Players */}
            {results.unchangedCount > 0 && (
              <Accordion sx={{ mt: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography color="text.secondary">
                    Unchanged Players ({results.unchangedCount})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    {results.unchangedCount} player(s) were found in the video but already match
                    the current roster data. No changes needed.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        )}

        {/* DONE STEP */}
        {step === STEPS.DONE && saveResult && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Players Saved Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {saveResult.importedCount > 0 && `${saveResult.importedCount} new player(s) added. `}
              {saveResult.updatedCount > 0 && `${saveResult.updatedCount} player(s) updated.`}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        {step === STEPS.UPLOAD && (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!videoFile}
              startIcon={<CloudUploadIcon />}
            >
              Upload & Process
            </Button>
          </>
        )}

        {step === STEPS.PROCESSING && (
          <Button onClick={onClose} variant="outlined">
            Continue in Background
          </Button>
        )}

        {step === STEPS.REVIEW && (
          <>
            <Button onClick={onClose} color="inherit">
              Discard
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || (checkedNewCount === 0 && checkedUpdateCount === 0)}
              startIcon={saving ? <CircularProgress size={20} /> : <ArrowForwardIcon />}
            >
              {saving ? 'Saving...' : `Save Selected (${checkedNewCount + checkedUpdateCount})`}
            </Button>
          </>
        )}

        {step === STEPS.DONE && (
          <Button variant="contained" onClick={onClose}>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default VideoUploadReview;
