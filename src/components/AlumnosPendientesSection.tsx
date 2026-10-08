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
  ChevronRight,
  ChevronsUpDown,
  CheckSquare,
  Square,
  Layers,
  StickyNote,
  SlidersHorizontal,
  X,
  Smartphone,
  Database,
} from "lucide-react";
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { playChime } from "../utils/audio";
import { SPIN_PAYMENT_INFO } from "./ReconocimientosOS";
import WhatsAppComposerModal from "./WhatsAppComposerModal";

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

  // Selección múltiple para eliminar varios estudiantes en lote o cambiar generación
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Agrupamiento colapsable: none | generacion | casa | estatus
  const [groupBy, setGroupBy] = useState<"none" | "generacion" | "casa" | "estatus">("none");
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  // Edición rápida de notas por alumno
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  // Modal dedicado de administración de plantillas de WhatsApp
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

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
    setSelectedStudentIds((prev) => prev.filter((i) => i !== id));
    try {
      await deleteDoc(doc(db, "alumnos_pendientes", id));
    } catch (err) {
      // offline handled
    }
    playChime("tick");
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    playChime("tick");
  };

  // Select / Deselect all visible
  const handleSelectAllVisible = () => {
    const allVisibleIds = filteredAlumnos.map((a) => a.id);
    const areAllSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedStudentIds.includes(id));
    if (areAllSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !allVisibleIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedStudentIds, ...allVisibleIds]));
      setSelectedStudentIds(combined);
    }
    playChime("tick");
  };

  // Bulk delete (eliminar varios estudiantes seleccionándolos)
  const handleBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    const count = selectedStudentIds.length;
    if (!window.confirm(`¿Estás seguro de eliminar ${count} estudiante(s) seleccionado(s) permanentemente?`)) {
      return;
    }
    const idsToDelete = [...selectedStudentIds];
    setAlumnos((prev) => prev.filter((a) => !idsToDelete.includes(a.id)));
    setSelectedStudentIds([]);
    playChime("tick");

    idsToDelete.forEach(async (id) => {
      try {
        await deleteDoc(doc(db, "alumnos_pendientes", id));
      } catch (err) {
        console.warn("Error deleting alumno in Firestore", id, err);
      }
    });
  };

  // Bulk change generacion (elegir con botón multi opción qué generación es)
  const handleBulkChangeGeneracion = async (newGen: string) => {
    if (selectedStudentIds.length === 0 || !newGen) return;
    const idsToUpdate = [...selectedStudentIds];
    setAlumnos((prev) =>
      prev.map((a) => (idsToUpdate.includes(a.id) ? { ...a, generacion: newGen, updatedAt: new Date().toISOString() } : a))
    );
    playChime("success");

    idsToUpdate.forEach(async (id) => {
      try {
        await updateDoc(doc(db, "alumnos_pendientes", id), {
          generacion: newGen,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("Error updating generacion in Firestore", id, err);
      }
    });
  };

  // Guardar notas u observaciones de un estudiante
  const handleSaveNote = async (id: string, noteText: string) => {
    setAlumnos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, notas: noteText, updatedAt: new Date().toISOString() } : a))
    );
    setEditingNoteId(null);
    playChime("tick");

    try {
      await updateDoc(doc(db, "alumnos_pendientes", id), {
        notas: noteText,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Error saving note to Firestore", err);
    }
  };

  // Toggle grupo colapsable
  const handleToggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) =>
      prev.includes(groupKey) ? prev.filter((g) => g !== groupKey) : [...prev, groupKey]
    );
    playChime("tick");
  };

  const handleExpandAllGroups = () => {
    setCollapsedGroups([]);
    playChime("tick");
  };

  const handleCollapseAllGroups = (groups: string[]) => {
    setCollapsedGroups(groups);
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

  // Helper to render each student row with selection checkbox and inline notes
  const renderAlumnoRow = (alumno: AlumnoPendiente) => {
    const estatusCfg =
      ESTATUS_OPTIONS.find((e) => e.label === alumno.estatus) || {
        color: "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border-stone-300",
      };
    const isSelected = selectedStudentIds.includes(alumno.id);
    const isEditingNote = editingNoteId === alumno.id;

    return (
      <tr
        key={alumno.id}
        className={`hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors group ${
          isSelected ? "bg-amber-100/50 dark:bg-amber-950/40" : ""
        }`}
      >
        {/* Checkbox de selección individual */}
        <td className="py-4 px-4 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleToggleSelect(alumno.id)}
            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
          />
        </td>

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
                  className="p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded cursor-pointer"
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
                  className="p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded cursor-pointer"
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

            {/* Notas u Observaciones (Poner / Editar notas) */}
            {isEditingNote ? (
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={editingNoteText}
                  onChange={(e) => setEditingNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveNote(alumno.id, editingNoteText);
                    if (e.key === "Escape") setEditingNoteId(null);
                  }}
                  placeholder="Escribe una nota u observación..."
                  className="text-xs px-2.5 py-1 rounded-xl border border-amber-500 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 w-full max-w-sm focus:outline-hidden"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleSaveNote(alumno.id, editingNoteText)}
                  className="px-2 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer"
                  title="Guardar nota"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingNoteId(null)}
                  className="p-1 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-xs cursor-pointer"
                  title="Cancelar"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 pt-0.5">
                {alumno.notas ? (
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 italic max-w-md flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                    <StickyNote size={11} className="text-amber-600 shrink-0" />
                    <span>"{alumno.notas}"</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNoteId(alumno.id);
                        setEditingNoteText(alumno.notas || "");
                      }}
                      className="p-0.5 text-stone-400 hover:text-amber-600 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Editar nota"
                    >
                      <Edit2 size={10} />
                    </button>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNoteId(alumno.id);
                      setEditingNoteText("");
                    }}
                    className="text-[10px] text-stone-400 hover:text-amber-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  >
                    <Plus size={10} />
                    <span>Poner nota</span>
                  </button>
                )}
              </div>
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

        {/* WhatsApp Personal */}
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
              onClick={() => {
                setShowTemplatesModal(true);
                playChime("tick");
              }}
              className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-black text-xs transition border border-white/30 flex items-center gap-2 active:scale-95 cursor-pointer backdrop-blur-sm shadow-xs"
              title="Administrar, agregar, editar y eliminar plantillas rápidas de WhatsApp"
            >
              <MessageCircle size={15} />
              <span>Plantillas WhatsApp</span>
            </button>

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

        {/* SELECTOR MULTI-OPCIÓN DE GENERACIÓN (CHIPS RÁPIDOS) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200 dark:border-stone-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              <Calendar size={14} className="text-amber-600" />
              <span>Generación:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedGeneracion("todos");
                  playChime("tick");
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedGeneracion === "todos"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
                }`}
              >
                Todas ({alumnos.length})
              </button>
              {GENERACIONES_SUGERIDAS.map((gen) => {
                const count = alumnos.filter((a) => a.generacion === gen).length;
                return (
                  <button
                    key={gen}
                    type="button"
                    onClick={() => {
                      setSelectedGeneracion(gen);
                      playChime("tick");
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      selectedGeneracion === gen
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
                    }`}
                  >
                    <span>{gen.replace("Generación ", "Gen ")}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selector de Agrupamiento Colapsable */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-600 dark:text-stone-400 flex items-center gap-1">
              <Layers size={14} className="text-indigo-600" />
              <span>Agrupar por:</span>
            </span>
            <select
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value as any);
                setCollapsedGroups([]);
                playChime("tick");
              }}
              className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-800 dark:text-stone-200 cursor-pointer"
            >
              <option value="none">Sin agrupar</option>
              <option value="generacion">Por Generación</option>
              <option value="casa">Por Casa / Agrupación</option>
              <option value="estatus">Por Estatus</option>
            </select>

            {groupBy !== "none" && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleExpandAllGroups}
                  className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 text-[11px] font-bold cursor-pointer"
                  title="Expandir todos los grupos"
                >
                  Expandir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const keys = Array.from(new Set(filteredAlumnos.map((a) => {
                      if (groupBy === "generacion") return a.generacion || "Sin Generación";
                      if (groupBy === "casa") return a.casa || "Sin Casa";
                      return a.estatus || "Sin Estatus";
                    })));
                    handleCollapseAllGroups(keys);
                  }}
                  className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 text-[11px] font-bold cursor-pointer"
                  title="Colapsar todos los grupos"
                >
                  Colapsar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BARRA DE ACCIONES MASIVAS (BULK SELECTION & DELETE) */}
      {selectedStudentIds.length > 0 && (
        <div className="sticky top-2 z-30 p-3 sm:p-4 rounded-2xl bg-amber-950 text-white shadow-xl flex flex-wrap items-center justify-between gap-3 border border-amber-600/70 animate-in slide-in-from-top-2 duration-200 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
              <CheckSquare size={17} />
            </div>
            <div>
              <span className="font-black text-xs sm:text-sm">
                {selectedStudentIds.length} estudiante(s) seleccionado(s)
              </span>
              <p className="text-[10px] text-amber-200/80">
                Aplica eliminación masiva o asignación de generación en lote
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Multi opción para asignar generación */}
            <div className="flex items-center gap-1 bg-amber-900/80 px-2 py-1 rounded-xl text-xs border border-amber-700/60">
              <span className="text-[11px] text-amber-200 font-bold">Asignar Gen:</span>
              {["2026", "2025", "2024", "2023"].map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => handleBulkChangeGeneracion(`Generación ${yr}`)}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/25 text-white text-[11px] font-bold cursor-pointer transition active:scale-95"
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* Eliminar varios estudiantes seleccionándolos */}
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
              title="Eliminar estudiantes seleccionados permanentemente"
            >
              <Trash2 size={13} />
              <span>Eliminar Seleccionados</span>
            </button>

            {/* Desmarcar todos */}
            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs cursor-pointer transition"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

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
                className="px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer"
              >
                + Registrar Primer Alumno Pendiente
              </button>
              {onOpenDriveImport && (
                <button
                  type="button"
                  onClick={onOpenDriveImport}
                  className="px-4 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition border border-stone-300 dark:border-stone-700 flex items-center gap-1.5 cursor-pointer"
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
                  <th className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredAlumnos.length > 0 &&
                        filteredAlumnos.every((a) => selectedStudentIds.includes(a.id))
                      }
                      onChange={handleSelectAllVisible}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      title="Seleccionar / deseleccionar todos los visibles"
                    />
                  </th>
                  <th className="py-3.5 px-4">Alumno y Datos de Contacto</th>
                  <th className="py-3.5 px-4">Casa / Agrupación</th>
                  <th className="py-3.5 px-4">Generación y Rol</th>
                  <th className="py-3.5 px-4">Estatus</th>
                  <th className="py-3.5 px-4 text-center">WhatsApp Personal</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 text-xs">
                {(() => {
                  if (groupBy === "none") {
                    return filteredAlumnos.map((alumno) => renderAlumnoRow(alumno));
                  }

                  // Render Grouped with Collapsible Headers
                  const groupsMap: Record<string, AlumnoPendiente[]> = {};
                  filteredAlumnos.forEach((a) => {
                    let key = "Sin asignar";
                    if (groupBy === "generacion") key = a.generacion || "Sin Generación";
                    else if (groupBy === "casa") key = a.casa || "Sin Casa";
                    else if (groupBy === "estatus") key = a.estatus || "Sin Estatus";
                    if (!groupsMap[key]) groupsMap[key] = [];
                    groupsMap[key].push(a);
                  });

                  return Object.entries(groupsMap).map(([groupTitle, groupAlumnos]) => {
                    const isCollapsed = collapsedGroups.includes(groupTitle);
                    const allInGroupSelected = groupAlumnos.every((a) => selectedStudentIds.includes(a.id));

                    return (
                      <React.Fragment key={groupTitle}>
                        {/* Fila Encabezado del Grupo Colapsable */}
                        <tr className="bg-amber-500/10 dark:bg-amber-950/30 border-y border-amber-200/50 dark:border-amber-800/50">
                          <td colSpan={7} className="py-2.5 px-4">
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => handleToggleGroup(groupTitle)}
                                className="flex items-center gap-2 font-black text-xs text-amber-950 dark:text-amber-200 hover:text-amber-700 cursor-pointer"
                              >
                                {isCollapsed ? (
                                  <ChevronRight size={16} className="text-amber-600 shrink-0" />
                                ) : (
                                  <ChevronDown size={16} className="text-amber-600 shrink-0" />
                                )}
                                <span>{groupTitle}</span>
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                                  {groupAlumnos.length} {groupAlumnos.length === 1 ? "alumno" : "alumnos"}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const groupIds = groupAlumnos.map((a) => a.id);
                                  if (allInGroupSelected) {
                                    setSelectedStudentIds((prev) => prev.filter((id) => !groupIds.includes(id)));
                                  } else {
                                    setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...groupIds])));
                                  }
                                  playChime("tick");
                                }}
                                className="text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
                              >
                                {allInGroupSelected ? "Deseleccionar grupo" : "Seleccionar todo el grupo"}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Filas del Grupo (si no está colapsado) */}
                        {!isCollapsed && groupAlumnos.map((alumno) => renderAlumnoRow(alumno))}
                      </React.Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL REDACTOR DE WHATSAPP CON PLANTILLAS PERSONALIZADAS (PONER, QUITAR, EDITAR) */}
      <WhatsAppComposerModal
        isOpen={Boolean(whatsappModalAlumno)}
        onClose={() => setWhatsappModalAlumno(null)}
        recipient={
          whatsappModalAlumno
            ? {
                nombre: whatsappModalAlumno.nombre,
                telefono: whatsappModalAlumno.telefono,
                diplomado: "Diplomado de Liderazgo",
                year: whatsappModalAlumno.generacion?.replace(/[^0-9]/g, "") || "2026",
                costo: 100,
                tipo: "Primera Impresión",
                casa: whatsappModalAlumno.casa,
                rol: whatsappModalAlumno.rol,
                generacion: whatsappModalAlumno.generacion,
              }
            : null
        }
        onSent={async (sentMessage) => {
          if (!whatsappModalAlumno) return;
          const updatedAlumno: AlumnoPendiente = {
            ...whatsappModalAlumno,
            contactadoWhatsApp: true,
            ultimoContactoAt: new Date().toISOString(),
            ultimoMensajeWhatsApp: sentMessage,
          };
          setAlumnos((prev) =>
            prev.map((a) => (a.id === updatedAlumno.id ? updatedAlumno : a))
          );
          try {
            await updateDoc(doc(db, "alumnos_pendientes", updatedAlumno.id), {
              contactadoWhatsApp: true,
              ultimoContactoAt: updatedAlumno.ultimoContactoAt,
              ultimoMensajeWhatsApp: sentMessage,
              updatedAt: new Date().toISOString(),
            });
          } catch (err) {
            console.warn("Error updating alumno contactado:", err);
          }
        }}
      />

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
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-stone-400 font-bold">Selección rápida:</span>
                    {GENERACIONES_SUGERIDAS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormGeneracion(g)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          formGeneracion === g
                            ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                            : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-200"
                        }`}
                      >
                        {g.replace("Generación ", "Gen ")}
                      </button>
                    ))}
                  </div>
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

      {/* MODAL GESTOR DE PLANTILLAS DE WHATSAPP (AGREGAR, EDITAR, ELIMINAR) */}
      <WhatsAppComposerModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        initialManageMode={true}
      />
    </div>
  );
}
