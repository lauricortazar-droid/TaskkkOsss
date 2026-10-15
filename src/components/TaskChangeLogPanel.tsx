import React from "react";
import {
  History,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Tag,
  Link,
  PlusCircle,
  X,
} from "lucide-react";
import { TaskChangeLogEntry, TaskChangeType } from "../types";

interface TaskChangeLogPanelProps {
  changeLog?: TaskChangeLogEntry[];
  taskTitle: string;
  taskId: number;
  onClose?: () => void;
  compact?: boolean;
}

export default function TaskChangeLogPanel({
  changeLog = [],
  taskTitle,
  taskId,
  onClose,
  compact = false,
}: TaskChangeLogPanelProps) {
  const getBadgeForType = (tipo: TaskChangeType) => {
    switch (tipo) {
      case "cambio_estado":
        return {
          icon: <CheckCircle2 size={12} className="text-blue-500 shrink-0" />,
          label: "Cambio de Estado",
          bgClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        };
      case "nota_anadida":
        return {
          icon: <FileText size={12} className="text-emerald-500 shrink-0" />,
          label: "Nota Añadida",
          bgClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        };
      case "nota_editada":
        return {
          icon: <FileText size={12} className="text-amber-500 shrink-0" />,
          label: "Nota Editada",
          bgClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        };
      case "nota_eliminada":
        return {
          icon: <FileText size={12} className="text-rose-500 shrink-0" />,
          label: "Nota Eliminada",
          bgClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        };
      case "fecha_limite":
        return {
          icon: <Calendar size={12} className="text-purple-500 shrink-0" />,
          label: "Fecha Límite",
          bgClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        };
      case "etiqueta_modificada":
        return {
          icon: <Tag size={12} className="text-indigo-500 shrink-0" />,
          label: "Etiquetas",
          bgClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
        };
      case "recurso_anadido":
        return {
          icon: <Link size={12} className="text-teal-500 shrink-0" />,
          label: "Recurso",
          bgClass: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-800",
        };
      case "creacion":
      default:
        return {
          icon: <PlusCircle size={12} className="text-stone-500 shrink-0" />,
          label: "Creación",
          bgClass: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700",
        };
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return iso;
    }
  };

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/90 dark:bg-stone-850 p-3 text-xs shadow-inner animate-in fade-in duration-200 space-y-2.5">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-stone-700/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <History size={13} />
          </div>
          <div>
            <span className="font-bold text-stone-800 dark:text-stone-100 text-xs flex items-center gap-1.5">
              <span>Registro de Cambios (Log)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                #{taskId}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-stone-400 font-mono">
            {changeLog.length} {changeLog.length === 1 ? "registro" : "registros"}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-700/60 transition-colors"
              title="Cerrar panel de historial"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Log list */}
      {changeLog.length === 0 ? (
        <div className="py-4 text-center text-stone-400 text-xs italic">
          Sin registros de cambios aún para esta tarea. Cada cambio de estado, nota o fecha límite quedará registrado aquí.
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {changeLog.map((log) => {
            const badge = getBadgeForType(log.tipo);
            return (
              <div
                key={log.id}
                className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 flex flex-col gap-1 shadow-2xs hover:border-amber-400/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.bgClass}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                    <span className="text-stone-800 dark:text-stone-200 font-medium text-xs">
                      {log.descripcion}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-stone-400 shrink-0">
                    {formatDate(log.fecha)}
                  </span>
                </div>

                {/* Diff details if available */}
                {(log.valorAnterior || log.valorNuevo) && (
                  <div className="mt-0.5 text-[11px] font-mono bg-stone-50 dark:bg-stone-950/50 p-1.5 rounded border border-stone-200/50 dark:border-stone-800/80 flex items-center gap-2 flex-wrap text-stone-600 dark:text-stone-400">
                    {log.valorAnterior && (
                      <span className="line-through text-stone-400">
                        {log.valorAnterior}
                      </span>
                    )}
                    {log.valorAnterior && log.valorNuevo && <span>→</span>}
                    {log.valorNuevo && (
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        {log.valorNuevo}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
