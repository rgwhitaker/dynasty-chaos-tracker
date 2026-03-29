import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  TextField,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  Snackbar,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  SwapHoriz as TransferIcon,
  ViewModule as ViewModuleIcon,
  Category as CategoryIcon,
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getPlayers, deletePlayer, updatePlayer } from '../store/slices/playerSlice';
import { ATTRIBUTE_DISPLAY_NAMES, DEV_TRAIT_COLORS, POSITIONS, YEARS, DEV_TRAITS, POSITION_ARCHETYPES, ROSTER_POSITIONS } from '../constants/playerAttributes';
import { getStatCapSummary } from '../constants/statCaps';
import StatCapEditor from '../components/StatCapEditor';
import playerService from '../services/playerService';
import depthChartService from '../services/depthChartService';
import HeightInput from '../components/HeightInput';
import AbilitySelector from '../components/AbilitySelector';
import { useStudScoreAttributes } from '../hooks/useStudScoreAttributes';

// Common chip container styles
const CHIP_CONTAINER_STYLES = {
  display: 'flex',
  gap: 0.5,
  mt: 0.5,
  flexWrap: 'wrap'
};

// Attribute categories for organized display
const ATTRIBUTE_CATEGORIES = {
  'Overall': ['OVR'],
  'Physical': ['SPD', 'ACC', 'AGI', 'COD', 'STR', 'JMP', 'STA', 'TGH', 'INJ'],
  'Awareness': ['AWR', 'PRC'],
  'Ball Carrier': ['CAR', 'BCV', 'BTK', 'TRK', 'SFA', 'SPM', 'JKM'],
  'Receiving': ['CTH', 'CIT', 'SPC', 'SRR', 'MRR', 'DRR', 'RLS'],
  'Passing': ['THP', 'SAC', 'MAC', 'DAC', 'TUP', 'BSK', 'PAC'],
  'Blocking': ['PBK', 'PBP', 'PBF', 'RBK', 'RBP', 'RBF', 'LBK', 'IBL', 'RUN'],
  'Defense': ['TAK', 'POW', 'BSH', 'FMV', 'PMV', 'PUR'],
  'Coverage': ['MCV', 'ZCV', 'PRS'],
  'Special Teams': ['RET', 'KPW', 'KAC', 'LSP'],
};

// Position groups by unit
const POSITION_GROUPS = {
  offense: {
    'QB': { positions: ['QB'], label: 'Quarterback', order: 1 },
    'HB': { positions: ['HB'], label: 'Halfback', order: 2 },
    'FB': { positions: ['FB'], label: 'Fullback', order: 3 },
    'WR': { positions: ['WR'], label: 'Wide Receiver', order: 4 },
    'TE': { positions: ['TE'], label: 'Tight End', order: 5 },
    'LT': { positions: ['LT'], label: 'Left Tackle', order: 6 },
    'LG': { positions: ['LG'], label: 'Left Guard', order: 7 },
    'C': { positions: ['C'], label: 'Center', order: 8 },
    'RG': { positions: ['RG'], label: 'Right Guard', order: 9 },
    'RT': { positions: ['RT'], label: 'Right Tackle', order: 10 },
  },
  defense: {
    'LEDG': { positions: ['LEDG'], label: 'Left Edge', order: 1 },
    'DT': { positions: ['DT'], label: 'Defensive Tackle', order: 2 },
    'REDG': { positions: ['REDG'], label: 'Right Edge', order: 3 },
    'SAM': { positions: ['SAM'], label: 'SAM Linebacker', order: 4 },
    'MIKE': { positions: ['MIKE'], label: 'MIKE Linebacker', order: 5 },
    'WILL': { positions: ['WILL'], label: 'WILL Linebacker', order: 6 },
    'CB': { positions: ['CB'], label: 'Cornerback', order: 7 },
    'FS': { positions: ['FS'], label: 'Free Safety', order: 8 },
    'SS': { positions: ['SS'], label: 'Strong Safety', order: 9 },
  },
  specialTeams: {
    'K': { positions: ['K'], label: 'Kicker', order: 1 },
    'P': { positions: ['P'], label: 'Punter', order: 2 },
  },
};

// Sortable wrapper for archetype group cards
const SortableGroupCard = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Paper ref={setNodeRef} style={style} elevation={1} sx={{ p: 2, mb: 2, position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 8, left: 4, cursor: isDragging ? 'grabbing' : 'grab', color: 'text.secondary' }} aria-label="Drag to reorder" {...attributes} {...listeners}>
        <DragIndicatorIcon fontSize="small" />
      </Box>
      <Box sx={{ ml: 3 }}>
        {children}
      </Box>
    </Paper>
  );
};

