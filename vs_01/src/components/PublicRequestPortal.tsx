import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  Search,
  MessageCircle,
  Copy,
  Check,
  FileText,
  Palette,
  Shirt,
  GraduationCap,
  Laptop,
  AlertCircle,
  Lock,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  User,
  Phone,
  Mail,
  Building2,
  Calendar,
  Layers,
  HelpCircle,
  RotateCcw,
  Bell,
  KeyRound,
  X,
  Plane,
} from "lucide-react";
import { SolicitudItem } from "../types";
import { playChime } from "../utils/audio";
import { googleSignIn, loginWithEmail } from "../lib/firebase";
import { savePublicSolicitudToFirestore } from "../lib/firestoreService";
import ReconocimientoFormModal from "./ReconocimientoFormModal";
import PublicReconocimientosImpresosModal from "./PublicReconocimientosImpresosModal";

interface PublicRequestPortalProps {
  onAdminLoginClick: (adminEmail?: string) => void;
  onRequestCreated: (newSolicitud: SolicitudItem) => void;
  existingSolicitudes?: SolicitudItem[];
  isAdminLoggedIn?: boolean;
  onGoToAdminDashboard?: () => void;
}

export type CategoryKey = "lonas" | "playeras" | "diplomado" | "tecnologia" | "revision" | "otro";

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  icon: any;
  desc: string;
  placeholder: string;
  badge: string;
  color: string;
}[] = [
  {
    key: "lonas",
    label: "Lonas y Gran Formato",
    icon: Palette,
    desc: "Diseño, impresión, medidas especiales, lonas con ojillos para eventos",
    placeholder: "Ej: Lona de bienvenida de 3x2m con ojillos perimetrales para el evento del sábado...",
    badge: "Diseño y Producción",
    color: "from-amber-500 to-orange-600",
  },
  {
    key: "playeras",
    label: "Playeras y Merchandising",
    icon: Shirt,
    desc: "Pedidos de playeras institucionales, tallas, serigrafía, DTF, colores",
    placeholder: "Ej: Pedido de 25 playeras negras (10 M, 10 L, 5 XL) con logo institucional en pecho...",
    badge: "Producción Textil",
    color: "from-emerald-500 to-teal-600",
  },
  {
    key: "diplomado",
    label: "Diplomado de Liderazgo",
    icon: GraduationCap,
    desc: "Revisión de contenidos, módulos, constancias, dudas de alumnos o material",
    placeholder: "Ej: Revisar módulo 3 sobre Comunicación Asertiva y emitir constancias para la cohorte 2026...",
    badge: "Académico",
    color: "from-blue-500 to-indigo-600",
  },
  {
    key: "tecnologia",
    label: "Servicios y Tecnología",
    icon: Laptop,
    desc: "Soporte en plataformas FGDLL.org, accesos, bases de datos o sistemas",
    placeholder: "Ej: Actualizar accesos al panel de administración o configurar cuentas institucionales...",
    badge: "Tecnología",
    color: "from-purple-500 to-violet-600",
  },
  {
    key: "revision",
    label: "Revisión Ejecutiva",
    icon: FileText,
    desc: "Revisión de documentos, proyectos de psicología, propuestas o acuerdos",
    placeholder: "Ej: Revisar documento de propuesta de intervención antes de la reunión con directores...",
    badge: "Ejecutivo",
    color: "from-rose-500 to-pink-600",
  },
  {
    key: "otro",
    label: "Otro Pendiente",
    icon: Sparkles,
    desc: "Cualquier otra solicitud, encargo o requerimiento especial para Laura/Pepe",
    placeholder: "Describe detalladamente lo que necesitas y la fecha en que lo requieres...",
    badge: "General",
    color: "from-stone-600 to-stone-800",
  },
];

const PRESET_AREAS = [
  "FGDLL",
  "Universidad FGDLL",
  "FGDLL.org y Tecnología",
  "Diseño y Producción",
  "Proyectos de Psicología",
  "Administración",
  "Zona Tiburón",
  "Otro",
];

