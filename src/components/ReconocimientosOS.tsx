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
  History,
  Mail,
  FolderOpen,
  Link2,
  LayoutDashboard,
  Archive,
  CheckCheck,
  Eye,
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
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { playChime } from "../utils/audio";
import { cleanPhoneNumber, buildWhatsAppUrl } from "../utils/whatsapp";

export interface ReconocimientoRecord {
  id: string;
  solicitudId?: string;
  nombre: string;
  rol: string;
  grupo: string;
  zona: string;
  diplomado: string;
  year: string;
  tipoImpresion: string;
  costo: number;
  telefono?: string;
  email?: string;
  driveUrl?: string;
  notas?: string;
  timestamp?: any;
  createdAt?: string;
  updatedAt?: string;
  entregadoAt?: string;

  // The 6 key tracking checkmarks for Laura:
  pagado: boolean;
  cuadernillos: boolean;
  audio: boolean;
  digital: boolean;
  impreso: boolean;
  entregado: boolean;
}

export const ZONAS_LISTA = [
  "Jaguar",
  "Tiburón",
  "Delfín",
  "Colibrí",
  "Águila",
  "Teocalli (centros)",
  "Otro",
];

export const ROLES_LISTA = [
  "Líder",
  "Sublíder",
  "Director centro",
  "OSG",
  "Otro",
];

export const MONTHS_MAP = [
  { key: "todos", label: "Todos los meses" },
  { key: "01", label: "01 - Enero" },
  { key: "02", label: "02 - Febrero" },
  { key: "03", label: "03 - Marzo" },
  { key: "04", label: "04 - Abril" },
  { key: "05", label: "05 - Mayo" },
  { key: "06", label: "06 - Junio" },
  { key: "07", label: "07 - Julio" },
  { key: "08", label: "08 - Agosto" },
  { key: "09", label: "09 - Septiembre" },
  { key: "10", label: "10 - Octubre" },
  { key: "11", label: "11 - Noviembre" },
  { key: "12", label: "12 - Diciembre" },
];

export const SPIN_PAYMENT_INFO = {
  titular: "LAURA CORTAZAR",
  clabe: "728969000008838228",
  tarjeta: "4217 4701 0045 4061",
  codigoOxxo: "2242-1787-4421-1658",
  whatsappUrl: "https://wa.me/19999011852",
};

