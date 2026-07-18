/**
 * Family Members Redux Slice
 * 
 * Manages family member profiles:
 * - Add/remove family members
 * - Update family member health info
 * - Switch between profiles (user vs family member)
 * - Family safety checks
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchFamilyMembers = createAsyncThunk(
  'familyMembers/fetchMembers',
  async (userId, { rejectWithValue }) => {
    try {
      // TODO: Call backend API
      // const response = await api.get(`/users/${userId}/family-members`);
      // return response.data;
      return []; // Placeholder
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createFamilyMember = createAsyncThunk(
  'familyMembers/createMember',
  async (memberData, { rejectWithValue }) => {
    try {
      // TODO: Call backend API
      // const response = await api.post(`/family-members`, memberData);
      // return response.data;
      return memberData; // Placeholder
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateFamilyMember = createAsyncThunk(
  'familyMembers/updateMember',
  async ({ memberId, data }, { rejectWithValue }) => {
    try {
      // TODO: Call backend API
      // const response = await api.put(`/family-members/${memberId}`, data);
      // return response.data;
      return { id: memberId, ...data }; // Placeholder
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteFamilyMember = createAsyncThunk(
  'familyMembers/deleteMember',
  async (memberId, { rejectWithValue }) => {
    try {
      // TODO: Call backend API
      // await api.delete(`/family-members/${memberId}`);
      return memberId; // Placeholder
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const familyMembersSlice = createSlice({
  name: 'familyMembers',
  initialState: {
    members: [],
    activeMemberId: null, // Currently viewing this family member
    loading: false,
    error: null,
    lastUpdated: null,
  },

  reducers: {
    setActiveMember: (state, action) => {
      state.activeMemberId = action.payload;
    },

    clearActiveMember: (state) => {
      state.activeMemberId = null;
    },

    clearError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    // Fetch Family Members
    builder
      .addCase(fetchFamilyMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFamilyMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.members = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchFamilyMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create Family Member
    builder
      .addCase(createFamilyMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFamilyMember.fulfilled, (state, action) => {
        state.loading = false;
        state.members.push(action.payload);
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(createFamilyMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Family Member
    builder
      .addCase(updateFamilyMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFamilyMember.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.members.findIndex(
          (m) => m.id === action.payload.id
        );
        if (index !== -1) {
          state.members[index] = action.payload;
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(updateFamilyMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete Family Member
    builder
      .addCase(deleteFamilyMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteFamilyMember.fulfilled, (state, action) => {
        state.loading = false;
        state.members = state.members.filter((m) => m.id !== action.payload);
        if (state.activeMemberId === action.payload) {
          state.activeMemberId = null;
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(deleteFamilyMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setActiveMember,
  clearActiveMember,
  clearError,
} = familyMembersSlice.actions;

// Selectors
export const selectFamilyMembers = (state) => state.familyMembers.members;
export const selectActiveMemberId = (state) => state.familyMembers.activeMemberId;
export const selectActiveMember = (state) => {
  const { members, activeMemberId } = state.familyMembers;
  return members.find((m) => m.id === activeMemberId) || null;
};
export const selectFamilyMembersLoading = (state) =>
  state.familyMembers.loading;
export const selectFamilyMembersError = (state) => state.familyMembers.error;

export default familyMembersSlice.reducer;