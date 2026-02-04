import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dynastyService from '../../services/dynastyService';

const initialState = {
  dynasties: [],
  currentDynasty: null,
  isLoading: false,
  isError: false,
  message: '',
};

export const getDynasties = createAsyncThunk('dynasty/getAll', async (_, thunkAPI) => {
  try {
    const token = thunkAPI.getState().auth.user.token;
    return await dynastyService.getDynasties(token);
  } catch (error) {
    const message = error.response?.data?.error || error.message;
    return thunkAPI.rejectWithValue(message);
  }
});

export const createDynasty = createAsyncThunk('dynasty/create', async (dynastyData, thunkAPI) => {
  try {
    const token = thunkAPI.getState().auth.user.token;
    return await dynastyService.createDynasty(dynastyData, token);
  } catch (error) {
    const message = error.response?.data?.error || error.message;
    return thunkAPI.rejectWithValue(message);
  }
});

export const dynastySlice = createSlice({
  name: 'dynasty',
  initialState,
  reducers: {
    setCurrentDynasty: (state, action) => {
      state.currentDynasty = action.payload;
    },
    reset: (state) => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(getDynasties.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getDynasties.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dynasties = action.payload;
      })
      .addCase(getDynasties.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(createDynasty.fulfilled, (state, action) => {
        state.dynasties.push(action.payload);
      });
  },
});

export const { setCurrentDynasty, reset } = dynastySlice.actions;
export default dynastySlice.reducer;
