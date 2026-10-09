import React, { useState, useEffect, useMemo } from "react";
import {
  Flame,
  Monitor,
  GraduationCap,
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Search,
  Filter,
  DollarSign,
  Printer,
  ChevronRight,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  UserCheck,
  Layers,
  Building2,
  Calendar,
  Send,
  Eye,
  EyeOff,
  Kanban,
  LayoutGrid,
  GripVertical,
  ChevronLeft,
} from "lucide-react";
import { TaskItem, LonasOrder, LonasStatus, WorkspaceTab } from "../types";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, setDoc } from "firebase/firestore";
import { playChime } from "../utils/audio";
import { SPIN_PAYMENT_INFO, ReconocimientoRecord } from "./ReconocimientosOS";
import { AlumnoPendiente, INITIAL_ALUMNOS_PENDIENTES } from "./AlumnosPendientesSection";
import { usePomodoro } from "../context/PomodoroContext";

interface PendientesHubOSProps {
  tasks: TaskItem[];
  lonasOrders: LonasOrder[];
  onNavigateToWorkspace: (ws: WorkspaceTab, contextId?: string | number) => void;
  onCompleteTask: (taskId: number) => void;
  onUpdateLonasOrderStatus?: (orderId: string, newStatus: LonasStatus) => void;
  onSendToPrint?: (title: string, desc: string, cost: number) => void;
}

