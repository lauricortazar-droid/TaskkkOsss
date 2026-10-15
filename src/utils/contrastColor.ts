import React from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface LedgerThemeConfig {
  bg: string;
  presetId: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface LedgerThemePreset {
  id: string;
  name: string;
  bg: string;
  tag: string;
  description: string;
}

export const LEDGER_THEME_PRESETS: LedgerThemePreset[] = [
  {
    id: "classic_white",
    name: "Blanco Ejecutivo",
    bg: "#ffffff",
    tag: "Clásico Oficial",
    description: "Fondo blanco puro de máxima claridad con tipografía carbón",
  },
  {
    id: "institutional_navy",
    name: "Azul Marino FGDLL",
    bg: "#042f66",
    tag: "Institucional",
    description: "Azul profundo con tipografía blanca nítida de alto contraste",
  },
  {
    id: "executive_slate",
    name: "Pizarra Grafito",
    bg: "#0f172a",
    tag: "Minimalista",
    description: "Gris pizarra oscuro premium con contraste ultra nítido",
  },
  {
    id: "deep_indigo",
    name: "Índigo Profundo",
    bg: "#1e1b4b",
    tag: "Diplomados",
    description: "Índigo académico solemne con textos blancos brillantes",
  },
  {
    id: "soft_cream",
    name: "Crema & Ámbar Suave",
    bg: "#fffdf5",
    tag: "Cálido",
    description: "Tono marfil ejecutivo suave con textos negros profundos",
  },
  {
    id: "emerald_sage",
    name: "Esmeralda Productivo",
    bg: "#064e3b",
    tag: "Productivo",
    description: "Verde bosque ceremonial con textos blancos de alto contraste",
  },
  {
    id: "obsidian_black",
    name: "Obsidiana Carbón",
    bg: "#121316",
    tag: "Ultra Dark",
    description: "Fondo negro sofisticado con elementos claros y elegantes",
  },
  {
    id: "stone_neutral",
    name: "Piedra Neutral",
    bg: "#f5f5f4",
    tag: "Sobrio",
    description: "Gris piedra industrial claro con texto negro carbón de 15:1",
  },
  {
    id: "royal_wine",
    name: "Vino Borgoña",
    bg: "#4c0519",
    tag: "Distinción",
    description: "Rojo granate ceremonial de alta distinción ejecutiva",
  },
];

const LOCAL_STORAGE_LEDGER_THEME_KEY = "taskos_ledger_theme_v1";

/**
 * Parses HEX color (e.g. #fff, #ffffff, #ffffff80) into RGB components [r, g, b].
 */
export function hexToRgb(hex: string): [number, number, number] {
  let cleaned = hex.trim().replace(/^#/, "");
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (cleaned.length < 6) {
    return [255, 255, 255];
  }
  const r = parseInt(cleaned.slice(0, 2), 16) || 0;
  const g = parseInt(cleaned.slice(2, 4), 16) || 0;
  const b = parseInt(cleaned.slice(4, 6), 16) || 0;
  return [r, g, b];
}

/**
 * Calculates WCAG 2.1 relative luminance of a color.
 * Range: 0 (pure black) to 1 (pure white).
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Computes contrast ratio between two luminances (e.g. 14.5:1).
 */
export function getContrastRatio(lum1: number, lum2: number): number {
  const l1 = Math.max(lum1, lum2);
  const l2 = Math.min(lum1, lum2);
  return (l1 + 0.05) / (l2 + 0.05);
}

export interface ContrastDetails {
  isDark: boolean;
  luminance: number;
  contrastRatio: number;
  contrastRating: "AAA" | "AA" | "Fail";
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

/**
 * Analyzes any background color and calculates its contrast metrics.
 */
export function analyzeBgContrast(bgHex: string): ContrastDetails {
  const [r, g, b] = hexToRgb(bgHex);
  const lum = getRelativeLuminance(r, g, b);
  // Threshold: if luminance <= 0.46, background is dark, so text should be white
  const isDark = lum <= 0.46;
  const targetTextLum = isDark ? 1.0 : 0.01; // pure white vs dark charcoal
  const ratio = getContrastRatio(lum, targetTextLum);

  return {
    isDark,
    luminance: lum,
    contrastRatio: Number(ratio.toFixed(1)),
    contrastRating: ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "Fail",
    textPrimary: isDark ? "#ffffff" : "#09090b",
    textSecondary: isDark ? "#f1f5f9" : "#1e293b",
    textMuted: isDark ? "#cbd5e1" : "#475569",
  };
}

/**
 * Generates dynamic CSS variables for the Ledger container based on the admin's chosen background.
 * Every child element can seamlessly read these variables to guarantee maximum legibility.
 */
export function getLedgerContrastStyles(bgHex: string): React.CSSProperties {
  const [r, g, b] = hexToRgb(bgHex);
  const { isDark, textPrimary, textSecondary, textMuted } = analyzeBgContrast(bgHex);

  if (isDark) {
    return {
      "--ledger-bg": bgHex,
      "--ledger-surface": `rgba(255, 255, 255, 0.08)`,
      "--ledger-surface-muted": `rgba(255, 255, 255, 0.04)`,
      "--ledger-surface-hover": `rgba(255, 255, 255, 0.12)`,
      "--ledger-card-bg": `rgba(255, 255, 255, 0.07)`,
      "--ledger-card-border": `rgba(255, 255, 255, 0.16)`,
      "--ledger-card-hover": `rgba(255, 255, 255, 0.11)`,
      "--ledger-border": `rgba(255, 255, 255, 0.18)`,
      "--ledger-border-subtle": `rgba(255, 255, 255, 0.10)`,
      "--ledger-text-primary": textPrimary,
      "--ledger-text-secondary": textSecondary,
      "--ledger-text-muted": textMuted,
      "--ledger-badge-bg": `rgba(255, 255, 255, 0.14)`,
      "--ledger-badge-text": `#ffffff`,
      "--ledger-badge-border": `rgba(255, 255, 255, 0.28)`,
      "--ledger-header-bg": `rgba(0, 0, 0, 0.35)`,
      "--ledger-input-bg": `rgba(255, 255, 255, 0.10)`,
      "--ledger-input-border": `rgba(255, 255, 255, 0.24)`,
      "--ledger-input-text": `#ffffff`,
      "--ledger-accent-text": `#fbbf24`,
      "--ledger-is-dark": "1",
      "--bg-r": r,
      "--bg-g": g,
      "--bg-b": b,
    } as React.CSSProperties;
  }

  // Light background
  return {
    "--ledger-bg": bgHex,
    "--ledger-surface": `#ffffff`,
    "--ledger-surface-muted": bgHex === "#ffffff" ? "#f8fafc" : `rgba(0, 0, 0, 0.035)`,
    "--ledger-surface-hover": `rgba(0, 0, 0, 0.045)`,
    "--ledger-card-bg": `#ffffff`,
    "--ledger-card-border": `rgba(0, 0, 0, 0.12)`,
    "--ledger-card-hover": `rgba(0, 0, 0, 0.02)`,
    "--ledger-border": `rgba(0, 0, 0, 0.14)`,
    "--ledger-border-subtle": `rgba(0, 0, 0, 0.07)`,
    "--ledger-text-primary": textPrimary,
    "--ledger-text-secondary": textSecondary,
    "--ledger-text-muted": textMuted,
    "--ledger-badge-bg": `rgba(0, 0, 0, 0.06)`,
    "--ledger-badge-text": `#09090b`,
    "--ledger-badge-border": `rgba(0, 0, 0, 0.16)`,
    "--ledger-header-bg": bgHex === "#ffffff" ? "#fafafa" : `rgba(0, 0, 0, 0.03)`,
    "--ledger-input-bg": `#ffffff`,
    "--ledger-input-border": `rgba(0, 0, 0, 0.16)`,
    "--ledger-input-text": `#09090b`,
    "--ledger-accent-text": `#b45309`,
    "--ledger-is-dark": "0",
    "--bg-r": r,
    "--bg-g": g,
    "--bg-b": b,
  } as React.CSSProperties;
}

/**
 * Loads the saved Ledger theme config from localStorage.
 */
export function getSavedLedgerTheme(): LedgerThemeConfig {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LEDGER_THEME_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.bg) {
        return {
          bg: parsed.bg,
          presetId: parsed.presetId || "classic_white",
          updatedAt: parsed.updatedAt,
          updatedBy: parsed.updatedBy,
        };
      }
    }
  } catch (err) {
    console.warn("Error reading ledger theme from localStorage:", err);
  }
  return {
    bg: "#ffffff",
    presetId: "classic_white",
  };
}

