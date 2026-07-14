const { createSlice } = require('@reduxjs/toolkit');

const initialState = {
  profile: { id: null, name: '', allergies: [], goals: [] },
  profiles: [],
  subscription: { tier: 'free', status: 'active', trialEndsAt: null },
  gamification: { points: 0, reputation: 0, badges: [] },
  analytics: { scans_total: 0, engagement: 0 }
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile(state, action) {
      state.profile = { ...state.profile, ...action.payload };
    },
    setGoals(state, action) {
      state.profile.goals = Array.from(new Set(action.payload || []));
    },
    setAllergies(state, action) {
      state.profile.allergies = action.payload || [];
    },
    addFamilyProfile(state, action) {
      state.profiles.push(action.payload);
    },
    setSubscription(state, action) {
      state.subscription = { ...state.subscription, ...action.payload };
    },
    addPoints(state, action) {
      state.gamification.points += Number(action.payload || 0);
    }
  }
});

module.exports = {
  userReducer: userSlice.reducer,
  userActions: userSlice.actions,
  userInitialState: initialState
};
