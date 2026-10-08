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
  FileCheck,
  FolderOpen,
  Copy,
  Check,
  Printer,
  Sparkles,
  ArrowRight,
  MessageCircle,
  HelpCircle,
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

export interface ReconocimientoPublicoItem {
  id: string;
  nombre: string;
  diplomado: string;
  year: string;
  rol: string;
  grupo?: string;
  zona?: string;
  tipoImpresion: string;
  impreso: boolean;
  digital: boolean;
  entregado: boolean;
  driveUrl?: string;
  createdAt?: string;
}

export default function PublicReconocimientosImpresosModal({
  isOpen,
  onClose,
  onRequestNewClick,
}: PublicReconocimientosImpresosModalProps) {
  const [records, setRecords] = useState<ReconocimientoPublicoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("todos");
  const [onlyWithDrive, setOnlyWithDrive] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Firestore real-time listener
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    try {
      const unsub = onSnapshot(
        collection(db, "reconocimientos"),
        (snapshot) => {
          const list: ReconocimientoPublicoItem[] = [];
          snapshot.forEach((snapDoc) => {
            const d = snapDoc.data();
            // Considerar reconocimientos que ya fueron impresos o marcados como digital/entregado
            const isImpreso = Boolean(d.impreso);
            const isDigital = Boolean(d.digital);
            const isEntregado = Boolean(d.entregado);

            // Mostrar los que ya fueron impresos o listos digitalmente
            if (isImpreso || isDigital || isEntregado || d.driveUrl) {
              list.push({
                id: snapDoc.id,
                nombre: d.nombre || "Alumno",
                diplomado: d.diplomado || "Diplomado de Liderazgo",
                year: String(d.year || "2026"),
                rol: d.rol || "Líder",
                grupo: d.grupo || "G-1",
                zona: d.zona || "General",
                tipoImpresion: d.tipoImpresion || "Primera Impresión",
                impreso: isImpreso,
                digital: isDigital,
                entregado: isEntregado,
                driveUrl: d.driveUrl || undefined,
                createdAt: d.createdAt,
              });
            }
          });

          // Deduplicar por nombre y año
          const unique = new Map<string, ReconocimientoPublicoItem>();
          list.forEach((item) => {
            const key = `${item.nombre.trim().toLowerCase()}-${item.year}-${item.diplomado}`;
            if (!unique.has(key)) {
              unique.set(key, item);
            } else {
              // Si uno tiene driveUrl, preferirlo
              const existing = unique.get(key)!;
              if (!existing.driveUrl && item.driveUrl) {
                unique.set(key, item);
              }
            }
          });

          // Ordenar alfabéticamente por nombre
          const sorted = Array.from(unique.values()).sort((a, b) =>
            a.nombre.localeCompare(b.nombre)
          );

          setRecords(sorted);
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

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    records.forEach((r) => {
      if (r.year) years.add(r.year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [records]);

  // Filtered list
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedYear !== "todos" && r.year !== selectedYear) {
        return false;
      }
      if (onlyWithDrive && !r.driveUrl) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.nombre.toLowerCase().includes(q);
        const matchDip = r.diplomado.toLowerCase().includes(q);
        const matchZona = (r.zona || "").toLowerCase().includes(q);
        const matchGrupo = (r.grupo || "").toLowerCase().includes(q);
        const matchId = r.id.toLowerCase().includes(q);
        return matchName || matchDip || matchZona || matchGrupo || matchId;
      }
      return true;
    });
  }, [records, selectedYear, onlyWithDrive, searchQuery]);

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    playChime("tick");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleAskSupportWhatsApp = (rec: ReconocimientoPublicoItem) => {
    const msg = `Hola Laura, consulto en el portal el reconocimiento de ${rec.nombre} (${rec.diplomado} ${rec.year}) con folio ${rec.id}. ¿Me podrías compartir el enlace de Google Drive para descargarlo? ¡Muchas gracias!`;
    const url = buildWhatsAppUrl("19999011852", msg);
    window.open(url, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner shrink-0">
              🎓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Reconocimientos Impresos y Digitales
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black uppercase tracking-wider">
                  Google Drive Público
                </span>
              </div>
              <p className="text-xs text-indigo-100 max-w-xl">
                Consulta la lista de reconocimientos oficiales ya impresos. Haz clic en el enlace para abrir y descargar tu archivo digital en Google Drive.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar & Filters */}
        <div className="p-4 sm:p-5 bg-white dark:bg-stone-850 border-b border-stone-200 dark:border-stone-800 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por tu nombre, diplomado, zona o folio..."
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

            {/* Drive Toggle */}
            <button
              type="button"
              onClick={() => setOnlyWithDrive(!onlyWithDrive)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                onlyWithDrive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
              }`}
            >
              <FolderOpen size={14} />
              <span>Solo con Enlace a Drive</span>
            </button>
          </div>

          {/* Year Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">
              Año / Generación:
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear("todos")}
              className={`px-3 py-1 rounded-xl font-bold transition ${
                selectedYear === "todos"
                  ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
              }`}
            >
              Todos ({records.length})
            </button>
            {availableYears.map((yr) => {
              const cnt = records.filter((r) => r.year === yr).length;
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3 py-1 rounded-xl font-bold transition ${
                    selectedYear === yr
                      ? "bg-indigo-600 text-white"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200"
                  }`}
                >
                  {yr} ({cnt})
                </button>
              );
            })}
          </div>
        </div>

        {/* Records List Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-stone-500 font-medium">
                Cargando lista de reconocimientos impresos...
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-14 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
                <GraduationCap size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                  No se encontraron reconocimientos con esos criterios
                </h3>
                <p className="text-xs text-stone-500">
                  {searchQuery
                    ? `No hay coincidencias para "${searchQuery}". Verifica la ortografía de tu nombre.`
                    : "Aún no hay reconocimientos registrados con estatus de impreso para este filtro."}
                </p>
              </div>

              {onRequestNewClick && (
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
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredRecords.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition flex flex-col justify-between space-y-3 group"
                >
                  {/* Top info */}
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-black text-stone-900 dark:text-stone-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {item.nombre}
                        </h4>
                        <p className="text-xs font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1.5 mt-0.5">
                          <span>{item.diplomado}</span>
                          <span className="text-stone-400">•</span>
                          <span className="text-indigo-600 dark:text-indigo-400">
                            Gen. {item.year}
                          </span>
                        </p>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {item.impreso && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black flex items-center gap-1">
                            <Printer size={10} />
                            <span>Impreso</span>
                          </span>
                        )}
                        {item.digital && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold">
                            Digital OK
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400 pt-1">
                      {item.rol && (
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 font-medium">
                          {item.rol}
                        </span>
                      )}
                      {item.zona && (
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 font-medium">
                          Zona {item.zona}
                        </span>
                      )}
                      {item.grupo && (
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 font-medium">
                          {item.grupo}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Drive Action Button */}
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                    {item.driveUrl ? (
                      <div className="flex items-center gap-2 w-full">
                        <a
                          href={item.driveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs transition shadow-sm flex items-center justify-center gap-2 group/btn cursor-pointer"
                        >
                          <FolderOpen size={14} className="shrink-0" />
                          <span>Abrir Reconocimiento Digital</span>
                          <ExternalLink size={12} className="opacity-70 group-hover/btn:opacity-100" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleCopyLink(item.driveUrl!, item.id)}
                          className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-300 transition shrink-0"
                          title="Copiar enlace de Google Drive"
                        >
                          {copiedId === item.id ? (
                            <Check size={14} className="text-emerald-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full text-xs">
                        <span className="text-[11px] text-stone-400 italic">
                          Enlace Drive en vinculación
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAskSupportWhatsApp(item)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 text-stone-600 dark:text-stone-400 font-bold text-[11px] transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle size={13} className="text-emerald-500" />
                          <span>Solicitar archivo</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info & New Request CTA */}
        <div className="p-4 bg-stone-100 dark:bg-stone-850 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>
              Total mostrados: <strong>{filteredRecords.length}</strong> reconocimientos impresos/listos
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
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <GraduationCap size={14} />
                <span>¿No estás en la lista? Solicitar Impresión</span>
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
