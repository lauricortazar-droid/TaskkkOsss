import React, { useState, useEffect, useRef } from "react";
import {
  CheckSquare,
  Plus,
  Trash2,
  X,
  Minimize2,
  Maximize2,
  Edit2,
  Check,
  Tag,
  Clock,
  Sparkles,
  ArrowUpRight,
  RotateCcw,
  ListTodo,
  AlertCircle,
  Lightbulb,
  Phone,
  Award,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { playChime } from "../utils/audio";

export interface MiniTaskNote {
  id: string;
  texto: string;
  completada: boolean;
  categoria?: "urgente" | "idea" | "contacto" | "reconocimiento" | "general";
  fechaCreacion: string;
  fechaCompletada?: string;
  notasExtra?: string;
}

const STORAGE_KEY = "task_os_mini_bloc_tasks_v1";

const INITIAL_MINI_TASKS: MiniTaskNote[] = [
  {
    id: "mini-1",
    texto: "Anotar pendientes y entregar reconocimientos listos",
    completada: false,
    categoria: "reconocimiento",
    fechaCreacion: new Date().toISOString(),
  },
  {
    id: "mini-2",
    texto: "Revisar comprobantes de pago de la Generación 2026",
    completada: false,
    categoria: "urgente",
    fechaCreacion: new Date().toISOString(),
  },
];

const CATEGORY_CHIPS = [
  { id: "urgente", label: "🔥 Urgente", color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300/40" },
  { id: "idea", label: "💡 Idea", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300/40" },
  { id: "contacto", label: "📞 Contacto", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300/40" },
  { id: "reconocimiento", label: "🎓 Reconocimiento", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300/40" },
  { id: "general", label: "📌 General", color: "bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-300/40" },
] as const;

interface MiniTasksBlocWidgetProps {
  onPromoteToTaskOS?: (texto: string) => void;
}

export default function MiniTasksBlocWidget({
  onPromoteToTaskOS,
}: MiniTasksBlocWidgetProps) {
  const [tasks, setTasks] = useState<MiniTaskNote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Error reading mini tasks from localStorage", e);
    }
    return INITIAL_MINI_TASKS;
  });

  const [isMinimized, setIsMinimized] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "urgente" | "idea" | "contacto" | "reconocimiento" | "general"
  >("general");
  const [filterMode, setFilterMode] = useState<"pendientes" | "completadas" | "todas">("pendientes");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.warn("Error saving mini tasks to localStorage", e);
    }
  }, [tasks]);

  // Sync with Firestore collection `mini_tasks`
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, "mini_tasks"),
        (snapshot) => {
          if (!snapshot.empty) {
            const remote: MiniTaskNote[] = [];
            snapshot.forEach((docSnap) => {
              remote.push({ ...(docSnap.data() as MiniTaskNote), id: docSnap.id });
            });
            // Sort: pending first, then newest
            remote.sort((a, b) => {
              if (a.completada !== b.completada) return a.completada ? 1 : -1;
              return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
            });
            setTasks(remote);
          } else {
            // Seed initial
            INITIAL_MINI_TASKS.forEach(async (initT) => {
              try {
                await setDoc(doc(db, "mini_tasks", initT.id), initT);
              } catch (_) {}
            });
          }
        },
        (err) => {
          console.warn("Firestore mini_tasks snapshot error:", err.message);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn("Firestore mini_tasks init error", e);
    }
  }, []);

  const pendingCount = tasks.filter((t) => !t.completada).length;
  const completedCount = tasks.filter((t) => t.completada).length;

  // Add new mini task
  const handleAddTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;

    const newTask: MiniTaskNote = {
      id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      texto: clean,
      completada: false,
      categoria: selectedCategory,
      fechaCreacion: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setInputText("");
    playChime("tick");

    try {
      await setDoc(doc(db, "mini_tasks", newTask.id), newTask);
    } catch (err) {
      console.warn("Error saving mini task to Firestore", err);
    }
  };

  // Toggle completion
  const handleToggleTask = async (task: MiniTaskNote) => {
    const nextState = !task.completada;
    const updated: MiniTaskNote = {
      ...task,
      completada: nextState,
      fechaCompletada: nextState ? new Date().toISOString() : undefined,
    };

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? updated : t))
    );

    if (nextState) {
      playChime("success");
    } else {
      playChime("tick");
    }

    try {
      await updateDoc(doc(db, "mini_tasks", task.id), {
        completada: nextState,
        fechaCompletada: nextState ? new Date().toISOString() : null,
      });
    } catch (err) {
      console.warn("Error updating mini task in Firestore", err);
    }
  };

  // Delete task
  const handleDeleteTask = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTasks((prev) => prev.filter((t) => t.id !== id));
    playChime("tick");

    try {
      await deleteDoc(doc(db, "mini_tasks", id));
    } catch (err) {
      console.warn("Error deleting mini task from Firestore", err);
    }
  };

  // Clear completed tasks
  const handleClearCompleted = async () => {
    const completed = tasks.filter((t) => t.completada);
    if (completed.length === 0) return;

    setTasks((prev) => prev.filter((t) => !t.completada));
    playChime("tick");

    completed.forEach(async (t) => {
      try {
        await deleteDoc(doc(db, "mini_tasks", t.id));
      } catch (_) {}
    });
  };

  // Save edit
  const handleSaveEdit = async (id: string) => {
    const clean = editingText.trim();
    if (!clean) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, texto: clean } : t))
    );
    setEditingId(null);
    playChime("tick");

    try {
      await updateDoc(doc(db, "mini_tasks", id), { texto: clean });
    } catch (err) {
      console.warn("Error updating mini task text", err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterMode === "pendientes") return !t.completada;
    if (filterMode === "completadas") return t.completada;
    return true;
  });

  // 1. Minimized / Pill view (Bottom Left - mirrors Pomodoro & Music on the right)
  if (!isOpen || isMinimized) {
    return (
      <div
        className="fixed bottom-20 md:bottom-5 left-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200"
        title="Mini Bloc (Google Tasks) - Clic para abrir y anotar pendientes en el momento"
      >
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
            playChime("tick");
            setTimeout(() => inputRef.current?.focus(), 150);
          }}
          className="group flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-stone-900/90 dark:bg-stone-800/90 hover:bg-stone-900 dark:hover:bg-stone-700 text-white backdrop-blur-md border border-stone-700/60 shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-white/10"
        >
          <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold relative">
            <CheckSquare size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-stone-900 animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-tight">
            <span>Mini Bloc</span>
            {pendingCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black leading-none shadow-xs">
                {pendingCount}
              </span>
            ) : (
              <span className="text-[10px] text-stone-400 font-normal">al día</span>
            )}
          </div>
        </button>
      </div>
    );
  }

  // 2. Expanded Google Tasks Style Panel
  return (
    <div
      className="fixed bottom-20 md:bottom-5 left-4 z-40 w-[92vw] sm:w-[360px] max-h-[520px] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-stone-900/5 dark:ring-white/10"
    >
      {/* Google Tasks Header */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xs">
            <CheckSquare size={17} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-tight leading-tight">
                Mini Bloc • Google Tasks
              </h3>
              <span className="px-1.5 py-0.2 rounded-full bg-white/25 text-[10px] font-bold">
                {pendingCount}
              </span>
            </div>
            <p className="text-[10px] text-blue-100 font-medium">
              Anota pendientes que se te ocurren al instante
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {completedCount > 0 && (
            <button
              type="button"
              onClick={handleClearCompleted}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs transition cursor-pointer"
              title="Limpiar completadas"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsMinimized(true);
              playChime("tick");
            }}
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs transition cursor-pointer"
            title="Minimizar a botón flotante"
          >
            <Minimize2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              playChime("tick");
            }}
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs transition cursor-pointer"
            title="Cerrar mini bloc"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Quick Input Bar */}
      <div className="p-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80">
        <form onSubmit={handleAddTask} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-white dark:bg-stone-800 rounded-2xl border border-stone-300 dark:border-stone-700 px-3 py-2 shadow-2xs focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 transition-all">
            <Plus size={16} className="text-stone-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Añadir pendiente o idea rápida..."
              className="w-full text-xs bg-transparent text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none"
            />
            {inputText.trim() && (
              <button
                type="submit"
                className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
              >
                Agregar
              </button>
            )}
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
            {CATEGORY_CHIPS.map((chip) => {
              const active = selectedCategory === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedCategory(chip.id)}
                  className={`px-2 py-0.5 rounded-full border transition whitespace-nowrap cursor-pointer ${
                    active
                      ? `${chip.color} font-black ring-1 ring-current`
                      : "bg-white/60 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </form>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-stone-100 dark:border-stone-800 text-[11px] bg-stone-100/50 dark:bg-stone-950/40">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilterMode("pendientes")}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              filterMode === "pendientes"
                ? "bg-white dark:bg-stone-800 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-800"
            }`}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("completadas")}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              filterMode === "completadas"
                ? "bg-white dark:bg-stone-800 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-800"
            }`}
          >
            Completadas ({completedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("todas")}
            className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
              filterMode === "todas"
                ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-2xs"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-800"
            }`}
          >
            Todas ({tasks.length})
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 min-h-[140px] max-h-[300px]">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-stone-400 dark:text-stone-500 flex flex-col items-center justify-center gap-1.5">
            <CheckSquare size={26} className="opacity-40" />
            <p className="text-xs font-semibold">
              {filterMode === "pendientes"
                ? "¡Sin pendientes! Mente libre y enfocada."
                : "No hay tareas en esta vista."}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isEditing = editingId === task.id;
            const categoryObj = CATEGORY_CHIPS.find((c) => c.id === task.categoria);

            return (
              <div
                key={task.id}
                className={`group flex items-start gap-2.5 p-2 rounded-2xl border transition-all duration-150 ${
                  task.completada
                    ? "bg-stone-50/70 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 opacity-60"
                    : "bg-white dark:bg-stone-800/80 border-stone-200 dark:border-stone-700/80 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700/50"
                }`}
              >
                {/* Circular Google Tasks Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggleTask(task)}
                  className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    task.completada
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-stone-400 dark:border-stone-500 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-transparent hover:text-blue-500/50"
                  }`}
                  title={task.completada ? "Marcar como pendiente" : "Marcar como completada"}
                >
                  <Check size={12} strokeWidth={3} className={task.completada ? "opacity-100" : "opacity-0 group-hover:opacity-60"} />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(task.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full text-xs bg-stone-100 dark:bg-stone-900 px-2 py-1 rounded-lg border border-blue-500 text-stone-900 dark:text-stone-100 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(task.id)}
                        className="p-1 rounded-md bg-blue-600 text-white text-xs"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <p
                        onClick={() => handleToggleTask(task)}
                        className={`text-xs cursor-pointer select-none leading-relaxed break-words ${
                          task.completada
                            ? "line-through text-stone-400 dark:text-stone-500"
                            : "text-stone-800 dark:text-stone-200 font-medium"
                        }`}
                      >
                        {task.texto}
                      </p>

                      <div className="flex items-center gap-1.5 text-[9px] text-stone-400">
                        {categoryObj && (
                          <span className={`px-1.5 py-0.2 rounded-full border text-[9px] font-bold ${categoryObj.color}`}>
                            {categoryObj.label}
                          </span>
                        )}
                        <span>
                          {new Date(task.fechaCreacion).toLocaleDateString([], {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {onPromoteToTaskOS && !task.completada && (
                      <button
                        type="button"
                        onClick={() => {
                          onPromoteToTaskOS(task.texto);
                          playChime("success");
                        }}
                        className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-500 hover:text-blue-600 transition"
                        title="Enviar a tareas principales de Task-OS"
                      >
                        <ArrowUpRight size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(task.id);
                        setEditingText(task.texto);
                      }}
                      className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-800 transition"
                      title="Editar texto"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTask(task.id, e)}
                      className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 transition"
                      title="Eliminar tarea"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer info */}
      <div className="px-3 py-2 bg-stone-50 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 text-[10px] text-stone-400 dark:text-stone-500 flex items-center justify-between">
        <span>Sincronizado en tiempo real</span>
        <button
          type="button"
          onClick={() => {
            setIsMinimized(true);
            playChime("tick");
          }}
          className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
        >
          Minimizar
        </button>
      </div>
    </div>
  );
}
