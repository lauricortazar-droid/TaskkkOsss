import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export type GraduadosThemeId =
  | "indigo_royal"
  | "emerald_prestige"
  | "crimson_ruby"
  | "amber_gold"
  | "amethyst_purple"
  | "sapphire_cyan"
  | "dark_obsidian"
  | "coral_sunset"
  | "cyber_teal"
  | "rose_quartz"
  | "slate_executive";

export interface GraduadosTheme {
  id: GraduadosThemeId;
  name: string;
  subtitle: string;
  tag: string;
  colors: {
    previewA: string;
    previewB: string;
    previewC: string;
    accent: string;
  };
  bannerGradient: string;
  bannerBorder: string;
  bannerGlow: string;
  bannerSubtitle: string;
  badgeBg: string;
  badgeText: string;
  cardHeaderGradient: string;
  cardHeaderBorder: string;
  nameTextColor: string;
  avatarGradient: string;
  avatarText: string;
  driveButtonGradient: string;
  statDriveBg: string;
  statDriveText: string;
  activeYearFilterBg: string;
  activeYearBadgeBg: string;
  ringColor: string;
}

export interface NameColorPreset {
  id: string;
  name: string;
  hex: string;
  twClass: string;
  description: string;
}

export const GRADUADOS_NAME_COLOR_PRESETS: NameColorPreset[] = [
  {
    id: "carbon_black",
    name: "Negro Carbón Élite",
    hex: "#0c0a09",
    twClass: "text-stone-950",
    description: "Máxima legibilidad, nitidez y contraste oficial (Recomendado)",
  },
  {
    id: "navy_blue",
    name: "Azul Marino Oficial",
    hex: "#0f224a",
    twClass: "text-blue-950",
    description: "Tono institucional solemne y elegante",
  },
  {
    id: "royal_indigo",
    name: "Índigo Profundo",
    hex: "#1e1b4b",
    twClass: "text-indigo-950",
    description: "Armoniza con los diplomados y la identidad académica",
  },
  {
    id: "forest_emerald",
    name: "Verde Bosque Distinción",
    hex: "#022c22",
    twClass: "text-emerald-950",
    description: "Tono de prestigio y distinción ceremonial",
  },
  {
    id: "imperial_purple",
    name: "Púrpura Imperial",
    hex: "#3b0764",
    twClass: "text-purple-950",
    description: "Distinción académica superior",
  },
  {
    id: "ruby_garnet",
    name: "Rubí Ceremonial",
    hex: "#4c0519",
    twClass: "text-rose-950",
    description: "Tono borgoña de excelencia protocolaria",
  },
  {
    id: "graphite_slate",
    name: "Grafito Pizarra",
    hex: "#0f172a",
    twClass: "text-slate-900",
    description: "Contraste moderno con sobriedad ejecutiva",
  },
];

