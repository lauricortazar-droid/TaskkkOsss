import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCheck,
  Phone,
  Mail,
  MessageCircle,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Award,
  Download,
  Sparkles,
  Clock,
  ArrowRight,
  Send,
  RefreshCw,
  AlertCircle,
  Calendar,
  Building2,
  ChevronDown,
  X,
  Smartphone,
  Database,
} from "lucide-react";
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { playChime } from "../utils/audio";
import { SPIN_PAYMENT_INFO } from "./ReconocimientosOS";

export interface AlumnoPendiente {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  estatus: "Admitido" | "Pendiente de Pago" | "Documentación Pendiente" | "En Revisión" | "Confirmado" | string;
  casa: string;
  generacion: string;
  rol: string;
  notas?: string;
  fechaRegistro?: string;
  contactadoWhatsApp?: boolean;
  ultimoMensajeWhatsApp?: string;
  ultimoContactoAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const INITIAL_ALUMNOS_PENDIENTES: AlumnoPendiente[] = [
  {
    id: "pend-edgar-batun-2026",
    nombre: "Edgar Jose Batun Alpuche",
    email: "batunedgar343@gmail.com",
    telefono: "3121148077",
    estatus: "Admitido",
    casa: "Gladiadores Casa Martha Sangerman",
    generacion: "Generación 2026",
    rol: "Participante",
    notas: "Participante admitido - Generación 2026. Requiere seguimiento de trámite y comprobante.",
    fechaRegistro: "2026-10-06",
    contactadoWhatsApp: false,
    createdAt: new Date().toISOString(),
  },
];

const STORAGE_KEY = "reconocimientos_alumnos_pendientes_v1";

const ESTATUS_OPTIONS = [
  { label: "Admitido", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" },
  { label: "Pendiente de Pago", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700" },
  { label: "Documentación Pendiente", color: "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-700" },
  { label: "En Revisión", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-700" },
  { label: "Confirmado", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700" },
];

const CASAS_SUGERIDAS = [
  "Gladiadores Casa Martha Sangerman",
  "Gladiadores Casa Jaguar",
  "Gladiadores Casa Tiburón",
  "Gladiadores Casa Colibrí",
  "Gladiadores Casa Delfín",
  "Gladiadores Casa Águila",
  "Teocalli (Centros)",
];

const GENERACIONES_SUGERIDAS = [
  "Generación 2026",
  "Generación 2025",
  "Generación 2024",
  "Generación 2023",
  "Generación 2022",
];

const ROLES_SUGERIDOS = [
  "Participante",
  "Líder",
  "Sublíder",
  "Director centro",
  "OSG",
  "Staff",
  "Invitado",
];

interface AlumnosPendientesSectionProps {
  onPromoteToReconocimiento?: (alumno: AlumnoPendiente) => void;
  onOpenDriveImport?: () => void;
}

export default function AlumnosPendientesSection({
  onPromoteToReconocimiento,
  onOpenDriveImport,
}: AlumnosPendientesSectionProps) {
  const [alumnos, setAlumnos] = useState<AlumnoPendiente[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure Edgar Jose Batun Alpuche exists in the list
          const hasEdgar = parsed.some(
            (p: AlumnoPendiente) =>
              (p.nombre || "").toLowerCase().includes("batun") ||
              p.email === "batunedgar343@gmail.com"
          );
          if (!hasEdgar) {
            return [...INITIAL_ALUMNOS_PENDIENTES, ...parsed];
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error reading alumnos pendientes from localStorage", e);
    }
    return INITIAL_ALUMNOS_PENDIENTES;
  });

  const [search, setSearch] = useState("");
  const [selectedEstatus, setSelectedEstatus] = useState("todos");
  const [selectedCasa, setSelectedCasa] = useState("todos");
  const [selectedGeneracion, setSelectedGeneracion] = useState("todos");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal para Enviar Mensaje Personal por WhatsApp
  const [whatsappModalAlumno, setWhatsappModalAlumno] = useState<AlumnoPendiente | null>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState<"bienvenida" | "pago" | "cuadernillos" | "personalizado">("bienvenida");
  const [customWhatsappMessage, setCustomWhatsappMessage] = useState("");
  const [phonePrefix, setPhonePrefix] = useState<"52" | "none">("52");

  // Modal para Agregar / Editar Alumno Pendiente
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAlumnoId, setEditingAlumnoId] = useState<string | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formEstatus, setFormEstatus] = useState("Admitido");
  const [formCasa, setFormCasa] = useState("Gladiadores Casa Martha Sangerman");
  const [formGeneracion, setFormGeneracion] = useState("Generación 2026");
  const [formRol, setFormRol] = useState("Participante");
  const [formNotas, setFormNotas] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alumnos));
    } catch (e) {
      console.error("Failed to save alumnos pendientes", e);
    }
  }, [alumnos]);

  // Sync with Firestore (collection: alumnos_pendientes)
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, "alumnos_pendientes"),
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteList: AlumnoPendiente[] = [];
            snapshot.forEach((docSnap) => {
              remoteList.push({ ...(docSnap.data() as AlumnoPendiente), id: docSnap.id });
            });

            // Ensure initial Edgar Batun is merged if not present
            const hasEdgar = remoteList.some(
              (p) =>
                (p.nombre || "").toLowerCase().includes("batun") ||
                p.email === "batunedgar343@gmail.com"
            );
            const combined = hasEdgar ? remoteList : [...INITIAL_ALUMNOS_PENDIENTES, ...remoteList];

            // Deduplicate by id or email
            const unique = new Map<string, AlumnoPendiente>();
            combined.forEach((item) => {
              const key = item.id || item.email || item.nombre;
              unique.set(key, item);
            });

            setAlumnos(Array.from(unique.values()));
          } else {
            // Seed initial record to Firestore if collection is empty
            INITIAL_ALUMNOS_PENDIENTES.forEach(async (initItem) => {
              try {
                await setDoc(doc(db, "alumnos_pendientes", initItem.id), initItem);
              } catch (err) {
                // Ignore silent seed error
              }
            });
          }
        },
        (error) => {
          console.warn("Firestore alumnos_pendientes snapshot listener warning:", error.message);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn("Firestore subscription error", e);
    }
  }, []);

  // Format WhatsApp Link
  const formatWhatsAppNumber = (phone: string, prefix: "52" | "none" = "52") => {
    let clean = phone.replace(/[^0-9]/g, "");
    if (prefix === "52") {
      if (clean.startsWith("52") && clean.length >= 12) {
        return clean;
      }
      if (clean.length === 10) {
        return `52${clean}`;
      }
    }
    return clean;
  };

  // Helper to open WhatsApp modal
  const handleOpenWhatsAppModal = (alumno: AlumnoPendiente) => {
    setWhatsappModalAlumno(alumno);
    setWhatsappTemplate("bienvenida");
    const defaultMsg = getTemplateMessage("bienvenida", alumno);
    setCustomWhatsappMessage(defaultMsg);
    playChime("tick");
  };

  // Build template messages
  const getTemplateMessage = (
    template: "bienvenida" | "pago" | "cuadernillos" | "personalizado",
    alumno: AlumnoPendiente
  ) => {
    switch (template) {
      case "bienvenida":
        return `¡Hola ${alumno.nombre}! Te saludamos con mucho gusto de ${alumno.casa}. Te confirmamos que tu estatus es ADMITIDO para la ${alumno.generacion} como ${alumno.rol}. ¿Cómo estás? Me comunico contigo para darte una cálida bienvenida y coordinar los detalles pendientes de tu reconocimiento y trámite.`;
      case "pago":
        return `Hola ${alumno.nombre}, te saludamos de ${alumno.casa} (${alumno.generacion}). Te compartimos los datos oficiales para el trámite de tu reconocimiento/diploma:\n\n💳 SPIN by OXXO: ${SPIN_PAYMENT_INFO.tarjeta}\n🏦 CLABE: ${SPIN_PAYMENT_INFO.clabe}\n👤 A nombre de: ${SPIN_PAYMENT_INFO.titular}\n🏪 Código OXXO: ${SPIN_PAYMENT_INFO.codigoOxxo}\n\nUna vez realizado, por favor envíanos tu comprobante por este medio. ¡Muchas gracias!`;
      case "cuadernillos":
        return `Hola ${alumno.nombre}, esperamos te encuentres muy bien. Te contactamos de ${alumno.casa} (${alumno.generacion}) para solicitarte el envío de tus cuadernillos y confirmación de audio para proceder con la elaboración de tu reconocimiento oficial. Quedamos atentos a tus comentarios.`;
      case "personalizado":
        return `Hola ${alumno.nombre}, te saludo de ${alumno.casa} (${alumno.generacion}). `;
    }
  };

  // Change active template in modal
  const handleSelectTemplate = (template: "bienvenida" | "pago" | "cuadernillos" | "personalizado") => {
    setWhatsappTemplate(template);
    if (whatsappModalAlumno) {
      setCustomWhatsappMessage(getTemplateMessage(template, whatsappModalAlumno));
    }
  };

  // Send WhatsApp Action
  const handleSendWhatsApp = async () => {
    if (!whatsappModalAlumno) return;

    const formattedNum = formatWhatsAppNumber(whatsappModalAlumno.telefono, phonePrefix);
    const textEncoded = encodeURIComponent(customWhatsappMessage.trim());
    const waUrl = `https://wa.me/${formattedNum}?text=${textEncoded}`;

    // Mark as contacted in state & firestore
    const updatedAlumno: AlumnoPendiente = {
      ...whatsappModalAlumno,
      contactadoWhatsApp: true,
      ultimoContactoAt: new Date().toISOString(),
      ultimoMensajeWhatsApp: customWhatsappMessage.trim(),
    };

    setAlumnos((prev) =>
      prev.map((a) => (a.id === updatedAlumno.id ? updatedAlumno : a))
    );

    try {
      await updateDoc(doc(db, "alumnos_pendientes", updatedAlumno.id), {
        contactadoWhatsApp: true,
        ultimoContactoAt: updatedAlumno.ultimoContactoAt,
        ultimoMensajeWhatsApp: updatedAlumno.ultimoMensajeWhatsApp,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      // offline fallback handled by state
    }

    playChime("success");
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setWhatsappModalAlumno(null);
  };

  // Quick Direct WhatsApp Launch
  const handleQuickWhatsApp = (alumno: AlumnoPendiente) => {
    const formattedNum = formatWhatsAppNumber(alumno.telefono, "52");
    const msg = encodeURIComponent(
      `¡Hola ${alumno.nombre}! Te saludamos de ${alumno.casa} (${alumno.generacion}). Te confirmamos que tu estatus es ${alumno.estatus} como ${alumno.rol}. ¿Cómo estás? Te escribimos para coordinar tus trámites pendientes.`
    );
    window.open(`https://wa.me/${formattedNum}?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  // Copy helper
  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    playChime("tick");
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Open Form Modal for Create
  const handleOpenCreateModal = () => {
    setEditingAlumnoId(null);
    setFormNombre("");
    setFormEmail("");
    setFormTelefono("");
    setFormEstatus("Admitido");
    setFormCasa("Gladiadores Casa Martha Sangerman");
    setFormGeneracion("Generación 2026");
    setFormRol("Participante");
    setFormNotas("");
    setShowFormModal(true);
    playChime("tick");
  };

  // Open Form Modal for Edit
  const handleOpenEditModal = (alumno: AlumnoPendiente) => {
    setEditingAlumnoId(alumno.id);
    setFormNombre(alumno.nombre);
    setFormEmail(alumno.email);
    setFormTelefono(alumno.telefono);
    setFormEstatus(alumno.estatus);
    setFormCasa(alumno.casa);
    setFormGeneracion(alumno.generacion);
    setFormRol(alumno.rol);
    setFormNotas(alumno.notas || "");
    setShowFormModal(true);
    playChime("tick");
  };

  // Save Alumno (Create or Update)
  const handleSaveAlumno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) return;

    setIsSaving(true);
    const newId = editingAlumnoId || `pend-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const alumnoData: AlumnoPendiente = {
      id: newId,
      nombre: formNombre.trim(),
      email: formEmail.trim(),
      telefono: formTelefono.trim(),
      estatus: formEstatus.trim() || "Admitido",
      casa: formCasa.trim() || "Gladiadores Casa Martha Sangerman",
      generacion: formGeneracion.trim() || "Generación 2026",
      rol: formRol.trim() || "Participante",
      notas: formNotas.trim(),
      fechaRegistro: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString(),
    };

    if (!editingAlumnoId) {
      alumnoData.createdAt = new Date().toISOString();
      alumnoData.contactadoWhatsApp = false;
    } else {
      const existing = alumnos.find((a) => a.id === editingAlumnoId);
      if (existing) {
        alumnoData.contactadoWhatsApp = existing.contactadoWhatsApp;
        alumnoData.ultimoContactoAt = existing.ultimoContactoAt;
        alumnoData.ultimoMensajeWhatsApp = existing.ultimoMensajeWhatsApp;
        alumnoData.createdAt = existing.createdAt || new Date().toISOString();
      }
    }

    setAlumnos((prev) => {
      const idx = prev.findIndex((a) => a.id === newId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = alumnoData;
        return copy;
      }
      return [alumnoData, ...prev];
    });

    try {
      await setDoc(doc(db, "alumnos_pendientes", newId), alumnoData);
    } catch (err) {
      console.warn("Could not save to firestore, saved locally", err);
    }

    setIsSaving(false);
    setShowFormModal(false);
    playChime("success");
  };

  // Quick Change Status
  const handleChangeStatus = async (id: string, newEstatus: string) => {
    setAlumnos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, estatus: newEstatus, updatedAt: new Date().toISOString() } : a))
    );
    try {
      await updateDoc(doc(db, "alumnos_pendientes", id), {
        estatus: newEstatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      // offline handled
    }
    playChime("tick");
  };

  // Delete Alumno
  const handleDeleteAlumno = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar a "${nombre}" de la lista de pendientes?`)) {
      return;
    }
    setAlumnos((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteDoc(doc(db, "alumnos_pendientes", id));
    } catch (err) {
      // offline handled
    }
    playChime("tick");
  };

  // Filtered List
  const filteredAlumnos = useMemo(() => {
    return alumnos.filter((alumno) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        alumno.nombre.toLowerCase().includes(q) ||
        alumno.email.toLowerCase().includes(q) ||
        alumno.telefono.toLowerCase().includes(q) ||
        alumno.casa.toLowerCase().includes(q) ||
        alumno.generacion.toLowerCase().includes(q) ||
        alumno.rol.toLowerCase().includes(q) ||
        (alumno.notas && alumno.notas.toLowerCase().includes(q));

      const matchEstatus = selectedEstatus === "todos" || alumno.estatus === selectedEstatus;
      const matchCasa = selectedCasa === "todos" || alumno.casa === selectedCasa;
      const matchGen = selectedGeneracion === "todos" || alumno.generacion === selectedGeneracion;

      return matchSearch && matchEstatus && matchCasa && matchGen;
    });
  }, [alumnos, search, selectedEstatus, selectedCasa, selectedGeneracion]);

  // Unique lists for filter dropdowns
  const uniqueCasas = useMemo(() => {
    const set = new Set<string>();
    alumnos.forEach((a) => {
      if (a.casa) set.add(a.casa);
    });
    return Array.from(set);
  }, [alumnos]);

  const uniqueGeneraciones = useMemo(() => {
    const set = new Set<string>();
    alumnos.forEach((a) => {
      if (a.generacion) set.add(a.generacion);
    });
    return Array.from(set);
  }, [alumnos]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Nombre", "Email", "WhatsApp", "Estatus", "Casa", "Generación", "Rol", "Contactado WhatsApp", "Notas", "Fecha Registro"];
    const rows = filteredAlumnos.map((a) => [
      `"${a.nombre.replace(/"/g, '""')}"`,
      `"${a.email.replace(/"/g, '""')}"`,
      `"${a.telefono.replace(/"/g, '""')}"`,
      `"${a.estatus.replace(/"/g, '""')}"`,
      `"${a.casa.replace(/"/g, '""')}"`,
      `"${a.generacion.replace(/"/g, '""')}"`,
      `"${a.rol.replace(/"/g, '""')}"`,
      a.contactadoWhatsApp ? "Sí" : "No",
      `"${(a.notas || "").replace(/"/g, '""')}"`,
      `"${a.fechaRegistro || ""}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Alumnos_Pendientes_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playChime("success");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER BANNER */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-amber-600 via-amber-700 to-indigo-900 text-white shadow-xl relative overflow-hidden border border-amber-400/30">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-white/20 backdrop-blur-md text-white text-base">
                ⏳
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/30 text-amber-100 border border-amber-300/40">
                Portal Interno • Candidatos y Alumnos Pendientes
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Control de Alumnos y Participantes Pendientes
            </h2>
            <p className="text-xs sm:text-sm text-amber-100/90 max-w-2xl leading-relaxed">
              Registra alumnos admitidos, pendientes de pago o trámite. Envía mensajes personalizados por WhatsApp con un solo clic.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {onOpenDriveImport && (
              <button
                type="button"
                onClick={() => {
                  onOpenDriveImport();
                  playChime("tick");
                }}
                className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-black text-xs transition border border-white/30 flex items-center gap-2 active:scale-95 cursor-pointer backdrop-blur-sm shadow-xs"
                title="Subir base de datos de alumnos desde Google Drive o archivos"
              >
                <Database size={15} />
                <span>Subir BD de Drive</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition border border-white/20 flex items-center gap-2 active:scale-95 cursor-pointer backdrop-blur-sm"
              title="Descargar listado en formato CSV"
            >
              <Download size={14} />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 rounded-2xl bg-white text-stone-900 hover:bg-amber-50 font-black text-xs transition shadow-lg flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Plus size={16} className="text-amber-600" />
              <span>Registrar Pendiente</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-bold flex items-center justify-between">
            <span>Total Pendientes</span>
            <Users size={16} className="text-amber-600" />
          </span>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100">
            {alumnos.length}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">Registrados en seguimiento</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-bold flex items-center justify-between">
            <span>Admitidos</span>
            <UserCheck size={16} className="text-emerald-600" />
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {alumnos.filter((a) => a.estatus === "Admitido").length}
          </div>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 font-medium">Estatus Admitido</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-bold flex items-center justify-between">
            <span>Contactados WhatsApp</span>
            <MessageCircle size={16} className="text-emerald-500" />
          </span>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100">
            {alumnos.filter((a) => a.contactadoWhatsApp).length}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">Con mensaje enviado</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-1">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-bold flex items-center justify-between">
            <span>Casa Destacada</span>
            <Building2 size={16} className="text-indigo-600" />
          </span>
          <div className="text-sm font-black text-indigo-700 dark:text-indigo-300 truncate" title="Gladiadores Casa Martha Sangerman">
            Gladiadores Sangerman
          </div>
          <span className="text-[10px] text-stone-400 font-medium">Generación 2026</span>
        </div>
      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email, teléfono, casa o generación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 placeholder:font-normal focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Filtros Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Estatus */}
            <select
              value={selectedEstatus}
              onChange={(e) => setSelectedEstatus(e.target.value)}
              className="px-3 py-2 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-800 dark:text-stone-200 cursor-pointer"
            >
              <option value="todos">Todos los Estatus</option>
              {ESTATUS_OPTIONS.map((est) => (
                <option key={est.label} value={est.label}>
                  {est.label}
                </option>
              ))}
            </select>

            {/* Casa */}
            <select
              value={selectedCasa}
              onChange={(e) => setSelectedCasa(e.target.value)}
              className="px-3 py-2 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-800 dark:text-stone-200 cursor-pointer"
            >
              <option value="todos">Todas las Casas</option>
              {uniqueCasas.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Generación */}
            <select
              value={selectedGeneracion}
              onChange={(e) => setSelectedGeneracion(e.target.value)}
              className="px-3 py-2 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-800 dark:text-stone-200 cursor-pointer"
            >
              <option value="todos">Todas las Generaciones</option>
              {uniqueGeneraciones.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            {(search || selectedEstatus !== "todos" || selectedCasa !== "todos" || selectedGeneracion !== "todos") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedEstatus("todos");
                  setSelectedCasa("todos");
                  setSelectedGeneracion("todos");
                }}
                className="px-3 py-2 rounded-2xl bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold hover:bg-stone-300 dark:hover:bg-stone-600 transition"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE ALUMNOS PENDIENTES */}
      <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-md overflow-hidden">
        {filteredAlumnos.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <Users size={28} />
            </div>
            <h3 className="text-base font-black text-stone-800 dark:text-stone-200">
              No se encontraron alumnos pendientes
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              {search || selectedEstatus !== "todos"
                ? "No hay resultados que coincidan con los filtros aplicados."
                : "Agrega a los alumnos admitidos o pendientes de trámite para darles seguimiento y enviarles WhatsApp."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition"
              >
                + Registrar Primer Alumno Pendiente
              </button>
              {onOpenDriveImport && (
                <button
                  type="button"
                  onClick={onOpenDriveImport}
                  className="px-4 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition border border-stone-300 dark:border-stone-700 flex items-center gap-1.5"
                >
                  <Database size={13} />
                  <span>Subir BD desde Drive</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-800/50 text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  <th className="py-3.5 px-4">Alumno y Datos de Contacto</th>
                  <th className="py-3.5 px-4">Casa / Agrupación</th>
                  <th className="py-3.5 px-4">Generación y Rol</th>
                  <th className="py-3.5 px-4">Estatus</th>
                  <th className="py-3.5 px-4 text-center">WhatsApp Personal</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 text-xs">
                {filteredAlumnos.map((alumno) => {
                  const estatusCfg =
                    ESTATUS_OPTIONS.find((e) => e.label === alumno.estatus) || {
                      color: "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border-stone-300",
                    };

                  return (
                    <tr
                      key={alumno.id}
                      className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors group"
                    >
                      {/* Alumno y contacto */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-stone-900 dark:text-stone-100">
                              {alumno.nombre}
                            </span>
                            {alumno.id === "pend-edgar-batun-2026" && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Registro Solicitado
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400">
                            {/* Email */}
                            <div className="flex items-center gap-1">
                              <Mail size={12} className="text-stone-400" />
                              <a
                                href={`mailto:${alumno.email}`}
                                className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline font-medium"
                              >
                                {alumno.email}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopy(alumno.email, `email-${alumno.id}`)}
                                className="p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded"
                                title="Copiar correo"
                              >
                                {copiedField === `email-${alumno.id}` ? (
                                  <Check size={11} className="text-emerald-500" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            </div>

                            {/* Teléfono */}
                            <div className="flex items-center gap-1 font-mono font-bold text-stone-700 dark:text-stone-300">
                              <Phone size={12} className="text-emerald-500" />
                              <span>{alumno.telefono}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(alumno.telefono, `tel-${alumno.id}`)}
                                className="p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded"
                                title="Copiar teléfono"
                              >
                                {copiedField === `tel-${alumno.id}` ? (
                                  <Check size={11} className="text-emerald-500" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            </div>
                          </div>

                          {alumno.notas && (
                            <p className="text-[11px] text-stone-500 italic max-w-sm">
                              "{alumno.notas}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Casa */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200">
                          <Building2 size={14} className="text-amber-600 shrink-0" />
                          <span>{alumno.casa}</span>
                        </div>
                      </td>

                      {/* Generación y Rol */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200">
                            <Calendar size={13} className="text-stone-400 shrink-0" />
                            <span>{alumno.generacion}</span>
                          </div>
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {alumno.rol}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Estatus con dropdown rápido */}
                      <td className="py-4 px-4">
                        <div className="relative inline-block">
                          <select
                            value={alumno.estatus}
                            onChange={(e) => handleChangeStatus(alumno.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-black border transition cursor-pointer appearance-none pr-6 ${estatusCfg.color}`}
                          >
                            {ESTATUS_OPTIONS.map((opt) => (
                              <option key={opt.label} value={opt.label}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={12}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
                          />
                        </div>
                      </td>

                      {/* WhatsApp Personal (Acción Principal del Requerimiento) */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsAppModal(alumno)}
                            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-md hover:shadow-emerald-600/20 flex items-center gap-2 active:scale-95 cursor-pointer"
                            title={`Mandar mensaje personal por WhatsApp a ${alumno.nombre}`}
                          >
                            <MessageCircle size={15} />
                            <span>Mandar WhatsApp</span>
                          </button>

                          {alumno.contactadoWhatsApp ? (
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <Check size={11} /> Contactado
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-400">
                              Pendiente de contacto
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Promover a Reconocimiento Oficial */}
                          {onPromoteToReconocimiento && (
                            <button
                              type="button"
                              onClick={() => {
                                onPromoteToReconocimiento(alumno);
                                playChime("success");
                              }}
                              className="p-2 text-stone-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition cursor-pointer"
                              title="Promover a Reconocimiento Oficial en Seguimiento Operativo"
                            >
                              <Award size={15} />
                            </button>
                          )}

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(alumno)}
                            className="p-2 text-stone-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-xl transition cursor-pointer"
                            title="Editar datos del alumno"
                          >
                            <Edit2 size={15} />
                          </button>

                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={() => handleDeleteAlumno(alumno.id, alumno.nombre)}
                            className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition cursor-pointer"
                            title="Eliminar de la lista de pendientes"
                          >
                            <Trash2 size={15} />
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

      {/* MODAL: MANDAR MENSAJE PERSONAL POR WHATSAPP */}
      {whatsappModalAlumno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageCircle size={26} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                    Enviar Mensaje Personal por WhatsApp
                  </h3>
                  <p className="text-xs text-stone-500">
                    Para: <strong className="text-stone-800 dark:text-stone-200">{whatsappModalAlumno.nombre}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappModalAlumno(null)}
                className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Recipient Details Pill */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-stone-700 dark:text-stone-300">
                  {whatsappModalAlumno.casa} • {whatsappModalAlumno.generacion}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {whatsappModalAlumno.estatus} • {whatsappModalAlumno.rol}
                </span>
              </div>
              <div className="flex items-center gap-3 text-stone-500">
                <span>📱 Teléfono: <strong className="font-mono text-stone-800 dark:text-stone-200">{whatsappModalAlumno.telefono}</strong></span>
                <span>✉️ {whatsappModalAlumno.email}</span>
              </div>
            </div>

            {/* Plantillas Rápidas */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Selecciona una plantilla o escribe tu mensaje:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectTemplate("bienvenida")}
                  className={`p-2.5 rounded-2xl border text-xs font-bold text-center transition cursor-pointer ${
                    whatsappTemplate === "bienvenida"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-emerald-500"
                  }`}
                >
                  🎉 Bienvenida y Admisión
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectTemplate("pago")}
                  className={`p-2.5 rounded-2xl border text-xs font-bold text-center transition cursor-pointer ${
                    whatsappTemplate === "pago"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-emerald-500"
                  }`}
                >
                  💳 Datos de Pago (Laura)
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectTemplate("cuadernillos")}
                  className={`p-2.5 rounded-2xl border text-xs font-bold text-center transition cursor-pointer ${
                    whatsappTemplate === "cuadernillos"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-emerald-500"
                  }`}
                >
                  📚 Cuadernillos / Audio
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectTemplate("personalizado")}
                  className={`p-2.5 rounded-2xl border text-xs font-bold text-center transition cursor-pointer ${
                    whatsappTemplate === "personalizado"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-emerald-500"
                  }`}
                >
                  ✏️ Personalizado
                </button>
              </div>
            </div>

            {/* Formato de Teléfono / Lada */}
            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700">
              <span className="text-stone-600 dark:text-stone-400 font-bold">Prefijo de País para WhatsApp:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPhonePrefix("52")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${
                    phonePrefix === "52"
                      ? "bg-emerald-600 text-white"
                      : "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  🇲🇽 México (+52)
                </button>
                <button
                  type="button"
                  onClick={() => setPhonePrefix("none")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${
                    phonePrefix === "none"
                      ? "bg-emerald-600 text-white"
                      : "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  Directo / Otro
                </button>
              </div>
            </div>

            {/* Editor de Mensaje */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Mensaje Personal a Enviar:
                </label>
                <span className="text-[10px] text-stone-400 font-medium">
                  {customWhatsappMessage.length} caracteres
                </span>
              </div>
              <textarea
                rows={6}
                value={customWhatsappMessage}
                onChange={(e) => setCustomWhatsappMessage(e.target.value)}
                placeholder="Escribe aquí el mensaje personal para el alumno..."
                className="w-full p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 font-medium leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Preview del Enlace */}
            <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2">
              <span className="truncate">
                Enlace wa.me: <strong>https://wa.me/{formatWhatsAppNumber(whatsappModalAlumno.telefono, phonePrefix)}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(customWhatsappMessage, "modal-msg-copy")}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 font-bold text-xs hover:bg-emerald-200 transition"
              >
                {copiedField === "modal-msg-copy" ? "¡Copiado!" : "Copiar Texto"}
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setWhatsappModalAlumno(null)}
                className="px-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-700 font-bold text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-lg hover:shadow-emerald-600/25 flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Send size={15} />
                <span>Abrir WhatsApp y Enviar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR ALUMNO PENDIENTE */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                  <UserCheck size={26} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                    {editingAlumnoId ? "Editar Alumno Pendiente" : "Registrar Alumno Pendiente"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Ingresa los datos para control interno y seguimiento por WhatsApp
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveAlumno} className="space-y-4">
              {/* Nombre Completo */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Edgar Jose Batun Alpuche"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Correo y WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Ej: batunedgar343@gmail.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    WhatsApp / Teléfono *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 3121148077"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold font-mono text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Estatus y Rol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Estatus *
                  </label>
                  <select
                    value={formEstatus}
                    onChange={(e) => setFormEstatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {ESTATUS_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.label}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Rol / Función *
                  </label>
                  <select
                    value={formRol}
                    onChange={(e) => setFormRol(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {ROLES_SUGERIDOS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Casa y Generación */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Casa / Agrupación *
                  </label>
                  <input
                    type="text"
                    required
                    list="casas-list"
                    placeholder="Ej: Gladiadores Casa Martha Sangerman"
                    value={formCasa}
                    onChange={(e) => setFormCasa(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <datalist id="casas-list">
                    {CASAS_SUGERIDAS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Generación *
                  </label>
                  <input
                    type="text"
                    required
                    list="generaciones-list"
                    placeholder="Ej: Generación 2026"
                    value={formGeneracion}
                    onChange={(e) => setFormGeneracion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <datalist id="generaciones-list">
                    {GENERACIONES_SUGERIDAS.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Notas u Observaciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre documentos, requerimientos especiales o acuerdos..."
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Acciones del Modal */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-700 font-bold text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition shadow-md hover:shadow-amber-600/20 flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Guardando..." : editingAlumnoId ? "Actualizar Alumno" : "Guardar Alumno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