export const HISTORY_MONTHS = [
  { value: "todos", label: "Todos los meses" },
  { value: "01", label: "01 - Enero" },
  { value: "02", label: "02 - Febrero" },
  { value: "03", label: "03 - Marzo" },
  { value: "04", label: "04 - Abril" },
  { value: "05", label: "05 - Mayo" },
  { value: "06", label: "06 - Junio" },
  { value: "07", label: "07 - Julio" },
  { value: "08", label: "08 - Agosto" },
  { value: "09", label: "09 - Septiembre" },
  { value: "10", label: "10 - Octubre" },
  { value: "11", label: "11 - Noviembre" },
  { value: "12", label: "12 - Diciembre" },
];

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

  // View Mode: Dashboard (Seguimiento Operativo) | Historial (Pagados y Entregados por Mes y Año)
  const [activeView, setActiveView] = useState<"dashboard" | "historial">("dashboard");
  const [chartMode, setChartMode] = useState<"estados" | "operativo">("estados");
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);

  // Filtros específicos para la Vista de Historial (Solo Interno)
  const [historyYear, setHistoryYear] = useState<string>("todos");
  const [historyMonth, setHistoryMonth] = useState<string>("todos");
  const [historySearch, setHistorySearch] = useState<string>("");

  // Modal para ver / editar enlace a Google Drive
  const [driveModalRecord, setDriveModalRecord] = useState<ReconocimientoRecord | null>(null);
  const [editDriveUrl, setEditDriveUrl] = useState("");
  const [isSavingDrive, setIsSavingDrive] = useState(false);

  // Modal for new manual recognition
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newRol, setNewRol] = useState("Líder");
  const [newOtroRol, setNewOtroRol] = useState("");
  const [newGrupo, setNewGrupo] = useState("");
  const [newZona, setNewZona] = useState("Jaguar");
  const [newOtraZona, setNewOtraZona] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDriveUrl, setNewDriveUrl] = useState("");
  const [newYear, setNewYear] = useState("2026");
  const [newTipo, setNewTipo] = useState<"Primera Impresión" | "Re-impresión">("Primera Impresión");
  const [newTelefono, setNewTelefono] = useState("");
  const [newNotas, setNewNotas] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Modal para agregar para la misma persona registrada la impresión de otros reconocimientos de otras generaciones
  const [personForExtra, setPersonForExtra] = useState<ReconocimientoRecord | null>(null);
  const [extraYear, setExtraYear] = useState<string>("2022");
  const [extraTipo, setExtraTipo] = useState<"Primera Impresión" | "Re-impresión">("Re-impresión");
  const [extraDriveUrl, setExtraDriveUrl] = useState("");
  const [extraNotas, setExtraNotas] = useState("");
  const [isSavingExtra, setIsSavingExtra] = useState(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Sincronización en tiempo real con Firestore y deduplicación robusta
  useEffect(() => {
    setIsLoading(true);
    const mapReconocimientos = new Map<string, ReconocimientoRecord>();
    const mapSolicitudes = new Map<string, ReconocimientoRecord>();

    const mergeAndSet = () => {
      const byKey = new Map<string, ReconocimientoRecord>();

      // 1. Base: Solicitudes
      mapSolicitudes.forEach((val, id) => {
        byKey.set(id, val);
      });

      // 2. Fusionar con reconocimientos
      mapReconocimientos.forEach((val, id) => {
        const matchedKey = val.solicitudId && byKey.has(val.solicitudId)
          ? val.solicitudId
          : byKey.has(id)
          ? id
          : null;

        if (matchedKey) {
          const base = byKey.get(matchedKey)!;
          byKey.set(matchedKey, {
            ...base,
            ...val,
            id: matchedKey,
            solicitudId: val.solicitudId || matchedKey,
            pagado: base.pagado || val.pagado,
            cuadernillos: base.cuadernillos || val.cuadernillos,
            audio: base.audio || val.audio,
            digital: base.digital || val.digital,
            impreso: base.impreso || val.impreso,
            entregado: base.entregado || val.entregado,
            email: base.email || val.email,
            driveUrl: base.driveUrl || val.driveUrl,
            entregadoAt: base.entregadoAt || val.entregadoAt,
          });
        } else {
          byKey.set(id, val);
        }
      });

      // 3. Segunda pasada: Deduplicación por firma normalizada para evitar registros dobles
      const uniqueList: ReconocimientoRecord[] = [];
      const allItems = Array.from(byKey.values());
      allItems.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      for (const item of allItems) {
        const normName = (item.nombre || "").trim().toLowerCase();
        const normYear = String(item.year || "").trim();
        const normTipo = String(item.tipoImpresion || "").trim();

        const existingIdx = uniqueList.findIndex((existing) => {
          if (existing.id === item.id) return true;
          if (item.solicitudId && (existing.id === item.solicitudId || existing.solicitudId === item.solicitudId)) return true;
          if (existing.solicitudId && existing.solicitudId === item.id) return true;

          const sameName = (existing.nombre || "").trim().toLowerCase() === normName;
          const sameYear = String(existing.year || "").trim() === normYear;
          const sameTipo = String(existing.tipoImpresion || "").trim() === normTipo;

          if (sameName && sameYear && sameTipo) {
            return true;
          }
          return false;
        });

        if (existingIdx === -1) {
          uniqueList.push({ ...item });
        } else {
          const existing = uniqueList[existingIdx];
          existing.pagado = existing.pagado || item.pagado;
          existing.cuadernillos = existing.cuadernillos || item.cuadernillos;
          existing.audio = existing.audio || item.audio;
          existing.digital = existing.digital || item.digital;
          existing.impreso = existing.impreso || item.impreso;
          existing.entregado = existing.entregado || item.entregado;
          if (!existing.telefono && item.telefono) existing.telefono = item.telefono;
          if (!existing.email && item.email) existing.email = item.email;
          if (!existing.driveUrl && item.driveUrl) existing.driveUrl = item.driveUrl;
          if (!existing.notas && item.notas) existing.notas = item.notas;
          if (!existing.entregadoAt && item.entregadoAt) existing.entregadoAt = item.entregadoAt;
        }
      }

      setRecords(uniqueList);
      setIsLoading(false);
    };

    const unsubReconocimientos = onSnapshot(
      collection(db, "reconocimientos"),
      (snapshot) => {
        snapshot.forEach((snap) => {
          const d = snap.data();
          mapReconocimientos.set(snap.id, {
            id: snap.id,
            solicitudId: d.solicitudId || undefined,
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
            driveUrl: d.driveUrl || undefined,
            notas: d.notas || undefined,
            timestamp: d.timestamp,
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || undefined,
            entregadoAt: d.entregadoAt || undefined,
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
              solicitudId: snap.id,
              nombre: d.nombre,
              rol: d.rol || "Líder",
              grupo: d.grupo || "G-1",
              zona: d.zona || "General",
              diplomado: d.diplomado || "Liderazgo I",
              year: String(d.year || "2026"),
              tipoImpresion: d.tipoImpresion || "Primera Impresión",
              costo: Number(d.costo || (d.tipoImpresion === "Primera Impresión" ? 100 : 50)),
              telefono: d.telefono || undefined,
              email: d.email || undefined,
              driveUrl: d.driveUrl || undefined,
              notas: d.notas || undefined,
              timestamp: d.timestamp,
              createdAt: d.createdAt || new Date().toISOString(),
              updatedAt: d.updatedAt || undefined,
              entregadoAt: d.entregadoAt || undefined,
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

  // 2. Toggle one of the 6 tracking fields with instant Firestore sync in both collections
  const handleToggleStatus = async (
    record: ReconocimientoRecord,
    field: "pagado" | "cuadernillos" | "audio" | "digital" | "impreso" | "entregado"
  ) => {
    const nextVal = !record[field];
    playChime("tick");

    // Optimistic UI update
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id === record.id) {
          const updated = { ...r, [field]: nextVal };
          if (field === "entregado") {
            updated.entregadoAt = nextVal ? new Date().toISOString() : undefined;
          }
          return updated;
        }
        return r;
      })
    );

    try {
      const updates: any = {
        [field]: nextVal,
        updatedAt: new Date().toISOString(),
      };
      if (field === "entregado") {
        updates.entregadoAt = nextVal ? new Date().toISOString() : null;
      }

      await Promise.allSettled([
        updateDoc(doc(db, "reconocimientos", record.id), updates),
        updateDoc(doc(db, "solicitudes", record.id), updates),
        record.solicitudId ? updateDoc(doc(db, "solicitudes", record.solicitudId), updates) : Promise.resolve(),
        record.solicitudId ? updateDoc(doc(db, "reconocimientos", record.solicitudId), updates) : Promise.resolve(),
      ]);

      playChime("success");
    } catch (err) {
      console.warn("Could not update field in Firestore:", err);
    }
  };

  // 3. Delete record completely from both collections to prevent ghost duplicate reappearances
  const handleDeleteRecord = async (record: ReconocimientoRecord) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el registro de ${record.nombre} (Gen. ${record.year} - ${record.tipoImpresion})?`)) return;
    try {
      setRecords((prev) => prev.filter((r) => r.id !== record.id && r.id !== record.solicitudId));
      await Promise.allSettled([
        deleteDoc(doc(db, "reconocimientos", record.id)),
        deleteDoc(doc(db, "solicitudes", record.id)),
        record.solicitudId ? deleteDoc(doc(db, "solicitudes", record.solicitudId)) : Promise.resolve(),
        record.solicitudId ? deleteDoc(doc(db, "reconocimientos", record.solicitudId)) : Promise.resolve(),
      ]);
      playChime("tick");
    } catch (err) {
      console.warn("Error deleting record:", err);
    }
  };

  // Guardar / Actualizar enlace de Google Drive
  const handleSaveDriveUrl = async () => {
    if (!driveModalRecord) return;
    setIsSavingDrive(true);
    try {
      const url = editDriveUrl.trim();
      setRecords((prev) =>
        prev.map((r) => (r.id === driveModalRecord.id ? { ...r, driveUrl: url || undefined } : r))
      );
      await Promise.allSettled([
        updateDoc(doc(db, "reconocimientos", driveModalRecord.id), { driveUrl: url || null }),
        updateDoc(doc(db, "solicitudes", driveModalRecord.id), { driveUrl: url || null }),
        driveModalRecord.solicitudId ? updateDoc(doc(db, "solicitudes", driveModalRecord.solicitudId), { driveUrl: url || null }) : Promise.resolve(),
        driveModalRecord.solicitudId ? updateDoc(doc(db, "reconocimientos", driveModalRecord.solicitudId), { driveUrl: url || null }) : Promise.resolve(),
      ]);
      playChime("success");
      setDriveModalRecord(null);
    } catch (err) {
      console.error("Error saving drive URL:", err);
    } finally {
      setIsSavingDrive(false);
    }
  };

  // 4. Create new manual record with single primary key across collections
  const handleCreateManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim()) return;

    setIsSaving(true);
    const costo = newTipo === "Primera Impresión" ? 100 : 50;
    const finalRol = newRol === "Otro" ? (newOtroRol.trim() || "Otro") : newRol;
    const finalZona = newZona === "Otro" ? (newOtraZona.trim() || "Otro") : newZona;

    try {
      const payload = {
        nombre: newNombre.trim(),
        rol: finalRol.trim() || "Líder",
        grupo: newGrupo.trim() || "G-1",
        zona: finalZona.trim() || "Jaguar",
        email: newEmail.trim() || undefined,
        diplomado: "Liderazgo I",
        year: newYear,
        tipoImpresion: newTipo,
        costo,
        driveUrl: newDriveUrl.trim() || undefined,
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

      // Guardar en solicitudes y sincronizar con mismo ID en reconocimientos
      const docRef = await addDoc(collection(db, "solicitudes"), payload);
      await setDoc(doc(db, "reconocimientos", docRef.id), {
        ...payload,
        solicitudId: docRef.id,
      }).catch(() => null);

      playChime("work_done");
      setShowAddModal(false);
      setNewNombre("");
      setNewRol("Líder");
      setNewOtroRol("");
      setNewGrupo("");
      setNewZona("Jaguar");
      setNewOtraZona("");
      setNewEmail("");
      setNewDriveUrl("");
      setNewTelefono("");
      setNewNotas("");
    } catch (err) {
      console.error("Error creating record:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // 4b. Agregar para la misma persona registrada la impresión de otros reconocimientos de otras generaciones ($100 primera / $50 re-impresión)
  const handleCreateExtraForPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personForExtra) return;

    setIsSavingExtra(true);
    const costo = extraTipo === "Primera Impresión" ? 100 : 50;
    try {
      const payload = {
        nombre: personForExtra.nombre,
        rol: personForExtra.rol,
        grupo: personForExtra.grupo,
        zona: personForExtra.zona,
        email: personForExtra.email || undefined,
        diplomado: "Liderazgo I",
        year: extraYear,
        tipoImpresion: extraTipo,
        costo,
        driveUrl: extraDriveUrl.trim() || undefined,
        telefono: personForExtra.telefono || undefined,
        notas: extraNotas.trim() || undefined,
        pagado: false,
        cuadernillos: false,
        audio: false,
        digital: false,
        impreso: false,
        entregado: false,
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "solicitudes"), payload);
      await setDoc(doc(db, "reconocimientos", docRef.id), {
        ...payload,
        solicitudId: docRef.id,
      }).catch(() => null);

      playChime("work_done");
      setPersonForExtra(null);
      setExtraNotas("");
      setExtraDriveUrl("");
    } catch (err) {
      console.error("Error creating extra recognition:", err);
    } finally {
      setIsSavingExtra(false);
    }
  };

  // 5. Send status message to student via WhatsApp
  const handleSendWhatsAppStatus = (rec: ReconocimientoRecord) => {
    if (!rec.telefono) {
      const phoneInput = prompt(`Ingresa el número de WhatsApp para ${rec.nombre} (ej. 9999011852):`);
      if (phoneInput && phoneInput.trim()) {
        rec.telefono = phoneInput.trim();
        updateDoc(doc(db, "reconocimientos", rec.id), { telefono: phoneInput.trim() }).catch(() => null);
        updateDoc(doc(db, "solicitudes", rec.id), { telefono: phoneInput.trim() }).catch(() => null);
      } else {
        return;
      }
    }

    const clean = cleanPhoneNumber(rec.telefono);
    const text =
      `Hola ${rec.nombre}, te saluda tu madrina Laura (Universidad FGDLL).\n\n` +
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
      `Hola ${rec.nombre}, te saluda tu madrina Laura (Universidad FGDLL).\n\n` +
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

  // Historial de solicitudes Pagadas y Entregadas (Solo Interno)
  const historyAvailableYears = useMemo(() => {
    const setY = new Set<string>(["2026", "2025", "2024", "2023", "2022"]);
    records.forEach((r) => {
      if (r.year) setY.add(String(r.year));
      if (r.createdAt) {
        try {
          const y = new Date(r.createdAt).getFullYear();
          if (!isNaN(y)) setY.add(String(y));
        } catch (_) {}
      }
      if (r.entregadoAt) {
        try {
          const y = new Date(r.entregadoAt).getFullYear();
          if (!isNaN(y)) setY.add(String(y));
        } catch (_) {}
      }
    });
    return Array.from(setY).sort((a, b) => b.localeCompare(a));
  }, [records]);

  const historyRecords = useMemo(() => {
    return records.filter((r) => {
      // Requisito estricto: Solicitudes pagadas Y entregadas
      if (!r.pagado || !r.entregado) return false;

      // Obtener fecha representativa (entrega o registro)
      let itemDate: Date | null = null;
      if (r.entregadoAt) {
        try {
          const d = new Date(r.entregadoAt);
          if (!isNaN(d.getTime())) itemDate = d;
        } catch (_) {}
      }
      if (!itemDate && r.timestamp?.toDate) {
        try {
          itemDate = r.timestamp.toDate();
        } catch (_) {}
      }
      if (!itemDate && r.createdAt) {
        try {
          const d = new Date(r.createdAt);
          if (!isNaN(d.getTime())) itemDate = d;
        } catch (_) {}
      }

      // Filtrado por Año
      if (historyYear !== "todos") {
        const yearFromDate = itemDate ? String(itemDate.getFullYear()) : null;
        const yearFromProp = String(r.year || "").trim();
        if (yearFromDate !== historyYear && yearFromProp !== historyYear) {
          return false;
        }
      }

      // Filtrado por Mes
      if (historyMonth !== "todos") {
        if (!itemDate) return false;
        const monthNum = String(itemDate.getMonth() + 1).padStart(2, "0");
        if (monthNum !== historyMonth) return false;
      }

      // Filtro de texto
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const matches =
          r.nombre.toLowerCase().includes(q) ||
          r.rol.toLowerCase().includes(q) ||
          r.grupo.toLowerCase().includes(q) ||
          r.zona.toLowerCase().includes(q) ||
          r.diplomado.toLowerCase().includes(q) ||
          String(r.year).includes(q) ||
          (r.telefono && r.telefono.includes(q)) ||
          (r.email && r.email.toLowerCase().includes(q)) ||
          (r.notas && r.notas.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [records, historyYear, historyMonth, historySearch]);

  const historyStats = useMemo(() => {
    const totalEntregados = historyRecords.length;
    const totalMontoRecaudado = historyRecords.reduce((sum, r) => sum + (r.costo || 0), 0);
    const primeraImpresionCount = historyRecords.filter((r) => r.tipoImpresion === "Primera Impresión").length;
    const reimpresionCount = historyRecords.filter((r) => r.tipoImpresion === "Re-impresión").length;
    return {
      totalEntregados,
      totalMontoRecaudado,
      primeraImpresionCount,
      reimpresionCount,
    };
  }, [historyRecords]);

  // Export CSV del listado operativo general
  const handleExportCSV = () => {
    const dataToExport = filteredRecords.length > 0 ? filteredRecords : records;
    if (dataToExport.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }

    const headers = [
      "Nombre",
      "Tipo de Impresion",
      "Diplomado",
      "Costo Total",
      "Generacion",
      "Rol",
      "Grupo",
      "Zona",
      "Estado Pago",
      "Pagado",
      "Cuadernillos",
      "Audio",
      "DigitalEnviado",
      "Impreso",
      "Entregado",
      "Telefono",
      "Email",
      "Link Google Drive",
      "Notas",
      "FechaRegistro",
      "ID",
    ];

    const escapeCSV = (val: any) => {
      if (val === undefined || val === null) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    const rows = dataToExport.map((r) => [
      escapeCSV(r.nombre),
      escapeCSV(r.tipoImpresion),
      escapeCSV(r.diplomado),
      escapeCSV(r.costo),
      escapeCSV(r.year),
      escapeCSV(r.rol),
      escapeCSV(r.grupo),
      escapeCSV(r.zona),
      escapeCSV(r.pagado ? "PAGADO" : "PENDIENTE"),
      escapeCSV(r.pagado ? "SI" : "NO"),
      escapeCSV(r.cuadernillos ? "SI" : "NO"),
      escapeCSV(r.audio ? "SI" : "NO"),
      escapeCSV(r.digital ? "SI" : "NO"),
      escapeCSV(r.impreso ? "SI" : "NO"),
      escapeCSV(r.entregado ? "SI" : "NO"),
      escapeCSV(r.telefono || ""),
      escapeCSV(r.email || ""),
      escapeCSV(r.driveUrl || ""),
      escapeCSV(r.notas || ""),
      escapeCSV(r.createdAt || ""),
      escapeCSV(r.id),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reconocimientos_solicitudes_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    playChime("success");
  };

  // Export CSV específico para la vista de Historial (Pagados y Entregados por Mes y Año)
  const handleExportHistoryCSV = () => {
    if (historyRecords.length === 0) {
      alert("No hay registros en el historial para exportar con los filtros seleccionados.");
      return;
    }

    const headers = [
      "Nombre",
      "Tipo de Impresion",
      "Diplomado",
      "Costo Total",
      "Generacion",
      "Rol",
      "Grupo",
      "Zona",
      "Estado Pago",
      "Estado Entrega",
      "Telefono",
      "Email",
      "Link Google Drive",
      "Fecha Registro",
      "Fecha Entrega",
      "Notas",
      "ID",
    ];

    const escapeCSV = (val: any) => {
      if (val === undefined || val === null) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    const rows = historyRecords.map((r) => [
      escapeCSV(r.nombre),
      escapeCSV(r.tipoImpresion),
      escapeCSV(r.diplomado),
      escapeCSV(r.costo),
      escapeCSV(r.year),
      escapeCSV(r.rol),
      escapeCSV(r.grupo),
      escapeCSV(r.zona),
      escapeCSV("PAGADO"),
      escapeCSV("ENTREGADO"),
      escapeCSV(r.telefono || ""),
      escapeCSV(r.email || ""),
      escapeCSV(r.driveUrl || ""),
      escapeCSV(r.createdAt ? new Date(r.createdAt).toLocaleDateString("es-MX") : ""),
      escapeCSV(r.entregadoAt ? new Date(r.entregadoAt).toLocaleDateString("es-MX") : (r.createdAt ? new Date(r.createdAt).toLocaleDateString("es-MX") : "")),
      escapeCSV(r.notas || ""),
      escapeCSV(r.id),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historial_entregados_${historyYear}_mes_${historyMonth}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    playChime("success");
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

      {/* SELECTOR DE VISTAS: SEGUIMIENTO OPERATIVO VS HISTORIAL DE ENTREGADOS (SOLO INTERNO) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-stone-100 dark:bg-stone-800/90 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-white/70 dark:bg-stone-900/70 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveView("dashboard");
              playChime("tick");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeView === "dashboard"
                ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            }`}
          >
            <LayoutDashboard size={15} />
            <span>Seguimiento Operativo</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeView === "dashboard"
                ? "bg-white/20 text-white"
                : "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
            }`}>
              {records.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView("historial");
              playChime("tick");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeView === "historial"
                ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            }`}
          >
            <Archive size={15} />
            <span>Vista de Historial (Solo Interno)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeView === "historial"
                ? "bg-white/20 text-white"
                : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
            }`}>
              {historyRecords.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 text-xs text-stone-500 dark:text-stone-400 font-medium">
          {activeView === "dashboard" ? (
            <span>Modo operativo con control de pagos, audios, cuadernillos y entrega en vivo.</span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
              <CheckCheck size={14} />
              <span>Archivo de solicitudes pagadas y entregadas por mes y año</span>
            </span>
          )}
        </div>
      </div>

      {activeView === "dashboard" && (
        <>
      {/* SECCIÓN INFORMATIVA: DATOS DE TRANSFERENCIA BANCARIA (LAURA CORTAZAR) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-emerald-500/5 border-2 border-amber-400/40 dark:border-amber-500/30 bg-white dark:bg-stone-900 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-amber-200/60 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <CreditCard size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 tracking-tight">
                  Datos de Transferencia Bancaria
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  SPIN by OXXO
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  A nombre de: LAURA CORTAZAR
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                Datos oficiales para cobro y recepción de comprobantes de pago de reconocimientos y diplomas.
              </p>
            </div>
          </div>

          {/* Botón de acción rápida: WhatsApp para enviar comprobantes */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://wa.me/19999011852"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-md hover:shadow-emerald-600/20 flex items-center gap-2 active:scale-95 cursor-pointer"
              title="Abrir WhatsApp para enviar o recibir comprobantes de pago"
            >
              <MessageCircle size={17} />
              <span>Enviar Comprobantes por WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleCopyFullPaymentMessage}
              className="px-3.5 py-2.5 rounded-2xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-bold text-xs transition flex items-center gap-2 active:scale-95 cursor-pointer"
              title="Copiar texto formateado completo para enviar por WhatsApp o SMS"
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

        {/* Grid de 4 tarjetas de datos bancarios: Titular, CLABE SPIN, Tarjeta SPIN, y Código OXXO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Card 1: Titular / Beneficiaria */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border border-amber-200/80 dark:border-stone-700 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-extrabold text-stone-400 block tracking-wider">
              A Nombre de (Beneficiaria)
            </span>
            <div className="text-sm font-black text-stone-900 dark:text-stone-100 truncate">
              LAURA CORTAZAR
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">
              Titular Oficial de la Cuenta
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
              title="Copiar CLABE SPIN"
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
              title="Copiar Tarjeta SPIN"
            >
              {copiedBankField === "tarjeta" ? (
                <Check size={16} className="text-emerald-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>

          {/* Card 4: Código OXXO */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border border-amber-200/80 dark:border-stone-700 shadow-2xs flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-extrabold text-stone-400 block tracking-wider">
                Código OXXO (Depósito SPIN)
              </span>
              <div className="font-mono text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 tracking-tight">
                2242-1787-4421-1658
              </div>
              <span className="text-[10px] text-stone-400 font-medium">Presentar en caja de OXXO</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopyPaymentField("codigoOxxo", "2242178744211658")}
              className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-amber-900 dark:text-amber-200 shrink-0 transition"
              title="Copiar Código OXXO"
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
                          {/* Botón para agregar otra generación para la misma persona */}
                          <button
                            type="button"
                            onClick={() => {
                              setPersonForExtra(r);
                              setExtraYear(r.year === "2026" ? "2025" : "2026");
                              setExtraTipo("Re-impresión");
                              setExtraNotas("");
                            }}
                            className="px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition shadow-2xs flex items-center gap-1 font-bold text-[11px]"
                            title={`Agregar otro reconocimiento de otra generación para ${r.nombre}`}
                          >
                            <Plus size={13} className="text-amber-600" />
                            <span className="hidden sm:inline">Otra Gen</span>
                          </button>

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
                            onClick={() => handleDeleteRecord(r)}
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
      </>
      )}

      {/* VISTA 2: HISTORIAL DE PAGADOS Y ENTREGADOS (SOLO INTERNO) */}
      {activeView === "historial" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Header Banner del Historial Interno */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-stone-900 text-white shadow-lg relative overflow-hidden border border-emerald-500/30">
            <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-white/20 backdrop-blur-md text-white text-base">
                    🏛️
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                    Solo Interno • Archivo Histórico
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  Historial de Reconocimientos Pagados y Entregados
                </h3>
                <p className="text-xs text-emerald-100/90 max-w-2xl leading-relaxed">
                  Registro exclusivo para administración interna: Solicitudes pagadas y entregadas, archivadas por mes y año con comprobantes, enlaces a Google Drive y exportación CSV.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={handleExportHistoryCSV}
                  className="px-4 py-2.5 rounded-2xl bg-white text-emerald-950 hover:bg-emerald-50 font-black text-xs transition shadow-md flex items-center gap-2 active:scale-95 cursor-pointer"
                  title="Exportar archivo CSV con las solicitudes filtradas del historial"
                >
                  <Download size={14} />
                  <span>Exportar Historial CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* KPI Cards del Historial */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
              <span className="text-xs text-stone-500 font-semibold flex items-center justify-between">
                <span>Total Entregados</span>
                <PackageCheck size={14} className="text-emerald-600" />
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {historyStats.totalEntregados}
              </div>
              <span className="text-[10px] text-stone-400 font-medium">100% Pagados y Entregados</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
              <span className="text-xs text-stone-500 font-semibold flex items-center justify-between">
                <span>Monto Recaudado</span>
                <DollarSign size={14} className="text-indigo-600" />
              </span>
              <div className="text-2xl font-black text-stone-900 dark:text-stone-100">
                ${historyStats.totalMontoRecaudado} <span className="text-xs text-stone-400 font-normal">MXN</span>
              </div>
              <span className="text-[10px] text-stone-400 font-medium">Ingresos totales cobrados</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
              <span className="text-xs text-stone-500 font-semibold flex items-center justify-between">
                <span>Primeras Impresiones</span>
                <Printer size={14} className="text-blue-600" />
              </span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {historyStats.primeraImpresionCount}
              </div>
              <span className="text-[10px] text-stone-400 font-medium">$100 MXN c/u (${historyStats.primeraImpresionCount * 100})</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
              <span className="text-xs text-stone-500 font-semibold flex items-center justify-between">
                <span>Re-impresiones</span>
                <Layers size={14} className="text-purple-600" />
              </span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {historyStats.reimpresionCount}
              </div>
              <span className="text-[10px] text-stone-400 font-medium">$50 MXN c/u (${historyStats.reimpresionCount * 50})</span>
            </div>
          </div>

          {/* Barra de Filtros del Historial: Año, Mes, Búsqueda y Botón CSV */}
          <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              {/* Buscador */}
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar en historial por alumno, grupo, zona, notas..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 placeholder:font-normal focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Filtros de Mes y Año */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Selector de Año */}
                <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-2xl border border-stone-200 dark:border-stone-700 text-xs font-bold">
                  <Calendar size={13} className="text-stone-400" />
                  <span className="text-stone-500 text-[11px]">Año:</span>
                  <select
                    value={historyYear}
                    onChange={(e) => setHistoryYear(e.target.value)}
                    className="bg-transparent font-black text-stone-900 dark:text-stone-100 focus:outline-hidden cursor-pointer"
                  >
                    <option value="todos">Todos los Años</option>
                    {historyAvailableYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Selector de Mes */}
                <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-2xl border border-stone-200 dark:border-stone-700 text-xs font-bold">
                  <Clock size={13} className="text-stone-400" />
                  <span className="text-stone-500 text-[11px]">Mes:</span>
                  <select
                    value={historyMonth}
                    onChange={(e) => setHistoryMonth(e.target.value)}
                    className="bg-transparent font-black text-stone-900 dark:text-stone-100 focus:outline-hidden cursor-pointer"
                  >
                    {HISTORY_MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Botón Exportar CSV */}
                <button
                  type="button"
                  onClick={handleExportHistoryCSV}
                  className="px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Descargar reporte del historial filtrado en formato CSV"
                >
                  <Download size={13} />
                  <span>Descargar CSV</span>
                </button>

              </div>
            </div>
          </div>

          {/* Tabla Detallada del Historial */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-16 text-center text-stone-400 space-y-3">
                <RefreshCw size={28} className="animate-spin text-emerald-600 mx-auto" />
                <p className="text-sm font-semibold">Cargando archivo histórico...</p>
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-2xl">
                  🏛️
                </div>
                <h4 className="text-base font-bold text-stone-800 dark:text-stone-200">
                  No hay solicitudes entregadas y pagadas con estos filtros
                </h4>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Asegúrate de haber marcado como Pagado y Entregado a los alumnos en el Seguimiento Operativo, o ajusta los filtros de año ({historyYear === "todos" ? "Todos" : historyYear}) y mes ({historyMonth === "todos" ? "Todos" : historyMonth}).
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-800/50 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Alumno / Datos</th>
                      <th className="py-3 px-3">Diplomado & Gen.</th>
                      <th className="py-3 px-3">Impresión & Costo</th>
                      <th className="py-3 px-3">Fecha Entrega</th>
                      <th className="py-3 px-3">Reconocimiento Drive</th>
                      <th className="py-3 px-3">Notas</th>
                      <th className="py-3 px-3 text-center">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
                    {historyRecords.map((r) => {
                      const fechaEntrega = r.entregadoAt
                        ? new Date(r.entregadoAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                        : r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                        : "Completado";

                      return (
                        <tr key={r.id} className="hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition">
                          {/* Alumno */}
                          <td className="py-3.5 px-4 min-w-[200px]">
                            <div className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                              {r.nombre}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                              <span className="px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 font-semibold text-stone-600 dark:text-stone-400">
                                {r.rol}
                              </span>
                              <span className="text-stone-400">•</span>
                              <span className="text-stone-600 dark:text-stone-300 font-medium">
                                {r.grupo}
                              </span>
                              <span className="text-stone-400">•</span>
                              <span className="text-stone-600 dark:text-stone-300 font-medium">
                                {r.zona}
                              </span>
                            </div>
                            {r.email && (
                              <div className="flex items-center gap-1 text-[10px] text-stone-500 mt-0.5">
                                <Mail size={10} />
                                <span className="truncate">{r.email}</span>
                              </div>
                            )}
                            {r.telefono && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono mt-0.5">
                                <span>WA: {r.telefono}</span>
                              </div>
                            )}
                          </td>

                          {/* Diplomado */}
                          <td className="py-3.5 px-3 min-w-[130px]">
                            <div className="font-bold text-stone-800 dark:text-stone-200">
                              {r.diplomado}
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 mt-1 inline-block">
                              Gen. {r.year}
                            </span>
                          </td>

                          {/* Tipo & Costo */}
                          <td className="py-3.5 px-3 min-w-[130px]">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block ${
                              r.tipoImpresion === "Primera Impresión"
                                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200"
                                : "bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200"
                            }`}>
                              {r.tipoImpresion}
                            </span>
                            <div className="font-black text-stone-900 dark:text-stone-100 mt-1 text-sm font-mono">
                              ${r.costo} MXN
                            </div>
                          </td>

                          {/* Fecha */}
                          <td className="py-3.5 px-3 min-w-[110px] text-stone-600 dark:text-stone-400 font-medium">
                            <div className="flex items-center gap-1">
                              <Calendar size={12} className="text-stone-400" />
                              <span>{fechaEntrega}</span>
                            </div>
                          </td>

                          {/* Google Drive Link */}
                          <td className="py-3.5 px-3 min-w-[140px]">
                            {r.driveUrl ? (
                              <a
                                href={r.driveUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition"
                                title="Abrir reconocimiento en Google Drive"
                              >
                                <FolderOpen size={13} />
                                <span>Ver en Drive</span>
                                <ExternalLink size={11} />
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setDriveModalRecord(r);
                                  setEditDriveUrl("");
                                }}
                                className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-600 underline font-medium"
                              >
                                <Link2 size={11} />
                                <span>Asignar link</span>
                              </button>
                            )}
                          </td>

                          {/* Notas */}
                          <td className="py-3.5 px-3 max-w-[160px] text-stone-500 text-[11px] truncate" title={r.notas || ""}>
                            {r.notas || <span className="text-stone-300 dark:text-stone-700">—</span>}
                          </td>

                          {/* Estado */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="inline-flex flex-col gap-1">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-[10px] font-black tracking-wide inline-flex items-center gap-1">
                                <Check size={10} /> Pagado
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 text-[10px] font-black tracking-wide inline-flex items-center gap-1">
                                <PackageCheck size={10} /> Entregado
                              </span>
                            </div>
                          </td>

                          {/* Acciones */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {r.telefono && (
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsAppStatus(r)}
                                  className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 transition"
                                  title="Enviar mensaje de felicitación por WhatsApp"
                                >
                                  <MessageCircle size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setDriveModalRecord(r);
                                  setEditDriveUrl(r.driveUrl || "");
                                }}
                                className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition"
                                title="Editar enlace de Google Drive"
                              >
                                <Link2 size={14} />
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
        </div>
      )}
      {personForExtra && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPersonForExtra(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-lg">
                  🎓
                </span>
                <div>
                  <h3 className="font-black text-stone-900 dark:text-stone-100 text-base">
                    Agregar Otra Generación para {personForExtra.nombre}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Misma persona registrada • Elige la generación y el formato ($100 primera vez / $50 re-impresión)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPersonForExtra(null)}
                className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            {/* Ficha resumen del alumno registrado */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Alumno Registrado:</span>
                <strong className="text-stone-900 dark:text-stone-100 font-extrabold text-sm">{personForExtra.nombre}</strong>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-stone-600 dark:text-stone-300 pt-1 border-t border-stone-200/60 dark:border-stone-700/40">
                <span><strong>Rol:</strong> {personForExtra.rol}</span>
                <span>•</span>
                <span><strong>Grupo:</strong> {personForExtra.grupo}</span>
                <span>•</span>
                <span><strong>Zona:</strong> {personForExtra.zona}</span>
              </div>
            </div>

            <form onSubmit={handleCreateExtraForPerson} className="space-y-4 text-xs font-medium">
              
              {/* Selector de Generación / Año */}
              <div>
                <label className="block text-stone-700 dark:text-stone-300 mb-1.5 font-bold">
                  Selecciona la Generación para este Nuevo Reconocimiento *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["2022", "2025", "2026"] as const).map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setExtraYear(y)}
                      className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition cursor-pointer shadow-2xs ${
                        extraYear === y
                          ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                          : "bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      Gen. {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formato a elegir: Primera Impresión ($100) vs Re-impresión ($50) */}
              <div>
                <label className="block text-stone-700 dark:text-stone-300 mb-1.5 font-bold">
                  Formato de Impresión a Elegir *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Opción 1: Primera Impresión ($100) */}
                  <div
                    onClick={() => setExtraTipo("Primera Impresión")}
                    className={`cursor-pointer p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                      extraTipo === "Primera Impresión"
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20"
                        : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-stone-900 dark:text-stone-100 text-xs">Primera Impresión</strong>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-black text-xs">$100</span>
                    </div>
                    <span className="text-[10px] text-stone-500">Diploma inicial para esta generación</span>
                  </div>

                  {/* Opción 2: Re-impresión ($50) */}
                  <div
                    onClick={() => setExtraTipo("Re-impresión")}
                    className={`cursor-pointer p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                      extraTipo === "Re-impresión"
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20"
                        : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-stone-900 dark:text-stone-100 text-xs">Re-impresión</strong>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black text-xs">$50</span>
                    </div>
                    <span className="text-[10px] text-stone-500">Reposición o copia extra</span>
                  </div>

                </div>
              </div>

              {/* Notas opcionales */}
              <div>
                <label className="block text-stone-700 dark:text-stone-300 mb-1 font-semibold">
                  Notas u Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Reconocimiento de generación anterior para entrega en el mismo paquete..."
                  value={extraNotas}
                  onChange={(e) => setExtraNotas(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setPersonForExtra(null)}
                  className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingExtra}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white font-extrabold shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>{isSavingExtra ? "Guardando..." : `Agregar a la Lista ($${extraTipo === "Primera Impresión" ? 100 : 50})`}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
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
              
              {/* Nombre Completo */}
              <div>
                <label className="block text-stone-800 dark:text-stone-200 font-bold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. María Elena Sánchez"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-bold placeholder:font-normal focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Rol (opción múltiple: Líder, Sublíder, Director centro, OSG, Otro) */}
              <div>
                <label className="block text-stone-800 dark:text-stone-200 font-bold mb-1.5">Rol / Función *</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {[
                    { label: "Líder", value: "Líder" },
                    { label: "Sublíder", value: "Sublíder" },
                    { label: "Director centro", value: "Director centro" },
                    { label: "OSG", value: "OSG" },
                    { label: "Otro", value: "Otro" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setNewRol(item.value)}
                      className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                        newRol === item.value
                          ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/30"
                          : "bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {newRol === "Otro" && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Especificar otro rol (opcional)"
                      value={newOtroRol}
                      onChange={(e) => setNewOtroRol(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-indigo-300 dark:border-indigo-600 text-stone-900 dark:text-stone-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Grupo */}
              <div>
                <label className="block text-stone-800 dark:text-stone-200 font-bold mb-1">Grupo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Grupo 1, Matutino, G-2"
                  value={newGrupo}
                  onChange={(e) => setNewGrupo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-bold placeholder:font-normal focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Zona (Jaguar, Tiburón, Delfín, Colibrí, Águila, Teocalli (centros), Otro) */}
              <div>
                <label className="block text-stone-800 dark:text-stone-200 font-bold mb-1.5">Zona / Centro *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                  {[
                    { label: "Jaguar", value: "Jaguar" },
                    { label: "Tiburón", value: "Tiburón" },
                    { label: "Delfín", value: "Delfín" },
                    { label: "Colibrí", value: "Colibrí" },
                    { label: "Águila", value: "Águila" },
                    { label: "Teocalli (centros)", value: "Teocalli (centros)" },
                    { label: "Otro", value: "Otro" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setNewZona(item.value)}
                      className={`py-2 px-1.5 rounded-xl border text-center font-bold text-[11px] transition cursor-pointer truncate ${
                        newZona === item.value
                          ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/30"
                          : "bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {newZona === "Otro" && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Especificar otra zona o centro (opcional)"
                      value={newOtraZona}
                      onChange={(e) => setNewOtraZona(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-indigo-300 dark:border-indigo-600 text-stone-900 dark:text-stone-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Generación y Tipo de Impresión */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-800 dark:text-stone-200 font-bold mb-1">Generación / Año *</label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2022">2022</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-800 dark:text-stone-200 font-bold mb-1">Tipo de Impresión *</label>
                  <select
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Primera Impresión">Primera Impresión ($100 MXN)</option>
                    <option value="Re-impresión">Re-impresión ($50 MXN)</option>
                  </select>
                </div>
              </div>

              {/* Correo Electrónico y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-800 dark:text-stone-200 font-bold mb-1 flex items-center gap-1">
                    <Mail size={12} className="text-stone-400" />
                    <span>Correo Electrónico (Opcional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-bold placeholder:font-normal focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-800 dark:text-stone-200 font-bold mb-1">Teléfono / WhatsApp (Opcional)</label>
                  <input
                    type="tel"
                    placeholder="Ej. 999 901 1852"
                    value={newTelefono}
                    onChange={(e) => setNewTelefono(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-bold placeholder:font-normal focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Link Google Drive */}
              <div>
                <label className="block text-stone-800 dark:text-stone-200 font-bold mb-1 flex items-center gap-1">
                  <FolderOpen size={12} className="text-stone-400" />
                  <span>Enlace a Google Drive (Opcional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={newDriveUrl}
                  onChange={(e) => setNewDriveUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-bold placeholder:font-normal focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Notas u Observaciones */}
              <div>
                <label className="block text-stone-800 dark:text-stone-200 font-bold mb-1">Notas u Observaciones (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Indicaciones particulares de entrega o comprobante..."
                  value={newNotas}
                  onChange={(e) => setNewNotas(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium placeholder:font-normal focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-y"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>{isSaving ? "Guardando..." : `Guardar en Firestore ($${newTipo === "Primera Impresión" ? 100 : 50})`}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