export interface GraduadosThemeConfig {
  themeId: GraduadosThemeId;
  applyToPublicPortal: boolean;
  customHex?: string;
  nameColorHex?: string;
  nameColorPreset?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const GRADUADOS_THEMES: GraduadosTheme[] = [
  {
    id: "indigo_royal",
    name: "Índigo Real & Púrpura",
    subtitle: "El estilo clásico institucional con tonos azules profundos y púrpuras",
    tag: "Clásico Oficial",
    colors: {
      previewA: "#1e3a8a",
      previewB: "#312e81",
      previewC: "#581c87",
      accent: "#f59e0b",
    },
    bannerGradient: "bg-gradient-to-r from-blue-900 via-indigo-950 to-purple-950",
    bannerBorder: "border-indigo-500/40",
    bannerGlow: "bg-indigo-500/20",
    bannerSubtitle: "text-indigo-100",
    badgeBg: "bg-amber-400",
    badgeText: "text-stone-950",
    cardHeaderGradient:
      "bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-purple-50/90 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900",
    cardHeaderBorder: "border-indigo-100 dark:border-stone-700",
    nameTextColor: "text-stone-950",
    avatarGradient: "bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600",
    avatarText: "text-white",
    driveButtonGradient:
      "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white",
    statDriveBg: "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200/50 dark:border-indigo-800/40",
    statDriveText: "text-indigo-700 dark:text-indigo-300",
    activeYearFilterBg: "bg-indigo-600 text-white shadow-indigo-500/20",
    activeYearBadgeBg: "bg-white/20 text-white",
    ringColor: "ring-indigo-500/30",
  },
  {
    id: "emerald_prestige",
    name: "Esmeralda Imperial & Jade",
    subtitle: "Tonos verdes solemnes y de distinción que transmiten graduación y éxito",
    tag: "Prestigio",
    colors: {
      previewA: "#064e3b",
      previewB: "#0f766e",
      previewC: "#047857",
      accent: "#34d399",
    },
    bannerGradient: "bg-gradient-to-r from-emerald-950 via-teal-950 to-stone-900",
    bannerBorder: "border-emerald-500/40",
    bannerGlow: "bg-emerald-500/20",
    bannerSubtitle: "text-emerald-100",
    badgeBg: "bg-emerald-400",
    badgeText: "text-stone-950",
    cardHeaderGradient:
      "bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-emerald-50/90 dark:from-stone-900 dark:via-emerald-950/30 dark:to-stone-900",
    cardHeaderBorder: "border-emerald-200 dark:border-emerald-800/60",
    nameTextColor: "text-stone-950",
    avatarGradient: "bg-gradient-to-tr from-emerald-600 via-teal-600 to-green-600",
    avatarText: "text-white",
    driveButtonGradient:
      "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white",
    statDriveBg: "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/40",
    statDriveText: "text-emerald-700 dark:text-emerald-300",
    activeYearFilterBg: "bg-emerald-600 text-white shadow-emerald-500/20",
    activeYearBadgeBg: "bg-white/20 text-white",
    ringColor: "ring-emerald-500/30",
  },
  {
    id: "crimson_ruby",
    name: "Rubí Borgoña & Oro",
    subtitle: "Rojo granate y borgoña ceremonial con detalles dorados de excelencia",
    tag: "Ceremonial",
    colors: {
      previewA: "#881337",
      previewB: "#991b1b",
      previewC: "#701a75",
      accent: "#fbbf24",
    },
    bannerGradient: "bg-gradient-to-r from-rose-950 via-red-950 to-stone-950",
    bannerBorder: "border-rose-500/40",
    bannerGlow: "bg-rose-500/20",
    bannerSubtitle: "text-rose-100",
    badgeBg: "bg-amber-400",
    badgeText: "text-stone-950",
    cardHeaderGradient:
      "bg-gradient-to-r from-rose-50/90 via-amber-50/60 to-rose-50/90 dark:from-stone-900 dark:via-rose-950/30 dark:to-stone-900",
    cardHeaderBorder: "border-rose-200 dark:border-rose-900/60",
    nameTextColor: "text-stone-950",
    avatarGradient: "bg-gradient-to-tr from-rose-600 via-red-600 to-amber-600",
    avatarText: "text-white",
    driveButtonGradient:
      "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white",
    statDriveBg: "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200/50 dark:border-rose-800/40",
    statDriveText: "text-rose-700 dark:text-rose-300",
    activeYearFilterBg: "bg-rose-600 text-white shadow-rose-500/20",
    activeYearBadgeBg: "bg-white/20 text-white",
    ringColor: "ring-rose-500/30",
  },
  {
    id: "amber_gold",
    name: "Oro Diplomático & Caramelo",
    subtitle: "Tonos dorados y ámbar que evocan el honor y el mérito de los graduados",
    tag: "Honor & Mérito",
    colors: {
      previewA: "#78350f",
      previewB: "#b45309",
      previewC: "#d97706",
      accent: "#fde047",
    },
    bannerGradient: "bg-gradient-to-r from-amber-950 via-yellow-950 to-stone-950",
    bannerBorder: "border-amber-500/40",
    bannerGlow: "bg-amber-500/25",
    bannerSubtitle: "text-amber-100",
    badgeBg: "bg-yellow-400",
    badgeText: "text-stone-950",
    cardHeaderGradient:
      "bg-gradient-to-r from-amber-50/90 via-yellow-50/70 to-orange-50/80 dark:from-stone-900 dark:via-amber-950/30 dark:to-stone-900",
    cardHeaderBorder: "border-amber-200 dark:border-amber-800/60",
    nameTextColor: "text-stone-950",
    avatarGradient: "bg-gradient-to-tr from-amber-600 via-yellow-500 to-orange-600",
    avatarText: "text-stone-950 font-black",
    driveButtonGradient:
      "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-stone-950 font-black",
    statDriveBg: "bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/40",
    statDriveText: "text-amber-800 dark:text-amber-300",
    activeYearFilterBg: "bg-amber-600 text-white shadow-amber-500/20",
    activeYearBadgeBg: "bg-white/20 text-white",
    ringColor: "ring-amber-500/30",
  },
  {
    id: "sapphire_cyan",
    name: "Zafiro Ejecutivo & Océano",
    subtitle: "Azul cobalto y zafiro de alta claridad visual y modernidad",
    tag: "Ejecutivo",
    colors: {
      previewA: "#083344",
      previewB: "#0284c7",
      previewC: "#0284c7",
      accent: "#38bdf8",
    },
    bannerGradient: "bg-gradient-to-r from-cyan-950 via-sky-950 to-blue-950",
    bannerBorder: "border-cyan-500/40",
    bannerGlow: "bg-cyan-500/20",
    bannerSubtitle: "text-cyan-100",
    badgeBg: "bg-cyan-400",
    badgeText: "text-stone-950",
    cardHeaderGradient:
      "bg-gradient-to-r from-cyan-50/90 via-sky-50/70 to-blue-50/90 dark:from-stone-900 dark:via-cyan-950/30 dark:to-stone-900",
    cardHeaderBorder: "border-cyan-200 dark:border-cyan-800/60",
    nameTextColor: "text-stone-950",
    avatarGradient: "bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600",
    avatarText: "text-white",
    driveButtonGradient:
      "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white",
    statDriveBg: "bg-cyan-50/70 dark:bg-cyan-950/40 border-cyan-200/50 dark:border-cyan-800/40",
    statDriveText: "text-cyan-700 dark:text-cyan-300",
    activeYearFilterBg: "bg-sky-600 text-white shadow-sky-500/20",
    activeYearBadgeBg: "bg-white/20 text-white",
    ringColor: "ring-cyan-500/30",
  },
  {
    id: "amethyst_purple",
    name: "Amatista Mística & Violeta Real",
    subtitle: "Púrpura intenso y violeta que simboliza distinción académica superior",
    tag: "Académico",
    colors: {
      previewA: "#581c87",
      previewB: "#7c3aed",
      previewC: "#a855f7",
      accent: "#c084fc",
    },
    bannerGradient: "bg-gradient-to-r from-purple-950 via-violet-950 to-fuchsia-950",
    bannerBorder: "border-purple-500/40",
    bannerGlow: "bg-purple-500/20",
    bannerSubtitle: "text-purple-100",
    badgeBg: "bg-purple-300",
    badgeText: "text-stone-950",
    cardHeaderGradient:
      "bg-gradient-to-r from-purple-50/90 via-violet-50/70 to-fuchsia-50/90 dark:from-stone-900 dark:via-purple-950/30 dark:to-stone-900",
    cardHeaderBorder: "border-purple-200 dark:border-purple-800/60",
    nameTextColor: "text-stone-950",
    avatarGradient: "bg-gradient-to-tr from-purple-600 via-violet-600 to-fuchsia-600",
    avatarText: "text-white",
    driveButtonGradient:
      "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white",
    statDriveBg: "bg-purple-50/70 dark:bg-purple-950/40 border-purple-200/50 dark:border-purple-800/40",
    statDriveText: "text-purple-700 dark:text-purple-300",
    activeYearFilterBg: "bg-purple-600 text-white shadow-purple-500/20",
    activeYearBadgeBg: "bg-white/20 text-white",
    ringColor: "ring-purple-500/30",
  },
  {
    id: "dark_obsidian",
    name: "Obsidiana & Oro Titán",
    subtitle: "Fondo negro carbón ultra elegante con sutiles destellos dorados premium",
    tag: "Ultra Dark & Gold",
    colors: {
      previewA: "#09090b",
      previewB: "#1c1917",
      previewC: "#292524",
      accent: "#fbbf24",
    },
    bannerGradient: "bg-gradient-to-r from-stone-950 via-zinc-900 to-stone-950",
    bannerBorder: "border-amber-400/40",
    bannerGlow: "bg-amber-400/15",
    bannerSubtitle: "text-stone-300",
    badgeBg: "bg-gradient-to-r from-amber-400 to-yellow-300",
    badgeText: "text-stone-950 font-black",
    cardHeaderGradient:
      "bg-gradient-to-r from-stone-100 via-amber-50/40 to-stone-100 dark:from-stone-900 dark:via-amber-950/20 dark:to-stone-900",
    cardHeaderBorder: "border-amber-300/50 dark:border-amber-600/40",
    nameTextColor: "text-stone-950",
    avatarGradient: "bg-gradient-to-tr from-stone-900 via-amber-700 to-stone-800",
    avatarText: "text-amber-300",
    driveButtonGradient:
      "bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 hover:from-stone-800 hover:to-stone-700 text-amber-300 border border-amber-400/40",
    statDriveBg: "bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/40",
    statDriveText: "text-amber-800 dark:text-amber-300",
    activeYearFilterBg: "bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 shadow-md",
    activeYearBadgeBg: "bg-white/20 text-white dark:bg-stone-950/20 dark:text-stone-950",
    ringColor: "ring-amber-400/30",
  },
  {
    id: "coral_sunset",
    name: "Atardecer Coral & Melocotón",
    subtitle: "Calidez vibrante con tonos anaranjados y corales que transmiten energía",
    tag: "Vibrante",
    colors: {
      previewA: "#7c2d12",
      previewB: "#c2410c",
      previewC: "#ea580c",
      accent: "#f43f5e",
    },
    bannerGradient: "bg-gradient-to-r from-orange-950 via-red-950 to-amber-950",
    bannerBorder: "border-orange-500/40",
    bannerGlow: "bg-orange-500/20",
    bannerSubtitle: "text-orange-100",
    badgeBg: "bg-orange-400",
    badgeText: "text-stone-950",
    cardHeaderGradient:
      "bg-gradient-to-r from-orange-50/90 via-rose-50/70 to-amber-50/90 dark:from-stone-900 dark:via-orange-950/30 dark:to-stone-900",
    cardHeaderBorder: "border-orange-200 dark:border-orange-800/60",
    nameTextColor: "text-stone-950",
    avatarGradient: "bg-gradient-to-tr from-orange-600 via-rose-600 to-amber-500",
    avatarText: "text-white",
    driveButtonGradient:
      "bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-700 hover:to-rose-700 text-white",
    statDriveBg: "bg-orange-50/70 dark:bg-orange-950/40 border-orange-200/50 dark:border-orange-800/40",
    statDriveText: "text-orange-700 dark:text-orange-300",
    activeYearFilterBg: "bg-orange-600 text-white shadow-orange-500/20",
    activeYearBadgeBg: "bg-white/20 text-white",
    ringColor: "ring-orange-500/30",
  },
  {
    id: "cyber_teal",
    name: "Menta Tecnológica & Turquesa",
    subtitle: "Turquesa y cian futurista, dinámico y moderno de alta legibilidad",
    tag: "Tecnológico",
    colors: {
      previewA: "#134e4a",
      previewB: "#0f766e",
      previewC: "#0d9488",
      accent: "#2dd4bf",
    },
    bannerGradient: "bg-gradient-to-r from-teal-950 via-slate-900 to-cyan-950",
    bannerBorder: "border-teal-400/40",
    bannerGlow: "bg-teal-400/20",
    bannerSubtitle: "text-teal-100",
    badgeBg: "bg-teal-300",
    badgeText: "text-slate-950",
    cardHeaderGradient:
      "bg-gradient-to-r from-teal-50/90 via-slate-50/80 to-cyan-50/90 dark:from-stone-900 dark:via-teal-950/30 dark:to-stone-900",
    cardHeaderBorder: "border-teal-200 dark:border-teal-800/60",
    nameTextColor: "text-stone-950",
    avatarGradient: "bg-gradient-to-tr from-teal-500 via-cyan-600 to-emerald-600",
    avatarText: "text-white",
    driveButtonGradient:
      "bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 text-white",
    statDriveBg: "bg-teal-50/70 dark:bg-teal-950/40 border-teal-200/50 dark:border-teal-800/40",
    statDriveText: "text-teal-700 dark:text-teal-300",
    activeYearFilterBg: "bg-teal-600 text-white shadow-teal-500/20",
    activeYearBadgeBg: "bg-white/20 text-white",
    ringColor: "ring-teal-500/30",
  },
  {
    id: "rose_quartz",
    name: "Cuarzo Rosa & Frambuesa",
    subtitle: "Paleta distinguida con tonos frambuesa, magenta y rosa sofisticado",
    tag: "Distinción",
    colors: {
      previewA: "#831843",
      previewB: "#be185d",
      previewC: "#db2777",
      accent: "#f472b6",
    },
    bannerGradient: "bg-gradient-to-r from-pink-950 via-rose-950 to-slate-950",
    bannerBorder: "border-pink-400/40",
    bannerGlow: "bg-pink-500/20",
    bannerSubtitle: "text-pink-100",
    badgeBg: "bg-pink-300",
    badgeText: "text-stone-950",
    cardHeaderGradient:
      "bg-gradient-to-r from-pink-50/90 via-rose-50/70 to-pink-50/90 dark:from-stone-900 dark:via-pink-950/30 dark:to-stone-900",
    cardHeaderBorder: "border-pink-200 dark:border-pink-800/60",
    nameTextColor: "text-stone-950",
    avatarGradient: "bg-gradient-to-tr from-pink-600 via-rose-600 to-purple-600",
    avatarText: "text-white",
    driveButtonGradient:
      "bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white",
    statDriveBg: "bg-pink-50/70 dark:bg-pink-950/40 border-pink-200/50 dark:border-pink-800/40",
    statDriveText: "text-pink-700 dark:text-pink-300",
    activeYearFilterBg: "bg-pink-600 text-white shadow-pink-500/20",
    activeYearBadgeBg: "bg-white/20 text-white",
    ringColor: "ring-pink-500/30",
  },
  {
    id: "slate_executive",
    name: "Pizarra Minimal & Grafito",
    subtitle: "Sobriedad nórdica en tonos gris grafito, carbón y plata industrial",
    tag: "Minimalista",
    colors: {
      previewA: "#0f172a",
      previewB: "#1e293b",
      previewC: "#334155",
      accent: "#94a3b8",
    },
    bannerGradient: "bg-gradient-to-r from-slate-950 via-slate-900 to-zinc-950",
    bannerBorder: "border-slate-500/40",
    bannerGlow: "bg-slate-400/15",
    bannerSubtitle: "text-slate-300",
    badgeBg: "bg-slate-200",
    badgeText: "text-slate-950",
    cardHeaderGradient:
      "bg-gradient-to-r from-slate-100 via-stone-50 to-slate-100 dark:from-slate-900 dark:via-stone-900 dark:to-slate-900",
    cardHeaderBorder: "border-slate-300 dark:border-slate-700",
    nameTextColor: "text-slate-950",
    avatarGradient: "bg-gradient-to-tr from-slate-700 via-slate-800 to-zinc-900",
    avatarText: "text-white",
    driveButtonGradient:
      "bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white border border-slate-700",
    statDriveBg: "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
    statDriveText: "text-slate-800 dark:text-slate-200",
    activeYearFilterBg: "bg-slate-800 text-white shadow-slate-900/30",
    activeYearBadgeBg: "bg-white/20 text-white",
    ringColor: "ring-slate-500/30",
  },
];

const LOCAL_STORAGE_KEY = "graduados_board_theme_v1";

export const DEFAULT_GRADUADOS_THEME_ID: GraduadosThemeId = "indigo_royal";

export function getGraduadosTheme(id?: string): GraduadosTheme {
  const found = GRADUADOS_THEMES.find((t) => t.id === id);
  return found || GRADUADOS_THEMES[0];
}

/**
 * Loads the current theme config from localStorage.
 */
export function getSavedThemeConfig(): GraduadosThemeConfig {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.themeId) {
        return {
          themeId: parsed.themeId,
          applyToPublicPortal: Boolean(parsed.applyToPublicPortal),
          customHex: parsed.customHex,
          nameColorHex: parsed.nameColorHex,
          nameColorPreset: parsed.nameColorPreset,
          updatedAt: parsed.updatedAt,
        };
      }
    }
  } catch (err) {
    console.warn("Error reading graduados theme from localStorage:", err);
  }
  return {
    themeId: DEFAULT_GRADUADOS_THEME_ID,
    applyToPublicPortal: true,
  };
}

