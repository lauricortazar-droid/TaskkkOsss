import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Award,
  ExternalLink,
  GraduationCap,
  CheckCircle2,
  Calendar,
  Layers,
  FolderOpen,
  Copy,
  Check,
  Printer,
  Sparkles,
  ArrowRight,
  MessageCircle,
  HelpCircle,
  Users,
  ShieldCheck,
} from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { playChime } from "../utils/audio";
import { buildWhatsAppUrl } from "../utils/whatsapp";

interface PublicReconocimientosImpresosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestNewClick?: () => void;
}

export interface DiplomaRecord {
  id: string;
  diplomado: string;
  year: string;
  tipoImpresion: string;
  impreso: boolean;
  digital: boolean;
  entregado: boolean;
  driveUrl?: string;
  folio?: string;
  createdAt?: string;
}

export interface GraduadoItem {
  key: string;
  nombreOriginal: string;
  nombreFormateado: string;
  primerApellido: string;
  grupo: string;
  zona: string;
  rol: string;
  diplomas: DiplomaRecord[];
  yearsSummary: string; // e.g. "2022 - 2025 - 2026"
  singleLineDisplay: string; // "- Nombre (primer apellido) Grupo Zona Diplomas: 2022 - 2025 - 2026"
  hasAnyDrive: boolean;
  driveCount: number;
}

/**
 * Formatea el nombre mostrando exclusivamente su nombre y primer apellido,
 * tal como solicitó el usuario (sin segundo apellido, sin paréntesis y sin nombres intermedios innecesarios):
 * - "Edgar Iván Batún López" -> "Edgar Batún"
 * - "Juan Carlos Pérez Gómez" -> "Juan Pérez"
 * - "Laura Cortazar" -> "Laura Cortazar"
 */
export function formatNombrePrimerApellido(nombre: string): {
  formattedName: string;
  primerApellido: string;
} {
  const clean = (nombre || "").replace(/[()]/g, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { formattedName: "Estudiante", primerApellido: "" };
  }
  if (parts.length === 1) {
    return { formattedName: parts[0], primerApellido: parts[0] };
  }
  if (parts.length === 2) {
    return { formattedName: `${parts[0]} ${parts[1]}`, primerApellido: parts[1] };
  }
  if (parts.length === 3) {
    // Casos de 3 palabras en español:
    // Caso A: [Nombre] [Segundo Nombre] [Primer Apellido] -> ej: "Edgar Iván Batún", "Juan Carlos Pérez"
    // Caso B: [Nombre] [Primer Apellido] [Segundo Apellido] -> ej: "Edgar Batún López", "Laura Cortazar Ruiz"
    const commonSecondNames = [
      "carlos", "luis", "alberto", "antonio", "manuel", "fernando", "javier",
      "enrique", "guadalupe", "iván", "ivan", "david", "eduardo", "alejandro",
      "miguel", "ángel", "angel", "josé", "jose", "maría", "maria", "jesus", "jesús"
    ];
    if (commonSecondNames.includes(parts[1].toLowerCase())) {
      return { formattedName: `${parts[0]} ${parts[2]}`, primerApellido: parts[2] };
    }
    return { formattedName: `${parts[0]} ${parts[1]}`, primerApellido: parts[1] };
  }
  // 4 o más palabras (ej: "Edgar Iván Batún López", "Juan Carlos Pérez Gómez")
  // Nombre: parts[0] ("Edgar")
  // Primer apellido: parts[parts.length - 2] ("Batún")
  const primerNombre = parts[0];
  const primerApellido = parts[parts.length - 2];
  return {
    formattedName: `${primerNombre} ${primerApellido}`,
    primerApellido,
  };
}

