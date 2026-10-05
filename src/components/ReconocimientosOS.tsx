import React, { useState, useEffect, useMemo } from "react";
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  DollarSign,
  BookOpen,
  Mic,
  Send,
  Printer,
  PackageCheck,
  Plus,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  MapPin,
  Users,
  Download,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  QrCode,
  BarChart3,
  ListFilter,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Share2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from "recharts";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { playChime } from "../utils/audio";
import { cleanPhoneNumber, buildWhatsAppUrl } from "../utils/whatsapp";

export interface ReconocimientoRecord {
  id: string;
  nombre: string;
  rol: string;
  grupo: string;
  zona: string;
  diplomado: string;
  year: string;
  tipoImpresion: string;
  costo: number;
  telefono?: string;
  notas?: string;
  timestamp?: any;
  createdAt?: string;

  // The 6 key tracking checkmarks for Laura:
  pagado: boolean;
  cuadernillos: boolean;
  audio: boolean;
  digital: boolean;
  impreso: boolean;
  entregado: boolean;
}

export const SPIN_PAYMENT_INFO = {
  titular: "LAURA CORTAZAR",
  clabe: "728969000008838228",
  tarjeta: "4217 4701 0045 4061",
  codigoOxxo: "2242-1787-4421-1658",
  whatsappUrl: "https://wa.me/19999011852",
};

interface ReconocimientosOSProps {
  userEmail?: string;
  onOpenPortal?: () => void;
  onSendToPrint?: (title: string, desc: string, cost: number) => void;
}

