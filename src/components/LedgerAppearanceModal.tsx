import React, { useState } from "react";
import {
  Palette,
  Check,
  X,
  Sparkles,
  Eye,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Clock,
  FileText,
} from "lucide-react";
import {
  LedgerThemeConfig,
  LedgerThemePreset,
  LEDGER_THEME_PRESETS,
  analyzeBgContrast,
  getLedgerContrastStyles,
} from "../utils/contrastColor";
import { playChime } from "../utils/audio";

interface LedgerAppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: LedgerThemeConfig;
  onSaveConfig: (newConfig: Partial<LedgerThemeConfig>) => Promise<void>;
}

export default function LedgerAppearanceModal({
  isOpen,
  onClose,
  currentConfig,
  onSaveConfig,
}: LedgerAppearanceModalProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    currentConfig.presetId || "classic_white"
  );
  const [customBg, setCustomBg] = useState<string>(
    currentConfig.bg || "#ffffff"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const contrastDetails = analyzeBgContrast(customBg);
  const previewStyles = getLedgerContrastStyles(customBg);

  const handleSelectPreset = (preset: LedgerThemePreset) => {
    setSelectedPresetId(preset.id);
    setCustomBg(preset.bg);
    playChime("tick");
  };

  const handleColorInputChange = (color: string) => {
    setCustomBg(color);
    setSelectedPresetId("custom");
  };

  const handleApply = async () => {
    setIsSaving(true);
    try {
      await onSaveConfig({
        bg: customBg,
        presetId: selectedPresetId,
      });
      playChime("success");
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error("Error saving ledger appearance:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    setSelectedPresetId("classic_white");
    setCustomBg("#ffffff");
    playChime("tick");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ledger-appearance-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Cabecera del Modal */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-stone-950 flex items-center justify-center text-xl font-black shadow-md shrink-0">
              <Palette size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="ledger-appearance-modal-title"
                  className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2"
                >
                  <span>Apariencia del Ledger</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-mono shadow-xs">
                    Admin • Contraste Automático
                  </span>
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 font-medium mt-0.5">
                Elige el color de fondo para el Ledger. Las variables CSS adaptan automáticamente la tipografía para garantizar 100% de legibilidad.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-stone-50/70 dark:bg-stone-950/40">
          {/* VISTA PREVIA EN TIEMPO REAL CON CONTRASTE CALCULADO */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                <Eye size={14} className="text-amber-500" />
                <span>Vista Previa en Tiempo Real:</span>
              </span>

              {/* Medidor de Contraste Automático */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                  <ShieldCheck size={11} />
                  <span>Contraste: {contrastDetails.contrastRatio}:1 (WCAG {contrastDetails.contrastRating})</span>
                </span>
                <span className="text-[11px] font-bold text-stone-500">
                  {contrastDetails.isDark ? "Texto Blanco Automático" : "Texto Oscuro Automático"}
                </span>
              </div>
            </div>

            {/* Simulación del contenedor Ledger con los estilos de variables CSS aplicados */}
            <div
              className="p-4 sm:p-5 rounded-3xl border shadow-md transition-all duration-300 space-y-3"
              style={{
                ...previewStyles,
                backgroundColor: customBg,
              }}
            >
              {/* Header preview */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--ledger-border)]">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📋</span>
                  <span className="font-bold text-sm tracking-tight ledger-text-primary">
                    Ledger Maestro de Tareas
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full ledger-badge">
                    42 tareas
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold ledger-text-secondary">
                    Filtro: Activas
                  </span>
                </div>
              </div>

              {/* Sample Row Preview */}
              <div className="p-3.5 rounded-2xl border border-[var(--ledger-border)] bg-[var(--ledger-surface)] shadow-2xs space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono font-bold text-xs ledger-text-muted mt-0.5">
                      #104
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-semibold text-xs ledger-text-primary">
                          Laura Cortazar
                        </span>
                        <span className="text-[10px] uppercase tracking-wider ledger-text-muted">
                          • FGDLL
                        </span>
                      </div>
                      <p className="text-xs font-medium ledger-text-primary leading-snug">
                        Validación de reconocimientos impresos para graduados del diplomado 2026
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 shrink-0">
                    <Clock size={11} />
                    <span>Pendiente</span>
                  </span>
                </div>

                {/* Subnotes Preview */}
                <div className="p-2 rounded-xl border border-[var(--ledger-border-subtle)] bg-[var(--ledger-surface-muted)] text-[11px] ledger-text-secondary flex items-center gap-2">
                  <FileText size={12} className="shrink-0 text-amber-500" />
                  <span className="line-clamp-1">
                    Nota: Los diplomas están firmados y listos en carpetas compartidas de Drive.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PALETA DE PRESETS DE COLOR */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>Paletas Oficiales Disponibles:</span>
              </span>
              <span className="text-[11px] font-bold text-stone-400">
                {LEDGER_THEME_PRESETS.length} estilos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {LEDGER_THEME_PRESETS.map((preset) => {
                const isSelected =
                  selectedPresetId === preset.id ||
                  customBg.toLowerCase() === preset.bg.toLowerCase();
                const metrics = analyzeBgContrast(preset.bg);

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-2xl text-left transition-all border flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-400/30 shadow-xs"
                        : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700"
                    }`}
                  >
                    {/* Swatch circle with check */}
                    <span
                      className="w-7 h-7 rounded-xl border-2 border-stone-300 dark:border-stone-700 shadow-xs shrink-0 flex items-center justify-center text-xs font-bold transition-transform"
                      style={{
                        backgroundColor: preset.bg,
                        color: metrics.textPrimary,
                      }}
                    >
                      {isSelected ? <Check size={14} className="stroke-[3]" /> : null}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-stone-900 dark:text-stone-100 truncate">
                          {preset.name}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0">
                          {preset.tag}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SELECTOR DE COLOR HEX LIBRE */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
              <Sliders size={14} className="text-indigo-500" />
              <span>Color de Fondo Personalizado:</span>
            </span>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customBg.startsWith("#") ? customBg : "#ffffff"}
                  onChange={(e) => handleColorInputChange(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-stone-300 dark:border-stone-700 cursor-pointer p-0.5 bg-white dark:bg-stone-800 shadow-2xs"
                  title="Elegir cualquier color con el selector"
                />
                <input
                  type="text"
                  value={customBg}
                  onChange={(e) => handleColorInputChange(e.target.value)}
                  placeholder="#ffffff"
                  className="w-32 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <span>El sistema calculará las variables CSS para mantener siempre la tipografía legible.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con Acciones */}
        <div className="p-4 sm:p-5 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetDefault}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Restablecer Blanco Clásico</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-black text-xs transition flex items-center gap-2 shadow-md active:scale-95 cursor-pointer ring-2 ring-emerald-400/40 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 size={14} className="text-stone-950" />
                  <span>¡Aplicado con Éxito!</span>
                </>
              ) : (
                <>
                  <Palette size={14} className="stroke-[2.5]" />
                  <span>Guardar y Aplicar Color</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