export default function PendientesHubOS({
  tasks,
  lonasOrders,
  onNavigateToWorkspace,
  onCompleteTask,
  onUpdateLonasOrderStatus,
  onSendToPrint,
}: PendientesHubOSProps) {
  const { setTask, start: startPomodoroTimer } = usePomodoro();

  // Search filter across the hub
  const [globalSearch, setGlobalSearch] = useState("");
  const [activeSectionFilter, setActiveSectionFilter] = useState<"todos" | "tasks" | "lonas" | "reconocimientos" | "pagos">("todos");
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  // Modo de visualización de Lonas: 'kanban' o 'grid'
  const [lonasViewMode, setLonasViewMode] = useState<"kanban" | "grid">(() => {
    try {
      const saved = localStorage.getItem("pendientes_hub_lonas_view_mode");
      if (saved === "kanban" || saved === "grid") return saved;
    } catch (_) {}
    return "kanban"; // Por defecto visualización Kanban solicitada
  });

  useEffect(() => {
    try {
      localStorage.setItem("pendientes_hub_lonas_view_mode", lonasViewMode);
    } catch (_) {}
  }, [lonasViewMode]);

  // Estados para Drag & Drop interactivo en el tablero Kanban
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Reconocimientos & Solicitudes state
  const [reconocimientos, setReconocimientos] = useState<ReconocimientoRecord[]>([]);
  const [animatingBtnKey, setAnimatingBtnKey] = useState<string | null>(null);
  const [alumnosPendientes, setAlumnosPendientes] = useState<AlumnoPendiente[]>(() => {
    try {
      const saved = localStorage.getItem("reconocimientos_alumnos_pendientes_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_ALUMNOS_PENDIENTES;
  });

  // Finanzas expected incomes
  const [finanzasIncomes, setFinanzasIncomes] = useState<Array<{ id: string; concepto: string; montoEsperado: number; estado: string; fechaEsperada?: string }>>(() => {
    try {
      const saved = localStorage.getItem("task_os_finanzas_incomes_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [
      { id: "inc-molas", concepto: "MOLAS", montoEsperado: 6000, estado: "Esperado", fechaEsperada: "11 sep 2026" },
      { id: "inc-diseno", concepto: "Diseño Carteles", montoEsperado: 450, estado: "Esperado", fechaEsperada: "15 sep 2026" },
    ];
  });

  // Real-time listener for reconocimientos and alumnos_pendientes
  useEffect(() => {
    const unsubReconocimientos = onSnapshot(
      collection(db, "reconocimientos"),
      (snapshot) => {
        const list: ReconocimientoRecord[] = [];
        snapshot.forEach((snap) => {
          const d = snap.data();
          list.push({
            id: snap.id,
            nombre: d.nombre || "Sin nombre",
            rol: d.rol || "Líder",
            grupo: d.grupo || "G-1",
            zona: d.zona || "General",
            diplomado: d.diplomado || "Liderazgo I",
            year: String(d.year || "2026"),
            tipoImpresion: d.tipoImpresion || "Primera Impresión",
            costo: Number(d.costo || (d.tipoImpresion === "Primera Impresión" ? 100 : 50)),
            telefono: d.telefono || undefined,
            email: d.email || undefined,
            elaboradoDigital: Boolean(d.elaboradoDigital),
            pagado: Boolean(d.pagado),
            cuadernillos: Boolean(d.cuadernillos),
            audio: Boolean(d.audio),
            digital: Boolean(d.digital),
            impreso: Boolean(d.impreso),
            entregado: Boolean(d.entregado),
          });
        });
        if (list.length > 0) {
          setReconocimientos(list);
        }
      },
      (err) => console.warn("Reconocimientos listener notice in Hub:", err)
    );

    const unsubAlumnosPendientes = onSnapshot(
      collection(db, "alumnos_pendientes"),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: AlumnoPendiente[] = [];
          snapshot.forEach((snap) => {
            list.push({ ...(snap.data() as AlumnoPendiente), id: snap.id });
          });
          setAlumnosPendientes(list);
        }
      },
      (err) => console.warn("Alumnos pendientes listener notice in Hub:", err)
    );

    return () => {
      unsubReconocimientos();
      unsubAlumnosPendientes();
    };
  }, []);

  // Interruptor de Enfoque: Ocultar completados temporalmente (persistente en localStorage)
  const [hideCompleted, setHideCompleted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("pendientes_hub_hide_completed");
      if (saved !== null) return JSON.parse(saved);
    } catch (_) {}
    return true; // Por defecto modo enfoque activado: oculta completados para mantener la atención en lo activo
  });

  useEffect(() => {
    try {
      localStorage.setItem("pendientes_hub_hide_completed", JSON.stringify(hideCompleted));
    } catch (_) {}
  }, [hideCompleted]);

  // 1. Task Pendientes
  const pendingTasks = useMemo(() => {
    return tasks.filter((t) => t.estado !== "Completado");
  }, [tasks]);

  // 2. Lonas (Activas vs Completadas)
  const activeLonas = useMemo(() => {
    return lonasOrders.filter((o) => o.estado !== "Entregado" && o.estado !== "Cancelado");
  }, [lonasOrders]);

  const completedLonas = useMemo(() => {
    return lonasOrders.filter((o) => o.estado === "Entregado" || o.estado === "Cancelado");
  }, [lonasOrders]);

  const displayedLonas = useMemo(() => {
    return hideCompleted ? activeLonas : lonasOrders;
  }, [hideCompleted, activeLonas, lonasOrders]);

  // 3. Reconocimientos Oficiales y Alumnos (Activos vs Completados)
  const activeOfficialReconocimientos = useMemo(() => {
    return reconocimientos.filter((r) => !r.entregado);
  }, [reconocimientos]);

  const completedOfficialReconocimientos = useMemo(() => {
    return reconocimientos.filter((r) => r.entregado);
  }, [reconocimientos]);

  const activeAlumnos = useMemo(() => {
    return alumnosPendientes.filter((a) => a.estatus !== "Confirmado" && a.estatus !== "Graduado");
  }, [alumnosPendientes]);

  const completedAlumnos = useMemo(() => {
    return alumnosPendientes.filter((a) => a.estatus === "Confirmado" || a.estatus === "Graduado");
  }, [alumnosPendientes]);

  const displayedReconocimientos = useMemo(() => {
    const official = hideCompleted ? activeOfficialReconocimientos : reconocimientos;
    const alumnos = hideCompleted ? activeAlumnos : alumnosPendientes;
    return {
      official,
      alumnos,
      totalCount: official.length + alumnos.length,
      activeCount: activeOfficialReconocimientos.length + activeAlumnos.length,
      completedCount: completedOfficialReconocimientos.length + completedAlumnos.length,
    };
  }, [
    hideCompleted,
    activeOfficialReconocimientos,
    completedOfficialReconocimientos,
    activeAlumnos,
    completedAlumnos,
    reconocimientos,
    alumnosPendientes,
  ]);

  // Total de elementos completados que se ocultan en modo enfoque
  const totalCompletedHidden = useMemo(() => {
    return completedLonas.length + completedOfficialReconocimientos.length + completedAlumnos.length;
  }, [completedLonas, completedOfficialReconocimientos, completedAlumnos]);

  // 4. Pagos Pendientes (Reconocimientos no pagados + Saldos Lonas + Finanzas esperadas)
  const pendingPayments = useMemo(() => {
    // A. Reconocimientos con pagado = false
    const recsNoPagados = reconocimientos.filter((r) => !r.pagado);
    const totalRecsMonto = recsNoPagados.reduce((sum, r) => sum + (r.costo || 100), 0);

    // B. Lonas con saldo pendiente
    const lonasConSaldo = lonasOrders.filter((o) => (o.saldo || 0) > 0 && o.estado !== "Cancelado");
    const totalLonasSaldo = lonasConSaldo.reduce((sum, o) => sum + (o.saldo || 0), 0);

    // C. Finanzas ingresos esperados
    const finanzasEsperados = finanzasIncomes.filter((i) => i.estado === "Esperado");
    const totalFinanzasMonto = finanzasEsperados.reduce((sum, i) => sum + (i.montoEsperado || 0), 0);

    const totalGeneral = totalRecsMonto + totalLonasSaldo + totalFinanzasMonto;

    return {
      recsNoPagados,
      totalRecsMonto,
      lonasConSaldo,
      totalLonasSaldo,
      finanzasEsperados,
      totalFinanzasMonto,
      totalGeneral,
    };
  }, [reconocimientos, lonasOrders, finanzasIncomes]);

  // Handlers for instant interactive actions
  const handleCopyBank = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBankField(fieldId);
    playChime("tick");
    setTimeout(() => setCopiedBankField(null), 2000);
  };

  const handleStartTaskPomodoro = (task: TaskItem) => {
    setTask(task.tarea, task.id, 25);
    startPomodoroTimer();
    playChime("tick");
  };

  const handleToggleRecElaboradoDigital = async (rec: ReconocimientoRecord) => {
    const nextVal = !rec.elaboradoDigital;
    const clickKey = `${rec.id}-elaboradoDigital`;
    setAnimatingBtnKey(clickKey);
    setTimeout(() => {
      setAnimatingBtnKey((curr) => (curr === clickKey ? null : curr));
    }, 450);
    setReconocimientos((prev) =>
      prev.map((r) => (r.id === rec.id ? { ...r, elaboradoDigital: nextVal } : r))
    );
    try {
      await updateDoc(doc(db, "reconocimientos", rec.id), { elaboradoDigital: nextVal });
    } catch (_) {}
    playChime(nextVal ? "success" : "tick");
  };

  const handleToggleRecPagado = async (rec: ReconocimientoRecord) => {
    const nextVal = !rec.pagado;
    const clickKey = `${rec.id}-pagado`;
    setAnimatingBtnKey(clickKey);
    setTimeout(() => {
      setAnimatingBtnKey((curr) => (curr === clickKey ? null : curr));
    }, 450);
    setReconocimientos((prev) =>
      prev.map((r) => (r.id === rec.id ? { ...r, pagado: nextVal } : r))
    );
    try {
      await updateDoc(doc(db, "reconocimientos", rec.id), { pagado: nextVal });
    } catch (_) {}
    playChime(nextVal ? "success" : "tick");
  };

  const handleToggleRecEntregado = async (rec: ReconocimientoRecord) => {
    const nextVal = !rec.entregado;
    setReconocimientos((prev) =>
      prev.map((r) => (r.id === rec.id ? { ...r, entregado: nextVal } : r))
    );
    try {
      await updateDoc(doc(db, "reconocimientos", rec.id), { entregado: nextVal });
    } catch (_) {}
    playChime(nextVal ? "success" : "tick");
  };

  // Open WhatsApp with client or student
  const handleOpenWhatsApp = (phone?: string, text?: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9]/g, "");
    const formatted = clean.length === 10 ? `52${clean}` : clean;
    const url = text
      ? `https://wa.me/${formatted}?text=${encodeURIComponent(text)}`
      : `https://wa.me/${formatted}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Drag & Drop handlers for Kanban
  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData("text/plain", orderId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedOrderId(orderId);
  };

  const handleDragEnd = () => {
    setDraggedOrderId(null);
    setDragOverColId(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colId: string) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverColId === colId) {
      setDragOverColId(null);
    }
  };

  const handleDropOnColumn = (e: React.DragEvent, targetStatus: LonasStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData("text/plain") || draggedOrderId;
    setDragOverColId(null);
    setDraggedOrderId(null);
    if (!orderId) return;

    const order = lonasOrders.find((o) => o.id === orderId);
    if (order && order.estado !== targetStatus) {
      if (onUpdateLonasOrderStatus) {
        onUpdateLonasOrderStatus(orderId, targetStatus);
      }
      playChime(targetStatus === "Entregado" || targetStatus === "Listo" ? "success" : "tick");
    }
  };

  // Movimiento rápido de fase (útil en móviles o sin ratón)
  const handleMoveOrderStage = (orderId: string, direction: "prev" | "next") => {
    const order = lonasOrders.find((o) => o.id === orderId);
    if (!order) return;
    const stages: LonasStatus[] = ["Cotización", "Anticipo recibido", "Producción", "Listo", "Entregado"];
    let currentIndex = stages.indexOf(order.estado);
    if (currentIndex === -1) {
      if (
        order.estado === "Diseño" ||
        order.estado === "Esperando aprobación" ||
        order.estado === "Aprobado" ||
        order.estado === "Acabados"
      ) {
        currentIndex = 2; // Producción
      } else if (order.estado === "Cancelado") {
        currentIndex = 4; // Entregado
      } else {
        currentIndex = 0;
      }
    }
    const newIndex =
      direction === "next"
        ? Math.min(stages.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
    const targetStatus = stages[newIndex];
    if (targetStatus !== order.estado && onUpdateLonasOrderStatus) {
      onUpdateLonasOrderStatus(orderId, targetStatus);
      playChime(targetStatus === "Entregado" || targetStatus === "Listo" ? "success" : "tick");
    }
  };

  // 5 Columnas operativas Kanban solicitadas: Cotización, Pendiente Pago, En Producción, Listo, Entregado
  const KANBAN_OPERATIONAL_COLUMNS: Array<{
    id: string;
    title: string;
    targetStatus: LonasStatus;
    colorBadge: string;
    headerBg: string;
    icon: string;
    filterFn: (order: LonasOrder) => boolean;
  }> = [
    {
      id: "cotizacion",
      title: "Cotización",
      targetStatus: "Cotización",
      colorBadge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700",
      headerBg: "from-slate-500/10 to-slate-500/5 border-slate-300 dark:border-slate-700",
      icon: "📄",
      filterFn: (o) => o.estado === "Cotización",
    },
    {
      id: "pendiente_pago",
      title: "Pendiente Pago",
      targetStatus: "Anticipo recibido",
      colorBadge: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800",
      headerBg: "from-amber-500/10 to-amber-500/5 border-amber-300 dark:border-amber-800",
      icon: "💳",
      filterFn: (o) => o.estado === "Anticipo recibido",
    },
    {
      id: "en_produccion",
      title: "En Producción",
      targetStatus: "Producción",
      colorBadge: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
      headerBg: "from-indigo-500/10 to-indigo-500/5 border-indigo-300 dark:border-indigo-800",
      icon: "⚙️",
      filterFn: (o) =>
        o.estado === "Diseño" ||
        o.estado === "Esperando aprobación" ||
        o.estado === "Aprobado" ||
        o.estado === "Producción" ||
        o.estado === "Acabados",
    },
    {
      id: "listo",
      title: "Listo",
      targetStatus: "Listo",
      colorBadge: "bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800",
      headerBg: "from-cyan-500/10 to-cyan-500/5 border-cyan-300 dark:border-cyan-800",
      icon: "✨",
      filterFn: (o) => o.estado === "Listo",
    },
    {
      id: "entregado",
      title: "Entregado",
      targetStatus: "Entregado",
      colorBadge: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      headerBg: "from-emerald-500/10 to-emerald-500/5 border-emerald-300 dark:border-emerald-800",
      icon: "✅",
      filterFn: (o) => o.estado === "Entregado" || o.estado === "Cancelado",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* HEADER BANNER */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-amber-600 via-[#042f66] to-[#021838] text-white shadow-xl relative overflow-hidden border border-amber-500/30">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-white/20 backdrop-blur-md text-white text-base">
                ⚡
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/30 text-amber-200 border border-amber-300/40">
                Vista Simplificada • Centro de Pendientes
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Todo lo Pendiente en un Solo Lugar
            </h2>
            <p className="text-xs sm:text-sm text-stone-200 max-w-2xl leading-relaxed">
              Monitoreo unificado y conectado en vivo con Task-OS, Lonas, Reconocimientos y Finanzas. Realiza acciones directas sin salir de esta vista.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => onNavigateToWorkspace("task-os")}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/20 flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
            >
              <span>🔥 Ir a Task-OS</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToWorkspace("lonas")}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/20 flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
            >
              <span>💻 Ir a Lonas</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToWorkspace("reconocimientos")}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/20 flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
            >
              <span>🎓 Reconocimientos</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToWorkspace("finanzas")}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/20 flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
            >
              <span>🤑 Finanzas</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* 1. Tasks */}
        <button
          type="button"
          onClick={() => setActiveSectionFilter(activeSectionFilter === "tasks" ? "todos" : "tasks")}
          className={`p-4 rounded-3xl bg-white dark:bg-stone-900 border text-left transition shadow-xs hover:border-amber-400 cursor-pointer ${
            activeSectionFilter === "tasks"
              ? "ring-2 ring-amber-500 border-amber-400 bg-amber-50/20"
              : "border-stone-200 dark:border-stone-800"
          }`}
        >
          <span className="text-xs text-stone-500 dark:text-stone-400 font-bold flex items-center justify-between">
            <span>1. Task Pendientes</span>
            <Flame size={16} className="text-amber-500" />
          </span>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {pendingTasks.length}
          </div>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
            Tareas activas sin completar
          </span>
        </button>

        {/* 2. Lonas */}
        <button
          type="button"
          onClick={() => setActiveSectionFilter(activeSectionFilter === "lonas" ? "todos" : "lonas")}
          className={`p-4 rounded-3xl bg-white dark:bg-stone-900 border text-left transition shadow-xs hover:border-blue-400 cursor-pointer ${
            activeSectionFilter === "lonas"
              ? "ring-2 ring-blue-500 border-blue-400 bg-blue-50/20"
              : "border-stone-200 dark:border-stone-800"
          }`}
        >
          <span className="text-xs text-stone-500 dark:text-stone-400 font-bold flex items-center justify-between">
            <span>2. Lonas Pendientes</span>
            <Monitor size={16} className="text-blue-500" />
          </span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {activeLonas.length}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">
            {hideCompleted
              ? "Pedidos en diseño/producción"
              : `${displayedLonas.length} en lista (${completedLonas.length} completadas)`}
          </span>
        </button>

        {/* 3. Reconocimientos */}
        <button
          type="button"
          onClick={() => setActiveSectionFilter(activeSectionFilter === "reconocimientos" ? "todos" : "reconocimientos")}
          className={`p-4 rounded-3xl bg-white dark:bg-stone-900 border text-left transition shadow-xs hover:border-purple-400 cursor-pointer ${
            activeSectionFilter === "reconocimientos"
              ? "ring-2 ring-purple-500 border-purple-400 bg-purple-50/20"
              : "border-stone-200 dark:border-stone-800"
          }`}
        >
          <span className="text-xs text-stone-500 dark:text-stone-400 font-bold flex items-center justify-between">
            <span>3. Reconocimientos</span>
            <GraduationCap size={16} className="text-purple-500" />
          </span>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {displayedReconocimientos.activeCount}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">
            {hideCompleted
              ? "Por entregar y admitidos"
              : `${displayedReconocimientos.totalCount} en lista (${displayedReconocimientos.completedCount} finalizados)`}
          </span>
        </button>

        {/* 4. Pagos */}
        <button
          type="button"
          onClick={() => setActiveSectionFilter(activeSectionFilter === "pagos" ? "todos" : "pagos")}
          className={`p-4 rounded-3xl bg-white dark:bg-stone-900 border text-left transition shadow-xs hover:border-emerald-400 cursor-pointer ${
            activeSectionFilter === "pagos"
              ? "ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/20"
              : "border-stone-200 dark:border-stone-800"
          }`}
        >
          <span className="text-xs text-stone-500 dark:text-stone-400 font-bold flex items-center justify-between">
            <span>4. Pagos Pendientes</span>
            <CreditCard size={16} className="text-emerald-500" />
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 truncate">
            ${pendingPayments.totalGeneral.toLocaleString("es-MX")}{" "}
            <span className="text-xs font-normal text-stone-400">MXN</span>
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
            Suma total por cobrar
          </span>
        </button>
      </div>

      {/* QUICK FILTER BAR & INTERRUPTOR MODO ENFOQUE */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Filtrar por texto en cualquiera de las 4 secciones..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 placeholder:font-normal focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
          {/* INTERRUPTOR: OCULTAR COMPLETADOS (MODO ENFOQUE) */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700 select-none shadow-2xs">
            <div className="flex items-center gap-1.5">
              {hideCompleted ? (
                <EyeOff size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Eye size={15} className="text-stone-500 shrink-0" />
              )}
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black text-stone-900 dark:text-stone-100 leading-tight">
                    Ocultar completados
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider ${
                      hideCompleted
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        : "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400"
                    }`}
                  >
                    {hideCompleted ? "Solo Activos" : "Todos"}
                  </span>
                </div>
                <span className="text-[9.5px] text-stone-500 dark:text-stone-400 leading-tight">
                  {hideCompleted
                    ? `${totalCompletedHidden} completados ocultos (Enfoque)`
                    : "Lonas y recs. completados visibles"}
                </span>
              </div>
            </div>

            {/* Visual Slider Switch */}
            <button
              type="button"
              id="switch-ocultar-completados"
              role="switch"
              aria-checked={hideCompleted}
              aria-label="Interruptor para ocultar temporalmente órdenes de lonas y reconocimientos completados"
              onClick={() => {
                const nextVal = !hideCompleted;
                setHideCompleted(nextVal);
                playChime(nextVal ? "success" : "tick");
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                hideCompleted ? "bg-emerald-600" : "bg-stone-300 dark:bg-stone-600"
              }`}
              title={
                hideCompleted
                  ? "Interruptor activo: Órdenes de lonas y reconocimientos completados están ocultos. Clic para mostrarlos."
                  : "Interruptor inactivo: Mostrando todos los registros. Clic para ocultar completados y enfocarse solo en lo activo."
              }
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  hideCompleted ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Bloques de sección */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-stone-500 text-[11px] hidden sm:inline">Bloque:</span>
            {(["todos", "tasks", "lonas", "reconocimientos", "pagos"] as const).map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setActiveSectionFilter(sec)}
                className={`px-2.5 py-1 rounded-xl text-xs capitalize transition cursor-pointer ${
                  activeSectionFilter === sec
                    ? "bg-[#042f66] text-white shadow-xs"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900"
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BANNER INFORMATIVO CUANDO EL MODO ENFOQUE ESTÁ ACTIVO Y HAY ÍTEMS OCULTOS */}
      {hideCompleted && totalCompletedHidden > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-emerald-500/25 text-xs text-stone-800 dark:text-stone-200">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
              🎯
            </span>
            <span className="font-medium text-[11.5px] leading-snug">
              <strong className="font-black text-emerald-700 dark:text-emerald-300">Modo Enfoque activo:</strong> Ocultando temporalmente {completedLonas.length} {completedLonas.length === 1 ? "orden de lona entregada" : "órdenes de lonas entregadas"} y {completedOfficialReconocimientos.length + completedAlumnos.length} {completedOfficialReconocimientos.length + completedAlumnos.length === 1 ? "reconocimiento/alumno completado" : "reconocimientos/alumnos completados"}.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setHideCompleted(false);
              playChime("tick");
            }}
            className="px-3 py-1 rounded-xl bg-white dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] border border-emerald-300/40 dark:border-emerald-700 transition cursor-pointer shrink-0 self-start sm:self-auto shadow-2xs"
          >
            Mostrar completados
          </button>
        </div>
      )}

      {/* ========================================================
          SECCIÓN 1: TASK PENDIENTES (🔥 TASK-OS)
      ======================================================== */}
      {(activeSectionFilter === "todos" || activeSectionFilter === "tasks") && (
        <div id="seccion-tasks-pendientes" className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/15 text-amber-500 text-sm">
                🔥
              </span>
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
                1. Task Pendientes ({pendingTasks.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToWorkspace("task-os")}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition"
            >
              <span>Abrir en Task-OS</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
              🎉 ¡Felicidades! No hay tareas pendientes en Task-OS.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingTasks
                .filter(
                  (t) =>
                    !globalSearch ||
                    t.tarea.toLowerCase().includes(globalSearch.toLowerCase()) ||
                    t.solicitante.toLowerCase().includes(globalSearch.toLowerCase())
                )
                .map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs hover:shadow-xs transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            {task.estado}
                          </span>
                          {task.dominio && (
                            <span className="text-[10px] font-bold text-stone-400">
                              • {task.dominio}
                            </span>
                          )}
                        </div>
                        <h4 className="font-black text-xs sm:text-sm text-stone-900 dark:text-stone-100 leading-snug">
                          {task.tarea}
                        </h4>
                        <p className="text-[11px] text-stone-500">
                          De: <strong className="text-stone-700 dark:text-stone-300">{task.solicitante}</strong>
                          {task.fechaLimite && ` • Entrega: ${task.fechaLimite}`}
                        </p>
                      </div>

                      {/* 1-click Complete */}
                      <button
                        type="button"
                        onClick={() => {
                          onCompleteTask(task.id);
                          playChime("success");
                        }}
                        className="p-2 rounded-xl bg-stone-100 hover:bg-emerald-50 dark:bg-stone-800 dark:hover:bg-emerald-950 text-stone-500 hover:text-emerald-600 transition shrink-0 cursor-pointer"
                        title="Marcar tarea como completada"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800/80 text-xs">
                      <button
                        type="button"
                        onClick={() => handleStartTaskPomodoro(task)}
                        className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                        title="Iniciar sesión de Pomodoro con esta tarea"
                      >
                        <Play size={11} className="fill-current" />
                        <span>Enfocar en Pomodoro</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {task.contacto?.telefono && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenWhatsApp(
                                task.contacto?.telefono,
                                `Hola ${task.contacto?.nombre || task.solicitante}, sobre tu solicitud: "${task.tarea}"...`
                              )
                            }
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
                            title="Mandar WhatsApp al solicitante"
                          >
                            <MessageCircle size={14} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onNavigateToWorkspace("task-os", task.id)}
                          className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>Ver en Task-OS</span>
                          <ExternalLink size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          SECCIÓN 2: LONAS PENDIENTES (💻 LONAS-OS)
      ======================================================== */}
      {(activeSectionFilter === "todos" || activeSectionFilter === "lonas") && (
        <div id="seccion-lonas-pendientes" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-stone-200 dark:border-stone-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-1 rounded-lg bg-blue-500/15 text-blue-500 text-sm">
                💻
              </span>
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
                2. Lonas {hideCompleted ? "Activas" : "Totales"} ({displayedLonas.length})
              </h3>
              {hideCompleted && completedLonas.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setHideCompleted(false);
                    playChime("tick");
                  }}
                  className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50 hover:bg-emerald-200 transition cursor-pointer"
                  title="Clic para ver las órdenes entregadas"
                >
                  🎯 {completedLonas.length} entregadas ocultas (Ver)
                </button>
              ) : !hideCompleted && completedLonas.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setHideCompleted(true);
                    playChime("tick");
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-300 dark:border-stone-700 hover:bg-stone-200 transition cursor-pointer"
                  title="Clic para ocultar órdenes entregadas"
                >
                  👁️ Mostrando entregadas (Ocultar)
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {/* Selector de modo de vista: Tablero Kanban vs Cuadrícula */}
              <div className="flex items-center p-0.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold">
                <button
                  type="button"
                  id="tablero-kanban-toggle-btn"
                  onClick={() => {
                    setLonasViewMode("kanban");
                    playChime("tick");
                  }}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer text-xs ${
                    lonasViewMode === "kanban"
                      ? "bg-white dark:bg-stone-900 text-blue-600 dark:text-blue-400 font-black shadow-2xs"
                      : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-300"
                  }`}
                  title="Ver como Tablero Kanban interactivo con arrastrar y soltar"
                >
                  <Kanban size={13} />
                  <span>Tablero Kanban</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLonasViewMode("grid");
                    playChime("tick");
                  }}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer text-xs ${
                    lonasViewMode === "grid"
                      ? "bg-white dark:bg-stone-900 text-blue-600 dark:text-blue-400 font-black shadow-2xs"
                      : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-300"
                  }`}
                  title="Ver en formato de cuadrícula tradicional"
                >
                  <LayoutGrid size={13} />
                  <span>Cuadrícula</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToWorkspace("lonas")}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
              >
                <span>Abrir en Lonas</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* VISTA 1: TABLERO KANBAN INTERACTIVO CON DRAG & DROP */}
          {lonasViewMode === "kanban" ? (
            <div className="space-y-2.5">
              {/* Barra instructiva de drag & drop */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400 px-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <GripVertical size={13} className="text-blue-500 shrink-0" />
                  <span>
                    <strong>Tablero Operativo:</strong> Arrastra tarjetas entre columnas para cambiar su estatus en vivo.
                  </span>
                </span>
                <span className="font-bold text-stone-400">
                  {displayedLonas.length} órdenes registradas
                </span>
              </div>

              {/* Contenedor de 5 Columnas Kanban */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-start overflow-x-auto pb-4 pt-1">
                {KANBAN_OPERATIONAL_COLUMNS.map((col, colIndex) => {
                  const isEntregadoCol = col.id === "entregado";
                  // Filtrar órdenes que corresponden a esta columna
                  const colOrders = lonasOrders
                    .filter((o) => col.filterFn(o))
                    .filter(
                      (o) =>
                        !globalSearch ||
                        o.cliente.nombre.toLowerCase().includes(globalSearch.toLowerCase()) ||
                        String(o.folio).includes(globalSearch)
                    );

                  // Si el modo enfoque está activo, las órdenes entregadas se ocultan por defecto en la vista
                  const visibleColOrders = isEntregadoCol && hideCompleted ? [] : colOrders;
                  const isDragOver = dragOverColId === col.id;
                  const totalColMonto = colOrders.reduce((sum, o) => sum + (o.total || 0), 0);

                  return (
                    <div
                      key={col.id}
                      onDragOver={(e) => handleDragOver(e, col.id)}
                      onDragEnter={(e) => handleDragOver(e, col.id)}
                      onDragLeave={(e) => handleDragLeave(e, col.id)}
                      onDrop={(e) => handleDropOnColumn(e, col.targetStatus)}
                      className={`flex flex-col rounded-2xl border transition-all duration-200 min-h-[380px] p-2.5 ${
                        isDragOver
                          ? "ring-2 ring-blue-500 bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 shadow-md scale-[1.01]"
                          : "bg-stone-50/70 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800"
                      }`}
                    >
                      {/* Cabecera de Columna */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200/80 dark:border-stone-800">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm shrink-0">{col.icon}</span>
                          <h4 className="font-black text-xs text-stone-900 dark:text-stone-100 truncate">
                            {col.title}
                          </h4>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black border shrink-0 ${col.colorBadge}`}
                          >
                            {colOrders.length}
                          </span>
                        </div>

                        <span className="text-[10px] font-black text-stone-500 dark:text-stone-400 font-mono shrink-0">
                          ${totalColMonto.toLocaleString("es-MX")}
                        </span>
                      </div>

                      {/* Drop Target Hint al arrastrar sobre la columna */}
                      {isDragOver && (
                        <div className="p-3 mb-2 rounded-xl border-2 border-dashed border-blue-400 bg-blue-100/50 dark:bg-blue-900/30 text-center text-xs font-black text-blue-700 dark:text-blue-300 animate-pulse flex items-center justify-center gap-1.5">
                          <span>⬇ Soltar para cambiar a {col.title}</span>
                        </div>
                      )}

                      {/* Contenido de Tarjetas en la columna */}
                      <div className="flex-1 space-y-2.5">
                        {/* Estado especial para Entregado en Modo Enfoque */}
                        {isEntregadoCol && hideCompleted && colOrders.length > 0 && (
                          <div className="p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-300/40 dark:border-emerald-800/40 text-center space-y-2">
                            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">
                              🎯 {colOrders.length} {colOrders.length === 1 ? "orden entregada oculta" : "órdenes entregadas ocultas"}
                            </span>
                            <p className="text-[10px] text-stone-500">
                              Ocultas para mejorar tu enfoque. Puedes arrastrar una orden aquí para finalizarla.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setHideCompleted(false);
                                playChime("tick");
                              }}
                              className="px-2 py-1 rounded-lg bg-white dark:bg-stone-800 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300/50 hover:bg-emerald-100 transition cursor-pointer"
                            >
                              Mostrar entregadas
                            </button>
                          </div>
                        )}

                        {visibleColOrders.length === 0 && (!isEntregadoCol || !hideCompleted || colOrders.length === 0) ? (
                          <div className="p-6 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-center text-stone-400 dark:text-stone-500 flex flex-col items-center justify-center gap-1.5 min-h-[140px]">
                            <span className="text-xl opacity-60">{col.icon}</span>
                            <span className="text-[11px] font-bold">Sin órdenes</span>
                            <span className="text-[9.5px]">Arrastra una tarjeta aquí</span>
                          </div>
                        ) : (
                          visibleColOrders.map((order) => {
                            const isBeingDragged = draggedOrderId === order.id;
                            const isCompleted = order.estado === "Entregado" || order.estado === "Cancelado";

                            return (
                              <div
                                key={order.id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, order.id)}
                                onDragEnd={handleDragEnd}
                                className={`group p-3 rounded-xl bg-white dark:bg-stone-900 border transition-all duration-150 select-none shadow-2xs hover:shadow-md cursor-grab active:cursor-grabbing space-y-2 relative ${
                                  isBeingDragged
                                    ? "opacity-30 scale-95 border-dashed border-blue-500"
                                    : isCompleted
                                    ? "border-emerald-300/60 dark:border-emerald-800/40 bg-emerald-50/15 dark:bg-emerald-950/10"
                                    : "border-stone-200 dark:border-stone-800 hover:border-blue-400"
                                }`}
                              >
                                {/* Header Tarjeta: Folio, Drag Handle y Cliente */}
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <div
                                      className="p-0.5 rounded text-stone-300 group-hover:text-stone-500 dark:group-hover:text-stone-400 transition cursor-grab active:cursor-grabbing"
                                      title="Arrastrar tarjeta para mover de estatus"
                                    >
                                      <GripVertical size={13} />
                                    </div>
                                    <span className="font-mono font-black text-[11px] text-blue-600 dark:text-blue-400 shrink-0">
                                      #{order.folio}
                                    </span>
                                    <span
                                      className="font-black text-xs text-stone-900 dark:text-stone-100 truncate"
                                      title={order.cliente.nombre}
                                    >
                                      {order.cliente.nombre}
                                    </span>
                                  </div>

                                  <span className="font-black text-xs text-stone-900 dark:text-stone-100 shrink-0 font-mono">
                                    ${order.total}
                                  </span>
                                </div>

                                {/* Items Specs Resumen */}
                                {order.items && order.items.length > 0 && (
                                  <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate bg-stone-50 dark:bg-stone-800/50 p-1.5 rounded-lg">
                                    {order.items[0].cantidad}x {order.items[0].descripcion}
                                    {order.items.length > 1 && ` (+${order.items.length - 1} más)`}
                                  </div>
                                )}

                                {/* Píldoras de Estatus y Saldo */}
                                <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                                  <span
                                    className={`px-1.5 py-0.2 rounded-full font-bold uppercase text-[9px] ${
                                      isCompleted
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                        : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                    }`}
                                  >
                                    {order.estado}
                                  </span>

                                  {order.saldo > 0 ? (
                                    <span className="px-1.5 py-0.2 rounded-full font-black text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                      Saldo: ${order.saldo}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                                      ✓ Pagado
                                    </span>
                                  )}
                                </div>

                                {/* Barra de Acción Rápida: Mover de columna & WhatsApp */}
                                <div className="flex items-center justify-between pt-1.5 border-t border-stone-100 dark:border-stone-800 text-xs">
                                  {/* Botones de navegación de fase rápida */}
                                  <div className="flex items-center gap-1">
                                    {colIndex > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleMoveOrderStage(order.id, "prev")}
                                        className="p-1 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition cursor-pointer"
                                        title={`Mover atrás a ${KANBAN_OPERATIONAL_COLUMNS[colIndex - 1]?.title}`}
                                      >
                                        <ChevronLeft size={11} />
                                      </button>
                                    )}

                                    {colIndex < KANBAN_OPERATIONAL_COLUMNS.length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleMoveOrderStage(order.id, "next")}
                                        className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-black text-[9px] flex items-center gap-0.5 transition cursor-pointer"
                                        title={`Avanzar a ${KANBAN_OPERATIONAL_COLUMNS[colIndex + 1]?.title}`}
                                      >
                                        <span>Avanzar</span>
                                        <ChevronRight size={10} />
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {order.cliente.telefono && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenWhatsApp(
                                            order.cliente.telefono,
                                            `¡Hola ${order.cliente.nombre}! Te escribimos del taller sobre tu pedido #${order.folio}. Estatus actual: ${order.estado}. Saldo: $${order.saldo} MXN.`
                                          )
                                        }
                                        className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
                                        title="Mandar WhatsApp"
                                      >
                                        <MessageCircle size={12} />
                                      </button>
                                    )}

                                    {onSendToPrint && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onSendToPrint(
                                            `Lona #${order.folio}: ${order.cliente.nombre}`,
                                            `Pedido #${order.folio}. Total: $${order.total}, Saldo: $${order.saldo}`,
                                            order.total
                                          )
                                        }
                                        className="p-1 rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                                        title="Imprimir ticket"
                                      >
                                        <Printer size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* VISTA 2: CUADRÍCULA TRADICIONAL */
            displayedLonas.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500 space-y-2">
                {hideCompleted && completedLonas.length > 0 ? (
                  <>
                    <p>🎉 ¡Excelente! No hay lonas activas en diseño o producción en este momento.</p>
                    <p className="text-[11px] text-stone-400">
                      Hay {completedLonas.length} {completedLonas.length === 1 ? "orden entregada oculta" : "órdenes entregadas ocultas"} por el Modo Enfoque.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setHideCompleted(false);
                        playChime("tick");
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                    >
                      <span>Mostrar órdenes entregadas</span>
                    </button>
                  </>
                ) : (
                  <p>🎉 No hay lonas pendientes ni entregadas registradas en este momento.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayedLonas
                  .filter(
                    (o) =>
                      !globalSearch ||
                      o.cliente.nombre.toLowerCase().includes(globalSearch.toLowerCase()) ||
                      String(o.folio).includes(globalSearch)
                  )
                  .map((order) => {
                    const isCompletedOrder = order.estado === "Entregado" || order.estado === "Cancelado";
                    return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-2xl border transition space-y-2.5 shadow-2xs ${
                        isCompletedOrder
                          ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/50"
                          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400">
                              #{order.folio}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                isCompletedOrder
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50"
                                  : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                              }`}
                            >
                              {order.estado}
                            </span>
                            {isCompletedOrder && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-emerald-600 text-white flex items-center gap-0.5">
                                <Check size={9} />
                                <span>Completada</span>
                              </span>
                            )}
                            {order.saldo > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Saldo: ${order.saldo} MXN
                              </span>
                            )}
                          </div>
                          <h4 className="font-black text-xs sm:text-sm text-stone-900 dark:text-stone-100 mt-0.5">
                            {order.cliente.nombre}
                          </h4>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-stone-900 dark:text-stone-100">
                            ${order.total} <span className="text-[10px] text-stone-400 font-normal">MXN</span>
                          </span>
                        </div>
                      </div>

                      {/* Items Specs */}
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 text-[11px] text-stone-600 dark:text-stone-300 space-y-1">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>
                              {it.cantidad}x {it.descripcion} ({it.ancho}m × {it.alto}m = {it.m2.toFixed(1)}m²)
                            </span>
                            <span className="font-bold">${it.costoCalculado}</span>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          {onUpdateLonasOrderStatus && (
                            <select
                              value={order.estado}
                              onChange={(e) => onUpdateLonasOrderStatus(order.id, e.target.value as LonasStatus)}
                              className="px-2 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] font-bold cursor-pointer"
                            >
                              <option value="Cotización">Cotización</option>
                              <option value="Anticipo recibido">Anticipo</option>
                              <option value="Diseño">Diseño</option>
                              <option value="Producción">Producción</option>
                              <option value="Listo">Listo</option>
                              <option value="Entregado">Entregado</option>
                            </select>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {order.cliente.telefono && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenWhatsApp(
                                  order.cliente.telefono,
                                  `¡Hola ${order.cliente.nombre}! Te escribimos del taller sobre tu pedido #${order.folio}. Estatus actual: ${order.estado}. Saldo: $${order.saldo} MXN.`
                                )
                              }
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition"
                              title="Mandar WhatsApp al cliente"
                            >
                              <MessageCircle size={14} />
                            </button>
                          )}

                          {onSendToPrint && (
                            <button
                              type="button"
                              onClick={() =>
                                onSendToPrint(
                                  `Lona #${order.folio}: ${order.cliente.nombre}`,
                                  `Pedido #${order.folio}. Total: $${order.total}, Saldo: $${order.saldo}`,
                                  order.total
                                )
                              }
                              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                              title="Mandar ticket a PrintOS"
                            >
                              <Printer size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onNavigateToWorkspace("lonas")}
                            className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center gap-1"
                          >
                            <span>Ver en Lonas</span>
                            <ExternalLink size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
              </div>
            )
          )}
        </div>
      )}

      {/* ========================================================
          SECCIÓN 3: RECONOCIMIENTOS PENDIENTES (🎓 RECONOCIMIENTOS-OS)
      ======================================================== */}
      {(activeSectionFilter === "todos" || activeSectionFilter === "reconocimientos") && (
        <div id="seccion-reconocimientos-pendientes" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-stone-200 dark:border-stone-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-1 rounded-lg bg-purple-500/15 text-purple-500 text-sm">
                🎓
              </span>
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
                3. Reconocimientos {hideCompleted ? "Pendientes" : "Totales"} ({displayedReconocimientos.totalCount})
              </h3>
              {hideCompleted && (completedOfficialReconocimientos.length + completedAlumnos.length > 0) ? (
                <button
                  type="button"
                  onClick={() => {
                    setHideCompleted(false);
                    playChime("tick");
                  }}
                  className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50 hover:bg-emerald-200 transition cursor-pointer"
                  title="Clic para ver reconocimientos y alumnos completados"
                >
                  🎯 {completedOfficialReconocimientos.length + completedAlumnos.length} finalizados ocultos (Ver)
                </button>
              ) : !hideCompleted && (completedOfficialReconocimientos.length + completedAlumnos.length > 0) ? (
                <button
                  type="button"
                  onClick={() => {
                    setHideCompleted(true);
                    playChime("tick");
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-300 dark:border-stone-700 hover:bg-stone-200 transition cursor-pointer"
                  title="Clic para ocultar reconocimientos completados"
                >
                  👁️ Mostrando finalizados (Ocultar)
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onNavigateToWorkspace("reconocimientos")}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition"
            >
              <span>Abrir en Reconocimientos</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {/* Alumnos Pendientes Admitidos (e.g. Edgar Jose Batun Alpuche) */}
            {displayedReconocimientos.alumnos.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/40 dark:border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-amber-600" />
                    <span className="text-xs font-black text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                      Candidatos y Alumnos {hideCompleted ? "Pendientes de Trámite" : "Registrados"} ({displayedReconocimientos.alumnos.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                    Sección Alumnos Pendientes
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {displayedReconocimientos.alumnos.map((alumno) => {
                    const isCompletedAlumno = alumno.estatus === "Confirmado" || alumno.estatus === "Graduado";
                    return (
                    <div
                      key={alumno.id}
                      className={`p-3.5 rounded-xl border space-y-2 shadow-2xs transition ${
                        isCompletedAlumno
                          ? "bg-emerald-50/25 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/50"
                          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-black text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                              {alumno.nombre}
                            </span>
                            <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {alumno.estatus}
                            </span>
                            {isCompletedAlumno && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-emerald-600 text-white flex items-center gap-0.5">
                                <Check size={9} />
                                <span>Confirmado</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500">
                            {alumno.casa} • {alumno.generacion} • {alumno.rol}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100 dark:border-stone-800">
                        <span className="text-[11px] font-mono text-stone-500">
                          📱 {alumno.telefono}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenWhatsApp(
                                alumno.telefono,
                                `¡Hola ${alumno.nombre}! Te saludamos de ${alumno.casa} (${alumno.generacion}). Te confirmamos que tu estatus es ${alumno.estatus} como ${alumno.rol}. ¿Cómo estás? Te escribimos para darte seguimiento a tus trámites pendientes.`
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] flex items-center gap-1"
                          >
                            <MessageCircle size={11} />
                            <span>WhatsApp Personal</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Solicitudes Oficiales Pendientes de Entrega */}
            {displayedReconocimientos.official.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500 space-y-2">
                {hideCompleted && completedOfficialReconocimientos.length > 0 ? (
                  <>
                    <p>🎉 ¡Excelente! No hay reconocimientos oficiales pendientes de entrega.</p>
                    <p className="text-[11px] text-stone-400">
                      Hay {completedOfficialReconocimientos.length} {completedOfficialReconocimientos.length === 1 ? "reconocimiento entregado oculto" : "reconocimientos entregados ocultos"} por el Modo Enfoque.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setHideCompleted(false);
                        playChime("tick");
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 underline cursor-pointer"
                    >
                      <span>Mostrar reconocimientos entregados</span>
                    </button>
                  </>
                ) : (
                  <p>Todos los reconocimientos oficiales registrados ya fueron entregados.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayedReconocimientos.official
                  .filter(
                    (r) =>
                      !globalSearch ||
                      r.nombre.toLowerCase().includes(globalSearch.toLowerCase()) ||
                      r.grupo.toLowerCase().includes(globalSearch.toLowerCase())
                  )
                  .map((rec) => {
                    const isCompletedRec = rec.entregado;
                    return (
                    <div
                      key={rec.id}
                      className={`p-4 rounded-2xl border transition space-y-2.5 shadow-2xs ${
                        isCompletedRec
                          ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/50"
                          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-black text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                              {rec.nombre}
                            </span>
                            <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                              {rec.rol}
                            </span>
                            {isCompletedRec && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40 flex items-center gap-1">
                                <Check size={9} />
                                <span>Entregado</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500">
                            {rec.grupo} • {rec.zona} • Gen {rec.year}
                          </p>
                        </div>

                        <span className="font-black text-xs text-stone-900 dark:text-stone-100">
                          ${rec.costo} MXN
                        </span>
                      </div>

                      {/* check controls pill preview */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <button
                          type="button"
                          aria-label="Seguimiento Operativo: Reconocimiento Digital"
                          onClick={() => handleToggleRecElaboradoDigital(rec)}
                          className={`px-2 py-0.5 rounded-lg border btn-seguimiento-operativo-scale cursor-pointer ${
                            animatingBtnKey === `${rec.id}-elaboradoDigital`
                              ? "animate-scale-feedback ring-2 ring-cyan-400 shadow-md"
                              : ""
                          } ${
                            rec.elaboradoDigital
                              ? "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300"
                              : "bg-stone-100 text-stone-500 border-stone-300 dark:bg-stone-850 dark:text-stone-400"
                          }`}
                          title="Seguimiento Operativo: ¿Reconocimiento digital ya elaborado? Clic para alternar"
                        >
                          📜 {rec.elaboradoDigital ? "Rec. Hecho" : "Por Elaborar"}
                        </button>

                        <button
                          type="button"
                          aria-label="Seguimiento Operativo: Pago"
                          onClick={() => handleToggleRecPagado(rec)}
                          className={`px-2 py-0.5 rounded-lg border btn-seguimiento-operativo-scale cursor-pointer ${
                            animatingBtnKey === `${rec.id}-pagado`
                              ? "animate-scale-feedback ring-2 ring-emerald-400 shadow-md"
                              : ""
                          } ${
                            rec.pagado
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                          title="Seguimiento Operativo: Clic para cambiar estado de Pago"
                        >
                          💳 {rec.pagado ? "Pagado" : "Pago Pendiente"}
                        </button>

                        <span
                          className={`px-2 py-0.5 rounded-lg border ${
                            rec.cuadernillos
                              ? "bg-stone-100 text-stone-800 border-stone-300"
                              : "bg-stone-50 text-stone-400 border-stone-200"
                          }`}
                        >
                          📚 Cuadernillos: {rec.cuadernillos ? "Sí" : "No"}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-lg border ${
                            rec.audio
                              ? "bg-stone-100 text-stone-800 border-stone-300"
                              : "bg-stone-50 text-stone-400 border-stone-200"
                          }`}
                        >
                          🎙️ Audio: {rec.audio ? "Sí" : "No"}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleRecEntregado(rec)}
                          className={`px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                            rec.entregado
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                          title="Clic para cambiar estado de Entrega"
                        >
                          📦 {rec.entregado ? "Entregado" : "Por Entregar"}
                        </button>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800 text-xs">
                        <div className="flex items-center gap-1.5">
                          {rec.telefono && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenWhatsApp(
                                  rec.telefono,
                                  `Hola ${rec.nombre}, te saludamos de control de reconocimientos (${rec.year}). Tu estatus: Pago ${rec.pagado ? "Recibido" : "Pendiente"}.`
                                )
                              }
                              className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onNavigateToWorkspace("reconocimientos")}
                          className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[11px] flex items-center gap-1"
                        >
                          <span>Ver en Reconocimientos</span>
                          <ExternalLink size={10} />
                        </button>
                      </div>
                    </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          SECCIÓN 4: PAGOS PENDIENTES (💳 COBROS / FINANZAS)
      ======================================================== */}
      {(activeSectionFilter === "todos" || activeSectionFilter === "pagos") && (
        <div id="seccion-pagos-pendientes" className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-500/15 text-emerald-500 text-sm">
                💳
              </span>
              <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
                4. Pagos Pendientes (Total: ${pendingPayments.totalGeneral.toLocaleString("es-MX")} MXN)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToWorkspace("finanzas")}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition"
            >
              <span>Abrir en Finanzas</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* DATOS DE TRANSFERENCIA BANCARIA LAURA CORTAZAR */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-400/40 dark:border-amber-500/30 bg-white dark:bg-stone-900 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-amber-200/40 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <CreditCard size={20} className="text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100">
                    Datos Oficiales para Cobro • LAURA CORTAZAR
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Copia y envía estos datos por WhatsApp para liquidar cualquiera de los pagos pendientes.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleCopyBank(
                    `Datos de Pago Oficial:\n💳 SPIN by OXXO: ${SPIN_PAYMENT_INFO.tarjeta}\n🏦 CLABE: ${SPIN_PAYMENT_INFO.clabe}\n👤 Titular: ${SPIN_PAYMENT_INFO.titular}\n🏪 Código OXXO: ${SPIN_PAYMENT_INFO.codigoOxxo}`,
                    "all-bank-info"
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
              >
                {copiedBankField === "all-bank-info" ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedBankField === "all-bank-info" ? "¡Copiado Todo!" : "Copiar Datos Completos"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-black">CLABE Interbancaria</span>
                  <div className="font-mono font-bold text-stone-900 dark:text-stone-100">{SPIN_PAYMENT_INFO.clabe}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyBank(SPIN_PAYMENT_INFO.clabe, "clabe")}
                  className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  title="Copiar CLABE"
                >
                  {copiedBankField === "clabe" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-black">Tarjeta SPIN</span>
                  <div className="font-mono font-bold text-stone-900 dark:text-stone-100">{SPIN_PAYMENT_INFO.tarjeta}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyBank(SPIN_PAYMENT_INFO.tarjeta, "tarjeta")}
                  className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  title="Copiar Tarjeta"
                >
                  {copiedBankField === "tarjeta" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-black">Código OXXO Pay</span>
                  <div className="font-mono font-bold text-stone-900 dark:text-stone-100">{SPIN_PAYMENT_INFO.codigoOxxo}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyBank(SPIN_PAYMENT_INFO.codigoOxxo, "oxxo")}
                  className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  title="Copiar código OXXO"
                >
                  {copiedBankField === "oxxo" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Desglose de Cobros Pendientes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* A. Reconocimientos por cobrar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800">
                <span className="font-bold text-xs text-stone-700 dark:text-stone-300">
                  🎓 Reconocimientos ({pendingPayments.recsNoPagados.length})
                </span>
                <span className="font-black text-xs text-purple-600 dark:text-purple-400">
                  ${pendingPayments.totalRecsMonto} MXN
                </span>
              </div>

              {pendingPayments.recsNoPagados.length === 0 ? (
                <p className="text-[11px] text-stone-400">Todos los reconocimientos están pagados.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {pendingPayments.recsNoPagados.map((r) => (
                    <div
                      key={r.id}
                      className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/50 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <div className="font-black text-stone-800 dark:text-stone-200">{r.nombre}</div>
                        <div className="text-stone-400 text-[10px]">{r.grupo} • ${r.costo} MXN</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleRecPagado(r)}
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                      >
                        Marcar Pagado
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* B. Saldos de Lonas */}
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800">
                <span className="font-bold text-xs text-stone-700 dark:text-stone-300">
                  💻 Saldos Lonas ({pendingPayments.lonasConSaldo.length})
                </span>
                <span className="font-black text-xs text-blue-600 dark:text-blue-400">
                  ${pendingPayments.totalLonasSaldo} MXN
                </span>
              </div>

              {pendingPayments.lonasConSaldo.length === 0 ? (
                <p className="text-[11px] text-stone-400">No hay saldos pendientes en lonas.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {pendingPayments.lonasConSaldo.map((o) => (
                    <div
                      key={o.id}
                      className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/50 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <div className="font-black text-stone-800 dark:text-stone-200">
                          #{o.folio} {o.cliente.nombre}
                        </div>
                        <div className="text-stone-400 text-[10px]">Saldo por cobrar: ${o.saldo}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateToWorkspace("lonas")}
                        className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px]"
                      >
                        Cobrar en Lonas
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* C. Finanzas Ingresos Esperados */}
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800">
                <span className="font-bold text-xs text-stone-700 dark:text-stone-300">
                  🤑 Finanzas / Clientes ({pendingPayments.finanzasEsperados.length})
                </span>
                <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                  ${pendingPayments.totalFinanzasMonto} MXN
                </span>
              </div>

              {pendingPayments.finanzasEsperados.length === 0 ? (
                <p className="text-[11px] text-stone-400">Sin ingresos pendientes en Finanzas.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {pendingPayments.finanzasEsperados.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/50 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <div className="font-black text-stone-800 dark:text-stone-200">{inc.concepto}</div>
                        <div className="text-stone-400 text-[10px]">Monto: ${inc.montoEsperado} MXN</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateToWorkspace("finanzas")}
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                      >
                        Ver en Finanzas
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
