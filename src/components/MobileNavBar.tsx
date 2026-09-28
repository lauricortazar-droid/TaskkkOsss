import React from "react";
import { SyncStatus, WorkspaceTab } from "../types";

interface MobileNavBarProps {
  activeCount: number;
  urlsCount?: number;
  isPomodoroActive: boolean;
  syncStatus: SyncStatus;
  currentWorkspace?: WorkspaceTab;
  onChangeWorkspace?: (ws: WorkspaceTab) => void;
  onNewTaskClick: () => void;
  onOpenPomodoro: () => void;
  onOpenSync: () => void;
  onOpenContacts: () => void;
  onScrollToLedger: () => void;
  onOpenNotifications?: () => void;
  unreadSolicitudesCount?: number;
}

export default function MobileNavBar({
  activeCount,
  urlsCount = 0,
  isPomodoroActive,
  syncStatus,
  currentWorkspace = "task-os",
  onChangeWorkspace,
  onNewTaskClick,
  onOpenPomodoro,
  onOpenSync,
  onOpenContacts,
  onScrollToLedger,
  onOpenNotifications,
  unreadSolicitudesCount = 0,
}: MobileNavBarProps) {
  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Navegación móvil"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 px-1 py-1 shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* Task-OS Tab: 🔥 */}
        <button
          type="button"
          onClick={() => {
            if (onChangeWorkspace) onChangeWorkspace("task-os");
            onScrollToLedger();
          }}
          className={`flex items-center justify-center py-2 px-2.5 rounded-2xl min-h-[46px] min-w-[46px] relative transition-all active:scale-95 ${
            currentWorkspace === "task-os"
              ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/30 ring-2 ring-[#042f66]/20"
              : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
          title="Task: 🔥"
          aria-label="Task: 🔥"
        >
          <span className="text-xl leading-none">🔥</span>
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-[#f2ad00] text-[#1d1d1b] text-[9px] font-black leading-tight shadow-xs">
              {activeCount}
            </span>
          )}
        </button>

        {/* URLs Library Tab: 🔗 */}
        <button
          type="button"
          onClick={() => onChangeWorkspace && onChangeWorkspace("urls")}
          className={`flex items-center justify-center py-2 px-2.5 rounded-2xl min-h-[46px] min-w-[46px] relative transition-all active:scale-95 ${
            currentWorkspace === "urls"
              ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/30 ring-2 ring-[#042f66]/20"
              : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
          title="URLs: 🔗"
          aria-label="URLs: 🔗"
        >
          <span className="text-xl leading-none">🔗</span>
          {urlsCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-[#f2ad00] text-[#1d1d1b] text-[8px] font-black">
              {urlsCount}
            </span>
          )}
        </button>

        {/* Lonas Tab: 💻 */}
        <button
          type="button"
          onClick={() => onChangeWorkspace && onChangeWorkspace("lonas")}
          className={`flex items-center justify-center py-2 px-2.5 rounded-2xl min-h-[46px] min-w-[46px] transition-all active:scale-95 ${
            currentWorkspace === "lonas"
              ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/30 ring-2 ring-[#042f66]/20"
              : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
          title="Lonas: 💻"
          aria-label="Lonas: 💻"
        >
          <span className="text-xl leading-none">💻</span>
        </button>

        {/* Salud Financiera Tab: 🤑 */}
        <button
          type="button"
          onClick={() => onChangeWorkspace && onChangeWorkspace("finanzas")}
          className={`flex items-center justify-center py-2 px-2.5 rounded-2xl min-h-[46px] min-w-[46px] transition-all active:scale-95 ${
            currentWorkspace === "finanzas"
              ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/30 ring-2 ring-[#042f66]/20"
              : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
          title="Salud Financiera: 🤑"
          aria-label="Salud Financiera: 🤑"
        >
          <span className="text-xl leading-none">🤑</span>
        </button>

        {/* Print Station Tab: 🖨️ */}
        <button
          type="button"
          onClick={() => onChangeWorkspace && onChangeWorkspace("print")}
          className={`flex items-center justify-center py-2 px-2.5 rounded-2xl min-h-[46px] min-w-[46px] transition-all active:scale-95 ${
            currentWorkspace === "print"
              ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/30 ring-2 ring-[#042f66]/20"
              : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
          title="Print: 🖨️"
          aria-label="Print: 🖨️"
        >
          <span className="text-xl leading-none">🖨️</span>
        </button>

        {/* Pomodoro Focus Tab: ⏱️ */}
        <button
          type="button"
          onClick={() => {
            if (onChangeWorkspace) onChangeWorkspace("pomodoro");
            onOpenPomodoro();
          }}
          className={`flex items-center justify-center py-2 px-2.5 rounded-2xl min-h-[46px] min-w-[46px] transition-all active:scale-95 ${
            currentWorkspace === "pomodoro"
              ? "bg-[#042f66] text-white shadow-md shadow-[#042f66]/30 ring-2 ring-[#042f66]/20"
              : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
          title="Pomodoro: ⏱️"
          aria-label="Pomodoro: ⏱️"
        >
          <span className="text-xl leading-none">⏱️</span>
        </button>

        {/* Centro de Solicitudes & Notificaciones: 🔔 */}
        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="flex items-center justify-center py-2 px-2.5 rounded-2xl min-h-[46px] min-w-[46px] relative transition-all active:scale-95 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800"
            title="Centro de Solicitudes & Notificaciones: 🔔"
            aria-label="Centro de Solicitudes & Notificaciones: 🔔"
          >
            <span className="text-xl leading-none">🔔</span>
            {unreadSolicitudesCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black leading-tight shadow-xs animate-pulse">
                {unreadSolicitudesCount}
              </span>
            )}
          </button>
        )}
      </div>
    </nav>
  );
}

