// lib/features/counter/counterSlice.js
import { TrsutData } from '@/lib/constentData';
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  programList: [],
  selectedProgram: null,
  agentsList: [],
    getAgentDataChange:false,
 getMemberDataChange:false,
 trustData:TrsutData
};

export const commonSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setPrograms: (state, action) => {
      state.programList = action.payload;
    },
    setSelectedProgram: (state, action) => {
      state.selectedProgram = action.payload;
    },
    setAgentList: (state, action) => {
      state.agentsList = action.payload;
    },
        setgetAgentDataChange(state,action){
      state.getAgentDataChange=action.payload
    },
    setgetMemberDataChange(state,action){
      state.getMemberDataChange=action.payload
    },
    setTrustData(state,action){
      state.trustData=action.payload
    }
  },
});

// Action creators are generated for each case reducer function
export const { setPrograms,setSelectedProgram ,setAgentList,setgetAgentDataChange,setgetMemberDataChange,setTrustData} = commonSlice.actions;

export default commonSlice.reducer;