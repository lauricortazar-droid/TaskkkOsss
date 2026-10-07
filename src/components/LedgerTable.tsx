import React, { useState, useMemo } from "react";
import {
  Star,
  Timer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Search,
  Filter,
  Sparkles,
  Image as ImageIcon,
  X,
  Phone,
  ExternalLink,
  Tag as TagIcon,
  Plus,
  Settings2,
  LayoutGrid,
  Table as TableIcon,
  Calendar as CalendarIcon,
  Flame,
} from "lucide-react";
import { TaskItem, StatusFilter, DomainType, TagItem } from "../types";
import { getTagColorClass } from "../utils/tagColors";
import { buildWhatsAppUrl } from "../utils/whatsapp";
import { playChime } from "../utils/audio";
import { calculateUrgencyScore } from "../utils/urgencyScore";
import TaskItemRow from "./TaskItemRow";
import TaskCardMobile from "./TaskCardMobile";
import TaskCalendarView from "./TaskCalendarView";

interface LedgerTableProps {
  tasks: TaskItem[];
  esencialTaskId?: number | null;
  secundariasTaskIds?: number[];
  availableTags?: TagItem[];
  onToggleStatus: (id: number) => void;
  onSetStatus: (id: number, newStatus: "Pendiente" | "En Proceso" | "Completado") => void;
  onStartFocus: (task: TaskItem) => void;
  onSetEsencial: (id: number) => void;
  onMessageContact?: (task: TaskItem) => void;
  onToggleTaskTag?: (taskId: number, tagName: string) => void;
  onOpenManageTags?: () => void;
  onUpdateTaskNotes?: (id: number, notes: string) => void;
  onUpdateTaskFechaLimite?: (id: number, fechaLimite: string) => void;
  onOpenWorkspaceModal?: () => void;
}