export default function ReconocimientosOS({
  userEmail = "laurcortazar@gmail.com",
  onOpenPortal,
  onSendToPrint,
}: ReconocimientosOSProps) {
  const [records, setRecords] = useState<ReconocimientoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("todos");
  const [filterPago, setFilterPago] = useState<"todos" | "pagados" | "pendientes">("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  // View Mode: Dashboard | Tabla | Pagos
  const [activeView, setActiveView] = useState<"dashboard" | "tabla" | "pagos">("dashboard");
  const [chartMode, setChartMode] = useState<"estados" | "operativo">("estados");
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);

  // Modal for new manual recognition
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newRol, setNewRol] = useState("Alumno");
  const [newGrupo, setNewGrupo] = useState("");
  const [newZona, setNewZona] = useState("");
  const [newYear, setNewYear] = useState("2026");
  const [newTipo, setNewTipo] = useState<"Primera Impresión" | "Re-impresión">("Primera Impresión");
  const [newTelefono, setNewTelefono] = useState("");
  const [newNotas, setNewNotas] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Real-time sync with Firestore collections ('reconocimientos' and 'solicitudes')
  useEffect(() => {
    setIsLoading(true);
    const mapReconocimientos = new Map<string, ReconocimientoRecord>();
    const mapSolicitudes = new Map<string, ReconocimientoRecord>();

    const mergeAndSet = () => {
      const merged = new Map<string, ReconocimientoRecord>();
      // First put solicitudes
      mapSolicitudes.forEach((val, key) => merged.set(key, val));
      // Overwrite with reconocimientos (which has the updated checklist status)
      mapReconocimientos.forEach((val, key) => merged.set(key, val));

      const list = Array.from(merged.values());
      list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setRecords(list);
      setIsLoading(false);
    };

    const unsubReconocimientos = onSnapshot(
      collection(db, "reconocimientos"),
      (snapshot) => {
        snapshot.forEach((snap) => {
          const d = snap.data();
          mapReconocimientos.set(snap.id, {
            id: snap.id,
            nombre: d.nombre || "Sin nombre",
            rol: d.rol || "Alumno",
            grupo: d.grupo || "G-1",
            zona: d.zona || "General",
            diplomado: d.diplomado || "Liderazgo I",
            year: String(d.year || "2026"),
            tipoImpresion: d.tipoImpresion || "Primera Impresión",
            costo: Number(d.costo || (d.tipoImpresion === "Primera Impresión" ? 100 : 50)),
            telefono: d.telefono || undefined,
            notas: d.notas || undefined,
            timestamp: d.timestamp,
            createdAt: d.createdAt || new Date().toISOString(),
            pagado: Boolean(d.pagado),
            cuadernillos: Boolean(d.cuadernillos),
            audio: Boolean(d.audio),
            digital: Boolean(d.digital),
            impreso: Boolean(d.impreso),
            entregado: Boolean(d.entregado),
          });
        });
        mergeAndSet();
      },
      (err) => {
        console.warn("Notice in reconocimientos listener:", err);
        setIsLoading(false);
      }
    );

    const unsubSolicitudes = onSnapshot(
      collection(db, "solicitudes"),
      (snapshot) => {
        snapshot.forEach((snap) => {
          const d = snap.data();
          if (d && d.nombre && (d.diplomado || d.tipoImpresion || d.costo !== undefined)) {
            mapSolicitudes.set(snap.id, {
              id: snap.id,
              nombre: d.nombre,
              rol: d.rol || "Alumno",
              grupo: d.grupo || "G-1",
              zona: d.zona || "General",
              diplomado: d.diplomado || "Liderazgo I",
              year: String(d.year || "2026"),
              tipoImpresion: d.tipoImpresion || "Primera Impresión",
              costo: Number(d.costo || (d.tipoImpresion === "Primera Impresión" ? 100 : 50)),
              telefono: d.telefono || undefined,
              notas: d.notas || undefined,
              timestamp: d.timestamp,
              createdAt: d.createdAt || new Date().toISOString(),
              pagado: Boolean(d.pagado),
              cuadernillos: Boolean(d.cuadernillos),
              audio: Boolean(d.audio),
              digital: Boolean(d.digital),
              impreso: Boolean(d.impreso),
              entregado: Boolean(d.entregado),
            });
          }
        });
        mergeAndSet();
      },
      (err) => {
        console.warn("Notice in solicitudes listener:", err);
      }
    );

    return () => {
      unsubReconocimientos();
      unsubSolicitudes();
    };
  }, []);

  // 2. Toggle one of the 6 tracking fields with instant Firestore sync
  const handleToggleStatus = async (
    record: ReconocimientoRecord,
    field: "pagado" | "cuadernillos" | "audio" | "digital" | "impreso" | "entregado"
  ) => {
    const nextVal = !record[field];
    playChime("tick");

    // Optimistic UI update
    setRecords((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, [field]: nextVal } : r))
    );

    try {
      const docRef = doc(db, "reconocimientos", record.id);
      await updateDoc(docRef, {
        [field]: nextVal,
        updatedAt: new Date().toISOString(),
      }).catch(() => null);

      const solRef = doc(db, "solicitudes", record.id);
      await updateDoc(solRef, {
        [field]: nextVal,
        updatedAt: new Date().toISOString(),
      }).catch(() => null);

      playChime("success");
    } catch (err) {
      console.warn("Could not update field in Firestore:", err);
    }
  };

  // 3. Delete record
  const handleDeleteRecord = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el registro de ${nombre}?`)) return;
    try {
      await deleteDoc(doc(db, "reconocimientos", id));
      playChime("tick");
    } catch (err) {
      console.warn("Error deleting record:", err);
    }
  };

  // 4. Create new manual record
  const handleCreateManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim()) return;

    setIsSaving(true);
    const costo = newTipo === "Primera Impresión" ? 100 : 50;
    try {
      const payload = {
        nombre: newNombre.trim(),
        rol: newRol.trim(),
        grupo: newGrupo.trim() || "G-1",
        zona: newZona.trim() || "Zona Tiburón",
        diplomado: "Liderazgo I",
        year: newYear,
        tipoImpresion: newTipo,
        costo,
        telefono: newTelefono.trim() || undefined,
        notas: newNotas.trim() || undefined,
        pagado: false,
        cuadernillos: false,
        audio: false,
        digital: false,
        impreso: false,
        entregado: false,
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      };

      await addDoc(collection(db, "reconocimientos"), payload);
      playChime("work_done");
      setShowAddModal(false);
      setNewNombre("");
      setNewGrupo("");
      setNewZona("");
      setNewTelefono("");
      setNewNotas("");
    } catch (err) {
      console.error("Error creating record:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Send status message to student via WhatsApp
  const handleSendWhatsAppStatus = (rec: ReconocimientoRecord) => {
    if (!rec.telefono) {
      alert("Este alumno no tiene registrado su número de teléfono.");
      return;
    }

    const clean = cleanPhoneNumber(rec.telefono);
    const text =
      `Hola ${rec.nombre}, te saludo de parte de Laura Cortazar (Universidad FGDLL).\n\n` +
      `📋 *Estado de tu Reconocimiento (${rec.diplomado} - Generación ${rec.year})*:\n` +
      `• Tipo: ${rec.tipoImpresion} ($${rec.costo})\n` +
      `• Pago: ${rec.pagado ? "✅ Confirmado" : "⏳ Pendiente ($" + rec.costo + ")"}\n` +
      `• Cuadernillos: ${rec.cuadernillos ? "✅ Entregados" : "⏳ Pendiente"}\n` +
      `• Audio: ${rec.audio ? "✅ Recibido" : "⏳ Pendiente"}\n` +
      `• Reconocimiento Digital: ${rec.digital ? "✅ Enviado" : "⏳ En preparación"}\n` +
      `• Impresión Física: ${rec.impreso ? "✅ Impreso" : "⏳ En cola"}\n` +
      `• Entrega: ${rec.entregado ? "✅ ENTREGADO" : "⏳ Pendiente de entrega"}\n\n` +
      `Cualquier duda quedo a tus órdenes. ¡Muchas felicidades!`;

    const url = buildWhatsAppUrl(clean, text);
    window.open(url, "_blank");
  };

  // 6. Filtered records calculation
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.nombre.toLowerCase().includes(q);
        const matchGrupo = r.grupo.toLowerCase().includes(q);
        const matchZona = r.zona.toLowerCase().includes(q);
        const matchRol = r.rol.toLowerCase().includes(q);
        const matchTel = r.telefono ? r.telefono.includes(q) : false;
        if (!matchName && !matchGrupo && !matchZona && !matchRol && !matchTel) return false;
      }

      // Year filter
      if (selectedYear !== "todos" && r.year !== selectedYear) return false;

      // Pago filter
      if (filterPago === "pagados" && !r.pagado) return false;
      if (filterPago === "pendientes" && r.pagado) return false;

      // Special status filter
      if (filterStatus === "pend_cuadernillos" && r.cuadernillos) return false;
      if (filterStatus === "pend_audio" && r.audio) return false;
      if (filterStatus === "pend_digital" && r.digital) return false;
      if (filterStatus === "pend_impresion" && r.impreso) return false;
      if (filterStatus === "listos_entrega" && (!r.impreso || r.entregado)) return false;
      if (filterStatus === "entregados" && !r.entregado) return false;

      return true;
    });
  }, [records, searchQuery, selectedYear, filterPago, filterStatus]);

  // 7. Computed Stats
  const stats = useMemo(() => {
    const total = records.length;
    const pagadosCount = records.filter((r) => r.pagado).length;
    const totalRecaudado = records.filter((r) => r.pagado).reduce((acc, r) => acc + (r.costo || 0), 0);
    const totalPorCobrar = records.filter((r) => !r.pagado).reduce((acc, r) => acc + (r.costo || 0), 0);
    const cuadernillosCount = records.filter((r) => r.cuadernillos).length;
    const audioCount = records.filter((r) => r.audio).length;
    const digitalCount = records.filter((r) => r.digital).length;
    const impresoCount = records.filter((r) => r.impreso).length;
    const entregadoCount = records.filter((r) => r.entregado).length;

    return {
      total,
      pagadosCount,
      totalRecaudado,
      totalPorCobrar,
      cuadernillosCount,
      audioCount,
      digitalCount,
      impresoCount,
      entregadoCount,
    };
  }, [records]);

  // 7b. Solicitudes agrupadas por estado operativo
  const groupedByStatus = useMemo(() => {
    const pendientesPago: ReconocimientoRecord[] = [];
    const enRevisionMaterial: ReconocimientoRecord[] = [];
    const pendientesImpresion: ReconocimientoRecord[] = [];
    const listosEntrega: ReconocimientoRecord[] = [];
    const completadas: ReconocimientoRecord[] = [];

    records.forEach((r) => {
      if (r.entregado) {
        completadas.push(r);
      } else if (r.impreso) {
        listosEntrega.push(r);
      } else if (r.pagado && r.cuadernillos && r.audio) {
        pendientesImpresion.push(r);
      } else if (r.pagado) {
        enRevisionMaterial.push(r);
      } else {
        pendientesPago.push(r);
      }
    });

    return {
      pendientesPago,
      enRevisionMaterial,
      pendientesImpresion,
      listosEntrega,
      completadas,
    };
  }, [records]);

  // Datos para Recharts: Gráfico de Barras por Estado Operativo
  const chartDataStatus = useMemo(() => {
    return [
      {
        estado: "Pend. Pago",
        nombre: "Pendientes de Pago",
        cantidad: groupedByStatus.pendientesPago.length,
        color: "#f59e0b",
      },
      {
        estado: "En Revisión",
        nombre: "En Revisión / Material",
        cantidad: groupedByStatus.enRevisionMaterial.length,
        color: "#3b82f6",
      },
      {
        estado: "Pend. Impresión",
        nombre: "Pendientes de Impresión",
        cantidad: groupedByStatus.pendientesImpresion.length,
        color: "#6366f1",
      },
      {
        estado: "Listas Entrega",
        nombre: "Impresas / Por Entregar",
        cantidad: groupedByStatus.listosEntrega.length,
        color: "#a855f7",
      },
      {
        estado: "Completadas",
        nombre: "Completadas / Entregadas",
        cantidad: groupedByStatus.completadas.length,
        color: "#10b981",
      },
    ];
  }, [groupedByStatus]);

  // Datos para Recharts: Gráfico de Barras agrupando por Estados Actuales (Pagado, Impreso, Entregado, etc.)
  const chartDataStages = useMemo(() => {
    const total = records.length;
    return [
      {
        estado: "Pagado",
        label: "Pagado",
        completadas: stats.pagadosCount,
        pendientes: Math.max(0, total - stats.pagadosCount),
        porcentaje: total > 0 ? Math.round((stats.pagadosCount / total) * 100) : 0,
        color: "#10b981",
      },
      {
        estado: "Cuadernillos",
        label: "Cuadernillos",
        completadas: stats.cuadernillosCount,
        pendientes: Math.max(0, total - stats.cuadernillosCount),
        porcentaje: total > 0 ? Math.round((stats.cuadernillosCount / total) * 100) : 0,
        color: "#3b82f6",
      },
      {
        estado: "Audio",
        label: "Audio",
        completadas: stats.audioCount,
        pendientes: Math.max(0, total - stats.audioCount),
        porcentaje: total > 0 ? Math.round((stats.audioCount / total) * 100) : 0,
        color: "#f59e0b",
      },
      {
        estado: "Digital",
        label: "Digital Enviado",
        completadas: stats.digitalCount,
        pendientes: Math.max(0, total - stats.digitalCount),
        porcentaje: total > 0 ? Math.round((stats.digitalCount / total) * 100) : 0,
        color: "#6366f1",
      },
      {
        estado: "Impreso",
        label: "Impreso Físico",
        completadas: stats.impresoCount,
        pendientes: Math.max(0, total - stats.impresoCount),
        porcentaje: total > 0 ? Math.round((stats.impresoCount / total) * 100) : 0,
        color: "#a855f7",
      },
      {
        estado: "Entregado",
        label: "Entregado",
        completadas: stats.entregadoCount,
        pendientes: Math.max(0, total - stats.entregadoCount),
        porcentaje: total > 0 ? Math.round((stats.entregadoCount / total) * 100) : 0,
        color: "#059669",
      },
    ];
  }, [records.length, stats]);

  // Tooltip personalizado para Recharts
  const renderChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-stone-900 p-3 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 text-xs space-y-1.5 z-50">
          <p className="font-black text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span>{data.label || data.nombre || label}</span>
          </p>
          <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400 font-bold">
            <span>Completadas:</span>
            <span className="font-mono">{data.completadas ?? data.cantidad}</span>
          </div>
          {data.pendientes !== undefined && (
            <div className="flex items-center justify-between gap-4 text-stone-500 font-medium">
              <span>Pendientes:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{data.pendientes}</span>
            </div>
          )}
          {data.porcentaje !== undefined && (
            <div className="pt-1 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-4 text-[11px] text-stone-400">
              <span>Avance de graduación:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{data.porcentaje}%</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Manejo de copia de datos bancarios SPIN
  const handleCopyPaymentField = (fieldKey: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBankField(fieldKey);
    playChime("tick");
    setTimeout(() => setCopiedBankField(null), 2500);
  };

  const handleCopyFullPaymentMessage = () => {
    const msg =
      `*DATOS PARA PAGO DE RECONOCIMIENTO (Liderazgo I)*\n\n` +
      `👤 *Titular:* ${SPIN_PAYMENT_INFO.titular}\n\n` +
      `💳 *CLABE SPIN:* ${SPIN_PAYMENT_INFO.clabe}\n` +
      `💳 *TARJETA SPIN:* ${SPIN_PAYMENT_INFO.tarjeta}\n` +
      `🏪 *CÓDIGO DE DEPÓSITO SPIN (OXXO):* ${SPIN_PAYMENT_INFO.codigoOxxo}\n\n` +
      `💰 *Costo:* $100 (Primera Impresión) / $50 (Re-impresión)\n\n` +
      `📲 Una vez realizado tu pago, por favor envía tu comprobante aquí:\n` +
      `${SPIN_PAYMENT_INFO.whatsappUrl}\n\n` +
      `¡Muchas gracias!`;
    navigator.clipboard.writeText(msg);
    setCopiedBankField("full_message");
    playChime("tick");
    setTimeout(() => setCopiedBankField(null), 2500);
  };

  const handleSendPaymentToStudent = (rec: ReconocimientoRecord) => {
    if (!rec.telefono) {
      alert("Este alumno no tiene número de teléfono registrado.");
      return;
    }
    const clean = cleanPhoneNumber(rec.telefono);
    const msg =
      `Hola ${rec.nombre}, te saludo de parte de Laura Cortazar (Universidad FGDLL).\n\n` +
      `Aquí tienes los datos para realizar el pago de tu reconocimiento (${rec.tipoImpresion} • $${rec.costo}):\n\n` +
      `👤 *Titular:* ${SPIN_PAYMENT_INFO.titular}\n` +
      `💳 *CLABE SPIN:* ${SPIN_PAYMENT_INFO.clabe}\n` +
      `💳 *TARJETA SPIN:* ${SPIN_PAYMENT_INFO.tarjeta}\n` +
      `🏪 *CÓDIGO DE DEPÓSITO SPIN (OXXO):* ${SPIN_PAYMENT_INFO.codigoOxxo}\n` +
      `💰 *Importe:* $${rec.costo} MXN\n\n` +
      `En cuanto hagas tu transferencia o depósito en OXXO, envíame tu comprobante aquí: ${SPIN_PAYMENT_INFO.whatsappUrl} para avanzar con tu impresión. ¡Muchas gracias!`;
    const url = buildWhatsAppUrl(clean, msg);
    window.open(url, "_blank");
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Nombre",
      "Rol",
      "Grupo",
      "Zona",
      "Diplomado",
      "Generacion",
      "TipoImpresion",
      "Costo",
      "Telefono",
      "Pagado",
      "Cuadernillos",
      "Audio",
      "DigitalEnviado",
      "Impreso",
      "Entregado",
      "FechaRegistro",
    ];

    const rows = records.map((r) => [
      `"${r.id}"`,
      `"${r.nombre}"`,
      `"${r.rol}"`,
      `"${r.grupo}"`,
      `"${r.zona}"`,
      `"${r.diplomado}"`,
      `"${r.year}"`,
      `"${r.tipoImpresion}"`,
      r.costo,
      `"${r.telefono || ""}"`,
      r.pagado ? "SI" : "NO",
      r.cuadernillos ? "SI" : "NO",
      r.audio ? "SI" : "NO",
      r.digital ? "SI" : "NO",
      r.impreso ? "SI" : "NO",
      r.entregado ? "SI" : "NO",
      `"${r.createdAt || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reconocimientos_liderazgo_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 text-white shadow-lg relative overflow-hidden border border-indigo-500/30">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-white/20 backdrop-blur-md text-white text-xl">
                🎓
              </span>
              <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 text-indigo-100 backdrop-blur-xs">
                Módulo Oficial • Liderazgo I
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Control de Reconocimientos e Impresiones
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100 max-w-2xl leading-relaxed">
              Lleva el seguimiento en tiempo real de cada alumno: si ya pagaron, mandaron cuadernillos, audio, reconocimiento digital, impresión física y entrega.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/reconocimientos.html"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs active:scale-95"
              title="Abrir formulario público de solicitud de reconocimiento"
            >
              <ExternalLink size={14} />
              <span>Ver Formulario Público</span>
            </a>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-white text-indigo-950 font-black text-xs transition shadow-md hover:bg-indigo-50 flex items-center gap-2 active:scale-95"
            >
              <Plus size={15} />
              <span>Registrar Alumno</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECCIÓN INFORMATIVA: DATOS DE TRANSFERENCIA Y DEPÓSITO SPIN (LAURA CORTAZAR) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-emerald-500/5 border-2 border-amber-400/40 dark:border-amber-500/30 bg-white dark:bg-stone-900 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-amber-200/60 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <CreditCard size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 tracking-tight">
                  Datos de Transferencia y Depósito (SPIN by OXXO)
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  Cobros Oficiales
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                Copia estos datos con un clic para compartirlos con los alumnos o verificar tus depósitos entrantes.
              </p>
            </div>
          </div>

          {/* Botones de acción rápida: WhatsApp para comprobantes y Copiar Mensaje */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://wa.me/19999011852"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-md flex items-center gap-2 active:scale-95 cursor-pointer"
              title="Abrir WhatsApp para recibir o revisar comprobantes de pago"
            >
              <MessageCircle size={16} />
              <span>Enviar Comprobantes por WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleCopyFullPaymentMessage}
              className="px-3.5 py-2.5 rounded-2xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-bold text-xs transition flex items-center gap-2 active:scale-95 cursor-pointer"
              title="Copiar texto completo para enviar a cualquier alumno"
            >
              {copiedBankField === "full_message" ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span className="text-emerald-700 dark:text-emerald-400">¡Texto Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copiar Datos Completos</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Grid de 4 tarjetas de datos: Titular, CLABE SPIN, Tarjeta SPIN, y Código OXXO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Card 1: Titular */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border border-amber-200/80 dark:border-stone-700 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-extrabold text-stone-400 block tracking-wider">
              Beneficiaria / Titular
            </span>
            <div className="text-sm font-black text-stone-900 dark:text-stone-100 truncate">
              LAURA CORTAZAR
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">
              Cuenta Oficial SPIN
            </span>
          </div>

          {/* Card 2: CLABE SPIN */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border border-amber-200/80 dark:border-stone-700 shadow-2xs flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-extrabold text-stone-400 block tracking-wider">
                CLABE SPIN
              </span>
              <div className="font-mono text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 tracking-tight">
                728969000008838228
              </div>
              <span className="text-[10px] text-stone-400 font-medium">18 dígitos STP/SPIN</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopyPaymentField("clabe", "728969000008838228")}
              className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-amber-900 dark:text-amber-200 shrink-0 transition"
              title="Copiar CLABE"
            >
              {copiedBankField === "clabe" ? (
                <Check size={16} className="text-emerald-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>

          {/* Card 3: Tarjeta SPIN */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border border-amber-200/80 dark:border-stone-700 shadow-2xs flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-extrabold text-stone-400 block tracking-wider">
                Tarjeta SPIN
              </span>
              <div className="font-mono text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 tracking-tight">
                4217 4701 0045 4061
              </div>
              <span className="text-[10px] text-stone-400 font-medium">Transferencia directa</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopyPaymentField("tarjeta", "4217470100454061")}
              className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-amber-900 dark:text-amber-200 shrink-0 transition"
              title="Copiar Tarjeta"
            >
              {copiedBankField === "tarjeta" ? (
                <Check size={16} className="text-emerald-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>

          {/* Card 4: Código de Depósito SPIN (OXXO) */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border border-amber-200/80 dark:border-stone-700 shadow-2xs flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-extrabold text-stone-400 block tracking-wider">
                Código Depósito (OXXO)
              </span>
              <div className="font-mono text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 tracking-tight">
                2242-1787-4421-1658
              </div>
              <span className="text-[10px] text-stone-400 font-medium">En caja de OXXO</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopyPaymentField("codigoOxxo", "2242178744211658")}
              className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-amber-900 dark:text-amber-200 shrink-0 transition"
              title="Copiar Código de Depósito OXXO"
            >
              {copiedBankField === "codigoOxxo" ? (
                <Check size={16} className="text-emerald-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>

        </div>

        {/* Sub-bar con costos y enlace directo */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 text-xs text-stone-600 dark:text-stone-400">
          <div className="flex items-center gap-3">
            <span className="font-bold text-stone-700 dark:text-stone-300">Costos Oficiales:</span>
            <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
              Primera Impresión: $100 MXN
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
              Re-impresión: $50 MXN
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-[11px]">
            <span>Enlace para enviar comprobantes:</span>
            <a
              href="https://wa.me/19999011852"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
            >
              <span>https://wa.me/19999011852</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>

      {/* 6 Key Tracking Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* KPI 1: Total Alumnos */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Total Alumnos</span>
            <Users size={14} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 dark:text-stone-100">
            {stats.total}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">Registros en Firestore</span>
        </div>

        {/* KPI 2: Pagados */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Pagados</span>
            <DollarSign size={14} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.pagadosCount} <span className="text-xs text-stone-400 font-bold">/ {stats.total}</span>
          </div>
          <span className="text-[10px] text-stone-400 font-medium">
            ${stats.totalRecaudado} cobrado (${stats.totalPorCobrar} pend.)
          </span>
        </div>

        {/* KPI 3: Cuadernillos */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Cuadernillos</span>
            <BookOpen size={14} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {stats.cuadernillosCount}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">
            {stats.total - stats.cuadernillosCount} pendientes
          </span>
        </div>

        {/* KPI 4: Audios */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Audios</span>
            <Mic size={14} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.audioCount}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">
            {stats.total - stats.audioCount} pendientes
          </span>
        </div>

        {/* KPI 5: Impresos */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Impresos</span>
            <Printer size={14} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {stats.impresoCount}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">
            {stats.total - stats.impresoCount} por imprimir
          </span>
        </div>

        {/* KPI 6: Entregados */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Entregados</span>
            <PackageCheck size={14} className="text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400">
            {stats.entregadoCount}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">
            {stats.total - stats.entregadoCount} en trámite
          </span>
        </div>

      </div>

      {/* SECCIÓN: ESTADÍSTICAS DEL PROCESO (RECHARTS BAR CHART) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-5">
        
        {/* Encabezado de la Sección de Estadísticas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <BarChart3 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 tracking-tight">
                  Estadísticas del Proceso
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                  Recharts Visual
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Gráfico de barras agrupando las solicitudes por sus estados actuales (ej: Pagado, Impreso, Entregado).
              </p>
            </div>
          </div>

          {/* Selector de modo del gráfico: Estados Actuales vs Etapas Operativas */}
          <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl self-start sm:self-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setChartMode("estados")}
              className={`px-3 py-1.5 rounded-xl transition ${
                chartMode === "estados"
                  ? "bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-extrabold"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              Estados Clave (Pagado, Impreso, Entregado)
            </button>
            <button
              type="button"
              onClick={() => setChartMode("operativo")}
              className={`px-3 py-1.5 rounded-xl transition ${
                chartMode === "operativo"
                  ? "bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-extrabold"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              Flujo Operativo
            </button>
          </div>
        </div>

        {/* Contenedor del Gráfico de Barras con Recharts */}
        <div className="w-full h-72 sm:h-80 pt-2">
          {records.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-2">
              <BarChart3 size={32} className="opacity-40" />
              <p className="text-xs font-medium">Aún no hay suficientes solicitudes registradas para generar el gráfico.</p>
            </div>
          ) : chartMode === "estados" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataStages} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="opacity-40 dark:opacity-20" />
                <XAxis
                  dataKey="estado"
                  tick={{ fill: "#6b7280", fontSize: 11, fontWeight: 700 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={renderChartTooltip} />
                <Legend
                  wrapperStyle={{ paddingTop: "12px", fontSize: "11px", fontWeight: "600" }}
                  formatter={(val) => (val === "completadas" ? "Completadas" : "Pendientes")}
                />
                <Bar
                  dataKey="completadas"
                  name="completadas"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={52}
                >
                  {chartDataStages.map((entry, index) => (
                    <Cell key={`bar-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
                <Bar
                  dataKey="pendientes"
                  name="pendientes"
                  fill="#e2e8f0"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={52}
                  className="opacity-70 dark:opacity-25"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataStatus} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="opacity-40 dark:opacity-20" />
                <XAxis
                  dataKey="estado"
                  tick={{ fill: "#6b7280", fontSize: 11, fontWeight: 700 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={renderChartTooltip} />
                <Bar
                  dataKey="cantidad"
                  name="Solicitudes"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={55}
                >
                  {chartDataStatus.map((entry, index) => (
                    <Cell key={`bar-status-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Desglose de Tarjetas de Avance por Estado Actual */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
          {chartDataStages.map((st) => (
            <div
              key={st.estado}
              className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700/60 space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 dark:text-stone-300">
                <span className="truncate">{st.label}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: st.color }}
                />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-base font-black text-stone-900 dark:text-stone-100">
                  {st.completadas}
                  <span className="text-[10px] text-stone-400 font-bold ml-1">/ {records.length}</span>
                </span>
                <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">
                  {st.porcentaje}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${st.porcentaje}%`, backgroundColor: st.color }}
                />
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Control Bar: Search & Filters */}
      <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por alumno, grupo, zona..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            
            {/* Year selector */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl text-xs font-bold">
              <span className="text-stone-400 px-2 text-[10px] uppercase">Gen:</span>
              {["todos", "2022", "2025", "2026"].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setSelectedYear(y)}
                  className={`px-2.5 py-1 rounded-xl transition ${
                    selectedYear === y
                      ? "bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-extrabold"
                      : "text-stone-600 dark:text-stone-300 hover:text-stone-900"
                  }`}
                >
                  {y === "todos" ? "Todas" : y}
                </button>
              ))}
            </div>

            {/* Pago selector */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl text-xs font-bold">
              <span className="text-stone-400 px-2 text-[10px] uppercase">Pago:</span>
              {[
                { key: "todos", label: "Todos" },
                { key: "pagados", label: "Pagados" },
                { key: "pendientes", label: "Pendientes" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setFilterPago(p.key as any)}
                  className={`px-2.5 py-1 rounded-xl transition ${
                    filterPago === p.key
                      ? "bg-white dark:bg-stone-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-extrabold"
                      : "text-stone-600 dark:text-stone-300 hover:text-stone-900"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Special status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-200 focus:outline-hidden"
            >
              <option value="todos">Todos los Estados</option>
              <option value="pend_cuadernillos">Pendiente de Cuadernillos</option>
              <option value="pend_audio">Pendiente de Audio</option>
              <option value="pend_digital">Pendiente de Digital</option>
              <option value="pend_impresion">Pendiente de Impresión</option>
              <option value="listos_entrega">Listos para Entrega</option>
              <option value="entregados">Completados / Entregados</option>
            </select>

            {/* Export CSV button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold transition flex items-center gap-1.5"
              title="Descargar lista de reconocimientos en formato CSV / Excel"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Records Table / Cards */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        
        {isLoading ? (
          <div className="p-16 text-center text-stone-400 space-y-3">
            <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto" />
            <p className="text-sm font-semibold">Cargando lista de reconocimientos en tiempo real...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 mx-auto flex items-center justify-center text-2xl">
              🎓
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
                No hay reconocimientos que coincidan
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {searchQuery || selectedYear !== "todos" || filterPago !== "todos" || filterStatus !== "todos"
                  ? "Intenta cambiar o limpiar los filtros seleccionados."
                  : "Aún no hay alumnos registrados. Puedes registrar uno manualmente o compartir el formulario público."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Registrar Primer Alumno</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 text-stone-400 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-3 px-4">Alumno / Rol</th>
                  <th className="py-3 px-3">Grupo & Zona</th>
                  <th className="py-3 px-3">Año & Tipo</th>
                  <th className="py-3 px-2 text-center" title="¿Ya pagó el alumno?">1. Pagado</th>
                  <th className="py-3 px-2 text-center" title="¿Ya mandó los cuadernillos?">2. Cuadernillos</th>
                  <th className="py-3 px-2 text-center" title="¿Ya mandó el audio?">3. Audio</th>
                  <th className="py-3 px-2 text-center" title="¿Ya se le mandó el reconocimiento digital?">4. Digital</th>
                  <th className="py-3 px-2 text-center" title="¿Ya se imprimió físicamente?">5. Impreso</th>
                  <th className="py-3 px-2 text-center" title="¿Ya se le entregó?">6. Entregado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-medium">
                {filteredRecords.map((r) => {
                  const isComplete = r.pagado && r.cuadernillos && r.audio && r.digital && r.impreso && r.entregado;

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors ${
                        isComplete ? "bg-emerald-50/20 dark:bg-emerald-950/10" : ""
                      }`}
                    >
                      {/* Alumno */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                          {r.nombre}
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold">
                            {r.rol}
                          </span>
                          {r.telefono && (
                            <span className="text-stone-400 font-mono text-[10px]">
                              {r.telefono}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Grupo & Zona */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-stone-800 dark:text-stone-200">
                          {r.grupo}
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-stone-400" />
                          <span>{r.zona}</span>
                        </div>
                      </td>

                      {/* Año & Tipo */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold text-[10px]">
                            Gen. {r.year}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-1 font-semibold flex items-center gap-1">
                          <span>{r.tipoImpresion}</span>
                          <strong className="text-indigo-600 dark:text-indigo-400">(${r.costo})</strong>
                        </div>
                      </td>

                      {/* CHECK 1: PAGADO */}
                      <td className="py-3.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(r, "pagado")}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all shadow-2xs active:scale-90 ${
                            r.pagado
                              ? "bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/20"
                              : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400 hover:border-emerald-400"
                          }`}
                          title={r.pagado ? `Pagado: $${r.costo} (Clic para marcar pendiente)` : `Pendiente de pago ($${r.costo}). Clic para marcar pagado.`}
                        >
                          <DollarSign size={15} />
                        </button>
                      </td>

                      {/* CHECK 2: CUADERNILLOS */}
                      <td className="py-3.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(r, "cuadernillos")}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all shadow-2xs active:scale-90 ${
                            r.cuadernillos
                              ? "bg-blue-600 border-blue-700 text-white shadow-blue-500/20"
                              : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400 hover:border-blue-400"
                          }`}
                          title={r.cuadernillos ? "Cuadernillos entregados (Clic para desmarcar)" : "Cuadernillos pendientes. Clic para marcar recibido."}
                        >
                          <BookOpen size={15} />
                        </button>
                      </td>

                      {/* CHECK 3: AUDIO */}
                      <td className="py-3.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(r, "audio")}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all shadow-2xs active:scale-90 ${
                            r.audio
                              ? "bg-amber-500 border-amber-600 text-stone-950 font-black shadow-amber-500/20"
                              : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400 hover:border-amber-400"
                          }`}
                          title={r.audio ? "Audio recibido (Clic para desmarcar)" : "Audio pendiente. Clic para marcar recibido."}
                        >
                          <Mic size={15} />
                        </button>
                      </td>

                      {/* CHECK 4: DIGITAL */}
                      <td className="py-3.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(r, "digital")}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all shadow-2xs active:scale-90 ${
                            r.digital
                              ? "bg-indigo-600 border-indigo-700 text-white shadow-indigo-500/20"
                              : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400 hover:border-indigo-400"
                          }`}
                          title={r.digital ? "Reconocimiento digital enviado (Clic para desmarcar)" : "Digital pendiente. Clic para marcar enviado."}
                        >
                          <Send size={15} />
                        </button>
                      </td>

                      {/* CHECK 5: IMPRESO */}
                      <td className="py-3.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(r, "impreso")}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all shadow-2xs active:scale-90 ${
                            r.impreso
                              ? "bg-purple-600 border-purple-700 text-white shadow-purple-500/20"
                              : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400 hover:border-purple-400"
                          }`}
                          title={r.impreso ? "Impresión física lista (Clic para desmarcar)" : "Pendiente de imprimir. Clic para marcar impreso."}
                        >
                          <Printer size={15} />
                        </button>
                      </td>

                      {/* CHECK 6: ENTREGADO */}
                      <td className="py-3.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(r, "entregado")}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all shadow-2xs active:scale-90 ${
                            r.entregado
                              ? "bg-teal-600 border-teal-700 text-white shadow-teal-500/20"
                              : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400 hover:border-teal-400"
                          }`}
                          title={r.entregado ? "¡Entregado al alumno! (Clic para desmarcar)" : "Pendiente de entrega. Clic para marcar entregado."}
                        >
                          <PackageCheck size={15} />
                        </button>
                      </td>

                      {/* ACCIONES */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp button */}
                          {r.telefono && (
                            <button
                              type="button"
                              onClick={() => handleSendWhatsAppStatus(r)}
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 transition shadow-2xs"
                              title="Enviar estatus por WhatsApp al alumno"
                            >
                              <MessageCircle size={14} />
                            </button>
                          )}

                          {/* Send to PrintOS button */}
                          {onSendToPrint && (
                            <button
                              type="button"
                              onClick={() =>
                                onSendToPrint(
                                  `Reconocimiento: ${r.nombre} (${r.diplomado})`,
                                  `Impresión de diploma en opalina premium. Rol: ${r.rol}, Grupo: ${r.grupo}, Zona: ${r.zona}, Gen: ${r.year}.`,
                                  r.costo
                                )
                              }
                              className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 hover:bg-indigo-100 transition shadow-2xs"
                              title="Mandar orden a PrintOS"
                            >
                              <Printer size={14} />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(r.id, r.nombre)}
                            className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Eliminar registro"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* MODAL: REGISTRAR ALUMNO MANUAL */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-lg">
                  🎓
                </span>
                <div>
                  <h3 className="font-black text-stone-900 dark:text-stone-100 text-base">
                    Registrar Alumno para Reconocimiento
                  </h3>
                  <p className="text-[11px] text-stone-500">Programa: Liderazgo I</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualRecord} className="space-y-4 text-xs font-medium">
              
              <div>
                <label className="block text-stone-700 dark:text-stone-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. María Elena Sánchez"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 dark:text-stone-300 mb-1">Rol *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Alumno, Instructor"
                    value={newRol}
                    onChange={(e) => setNewRol(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 dark:text-stone-300 mb-1">Grupo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Grupo 1, Matutino"
                    value={newGrupo}
                    onChange={(e) => setNewGrupo(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 dark:text-stone-300 mb-1">Zona / Sede *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Zona Tiburón"
                    value={newZona}
                    onChange={(e) => setNewZona(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 dark:text-stone-300 mb-1">Generación / Año *</label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2022">2022</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 dark:text-stone-300 mb-1">Tipo de Impresión *</label>
                  <select
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Primera Impresión">Primera Impresión ($100)</option>
                    <option value="Re-impresión">Re-impresión ($50)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-700 dark:text-stone-300 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="Ej. 999 123 4567"
                    value={newTelefono}
                    onChange={(e) => setNewTelefono(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md transition disabled:opacity-50"
                >
                  {isSaving ? "Guardando..." : "Guardar en Firestore"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
