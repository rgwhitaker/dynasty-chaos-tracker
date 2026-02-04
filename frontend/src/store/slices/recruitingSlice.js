import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import recruitingService from '../../services/recruitingService';

const initialState = {
  recruits: [],
  targets: [],
  isLoading: false,
  isError: false,
  message: '',
};

export const getRecruits = createAsyncThunk('recruiting/getAll', async (dynastyId, thunkAPI) => {
  try {
    const token = thunkAPI.getState().auth.user.token;
    return await recruitingService.getRecruits(dynastyId, token);
  } catch (error) {
    const message = error.response?.data?.error || error.message;
    return thunkAPI.rejectWithValue(message);
  }
});

export const recruitingSlice = createSlice({
  name: 'recruiting',
  initialState,
  reducers: {
    reset: (state) => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(getRecruits.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getRecruits.fulfilled, (state, action) => {
        state.isLoading = false;
        state.recruits = action.payload;
      })
      .addCase(getRecruits.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset } = recruitingSlice.actions;
export default recruitingSlice.reducer;
