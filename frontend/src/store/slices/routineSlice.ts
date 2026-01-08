import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';


export interface RoutineTask {
  id: string;
  productId: string;
  productName: string;
  time: string; // "09:00", "21:00" gibi
  days: number[]; // [0,1,2,3,4,5,6] Pazartesi-Pazar
  completed: boolean;
  completedDate?: string;
}

interface RoutineState {
  tasks: RoutineTask[];
  streak: number;
  lastCompletedDate: string | null;
}

const initialState: RoutineState = {
  tasks: [],
  streak: 0,
  lastCompletedDate: null,
};

const routineSlice = createSlice({
  name: 'routine',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<RoutineTask[]>) => {
      state.tasks = action.payload;
    },
    setStreak: (state, action: PayloadAction<number>) => {
      state.streak = action.payload;
    },
    setLastCompletedDate: (state, action: PayloadAction<string | null>) => {
      state.lastCompletedDate = action.payload;
    },
    addTask: (state, action: PayloadAction<Omit<RoutineTask, 'id' | 'completed'>>) => {
      const newTask: RoutineTask = {
        ...action.payload,
        id: Date.now().toString(),
        completed: false,
      };
      state.tasks.push(newTask);
    },
    removeTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter((task) => task.id !== action.payload);
    },
    completeTask: (state, action: PayloadAction<string>) => {
      const today = new Date().toISOString().split('T')[0];
      const task = state.tasks.find((t) => t.id === action.payload);
      if (task) {
        task.completed = true;
        task.completedDate = today;
      }

      // Streak güncelleme
      if (state.lastCompletedDate !== today) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

        if (state.lastCompletedDate === yesterday || state.streak === 0) {
          state.streak += 1;
        }
        state.lastCompletedDate = today;
      }
    },
    updateTask: (state, action: PayloadAction<{ taskId: string; updates: Partial<RoutineTask> }>) => {
      const { taskId, updates } = action.payload;
      const task = state.tasks.find((t) => t.id === taskId);
      if (task) {
        Object.assign(task, updates);
      }
    },
    resetStreak: (state) => {
      state.streak = 0;
    },
  },
});

export const {
  setTasks,
  setStreak,
  setLastCompletedDate,
  addTask,
  removeTask,
  completeTask,
  updateTask,
  resetStreak,
} = routineSlice.actions;

// Selectors
export const selectTasks = (state: { routine: RoutineState }) => state.routine.tasks;
export const selectStreak = (state: { routine: RoutineState }) => state.routine.streak;
export const selectLastCompletedDate = (state: { routine: RoutineState }) =>
  state.routine.lastCompletedDate;

export const selectRoutine = (state: { routine: RoutineState }) => state.routine;

export const selectTodayTasks = createSelector(
  [selectRoutine],
  (routine) => {
    const today = new Date().getDay(); // 0 = Pazar, 1 = Pazartesi, ...
    const todayDate = new Date().toISOString().split('T')[0];

    return routine.tasks.filter((task) => {
      const isToday = task.days.includes(today);
      const isNotCompletedToday = task.completedDate !== todayDate;
      return isToday && isNotCompletedToday;
    });
  }
);

export default routineSlice.reducer;