/**
 * Saves the Ledger theme to localStorage and Firestore.
 */
export async function saveLedgerTheme(
  config: Partial<LedgerThemeConfig>,
  userEmail?: string
): Promise<LedgerThemeConfig> {
  const current = getSavedLedgerTheme();
  const nextConfig: LedgerThemeConfig = {
    bg: config.bg || current.bg,
    presetId: config.presetId || current.presetId,
    updatedAt: new Date().toISOString(),
    updatedBy: userEmail || "Laura (Admin)",
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_LEDGER_THEME_KEY, JSON.stringify(nextConfig));
  } catch (err) {
    console.warn("Could not save ledger theme to localStorage:", err);
  }

  try {
    const docRef = doc(db, "app_settings", "ledger_theme");
    await setDoc(docRef, nextConfig, { merge: true });
  } catch (err) {
    console.warn("Could not save ledger theme to Firestore:", err);
  }

  return nextConfig;
}

/**
 * Real-time subscription to Ledger theme changes from Firestore.
 */
export function subscribeToLedgerTheme(
  callback: (theme: LedgerThemeConfig) => void
): () => void {
  const initial = getSavedLedgerTheme();
  callback(initial);

  try {
    const docRef = doc(db, "app_settings", "ledger_theme");
    const unsub = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as LedgerThemeConfig;
          if (data && data.bg) {
            try {
              localStorage.setItem(LOCAL_STORAGE_LEDGER_THEME_KEY, JSON.stringify(data));
            } catch {
              // ignore storage errors
            }
            callback(data);
          }
        }
      },
      (err) => {
        console.warn("Firestore subscription error for ledger_theme:", err);
      }
    );
    return unsub;
  } catch (e) {
    console.warn("Failed to subscribe to ledger_theme:", e);
    return () => {};
  }
}
