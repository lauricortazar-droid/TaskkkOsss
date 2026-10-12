import React, { useState } from "react";
import {
  Star,
  Timer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  Phone,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag as TagIcon,
  Check,
  Flame,
  Calendar as CalendarIcon,
  Plus,
  Zap,
} from "lucide-react";
import { TaskItem, TagItem } from "../types";
import { getTagColorClass } from "../utils/tagColors";
import { playChime } from "../utils/audio";
import { getTaskUrgencyDetails } from "../utils/urgencyScore";
import TaskResourceCard from "./TaskResourceCard";

export interface TaskCardMobileProps {
  task: TaskItem;
  isEsencial: boolean;
  isSecundaria: boolean;
  availableTags?: TagItem[];
  showUrgencyScore?: boolean;
  sortByUrgency?: boolean;
  forceExpanded?: boolean | null;
  onSetStatus: (id: number, newStatus: "Pendiente" | "En Proceso" | "Completado") => void;
  onStartFocus: (task: TaskItem) => void;
  onSetEsencial: (id: number) => void;
  onOpenWhatsApp: (task: TaskItem) => void;
  onViewImage: (src: string, title: string) => void;
  onUpdateNotes?: (taskId: number, notes: string) => void;
  onToggleTaskTag?: (taskId: number, tagName: string) => void;
  onToggleUrgencySort?: () => void;
}

