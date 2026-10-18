import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  Users,
  Check,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Copy,
  Sparkles,
} from "lucide-react";
import { playChime } from "../utils/audio";

export interface DuplicateCandidate {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  rol?: string;
  grupo?: string;
  zona?: string;
  casa?: string;
  generacion?: string;
  diplomado?: string;
  year?: string;
  tipoImpresion?: string;
  costo?: number;
  pagado?: boolean;
  estatus?: string;
  notas?: string;
  createdAt?: string;
}

interface DuplicateResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  groupReason?: "nombre" | "telefono" | "email";
  matchValue?: string;
  items: DuplicateCandidate[];
  onKeepOneAndDeleteOther: (keepId: string, deleteId: string, mergedData?: Partial<DuplicateCandidate>) => Promise<void>;
}

export default function DuplicateResolverModal({
  isOpen,
  onClose,
  title = "Resolver Alumnos Duplicados",
  groupReason = "nombre",
  matchValue = "",
  items,
  onKeepOneAndDeleteOther,
}: DuplicateResolverModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedKeepId, setSelectedKeepId] = useState<string>(items[0]?.id || "");

  if (!isOpen || items.length < 2) return null;

  const itemA = items[0];
  const itemB = items[1];

  const handleResolve = async (keepId: string, deleteId: string) => {
    setIsProcessing(true);
    try {
      const keepItem = items.find((it) => it.id === keepId)!;
      const deleteItem = items.find((it) => it.id === deleteId)!;

      // Smart merge: if deleteItem has phone or email or notes that keepItem lacks, preserve them
      const merged: Partial<DuplicateCandidate> = {};
      if (!keepItem.telefono && deleteItem.telefono) merged.telefono = deleteItem.telefono;
      if (!keepItem.email && deleteItem.email) merged.email = deleteItem.email;
      if (!keepItem.notas && deleteItem.notas) {
        merged.notas = deleteItem.notas;
      } else if (keepItem.notas && deleteItem.notas && keepItem.notas !== deleteItem.notas) {
        merged.notas = `${keepItem.notas} | Nota fusionada: ${deleteItem.notas}`;
      }

      await onKeepOneAndDeleteOther(keepId, deleteId, merged);
      playChime("work_done");
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error al resolver los registros duplicados.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-5 animate-in zoom-in-95 my-auto max-h-[94vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h3 className="font-black text-stone-900 dark:text-stone-100 text-base sm:text-lg">
                {title}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Coincidencia detectada por{" "}
                <strong className="text-amber-600 dark:text-amber-400">
                  {groupReason === "nombre" ? "Nombre similar" : groupReason === "telefono" ? "Teléfono idéntico" : "Correo idéntico"}
                </strong>
                : <span className="font-mono font-bold">"{matchValue}"</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Side by side comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[itemA, itemB].map((item, idx) => {
            const isKeep = selectedKeepId === item.id;
            const otherId = idx === 0 ? itemB.id : itemA.id;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedKeepId(item.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 relative ${
                  isKeep
                    ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
                    : "border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 hover:border-amber-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                    Opción {idx === 0 ? "A" : "B"} {idx === 0 ? "(Primero)" : "(Más reciente)"}
                  </span>
                  {isKeep ? (
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check size={14} />
                      <span>Seleccionado para conservar</span>
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400">Clic para conservar este</span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Nombre:</span>
                    <strong className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                      {item.nombre}
                    </strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-stone-200/60 dark:border-stone-700">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Teléfono:</span>
                      <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                        {item.telefono || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Email:</span>
                      <span className="text-stone-800 dark:text-stone-200 truncate block">
                        {item.email || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Grupo / Casa:</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {item.grupo || item.casa || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Zona / Rol:</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {item.zona || item.rol || "—"}
                      </span>
                    </div>
                  </div>

                  {(item.diplomado || item.generacion) && (
                    <div className="text-[11px]">
                      <span className="text-stone-400 block text-[10px]">Diplomado / Gen:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {item.diplomado || ""} {item.year ? `(${item.year})` : ""} {item.generacion || ""}
                      </span>
                    </div>
                  )}

                  {item.notas && (
                    <div className="p-2 rounded-xl bg-white/70 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800 text-[11px]">
                      <span className="text-[10px] text-stone-400 font-bold block">Notas:</span>
                      <span className="italic text-stone-700 dark:text-stone-300">"{item.notas}"</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResolve(item.id, otherId);
                    }}
                    className={`w-full py-2 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      isKeep
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                        : "bg-stone-200 hover:bg-stone-300 text-stone-800 dark:bg-stone-700 dark:text-stone-200"
                    }`}
                  >
                    <Check size={14} />
                    <span>Conservar este y eliminar el otro</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
          <p className="text-stone-500 text-[11px]">
            💡 Al conservar uno, cualquier dato faltante (teléfono, notas) se fusionará automáticamente para no perder información.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold transition"
          >
            Cerrar sin cambios
          </button>
        </div>
      </div>
    </div>
  );
}
