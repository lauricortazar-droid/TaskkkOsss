import React, { useState } from "react";
import {
  Palette,
  Check,
  X,
  Sparkles,
  Eye,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import {
  GraduadosTheme,
  GraduadosThemeId,
  GRADUADOS_THEMES,
  GraduadosThemeConfig,
  getGraduadosTheme,
  GRADUADOS_NAME_COLOR_PRESETS,
  NameColorPreset,
} from "../utils/graduadosThemes";
import { playChime } from "../utils/audio";

interface GraduadosAppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: GraduadosThemeConfig;
  onSaveConfig: (newConfig: Partial<GraduadosThemeConfig>) => Promise<void>;
}

export default function GraduadosAppearanceModal({
  isOpen,
  onClose,
  currentConfig,
  onSaveConfig,
}: GraduadosAppearanceModalProps) {
  const [selectedThemeId, setSelectedThemeId] = useState<GraduadosThemeId>(
    currentConfig.themeId || "indigo_royal"
  );
  const [nameColorPreset, setNameColorPreset] = useState<string>(
    currentConfig.nameColorPreset || "carbon_black"
  );
  const [nameColorHex, setNameColorHex] = useState<string>(
    currentConfig.nameColorHex || "#0c0a09"
  );
  const [applyToPublicPortal, setApplyToPublicPortal] = useState<boolean>(
    currentConfig.applyToPublicPortal !== false
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const previewTheme = getGraduadosTheme(selectedThemeId);

  const handleSelectTheme = (themeId: GraduadosThemeId) => {
    setSelectedThemeId(themeId);
    playChime("tick");
  };

  const handleSelectNameColor = (preset: NameColorPreset) => {
    setNameColorPreset(preset.id);
    setNameColorHex(preset.hex);
    playChime("tick");
  };

  const handleApply = async () => {
    setIsSaving(true);
    try {
      await onSaveConfig({
        themeId: selectedThemeId,
        applyToPublicPortal,
        nameColorHex: nameColorHex || "#0c0a09",
        nameColorPreset,
      });
      playChime("success");
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error("Error saving appearance theme:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    setSelectedThemeId("indigo_royal");
    setNameColorPreset("carbon_black");
    setNameColorHex("#0c0a09");
    setApplyToPublicPortal(true);
    playChime("tick");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="appearance-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Cabecera del Modal */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-stone-950 flex items-center justify-center text-xl font-black shadow-md shrink-0">
              <Palette size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="appearance-modal-title" className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Temas de Apariencia</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-mono shadow-xs">
                    Admin • Tablero de Graduados
                  </span>
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 font-medium mt-0.5">
                Elige el color y estilo visual que lucirá el tablero de graduados y sus reconocimientos oficiales.
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
          
          {/* VISTA PREVIA EN VIVO */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Eye size={14} className="text-indigo-500" />
                <span>Vista Previa en Tiempo Real ({previewTheme.name}):</span>
              </span>
              <span className="text-[11px] font-bold text-stone-400">
                Tema seleccionado: <strong className="text-stone-900 dark:text-stone-100">{previewTheme.name}</strong>
              </span>
            </div>

            {/* Simulación del Banner & Tarjeta con el tema elegido */}
            <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3.5">
              
              {/* Mini Banner Preview */}
              <div className={`p-4 rounded-2xl ${previewTheme.bannerGradient} ${previewTheme.bannerBorder} text-white shadow-md relative overflow-hidden transition-all duration-300`}>
                <div className={`absolute right-0 top-0 w-48 h-48 ${previewTheme.bannerGlow} rounded-full blur-2xl pointer-events-none`} />
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🎓</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${previewTheme.badgeBg} ${previewTheme.badgeText} font-mono`}>
                        OFICIAL • GRADUADOS
                      </span>
                    </div>
                    <h4 className="text-base font-black tracking-tight text-white">
                      Tablero Visual de Graduados
                    </h4>
                    <p className={`text-[11px] ${previewTheme.bannerSubtitle} line-clamp-1`}>
                      {previewTheme.subtitle}
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-2">
                    <div className={`px-2.5 py-1 rounded-xl bg-white/15 backdrop-blur-md text-[10px] font-bold text-white border border-white/20`}>
                      {previewTheme.tag}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini Card Preview */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-2.5">
                <div className={`p-3 rounded-xl ${previewTheme.cardHeaderGradient} ${previewTheme.cardHeaderBorder} border flex items-center justify-between gap-3`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl ${previewTheme.avatarGradient} ${previewTheme.avatarText} flex items-center justify-center text-xs font-black shadow-xs shrink-0`}>
                      CM
                    </div>
                    <div>
                      <div
                        className="text-xs sm:text-sm font-black transition-colors"
                        style={{ color: nameColorHex || "#0c0a09" }}
                      >
                        Carlos Mendoza Ramos
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-stone-500 dark:text-stone-400">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Líder</span>
                        <span>•</span>
                        <span>Grupo G-1</span>
                        <span>•</span>
                        <span>Zona Jaguar</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                      2026
                    </span>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-lg ${previewTheme.driveButtonGradient} text-[10px] font-black flex items-center gap-1 shadow-2xs pointer-events-none`}
                    >
                      <ExternalLink size={10} />
                      <span>Ver Drive</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PALETA DE TEMAS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>Selecciona la Paleta de Color:</span>
              </span>
              <span className="text-[11px] font-bold text-stone-400">
                {GRADUADOS_THEMES.length} estilos disponibles
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {GRADUADOS_THEMES.map((theme) => {
                const isSelected = selectedThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme.id)}
                    className={`p-3.5 rounded-2xl text-left transition-all relative border flex flex-col justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-white dark:bg-stone-850 border-stone-900 dark:border-stone-100 shadow-md ring-2 ring-stone-900/10 dark:ring-stone-100/20 scale-[1.01]"
                        : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-xs"
                    }`}
                  >
                    {/* Header tema & Swatch */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] ${
                            isSelected
                              ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 border-transparent font-black"
                              : "border-stone-300 dark:border-stone-600 bg-transparent"
                          }`}>
                            {isSelected && <Check size={10} className="stroke-[3]" />}
                          </span>
                          <span className="text-xs font-black text-stone-900 dark:text-stone-100 leading-tight">
                            {theme.name}
                          </span>
                        </div>

                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
                            : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                        }`}>
                          {theme.tag}
                        </span>
                      </div>

                      <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed mb-3">
                        {theme.subtitle}
                      </p>
                    </div>

                    {/* Barra de degradado y círculos de colores */}
                    <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center -space-x-1">
                          <span
                            className="w-4 h-4 rounded-full border border-white dark:border-stone-800 shadow-xs"
                            style={{ backgroundColor: theme.colors.previewA }}
                            title="Color Primario"
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-white dark:border-stone-800 shadow-xs"
                            style={{ backgroundColor: theme.colors.previewB }}
                            title="Color Secundario"
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-white dark:border-stone-800 shadow-xs"
                            style={{ backgroundColor: theme.colors.previewC }}
                            title="Color Gradiente"
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-white dark:border-stone-800 shadow-xs"
                            style={{ backgroundColor: theme.colors.accent }}
                            title="Acento / Botón"
                          />
                        </div>

                        <span className="text-[10px] font-mono font-bold text-stone-400">
                          {theme.colors.accent}
                        </span>
                      </div>

                      {/* Gradiente de barra */}
                      <div
                        className="w-full h-2 rounded-full shadow-inner"
                        style={{
                          background: `linear-gradient(90deg, ${theme.colors.previewA}, ${theme.colors.previewB}, ${theme.colors.previewC})`,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* COLOR DEL TEXTO DE LOS NOMBRES DE GRADUADOS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Palette size={14} className="text-amber-500" />
                  <span>Color del Texto de los Nombres de Graduados:</span>
                </span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  Selecciona un color de alto contraste para que los nombres de los graduados sean 100% nítidos y legibles en cualquier pantalla.
                </p>
              </div>

              {/* Indicador del color seleccionado actualmente */}
              <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs">
                <span
                  className="w-4 h-4 rounded-full border border-white dark:border-stone-900 shadow-xs shrink-0"
                  style={{ backgroundColor: nameColorHex || "#0c0a09" }}
                />
                <span className="font-mono font-bold text-[11px] text-stone-700 dark:text-stone-300">
                  {nameColorHex || "#0c0a09"}
                </span>
              </div>
            </div>

            {/* Presets de Color de Nombre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {GRADUADOS_NAME_COLOR_PRESETS.map((preset) => {
                const isSelected =
                  nameColorPreset === preset.id || nameColorHex.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectNameColor(preset)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-500/60 ring-2 ring-amber-400/30 shadow-xs"
                        : "bg-stone-50 dark:bg-stone-850 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700"
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full border-2 border-white dark:border-stone-850 shadow-xs shrink-0 mt-0.5 flex items-center justify-center text-white"
                      style={{ backgroundColor: preset.hex }}
                    >
                      {isSelected && <Check size={11} className="stroke-[3]" />}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-xs font-black truncate"
                          style={{ color: preset.hex }}
                        >
                          {preset.name}
                        </span>
                        {preset.id === "carbon_black" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-400/90 text-stone-950 shrink-0">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 block line-clamp-1 mt-0.5">
                        {preset.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selector de Color Hex Personalizado */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                O ingresa un color personalizado:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={nameColorHex.startsWith("#") ? nameColorHex : "#0c0a09"}
                  onChange={(e) => {
                    setNameColorHex(e.target.value);
                    setNameColorPreset("custom");
                  }}
                  className="w-8 h-8 rounded-lg border border-stone-300 dark:border-stone-700 cursor-pointer p-0.5 bg-white dark:bg-stone-800"
                  title="Elegir color personalizado con selector"
                />
                <input
                  type="text"
                  value={nameColorHex || "#0c0a09"}
                  onChange={(e) => {
                    setNameColorHex(e.target.value);
                    setNameColorPreset("custom");
                  }}
                  placeholder="#0c0a09"
                  className="w-28 px-2.5 py-1 text-xs font-mono rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>
          </div>

          {/* AJUSTES ADICIONALES */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <Sliders size={14} className="text-indigo-500" />
              <span>Opciones del Tablero de Graduados:</span>
            </span>

            <label className="flex items-start gap-3 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-850 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer">
              <input
                type="checkbox"
                checked={applyToPublicPortal}
                onChange={(e) => setApplyToPublicPortal(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-stone-900 dark:text-stone-100 block">
                  Aplicar este color también al Modal Público de Reconocimientos / Alumnos
                </span>
                <span className="text-stone-500 dark:text-stone-400 text-[11px] block mt-0.5">
                  Si está marcado, cuando los alumnos y graduados abran el enlace para ver sus reconocimientos en Drive, verán la misma paleta de color que elegiste.
                </span>
              </div>
            </label>
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
            <span>Restablecer Oficial (Índigo)</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 font-bold text-xs transition cursor-pointer"
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
                  <span>Guardando Tema...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 size={14} className="text-stone-950" />
                  <span>¡Tema Guardado!</span>
                </>
              ) : (
                <>
                  <Palette size={14} className="stroke-[2.5]" />
                  <span>Guardar y Aplicar Tema</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
