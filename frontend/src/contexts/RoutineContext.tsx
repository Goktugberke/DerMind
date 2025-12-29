import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface RoutineTask {
  id: string;
  productId: string;
  productName: string;
  time: string; // "09:00", "21:00" gibi
  days: number[]; // [0,1,2,3,4,5,6] Pazartesi-Pazar
  completed: boolean;
  completedDate?: string;
}

interface RoutineContextType {
  tasks: RoutineTask[];
  streak: number;
  lastCompletedDate: string | null;
  addTask: (task: Omit<RoutineTask, 'id' | 'completed'>) => void;
  removeTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<RoutineTask>) => void;
  getTodayTasks: () => RoutineTask[];
}

const RoutineContext = createContext<RoutineContextType | undefined>(undefined);

export const RoutineProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [streak, setStreak] = useState(0);
  const [lastCompletedDate, setLastCompletedDate] = useState<string | null>(null);

  // LocalStorage'dan rutinleri yükle
  useEffect(() => {
    if (user) {
      const savedTasks = localStorage.getItem(`dermind_routines_${user.id}`);
      const savedStreak = localStorage.getItem(`dermind_streak_${user.id}`);
      const savedLastDate = localStorage.getItem(`dermind_lastDate_${user.id}`);
      
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
      if (savedStreak) {
        setStreak(parseInt(savedStreak, 10));
      }
      if (savedLastDate) {
        setLastCompletedDate(savedLastDate);
      }
    }
  }, [user]);

  // Streak hesaplama
  useEffect(() => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    if (lastCompletedDate === today) {
      // Bugün tamamlanmış
      return;
    } else if (lastCompletedDate === yesterday) {
      // Dün tamamlanmış, streak devam ediyor
      return;
    } else if (lastCompletedDate && lastCompletedDate < yesterday) {
      // Streak kırıldı
      setStreak(0);
    }
  }, [lastCompletedDate, user]);

  const saveToStorage = (newTasks: RoutineTask[]) => {
    if (user) {
      localStorage.setItem(`dermind_routines_${user.id}`, JSON.stringify(newTasks));
      localStorage.setItem(`dermind_streak_${user.id}`, streak.toString());
      if (lastCompletedDate) {
        localStorage.setItem(`dermind_lastDate_${user.id}`, lastCompletedDate);
      }
    }
  };

  const addTask = (task: Omit<RoutineTask, 'id' | 'completed'>) => {
    const newTask: RoutineTask = {
      ...task,
      id: Date.now().toString(),
      completed: false,
    };
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    saveToStorage(newTasks);
  };

  const removeTask = (taskId: string) => {
    const newTasks = tasks.filter((task) => task.id !== taskId);
    setTasks(newTasks);
    saveToStorage(newTasks);
  };

  const completeTask = (taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const newTasks = tasks.map((task) =>
      task.id === taskId
        ? { ...task, completed: true, completedDate: today }
        : task
    );
    setTasks(newTasks);
    saveToStorage(newTasks);

    // Streak güncelleme
    if (lastCompletedDate !== today) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      
      if (lastCompletedDate === yesterday || streak === 0) {
        setStreak((prev) => prev + 1);
      }
      setLastCompletedDate(today);
      if (user) {
        localStorage.setItem(`dermind_streak_${user.id}`, (streak + 1).toString());
        localStorage.setItem(`dermind_lastDate_${user.id}`, today);
      }
    }
  };

  const updateTask = (taskId: string, updates: Partial<RoutineTask>) => {
    const newTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, ...updates } : task
    );
    setTasks(newTasks);
    saveToStorage(newTasks);
  };

  const getTodayTasks = (): RoutineTask[] => {
    const today = new Date().getDay(); // 0 = Pazar, 1 = Pazartesi, ...
    return tasks.filter((task) => {
      const isToday = task.days.includes(today);
      const todayDate = new Date().toISOString().split('T')[0];
      const isNotCompletedToday = task.completedDate !== todayDate;
      return isToday && isNotCompletedToday;
    });
  };

  return (
    <RoutineContext.Provider
      value={{
        tasks,
        streak,
        lastCompletedDate,
        addTask,
        removeTask,
        completeTask,
        updateTask,
        getTodayTasks,
      }}
    >
      {children}
    </RoutineContext.Provider>
  );
};

export const useRoutine = () => {
  const context = useContext(RoutineContext);
  if (context === undefined) {
    throw new Error('useRoutine must be used within a RoutineProvider');
  }
  return context;
};