export default function LedgerTable({
  tasks,
  esencialTaskId,
  secundariasTaskIds = [],
  availableTags = [],
  onToggleStatus,
  onSetStatus,
  onStartFocus,
  onSetEsencial,
  onMessageContact,
  onToggleTaskTag,
  onOpenManageTags,
  onUpdateTaskNotes,
  onUpdateTaskFechaLimite,
  onOpenWorkspaceModal,
}: LedgerTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Activas");
  const [domainFilter, setDomainFilter] = useState<DomainType>("Todos");
  const [tagFilter, setTagFilter] = useState<string>("Todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortByUrgency, setSortByUrgency] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [viewingImage, setViewingImage] = useState<{ src: string; title: string } | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table" | "calendar">(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return "cards";
    }
    return "table";
  });

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        task.tarea.toLowerCase().includes(q) ||
        task.solicitante.toLowerCase().includes(q) ||
        task.id.toString() === q ||
        (task.notas && task.notas.toLowerCase().includes(q)) ||
        (task.etiquetas && task.etiquetas.some((et) => et.toLowerCase().includes(q)));
      if (!match) return false;
    }

    // Status filter
    if (statusFilter === "Activas") {
      if (task.estado === "Completado") return false;
    } else if (statusFilter !== "Todos") {
      if (task.estado !== statusFilter) return false;
    }

    // Domain filter
    if (domainFilter !== "Todos") {
      const taskDom = (task.dominio || "").toLowerCase();
      const filterDom = domainFilter.toLowerCase();
      const match =
        taskDom === filterDom ||
        (filterDom === "tecnología" && taskDom === "technology") ||
        (filterDom === "technology" && taskDom === "tecnología");
      if (!match) return false;
    }

    // Tag filter
    if (tagFilter !== "Todas") {
      if (!task.etiquetas || !task.etiquetas.includes(tagFilter)) return false;
    }

    return true;
  });

  // Sort tasks by Urgency Score if enabled
  const displayedTasks = useMemo(() => {
    if (!sortByUrgency) return filteredTasks;
    return [...filteredTasks].sort((a, b) => {
      const scoreA = calculateUrgencyScore(a);
      const scoreB = calculateUrgencyScore(b);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      // Essential task first as tie breaker
      if (a.id === esencialTaskId) return -1;
      if (b.id === esencialTaskId) return 1;
      return a.id - b.id;
    });
  }, [filteredTasks, sortByUrgency, esencialTaskId]);

  // Export raw markdown table (matching exactly Ley 1)
  const handleCopyMarkdown = async () => {
    let md = "| ID | Solicitante | Tarea | Estado | Fecha de Ingreso |\n";
    md += "| --- | ----------- | ----- | ------ | ---------------- |\n";
    tasks.forEach((t) => {
      md += `| ${t.id} | ${t.solicitante} | ${t.tarea} | ${t.estado} | ${t.fechaIngreso} |\n`;
    });

    try {
      await navigator.clipboard.writeText(md);
      setCopiedMd(true);
      playChime("success");
      setTimeout(() => setCopiedMd(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const openWhatsAppContact = (task: TaskItem) => {
    if (onMessageContact) {
      onMessageContact(task);
      return;
    }
    const phone = task.contacto?.telefono;
    const msg = `Hola ${task.solicitante}, sobre la tarea: "${task.tarea}"...`;
    const url = phone
      ? buildWhatsAppUrl(phone, msg)
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const activeCount = tasks.filter((t) => t.estado !== "Completado").length;
  const completedCount = tasks.filter((t) => t.estado === "Completado").length;

  return (
    <div
      id="ledger-maestro-section"
      className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden"
    >
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              📋 Ledger Maestro de Tareas
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              {tasks.length} total
            </span>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {activeCount} abiertas
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Ley 1: Registro único y consecutivo • Ley 8: Ley del Foco
          </p>
        </div>

        {/* Search, View Mode Toggle, and Markdown Copy Action */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-56 min-w-[150px]">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              id="ledger-search-input"
              type="text"
              placeholder="Buscar tarea o solicitante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
          </div>

          {/* View Mode Toggle: Tarjetas vs Tabla vs Calendario */}
          <div className="flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0">
            <button
              type="button"
              id="ledger-view-cards-btn"
              onClick={() => setViewMode("cards")}
              className={`p-1.5 px-2 rounded-md text-xs font-semibold flex items-center gap-1 transition-all min-h-[36px] ${
                viewMode === "cards"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-bold"
                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
              title="Vista Tarjetas (Mobile-First)"
            >
              <LayoutGrid size={14} />
              <span className="text-[11px]">Tarjetas</span>
            </button>
            <button
              type="button"
              id="ledger-view-table-btn"
              onClick={() => setViewMode("table")}
              className={`p-1.5 px-2 rounded-md text-xs font-semibold flex items-center gap-1 transition-all min-h-[36px] ${
                viewMode === "table"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-bold"
                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
              title="Vista Tabla Ejecutiva"
            >
              <TableIcon size={14} />
              <span className="text-[11px]">Tabla</span>
            </button>
            <button
              type="button"
              id="ledger-view-calendar-btn"
              onClick={() => setViewMode("calendar")}
              className={`p-1.5 px-2 rounded-md text-xs font-semibold flex items-center gap-1 transition-all min-h-[36px] ${
                viewMode === "calendar"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-bold text-amber-600 dark:text-amber-400"
                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
              title="Vista Calendario Mensual (Arrastrar para mover fecha límite)"
            >
              <CalendarIcon size={14} className={viewMode === "calendar" ? "text-amber-500" : ""} />
              <span className="text-[11px]">Calendario</span>
            </button>
          </div>

          {/* Sort by Urgency Toggle Button */}
          <button
            type="button"
            id="ledger-sort-urgency-toggle-btn"
            onClick={() => {
              setSortByUrgency((prev) => !prev);
              playChime("tick");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all shrink-0 min-h-[36px] ${
              sortByUrgency
                ? "bg-amber-500 text-stone-950 border-amber-600 shadow-xs ring-2 ring-amber-500/30 font-bold"
                : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-600 hover:text-amber-600 font-medium"
            }`}
            title={
              sortByUrgency
                ? "Desactivar orden por Urgencia"
                : "Ordenar por Urgencia: prioriza tareas con fechas límite próximas/vencidas y etiquetas de urgencia"
            }
          >
            <Flame
              size={14}
              className={
                sortByUrgency
                  ? "text-stone-950 fill-stone-950 animate-pulse"
                  : "text-amber-500"
              }
            />
            <span className="hidden xs:inline">{sortByUrgency ? "⚡ Por Urgencia" : "Ordenar por Urgencia"}</span>
            <span className="xs:hidden">Urgencia</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                sortByUrgency
                  ? "bg-stone-950 text-amber-400"
                  : "bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400"
              }`}
            >
              {sortByUrgency ? "ON" : "OFF"}
            </span>
          </button>

          <button
            id="copy-markdown-ledger-btn"
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0 min-h-[36px]"
            title="Copiar Ledger en formato Markdown exacto"
          >
            {copiedMd ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span className="hidden sm:inline">Copiar</span> Markdown
          </button>

          {onOpenWorkspaceModal && (
            <button
              id="ledger-open-workspace-btn"
              onClick={onOpenWorkspaceModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-xs font-bold text-amber-950 dark:text-amber-200 transition-all shrink-0 min-h-[36px]"
              title="Sincronizar y exportar con Google Workspace (Calendar, Tasks, Sheets)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Google & Cloud</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 bg-stone-50/70 dark:bg-stone-900/50 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mr-1">
            Estado:
          </span>
          {(["Activas", "Todos", "Pendiente", "En Proceso", "Completado"] as StatusFilter[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === status
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
                }`}
              >
                {status}
                {status === "Activas" && ` (${activeCount})`}
                {status === "Completado" && ` (${completedCount})`}
              </button>
            )
          )}
        </div>

        {/* Domain quick filter */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mr-1">
            Dominio:
          </span>
          {(
            [
              "Todos",
              "FGDLL",
              "Universidad",
              "Technology",
              "Diseño",
              "Laura",
              "Personal",
            ] as DomainType[]
          ).map((domain) => (
            <button
              key={domain}
              onClick={() => setDomainFilter(domain)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                domainFilter === domain
                  ? "bg-stone-200 text-stone-900 dark:bg-stone-700 dark:text-stone-100"
                  : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
              }`}
            >
              {domain}
            </button>
          ))}
        </div>
      </div>

      {/* Tag Filter Row */}
      {availableTags.length > 0 && (
        <div className="px-4 py-2 bg-stone-100/60 dark:bg-stone-900/40 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 text-xs overflow-x-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <TagIcon size={12} />
              Etiquetas:
            </span>
            <button
              onClick={() => setTagFilter("Todas")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                tagFilter === "Todas"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold shadow-xs"
                  : "text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800"
              }`}
            >
              Todas
            </button>
            {availableTags.map((tag) => {
              const isSelected = tagFilter === tag.nombre;
              const count = tasks.filter((t) => t.etiquetas?.includes(tag.nombre)).length;
              return (
                <button
                  key={tag.id}
                  onClick={() => setTagFilter(isSelected ? "Todas" : tag.nombre)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? `${getTagColorClass(tag.color)} ring-2 ring-stone-900/20 dark:ring-stone-100/30 shadow-xs font-semibold`
                      : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-400"
                  }`}
                >
                  <span>{tag.nombre}</span>
                  {count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-700 font-bold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {onOpenManageTags && (
            <button
              onClick={onOpenManageTags}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline shrink-0 px-2 py-1 rounded-md hover:bg-amber-100/50 dark:hover:bg-amber-950/40"
              title="Añadir, editar o eliminar etiquetas personalizadas"
            >
              <Settings2 size={13} />
              <span>Gestionar Etiquetas</span>
            </button>
          )}
        </div>
      )}

      {/* Urgency Sort Active Notification Banner */}
      {sortByUrgency && (
        <div
          id="ledger-urgency-active-banner"
          className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/80 flex items-center justify-between gap-2 text-xs text-amber-950 dark:text-amber-200 animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="font-bold flex items-center gap-1 shrink-0 text-amber-900 dark:text-amber-300">
              <Flame size={13} className="text-amber-600 dark:text-amber-400 fill-amber-500" />
              <span>Orden por Urgencia Activo:</span>
            </span>
            <span className="text-stone-600 dark:text-stone-300 text-[11px] sm:text-xs">
              Tareas ordenadas por <strong>Urgency Score</strong> según proximidad de fecha límite (vencidas, hoy, próximos días) y etiquetas clave (Urgente, Crítico, Importante).
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSortByUrgency(false);
              playChime("tick");
            }}
            className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:underline shrink-0 ml-2"
          >
            Restablecer orden
          </button>
        </div>
      )}

      {/* Tasks Content: Cards, Table, or Monthly Drag-and-Drop Calendar */}
      {viewMode === "calendar" ? (
        <div className="bg-stone-50/30 dark:bg-stone-950/20">
          <TaskCalendarView
            tasks={displayedTasks}
            esencialTaskId={esencialTaskId}
            secundariasTaskIds={secundariasTaskIds}
            availableTags={availableTags}
            onToggleStatus={onToggleStatus}
            onSetStatus={onSetStatus}
            onStartFocus={onStartFocus}
            onSetEsencial={onSetEsencial}
            onUpdateTaskFechaLimite={(id, date) => onUpdateTaskFechaLimite?.(id, date)}
            onMessageContact={openWhatsAppContact}
          />
        </div>
      ) : viewMode === "cards" ? (
        <div className="p-3 sm:p-4 bg-stone-50/40 dark:bg-stone-950/20">
          {displayedTasks.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs">
              No hay tareas registradas que coincidan con el filtro.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedTasks.map((task) => (
                <TaskCardMobile
                  key={task.id}
                  task={task}
                  isEsencial={task.id === esencialTaskId}
                  isSecundaria={secundariasTaskIds.includes(task.id)}
                  availableTags={availableTags}
                  showUrgencyScore={sortByUrgency}
                  onSetStatus={onSetStatus}
                  onStartFocus={onStartFocus}
                  onSetEsencial={onSetEsencial}
                  onOpenWhatsApp={openWhatsAppContact}
                  onViewImage={(src, title) => setViewingImage({ src, title })}
                  onUpdateNotes={(id, notes) => onUpdateTaskNotes?.(id, notes)}
                  onToggleTaskTag={onToggleTaskTag}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Main Table — Exact columns: ID | Solicitante | Tarea | Estado | Fecha de Ingreso */
        <div className="overflow-x-auto">
          <table id="ledger-maestro-table" className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-stone-100/80 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 font-semibold border-b border-stone-200 dark:border-stone-800 select-none">
              <tr>
                <th className="py-3 px-3 sm:px-4 w-14 text-center">ID</th>
                <th className="py-3 px-3 sm:px-4 w-32 sm:w-44">Solicitante</th>
                <th className="py-3 px-3 sm:px-4">Tarea</th>
                <th className="py-3 px-3 sm:px-4 w-36 text-center">Estado</th>
                <th className="py-3 px-3 sm:px-4 w-32 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSortByUrgency((prev) => !prev);
                      playChime("tick");
                    }}
                    className={`inline-flex items-center gap-1 mx-auto transition-colors font-semibold ${
                      sortByUrgency
                        ? "text-amber-600 dark:text-amber-400 font-bold"
                        : "hover:text-amber-600 dark:hover:text-amber-400"
                    }`}
                    title={
                      sortByUrgency
                        ? "Desactivar orden por urgencia"
                        : "Ordenar por Urgencia (Fecha Límite + Etiquetas)"
                    }
                  >
                    <span>{sortByUrgency ? "Urgencia / Fecha" : "Fecha de Ingreso"}</span>
                    <Flame
                      size={12}
                      className={
                        sortByUrgency
                          ? "text-amber-500 fill-amber-500 animate-pulse"
                          : "text-stone-400"
                      }
                    />
                  </button>
                </th>
                <th className="py-3 px-3 sm:px-4 w-24 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {displayedTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    No hay tareas registradas que coincidan con el filtro.
                  </td>
                </tr>
              ) : (
                displayedTasks.map((task) => (
                  <TaskItemRow
                    key={task.id}
                    task={task}
                    isEsencial={task.id === esencialTaskId}
                    isSecundaria={secundariasTaskIds.includes(task.id)}
                    availableTags={availableTags}
                    showUrgencyScore={sortByUrgency}
                    onToggleStatus={onToggleStatus}
                    onSetStatus={onSetStatus}
                    onStartFocus={onStartFocus}
                    onSetEsencial={onSetEsencial}
                    onOpenWhatsApp={openWhatsAppContact}
                    onToggleTaskTag={onToggleTaskTag}
                    onTagFilterSelect={(t) => setTagFilter(t)}
                    onViewImage={(src, title) => setViewingImage({ src, title })}
                    onUpdateNotes={(id, notes) => onUpdateTaskNotes?.(id, notes)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer advice from Laura-OS / Pepe principles */}
      <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-900/60 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
        <span>
          💡 <em>"Una sola prioridad principal. Menos tareas activas, más tareas terminadas."</em>
        </span>
        <span className="hidden sm:inline">Haz clic en el estado para cambiarlo directamente</span>
      </div>

      {/* Reference Image Lightbox Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-stone-900 rounded-2xl overflow-hidden border border-stone-800 shadow-2xl p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 px-2 border-b border-stone-800">
              <span className="text-xs font-semibold text-stone-200 truncate">
                {viewingImage.title}
              </span>
              <button
                onClick={() => setViewingImage(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center max-h-[75vh] overflow-hidden rounded-xl bg-black/40">
              <img
                src={viewingImage.src}
                alt="Referencia en tamaño completo"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
