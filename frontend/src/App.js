import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DynastyList from './pages/DynastyList';
import DynastyDetail from './pages/DynastyDetail';
import RosterManagement from './pages/RosterManagement';
import DepthChart from './pages/DepthChart';
import Recruiting from './pages/Recruiting';
import StudScoreConfig from './pages/StudScoreConfig';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dynasties" element={<DynastyList />} />
          <Route path="/dynasties/:id" element={<DynastyDetail />} />
          <Route path="/dynasties/:id/roster" element={<RosterManagement />} />
          <Route path="/dynasties/:id/depth-chart" element={<DepthChart />} />
          <Route path="/dynasties/:id/recruiting" element={<Recruiting />} />
          <Route path="/stud-score" element={<StudScoreConfig />} />
        </Route>
      </Routes>
    </Box>
  );
}

export default App;
