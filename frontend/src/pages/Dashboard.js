import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { getDynasties } from '../store/slices/dynastySlice';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { dynasties, isLoading } = useSelector((state) => state.dynasty);

  useEffect(() => {
    dispatch(getDynasties());
  }, [dispatch]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          My Dynasties
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/dynasties/new')}
        >
          Create Dynasty
        </Button>
      </Box>

      <Grid container spacing={3}>
        {dynasties.map((dynasty) => (
          <Grid item xs={12} sm={6} md={4} key={dynasty.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {dynasty.team_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dynasty.school}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dynasty.conference}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Season: {dynasty.season_year || 'N/A'}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/dynasties/${dynasty.id}/roster`)}
                  >
                    View Roster
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={() => navigate(`/dynasties/${dynasty.id}/recruiter-hub`)}
                  >
                    Recruiter Hub
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {dynasties.length === 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="body1" align="center">
                  No dynasties yet. Create your first dynasty to get started!
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default Dashboard;
