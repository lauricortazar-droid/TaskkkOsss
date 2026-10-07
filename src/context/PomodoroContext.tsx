import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { playChime } from "../utils/audio";
import { addPomodoroLog } from "../lib/pomodoroService";

export type PomodoroMode = "work" | "shortBreak" | "longBreak";

export interface PomodoroContextType {
  timeLeft: number;
  isRunning: boolean;
  mode: PomodoroMode;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  completedCycles: number;
  soundEnabled: boolean;
  taskName: string;
  taskId: number | null;
  isMiniWidgetMinimized: boolean;
  isMiniWidgetVisible: boolean;
  formattedTime: string;
  progressRatio: number;
  toggleStartPause: () => void;
  start: () => void;
  pause: () => void;
  resetTimer: () => void;
  skipBlock: () => void;
  switchMode: (newMode: PomodoroMode) => void;
  setTask: (name: string, id?: number | null, durationMinutes?: number) => void;
  setWorkDurationMinutes: (minutes: number) => void;
  toggleSound: () => void;
  setIsMiniWidgetMinimized: (min: boolean) => void;
  setIsMiniWidgetVisible: (vis: boolean) => void;
}

const PomodoroContext = createContext<PomodoroContextType | null>(null);

const STORAGE_KEY_POMO_STATE = "task_os_pomodoro_persistent_state_v1";

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  // Load saved state or defaults
  const [workDuration, setWorkDuration] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POMO_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.workDuration === "number") return parsed.workDuration;
      }
    } catch (_) {}
    return 25 * 60;
  });

  const shortBreakDuration = 5 * 60;
  const longBreakDuration = 15 * 60;

  const [mode, setMode] = useState<PomodoroMode>("work");
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [taskName, setTaskName] = useState<string>("Revisar lista de diplomas y reconocimientos de graduación");
  const [taskId, setTaskId] = useState<number | null>(4);
  const [isMiniWidgetMinimized, setIsMiniWidgetMinimized] = useState<boolean>(false);
  const [isMiniWidgetVisible, setIsMiniWidgetVisible] = useState<boolean>(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimestampRef = useRef<number>(Date.now());

  // Save key state occasionally
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_POMO_STATE,
        JSON.stringify({
          workDuration,
          completedCycles,
          soundEnabled,
          taskName,
          taskId,
          isMiniWidgetMinimized,
        })
      );
    } catch (_) {}
  }, [workDuration, completedCycles, soundEnabled, taskName, taskId, isMiniWidgetMinimized]);

  const handleTimerComplete = useCallback(() => {
    if (soundEnabled) {
      playChime(mode === "work" ? "work_done" : "break_done");
    }

    try {
      window.dispatchEvent(
        new CustomEvent("pomodoro-alarm-fired", {
          detail: { mode, completedCycles },
        })
      );
    } catch (_) {}

    if (mode === "work") {
      try {
        addPomodoroLog({
          taskId: taskId ?? null,
          taskName: taskName || "Sesión de Enfoque",
          durationMinutes: Math.round(workDuration / 60) || 25,
          mode: "work",
        });
      } catch (_) {}

      setCompletedCycles((prev) => {
        const next = prev + 1;
        if (next % 4 === 0) {
          setMode("longBreak");
          setTimeLeft(longBreakDuration);
        } else {
          setMode("shortBreak");
          setTimeLeft(shortBreakDuration);
        }
        return next;
      });
    } else {
      setMode("work");
      setTimeLeft(workDuration);
    }
    setIsRunning(false);
  }, [mode, completedCycles, soundEnabled, taskId, taskName, workDuration, longBreakDuration, shortBreakDuration]);

  // Main global countdown loop that NEVER dies on tab switch
  useEffect(() => {
    if (isRunning) {
      lastTimestampRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, handleTimerComplete]);

  const toggleStartPause = useCallback(() => {
    setIsRunning((prev) => {
      const next = !prev;
      if (next && soundEnabled) {
        playChime("tick");
      }
      return next;
    });
  }, [soundEnabled]);

  const start = useCallback(() => {
    if (soundEnabled) playChime("tick");
    setIsRunning(true);
  }, [soundEnabled]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    if (mode === "work") setTimeLeft(workDuration);
    else if (mode === "shortBreak") setTimeLeft(shortBreakDuration);
    else setTimeLeft(longBreakDuration);
  }, [mode, workDuration, shortBreakDuration, longBreakDuration]);

  const skipBlock = useCallback(() => {
    setIsRunning(false);
    if (mode === "work") {
      setCompletedCycles((prev) => {
        const next = prev + 1;
        if (next % 4 === 0) {
          setMode("longBreak");
          setTimeLeft(longBreakDuration);
        } else {
          setMode("shortBreak");
          setTimeLeft(shortBreakDuration);
        }
        return next;
      });
    } else {
      setMode("work");
      setTimeLeft(workDuration);
    }
  }, [mode, workDuration, shortBreakDuration, longBreakDuration]);

  const switchMode = useCallback(
    (newMode: PomodoroMode) => {
      setIsRunning(false);
      setMode(newMode);
      if (newMode === "work") setTimeLeft(workDuration);
      else if (newMode === "shortBreak") setTimeLeft(shortBreakDuration);
      else setTimeLeft(longBreakDuration);
    },
    [workDuration, shortBreakDuration, longBreakDuration]
  );

  const setTask = useCallback(
    (name: string, id?: number | null, durationMinutes?: number) => {
      setTaskName(name);
      if (id !== undefined) setTaskId(id);
      if (durationMinutes && durationMinutes > 0) {
        const secs = durationMinutes * 60;
        setWorkDuration(secs);
        if (mode === "work" && !isRunning) {
          setTimeLeft(secs);
        }
      }
    },
    [mode, isRunning]
  );

  const setWorkDurationMinutes = useCallback(
    (minutes: number) => {
      const secs = Math.max(1, minutes) * 60;
      setWorkDuration(secs);
      if (mode === "work" && !isRunning) {
        setTimeLeft(secs);
      }
    },
    [mode, isRunning]
  );

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  // Format MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Progress ratio (0 to 1)
  const currentTotal =
    mode === "work" ? workDuration : mode === "shortBreak" ? shortBreakDuration : longBreakDuration;
  const progressRatio = Math.min(1, Math.max(0, (currentTotal - timeLeft) / currentTotal));

  return (
    <PomodoroContext.Provider
      value={{
        timeLeft,
        isRunning,
        mode,
        workDuration,
        shortBreakDuration,
        longBreakDuration,
        completedCycles,
        soundEnabled,
        taskName,
        taskId,
        isMiniWidgetMinimized,
        isMiniWidgetVisible,
        formattedTime,
        progressRatio,
        toggleStartPause,
        start,
        pause,
        resetTimer,
        skipBlock,
        switchMode,
        setTask,
        setWorkDurationMinutes,
        toggleSound,
        setIsMiniWidgetMinimized,
        setIsMiniWidgetVisible,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro(): PomodoroContextType {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error("usePomodoro must be used within a PomodoroProvider");
  }
  return context;
}