export default function PublicRequestPortal({
  onAdminLoginClick,
  onRequestCreated,
  existingSolicitudes = [],
  isAdminLoggedIn = false,
  onGoToAdminDashboard,
}: PublicRequestPortalProps) {
  const [activeTab, setActiveTab] = useState<"crear" | "rastrear">("crear");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("lonas");

  // Form states
  const [solicitante, setSolicitante] = useState("");
  const [area, setArea] = useState("FGDLL");
  const [customArea, setCustomArea] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState<"Baja" | "Media" | "Alta">("Media");
  const [fechaRequerida, setFechaRequerida] = useState("");
  const [adjuntoUrl, setAdjuntoUrl] = useState("");

  // Category specific specs
  const [medidasLona, setMedidasLona] = useState("");
  const [tallasPlayeras, setTallasPlayeras] = useState("");
  const [moduloDiplomado, setModuloDiplomado] = useState("");

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<SolicitudItem | null>(null);
  const [copiedFolio, setCopiedFolio] = useState(false);

  // Tracking query state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingTicket, setIsSearchingTicket] = useState(false);
  const [searchResults, setSearchResults] = useState<SolicitudItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Recent folios remembered on this device
  const [recentFolios, setRecentFolios] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("fgdll_user_folios");
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  });

  // Admin PIN modal states
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState("");
  const [adminPinError, setAdminPinError] = useState<string | null>(null);

  // Reconocimiento Modal state (Solicitud de Reconocimientos Mini Web App)
  const [showReconocimientoModal, setShowReconocimientoModal] = useState(false);
  const [showReconocimientosImpresosModal, setShowReconocimientosImpresosModal] = useState(false);

  // Notification state
  const [hasNotifPermission, setHasNotifPermission] = useState<boolean>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission === "granted";
    }
    return false;
  });

  // Optional sign in modal or state
  const [userSession, setUserSession] = useState<{ email: string; name?: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmailInput, setAuthEmailInput] = useState("");
  const [authPasswordInput, setAuthPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Load saved guest contact if any
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fgdll_solicitante_info");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.solicitante) setSolicitante(parsed.solicitante);
        if (parsed.telefono) setTelefono(parsed.telefono);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.area) setArea(parsed.area);
      }
    } catch (_) {}
  }, []);

  const saveFolioLocal = (newFolio: string) => {
    try {
      const raw = localStorage.getItem("fgdll_user_folios");
      const arr: string[] = raw ? JSON.parse(raw) : [];
      if (!arr.includes(newFolio)) {
        const updated = [newFolio, ...arr].slice(0, 10);
        localStorage.setItem("fgdll_user_folios", JSON.stringify(updated));
        setRecentFolios(updated);
      }
    } catch (_) {}
  };

  const handleEnableNotifications = async () => {
    if ("Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setHasNotifPermission(true);
          playChime("success");
          try {
            new Notification("FGDLL • Notificaciones activadas", {
              body: "Recibirás avisos directos cuando tu ticket cambie de estado.",
              icon: "/icon-192.svg",
            });
          } catch (_) {}
        }
      } catch (e) {
        console.error("Error requesting notification permission", e);
      }
    }
  };

  const handleAdminPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = adminPinInput.trim();
    if (clean === "110809") {
      setAdminPinError(null);
      setShowAdminPinModal(false);
      setAdminPinInput("");
      onAdminLoginClick("laurcortazar@gmail.com");
      playChime("success");
    } else {
      setAdminPinError("Contraseña incorrecta. Solo puedes entrar a Avión de Admin con la contraseña: 110809 o iniciando sesión con tu cuenta de Google (laurcortazar@gmail.com o jaguarcortazar@gmail.com).");
      playChime("urgent");
    }
  };

  const handleGoogleAdminLogin = async () => {
    try {
      const res = await googleSignIn();
      const email = res?.user?.email?.toLowerCase().trim() || "";
      const allowedAdmins = ["laurcortazar@gmail.com", "jaguarcortazar@gmail.com"];
      if (allowedAdmins.includes(email)) {
        setShowAdminPinModal(false);
        onAdminLoginClick(email);
        playChime("success");
      } else {
        setAdminPinError(
          `La cuenta "${email || "seleccionada"}" no tiene permisos de Administradora. Solo puedes entrar a Avión de Admin iniciando sesión con laurcortazar@gmail.com o jaguarcortazar@gmail.com.`
        );
        playChime("urgent");
      }
    } catch (err: any) {
      setAdminPinError(err.message || "Error al autenticar con Google");
    }
  };

  const handleAreaChange = (val: string) => {
    setArea(val);
    if (val !== "Otro") {
      setCustomArea("");
    }
  };

  const currentCategoryObj = CATEGORIES.find((c) => c.key === selectedCategory) || CATEGORIES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solicitante.trim()) {
      alert("Por favor indica tu nombre completo.");
      return;
    }
    if (!descripcion.trim() && !titulo.trim()) {
      alert("Por favor describe lo que necesitas.");
      return;
    }

    setIsSubmitting(true);
    const finalArea = area === "Otro" && customArea.trim() ? customArea.trim() : area;
    const finalTitle = titulo.trim() || `${currentCategoryObj.label}: ${solicitante.trim()}`;

    // Specs
    const especificaciones: any = {
      categoria: selectedCategory,
      area: finalArea,
      fechaRequerida: fechaRequerida || undefined,
    };
    if (selectedCategory === "lonas" && medidasLona) especificaciones.medidas = medidasLona;
    if (selectedCategory === "playeras" && tallasPlayeras) especificaciones.tallas = tallasPlayeras;
    if (selectedCategory === "diplomado" && moduloDiplomado) especificaciones.modulo = moduloDiplomado;

    const folio = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // Save contact info locally for convenience on next requests
      try {
        localStorage.setItem(
          "fgdll_solicitante_info",
          JSON.stringify({
            solicitante: solicitante.trim(),
            telefono: telefono.trim(),
            email: email.trim(),
            area: finalArea,
          })
        );
      } catch (_) {}

      const res = await fetch("/api/solicitudes/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          folio,
          solicitante: solicitante.trim(),
          telefono: telefono.trim() || undefined,
          email: email.trim() || undefined,
          area: finalArea,
          categoria: selectedCategory,
          titulo: finalTitle,
          descripcion: descripcion.trim(),
          especificaciones,
          canal: "Web",
          prioridad,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.solicitud) {
        const item: SolicitudItem = {
          ...data.solicitud,
          folio: data.solicitud.folio || folio,
          area: finalArea,
          categoria: selectedCategory,
          especificaciones,
          estadoTracking: "espera",
          fechaIngreso: new Date().toISOString(),
        };
        setCreatedTicket(item);
        onRequestCreated(item);
        saveFolioLocal(item.folio || folio);
        playChime("success");
      } else {
        // Fallback local creation if server offline
        const localItem: SolicitudItem = {
          id: `sol-${Date.now()}`,
          folio,
          solicitante: solicitante.trim(),
          telefono: telefono.trim() || undefined,
          email: email.trim() || undefined,
          area: finalArea,
          categoria: selectedCategory,
          titulo: finalTitle,
          descripcion: descripcion.trim(),
          especificaciones,
          canal: "Web",
          prioridad,
          estado: "Nueva",
          estadoTracking: "espera",
          fechaIngreso: new Date().toISOString(),
          leida: false,
        };
        setCreatedTicket(localItem);
        onRequestCreated(localItem);
        saveFolioLocal(folio);
        playChime("success");
      }
    } catch (err) {
      console.warn("Error calling /api/solicitudes/crear, using local fallback:", err);
      const localItem: SolicitudItem = {
        id: `sol-${Date.now()}`,
        folio,
        solicitante: solicitante.trim(),
        telefono: telefono.trim() || undefined,
        email: email.trim() || undefined,
        area: finalArea,
        categoria: selectedCategory,
        titulo: finalTitle,
        descripcion: descripcion.trim(),
        especificaciones,
        canal: "Web",
        prioridad,
        estado: "Nueva",
        estadoTracking: "espera",
        fechaIngreso: new Date().toISOString(),
        leida: false,
      };
      setCreatedTicket(localItem);
      onRequestCreated(localItem);
      saveFolioLocal(folio);
      playChime("success");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyFolio = (folioToCopy: string) => {
    navigator.clipboard.writeText(folioToCopy);
    setCopiedFolio(true);
    playChime("tick");
    setTimeout(() => setCopiedFolio(false), 2500);
  };

  const handleSearchTickets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingTicket(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/solicitudes/ticket/${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.solicitudes)) {
        setSearchResults(data.solicitudes);
        if (data.solicitudes.length > 0) playChime("success");
      } else {
        // Fallback filter existing solicitudes in memory
        const cleanQ = searchQuery.trim().toLowerCase();
        const matches = existingSolicitudes.filter(
          (s) =>
            (s.folio && s.folio.toLowerCase().includes(cleanQ)) ||
            (s.telefono && s.telefono.includes(cleanQ)) ||
            s.id.toLowerCase() === cleanQ ||
            (s.email && s.email.toLowerCase() === cleanQ)
        );
        setSearchResults(matches);
      }
    } catch (err) {
      const cleanQ = searchQuery.trim().toLowerCase();
      const matches = existingSolicitudes.filter(
        (s) =>
          (s.folio && s.folio.toLowerCase().includes(cleanQ)) ||
          (s.telefono && s.telefono.includes(cleanQ)) ||
          s.id.toLowerCase() === cleanQ
      );
      setSearchResults(matches);
    } finally {
      setIsSearchingTicket(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setUserSession({
          email: res.user.email || "",
          name: res.user.displayName || "",
        });
        if (res.user.displayName && !solicitante) setSolicitante(res.user.displayName);
        if (res.user.email && !email) setEmail(res.user.email);
        setShowAuthModal(false);
        playChime("success");
      }
    } catch (err: any) {
      setAuthError(err.message || "Error al iniciar sesión con Google");
    }
  };

  const getTrackingBadge = (item: SolicitudItem) => {
    const isCompleted = item.estado === "Atendida" || item.estadoTracking === "completado";
    const isInProcess = item.estado === "ConvertidaEnTarea" || item.estadoTracking === "proceso" || item.estadoTracking === "aceptado";

    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-800">
          <CheckCircle2 size={13} className="text-emerald-600" />
          Completado y Listo
        </span>
      );
    }
    if (isInProcess) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold text-xs border border-blue-300 dark:border-blue-800">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          En Proceso / Aceptado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-300 dark:border-amber-800">
        <Clock size={13} className="text-amber-600 animate-spin" />
        En Lista de Espera
      </span>
    );
  };

  // WhatsApp quick contact message
  const makeWhatsAppUrl = (ticket: SolicitudItem) => {
    const phone = "19999011852"; // Laura's direct contact number: https://wa.me/19999011852
    const text = `Hola Laura, acabo de registrar mi requerimiento en el portal l.fgdll.org:\n\n*Ticket:* ${ticket.folio || ticket.id}\n*Solicitante:* ${ticket.solicitante}\n*Área:* ${ticket.area || "FGDLL"}\n*Requerimiento:* ${ticket.titulo}\n\nQuedo al pendiente de tu aviso, muchas gracias!`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col selection:bg-amber-500 selection:text-white">
      {/* Top Notification / Admin Bar */}
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-stone-900 to-amber-600 dark:from-amber-500 dark:to-orange-500 text-white flex items-center justify-center font-black shadow-xs text-sm">
              FG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-stone-900 dark:text-white">
                  Portal de Requerimientos
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  FGDLL • Pepe Cortazar
                </span>
              </div>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                Recepción ejecutiva de solicitudes, pedidos y proyectos en lista de espera
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Optional Sign in indicator */}
            {userSession ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                <User size={13} />
                <span className="max-w-[120px] truncate">{userSession.name || userSession.email}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium transition-colors"
                title="Iniciar sesión para guardar tu historial"
              >
                Iniciar sesión
              </button>
            )}

            {/* Botón Acceso Rápido Graduados */}
            <button
              type="button"
              id="btn-nav-graduados"
              onClick={() => {
                setShowReconocimientosImpresosModal(true);
                playChime("tick");
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer"
              title="Ver lista oficial de Graduados y enlaces a Google Drive"
            >
              <GraduationCap size={14} />
              <span>Graduados 🎓</span>
            </button>

            {/* Private Admin Mode Switch / Avión de Admin */}
            <button
              type="button"
              id="btn-avion-admin"
              onClick={() => {
                if (isAdminLoggedIn) {
                  if (onGoToAdminDashboard) onGoToAdminDashboard();
                  else onAdminLoginClick();
                } else {
                  setShowAdminPinModal(true);
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-black dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-950 text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all transform active:scale-95"
              title="Avión de Admin • Acceso para Laura o Pepe Cortazar (Contraseña: 110809 o Google)"
            >
              <Plane size={13} className="text-amber-400 dark:text-amber-600" />
              <span>{isAdminLoggedIn ? "👑 Volver a Task-OS" : "Avión de Admin ✈️"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-white p-6 sm:p-8 shadow-xl border border-stone-800">
          <div className="relative z-10 space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-bold">
              <Sparkles size={13} />
              <span>Atención Directa & Seguimiento en Vivo</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ¿En qué podemos apoyarte hoy?
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Registra tu requerimiento de lonas, playeras, revisión del Diplomado de Liderazgo o soporte tecnológico. Recibirás tu <strong>número de ticket único</strong> y te notificaremos por WhatsApp y correo en cuanto tu solicitud sea aceptada y completada.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-stone-400">
              <span className="flex items-center gap-1 bg-black/30 px-2.5 py-1 rounded-lg">
                <CheckCircle2 size={13} className="text-emerald-400" />
                Asignación de ticket instantáneo
              </span>
              <span className="flex items-center gap-1 bg-black/30 px-2.5 py-1 rounded-lg">
                <MessageCircle size={13} className="text-emerald-400" />
                Confirmación por WhatsApp
              </span>
              <span className="flex items-center gap-1 bg-black/30 px-2.5 py-1 rounded-lg">
                <Clock size={13} className="text-amber-400" />
                Prioridad en lista de espera
              </span>
            </div>
          </div>
        </div>

        {/* SECCIÓN DESTACADA: TRÁMITES DE RECONOCIMIENTOS Y CONSULTA DIGITAL DRIVE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tarjeta 1: Solicitar Impresión */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-indigo-900 text-white shadow-xl border border-indigo-400/40 relative overflow-hidden flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0 shadow-md">
                🎓
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                    Diplomado Liderazgo
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold">
                    Trámite Oficial
                  </span>
                </div>
                <h3 className="text-base font-black text-white tracking-tight">
                  ¿Necesitas tu Reconocimiento?
                </h3>
                <p className="text-xs text-indigo-100 leading-relaxed">
                  Solicita tu primera impresión ($100) o re-impresión ($50) en segundos.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-solicitar-reconocimiento"
              onClick={() => {
                setShowReconocimientoModal(true);
                playChime("tick");
              }}
              className="w-full px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs sm:text-sm tracking-wide uppercase shadow-lg shadow-amber-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>📜 SOLICITAR IMPRESIÓN</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Tarjeta 2: GRADUADOS - Reconocimientos Impresos y Enlace Drive */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-stone-900 text-white shadow-xl border border-purple-400/40 relative overflow-hidden flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0 shadow-md border border-white/20">
                🎓
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black uppercase tracking-wider">
                    Google Drive Público
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-400/30 text-purple-200 text-[10px] font-bold">
                    Lista Oficial
                  </span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>GRADUADOS</span>
                </h3>
                <p className="text-xs text-purple-100/90 leading-relaxed">
                  Lista de reconocimientos que ya imprimí ligados al link de Google Drive donde puedes ver tu reconocimiento digital en modo público.
                </p>

                {/* Vista previa del formato solicitado por el usuario */}
                <div className="pt-1">
                  <div className="px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-[11px] font-mono text-amber-200 truncate flex items-center gap-1.5">
                    <span className="text-purple-300 font-bold shrink-0">Formato:</span>
                    <span className="truncate">- Nombre (primer apellido) Grupo Zona Diplomas: 2022 - 2025 - 2026</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              id="btn-ver-reconocimientos-impresos"
              onClick={() => {
                setShowReconocimientosImpresosModal(true);
                playChime("tick");
              }}
              className="w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black text-xs sm:text-sm tracking-wide uppercase shadow-lg shadow-amber-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🎓 GRADUADOS • VER RECONOCIMIENTOS DIGITALES (DRIVE)</span>
              <ExternalLink size={16} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Mobile-First Pill Switcher) */}
        <div className="flex p-1 bg-stone-200/80 dark:bg-stone-800/80 rounded-2xl max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab("crear");
              setCreatedTicket(null);
            }}
            className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "crear"
                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <Send size={15} className={activeTab === "crear" ? "text-amber-500" : ""} />
            <span>Hacer Requerimiento</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rastrear")}
            className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "rastrear"
                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            <Search size={15} className={activeTab === "rastrear" ? "text-amber-500" : ""} />
            <span>Rastrear mi Ticket</span>
          </button>
        </div>

        {/* TAB 1: CREAR REQUERIMIENTO */}
        {activeTab === "crear" && (
          <div>
            {/* SUCCESS SCREEN WHEN TICKET IS CREATED */}
            {createdTicket ? (
              <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-emerald-200 dark:border-emerald-800/60 shadow-xl space-y-6 text-center max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={36} />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    ¡Solicitud Recibida con Éxito!
                  </span>
                  <h3 className="text-2xl font-black text-stone-900 dark:text-stone-100">
                    Tu ticket ha sido registrado
                  </h3>
                  <p className="text-xs text-stone-500">
                    Laura ha recibido tu requerimiento y se encuentra en su <strong>lista de espera activa</strong>.
                  </p>
                </div>

                {/* Ticket Card */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-400 font-medium">Folio de seguimiento:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyFolio(createdTicket.folio || createdTicket.id)}
                      className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center gap-1 hover:bg-stone-300"
                    >
                      {copiedFolio ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedFolio ? "Copiado" : "Copiar"}</span>
                    </button>
                  </div>
                  <div className="text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                    {createdTicket.folio || createdTicket.id}
                  </div>
                  <div className="pt-2 border-t border-stone-200 dark:border-stone-700/60 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Solicitante:</span>
                      <strong className="text-stone-800 dark:text-stone-200">{createdTicket.solicitante}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Área:</span>
                      <strong className="text-stone-800 dark:text-stone-200">{createdTicket.area || "FGDLL"}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-stone-400 block text-[10px]">Requerimiento:</span>
                      <strong className="text-stone-800 dark:text-stone-200">{createdTicket.titulo}</strong>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-[11px] text-stone-400">Estado actual:</span>
                    {getTrackingBadge(createdTicket)}
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="space-y-2 pt-2">
                  <a
                    href={makeWhatsAppUrl(createdTicket)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
                  >
                    <MessageCircle size={18} />
                    <span>Avisar a Laura por WhatsApp con este ticket</span>
                  </a>

                  {!hasNotifPermission && typeof window !== "undefined" && "Notification" in window && (
                    <button
                      type="button"
                      onClick={handleEnableNotifications}
                      className="w-full py-2.5 px-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <Bell size={14} className="text-amber-500" />
                      <span>Activar avisos en este dispositivo</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setCreatedTicket(null);
                      setTitulo("");
                      setDescripcion("");
                      setMedidasLona("");
                      setTallasPlayeras("");
                      setModuloDiplomado("");
                    }}
                    className="w-full py-2.5 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs"
                  >
                    Hacer otro requerimiento
                  </button>
                </div>
              </div>
            ) : (
              /* THE REQUEST FORM */
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Categoría Visual Cards */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <Layers size={14} className="text-amber-500" />
                    <span>1. Selecciona el Tipo de Requerimiento</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = selectedCategory === cat.key;
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.key);
                            playChime("tick");
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                            isSelected
                              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
                              : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div
                              className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${cat.color} text-white flex items-center justify-center shadow-xs`}
                            >
                              <Icon size={16} />
                            </div>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-xs">
                                ✓
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                              {cat.label}
                            </div>
                            <div className="text-[10px] text-stone-500 line-clamp-1">{cat.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Datos del Solicitante y Área */}
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 space-y-4 shadow-sm">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <User size={14} className="text-amber-500" />
                    <span>2. Datos de Quién Solicita</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nombre */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        Nombre completo <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={solicitante}
                        onChange={(e) => setSolicitante(e.target.value)}
                        placeholder="Ej: Lic. Laura Cortazar o Prof. Martínez"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Teléfono / WhatsApp */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                          Celular / WhatsApp
                        </label>
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Recomendado
                        </span>
                      </div>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-3 text-stone-400" />
                        <input
                          type="tel"
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          placeholder="+52 55 1234 5678"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-stone-400 dark:text-stone-500">
                        Laura te avisará directamente por WhatsApp cuando tu pedido esté en lista de espera y cuando quede listo.
                      </p>
                    </div>

                    {/* Correo */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                          Correo electrónico
                        </label>
                        <span className="text-[10px] text-stone-400">Recomendado</span>
                      </div>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-3 text-stone-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tu-correo@fgdll.org"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-stone-400 dark:text-stone-500">
                        Para recibir tu comprobante de solicitud y folio de rastreo oficial.
                      </p>
                    </div>

                    {/* Área / Departamento */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        Área o Departamento <span className="text-amber-500">*</span>
                      </label>
                      <select
                        value={area}
                        onChange={(e) => handleAreaChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        {PRESET_AREAS.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                      {area === "Otro" && (
                        <input
                          type="text"
                          value={customArea}
                          onChange={(e) => setCustomArea(e.target.value)}
                          placeholder="Especifica el área o centro..."
                          className="mt-2 w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Detalle del Requerimiento */}
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                      <FileText size={14} className="text-amber-500" />
                      <span>3. Especificaciones del Requerimiento</span>
                    </label>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                      {currentCategoryObj.label}
                    </span>
                  </div>

                  {/* Asunto / Título breve */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      Título o resumen breve
                    </label>
                    <input
                      type="text"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder={`Ej: ${currentCategoryObj.label} para evento del auditorio`}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Contextual fields based on category */}
                  {selectedCategory === "lonas" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
                      <div>
                        <label className="text-[11px] font-bold text-amber-900 dark:text-amber-300 block mb-1">
                          Medidas deseadas (Ancho x Alto)
                        </label>
                        <input
                          type="text"
                          value={medidasLona}
                          onChange={(e) => setMedidasLona(e.target.value)}
                          placeholder="Ej: 3.00 x 2.00 m o 4x1.5m"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-amber-900 dark:text-amber-300 block mb-1">
                          Fecha requerida para instalación/evento
                        </label>
                        <input
                          type="date"
                          value={fechaRequerida}
                          onChange={(e) => setFechaRequerida(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  {selectedCategory === "playeras" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40">
                      <div>
                        <label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 block mb-1">
                          Desglose de tallas y cantidad
                        </label>
                        <input
                          type="text"
                          value={tallasPlayeras}
                          onChange={(e) => setTallasPlayeras(e.target.value)}
                          placeholder="Ej: 10 Chicas, 15 Medianas, 5 Grandes"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 block mb-1">
                          Fecha límite de entrega
                        </label>
                        <input
                          type="date"
                          value={fechaRequerida}
                          onChange={(e) => setFechaRequerida(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  {selectedCategory === "diplomado" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-200/60 dark:border-blue-900/40">
                      <div>
                        <label className="text-[11px] font-bold text-blue-900 dark:text-blue-300 block mb-1">
                          Módulo o generación del diplomado
                        </label>
                        <input
                          type="text"
                          value={moduloDiplomado}
                          onChange={(e) => setModuloDiplomado(e.target.value)}
                          placeholder="Ej: Módulo 4 - Inteligencia Emocional (Gen 12)"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-blue-300 dark:border-blue-800 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-blue-900 dark:text-blue-300 block mb-1">
                          Fecha para entrega de revisión
                        </label>
                        <input
                          type="date"
                          value={fechaRequerida}
                          onChange={(e) => setFechaRequerida(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-blue-300 dark:border-blue-800 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  {/* Descripción detallada */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      Descripción detallada del requerimiento <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder={currentCategoryObj.placeholder}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Prioridad y Enlace opcional */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        Nivel de Urgencia
                      </label>
                      <div className="flex gap-2">
                        {(["Baja", "Media", "Alta"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPrioridad(p)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                              prioridad === p
                                ? p === "Alta"
                                  ? "bg-rose-500 text-white shadow-xs"
                                  : p === "Media"
                                  ? "bg-amber-500 text-stone-950 shadow-xs"
                                  : "bg-stone-300 dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs"
                                : "bg-stone-100 dark:bg-stone-800 text-stone-500"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        Enlace a Drive / Archivos (Opcional)
                      </label>
                      <input
                        type="url"
                        value={adjuntoUrl}
                        onChange={(e) => setAdjuntoUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm sm:text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-98 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                        <span>Generando Ticket y Notificando a Laura...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Registrar Requerimiento y Obtener Ticket</span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-stone-400 mt-2">
                    Tu petición se enviará a la lista de espera de Laura y recibirás confirmación inmediata.
                  </p>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: RASTREAR TICKET */}
        {activeTab === "rastrear" && (
          <div className="space-y-6 max-w-xl mx-auto">
            {/* Search Input Card */}
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  Rastrea el Avance de tu Requerimiento
                </h3>
                <p className="text-xs text-stone-500">
                  Ingresa tu <strong>Folio de ticket (ej. REQ-8492)</strong> o el número de celular que registraste.
                </p>
              </div>

              <form onSubmit={handleSearchTickets} className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="REQ-8492 o tu celular..."
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearchingTicket}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm shadow-xs transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isSearchingTicket ? "Buscando..." : "Consultar"}
                </button>
              </form>

              {recentFolios.length > 0 && (
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-stone-400 block">
                    Tus tickets recientes en este dispositivo:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {recentFolios.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => {
                          setSearchQuery(f);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 dark:bg-stone-800 dark:hover:bg-amber-950/40 text-stone-700 dark:text-stone-300 font-mono text-xs font-bold border border-stone-200 dark:border-stone-700 transition-colors"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Results Display */}
            {hasSearched && (
              <div className="space-y-4">
                {searchResults.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-3">
                    <AlertCircle size={32} className="text-stone-400 mx-auto" />
                    <div className="font-bold text-stone-800 dark:text-stone-200 text-sm">
                      No encontramos solicitudes con "{searchQuery}"
                    </div>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                      Verifica que el folio esté bien escrito (ej: REQ-1234) o busca con los 10 dígitos de tu celular.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-stone-500 uppercase tracking-wider px-2">
                      Resultados encontrados ({searchResults.length}):
                    </div>

                    {searchResults.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                              {item.folio || item.id}
                            </span>
                            <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 mt-0.5">
                              {item.titulo}
                            </h4>
                            <span className="text-[11px] text-stone-400">
                              Registrado el {new Date(item.fechaIngreso).toLocaleDateString("es-ES")}
                            </span>
                          </div>
                          <div>{getTrackingBadge(item)}</div>
                        </div>

                        {/* Visual Progress Stepper */}
                        <div className="py-2">
                          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                            <div
                              className={`p-2 rounded-xl border ${
                                item.estadoTracking === "espera" || !item.estadoTracking
                                  ? "bg-amber-100 dark:bg-amber-950 border-amber-300 text-amber-900 dark:text-amber-300 font-extrabold"
                                  : "bg-stone-100 dark:bg-stone-800 border-stone-200 text-stone-600 dark:text-stone-400"
                              }`}
                            >
                              1. En Lista de Espera
                            </div>
                            <div
                              className={`p-2 rounded-xl border ${
                                item.estadoTracking === "proceso" || item.estadoTracking === "aceptado" || item.estado === "ConvertidaEnTarea"
                                  ? "bg-blue-100 dark:bg-blue-950 border-blue-300 text-blue-900 dark:text-blue-300 font-extrabold"
                                  : "bg-stone-100 dark:bg-stone-800 border-stone-200 text-stone-600 dark:text-stone-400"
                              }`}
                            >
                              2. Aceptado / En Proceso
                            </div>
                            <div
                              className={`p-2 rounded-xl border ${
                                item.estadoTracking === "completado" || item.estado === "Atendida"
                                  ? "bg-emerald-100 dark:bg-emerald-950 border-emerald-300 text-emerald-900 dark:text-emerald-300 font-extrabold"
                                  : "bg-stone-100 dark:bg-stone-800 border-stone-200 text-stone-600 dark:text-stone-400"
                              }`}
                            >
                              3. Terminado / Listo
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl">
                          {item.descripcion}
                        </p>

                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-[11px] text-stone-400">
                            Área: <strong>{item.area || "FGDLL"}</strong>
                          </span>
                          <a
                            href={makeWhatsAppUrl(item)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-xs flex items-center gap-1.5"
                          >
                            <MessageCircle size={14} className="text-emerald-600" />
                            <span>Consultar a Laura por WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Optional Auth Modal */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowAuthModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100">
                Iniciar Sesión (Opcional)
              </h3>
              <p className="text-xs text-stone-500">
                Guarda tu historial de solicitudes para no tener que rellenar tus datos cada vez.
              </p>
            </div>

            {authError && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
                {authError}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center justify-center gap-2 shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>

            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 text-center">
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-xs text-stone-500 hover:text-stone-800 font-semibold"
              >
                Continuar como invitado sin cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin PIN Access Modal */}
      {showAdminPinModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => {
            setShowAdminPinModal(false);
            setAdminPinInput("");
            setAdminPinError(null);
          }}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-stone-900 to-amber-600 dark:from-amber-500 dark:to-orange-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Plane size={17} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <span>Avión de Administradora ✈️</span>
                  </h3>
                  <p className="text-[10px] text-stone-500">Acceso exclusivo • Laura / Pepe Cortazar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdminPinModal(false);
                  setAdminPinInput("");
                  setAdminPinError(null);
                }}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1"
              >
                <X size={16} />
              </button>
            </div>

            {adminPinError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {adminPinError}
              </div>
            )}

            <form onSubmit={handleAdminPinSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Ingresa tu Contraseña de Avión de Admin:
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-3 text-stone-400" />
                  <input
                    type="password"
                    autoFocus
                    required
                    placeholder="Contraseña (110809)"
                    value={adminPinInput}
                    onChange={(e) => setAdminPinInput(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-1 text-center">
                  Contraseña autorizada: <strong>110809</strong>
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-black dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-950 font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5"
              >
                <Plane size={13} className="text-amber-400 dark:text-amber-600" />
                <span>Entrar a Avión de Admin ✈️</span>
              </button>
            </form>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200 dark:border-stone-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-stone-400">
                <span className="bg-white dark:bg-stone-900 px-2">o con mi correo Google</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGoogleAdminLogin}
                className="w-full py-2.5 px-3 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Acceder con Google (laurcortazar / jaguarcortazar)</span>
              </button>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 text-center leading-tight">
                Al iniciar sesión se sincronizarán todos tus dispositivos con la cuenta de Google cada minuto.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solicitud de Reconocimientos (Mini Web App) */}
      <ReconocimientoFormModal
        isOpen={showReconocimientoModal}
        onClose={() => setShowReconocimientoModal(false)}
        onSuccess={(folio) => {
          saveFolioLocal(folio);
        }}
      />

      {/* Modal de Consulta Pública de Reconocimientos Impresos y Enlace Drive */}
      <PublicReconocimientosImpresosModal
        isOpen={showReconocimientosImpresosModal}
        onClose={() => setShowReconocimientosImpresosModal(false)}
        onRequestNewClick={() => setShowReconocimientoModal(true)}
      />

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-6 text-center text-xs text-stone-400 bg-white/40 dark:bg-stone-900/40">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>Portal de Requerimientos</strong> • Fundación Grupo de los Diez Líderes
          </span>
          <span className="text-[11px]">
            Diseño • Playeras • Diplomado de Liderazgo • Soporte Tecnológico
          </span>
        </div>
      </footer>
    </div>
  );
}