/**
 * Saves theme config to both localStorage and Firestore (for all users / admin sync).
 */
export async function saveThemeConfig(
  config: Partial<GraduadosThemeConfig>,
  userEmail?: string
): Promise<GraduadosThemeConfig> {
  const current = getSavedThemeConfig();
  const nextConfig: GraduadosThemeConfig = {
    themeId: config.themeId || current.themeId,
    applyToPublicPortal:
      config.applyToPublicPortal !== undefined
        ? config.applyToPublicPortal
        : current.applyToPublicPortal,
    customHex: config.customHex !== undefined ? config.customHex : current.customHex,
    nameColorHex:
      config.nameColorHex !== undefined ? config.nameColorHex : current.nameColorHex,
    nameColorPreset:
      config.nameColorPreset !== undefined ? config.nameColorPreset : current.nameColorPreset,
    updatedAt: new Date().toISOString(),
    updatedBy: userEmail || "Laura (Admin)",
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextConfig));
  } catch (err) {
    console.warn("Could not save to localStorage:", err);
  }

  try {
    const docRef = doc(db, "app_settings", "graduados_theme");
    await setDoc(docRef, nextConfig, { merge: true });
  } catch (err) {
    console.warn("Could not save theme to Firestore:", err);
  }

  return nextConfig;
}

/**
 * Subscribes to real-time theme changes in Firestore with localStorage fallback.
 */
export function subscribeToThemeConfig(
  callback: (config: GraduadosThemeConfig) => void
): () => void {
  // Start with local storage immediately
  const initial = getSavedThemeConfig();
  callback(initial);

  try {
    const docRef = doc(db, "app_settings", "graduados_theme");
    const unsub = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as GraduadosThemeConfig;
          if (data && data.themeId) {
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
            } catch {
              // ignore
            }
            callback(data);
          }
        }
      },
      (error) => {
        console.warn("Firestore subscription to theme config failed:", error);
      }
    );
    return unsub;
  } catch (err) {
    console.warn("Error setting up onSnapshot for graduados_theme:", err);
    return () => {};
  }
}
