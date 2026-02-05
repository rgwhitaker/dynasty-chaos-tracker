import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Grid,
  Alert,
} from '@mui/material';
import { createDynasty } from '../store/slices/dynastySlice';

const DynastyList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    team_name: '',
    school: '',
    conference: '',
    season_year: new Date().getFullYear(),
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await dispatch(createDynasty(formData)).unwrap();
      // Navigate to the newly created dynasty's roster management page
      navigate(`/dynasties/${result.id}/roster`);
    } catch (error) {
      const errorMessage = error?.message || 'Failed to create dynasty. Please try again.';
      setError(errorMessage);
      console.error('Failed to create dynasty:', error);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Dynasty
        </Typography>
        <Paper elevation={3} sx={{ p: 4, mt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Team Name"
                  name="team_name"
                  value={formData.team_name}
                  onChange={handleChange}
                  required
                  helperText="e.g., Crimson Tide, Buckeyes, Wolverines"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="School"
                  name="school"
                  value={formData.school}
                  onChange={handleChange}
                  required
                  helperText="e.g., Alabama, Ohio State, Michigan"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Conference"
                  name="conference"
                  value={formData.conference}
                  onChange={handleChange}
                  helperText="e.g., SEC, Big Ten, ACC (optional)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Season Year"
                  name="season_year"
                  type="number"
                  value={formData.season_year}
                  onChange={handleChange}
                  required
                  helperText="Starting season year"
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                  >
                    Create Dynasty
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default DynastyList;
