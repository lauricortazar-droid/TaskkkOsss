import { TaskItem, TaskChangeLogEntry, TaskChangeType } from "../types";

/**
 * Creates a new change log entry with a unique ID and current ISO timestamp.
 */
export function createChangeLogEntry(
  tipo: TaskChangeType,
  descripcion: string,
  valorAnterior?: string,
  valorNuevo?: string
): TaskChangeLogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fecha: new Date().toISOString(),
    tipo,
    descripcion,
    valorAnterior,
    valorNuevo,
  };
}

/**
 * Prepends a new change log entry to the task's existing changeLog (keeps latest first).
 * Limits to the most recent 100 entries to prevent memory bloat.
 */
export function appendTaskChangeLog(
  task: TaskItem,
  tipo: TaskChangeType,
  descripcion: string,
  valorAnterior?: string,
  valorNuevo?: string
): TaskChangeLogEntry[] {
  const currentLogs = Array.isArray(task.changeLog) ? task.changeLog : [];
  const newEntry = createChangeLogEntry(tipo, descripcion, valorAnterior, valorNuevo);
  return [newEntry, ...currentLogs].slice(0, 100);
}