export default function TaskCardMobile({
  task,
  isEsencial,
  isSecundaria,
  availableTags = [],
  showUrgencyScore = false,
  sortByUrgency = false,
  forceExpanded = null,
  onSetStatus,
  onStartFocus,
  onSetEsencial,
  onOpenWhatsApp,
  onViewImage,
  onUpdateNotes,
  onToggleTaskTag,
  onToggleUrgencySort,
}: TaskCardMobileProps) {
  const isDone = task.estado === "Completado";
  const urgency = getTaskUrgencyDetails(task);

  // Collapsible state (can be controlled or local)
  const [isLocalExpanded, setIsLocalExpanded] = useState<boolean>(() => isEsencial);
  const isExpanded = forceExpanded !== null ? forceExpanded : isLocalExpanded;

  // Notes accordion & draft state
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(task.notas || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Tag popover state
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

  // Urgency details inline toggle
  const [showUrgencyBreakdown, setShowUrgencyBreakdown] = useState(false);

  const handleSaveNotes = () => {
    if (onUpdateNotes) {
      onUpdateNotes(task.id, notesDraft.trim());
      setIsSavingNotes(true);
      playChime("tick");
      setTimeout(() => setIsSavingNotes(false), 1500);
    }
  };

  // Direct 1-tap status cycler for mobile header
  const handleCycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    let nextStatus: "Pendiente" | "En Proceso" | "Completado" = "Pendiente";
    if (task.estado === "Pendiente") {
      nextStatus = "En Proceso";
    } else if (task.estado === "En Proceso") {
      nextStatus = "Completado";
    } else {
      nextStatus = "Pendiente";
    }
    onSetStatus(task.id, nextStatus);
    playChime(nextStatus === "Completado" ? "success" : "tick");
  };

  const getDomainBadgeColor = (dom?: string) => {
    switch ((dom || "").toLowerCase()) {
      case "fgdll":
        return "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "universidad":
        return "bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "tecnología":
      case "technology":
        return "bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "diseño":
        return "bg-pink-100 text-pink-900 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-800";
      case "laura":
        return "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      default:
        return "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700";
    }
  };

  return (
    <div
      id={`task-mobile-card-${task.id}`}
      className={`rounded-2xl border transition-all overflow-hidden ${
        isEsencial
          ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-700/60 shadow-xs"
          : isDone
          ? "bg-stone-50/70 dark:bg-stone-900/40 border-stone-200/80 dark:border-stone-800/80 opacity-90"
          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-2xs hover:border-stone-300 dark:hover:border-stone-700"
      }`}
    >
      {/* 
        COMPACT COLLAPSIBLE CARD HEADER (Always Visible & Interactive) 
        Tapping header anywhere toggles collapse (except action buttons)
      */}
      <div
        onClick={() => setIsLocalExpanded(!isExpanded)}
        className="p-3 cursor-pointer select-none transition-colors hover:bg-stone-50/60 dark:hover:bg-stone-850/50"
      >
        {/* Top Badges Row: ID, Dominio, Urgencia, Priority Star */}
        <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-stone-100 dark:border-stone-800/50">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Task ID */}
            <span className="px-2 py-0.5 rounded-md bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 font-mono text-xs font-bold shrink-0">
              #{task.id}
            </span>

            {/* Número / Folio de Referencia si existe */}
            {task.numeroFolio && (
              <span
                className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-mono text-[10px] font-bold shrink-0"
                title={`Folio / N°: ${task.numeroFolio}`}
              >
                N° {task.numeroFolio}
              </span>
            )}

            {/* Domain Pill */}
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${getDomainBadgeColor(
                task.dominio
              )}`}
            >
              {task.dominio || "General"}
            </span>

            {/* Urgency Badge (Touch-friendly quick toggle or breakdown opener) */}
            {(showUrgencyScore || urgency.score > 0) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUrgencyBreakdown(!showUrgencyBreakdown);
                  if (!isExpanded) setIsLocalExpanded(true);
                }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all shrink-0 active:scale-95 ${urgency.badgeClass}`}
                title={`Urgency Score: ${urgency.score} pts (Toca para ver detalles)`}
              >
                <Flame
                  size={11}
                  className={urgency.level === "critica" ? "text-rose-600 animate-pulse" : ""}
                />
                <span>Score: {urgency.score}</span>
                <span className="opacity-75 font-normal hidden xs:inline">({urgency.label})</span>
              </button>
            )}
          </div>

          {/* Priority Star Touch Button (min 44x44px touch target) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSetEsencial(task.id);
              playChime("tick");
            }}
            className="p-2 -mr-1 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center justify-center min-h-[44px] min-w-[44px] shrink-0"
            title={isEsencial ? "Tarea Esencial activa" : "Marcar como Tarea Esencial"}
          >
            <Star
              size={18}
              className={`${
                isEsencial
                  ? "text-amber-500 fill-amber-500"
                  : isSecundaria
                  ? "text-amber-400 fill-amber-400/40"
                  : "text-stone-300 dark:text-stone-600 hover:text-stone-400"
              }`}
            />
          </button>
        </div>

        {/* Middle Content Row: Task Title + Quick Status & Chevron */}
        <div className="pt-2 flex items-start justify-between gap-2.5">
          <div className="flex-1 min-w-0 pr-1">
            <h4
              className={`text-sm font-semibold leading-snug transition-colors ${
                isDone
                  ? "line-through text-stone-400 dark:text-stone-500 font-normal"
                  : "text-stone-900 dark:text-stone-100"
              }`}
            >
              {task.tarea}
            </h4>

            {/* Quick summary snippet when collapsed */}
            <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-stone-500 dark:text-stone-400">
              <span className="truncate">
                De: <strong className="text-stone-800 dark:text-stone-200">{task.solicitante}</strong>
              </span>

              {task.fechaLimite && (
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-semibold text-[10px] border ${
                    urgency.isOverdue
                      ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                      : urgency.daysRemaining === 0
                      ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700 font-bold"
                      : "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  }`}
                >
                  <CalendarIcon size={10} />
                  <span>{task.fechaLimite}</span>
                  {urgency.deadlineText && (
                    <span className="opacity-80">({urgency.daysRemaining !== null && urgency.daysRemaining < 0 ? "Vencida" : urgency.daysRemaining === 0 ? "Hoy" : `${urgency.daysRemaining}d`})</span>
                  )}
                </span>
              )}

              {task.notas && !isExpanded && (
                <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400 font-medium">
                  <FileText size={10} />
                  <span>Nota</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Area: 1-Tap Status Cycler + Expand Chevron (Both with min 44px touch targets) */}
          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            {/* Quick 1-Tap Status Button */}
            <button
              type="button"
              onClick={handleCycleStatus}
              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border min-h-[44px] shadow-2xs select-none active:scale-95 ${
                task.estado === "Completado"
                  ? "bg-emerald-600 text-white border-emerald-700 shadow-emerald-500/10"
                  : task.estado === "En Proceso"
                  ? "bg-blue-600 text-white border-blue-700 shadow-blue-500/10"
                  : "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700"
              }`}
              title="Toca para cambiar de estado rápidamente"
            >
              {task.estado === "Completado" && <CheckCircle2 size={13} className="shrink-0" />}
              {task.estado === "En Proceso" && <Clock size={13} className="shrink-0" />}
              {task.estado === "Pendiente" && <AlertCircle size={13} className="shrink-0" />}
              <span className="text-[11px] font-bold whitespace-nowrap">
                {task.estado === "Completado" ? "Hecho" : task.estado}
              </span>
            </button>

            {/* Expand / Collapse Chevron Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLocalExpanded(!isExpanded);
              }}
              className="p-2.5 rounded-xl text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
              title={isExpanded ? "Colapsar tarjeta" : "Expandir para ver detalles completos"}
            >
              <ChevronDown
                size={18}
                className={`transition-transform duration-200 ${isExpanded ? "rotate-180 text-stone-700 dark:text-stone-200" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 
        EXPANDED DETAILS BODY (Collapsible with smooth layout)
      */}
      {isExpanded && (
        <div className="p-3.5 pt-1 space-y-3 border-t border-stone-100 dark:border-stone-800 animate-in fade-in duration-150">
          {/* Urgency Breakdown Box (Interactive explanation & sort toggle) */}
          <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-950 dark:text-amber-200">
                <Flame size={13} className="text-amber-600 dark:text-amber-400 fill-amber-500" />
                <span>Nivel de Urgencia: {urgency.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 dark:bg-amber-900 font-mono font-bold text-amber-900 dark:text-amber-200">
                  {urgency.score} pts
                </span>
              </span>

              {onToggleUrgencySort && (
                <button
                  type="button"
                  onClick={onToggleUrgencySort}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
                    sortByUrgency
                      ? "bg-amber-500 text-stone-950 font-bold"
                      : "bg-white dark:bg-stone-800 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100"
                  }`}
                  title="Ordenar todas las tareas por urgencia"
                >
                  {sortByUrgency ? "⚡ Orden activo" : "Ordenar por Urgencia"}
                </button>
              )}
            </div>

            {/* Reasons breakdown */}
            {urgency.reasons && urgency.reasons.length > 0 && (
              <div className="space-y-0.5 text-[11px] text-stone-700 dark:text-stone-300 pt-0.5">
                {urgency.reasons.map((r, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-amber-500">•</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Full Segmented Status Selector (Large Touch targets >= 44px) */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Cambiar Estado:
            </span>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-850 border border-stone-200 dark:border-stone-700">
              {(["Pendiente", "En Proceso", "Completado"] as const).map((status) => {
                const isCurrent = task.estado === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      onSetStatus(task.id, status);
                      playChime(status === "Completado" ? "success" : "tick");
                    }}
                    className={`py-2 px-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[44px] select-none ${
                      isCurrent
                        ? status === "Completado"
                          ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/20 font-bold"
                          : status === "En Proceso"
                          ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/20 font-bold"
                          : "bg-amber-500 text-stone-950 shadow-xs ring-2 ring-amber-500/20 font-bold"
                        : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white/60 dark:hover:bg-stone-800"
                    }`}
                  >
                    {status === "Completado" && <CheckCircle2 size={13} />}
                    {status === "En Proceso" && <Clock size={13} />}
                    {status === "Pendiente" && <AlertCircle size={13} />}
                    <span className="truncate">{status}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags Section with Quick Add / Remove Popover */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                <TagIcon size={11} />
                Etiquetas:
              </span>
              {onToggleTaskTag && availableTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                >
                  <Plus size={11} />
                  <span>Gestionar</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {task.etiquetas && task.etiquetas.length > 0 ? (
                task.etiquetas.map((tagName) => {
                  const matched = availableTags.find((t) => t.nombre === tagName);
                  return (
                    <span
                      key={tagName}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${getTagColorClass(
                        matched?.color
                      )}`}
                    >
                      <span>{tagName}</span>
                      {onToggleTaskTag && (
                        <button
                          type="button"
                          onClick={() => onToggleTaskTag(task.id, tagName)}
                          className="ml-1 opacity-70 hover:opacity-100 p-0.5"
                          title="Quitar etiqueta"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })
              ) : (
                <span className="text-xs text-stone-400 italic">Sin etiquetas asignadas</span>
              )}
            </div>

            {/* Quick Tag Popover for Mobile */}
            {isTagPopoverOpen && availableTags.length > 0 && (
              <div className="mt-2 p-2 bg-stone-50 dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700 grid grid-cols-2 gap-1 animate-in fade-in duration-100">
                {availableTags.map((t) => {
                  const hasTag = task.etiquetas?.includes(t.nombre);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onToggleTaskTag?.(task.id, t.nombre)}
                      className={`p-2 rounded-lg text-xs font-semibold flex items-center justify-between border min-h-[40px] ${
                        hasTag
                          ? `${getTagColorClass(t.color)} ring-1 ring-stone-900/20 font-bold`
                          : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                      }`}
                    >
                      <span className="truncate">{t.nombre}</span>
                      {hasTag && <Check size={12} className="shrink-0 ml-1 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contextual Resources (Ley del Foco) */}
          {task.resources && task.resources.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                Recursos Vinculados:
              </span>
              <div className="flex flex-col gap-1.5">
                {task.resources.map((res, idx) => (
                  <TaskResourceCard
                    key={`${res.url}-${idx}`}
                    resource={res}
                    compact={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Attached Reference Image Thumbnail */}
          {task.imagenReferencia && (
            <div>
              <button
                type="button"
                onClick={() => onViewImage(task.imagenReferencia!, `Referencia #${task.id}: ${task.tarea}`)}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:border-amber-500/50 transition-all min-h-[44px]"
              >
                <img
                  src={task.imagenReferencia}
                  alt="Miniatura"
                  className="w-10 h-10 object-cover rounded-lg border border-stone-300 dark:border-stone-700 shrink-0"
                />
                <div className="flex-1 text-left min-w-0">
                  <span className="block truncate text-stone-900 dark:text-stone-100 font-bold">
                    Imagen de referencia
                  </span>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <ImageIcon size={12} /> Toca para ver comprobante en grande
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Observaciones / Notes Accordion & Editor */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setIsNotesOpen(!isNotesOpen)}
              className="flex items-center justify-between w-full py-2 px-2.5 rounded-lg bg-stone-100/60 dark:bg-stone-850 text-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors min-h-[40px]"
            >
              <span className="flex items-center gap-1.5 font-semibold">
                <FileText size={13} className="text-amber-600 dark:text-amber-400" />
                {task.notas ? "Observaciones guardadas" : "+ Añadir observaciones"}
              </span>
              {isNotesOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {isNotesOpen && (
              <div className="mt-2 p-2.5 rounded-xl bg-stone-100/70 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2">
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Escribe notas, especificaciones o acuerdos para esta tarea..."
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none leading-relaxed"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-3.5 py-2 rounded-lg bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 text-xs font-bold hover:opacity-90 transition-opacity min-h-[40px] flex items-center gap-1.5 shadow-xs"
                  >
                    {isSavingNotes ? (
                      <>
                        <Check size={13} className="text-emerald-500" /> Guardado
                      </>
                    ) : (
                      "Guardar nota"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Quick Action Bar: WhatsApp & Pomodoro Focus (Touch targets >= 44px) */}
          <div className="pt-2 flex items-center gap-2 border-t border-stone-100 dark:border-stone-800">
            {/* WhatsApp Contact button */}
            {task.contacto?.telefono ? (
              <button
                type="button"
                onClick={() => onOpenWhatsApp(task)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all min-h-[44px] shadow-xs active:scale-98"
                title={`Abrir WhatsApp con ${task.contacto.nombre || task.solicitante}`}
              >
                <Phone size={14} />
                <span className="truncate">WhatsApp ({task.solicitante})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenWhatsApp(task)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold transition-all min-h-[44px]"
                title="Mensaje al solicitante"
              >
                <Phone size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">WhatsApp general</span>
              </button>
            )}

            {/* Start Focus (Pomodoro) button */}
            <button
              type="button"
              onClick={() => {
                onStartFocus(task);
                playChime("tick");
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-900 dark:text-stone-100 text-xs font-bold transition-all min-h-[44px] shrink-0 active:scale-98"
              title="Iniciar sesión de enfoque Pomodoro en esta tarea"
            >
              <Timer size={15} className="text-amber-500" />
              <span>Foco</span>
            </button>
          </div>

          {/* Quick Collapse Footer Link */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setIsLocalExpanded(false)}
              className="text-[11px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 inline-flex items-center gap-1 py-1 px-3 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <ChevronUp size={12} />
              <span>Colapsar tarjeta</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