const RosterDepthChart = () => {
  const { id: dynastyId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { players, isLoading } = useSelector((state) => state.player);

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPlayer, setDeletingPlayer] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [unit, setUnit] = useState('offense');

  // View mode: 'position' or 'archetype'
  const [viewMode, setViewMode] = useState('position');

  // Archetype group config state
  const [archetypeGroups, setArchetypeGroups] = useState(null);
  const [archetypeDefaults, setArchetypeDefaults] = useState(null);
  const [archetypeConfigOpen, setArchetypeConfigOpen] = useState(false);
  const [archetypeConfigValues, setArchetypeConfigValues] = useState([]);
  const [archetypeConfigSaving, setArchetypeConfigSaving] = useState(false);
  const [archetypeConfigUnit, setArchetypeConfigUnit] = useState('offense');
  const archetypeGroupIdRef = useRef(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Add player dialog state
  const [addPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);
  const [addPlayerFormData, setAddPlayerFormData] = useState({
    first_name: '',
    last_name: '',
    position: '',
    jersey_number: '',
    year: '',
    overall_rating: '',
    height: '',
    weight: '',
    dev_trait: '',
    archetype: '',
    abilities: {},
    attributes: {},
    stat_caps: {},
    redshirted: false,
  });
  const [addPlayerError, setAddPlayerError] = useState(null);
  const [addPlayerLoading, setAddPlayerLoading] = useState(false);

  // Edit player state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editError, setEditError] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Get relevant attributes for add and edit forms based on stud score config
  const addFormStudScoreAttrs = useStudScoreAttributes(dynastyId, addPlayerFormData.position, addPlayerFormData.archetype);
  const editFormStudScoreAttrs = useStudScoreAttributes(dynastyId, editFormData.position, editFormData.archetype);

  useEffect(() => {
    dispatch(getPlayers(dynastyId));
  }, [dispatch, dynastyId]);

  // Load archetype group configuration
  const loadArchetypeGroups = useCallback(async () => {
    try {
      const data = await depthChartService.getArchetypeGroups(dynastyId);
      setArchetypeGroups(data.archetypeGroups);
      setArchetypeDefaults(data.defaults);
    } catch (err) {
      console.error('Failed to load archetype groups:', err);
    }
  }, [dynastyId]);

  useEffect(() => {
    loadArchetypeGroups();
  }, [loadArchetypeGroups]);

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleUnitChange = (event, newUnit) => {
    if (newUnit !== null) {
      setUnit(newUnit);
    }
  };

  const handlePlayerClick = (player) => {
    setSelectedPlayer(player);
    setDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedPlayer(null);
  };

  const handlePlayerChange = (event, newPlayer) => {
    if (newPlayer) {
      setSelectedPlayer(newPlayer);
    }
  };

  const handleEditPlayer = () => {
    if (selectedPlayer) {
      setEditingPlayer(selectedPlayer);
      setEditFormData({
        first_name: selectedPlayer.first_name || '',
        last_name: selectedPlayer.last_name || '',
        position: selectedPlayer.position || '',
        jersey_number: selectedPlayer.jersey_number || '',
        year: selectedPlayer.year || '',
        overall_rating: selectedPlayer.overall_rating || '',
        height: selectedPlayer.height || '',
        weight: selectedPlayer.weight || '',
        dev_trait: selectedPlayer.dev_trait || '',
        archetype: selectedPlayer.archetype || '',
        abilities: selectedPlayer.abilities || {},
        attributes: selectedPlayer.attributes || {},
        dealbreakers: selectedPlayer.dealbreakers || [],
        stat_caps: selectedPlayer.stat_caps || {},
        transfer_intent: selectedPlayer.transfer_intent || false,
        redshirted: selectedPlayer.redshirted || false,
        redshirt_used: selectedPlayer.redshirt_used || false,
      });
      setEditDialogOpen(true);
      setEditError(null);
      // Close the detail dialog to show edit dialog
      setDetailDialogOpen(false);
    }
  };

  const handleDeleteClick = (player) => {
    setDeletingPlayer(player);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPlayer) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await dispatch(deletePlayer({ 
        dynastyId, 
        playerId: deletingPlayer.id 
      })).unwrap();
      
      setDeleteDialogOpen(false);
      setDeletingPlayer(null);
      
      // If we're viewing the deleted player, close the detail dialog
      if (selectedPlayer?.id === deletingPlayer.id) {
        setDetailDialogOpen(false);
        setSelectedPlayer(null);
      }
    } catch (error) {
      setDeleteError(error || 'Failed to delete player');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeletingPlayer(null);
    setDeleteError(null);
  };

  // Add player dialog handlers
  const handleOpenAddPlayer = (position) => {
    setAddPlayerFormData({
      first_name: '',
      last_name: '',
      position: position,
      jersey_number: '',
      year: '',
      overall_rating: '',
      height: '',
      weight: '',
      dev_trait: '',
      archetype: '',
      abilities: {},
      attributes: {},
      stat_caps: {},
      redshirted: false,
    });
    setAddPlayerError(null);
    setAddPlayerDialogOpen(true);
  };

  const handleCloseAddPlayer = () => {
    setAddPlayerDialogOpen(false);
    setAddPlayerFormData({
      first_name: '',
      last_name: '',
      position: '',
      jersey_number: '',
      year: '',
      overall_rating: '',
      height: '',
      weight: '',
      dev_trait: '',
      archetype: '',
      abilities: {},
      attributes: {},
      stat_caps: {},
      redshirted: false,
    });
    setAddPlayerError(null);
  };

  const handleAddPlayerChange = (e) => {
    const updates = { [e.target.name]: e.target.value };
    // Reset archetype and abilities when position changes
    if (e.target.name === 'position') {
      updates.archetype = '';
      updates.abilities = {};
    }
    // Reset abilities when archetype changes
    if (e.target.name === 'archetype') {
      updates.abilities = {};
    }
    setAddPlayerFormData({
      ...addPlayerFormData,
      ...updates,
    });
    if (addPlayerError) setAddPlayerError(null);
  };

  const handleAddPlayerAttributeChange = (e) => {
    const { name, value } = e.target;
    setAddPlayerFormData({
      ...addPlayerFormData,
      attributes: {
        ...addPlayerFormData.attributes,
        [name]: value ? parseInt(value) : null,
      },
    });
    if (addPlayerError) setAddPlayerError(null);
  };

  const handleAddPlayerStatCapsChange = (newStatCaps) => {
    setAddPlayerFormData({
      ...addPlayerFormData,
      stat_caps: newStatCaps,
    });
    if (addPlayerError) setAddPlayerError(null);
  };

  const handleAddPlayerAbilityChange = (newAbilities) => {
    setAddPlayerFormData({
      ...addPlayerFormData,
      abilities: newAbilities,
    });
    if (addPlayerError) setAddPlayerError(null);
  };

  const handleAddPlayerSubmit = async (e) => {
    e.preventDefault();
    setAddPlayerError(null);
    setAddPlayerLoading(true);

    try {
      // Filter out null/empty attribute values before sending
      const filteredAttributes = Object.entries(addPlayerFormData.attributes)
        .filter(([, value]) => value !== null && value !== '')
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      const playerData = {
        ...addPlayerFormData,
        jersey_number: addPlayerFormData.jersey_number ? parseInt(addPlayerFormData.jersey_number) : null,
        overall_rating: addPlayerFormData.overall_rating ? parseInt(addPlayerFormData.overall_rating) : null,
        weight: addPlayerFormData.weight ? parseInt(addPlayerFormData.weight) : null,
        attributes: Object.keys(filteredAttributes).length > 0 ? filteredAttributes : undefined,
        abilities: Object.keys(addPlayerFormData.abilities || {}).length > 0 ? addPlayerFormData.abilities : undefined,
        stat_caps: addPlayerFormData.position && Object.keys(addPlayerFormData.stat_caps).length > 0 ? addPlayerFormData.stat_caps : undefined,
        redshirted: addPlayerFormData.redshirted || false,
      };

      await playerService.createPlayer(dynastyId, playerData);
      
      // Refresh the player list
      dispatch(getPlayers(dynastyId));
      
      // Close the dialog
      handleCloseAddPlayer();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to add player. Please try again.';
      setAddPlayerError(errorMessage);
      console.error('Add player error:', error);
    } finally {
      setAddPlayerLoading(false);
    }
  };

  // Edit player handlers
  const handleEditChange = (e) => {
    const updates = { [e.target.name]: e.target.value };
    // Reset archetype and abilities when position changes
    if (e.target.name === 'position') {
      updates.archetype = '';
      updates.abilities = {};
    }
    // Reset abilities when archetype changes
    if (e.target.name === 'archetype') {
      updates.abilities = {};
    }
    setEditFormData({
      ...editFormData,
      ...updates,
    });
    if (editError) setEditError(null);
  };

  const handleEditAttributeChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      attributes: {
        ...editFormData.attributes,
        [name]: value ? parseInt(value) : null,
      },
    });
    if (editError) setEditError(null);
  };

  const handleEditStatCapsChange = (newStatCaps) => {
    setEditFormData({
      ...editFormData,
      stat_caps: newStatCaps,
    });
    if (editError) setEditError(null);
  };

  const handleEditAbilityChange = (newAbilities) => {
    setEditFormData({
      ...editFormData,
      abilities: newAbilities,
    });
    if (editError) setEditError(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);
    setEditLoading(true);

    try {
      const filteredAttributes = Object.entries(editFormData.attributes)
        .filter(([_, value]) => value !== null && value !== '')
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      const playerData = {
        ...editFormData,
        jersey_number: editFormData.jersey_number ? parseInt(editFormData.jersey_number) : null,
        overall_rating: editFormData.overall_rating ? parseInt(editFormData.overall_rating) : null,
        weight: editFormData.weight ? parseInt(editFormData.weight) : null,
        attributes: Object.keys(filteredAttributes).length > 0 ? filteredAttributes : undefined,
        abilities: editFormData.abilities && Object.keys(editFormData.abilities).length > 0 ? editFormData.abilities : undefined,
        dealbreakers: editFormData.dealbreakers.length > 0 ? editFormData.dealbreakers : undefined,
        stat_caps: editFormData.position && Object.keys(editFormData.stat_caps).length > 0 ? editFormData.stat_caps : undefined,
        transfer_intent: editFormData.transfer_intent || false,
        redshirted: editFormData.redshirted || false,
      };

      await dispatch(updatePlayer({ 
        dynastyId, 
        playerId: editingPlayer.id, 
        playerData 
      })).unwrap();
      
      setEditDialogOpen(false);
      setEditingPlayer(null);
      setEditFormData({});
      setSelectedPlayer(null);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update player. Please try again.';
      setEditError(errorMessage);
      console.error('Update player error:', error);
    } finally {
      setEditLoading(false);
    }
  };

  const getDevTraitColor = (trait) => {
    return DEV_TRAIT_COLORS[trait] || 'default';
  };

  // Group players by position for the current unit
  const groupedPlayers = React.useMemo(() => {
    const groups = POSITION_GROUPS[unit];
    const result = {};
    const activePlayers = (players || []).filter((p) => p.year !== 'GRAD');

    Object.entries(groups).forEach(([groupKey, groupInfo]) => {
      const groupPlayers = activePlayers.filter(p =>
        groupInfo.positions.includes(p.position)
      );
      
      // Sort by stud_score or overall_rating
      groupPlayers.sort((a, b) => {
        const scoreA = a.stud_score ?? a.overall_rating ?? 0;
        const scoreB = b.stud_score ?? b.overall_rating ?? 0;
        return scoreB - scoreA;
      });

      result[groupKey] = {
        ...groupInfo,
        players: groupPlayers,
      };
    });

    return result;
  }, [players, unit]);

  // Group players by archetype groups for the current unit
  const archetypeGroupedPlayers = React.useMemo(() => {
    const activeGroups = archetypeGroups?.[unit] || archetypeDefaults?.[unit] || [];
    const activePlayers = (players || []).filter((p) => p.year !== 'GRAD');
    
    // Process groups in order to track starters for unique starter enforcement
    const starterIds = new Set();
    
    return activeGroups
      .slice()
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((group, index) => {
      let groupPlayers = activePlayers.filter(p => {
        // Player must match one of the group's positions
        if (!group.positions.includes(p.position)) return false;
        // If archetypes is empty, match all players at those positions
        if (!group.archetypes || group.archetypes.length === 0) return true;
        // Otherwise player archetype must match
        return group.archetypes.includes(p.archetype);
      });

      // If this group requires a unique starter, exclude players who
      // were the starter (first position) in a previous group
      if (group.require_unique_starter) {
        groupPlayers = groupPlayers.filter(p => !starterIds.has(p.id));
      }

      // Sort by stud_score or overall_rating
      groupPlayers.sort((a, b) => {
        const scoreA = a.stud_score ?? a.overall_rating ?? 0;
        const scoreB = b.stud_score ?? b.overall_rating ?? 0;
        return scoreB - scoreA;
      });

      // Track the starter (first player) of this group
      if (groupPlayers.length > 0) {
        starterIds.add(groupPlayers[0].id);
      }

      return {
        key: `archetype-${index}`,
        label: group.group_name,
        positions: group.positions,
        players: groupPlayers,
        order: group.display_order ?? index + 1,
      };
    });
  }, [players, unit, archetypeGroups, archetypeDefaults]);

  // Archetype config dialog handlers
  const assignGroupIds = (groups) => {
    return groups.map(g => {
      archetypeGroupIdRef.current += 1;
      return { ...g, _id: `grp-${archetypeGroupIdRef.current}` };
    });
  };

  const handleOpenArchetypeConfig = () => {
    const currentGroups = archetypeGroups || archetypeDefaults || {};
    setArchetypeConfigUnit('offense');
    setArchetypeConfigValues(
      assignGroupIds(JSON.parse(JSON.stringify(currentGroups.offense || [])))
    );
    setArchetypeConfigOpen(true);
  };

  const handleArchetypeConfigUnitChange = (newUnit) => {
    // Save current unit values before switching
    const currentGroups = archetypeGroups || archetypeDefaults || {};
    const allValues = { ...currentGroups };
    allValues[archetypeConfigUnit] = archetypeConfigValues;
    
    setArchetypeConfigUnit(newUnit);
    setArchetypeConfigValues(
      assignGroupIds(JSON.parse(JSON.stringify(allValues[newUnit] || [])))
    );
  };

  const handleAddArchetypeGroup = () => {
    archetypeGroupIdRef.current += 1;
    setArchetypeConfigValues(prev => [
      ...prev,
      { group_name: '', positions: [], archetypes: [], display_order: prev.length + 1, require_unique_starter: false, _id: `grp-${archetypeGroupIdRef.current}` }
    ]);
  };

  const handleRemoveArchetypeGroup = (index) => {
    setArchetypeConfigValues(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragEndArchetypeGroup = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setArchetypeConfigValues(prev => {
        const oldIndex = prev.findIndex(g => g._id === active.id);
        const newIndex = prev.findIndex(g => g._id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleArchetypeGroupFieldChange = (index, field, value) => {
    setArchetypeConfigValues(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // If positions changed, filter out archetypes that are no longer valid
      if (field === 'positions') {
        const validArchetypes = new Set();
        (value || []).forEach(pos => {
          (POSITION_ARCHETYPES[pos] || []).forEach(arch => validArchetypes.add(arch));
        });
        updated[index].archetypes = (updated[index].archetypes || []).filter(a => validArchetypes.has(a));
      }
      return updated;
    });
  };

  const handleSaveArchetypeConfig = async () => {
    try {
      setArchetypeConfigSaving(true);
      const currentGroups = archetypeGroups || archetypeDefaults || {};
      const configToSave = { ...currentGroups };
      // Apply current tab values
      configToSave[archetypeConfigUnit] = archetypeConfigValues.map((g, i) => {
        const { _id, ...rest } = g;
        return { ...rest, display_order: i + 1 };
      });

      await depthChartService.saveArchetypeGroups(dynastyId, configToSave);
      await loadArchetypeGroups();
      setArchetypeConfigOpen(false);
      setSnackbar({ open: true, message: 'Archetype groups saved.', severity: 'success' });
    } catch (err) {
      console.error('Failed to save archetype groups:', err);
      const msg = err?.response?.data?.error || 'Failed to save archetype groups.';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setArchetypeConfigSaving(false);
    }
  };

  const handleResetArchetypeConfig = async () => {
    try {
      await depthChartService.resetArchetypeGroups(dynastyId);
      await loadArchetypeGroups();
      setArchetypeConfigOpen(false);
      setSnackbar({ open: true, message: 'Archetype groups reset to defaults.', severity: 'success' });
    } catch (err) {
      console.error('Failed to reset archetype groups:', err);
      setSnackbar({ open: true, message: 'Failed to reset archetype groups.', severity: 'error' });
    }
  };

  // Get available archetypes for a set of positions
  const getAvailableArchetypes = (positions) => {
    const archetypes = new Set();
    (positions || []).forEach(pos => {
      (POSITION_ARCHETYPES[pos] || []).forEach(arch => archetypes.add(arch));
    });
    return Array.from(archetypes).sort();
  };

  // Helper function to get potential percentage display value
  const getPotentialDisplay = (player) => {
    // If stat_caps doesn't exist or is empty, return "Unknown"
    if (!player.stat_caps || typeof player.stat_caps !== 'object' || Object.keys(player.stat_caps).length === 0) {
      return 'Unknown';
    }

    // If position is missing, return "Unknown"
    if (!player.position) {
      return 'Unknown';
    }

    // Check if any stat groups have been purchased
    const summary = getStatCapSummary(player.stat_caps, player.position, player.archetype);
    if (summary.purchasedBlocks === 0) {
      return 'Unknown';
    }

    // Otherwise, return the potential score as a percentage
    return `${summary.potentialScore}%`;
  };

  // Render a compact player card
  const renderPlayerCard = (player) => {
    if (!player) return null;
    const devTraitColor = getDevTraitColor(player.dev_trait);

    return (
      <Card 
        key={player.id}
        onClick={() => handlePlayerClick(player)}
        sx={{ 
          cursor: 'pointer',
          minWidth: 140,
          maxWidth: 180,
          border: '2px solid',
          borderColor: devTraitColor === 'default' ? 'divider' : `${devTraitColor}.main`,
          '&:hover': { 
            boxShadow: 4,
            transform: 'translateY(-2px)',
            transition: 'all 0.2s'
          },
          transition: 'all 0.2s',
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight="bold" noWrap>
                {player.first_name} {player.last_name}
              </Typography>
              <Box sx={CHIP_CONTAINER_STYLES}>
                <Chip label={`#${player.jersey_number}`} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
                <Chip label={player.position} size="small" color="primary" sx={{ height: 18, fontSize: '0.7rem' }} />
                <Chip label={player.year} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right', ml: 1 }}>
              <Typography variant="h6" color="primary" lineHeight={1}>
                {player.stud_score ?? player.overall_rating ?? '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary" lineHeight={1}>
                {player.stud_score != null ? 'STUD' : 'OVR'}
              </Typography>
            </Box>
          </Box>

          {player.dev_trait && (
            <Chip 
              label={player.dev_trait} 
              size="small" 
              color={getDevTraitColor(player.dev_trait)}
              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 'bold', mt: 0.5 }}
            />
          )}

          {player.archetype && (
            <Chip 
              label={player.archetype} 
              size="small" 
              variant="outlined"
              color="secondary"
              sx={{ height: 18, fontSize: '0.65rem', mt: 0.5 }}
            />
          )}

          {/* Physical Attributes */}
          {(player.height || player.weight) && (
            <Box sx={CHIP_CONTAINER_STYLES}>
              {player.height && (
                <Chip 
                  label={player.height} 
                  size="small" 
                  variant="outlined"
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              )}
              {player.weight && (
                <Chip 
                  label={`${player.weight} lbs`} 
                  size="small" 
                  variant="outlined"
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              )}
            </Box>
          )}

          {/* Transfer Intent Indicator */}
          {player.transfer_intent && (
            <Chip 
              icon={<TransferIcon sx={{ fontSize: '0.75rem' }} />}
              label="Transfer" 
              size="small" 
              color="error"
              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 'bold', mt: 0.5 }}
            />
          )}

          {/* Potential Percentage */}
          <Box sx={{ mt: 0.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Potential: {getPotentialDisplay(player)}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render position group section
  const renderPositionGroup = (groupKey, groupData) => {
    const { label, players: groupPlayers, positions } = groupData;

    return (
      <Box key={groupKey} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 2, gap: 2 }}>
          <Typography variant="h6" sx={{ 
            borderBottom: 2, 
            borderColor: 'primary.main',
            pb: 0.5,
          }}>
            {label}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => handleOpenAddPlayer(positions[0])}
          >
            Add Player
          </Button>
        </Box>
        {groupPlayers.length > 0 ? (
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5, 
            flexWrap: 'wrap',
            alignItems: 'flex-start'
          }}>
            {groupPlayers.map(player => renderPlayerCard(player))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', ml: 2 }}>
            No players at this position
          </Typography>
        )}
      </Box>
    );
  };

  // Render archetype group section
  const renderArchetypeGroup = (groupData) => {
    const { key, label, players: groupPlayers, positions } = groupData;

    return (
      <Box key={key} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 2, gap: 2 }}>
          <Typography variant="h6" sx={{ 
            borderBottom: 2, 
            borderColor: 'secondary.main',
            pb: 0.5,
          }}>
            {label}
          </Typography>
          {positions.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => handleOpenAddPlayer(positions[0])}
            >
              Add Player
            </Button>
          )}
        </Box>
        {groupPlayers.length > 0 ? (
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5, 
            flexWrap: 'wrap',
            alignItems: 'flex-start'
          }}>
            {groupPlayers.map(player => renderPlayerCard(player))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', ml: 2 }}>
            No players in this group
          </Typography>
        )}
      </Box>
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const activePlayers = (players || []).filter((player) => player.year !== 'GRAD');
  const hasPlayers = activePlayers.length > 0;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1">
          Roster Depth Chart
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => navigate(`/dynasties/${dynastyId}/roster/manage`)}
          >
            Manage Roster
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate(`/dynasties/${dynastyId}/recruiter-hub`)}
          >
            Recruiter Hub
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => navigate(`/dynasties/${dynastyId}/graduates`)}
          >
            Graduates
          </Button>
        </Box>
      </Box>

      {hasPlayers && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            value={unit}
            exclusive
            onChange={handleUnitChange}
            aria-label="unit selection"
            color="primary"
          >
            <ToggleButton value="offense">
              Offense
            </ToggleButton>
            <ToggleButton value="defense">
              Defense
            </ToggleButton>
            <ToggleButton value="specialTeams">
              Special Teams
            </ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="view mode"
            color="secondary"
            size="small"
          >
            <ToggleButton value="position">
              <ViewModuleIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
              Position
            </ToggleButton>
            <ToggleButton value="archetype">
              <CategoryIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
              Archetype
            </ToggleButton>
          </ToggleButtonGroup>

          {viewMode === 'archetype' && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<SettingsIcon />}
              onClick={handleOpenArchetypeConfig}
            >
              Configure Groups
            </Button>
          )}
        </Box>
      )}

      {!hasPlayers ? (
        <Card>
          <CardContent>
            <Typography variant="body1" align="center">
              No players found. Use Manage Roster to add players.
            </Typography>
          </CardContent>
        </Card>
      ) : viewMode === 'position' ? (
        <Paper elevation={2} sx={{ p: 3, bgcolor: 'background.default' }}>
          {Object.entries(groupedPlayers)
            .sort(([, a], [, b]) => a.order - b.order)
            .map(([groupKey, groupData]) => renderPositionGroup(groupKey, groupData))}
        </Paper>
      ) : (
        <Paper elevation={2} sx={{ p: 3, bgcolor: 'background.default' }}>
          {archetypeGroupedPlayers.length > 0 ? (
            archetypeGroupedPlayers
              .sort((a, b) => a.order - b.order)
              .map(groupData => renderArchetypeGroup(groupData))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center' }}>
              No archetype groups configured for this unit. Click &quot;Configure Groups&quot; to set up groups.
            </Typography>
          )}
        </Paper>
      )}

      {/* Player Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1, mr: 2 }}>
              <Autocomplete
                value={selectedPlayer}
                onChange={handlePlayerChange}
                options={activePlayers}
                loading={isLoading}
                disabled={isLoading}
                getOptionLabel={(player) => 
                  `${player.first_name} ${player.last_name} - #${player.jersey_number} ${player.position}`
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Choose a player..."
                    size="small"
                    label="Select Player"
                  />
                )}
                sx={{ minWidth: 300 }}
              />
            </Box>
            <IconButton onClick={handleCloseDetail}>
              <CloseIcon />
            </IconButton>
          </Box>
          {selectedPlayer && (
            <Box>
              <Typography variant="h5">
                {selectedPlayer.first_name} {selectedPlayer.last_name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip label={`#${selectedPlayer.jersey_number}`} size="small" />
                <Chip label={selectedPlayer.position} size="small" color="primary" />
                <Chip label={selectedPlayer.year} size="small" />
                {selectedPlayer.redshirted && (
                  <Chip label="Redshirted" size="small" color="warning" variant="outlined" />
                )}
                {selectedPlayer.redshirt_used && !selectedPlayer.redshirted && (
                  <Chip label="Redshirt Used" size="small" color="default" variant="outlined" />
                )}
                {selectedPlayer.dev_trait && (
                  <Chip 
                    label={selectedPlayer.dev_trait} 
                    size="small" 
                    color={getDevTraitColor(selectedPlayer.dev_trait)}
                    sx={{ fontWeight: 'bold' }}
                  />
                )}
                {selectedPlayer.archetype && (
                  <Chip 
                    label={selectedPlayer.archetype} 
                    size="small" 
                    variant="outlined"
                    color="secondary"
                  />
                )}
              </Box>
            </Box>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {selectedPlayer && (
            <>
              {/* Overall Stats */}
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">
                      Overall
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {selectedPlayer.overall_rating ?? '-'}
                    </Typography>
                  </Grid>
                  {selectedPlayer.stud_score != null && (
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">
                        Stud Score
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {selectedPlayer.stud_score}
                      </Typography>
                    </Grid>
                  )}
                  {selectedPlayer.potential_score != null && (
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">
                        Potential
                      </Typography>
                      <Typography variant="h4" color="secondary">
                        {selectedPlayer.potential_score}%
                      </Typography>
                    </Grid>
                  )}
                  {selectedPlayer.adjusted_stud_score != null && (
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">
                        Adjusted Score
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {selectedPlayer.adjusted_stud_score}
                      </Typography>
                    </Grid>
                  )}
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">
                      Height
                    </Typography>
                    <Typography variant="h6">
                      {selectedPlayer.height ?? '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">
                      Weight
                    </Typography>
                    <Typography variant="h6">
                      {selectedPlayer.weight ?? '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Stat Caps Section */}
              {selectedPlayer.stat_caps && Object.keys(selectedPlayer.stat_caps).length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" color="primary" gutterBottom>
                    Stat Caps Summary
                  </Typography>
                  {(() => {
                    const summary = getStatCapSummary(selectedPlayer.stat_caps, selectedPlayer.position, selectedPlayer.archetype);
                    return (
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ 
                            p: 1.5, 
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            textAlign: 'center'
                          }}>
                            <Typography variant="caption" color="text.secondary">
                              Purchased Blocks
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {summary.purchasedBlocks} / {summary.totalBlocks}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ 
                            p: 1.5, 
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            textAlign: 'center'
                          }}>
                            <Typography variant="caption" color="text.secondary">
                              Capped Blocks
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {summary.cappedBlocks}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ 
                            p: 1.5, 
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            textAlign: 'center'
                          }}>
                            <Typography variant="caption" color="text.secondary">
                              Available Blocks
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {summary.availableBlocks}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ 
                            p: 1.5, 
                            border: '1px solid',
                            borderColor: 'primary.main',
                            borderRadius: 1,
                            textAlign: 'center',
                            bgcolor: 'primary.50'
                          }}>
                            <Typography variant="caption" color="text.secondary">
                              Potential Score
                            </Typography>
                            <Typography variant="h6" fontWeight="bold" color="primary">
                              {summary.potentialScore}%
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    );
                  })()}
                  <Box sx={{ mt: 2 }}>
                    <StatCapEditor
                      position={selectedPlayer.position}
                      archetype={selectedPlayer.archetype || undefined}
                      statCaps={selectedPlayer.stat_caps}
                      readOnly={true}
                    />
                  </Box>
                </Box>
              )}

              {/* Attributes by Category */}
              {Object.entries(ATTRIBUTE_CATEGORIES).map(([category, attributes]) => {
                const relevantAttributes = attributes.filter(
                  attr => selectedPlayer.attributes?.[attr] !== undefined && 
                         selectedPlayer.attributes?.[attr] !== null
                );
                
                if (relevantAttributes.length === 0) return null;

                return (
                  <Box key={category} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      {category}
                    </Typography>
                    <Grid container spacing={1}>
                      {relevantAttributes.map(attr => (
                        <Grid item xs={6} sm={4} md={3} key={attr}>
                          <Box sx={{ 
                            p: 1, 
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            textAlign: 'center'
                          }}>
                            <Typography variant="caption" color="text.secondary">
                              {ATTRIBUTE_DISPLAY_NAMES[attr] || attr}
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {selectedPlayer.attributes[attr]}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                );
              })}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => handleDeleteClick(selectedPlayer)}
          >
            Delete Player
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEditPlayer}
          >
            Edit Player
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <Typography>
            Are you sure you want to delete {deletingPlayer?.first_name} {deletingPlayer?.last_name}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Player Dialog */}
      <Dialog 
        open={addPlayerDialogOpen} 
        onClose={handleCloseAddPlayer}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5">
              Add New Player
            </Typography>
            <IconButton onClick={handleCloseAddPlayer}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {addPlayerError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {addPlayerError}
            </Alert>
          )}

          <form onSubmit={handleAddPlayerSubmit} id="add-player-form">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="first_name"
                  value={addPlayerFormData.first_name}
                  onChange={handleAddPlayerChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="last_name"
                  value={addPlayerFormData.last_name}
                  onChange={handleAddPlayerChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Position"
                  name="position"
                  value={addPlayerFormData.position}
                  onChange={handleAddPlayerChange}
                  required
                  SelectProps={{ native: true }}
                >
                  <option value="" disabled>Select a position</option>
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Jersey Number"
                  name="jersey_number"
                  type="number"
                  value={addPlayerFormData.jersey_number}
                  onChange={handleAddPlayerChange}
                  inputProps={{ min: 0, max: 99 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Year"
                  name="year"
                  value={addPlayerFormData.year}
                  onChange={handleAddPlayerChange}
                  SelectProps={{ native: true }}
                >
                  <option value="">Select a year</option>
                  {YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Overall Rating"
                  name="overall_rating"
                  type="number"
                  value={addPlayerFormData.overall_rating}
                  onChange={handleAddPlayerChange}
                  inputProps={{ min: 40, max: 99 }}
                  helperText="Overall rating (40-99)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <HeightInput
                  value={addPlayerFormData.height}
                  onChange={handleAddPlayerChange}
                  name="height"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Weight"
                  name="weight"
                  type="number"
                  value={addPlayerFormData.weight}
                  onChange={handleAddPlayerChange}
                  inputProps={{ min: 150, max: 400 }}
                  helperText="Weight in pounds"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Dev Trait"
                  name="dev_trait"
                  value={addPlayerFormData.dev_trait}
                  onChange={handleAddPlayerChange}
                  SelectProps={{ native: true }}
                >
                  <option value="">Select a dev trait</option>
                  {DEV_TRAITS.map((trait) => (
                    <option key={trait} value={trait}>
                      {trait}
                    </option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={addPlayerFormData.redshirted || false}
                      onChange={(e) => {
                        setAddPlayerFormData({
                          ...addPlayerFormData,
                          redshirted: e.target.checked,
                        });
                        if (addPlayerError) setAddPlayerError(null);
                      }}
                      name="redshirted"
                      color="warning"
                    />
                  }
                  label="Redshirt this player for the current season"
                />
              </Grid>
              {addPlayerFormData.position && POSITION_ARCHETYPES[addPlayerFormData.position] && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    select
                    label="Archetype"
                    name="archetype"
                    value={addPlayerFormData.archetype}
                    onChange={handleAddPlayerChange}
                    SelectProps={{ native: true }}
                  >
                    <option value="">Select an archetype</option>
                    {POSITION_ARCHETYPES[addPlayerFormData.position].map((arch) => (
                      <option key={arch} value={arch}>
                        {arch}
                      </option>
                    ))}
                  </TextField>
                </Grid>
              )}

              {addPlayerFormData.position && addPlayerFormData.archetype && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Abilities (Optional)
                  </Typography>
                  <AbilitySelector
                    position={addPlayerFormData.position}
                    archetype={addPlayerFormData.archetype}
                    abilities={addPlayerFormData.abilities}
                    onChange={handleAddPlayerAbilityChange}
                  />
                </Grid>
              )}
              
              {/* Player Attributes Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Player Attributes (Optional)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Enter individual player ratings. All fields are optional. Values should be between 40-99.
                </Typography>
                
                {Object.entries(ATTRIBUTE_CATEGORIES).map(([category, attributes]) => {
                  const filteredAttrs = addFormStudScoreAttrs
                    ? attributes.filter(attr => addFormStudScoreAttrs.has(attr))
                    : attributes;
                  if (filteredAttrs.length === 0) return null;
                  return (
                    <Accordion key={category} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{category} Attributes</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          {filteredAttrs.map((attr) => (
                            <Grid item xs={6} sm={4} md={3} key={attr}>
                              <TextField
                                fullWidth
                                label={`${attr} - ${ATTRIBUTE_DISPLAY_NAMES[attr]}`}
                                name={attr}
                                type="number"
                                value={addPlayerFormData.attributes[attr] || ''}
                                onChange={handleAddPlayerAttributeChange}
                                inputProps={{ min: 40, max: 99 }}
                                size="small"
                              />
                            </Grid>
                          ))}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Grid>
              
              {/* Stat Caps Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                {addPlayerFormData.position && (
                  <StatCapEditor
                    position={addPlayerFormData.position}
                    archetype={addPlayerFormData.archetype || undefined}
                    statCaps={addPlayerFormData.stat_caps}
                    onChange={handleAddPlayerStatCapsChange}
                    dynastyId={dynastyId}
                  />
                )}
                {!addPlayerFormData.position && (
                  <Alert severity="info">
                    Select a position above to configure stat caps
                  </Alert>
                )}
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseAddPlayer}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-player-form"
            variant="contained"
            disabled={addPlayerLoading}
            startIcon={addPlayerLoading ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {addPlayerLoading ? 'Adding...' : 'Add Player'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Player</DialogTitle>
        <DialogContent>
          {editError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editError}
            </Alert>
          )}

          <form onSubmit={handleEditSubmit} id="edit-player-form">
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="first_name"
                  value={editFormData.first_name || ''}
                  onChange={handleEditChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="last_name"
                  value={editFormData.last_name || ''}
                  onChange={handleEditChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Position"
                  name="position"
                  value={editFormData.position || ''}
                  onChange={handleEditChange}
                  required
                  SelectProps={{ native: true }}
                >
                  <option value="" disabled>Select a position</option>
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Jersey Number"
                  name="jersey_number"
                  type="number"
                  value={editFormData.jersey_number || ''}
                  onChange={handleEditChange}
                  inputProps={{ min: 0, max: 99 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Year"
                  name="year"
                  value={editFormData.year || ''}
                  onChange={handleEditChange}
                  SelectProps={{ native: true }}
                >
                  <option value="">Select a year</option>
                  {YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Overall Rating"
                  name="overall_rating"
                  type="number"
                  value={editFormData.overall_rating || ''}
                  onChange={handleEditChange}
                  inputProps={{ min: 40, max: 99 }}
                  helperText="Overall rating (40-99)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <HeightInput
                  value={editFormData.height || ''}
                  onChange={handleEditChange}
                  name="height"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Weight"
                  name="weight"
                  type="number"
                  value={editFormData.weight || ''}
                  onChange={handleEditChange}
                  inputProps={{ min: 150, max: 400 }}
                  helperText="Weight in pounds"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Dev Trait"
                  name="dev_trait"
                  value={editFormData.dev_trait || ''}
                  onChange={handleEditChange}
                  SelectProps={{ native: true }}
                >
                  <option value="">Select a dev trait</option>
                  {DEV_TRAITS.map((trait) => (
                    <option key={trait} value={trait}>
                      {trait}
                    </option>
                  ))}
                </TextField>
              </Grid>
              {editFormData.position && POSITION_ARCHETYPES[editFormData.position] && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    select
                    label="Archetype"
                    name="archetype"
                    value={editFormData.archetype || ''}
                    onChange={handleEditChange}
                    SelectProps={{ native: true }}
                  >
                    <option value="">Select an archetype</option>
                    {POSITION_ARCHETYPES[editFormData.position].map((arch) => (
                      <option key={arch} value={arch}>
                        {arch}
                      </option>
                    ))}
                  </TextField>
                </Grid>
              )}

              {editFormData.position && editFormData.archetype && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Abilities (Optional)
                  </Typography>
                  <AbilitySelector
                    position={editFormData.position}
                    archetype={editFormData.archetype}
                    abilities={editFormData.abilities || {}}
                    onChange={handleEditAbilityChange}
                  />
                </Grid>
              )}
              
              {/* Transfer Intent */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editFormData.transfer_intent || false}
                      onChange={(e) => {
                        setEditFormData({
                          ...editFormData,
                          transfer_intent: e.target.checked,
                        });
                        if (editError) setEditError(null);
                      }}
                      name="transfer_intent"
                      color="error"
                    />
                  }
                  label="Transfer Intent (dealbreaker not being met)"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editFormData.redshirted || false}
                      onChange={(e) => {
                        setEditFormData({
                          ...editFormData,
                          redshirted: e.target.checked,
                        });
                        if (editError) setEditError(null);
                      }}
                      name="redshirted"
                      color="warning"
                      disabled={Boolean(editFormData.redshirt_used)}
                    />
                  }
                  label={
                    editFormData.redshirt_used
                      ? 'Redshirt already used for this player'
                      : 'Redshirt this player for the current season'
                  }
                />
              </Grid>
              
              {/* Player Attributes Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Player Attributes (Optional)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Update individual player ratings. Values should be between 40-99.
                </Typography>
                
                {Object.entries(ATTRIBUTE_CATEGORIES).map(([category, attributes]) => {
                  const filteredAttrs = editFormStudScoreAttrs
                    ? attributes.filter(attr => editFormStudScoreAttrs.has(attr))
                    : attributes;
                  if (filteredAttrs.length === 0) return null;
                  return (
                    <Accordion key={category} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{category} Attributes</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          {filteredAttrs.map((attr) => (
                            <Grid item xs={6} sm={4} md={3} key={attr}>
                              <TextField
                                fullWidth
                                label={`${attr} - ${ATTRIBUTE_DISPLAY_NAMES[attr]}`}
                                name={attr}
                                type="number"
                                value={editFormData.attributes?.[attr] || ''}
                                onChange={handleEditAttributeChange}
                                inputProps={{ min: 40, max: 99 }}
                                size="small"
                              />
                            </Grid>
                          ))}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Grid>
              
              {/* Stat Caps Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                {editFormData.position && (
                  <StatCapEditor
                    position={editFormData.position}
                    archetype={editFormData.archetype || undefined}
                    statCaps={editFormData.stat_caps || {}}
                    onChange={handleEditStatCapsChange}
                    dynastyId={dynastyId}
                    playerId={editingPlayer?.id}
                  />
                )}
                {!editFormData.position && (
                  <Alert severity="info">
                    Select a position above to configure stat caps
                  </Alert>
                )}
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            type="submit"
            form="edit-player-form"
            variant="contained"
            disabled={editLoading}
            startIcon={editLoading ? <CircularProgress size={20} /> : null}
          >
            {editLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Archetype Group Configuration Dialog */}
      <Dialog open={archetypeConfigOpen} onClose={() => setArchetypeConfigOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Configure Archetype Groups</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Define custom groups that organize players by archetype instead of position.
            Each group has a custom name, source positions, and optional archetype filters.
            Leave archetypes empty to include all players at the selected positions.
          </Typography>

          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={archetypeConfigUnit}
              exclusive
              onChange={(e, val) => val && handleArchetypeConfigUnitChange(val)}
              size="small"
              color="primary"
            >
              <ToggleButton value="offense">Offense</ToggleButton>
              <ToggleButton value="defense">Defense</ToggleButton>
              <ToggleButton value="specialTeams">Special Teams</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEndArchetypeGroup}>
            <SortableContext items={archetypeConfigValues.map(g => g._id)} strategy={verticalListSortingStrategy}>
              {archetypeConfigValues.map((group, index) => (
                <SortableGroupCard key={group._id} id={group._id}>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveArchetypeGroup(index)}
                    sx={{ position: 'absolute', top: 4, right: 4 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Group Name"
                        size="small"
                        fullWidth
                        value={group.group_name || ''}
                        onChange={(e) => handleArchetypeGroupFieldChange(index, 'group_name', e.target.value)}
                        placeholder="e.g. Run Stoppers"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Autocomplete
                        multiple
                        size="small"
                        options={ROSTER_POSITIONS}
                        value={group.positions || []}
                        onChange={(e, val) => handleArchetypeGroupFieldChange(index, 'positions', val)}
                        renderInput={(params) => <TextField {...params} label="Positions" placeholder="Select positions" />}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Autocomplete
                        multiple
                        size="small"
                        options={getAvailableArchetypes(group.positions)}
                        value={group.archetypes || []}
                        onChange={(e, val) => handleArchetypeGroupFieldChange(index, 'archetypes', val)}
                        renderInput={(params) => <TextField {...params} label="Archetypes (empty = all)" placeholder="Select archetypes" />}
                        disabled={!group.positions || group.positions.length === 0}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={group.require_unique_starter || false}
                            onChange={(e) => handleArchetypeGroupFieldChange(index, 'require_unique_starter', e.target.checked)}
                          />
                        }
                        label="Require unique starter (exclude players who are the top player in a previous group)"
                      />
                    </Grid>
                  </Grid>
                </SortableGroupCard>
              ))}
            </SortableContext>
          </DndContext>

          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddArchetypeGroup}
            sx={{ mt: 1 }}
          >
            Add Group
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetArchetypeConfig}>Reset to Defaults</Button>
          <Button onClick={() => setArchetypeConfigOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveArchetypeConfig} variant="contained" disabled={archetypeConfigSaving}>
            {archetypeConfigSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
      />
    </Container>
  );
};

export default RosterDepthChart;
