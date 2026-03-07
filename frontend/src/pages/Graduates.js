import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import playerService from '../services/playerService';

const Graduates = () => {
  const { id: dynastyId } = useParams();
  const navigate = useNavigate();
  const [graduates, setGraduates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadGraduates = async () => {
      try {
        setLoading(true);
        setError(null);
        const players = await playerService.getPlayers(dynastyId);
        setGraduates((players || []).filter((player) => player.year === 'GRAD'));
      } catch (err) {
        console.error('Failed to load graduates:', err);
        setError('Failed to load graduates. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadGraduates();
  }, [dynastyId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1">
          Graduates
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/dynasties/${dynastyId}/roster`)}
        >
          Back to Roster
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!error && graduates.length === 0 ? (
        <Alert severity="info">No graduated players yet.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Position</TableCell>
                <TableCell align="center">Overall</TableCell>
                <TableCell align="center">Redshirt Used</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {graduates.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>{player.first_name} {player.last_name}</TableCell>
                  <TableCell>{player.position || '-'}</TableCell>
                  <TableCell align="center">{player.overall_rating ?? '-'}</TableCell>
                  <TableCell align="center">{player.redshirt_used ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default Graduates;