export default function PublicReconocimientosImpresosModal({
  isOpen,
  onClose,
  onRequestNewClick,
}: PublicReconocimientosImpresosModalProps) {
  const [graduados, setGraduados] = useState<GraduadoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("todos");
  const [onlyWithDrive, setOnlyWithDrive] = useState(true); // Default to true as user requested only those linked to drive
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Firestore real-time listener para reconocimientos
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    try {
      const unsub = onSnapshot(
        collection(db, "reconocimientos"),
        (snapshot) => {
          // Agrupar por participante normalizado
          const studentMap = new Map<string, {
            nombreOriginal: string;
            grupo: string;
            zona: string;
            rol: string;
            diplomas: DiplomaRecord[];
          }>();

          snapshot.forEach((snapDoc) => {
            const d = snapDoc.data();
            const isImpreso = Boolean(d.impreso);
            const isDigital = Boolean(d.digital);
            const isEntregado = Boolean(d.entregado);
            const hasDrive = Boolean(d.driveUrl && d.driveUrl.trim() !== "");

            // Considerar los que ya fueron impresos, o tienen driveUrl, o marcados como digital/entregado
            if (isImpreso || hasDrive || isDigital || isEntregado) {
              const rawName = (d.nombre || "Estudiante").trim();
              const normKey = rawName.toLowerCase();

              const diplomaObj: DiplomaRecord = {
                id: snapDoc.id,
                diplomado: d.diplomado || "Diplomado de Liderazgo",
                year: String(d.year || "2026").trim(),
                tipoImpresion: d.tipoImpresion || "Primera Impresión",
                impreso: isImpreso,
                digital: isDigital,
                entregado: isEntregado,
                driveUrl: d.driveUrl ? String(d.driveUrl).trim() : undefined,
                folio: d.folio || undefined,
                createdAt: d.createdAt,
              };

              if (!studentMap.has(normKey)) {
                studentMap.set(normKey, {
                  nombreOriginal: rawName,
                  grupo: d.grupo || "G-1",
                  zona: d.zona || "General",
                  rol: d.rol || "Líder",
                  diplomas: [diplomaObj],
                });
              } else {
                const existing = studentMap.get(normKey)!;
                // Si este registro tiene mejores datos de grupo o zona, usarlos
                if (d.grupo && (!existing.grupo || existing.grupo === "G-1")) existing.grupo = d.grupo;
                if (d.zona && (!existing.zona || existing.zona === "General")) existing.zona = d.zona;

                // Evitar duplicar el mismo id o el mismo diploma en el mismo año
                const dupIndex = existing.diplomas.findIndex(
                  (dip) => dip.id === diplomaObj.id || (dip.year === diplomaObj.year && dip.diplomado === diplomaObj.diplomado)
                );
                if (dupIndex >= 0) {
                  // Si el nuevo tiene driveUrl y el anterior no, actualizar
                  if (!existing.diplomas[dupIndex].driveUrl && diplomaObj.driveUrl) {
                    existing.diplomas[dupIndex] = diplomaObj;
                  }
                } else {
                  existing.diplomas.push(diplomaObj);
                }
              }
            }
          });

          // Convertir el Map en lista de GraduadoItem
          const list: GraduadoItem[] = [];
          studentMap.forEach((data, normKey) => {
            const { formattedName, primerApellido } = formatNombrePrimerApellido(data.nombreOriginal);

            // Ordenar los diplomas cronológicamente por año
            const sortedDiplomas = [...data.diplomas].sort((a, b) => a.year.localeCompare(b.year));

            // Extraer años únicos en orden
            const uniqueYears = Array.from(new Set(sortedDiplomas.map((dip) => dip.year))).sort();
            const yearsSummary = uniqueYears.length > 0 ? uniqueYears.join(" - ") : "2026";

            // Formato exacto solicitado por el usuario:
            // - Nombre (primer apellido) Grupo Zona Diplomas: 2022 - 2025 - 2026
            const singleLineDisplay = `- ${formattedName} ${data.grupo} ${data.zona} Diplomas: ${yearsSummary}`;

            const driveCount = sortedDiplomas.filter((d) => Boolean(d.driveUrl)).length;

            list.push({
              key: normKey,
              nombreOriginal: data.nombreOriginal,
              nombreFormateado: formattedName,
              primerApellido,
              grupo: data.grupo,
              zona: data.zona,
              rol: data.rol,
              diplomas: sortedDiplomas,
              yearsSummary,
              singleLineDisplay,
              hasAnyDrive: driveCount > 0,
              driveCount,
            });
          });

          // Ordenar alfabéticamente por nombre
          list.sort((a, b) => a.nombreOriginal.localeCompare(b.nombreOriginal));

          setGraduados(list);
          setIsLoading(false);
        },
        (error) => {
          console.warn("Error reading reconocimientos impresos:", error);
          setIsLoading(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.warn("Firestore listener initialization failed:", err);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Lista de años disponibles en los diplomas
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    graduados.forEach((g) => {
      g.diplomas.forEach((d) => {
        if (d.year) years.add(d.year);
      });
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [graduados]);

  // Filtrado de graduados
  const filteredGraduados = useMemo(() => {
    return graduados.filter((g) => {
      // Filtro por drive
      if (onlyWithDrive && !g.hasAnyDrive) {
        return false;
      }

      // Filtro por año
      if (selectedYear !== "todos") {
        const hasYear = g.diplomas.some((d) => d.year === selectedYear);
        if (!hasYear) return false;
      }

      // Filtro por buscador
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = g.nombreOriginal.toLowerCase().includes(q);
        const matchApellido = g.primerApellido.toLowerCase().includes(q);
        const matchGrupo = g.grupo.toLowerCase().includes(q);
        const matchZona = g.zona.toLowerCase().includes(q);
        const matchSingle = g.singleLineDisplay.toLowerCase().includes(q);
        const matchDiploma = g.diplomas.some(
          (d) => d.diplomado.toLowerCase().includes(q) || d.year.includes(q)
        );
        return matchName || matchApellido || matchGrupo || matchZona || matchSingle || matchDiploma;
      }

      return true;
    });
  }, [graduados, onlyWithDrive, selectedYear, searchQuery]);

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    playChime("tick");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleAskSupportWhatsApp = (g: GraduadoItem) => {
    const msg = `Hola Laura, consulto en el portal el reconocimiento de ${g.nombreOriginal} (${g.grupo} • ${g.zona} • Diplomas: ${g.yearsSummary}). ¿Me podrías compartir el enlace de Google Drive para descargarlo? ¡Muchas gracias!`;
    const url = buildWhatsAppUrl("19999011852", msg);
    window.open(url, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal - Destacado GRADUADOS */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner shrink-0">
              🎓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  <span>GRADUADOS</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black uppercase tracking-wider shadow-xs">
                  Reconocimientos Impresos & Drive
                </span>
              </div>
              <p className="text-xs sm:text-sm text-indigo-100 max-w-xl font-medium mt-0.5">
                Consulta los reconocimientos oficiales ya impresos con enlace público a Google Drive. Haz clic en tu diploma para abrirlo y guardarlo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* Buscador & Filtros */}
        <div className="p-4 sm:p-5 bg-white dark:bg-stone-850 border-b border-stone-200 dark:border-stone-800 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por tu nombre, apellido, grupo, zona o año..."
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-stone-100 dark:bg-stone-800 border-none text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-stone-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Toggle de Enlace a Drive */}
            <button
              type="button"
              onClick={() => {
                setOnlyWithDrive(!onlyWithDrive);
                playChime("tick");
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                onlyWithDrive
                  ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
              }`}
              title="Filtrar solo los graduados con enlace público a Google Drive"
            >
              <FolderOpen size={14} />
              <span>Solo con Enlace a Drive ({graduados.filter((g) => g.hasAnyDrive).length})</span>
            </button>
          </div>

          {/* Chips de filtro por Año / Generación */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar size={12} className="text-indigo-600" />
              <span>Diplomas / Años:</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedYear("todos");
                playChime("tick");
              }}
              className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                selectedYear === "todos"
                  ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-2xs"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
              }`}
            >
              Todos ({graduados.length})
            </button>
            {availableYears.map((yr) => {
              const cnt = graduados.filter((g) => g.diplomas.some((d) => d.year === yr)).length;
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    setSelectedYear(yr);
                    playChime("tick");
                  }}
                  className={`px-3 py-1 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                    selectedYear === yr
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
                  }`}
                >
                  <span>{yr}</span>
                  <span className="text-[10px] opacity-75">({cnt})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de Graduados */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-stone-500 font-medium">
                Cargando lista oficial de graduados y enlaces a Google Drive...
              </p>
            </div>
          ) : filteredGraduados.length === 0 ? (
            <div className="py-14 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
                <GraduationCap size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                  No se encontraron graduados con esos criterios
                </h3>
                <p className="text-xs text-stone-500">
                  {searchQuery
                    ? `No hay coincidencias para "${searchQuery}". Verifica la ortografía de tu nombre o apellido.`
                    : onlyWithDrive
                    ? "No hay reconocimientos con enlace de Google Drive en este filtro. Desmarca el filtro de Drive para ver todos los impresos."
                    : "Aún no hay graduados registrados con estatus de impreso para este filtro."}
                </p>
              </div>

              {onlyWithDrive && (
                <button
                  type="button"
                  onClick={() => setOnlyWithDrive(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-300 transition cursor-pointer"
                >
                  Ver todos los graduados impresos (con y sin link)
                </button>
              )}

              {onRequestNewClick && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRequestNewClick();
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition shadow-md inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>📜 Solicitar Impresión de mi Reconocimiento</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Encabezado descriptivo de la lista */}
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 px-1 pb-1">
                <span className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Users size={13} className="text-indigo-600" />
                  <span>Listado Oficial de Graduados</span>
                </span>
                <span>{filteredGraduados.length} participante(s)</span>
              </div>

              {/* Tarjetas de Graduados con el formato exacto requerido */}
              {filteredGraduados.map((item) => {
                const initials = (item.nombreFormateado || "E")
                  .split(" ")
                  .filter(Boolean)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "🎓";

                return (
                  <div
                    key={item.key}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition flex flex-col justify-between space-y-3.5 group"
                  >
                    {/* Encabezado Principal del Graduado */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0 tracking-wider">
                          {initials}
                        </div>
                        <div>
                          <h4 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 leading-tight tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {item.nombreFormateado}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {item.rol || "Líder"}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              Grupo {item.grupo}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              Zona {item.zona}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Resumen de diplomas y botón de copiado */}
                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <div className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 text-xs font-black">
                          <span className="text-[9px] uppercase text-purple-600 dark:text-purple-400 block font-bold leading-none mb-0.5">
                            Diplomas
                          </span>
                          <span>{item.yearsSummary}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.singleLineDisplay);
                            setCopiedId(item.key);
                            setTimeout(() => setCopiedId((curr) => curr === item.key ? null : curr), 2000);
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-stone-600 dark:text-stone-300 hover:text-indigo-600 bg-stone-50 dark:bg-stone-800 hover:bg-indigo-50 border border-stone-200 dark:border-stone-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          title="Copiar registro de graduado"
                        >
                          {copiedId === item.key ? (
                            <>
                              <Check size={13} className="text-emerald-600" />
                              <span className="text-[11px] text-emerald-600 font-bold">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span className="text-[11px] hidden sm:inline">Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  {/* Botones de acción directos a Google Drive para cada diploma */}
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2">
                    <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                      <FolderOpen size={13} className="text-indigo-600" />
                      <span>Reconocimientos Digitales en Google Drive:</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.diplomas.map((dip) => (
                        <div
                          key={dip.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${
                            dip.driveUrl
                              ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200"
                              : "bg-stone-100 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-500"
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 font-bold truncate">
                              <span className="px-1.5 py-0.2 rounded-md bg-white dark:bg-stone-800 text-[10px] font-black border border-stone-300 dark:border-stone-700">
                                {dip.year}
                              </span>
                              <span className="truncate">{dip.diplomado}</span>
                            </div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 shadow-2xs">
                              {dip.tipoImpresion}
                            </span>
                          </div>

                          {dip.driveUrl ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={dip.driveUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                                title="Abrir reconocimiento en Google Drive"
                              >
                                <span>Ver Reconocimiento Digital</span>
                                <ExternalLink size={12} />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(dip.driveUrl!, dip.id)}
                                className="p-1.5 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-300 transition cursor-pointer"
                                title="Copiar enlace"
                              >
                                {copiedId === dip.id ? (
                                  <Check size={13} className="text-emerald-600" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-stone-400 italic shrink-0">
                              En vinculación
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Si no tiene Drive aún, botón de WhatsApp para pedirlo */}
                    {!item.hasAnyDrive && (
                      <div className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200 dark:border-amber-800/50">
                        <span className="text-amber-800 dark:text-amber-300 text-[11px] font-medium">
                          ⚠️ Tu enlace de Drive se está subiendo por administración.
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAskSupportWhatsApp(item)}
                          className="px-2.5 py-1 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                        >
                          <MessageCircle size={11} />
                          <span>Solicitar por WhatsApp</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* Footer Info & New Request CTA */}
        <div className="p-4 bg-stone-100 dark:bg-stone-850 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>
              Graduados mostrados: <strong>{filteredGraduados.length}</strong> ({filteredGraduados.filter((g) => g.hasAnyDrive).length} con enlace a Drive)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onRequestNewClick && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestNewClick();
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <GraduationCap size={14} />
                <span>¿No apareces en la lista? Solicitar Impresión</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-50 transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
