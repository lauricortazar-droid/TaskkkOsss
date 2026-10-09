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
  UserCheck,
  Database,
  Radio,
  CheckSquare,
  Square,
  StickyNote,
  ChevronRight,
  ChevronDown,
  X,
  FileBadge,
  Award,
} from "lucide-react";
import AlumnosPendientesSection, { AlumnoPendiente } from "./AlumnosPendientesSection";
import DriveDatabaseImportModal from "./DriveDatabaseImportModal";
import WhatsAppComposerModal from "./WhatsAppComposerModal";
import ReconocimientoFormModal from "./ReconocimientoFormModal";
import PublicReconocimientosImpresosModal, { formatNombrePrimerApellido } from "./PublicReconocimientosImpresosModal";
import { ImportTarget } from "../utils/driveImportParser";
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
  folio?: string;
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

  // Seguimiento operativo para Laura:
  elaboradoDigital: boolean;
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

  // View Mode: Dashboard | Graduados | En Vivo | Tablero Impresos & Drive | Pendientes | Historial
  const [activeView, setActiveView] = useState<"dashboard" | "graduados" | "pendientes" | "historial" | "en_vivo" | "impresos">("dashboard");

  // Estados específicos para el Tablero Visual de GRADUADOS
  const [graduadosYearFilter, setGraduadosYearFilter] = useState<string>("todos");
  const [graduadosSearchQuery, setGraduadosSearchQuery] = useState("");
  const [graduadosDriveFilter, setGraduadosDriveFilter] = useState<"todos" | "con_drive" | "sin_drive">("todos");
  const [copiedGraduadosNotice, setCopiedGraduadosNotice] = useState(false);
  const [editingGraduadoDriveRecordId, setEditingGraduadoDriveRecordId] = useState<string | null>(null);
  const [editingGraduadoDriveUrl, setEditingGraduadoDriveUrl] = useState("");
  const [isSavingGraduadoDrive, setIsSavingGraduadoDrive] = useState(false);

  // Selección múltiple para eliminar varios registros o aplicar cambios en lote
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // Estados para Tablero de Reconocimientos Impresos & Enlaces a Drive
  const [impresosSearch, setImpresosSearch] = useState("");
  const [impresosYear, setImpresosYear] = useState<string>("todos");
  const [impresosDriveFilter, setImpresosDriveFilter] = useState<"todos" | "con_drive" | "sin_drive">("todos");
  const [impresosGroupBy, setImpresosGroupBy] = useState<"none" | "generacion" | "diplomado" | "entrega">("none");
  const [collapsedImpresosGroups, setCollapsedImpresosGroups] = useState<string[]>([]);

  // Campo editable directo de enlace a Google Drive en el tablero
  const [editingDriveRecordId, setEditingDriveRecordId] = useState<string | null>(null);
  const [editingDriveValue, setEditingDriveValue] = useState("");
  const [savingDriveRecordId, setSavingDriveRecordId] = useState<string | null>(null);

  // Edición directa de notas u observaciones en registros
  const [editingRecordNoteId, setEditingRecordNoteId] = useState<string | null>(null);
  const [editingRecordNoteText, setEditingRecordNoteText] = useState("");

  // Modal para previsualizar la consulta pública de Drive de los impresos
  const [showPublicDrivePreviewModal, setShowPublicDrivePreviewModal] = useState(false);

  // Estados para Registro en Vivo (Todos los Medios)
  const [liveChannelFilter, setLiveChannelFilter] = useState<string>("todos");
  const [liveSearchQuery, setLiveSearchQuery] = useState("");
  const [liveYearFilter, setLiveYearFilter] = useState<string>("todos");

  // Modal para Redactar WhatsApp con Plantillas Personalizadas (Poner, Quitar, Editar)
  const [showWhatsappComposerModal, setShowWhatsappComposerModal] = useState(false);
  const [whatsappRecipientData, setWhatsappRecipientData] = useState<any | null>(null);

  // Modal para Editar Manualmente Datos del Solicitante / Reconocimiento
  const [showEditRecordModal, setShowEditRecordModal] = useState(false);
  const [editingRecordData, setEditingRecordData] = useState<ReconocimientoRecord | null>(null);
  const [pendientesCount, setPendientesCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("reconocimientos_alumnos_pendientes_v1");
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) return arr.length;
      }
    } catch (e) {}
    return 1;
  });
  const [chartMode, setChartMode] = useState<"estados" | "operativo">("estados");
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);

  // Filtros específicos para la Vista de Historial (Solo Interno)
  const [historyYear, setHistoryYear] = useState<string>("todos");
  const [historyMonth, setHistoryMonth] = useState<string>("todos");
  const [historySearch, setHistorySearch] = useState<string>("");

  // Retroalimentación visual inmediata con animación CSS al hacer clic en botones de estatus
  const [animatingBtnKey, setAnimatingBtnKey] = useState<string | null>(null);

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

  // Modal para importar bases de datos desde Google Drive / Sheets
  const [showDriveImportModal, setShowDriveImportModal] = useState(false);
  const [driveImportTarget, setDriveImportTarget] = useState<ImportTarget>("solicitudes");
  const [alumnosList, setAlumnosList] = useState<AlumnoPendiente[]>([]);

  // Sincronización de alumnos pendientes para verificación de duplicados
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, "alumnos_pendientes"), (snapshot) => {
        const arr: AlumnoPendiente[] = [];
        snapshot.forEach((snap) => {
          arr.push({ ...(snap.data() as AlumnoPendiente), id: snap.id });
        });
        setAlumnosList(arr);
        setPendientesCount(arr.length || 1);
      });
      return () => unsub();
    } catch (e) {
      console.warn("Could not subscribe to alumnos_pendientes:", e);
    }
  }, []);

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
            elaboradoDigital: base.elaboradoDigital || val.elaboradoDigital,
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
          existing.elaboradoDigital = existing.elaboradoDigital || item.elaboradoDigital;
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
            elaboradoDigital: Boolean(d.elaboradoDigital),
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
              elaboradoDigital: Boolean(d.elaboradoDigital),
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

    const unsubAlumnosPendientes = onSnapshot(
      collection(db, "alumnos_pendientes"),
      (snapshot) => {
        setPendientesCount(Math.max(1, snapshot.size));
      },
      (err) => {
        // Fallback to localStorage count
      }
    );

    return () => {
      unsubReconocimientos();
      unsubSolicitudes();
      unsubAlumnosPendientes();
    };
  }, []);

  // 2. Toggle tracking fields with instant Firestore sync in both collections
  const handleToggleStatus = async (
    record: ReconocimientoRecord,
    field: "elaboradoDigital" | "pagado" | "cuadernillos" | "audio" | "digital" | "impreso" | "entregado"
  ) => {
    const nextVal = !record[field];
    const clickKey = `${record.id}-${field}`;
    setAnimatingBtnKey(clickKey);
    setTimeout(() => {
      setAnimatingBtnKey((curr) => (curr === clickKey ? null : curr));
    }, 450);
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

  // Guardar enlace de Google Drive directamente desde el campo editable del tablero
  const handleSaveInlineDriveUrl = async (record: ReconocimientoRecord, newUrl: string) => {
    const cleanUrl = newUrl.trim();
    setSavingDriveRecordId(record.id);
    setRecords((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, driveUrl: cleanUrl || undefined } : r))
    );
    try {
      await Promise.allSettled([
        updateDoc(doc(db, "reconocimientos", record.id), { driveUrl: cleanUrl || null }),
        updateDoc(doc(db, "solicitudes", record.id), { driveUrl: cleanUrl || null }),
        record.solicitudId ? updateDoc(doc(db, "solicitudes", record.solicitudId), { driveUrl: cleanUrl || null }) : Promise.resolve(),
        record.solicitudId ? updateDoc(doc(db, "reconocimientos", record.solicitudId), { driveUrl: cleanUrl || null }) : Promise.resolve(),
      ]);
      playChime("success");
      setEditingDriveRecordId(null);
    } catch (err) {
      console.error("Error saving drive link:", err);
    } finally {
      setSavingDriveRecordId(null);
    }
  };

  // Guardar nota u observación directamente en el registro
  const handleSaveInlineRecordNote = async (record: ReconocimientoRecord, noteText: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, notas: noteText } : r))
    );
    setEditingRecordNoteId(null);
    playChime("tick");
    try {
      await Promise.allSettled([
        updateDoc(doc(db, "reconocimientos", record.id), { notas: noteText }),
        updateDoc(doc(db, "solicitudes", record.id), { notas: noteText }),
        record.solicitudId ? updateDoc(doc(db, "solicitudes", record.solicitudId), { notas: noteText }) : Promise.resolve(),
      ]);
    } catch (err) {
      console.error("Error saving record note:", err);
    }
  };

  // Selección múltiple para registros
  const handleToggleSelectRecord = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    playChime("tick");
  };

  const handleSelectAllVisibleRecords = (visibleList: ReconocimientoRecord[]) => {
    const visibleIds = visibleList.map((r) => r.id);
    const areAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedRecordIds.includes(id));
    if (areAllSelected) {
      setSelectedRecordIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedRecordIds(Array.from(new Set([...selectedRecordIds, ...visibleIds])));
    }
    playChime("tick");
  };

  // Eliminar varios registros seleccionándolos (Bulk delete)
  const handleBulkDeleteRecords = async () => {
    if (selectedRecordIds.length === 0) return;
    const count = selectedRecordIds.length;
    if (!window.confirm(`¿Estás seguro de eliminar los ${count} registros seleccionados permanentemente?`)) {
      return;
    }
    const idsToDelete = [...selectedRecordIds];
    setRecords((prev) => prev.filter((r) => !idsToDelete.includes(r.id)));
    setSelectedRecordIds([]);
    playChime("tick");

    idsToDelete.forEach(async (id) => {
      try {
        await Promise.allSettled([
          deleteDoc(doc(db, "reconocimientos", id)),
          deleteDoc(doc(db, "solicitudes", id)),
        ]);
      } catch (err) {
        console.warn("Error deleting record in Firestore:", id, err);
      }
    });
  };

  // Asignar generación en lote para los seleccionados
  const handleBulkChangeRecordGeneracion = async (year: string) => {
    if (selectedRecordIds.length === 0 || !year) return;
    const idsToUpdate = [...selectedRecordIds];
    setRecords((prev) =>
      prev.map((r) => (idsToUpdate.includes(r.id) ? { ...r, year } : r))
    );
    playChime("success");

    idsToUpdate.forEach(async (id) => {
      try {
        await Promise.allSettled([
          updateDoc(doc(db, "reconocimientos", id), { year }),
          updateDoc(doc(db, "solicitudes", id), { year, generacion: `Generación ${year}` }),
        ]);
      } catch (err) {}
    });
  };

  // Marcar como impresos en lote
  const handleBulkMarkRecordsImpreso = async () => {
    if (selectedRecordIds.length === 0) return;
    const idsToUpdate = [...selectedRecordIds];
    setRecords((prev) =>
      prev.map((r) => (idsToUpdate.includes(r.id) ? { ...r, impreso: true } : r))
    );
    playChime("success");

    idsToUpdate.forEach(async (id) => {
      try {
        await Promise.allSettled([
          updateDoc(doc(db, "reconocimientos", id), { impreso: true }),
          updateDoc(doc(db, "solicitudes", id), { impreso: true }),
        ]);
      } catch (err) {}
    });
  };

  // Lista de impresos para el tablero
  const printedRecords = useMemo(() => {
    return records.filter((r) => r.impreso === true);
  }, [records]);

  const filteredImpresosRecords = useMemo(() => {
    return printedRecords.filter((r) => {
      const q = impresosSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.nombre.toLowerCase().includes(q) ||
        (r.folio && r.folio.toLowerCase().includes(q)) ||
        (r.diplomado && r.diplomado.toLowerCase().includes(q)) ||
        (r.grupo && r.grupo.toLowerCase().includes(q));

      const matchYear = impresosYear === "todos" || r.year === impresosYear;
      const matchDrive =
        impresosDriveFilter === "todos" ||
        (impresosDriveFilter === "con_drive" && Boolean(r.driveUrl && r.driveUrl.trim())) ||
        (impresosDriveFilter === "sin_drive" && (!r.driveUrl || !r.driveUrl.trim()));

      return matchSearch && matchYear && matchDrive;
    });
  }, [printedRecords, impresosSearch, impresosYear, impresosDriveFilter]);

  // Grupos colapsables para impresos
  const handleToggleImpresosGroup = (groupKey: string) => {
    setCollapsedImpresosGroups((prev) =>
      prev.includes(groupKey) ? prev.filter((g) => g !== groupKey) : [...prev, groupKey]
    );
    playChime("tick");
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

  // 5. Send status message to student via WhatsApp con plantillas personalizadas (Poner, Quitar, Editar)
  const handleSendWhatsAppStatus = (rec: ReconocimientoRecord) => {
    setWhatsappRecipientData({
      nombre: rec.nombre,
      telefono: rec.telefono,
      diplomado: rec.diplomado,
      year: rec.year,
      costo: rec.costo,
      tipo: rec.tipoImpresion,
      folio: rec.id,
      driveUrl: rec.driveUrl,
      pagado: rec.pagado,
      cuadernillos: rec.cuadernillos,
      audio: rec.audio,
      digital: rec.digital,
      impreso: rec.impreso,
      entregado: rec.entregado,
      rol: rec.rol,
      zona: rec.zona,
      grupo: rec.grupo,
    });
    setShowWhatsappComposerModal(true);
    playChime("tick");
  };

  const handleOpenWhatsAppComposer = handleSendWhatsAppStatus;

  // 5.1 Abrir modal de modificación manual del participante o solicitud
  const handleOpenEditRecord = (rec: ReconocimientoRecord) => {
    setEditingRecordData(rec);
    setShowEditRecordModal(true);
    playChime("tick");
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
      if (filterStatus === "pend_elaborado" && r.elaboradoDigital) return false;
      if (filterStatus === "hecho_digital" && !r.elaboradoDigital) return false;
      if (filterStatus === "pend_cuadernillos" && r.cuadernillos) return false;
      if (filterStatus === "pend_audio" && r.audio) return false;
      if (filterStatus === "pend_digital" && r.digital) return false;
      if (filterStatus === "pend_impresion" && r.impreso) return false;
      if (filterStatus === "listos_entrega" && (!r.impreso || r.entregado)) return false;
      if (filterStatus === "entregados" && !r.entregado) return false;

      return true;
    });
  }, [records, searchQuery, selectedYear, filterPago, filterStatus]);

  // 6.1 Lista en Vivo y en Orden Cronológico Estricto (Del Más Nuevo al Más Viejo) de Todos los Medios
  const liveRecordsList = useMemo(() => {
    const list: (ReconocimientoRecord & {
      sourceChannel: string;
      sourceBadgeColor: string;
      timeLabel: string;
      sortTime: number;
    })[] = [];

    records.forEach((r) => {
      const isFromDrive = (r.notas || "").toLowerCase().includes("importado") || (r.notas || "").toLowerCase().includes("drive");
      const isFromPortal = Boolean(r.solicitudId) || (r.id && r.id.startsWith("sol-"));
      const channel = isFromDrive
        ? "Importación Drive/CSV"
        : isFromPortal
        ? "Portal Público Web"
        : "Registro Manual";
      
      const badgeColor = isFromDrive
        ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800"
        : isFromPortal
        ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
        : "bg-stone-100 dark:bg-stone-850 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700";

      const sortTime = r.timestamp?.toDate
        ? r.timestamp.toDate().getTime()
        : r.createdAt
        ? new Date(r.createdAt).getTime()
        : 0;

      let timeLabel = "Fecha reciente";
      if (r.createdAt) {
        try {
          const d = new Date(r.createdAt);
          timeLabel = d.toLocaleString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch (_) {}
      }

      list.push({
        ...r,
        sourceChannel: channel,
        sourceBadgeColor: badgeColor,
        timeLabel,
        sortTime,
      });
    });

    // Consolidar también alumnos registrados en el diplomado
    alumnosList.forEach((a) => {
      const exists = list.some(
        (x) => x.id === a.id || (x.email && a.email && x.email.toLowerCase() === a.email.toLowerCase())
      );
      if (!exists) {
        const sortTime = a.createdAt
          ? new Date(a.createdAt).getTime()
          : a.fechaRegistro
          ? new Date(a.fechaRegistro).getTime()
          : 0;

        let timeLabel = a.fechaRegistro || "Fecha reciente";
        if (a.createdAt) {
          try {
            const d = new Date(a.createdAt);
            timeLabel = d.toLocaleString("es-MX", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          } catch (_) {}
        }

        list.push({
          id: a.id,
          nombre: a.nombre,
          rol: a.rol || "Participante",
          grupo: a.casa ? a.casa.replace("Gladiadores Casa ", "") : "G-1",
          zona: "General",
          diplomado: "Diplomado de Liderazgo",
          year: a.generacion?.replace(/[^0-9]/g, "") || "2026",
          tipoImpresion: "Primera Impresión",
          costo: 100,
          telefono: a.telefono,
          email: a.email,
          notas: a.notas,
          createdAt: a.createdAt || (a.fechaRegistro ? new Date(a.fechaRegistro).toISOString() : new Date().toISOString()),
          elaboradoDigital: false,
          pagado: Boolean(a.contactadoWhatsApp),
          cuadernillos: false,
          audio: false,
          digital: false,
          impreso: false,
          entregado: false,
          sourceChannel: "Diplomado Liderazgo",
          sourceBadgeColor: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
          timeLabel,
          sortTime,
        });
      }
    });

    // Ordenar estrictamente del más nuevo al más viejo
    list.sort((a, b) => b.sortTime - a.sortTime);

    return list;
  }, [records, alumnosList]);

  // Filtro en vivo para la vista En Vivo
  const filteredLiveRecords = useMemo(() => {
    return liveRecordsList.filter((r) => {
      if (liveChannelFilter !== "todos") {
        if (liveChannelFilter === "web" && r.sourceChannel !== "Portal Público Web") return false;
        if (liveChannelFilter === "diplomado" && r.sourceChannel !== "Diplomado Liderazgo") return false;
        if (liveChannelFilter === "interno" && r.sourceChannel !== "Registro Manual") return false;
        if (liveChannelFilter === "drive" && r.sourceChannel !== "Importación Drive/CSV") return false;
      }
      if (liveYearFilter !== "todos" && r.year !== liveYearFilter) {
        return false;
      }
      if (liveSearchQuery.trim()) {
        const q = liveSearchQuery.toLowerCase().trim();
        const mName = r.nombre.toLowerCase().includes(q);
        const mDip = r.diplomado.toLowerCase().includes(q);
        const mTel = (r.telefono || "").includes(q);
        const mMail = (r.email || "").toLowerCase().includes(q);
        const mZona = (r.zona || "").toLowerCase().includes(q);
        return mName || mDip || mTel || mMail || mZona;
      }
      return true;
    });
  }, [liveRecordsList, liveChannelFilter, liveYearFilter, liveSearchQuery]);

  // 7. Computed Stats
  const stats = useMemo(() => {
    const total = records.length;
    const elaboradoDigitalCount = records.filter((r) => r.elaboradoDigital).length;
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
      elaboradoDigitalCount,
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
        estado: "Elaborado Digital",
        label: "Rec. Digital Hecho",
        completadas: stats.elaboradoDigitalCount,
        pendientes: Math.max(0, total - stats.elaboradoDigitalCount),
        porcentaje: total > 0 ? Math.round((stats.elaboradoDigitalCount / total) * 100) : 0,
        color: "#0891b2",
      },
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
      "RecDigitalElaborado",
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
      escapeCSV(r.elaboradoDigital ? "SI" : "NO"),
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

  const handlePromoteAlumno = (alumno: AlumnoPendiente) => {
    setNewNombre(alumno.nombre);
    setNewRol(alumno.rol || "Participante");
    setNewGrupo(alumno.casa || "Gladiadores Casa Martha Sangerman");
    setNewZona("Jaguar");
    setNewEmail(alumno.email || "");
    setNewTelefono(alumno.telefono || "");
    setNewNotas(`Promovido desde pendientes (${alumno.estatus}). ${alumno.notas || ""}`);
    setShowAddModal(true);
    setActiveView("dashboard");
    playChime("tick");
  };

  // =========================================================
  // TABLERO VISUAL DE GRADUADOS (2022 - 2025 - 2026)
  // Agrupado por Alumno: Nombre (primer apellido) Grupo Zona Diplomas: 2022 - 2025 - 2026
  // =========================================================
  const graduadosBoardList = useMemo(() => {
    const map = new Map<string, {
      key: string;
      nombreOriginal: string;
      nombreFormateado: string;
      primerApellido: string;
      grupo: string;
      zona: string;
      rol: string;
      telefono?: string;
      email?: string;
      diplomas: Array<{
        id: string;
        diplomado: string;
        year: string;
        tipoImpresion: string;
        costo: number;
        impreso: boolean;
        digital: boolean;
        entregado: boolean;
        pagado: boolean;
        driveUrl?: string;
        folio?: string;
      }>;
      yearsList: string[];
      yearsSummary: string;
      singleLineDisplay: string;
      hasAnyDrive: boolean;
      driveCount: number;
    }>();

    records.forEach((r) => {
      const rawName = (r.nombre || "").trim();
      if (!rawName) return;
      const normKey = rawName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

      const { formattedName, primerApellido } = formatNombrePrimerApellido(rawName);

      if (!map.has(normKey)) {
        map.set(normKey, {
          key: normKey,
          nombreOriginal: rawName,
          nombreFormateado: formattedName,
          primerApellido,
          grupo: r.grupo || "G-1",
          zona: r.zona || "General",
          rol: r.rol || "Alumno",
          telefono: r.telefono,
          email: r.email,
          diplomas: [],
          yearsList: [],
          yearsSummary: "",
          singleLineDisplay: "",
          hasAnyDrive: false,
          driveCount: 0,
        });
      }

      const item = map.get(normKey)!;
      if (!item.telefono && r.telefono) item.telefono = r.telefono;
      if (!item.email && r.email) item.email = r.email;
      if (r.grupo && (item.grupo === "G-1" || !item.grupo)) item.grupo = r.grupo;
      if (r.zona && (item.zona === "General" || !item.zona)) item.zona = r.zona;

      item.diplomas.push({
        id: r.id,
        diplomado: r.diplomado || "Diplomado de Liderazgo",
        year: r.year || "2026",
        tipoImpresion: r.tipoImpresion || "Primera Impresión",
        costo: r.costo || 50,
        impreso: Boolean(r.impreso),
        digital: Boolean(r.digital),
        entregado: Boolean(r.entregado),
        pagado: Boolean(r.pagado),
        driveUrl: r.driveUrl,
        folio: r.folio,
      });
    });

    const list: any[] = [];
    map.forEach((item) => {
      item.diplomas.sort((a, b) => a.year.localeCompare(b.year));
      const years = Array.from(new Set(item.diplomas.map((d: any) => d.year))).sort((a: any, b: any) => a.localeCompare(b));
      item.yearsList = years;
      item.yearsSummary = years.join(" - ") || "2026";
      item.singleLineDisplay = `- ${item.nombreFormateado} ${item.grupo} ${item.zona} Diplomas: ${item.yearsSummary}`;
      item.driveCount = item.diplomas.filter((d: any) => Boolean(d.driveUrl && d.driveUrl.trim())).length;
      item.hasAnyDrive = item.driveCount > 0;
      list.push(item);
    });

    return list.sort((a, b) => a.nombreOriginal.localeCompare(b.nombreOriginal));
  }, [records]);

  // Lista de años disponibles asegurando 2022, 2025 y 2026
  const graduadosAvailableYears = useMemo(() => {
    const yearsSet = new Set<string>(["2022", "2025", "2026"]);
    graduadosBoardList.forEach((g) => {
      g.yearsList.forEach((y: string) => yearsSet.add(y));
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [graduadosBoardList]);

  // Filtrado de graduados para el Tablero Visual
  const filteredGraduadosList = useMemo(() => {
    return graduadosBoardList.filter((g) => {
      // Filtro por año
      if (graduadosYearFilter !== "todos") {
        if (!g.yearsList.includes(graduadosYearFilter)) {
          return false;
        }
      }

      // Filtro por Drive
      if (graduadosDriveFilter === "con_drive" && !g.hasAnyDrive) return false;
      if (graduadosDriveFilter === "sin_drive" && g.hasAnyDrive) return false;

      // Buscador por nombre o apellidos
      if (graduadosSearchQuery.trim()) {
        const q = graduadosSearchQuery.toLowerCase().trim();
        const matchOriginal = g.nombreOriginal.toLowerCase().includes(q);
        const matchFormat = g.nombreFormateado.toLowerCase().includes(q);
        const matchApellido = g.primerApellido.toLowerCase().includes(q);
        const matchGrupo = g.grupo.toLowerCase().includes(q);
        const matchZona = g.zona.toLowerCase().includes(q);
        const matchSingle = g.singleLineDisplay.toLowerCase().includes(q);
        const matchDiplomas = g.diplomas.some(
          (d: any) => d.diplomado.toLowerCase().includes(q) || d.year.includes(q)
        );
        if (!matchOriginal && !matchFormat && !matchApellido && !matchGrupo && !matchZona && !matchSingle && !matchDiplomas) {
          return false;
        }
      }

      return true;
    });
  }, [graduadosBoardList, graduadosYearFilter, graduadosDriveFilter, graduadosSearchQuery]);

  // Guardar link de Google Drive (Laura lo agrega o modifica directamente)
  const handleSaveGraduadoDriveUrl = async (recordId: string, url: string) => {
    const cleanUrl = url.trim();
    setIsSavingGraduadoDrive(true);
    try {
      await Promise.allSettled([
        updateDoc(doc(db, "reconocimientos", recordId), {
          driveUrl: cleanUrl,
          updatedAt: new Date().toISOString(),
        }),
        updateDoc(doc(db, "solicitudes", recordId), {
          driveUrl: cleanUrl,
          updatedAt: new Date().toISOString(),
        }),
      ]);

      setRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, driveUrl: cleanUrl } : r))
      );
      setEditingGraduadoDriveRecordId(null);
      setEditingGraduadoDriveUrl("");
      playChime("success");
    } catch (err) {
      console.error("Error saving Drive link:", err);
      alert("No se pudo guardar el enlace de Drive en Firestore.");
    } finally {
      setIsSavingGraduadoDrive(false);
    }
  };

  // Copiar lista de GRADUADOS formateada:
  // GRADUADOS
  // - Nombre (primer apellido) Grupo Zona Diplomas: 2022 - 2025 - 2026
  const handleCopyGraduadosFormattedList = () => {
    if (filteredGraduadosList.length === 0) return;
    const lines = [
      "GRADUADOS",
      ...filteredGraduadosList.map((g) => g.singleLineDisplay),
    ].join("\n");

    navigator.clipboard.writeText(lines);
    setCopiedGraduadosNotice(true);
    playChime("tick");
    setTimeout(() => setCopiedGraduadosNotice(false), 3000);
  };

  // Renderizar fila en el Tablero de Impresos con campo editable de Google Drive
  const renderImpresoRow = (r: ReconocimientoRecord) => {
    const isSelected = selectedRecordIds.includes(r.id);
    const isEditingDrive = editingDriveRecordId === r.id;
    const isSavingThisDrive = savingDriveRecordId === r.id;
    const hasDrive = Boolean(r.driveUrl && r.driveUrl.trim());
    const isEditingNote = editingRecordNoteId === r.id;

    return (
      <tr
        key={r.id}
        className={`hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors group ${
          isSelected ? "bg-purple-100/50 dark:bg-purple-950/40" : ""
        }`}
      >
        {/* Checkbox de selección individual */}
        <td className="py-4 px-4 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleToggleSelectRecord(r.id)}
            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
        </td>

        {/* Alumno y Folio */}
        <td className="py-4 px-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-stone-900 dark:text-stone-100">
                {r.nombre}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                {r.folio || "SIN FOLIO"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
              <span className="font-semibold text-stone-700 dark:text-stone-300">
                {r.rol}
              </span>
              {r.telefono && (
                <span className="font-mono text-stone-400 text-[10px]">
                  • {r.telefono}
                </span>
              )}
            </div>

            {/* Notas u observaciones */}
            {isEditingNote ? (
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={editingRecordNoteText}
                  onChange={(e) => setEditingRecordNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveInlineRecordNote(r, editingRecordNoteText);
                    if (e.key === "Escape") setEditingRecordNoteId(null);
                  }}
                  placeholder="Nota u observación..."
                  className="text-xs px-2.5 py-1 rounded-xl border border-purple-500 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 w-full max-w-sm focus:outline-hidden"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleSaveInlineRecordNote(r, editingRecordNoteText)}
                  className="px-2 py-1 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 cursor-pointer"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRecordNoteId(null)}
                  className="p-1 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-xs cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 pt-0.5">
                {r.notas ? (
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 italic max-w-md flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                    <StickyNote size={11} className="text-purple-600 shrink-0" />
                    <span>"{r.notas}"</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecordNoteId(r.id);
                        setEditingRecordNoteText(r.notas || "");
                      }}
                      className="p-0.5 text-stone-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Editar nota"
                    >
                      <Edit2 size={10} />
                    </button>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRecordNoteId(r.id);
                      setEditingRecordNoteText("");
                    }}
                    className="text-[10px] text-stone-400 hover:text-purple-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  >
                    <Plus size={10} />
                    <span>Poner nota</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </td>

        {/* Diplomado y Gen */}
        <td className="py-4 px-4">
          <div className="space-y-1">
            <div className="font-bold text-stone-800 dark:text-stone-200">
              {r.diplomado || "Diplomado de Liderazgo"}
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Gen {r.year}
              </span>
              <span className="text-[11px] text-stone-400">
                {r.tipoImpresion}
              </span>
            </div>
          </div>
        </td>

        {/* Enlace Google Drive (Campo Editable Directo en el Tablero) */}
        <td className="py-4 px-4 min-w-[320px]">
          <div className="space-y-1.5">
            {isEditingDrive ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="url"
                  value={editingDriveValue}
                  onChange={(e) => setEditingDriveValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveInlineDriveUrl(r, editingDriveValue);
                    if (e.key === "Escape") setEditingDriveRecordId(null);
                  }}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-2.5 py-1.5 rounded-xl border border-purple-500 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 font-mono focus:outline-hidden"
                  autoFocus
                />
                <button
                  type="button"
                  disabled={isSavingThisDrive}
                  onClick={() => handleSaveInlineDriveUrl(r, editingDriveValue)}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSavingThisDrive ? "..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDriveRecordId(null)}
                  className="p-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-xs cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  onClick={() => {
                    setEditingDriveRecordId(r.id);
                    setEditingDriveValue(r.driveUrl || "");
                  }}
                  className={`flex-1 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border transition cursor-pointer text-xs ${
                    hasDrive
                      ? "bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 hover:border-purple-400"
                      : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 hover:border-amber-500"
                  }`}
                  title="Clic para editar enlace de Google Drive directamente"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FolderOpen size={13} className={hasDrive ? "text-purple-600 shrink-0" : "text-amber-500 shrink-0"} />
                    <span className="truncate font-mono text-[11px]">
                      {hasDrive ? r.driveUrl : "⚠️ Sin link (Clic para colocar)"}
                    </span>
                  </div>
                  <Edit2 size={12} className="opacity-60 group-hover:opacity-100 shrink-0" />
                </div>

                {hasDrive && (
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={r.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition shadow-2xs"
                      title="Abrir enlace en Google Drive"
                    >
                      <ExternalLink size={13} />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(r.driveUrl || "");
                        playChime("tick");
                      }}
                      className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-800 transition shadow-2xs cursor-pointer"
                      title="Copiar enlace"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Badges de estado público */}
            <div className="flex items-center gap-2">
              {hasDrive ? (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Disponible en Consulta Pública
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle size={11} /> Requiere enlace para consulta digital pública
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Entrega */}
        <td className="py-4 px-4 text-center">
          <button
            type="button"
            onClick={() => handleToggleStatus(r, "entregado")}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border cursor-pointer ${
              r.entregado
                ? "bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-300"
                : "bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-200 dark:border-stone-700 hover:bg-stone-200"
            }`}
            title="Clic para cambiar estatus de entrega"
          >
            {r.entregado ? "✅ Entregado" : "⏳ Pendiente"}
          </button>
        </td>

        {/* WhatsApp Personalizado con plantilla de Drive */}
        <td className="py-4 px-4 text-center">
          <button
            type="button"
            onClick={() => handleOpenWhatsAppComposer(r)}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 mx-auto cursor-pointer"
            title="Enviar mensaje de WhatsApp con enlace de Drive"
          >
            <MessageCircle size={13} />
            <span>Notificar</span>
          </button>
        </td>

        {/* Acciones */}
        <td className="py-4 px-4 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenEditRecord(r)}
              className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 hover:bg-amber-100 transition shadow-2xs cursor-pointer"
              title="Modificar datos del participante manualmente"
            >
              <Edit2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteRecord(r)}
              className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Eliminar registro"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>
    );
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
            <button
              type="button"
              onClick={() => {
                setDriveImportTarget(
                  activeView === "pendientes"
                    ? "alumnos"
                    : activeView === "historial"
                    ? "historial"
                    : "solicitudes"
                );
                setShowDriveImportModal(true);
                playChime("tick");
              }}
              className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white text-xs font-black transition flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
              title="Importar base de datos masiva desde Google Drive o archivos"
            >
              <Database size={15} />
              <span>Subir BD de Drive</span>
            </button>

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
              onClick={() => {
                setWhatsappRecipientData(null);
                setShowWhatsappComposerModal(true);
                playChime("tick");
              }}
              className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white text-xs font-black transition flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
              title="Administrar, agregar, editar y eliminar plantillas de WhatsApp"
            >
              <MessageCircle size={15} />
              <span>Plantillas WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-white text-indigo-950 font-black text-xs transition shadow-md hover:bg-indigo-50 flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Plus size={15} />
              <span>Registrar Alumno</span>
            </button>
          </div>
        </div>
      </div>

      {/* SELECTOR DE VISTAS: SEGUIMIENTO OPERATIVO VS GRADUADOS VS HISTORIAL */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-stone-100 dark:bg-stone-800/90 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white/70 dark:bg-stone-900/70 rounded-xl">
          <button
            type="button"
            id="tab-btn-seguimiento-operativo"
            onClick={() => {
              setActiveView("dashboard");
              playChime("tick");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-transform duration-150 transform flex items-center gap-2 cursor-pointer btn-seguimiento-operativo-scale active:scale-95 hover:scale-[1.03] ${
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

          {/* TABLERO VISUAL DE GRADUADOS */}
          <button
            type="button"
            id="tab-btn-graduados"
            onClick={() => {
              setActiveView("graduados");
              playChime("tick");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeView === "graduados"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            }`}
          >
            <GraduationCap size={15} />
            <span>Tablero Graduados</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeView === "graduados"
                ? "bg-white/20 text-white"
                : "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300"
            }`}>
              {graduadosBoardList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView("en_vivo");
              playChime("tick");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeView === "en_vivo"
                ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/20"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span>Registro en Vivo</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeView === "en_vivo"
                ? "bg-white/20 text-white"
                : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
            }`}>
              {liveRecordsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView("impresos");
              playChime("tick");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeView === "impresos"
                ? "bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/20"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            }`}
          >
            <Printer size={15} />
            <span>Tablero Impresos & Drive</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeView === "impresos"
                ? "bg-white/20 text-white"
                : "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300"
            }`}>
              {printedRecords.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView("pendientes");
              playChime("tick");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeView === "pendientes"
                ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/20"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            }`}
          >
            <UserCheck size={15} />
            <span>Alumnos Pendientes</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeView === "pendientes"
                ? "bg-white/20 text-white"
                : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
            }`}>
              {pendientesCount}
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
          ) : activeView === "graduados" ? (
            <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold">
              <GraduationCap size={14} />
              <span>Tablero de GRADUADOS con filtro por año (2022, 2025, 2026), buscador y enlaces a Google Drive</span>
            </span>
          ) : activeView === "en_vivo" ? (
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
              <span>Lista en vivo de todos los medios del más nuevo al más viejo con edición manual</span>
            </span>
          ) : activeView === "impresos" ? (
            <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold">
              <Printer size={14} />
              <span>Tablero con reconocimientos impresos, enlace editable a Google Drive y consulta pública</span>
            </span>
          ) : activeView === "pendientes" ? (
            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold">
              <UserCheck size={14} />
              <span>Candidatos admitidos, seguimiento de datos y contacto personal por WhatsApp</span>
            </span>
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
      {/* ALERTA / ACCESO DIRECTO A ALUMNOS PENDIENTES */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-indigo-500/10 border border-amber-400/40 dark:border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <UserCheck size={16} />
          </div>
          <div>
            <span className="font-black text-stone-900 dark:text-stone-100">
              Alumnos Pendientes ({pendientesCount}):
            </span>{" "}
            <span className="text-stone-600 dark:text-stone-300">
              Edgar Jose Batun Alpuche (Admitido • Gladiadores Casa Martha Sangerman) y postulantes registrados.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setActiveView("pendientes");
            playChime("tick");
          }}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95"
        >
          <span>Ver Alumnos Pendientes</span>
          <ArrowRight size={13} />
        </button>
      </div>
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

      {/* 7 Key Tracking Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        
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

        {/* KPI: Rec. Digital Elaborado */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>Rec. Digital</span>
            <FileBadge size={14} className="text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
            {stats.elaboradoDigitalCount} <span className="text-xs text-stone-400 font-bold">/ {stats.total}</span>
          </div>
          <span className="text-[10px] text-stone-400 font-medium">
            {stats.total - stats.elaboradoDigitalCount} pendientes de hacer
          </span>
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
              <option value="pend_elaborado">Pendiente de Elaborar Digital</option>
              <option value="hecho_digital">Reconocimiento Digital Elaborado</option>
              <option value="pend_cuadernillos">Pendiente de Cuadernillos</option>
              <option value="pend_audio">Pendiente de Audio</option>
              <option value="pend_digital">Pendiente de Enviar Digital</option>
              <option value="pend_impresion">Pendiente de Impresión</option>
              <option value="listos_entrega">Listos para Entrega</option>
              <option value="entregados">Completados / Entregados</option>
            </select>

            {/* Subir BD Solicitudes desde Drive */}
            <button
              type="button"
              onClick={() => {
                setDriveImportTarget("solicitudes");
                setShowDriveImportModal(true);
                playChime("tick");
              }}
              className="px-3 py-1.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 cursor-pointer shadow-2xs"
              title="Importar base de datos de solicitudes desde Google Drive / Sheets"
            >
              <Database size={13} />
              <span>Subir BD Drive</span>
            </button>

            {/* Export CSV button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
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
                  <th className="py-3 px-2 text-center" title="¿Ya se elaboró el reconocimiento de manera digital (aunque no se haya enviado)?">1. Rec. Hecho</th>
                  <th className="py-3 px-2 text-center" title="¿Ya pagó el alumno?">2. Pagado</th>
                  <th className="py-3 px-2 text-center" title="¿Ya mandó los cuadernillos?">3. Cuadernillos</th>
                  <th className="py-3 px-2 text-center" title="¿Ya mandó el audio?">4. Audio</th>
                  <th className="py-3 px-2 text-center" title="¿Ya se le mandó el reconocimiento digital?">5. Digital</th>
                  <th className="py-3 px-2 text-center" title="¿Ya se imprimió físicamente?">6. Impreso</th>
                  <th className="py-3 px-2 text-center" title="¿Ya se le entregó?">7. Entregado</th>
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

                      {/* CHECK OPERATIVO: RECONOCIMIENTO DIGITAL ELABORADO (ANTES DE PAGO) */}
                      <td className="py-3.5 px-2 text-center">
                        <button
                          type="button"
                          aria-label="Seguimiento Operativo: Reconocimiento digital"
                          onClick={() => handleToggleStatus(r, "elaboradoDigital")}
                          className={`p-2 rounded-xl border text-xs font-bold shadow-2xs btn-seguimiento-operativo-scale cursor-pointer ${
                            animatingBtnKey === `${r.id}-elaboradoDigital`
                              ? "animate-scale-feedback ring-2 ring-cyan-400 shadow-md"
                              : ""
                          } ${
                            r.elaboradoDigital
                              ? "bg-cyan-600 border-cyan-700 text-white shadow-cyan-500/20"
                              : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400 hover:border-cyan-400"
                          }`}
                          title={
                            r.elaboradoDigital
                              ? "Seguimiento Operativo: Reconocimiento digital elaborado / listo (Clic para desmarcar)"
                              : "Seguimiento Operativo: Pendiente de elaborar reconocimiento digital (Clic para marcar como hecho)"
                          }
                        >
                          <FileBadge size={15} />
                        </button>
                      </td>

                      {/* CHECK 1: PAGADO */}
                      <td className="py-3.5 px-2 text-center">
                        <button
                          type="button"
                          aria-label="Seguimiento Operativo: Pago"
                          onClick={() => handleToggleStatus(r, "pagado")}
                          className={`p-2 rounded-xl border text-xs font-bold shadow-2xs btn-seguimiento-operativo-scale cursor-pointer ${
                            animatingBtnKey === `${r.id}-pagado`
                              ? "animate-scale-feedback ring-2 ring-emerald-400 shadow-md"
                              : ""
                          } ${
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
                          aria-label="Seguimiento Operativo: Cuadernillos"
                          onClick={() => handleToggleStatus(r, "cuadernillos")}
                          className={`p-2 rounded-xl border text-xs font-bold shadow-2xs btn-seguimiento-operativo-scale cursor-pointer ${
                            animatingBtnKey === `${r.id}-cuadernillos`
                              ? "animate-scale-feedback ring-2 ring-blue-400 shadow-md"
                              : ""
                          } ${
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
                          aria-label="Seguimiento Operativo: Audio"
                          onClick={() => handleToggleStatus(r, "audio")}
                          className={`p-2 rounded-xl border text-xs font-bold shadow-2xs btn-seguimiento-operativo-scale cursor-pointer ${
                            animatingBtnKey === `${r.id}-audio`
                              ? "animate-scale-feedback ring-2 ring-amber-400 shadow-md"
                              : ""
                          } ${
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
                          aria-label="Seguimiento Operativo: Digital"
                          onClick={() => handleToggleStatus(r, "digital")}
                          className={`p-2 rounded-xl border text-xs font-bold shadow-2xs btn-seguimiento-operativo-scale cursor-pointer ${
                            animatingBtnKey === `${r.id}-digital`
                              ? "animate-scale-feedback ring-2 ring-indigo-400 shadow-md"
                              : ""
                          } ${
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
                          aria-label="Seguimiento Operativo: Impreso"
                          onClick={() => handleToggleStatus(r, "impreso")}
                          className={`p-2 rounded-xl border text-xs font-bold shadow-2xs btn-seguimiento-operativo-scale cursor-pointer ${
                            animatingBtnKey === `${r.id}-impreso`
                              ? "animate-scale-feedback ring-2 ring-purple-400 shadow-md"
                              : ""
                          } ${
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
                          aria-label="Seguimiento Operativo: Entregado"
                          onClick={() => handleToggleStatus(r, "entregado")}
                          className={`p-2 rounded-xl border text-xs font-bold shadow-2xs btn-seguimiento-operativo-scale cursor-pointer ${
                            animatingBtnKey === `${r.id}-entregado`
                              ? "animate-scale-feedback ring-2 ring-teal-400 shadow-md"
                              : ""
                          } ${
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

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditRecord(r)}
                            className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 hover:bg-amber-100 transition shadow-2xs cursor-pointer"
                            title="Modificar datos del participante manualmente"
                          >
                            <Edit2 size={13} />
                          </button>

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

      {/* VISTA: TABLERO VISUAL DE GRADUADOS (2022, 2025, 2026) */}
      {activeView === "graduados" && (
        <div id="tablero-graduados-view" className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header Banner de Graduados */}
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-950 to-purple-950 text-white shadow-xl relative overflow-hidden border border-indigo-500/40">
            <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="p-2 rounded-2xl bg-white/10 backdrop-blur-md text-white text-xl flex items-center justify-center">
                    🎓
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-400 text-stone-950 font-mono shadow-xs">
                    OFICIAL • GRADUADOS
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-200 border border-white/20">
                    Diplomas: 2022 - 2025 - 2026
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Tablero Visual de Graduados
                </h3>
                <p className="text-xs sm:text-sm text-indigo-100 max-w-2xl leading-relaxed">
                  Directorio de graduados con reconocimientos impresos vinculados a Google Drive.
                  Laura agrega o actualiza el enlace público de Drive en cualquier momento sin que el alumno deba configurar nada.
                </p>
              </div>

              {/* Botones de acción rápida en cabecera */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  id="btn-copiar-lista-graduados"
                  onClick={handleCopyGraduadosFormattedList}
                  className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white font-bold text-xs transition flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
                  title="Copiar lista de graduados formateada (- Nombre (primer apellido)...)"
                >
                  {copiedGraduadosNotice ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-300 font-black">¡Lista Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar Formato Oficial</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPublicDrivePreviewModal(true)}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black text-xs transition flex items-center gap-2 shadow-md active:scale-95 cursor-pointer"
                  title="Ver modal público de graduados"
                >
                  <Eye size={14} />
                  <span>Ver Portal Público</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer border border-white/20"
                  title="Registrar nuevo alumno o diploma"
                >
                  <Plus size={14} />
                  <span>Nuevo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Barra de Filtros: Buscador por Nombre, Botones por Año (2022, 2025, 2026), y Filtro Drive */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Buscador por Nombre */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  id="search-graduados-input"
                  value={graduadosSearchQuery}
                  onChange={(e) => setGraduadosSearchQuery(e.target.value)}
                  placeholder="Buscar graduado por nombre, primer apellido, grupo, zona o diplomado..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-stone-100 dark:bg-stone-800 border-none text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-stone-400"
                />
                {graduadosSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setGraduadosSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Filtro de Drive */}
              <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl shrink-0">
                <span className="text-[11px] font-bold text-stone-400 px-2 uppercase tracking-wider">
                  Drive:
                </span>
                {[
                  { key: "todos", label: "Todos" },
                  { key: "con_drive", label: "Con Link 📁" },
                  { key: "sin_drive", label: "Sin Link ⏳" },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setGraduadosDriveFilter(f.key as any);
                      playChime("tick");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      graduadosDriveFilter === f.key
                        ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs"
                        : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* BOTONES DE FILTRO POR AÑO: 2022, 2025, 2026 */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <span className="text-xs font-extrabold uppercase tracking-wider text-stone-400 mr-1 flex items-center gap-1.5">
                <Calendar size={13} />
                <span>Filtrar por Año:</span>
              </span>

              {/* Botón Todos */}
              <button
                type="button"
                onClick={() => {
                  setGraduadosYearFilter("todos");
                  playChime("tick");
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  graduadosYearFilter === "todos"
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 shadow-xs"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
                }`}
              >
                <span>Todos los Años</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  graduadosYearFilter === "todos"
                    ? "bg-white/20 text-white dark:bg-stone-900/20 dark:text-stone-900"
                    : "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300"
                }`}>
                  {graduadosBoardList.length}
                </span>
              </button>

              {/* Botones para años 2022, 2025, 2026 y otros */}
              {graduadosAvailableYears.map((year) => {
                const countForYear = graduadosBoardList.filter((g) => g.yearsList.includes(year)).length;
                const isSelected = graduadosYearFilter === year;

                // Color personalizado por año
                let colorClass = "bg-indigo-600 text-white";
                let badgeSelectedClass = "bg-white/20 text-white";
                if (year === "2022") {
                  colorClass = "bg-amber-600 text-white shadow-amber-500/20";
                } else if (year === "2025") {
                  colorClass = "bg-blue-600 text-white shadow-blue-500/20";
                } else if (year === "2026") {
                  colorClass = "bg-purple-600 text-white shadow-purple-500/20";
                }

                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setGraduadosYearFilter(year);
                      playChime("tick");
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? `${colorClass} shadow-xs ring-2 ring-indigo-500/20`
                        : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-750"
                    }`}
                  >
                    <span>Generación {year}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? badgeSelectedClass
                        : "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300"
                    }`}>
                      {countForYear}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Fila de Estadísticas Rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
              <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50">
                <span className="text-[10px] font-bold text-stone-400 block uppercase">Graduados Mostrados</span>
                <span className="font-mono font-black text-sm text-stone-900 dark:text-stone-100">
                  {filteredGraduadosList.length}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30">
                <span className="text-[10px] font-bold text-indigo-500 block uppercase">Con Enlace Drive</span>
                <span className="font-mono font-black text-sm text-indigo-700 dark:text-indigo-300">
                  {filteredGraduadosList.filter((g) => g.hasAnyDrive).length}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30">
                <span className="text-[10px] font-bold text-amber-600 block uppercase">Diplomas 2022</span>
                <span className="font-mono font-black text-sm text-amber-700 dark:text-amber-300">
                  {filteredGraduadosList.flatMap((g) => g.diplomas).filter((d: any) => d.year === "2022").length}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30">
                <span className="text-[10px] font-bold text-purple-600 block uppercase">Diplomas 2025 - 2026</span>
                <span className="font-mono font-black text-sm text-purple-700 dark:text-purple-300">
                  {filteredGraduadosList.flatMap((g) => g.diplomas).filter((d: any) => d.year === "2025" || d.year === "2026").length}
                </span>
              </div>
            </div>

          </div>

          {/* TABLERO VISUAL: LISTA DE GRADUADOS */}
          {filteredGraduadosList.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
                🎓
              </div>
              <h4 className="text-base font-black text-stone-900 dark:text-stone-100">
                No se encontraron graduados con los filtros seleccionados
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                Prueba cambiando el año de filtro ({graduadosYearFilter}) o borrando la búsqueda "{graduadosSearchQuery}".
              </p>
              <button
                type="button"
                onClick={() => {
                  setGraduadosYearFilter("todos");
                  setGraduadosSearchQuery("");
                  setGraduadosDriveFilter("todos");
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition"
              >
                Restablecer todos los filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredGraduadosList.map((g, idx) => (
                <div
                  key={g.key + "-" + idx}
                  className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs hover:shadow-md transition-all space-y-4"
                >
                  {/* Encabezado Principal estilizado: Nombre y Primer Apellido */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-purple-50/90 dark:from-stone-850 dark:via-stone-800 dark:to-stone-850 border border-indigo-100 dark:border-stone-700 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0 tracking-wider">
                        {(g.nombreFormateado || "E")
                          .split(" ")
                          .filter(Boolean)
                          .map((w: string) => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 leading-tight tracking-tight">
                            {g.nombreFormateado}
                          </h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {g.rol || "Líder"}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Grupo {g.grupo}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            Zona {g.zona}
                          </span>
                          {g.hasAnyDrive && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              <CheckCircle2 size={11} />
                              <span>Drive Listo</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Acciones de copia rápida para el formato */}
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-indigo-100 dark:border-stone-700 text-indigo-950 dark:text-indigo-200 text-xs font-black">
                        <span className="text-[9px] uppercase text-indigo-600 dark:text-indigo-400 font-bold block leading-none mb-0.5">
                          Diplomas
                        </span>
                        <span>{g.yearsSummary}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(g.singleLineDisplay);
                          playChime("tick");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold border border-stone-200 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-650 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title={`Copiar línea oficial: ${g.singleLineDisplay}`}
                      >
                        <Copy size={12} />
                        <span>Copiar Línea</span>
                      </button>

                      {g.telefono && (
                        <button
                          type="button"
                          onClick={() => {
                            const driveLink = g.diplomas.find((d: any) => d.driveUrl)?.driveUrl;
                            const msg = driveLink
                              ? `Hola ${g.nombreOriginal}, aquí tienes el enlace oficial a Google Drive de tu reconocimiento: ${driveLink}`
                              : `Hola ${g.nombreOriginal}, te confirmamos tu participación en el diplomado (${g.yearsSummary}). Tu reconocimiento ya está en proceso de impresión.`;
                            const url = buildWhatsAppUrl(g.telefono!, msg);
                            window.open(url, "_blank");
                          }}
                          className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 hover:bg-emerald-100 transition border border-emerald-200/60"
                          title="Enviar WhatsApp al graduado"
                        >
                          <MessageCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detalle de Diplomas y Enlaces a Google Drive de este Graduado */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-stone-400 block">
                      Reconocimientos y Enlaces a Google Drive:
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {g.diplomas.map((d: any, dIdx: number) => {
                        const isEditingDrive = editingGraduadoDriveRecordId === d.id;
                        const hasDrive = Boolean(d.driveUrl && d.driveUrl.trim());

                        // Year badge colors
                        let yearBadgeColor = "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300";
                        if (d.year === "2022") yearBadgeColor = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
                        if (d.year === "2025") yearBadgeColor = "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
                        if (d.year === "2026") yearBadgeColor = "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300";

                        return (
                          <div
                            key={d.id + "-" + dIdx}
                            className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850 space-y-2.5 transition"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black ${yearBadgeColor}`}>
                                    {d.year}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 shadow-2xs">
                                    {d.tipoImpresion}
                                  </span>
                                </div>
                                <h5 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                                  {d.diplomado}
                                </h5>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {d.impreso ? (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[10px] font-bold" title="Reconocimiento físico impreso">
                                    🖨️ Impreso
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400 text-[10px]">
                                    Por imprimir
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Sección Enlace Google Drive (El graduado lo mira; Laura lo agrega/edita) */}
                            {isEditingDrive ? (
                              <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-indigo-200 dark:border-indigo-800 space-y-2">
                                <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block">
                                  Agregar / Modificar enlace público de Google Drive:
                                </label>
                                <input
                                  type="url"
                                  value={editingGraduadoDriveUrl}
                                  onChange={(e) => setEditingGraduadoDriveUrl(e.target.value)}
                                  placeholder="https://drive.google.com/file/d/..."
                                  className="w-full px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-mono text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingGraduadoDriveRecordId(null);
                                      setEditingGraduadoDriveUrl("");
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isSavingGraduadoDrive}
                                    onClick={() => handleSaveGraduadoDriveUrl(d.id, editingGraduadoDriveUrl)}
                                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    {isSavingGraduadoDrive ? "Guardando..." : "Guardar en Drive"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/60 dark:border-stone-800">
                                {hasDrive ? (
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={d.driveUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-xs transition transform active:scale-95 cursor-pointer"
                                      title="Abrir reconocimiento digital en Google Drive"
                                    >
                                      <ExternalLink size={13} />
                                      <span>Ver Reconocimiento Digital (Drive)</span>
                                    </a>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(d.driveUrl!);
                                        playChime("tick");
                                      }}
                                      className="p-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300 transition text-xs cursor-pointer"
                                      title="Copiar enlace de Drive"
                                    >
                                      <Copy size={13} />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                    <Clock size={12} />
                                    <span>Sin enlace Drive asignado aún</span>
                                  </span>
                                )}

                                {/* Botón para que Laura agregue o modifique el enlace del Drive */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingGraduadoDriveRecordId(d.id);
                                    setEditingGraduadoDriveUrl(d.driveUrl || "");
                                  }}
                                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                                  title="Laura agregará o modificará el link de Drive"
                                >
                                  <Edit2 size={11} />
                                  <span>{hasDrive ? "Editar Link" : "+ Agregar Link Drive"}</span>
                                </button>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* VISTA: REGISTRO EN VIVO (TODOS LOS MEDIOS - DEL MÁS NUEVO AL MÁS VIEJO) */}
      {activeView === "en_vivo" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Header Banner */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-rose-900 via-stone-900 to-indigo-950 text-white shadow-xl relative overflow-hidden border border-rose-500/30">
            <div className="absolute right-0 top-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-rose-500/30 text-rose-300 text-sm flex items-center justify-center">
                    <Radio size={16} className="animate-pulse" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping inline-block" />
                    <span>Transmisión en Tiempo Real</span>
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  Registro en Vivo • Todos los Medios
                </h3>
                <p className="text-xs text-rose-100/90 max-w-2xl leading-relaxed">
                  Lista en vivo y en orden cronológico estricto del <strong>más nuevo al más viejo</strong> de todas las personas registradas desde cualquier canal: Portal Público Web, Formulario de Reconocimiento, Diplomado y Cargas Drive/CSV.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2.5 rounded-2xl bg-white text-stone-950 font-black text-xs transition shadow-md hover:bg-stone-100 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Nuevo Registro Manual</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDriveImportTarget("solicitudes");
                    setShowDriveImportModal(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-rose-500/30 hover:bg-rose-500/40 border border-rose-400/30 text-white font-black text-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Database size={14} />
                  <span>Subir BD de Drive</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filtros Rápidos de la Lista en Vivo */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Buscador */}
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={liveSearchQuery}
                  onChange={(e) => setLiveSearchQuery(e.target.value)}
                  placeholder="Buscar en vivo por nombre, teléfono, correo, diplomado o zona..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              {/* Filtro de Año */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-500">Generación:</span>
                <select
                  value={liveYearFilter}
                  onChange={(e) => setLiveYearFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  <option value="todos">Todos los Años</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                </select>
              </div>
            </div>

            {/* Canal Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                Medio de Registro:
              </span>
              {[
                { key: "todos", label: "Todos los Medios", count: liveRecordsList.length },
                { key: "web", label: "🌐 Portal Web", count: liveRecordsList.filter((r) => r.sourceChannel === "Portal Público Web").length },
                { key: "diplomado", label: "🎓 Diplomado", count: liveRecordsList.filter((r) => r.sourceChannel === "Diplomado Liderazgo").length },
                { key: "interno", label: "✍️ Registro Manual", count: liveRecordsList.filter((r) => r.sourceChannel === "Registro Manual").length },
                { key: "drive", label: "📊 Importación Drive/CSV", count: liveRecordsList.filter((r) => r.sourceChannel === "Importación Drive/CSV").length },
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setLiveChannelFilter(btn.key)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    liveChannelFilter === btn.key
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
                  }`}
                >
                  <span>{btn.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${liveChannelFilter === btn.key ? "bg-white/20 text-white" : "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300"}`}>
                    {btn.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Registros en Vivo */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-md overflow-hidden">
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-stone-500">
                  Secuencia Cronológica en Vivo (Más Nuevo ➔ Más Viejo)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                  {filteredLiveRecords.length} registros
                </span>
              </div>
              <span className="text-[11px] text-stone-400">
                ⚡ Sincronización continua de Firestore
              </span>
            </div>

            {filteredLiveRecords.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <p className="text-sm font-bold text-stone-500">No hay registros que coincidan con los filtros seleccionados.</p>
                <button
                  type="button"
                  onClick={() => {
                    setLiveChannelFilter("todos");
                    setLiveSearchQuery("");
                    setLiveYearFilter("todos");
                  }}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-850 text-stone-500 dark:text-stone-400 font-extrabold uppercase tracking-wider border-b border-stone-200 dark:border-stone-800 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Hora & Medio de Registro</th>
                      <th className="py-3 px-4">Solicitante / Participante</th>
                      <th className="py-3 px-4">Diplomado & Gen</th>
                      <th className="py-3 px-2 text-center" title="¿Ya se elaboró el reconocimiento digital (aunque no se haya enviado)?">Rec. Dig.</th>
                      <th className="py-3 px-2 text-center" title="Pago Confirmado">Pago</th>
                      <th className="py-3 px-2 text-center" title="Cuadernillos">Cuad.</th>
                      <th className="py-3 px-2 text-center" title="Audio">Audio</th>
                      <th className="py-3 px-2 text-center" title="Digital">Digital</th>
                      <th className="py-3 px-2 text-center" title="Impreso">Impreso</th>
                      <th className="py-3 px-2 text-center" title="Entregado">Entregado</th>
                      <th className="py-3 px-3 text-center">Google Drive</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80 font-medium">
                    {filteredLiveRecords.map((r, idx) => (
                      <tr
                        key={r.id + "-live-" + idx}
                        className="hover:bg-rose-50/20 dark:hover:bg-rose-950/10 transition group"
                      >
                        {/* Hora y Medio */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className="font-mono text-[11px] font-bold text-stone-700 dark:text-stone-300 block">
                              {r.timeLabel}
                            </span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${r.sourceBadgeColor}`}>
                              {r.sourceChannel}
                            </span>
                          </div>
                        </td>

                        {/* Solicitante */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-stone-900 dark:text-stone-100 text-xs">
                                {r.nombre}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 font-bold">
                                {r.rol}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                              {r.telefono && (
                                <span className="font-mono font-bold text-stone-700 dark:text-stone-300">
                                  📱 {r.telefono}
                                </span>
                              )}
                              {r.zona && <span>Zona {r.zona}</span>}
                              {r.grupo && <span>• {r.grupo}</span>}
                            </div>
                          </div>
                        </td>

                        {/* Diplomado */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span className="font-bold text-stone-800 dark:text-stone-200 block text-xs">
                              {r.diplomado}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
                              <span>Gen. {r.year}</span>
                              <span>•</span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {r.tipoImpresion} (${r.costo})
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Check Operativo: Reconocimiento Digital Elaborado (Antes de Pago) */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            aria-label="Seguimiento Operativo: Reconocimiento digital"
                            onClick={() => handleToggleStatus(r, "elaboradoDigital")}
                            className={`p-1.5 rounded-lg border text-xs font-bold shadow-2xs btn-seguimiento-operativo-scale cursor-pointer ${
                              animatingBtnKey === `${r.id}-elaboradoDigital`
                                ? "animate-scale-feedback ring-2 ring-cyan-400 shadow-md"
                                : ""
                            } ${
                              r.elaboradoDigital
                                ? "bg-cyan-600 border-cyan-700 text-white shadow-cyan-500/20"
                                : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400 hover:border-cyan-400"
                            }`}
                            title={
                              r.elaboradoDigital
                                ? "Seguimiento Operativo: Reconocimiento digital elaborado / listo (Clic para desmarcar)"
                                : "Seguimiento Operativo: Pendiente de elaborar reconocimiento digital (Clic para marcar como hecho)"
                            }
                          >
                            <FileBadge size={13} />
                          </button>
                        </td>

                        {/* Checks Operativos */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            aria-label="Seguimiento Operativo: Pago"
                            onClick={() => handleToggleStatus(r, "pagado")}
                            className={`p-1.5 rounded-lg border text-xs font-bold shadow-2xs btn-seguimiento-operativo-scale cursor-pointer ${
                              animatingBtnKey === `${r.id}-pagado`
                                ? "animate-scale-feedback ring-2 ring-emerald-400 shadow-md"
                                : ""
                            } ${
                              r.pagado
                                ? "bg-emerald-500 border-emerald-600 text-white"
                                : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400"
                            }`}
                            title={r.pagado ? "Pagado" : "Pendiente de pago"}
                          >
                            <DollarSign size={13} />
                          </button>
                        </td>

                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            aria-label="Seguimiento Operativo: Cuadernillos"
                            onClick={() => handleToggleStatus(r, "cuadernillos")}
                            className={`p-1.5 rounded-lg border text-xs font-bold shadow-2xs btn-seguimiento-operativo-scale cursor-pointer ${
                              animatingBtnKey === `${r.id}-cuadernillos`
                                ? "animate-scale-feedback ring-2 ring-blue-400 shadow-md"
                                : ""
                            } ${
                              r.cuadernillos
                                ? "bg-blue-600 border-blue-700 text-white"
                                : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400"
                            }`}
                            title={r.cuadernillos ? "Cuadernillos OK" : "Pendiente"}
                          >
                            <BookOpen size={13} />
                          </button>
                        </td>

                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            aria-label="Seguimiento Operativo: Audio"
                            onClick={() => handleToggleStatus(r, "audio")}
                            className={`p-1.5 rounded-lg border text-xs font-bold shadow-2xs btn-seguimiento-operativo-scale cursor-pointer ${
                              animatingBtnKey === `${r.id}-audio`
                                ? "animate-scale-feedback ring-2 ring-amber-400 shadow-md"
                                : ""
                            } ${
                              r.audio
                                ? "bg-amber-500 border-amber-600 text-stone-950 font-black"
                                : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400"
                            }`}
                            title={r.audio ? "Audio OK" : "Pendiente"}
                          >
                            <Mic size={13} />
                          </button>
                        </td>

                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            aria-label="Seguimiento Operativo: Digital"
                            onClick={() => handleToggleStatus(r, "digital")}
                            className={`p-1.5 rounded-lg border text-xs font-bold shadow-2xs btn-seguimiento-operativo-scale cursor-pointer ${
                              animatingBtnKey === `${r.id}-digital`
                                ? "animate-scale-feedback ring-2 ring-indigo-400 shadow-md"
                                : ""
                            } ${
                              r.digital
                                ? "bg-indigo-600 border-indigo-700 text-white"
                                : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400"
                            }`}
                            title={r.digital ? "Digital OK" : "Pendiente"}
                          >
                            <Send size={13} />
                          </button>
                        </td>

                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            aria-label="Seguimiento Operativo: Impreso"
                            onClick={() => handleToggleStatus(r, "impreso")}
                            className={`p-1.5 rounded-lg border text-xs font-bold shadow-2xs btn-seguimiento-operativo-scale cursor-pointer ${
                              animatingBtnKey === `${r.id}-impreso`
                                ? "animate-scale-feedback ring-2 ring-emerald-400 shadow-md"
                                : ""
                            } ${
                              r.impreso
                                ? "bg-emerald-600 border-emerald-700 text-white"
                                : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400"
                            }`}
                            title={r.impreso ? "Ya Impreso" : "Pendiente de imprimir"}
                          >
                            <Printer size={13} />
                          </button>
                        </td>

                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            aria-label="Seguimiento Operativo: Entregado"
                            onClick={() => handleToggleStatus(r, "entregado")}
                            className={`p-1.5 rounded-lg border text-xs font-bold shadow-2xs btn-seguimiento-operativo-scale cursor-pointer ${
                              animatingBtnKey === `${r.id}-entregado`
                                ? "animate-scale-feedback ring-2 ring-purple-400 shadow-md"
                                : ""
                            } ${
                              r.entregado
                                ? "bg-purple-600 border-purple-700 text-white"
                                : "bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-400"
                            }`}
                            title={r.entregado ? "Entregado" : "Pendiente de entrega"}
                          >
                            <PackageCheck size={13} />
                          </button>
                        </td>

                        {/* Drive Button */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {r.driveUrl ? (
                            <a
                              href={r.driveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] border border-indigo-200 transition"
                              title="Abrir en Google Drive"
                            >
                              <ExternalLink size={12} />
                              <span>Ver Drive</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDriveModalRecord(r);
                                setEditDriveUrl("");
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-500 font-bold text-[10px] transition"
                              title="Asignar enlace de Drive"
                            >
                              <Link2 size={12} />
                              <span>+ Enlazar</span>
                            </button>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp Composer con plantillas */}
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsAppComposer(r)}
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
                              title="Enviar mensaje personalizado por WhatsApp (con plantillas)"
                            >
                              <MessageCircle size={14} />
                            </button>

                            {/* Modificar Manualmente */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditRecord(r)}
                              className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 hover:bg-amber-100 transition shadow-2xs cursor-pointer"
                              title="Modificar datos del participante manualmente"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* Eliminar */}
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(r)}
                              className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Eliminar registro"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA: ALUMNOS Y PARTICIPANTES PENDIENTES (SOLO INTERNO) */}
      {activeView === "pendientes" && (
        <AlumnosPendientesSection
          onPromoteToReconocimiento={handlePromoteAlumno}
          onOpenDriveImport={() => {
            setDriveImportTarget("alumnos");
            setShowDriveImportModal(true);
            playChime("tick");
          }}
        />
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
                  onClick={() => {
                    setDriveImportTarget("historial");
                    setShowDriveImportModal(true);
                    playChime("tick");
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white font-black text-xs transition flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
                  title="Subir base de datos histórica desde Google Drive"
                >
                  <Database size={14} />
                  <span>Subir BD Historial</span>
                </button>

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
                                className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition cursor-pointer"
                                title="Editar enlace de Google Drive"
                              >
                                <Link2 size={14} />
                              </button>

                              {/* Modificar Manualmente */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditRecord(r)}
                                className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 transition cursor-pointer"
                                title="Modificar datos del participante manualmente"
                              >
                                <Edit2 size={14} />
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

      {/* MODAL PARA SUBIR BASES DE DATOS DESDE GOOGLE DRIVE / ARCHIVOS */}
      <DriveDatabaseImportModal
        isOpen={showDriveImportModal}
        onClose={() => setShowDriveImportModal(false)}
        initialTarget={driveImportTarget}
        existingAlumnos={alumnosList}
        existingRecords={records}
        onImportAlumnosSuccess={(newAlumnos) => {
          setAlumnosList((prev) => [...prev, ...newAlumnos]);
          setPendientesCount((prev) => prev + newAlumnos.length);
        }}
        onImportReconocimientosSuccess={(newRecs) => {
          setRecords((prev) => [...newRecs, ...prev]);
        }}
      />

      {/* MODAL REDACTOR DE WHATSAPP CON PLANTILLAS PERSONALIZADAS (PONER, QUITAR, EDITAR) */}
      <WhatsAppComposerModal
        isOpen={showWhatsappComposerModal}
        onClose={() => setShowWhatsappComposerModal(false)}
        recipient={whatsappRecipientData}
      />

      {/* MODAL PARA MODIFICAR MANUALMENTE DATOS DEL SOLICITANTE / RECONOCIMIENTO */}
      <ReconocimientoFormModal
        isOpen={showEditRecordModal}
        onClose={() => {
          setShowEditRecordModal(false);
          setEditingRecordData(null);
        }}
        initialData={editingRecordData}
        onUpdated={(updated) => {
          setRecords((prev) =>
            prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
          );
        }}
      />

    </div>
  );
}
