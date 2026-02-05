import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import playerService from '../../services/playerService';

const initialState = {
  players: [],
  isLoading: false,
  isError: false,
  message: '',
};

export const getPlayers = createAsyncThunk('player/getAll', async (dynastyId, thunkAPI) => {
  try {
    const token = thunkAPI.getState().auth.user.token;
    return await playerService.getPlayers(dynastyId, token);
  } catch (error) {
    const message = error.response?.data?.error || error.message;
    return thunkAPI.rejectWithValue(message);
  }
});

export const createPlayer = createAsyncThunk('player/create', async ({ dynastyId, playerData }, thunkAPI) => {
  try {
    const token = thunkAPI.getState().auth.user.token;
    return await playerService.createPlayer(dynastyId, playerData, token);
  } catch (error) {
    const message = error.response?.data?.error || error.message;
    return thunkAPI.rejectWithValue(message);
  }
});

export const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    reset: (state) => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(getPlayers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getPlayers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.players = action.payload;
      })
      .addCase(getPlayers.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(createPlayer.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createPlayer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.players.push(action.payload);
      })
      .addCase(createPlayer.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset } = playerSlice.actions;
export default playerSlice.reducer;
