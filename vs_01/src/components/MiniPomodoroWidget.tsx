import React, { useState } from "react";
import { Play, Pause, Maximize2, Minimize2, RotateCcw, SkipForward, X, Flame } from "lucide-react";
import { usePomodoro } from "../context/PomodoroContext";

interface MiniPomodoroWidgetProps {
  onNavigateToPomodoro?: () => void;
  isFullPomodoroOpen?: boolean;
}

export default function MiniPomodoroWidget({
  onNavigateToPomodoro,
  isFullPomodoroOpen = false,
}: MiniPomodoroWidgetProps) {
  const {
    formattedTime,
    isRunning,
    mode,
    taskName,
    toggleStartPause,
    resetTimer,
    skipBlock,
    isMiniWidgetMinimized,
    setIsMiniWidgetMinimized,
    isMiniWidgetVisible,
    setIsMiniWidgetVisible,
    progressRatio,
  } = usePomodoro();

  if (!isMiniWidgetVisible || isFullPomodoroOpen) {
    return null;
  }

  const modeBadge = {
    work: {
      bg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      dot: "bg-amber-400",
      label: "Enfoque",
    },
    shortBreak: {
      bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      dot: "bg-emerald-400",
      label: "Descanso",
    },
    longBreak: {
      bg: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      dot: "bg-sky-400",
      label: "Largo",
    },
  }[mode];

  // Ultra-minimized micro-pill
  if (isMiniWidgetMinimized) {
    return (
      <div
        className="fixed bottom-20 md:bottom-5 right-4 z-40 animate-in fade-in zoom-in-95 duration-200"
        title={`Pomodoro (${modeBadge.label}): ${formattedTime}. Clic para expandir.`}
      >
        <button
          type="button"
          onClick={() => setIsMiniWidgetMinimized(false)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900/90 dark:bg-stone-950/90 text-white backdrop-blur-md border border-stone-700/60 shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer ${
            isRunning ? "ring-2 ring-amber-500/40" : ""
          }`}
        >
          <span className="relative flex h-2 w-2">
            {isRunning && (
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${modeBadge.dot}`}
              />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${modeBadge.dot}`} />
          </span>
          <span className="font-mono text-xs font-black tracking-wider">{formattedTime}</span>
          <span className="text-[10px] text-stone-400">⏱️</span>
        </button>
      </div>
    );
  }

  // Standard compact floating widget
  return (
    <div
      id="mini-pomodoro-widget"
      className="fixed bottom-20 md:bottom-5 right-4 z-40 max-w-[320px] sm:max-w-[360px] animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <div className="relative rounded-2xl bg-stone-900/95 dark:bg-stone-950/95 text-stone-100 backdrop-blur-md border border-stone-700/60 shadow-2xl p-2.5 sm:p-3 overflow-hidden">
        {/* Subtle top progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-stone-800">
          <div
            className={`h-full transition-all duration-300 ${
              mode === "work" ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.round(progressRatio * 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2.5 pt-0.5">
          {/* Left: Timer + Status */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={toggleStartPause}
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition shadow-xs cursor-pointer active:scale-95 ${
                isRunning
                  ? "bg-amber-500 hover:bg-amber-400 text-stone-950"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
              title={isRunning ? "Pausar sesión Pomodoro" : "Iniciar sesión Pomodoro"}
              aria-label={isRunning ? "Pausar" : "Iniciar"}
            >
              {isRunning ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm sm:text-base font-black tracking-tight text-white">
                  {formattedTime}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider border ${modeBadge.bg}`}
                >
                  {modeBadge.label}
                </span>
              </div>
              <p
                className="text-[11px] text-stone-400 truncate max-w-[150px] sm:max-w-[180px]"
                title={taskName || "Sesión de Enfoque"}
              >
                {taskName || "Sesión de Enfoque"}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {onNavigateToPomodoro && (
              <button
                type="button"
                onClick={onNavigateToPomodoro}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Abrir vista completa Pomodoro"
              >
                <Maximize2 size={13} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMiniWidgetMinimized(true)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Minimizar a cápsula pequeña"
            >
              <Minimize2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
