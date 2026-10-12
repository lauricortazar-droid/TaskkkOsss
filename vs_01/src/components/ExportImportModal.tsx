import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  Upload,
  X,
  FileJson,
  Check,
  AlertTriangle,
  Cloud,
  Calendar,
  Clock,
  ExternalLink,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  History,
  CheckCircle2,
  Lock,
  ArrowRight,
  Database,
  Sparkles,
} from "lucide-react";
import {
  TaskItem,
  GlobalResource,
  UrlLibraryItem,
  QuickResponseMessage,
  TaskOSExportData,
  Contact,
  TagItem,
  GoogleDriveBackupConfig,
  GoogleDriveBackupRecord,
} from "../types";
import { playChime } from "../utils/audio";
import {
  uploadJsonBackupToGoogleDrive,
  GoogleDriveUploadResult,
} from "../lib/googleWorkspace";
import { getAccessToken, googleSignIn } from "../lib/firebase";

export const STORAGE_KEY_DRIVE_CONFIG = "taskos_drive_backup_config";
export const STORAGE_KEY_DRIVE_HISTORY = "taskos_drive_backup_history";

const DEFAULT_CONFIG: GoogleDriveBackupConfig = {
  enabled: true,
  frequency: "weekly",
  preferredDayOfWeek: 1, // Lunes por defecto
  totalBackupsRun: 0,
};

const DAYS_OF_WEEK = [
  { val: 1, label: "Lunes" },
  { val: 2, label: "Martes" },
  { val: 3, label: "Miércoles" },
  { val: 4, label: "Jueves" },
  { val: 5, label: "Viernes" },
  { val: 6, label: "Sábado" },
  { val: 0, label: "Domingo" },
];

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  globalResources: GlobalResource[];
  urlLibrary?: UrlLibraryItem[];
  quickResponses?: QuickResponseMessage[];
  contacts?: Contact[];
  tags?: TagItem[];
  esencialTaskId?: number | null;
  userEmail?: string;
  onImportData: (data: TaskOSExportData) => void;
}

export default function ExportImportModal({
  isOpen,
  onClose,
  tasks,
  globalResources,
  urlLibrary = [],
  quickResponses = [],
  contacts = [],
  tags = [],
  esencialTaskId,
  userEmail,
  onImportData,
}: ExportImportModalProps) {
  // Modal Views: 'drive' (Google Drive automated) vs 'local' (JSON download/upload)
  const [activeTab, setActiveTab] = useState<"drive" | "local">("drive");

  // Local JSON status
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Drive Config State
  const [driveConfig, setDriveConfig] = useState<GoogleDriveBackupConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DRIVE_CONFIG);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (_) {}
    return DEFAULT_CONFIG;
  });

  // Google Drive Backup History
  const [driveHistory, setDriveHistory] = useState<GoogleDriveBackupRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DRIVE_HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  });

  // Google Drive Action States
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveSuccessResult, setDriveSuccessResult] = useState<GoogleDriveUploadResult | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // Check token on mount and tab switch
  useEffect(() => {
    async function checkToken() {
      const token = await getAccessToken();
      setHasToken(!!token);
    }
    if (isOpen) {
      checkToken();
    }
  }, [isOpen, activeTab]);

  // Save config changes to localStorage
  const updateDriveConfig = (partial: Partial<GoogleDriveBackupConfig>) => {
    setDriveConfig((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY_DRIVE_CONFIG, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  if (!isOpen) return null;

  // Build the complete export payload
  const buildExportPayload = (): TaskOSExportData => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks,
    globalResources,
    urlLibrary,
    quickResponses,
    contacts,
    tags,
    esencialTaskId,
  });

  // --- LOCAL JSON EXPORT ---
  const handleExportLocal = () => {
    try {
      const exportPayload = buildExportPayload();
      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `task-os-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      playChime("success");
      setImportStatus("Respaldo JSON descargado con éxito.");
      setErrorMsg(null);
    } catch (err: any) {
      console.error("Export error:", err);
      setErrorMsg("Error al generar el archivo JSON de respaldo.");
    }
  };

  // --- LOCAL JSON IMPORT ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (
          !parsed ||
          (!Array.isArray(parsed.tasks) &&
            !Array.isArray(parsed.globalResources) &&
            !Array.isArray(parsed.urlLibrary))
        ) {
          throw new Error("El archivo JSON no contiene una estructura válida de Task-OS.");
        }

        const validTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
        const validGlobal = Array.isArray(parsed.globalResources) ? parsed.globalResources : [];
        const validUrlLib = Array.isArray(parsed.urlLibrary) ? parsed.urlLibrary : [];

        onImportData({
          version: parsed.version || 1,
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          tasks: validTasks,
          globalResources: validGlobal,
          urlLibrary: validUrlLib,
          quickResponses: Array.isArray(parsed.quickResponses) ? parsed.quickResponses : undefined,
          contacts: Array.isArray(parsed.contacts) ? parsed.contacts : undefined,
          tags: Array.isArray(parsed.tags) ? parsed.tags : undefined,
          esencialTaskId: typeof parsed.esencialTaskId === "number" ? parsed.esencialTaskId : null,
        });

        playChime("success");
        setImportStatus(
          `Importación exitosa: ${validTasks.length} tareas, ${validGlobal.length} recursos globales y ${validUrlLib.length} enlaces cargados.`
        );
        setErrorMsg(null);
      } catch (err: any) {
        console.error("Import error:", err);
        setErrorMsg(err.message || "Error al procesar el archivo JSON.");
        setImportStatus(null);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- CONNECT WITH GOOGLE DRIVE ---
  const handleConnectGoogleDrive = async () => {
    setIsConnectingGoogle(true);
    setDriveError(null);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        setHasToken(true);
        playChime("success");
      }
    } catch (err: any) {
      console.error("Google Drive connection error:", err);
      setDriveError(err?.message || "No se pudo conectar con Google Drive.");
      playChime("urgent");
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // --- EXECUTE GOOGLE DRIVE BACKUP NOW ---
  const handleRunDriveBackupNow = async () => {
    setIsUploadingDrive(true);
    setDriveError(null);
    setDriveSuccessResult(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        const res = await googleSignIn();
        token = res?.accessToken || null;
      }

      if (!token) {
        throw new Error(
          "Se requiere autorización de Google Drive para subir el respaldo. Inicia sesión con Google."
        );
      }

      const payload = buildExportPayload();
      const dateStr = new Date().toISOString().split("T")[0];
      const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
      const customFileName = `task-os-backup-${dateStr}_${timeStr}.json`;

      // Upload via googleWorkspace.ts
      const uploadRes = await uploadJsonBackupToGoogleDrive(token, payload, customFileName);

      // Calculate next scheduled backup based on frequency
      const nextDate = new Date();
      if (driveConfig.frequency === "daily") {
        nextDate.setDate(nextDate.getDate() + 1);
      } else {
        nextDate.setDate(nextDate.getDate() + 7);
      }

      const newRecord: GoogleDriveBackupRecord = {
        id: `rec-${Date.now()}`,
        fileId: uploadRes.id,
        fileName: uploadRes.name,
        fileSize: uploadRes.size ? parseInt(uploadRes.size, 10) : JSON.stringify(payload).length,
        createdAt: new Date().toISOString(),
        webViewLink: uploadRes.webViewLink,
        status: "success",
        frequency: driveConfig.frequency,
        tasksCount: tasks.length,
        resourcesCount: globalResources.length,
        urlsCount: urlLibrary.length,
        quickResponsesCount: quickResponses.length,
      };

      const updatedHistory = [newRecord, ...driveHistory.slice(0, 24)];
      setDriveHistory(updatedHistory);
      try {
        localStorage.setItem(STORAGE_KEY_DRIVE_HISTORY, JSON.stringify(updatedHistory));
      } catch (_) {}

      updateDriveConfig({
        lastBackupAt: new Date().toISOString(),
        nextScheduledBackupAt: nextDate.toISOString(),
        lastBackupFileId: uploadRes.id,
        lastBackupFileName: uploadRes.name,
        lastBackupWebViewLink: uploadRes.webViewLink,
        lastBackupSizeBytes: newRecord.fileSize,
        lastBackupStatus: "success",
        lastBackupError: undefined,
        totalBackupsRun: (driveConfig.totalBackupsRun || 0) + 1,
      });

      setDriveSuccessResult(uploadRes);
      setHasToken(true);
      playChime("success");
    } catch (err: any) {
      console.error("Google Drive backup failed:", err);
      const msg = err?.message || "Error al subir el archivo a Google Drive.";
      setDriveError(msg);
      updateDriveConfig({
        lastBackupStatus: "error",
        lastBackupError: msg,
      });
      playChime("urgent");
    } finally {
      setIsUploadingDrive(false);
    }
  };

  // Helper formatting for next backup date
  const formatScheduledDate = () => {
    if (driveConfig.nextScheduledBackupAt) {
      try {
        const d = new Date(driveConfig.nextScheduledBackupAt);
        return d.toLocaleDateString("es-MX", {
          weekday: "long",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch (_) {}
    }
    const nextDate = new Date();
    if (driveConfig.frequency === "daily") {
      nextDate.setDate(nextDate.getDate() + 1);
    } else {
      nextDate.setDate(nextDate.getDate() + 7);
    }
    return nextDate.toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      id="export-import-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="export-import-modal"
        className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
              <FileJson size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-tight">
                Respaldos & Portabilidad JSON
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Programación automática en Google Drive e historial de respaldos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* VIEW SELECTOR TABS */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-stone-100 dark:bg-stone-800/80 text-xs font-bold gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("drive")}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === "drive"
                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
                : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            <Cloud size={15} className="text-blue-500" />
            <span>Google Drive (Programado)</span>
            {driveConfig.enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-400/40" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("local")}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === "local"
                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
                : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            <HardDrive size={15} className="text-amber-500" />
            <span>Archivo Local (.json)</span>
          </button>
        </div>

        {/* SCROLLABLE CONTENT BODY */}
        <div className="overflow-y-auto space-y-4 pr-1 scrollbar-thin flex-1">
          {/* TAB 1: GOOGLE DRIVE AUTOMATED BACKUP */}
          {activeTab === "drive" && (
            <div className="space-y-4">
              {/* Google Account & Connection Banner */}
              <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Cloud size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5 truncate">
                      <span>Cuenta Google vinculada:</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400 truncate">
                        {userEmail || "laurcortazar@gmail.com"}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5">
                      {hasToken ? (
                        <>
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                          <span>Google Drive conectado y listo para exportar</span>
                        </>
                      ) : (
                        <>
                          <Lock size={12} className="text-stone-400 shrink-0" />
                          <span>Autorización de Google Drive pendiente</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {!hasToken && (
                  <button
                    type="button"
                    onClick={handleConnectGoogleDrive}
                    disabled={isConnectingGoogle}
                    className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-xs"
                  >
                    {isConnectingGoogle ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Cloud size={13} />
                    )}
                    <span>Vincular Drive</span>
                  </button>
                )}
              </div>

              {/* Feedback Alert for Drive Upload */}
              {driveSuccessResult && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <Check size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>¡Respaldo exportado exitosamente a Google Drive!</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 text-[10px] font-mono">
                        {driveSuccessResult.id.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-mono">
                      {driveSuccessResult.name}
                    </div>
                    {driveSuccessResult.webViewLink && (
                      <a
                        href={driveSuccessResult.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 underline hover:no-underline pt-0.5"
                      >
                        <span>Abrir archivo en Google Drive</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {driveError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                  <div className="flex-1">{driveError}</div>
                </div>
              )}

              {/* PROGRAMMING CONFIGURATION CARD */}
              <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 space-y-4 shadow-xs">
                {/* 1. Toggle switch for automated backups */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800/80">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <Clock size={15} className="text-amber-500" />
                        <span>Respaldo Automático en Google Drive</span>
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          driveConfig.enabled
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                            : "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                        }`}
                      >
                        {driveConfig.enabled ? "Activo" : "Pausado"}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Exporta y almacena el JSON completo automáticamente en tu Google Drive personal.
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      id="toggle-drive-backup"
                      checked={driveConfig.enabled}
                      onChange={(e) => updateDriveConfig({ enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* 2. Frequency Selector (Semanal / Diario) */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1.5 uppercase tracking-wider">
                      Frecuencia de Respaldo:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        id="freq-semanal-btn"
                        onClick={() => updateDriveConfig({ frequency: "weekly" })}
                        className={`p-2.5 rounded-xl border text-left font-bold text-xs transition-all flex items-center justify-between ${
                          driveConfig.frequency === "weekly"
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs"
                            : "border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 text-stone-700 dark:text-stone-300 hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar size={15} className="text-amber-500" />
                          <div>
                            <div>Semanal</div>
                            <div className="text-[10px] font-normal opacity-80">Cada 7 días</div>
                          </div>
                        </div>
                        {driveConfig.frequency === "weekly" && (
                          <Check size={14} className="text-amber-600 dark:text-amber-400" />
                        )}
                      </button>

                      <button
                        type="button"
                        id="freq-diario-btn"
                        onClick={() => updateDriveConfig({ frequency: "daily" })}
                        className={`p-2.5 rounded-xl border text-left font-bold text-xs transition-all flex items-center justify-between ${
                          driveConfig.frequency === "daily"
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs"
                            : "border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 text-stone-700 dark:text-stone-300 hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock size={15} className="text-blue-500" />
                          <div>
                            <div>Diario</div>
                            <div className="text-[10px] font-normal opacity-80">Cada 24 horas</div>
                          </div>
                        </div>
                        {driveConfig.frequency === "daily" && (
                          <Check size={14} className="text-amber-600 dark:text-amber-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Contextual Options & Next Schedule */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Day Selector when Weekly */}
                    {driveConfig.frequency === "weekly" ? (
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                          Día programado de la semana:
                        </label>
                        <select
                          value={driveConfig.preferredDayOfWeek ?? 1}
                          onChange={(e) =>
                            updateDriveConfig({ preferredDayOfWeek: parseInt(e.target.value, 10) })
                          }
                          disabled={!driveConfig.enabled}
                          className="w-full py-2 px-3 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
                        >
                          {DAYS_OF_WEEK.map((d) => (
                            <option key={d.val} value={d.val}>
                              Cada {d.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex flex-col justify-center text-[11px]">
                        <span className="font-bold text-blue-900 dark:text-blue-200">
                          Respaldo Diario Activo
                        </span>
                        <span className="text-stone-500 dark:text-stone-400 mt-0.5">
                          Se ejecuta silenciosamente cada 24 horas al detectar conexión activa.
                        </span>
                      </div>
                    )}

                    {/* Next scheduled date card */}
                    <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700/70 flex flex-col justify-center text-[11px] space-y-1">
                      <div className="text-stone-400">Próxima ejecución estimada:</div>
                      <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1 capitalize">
                        <Calendar size={13} className="text-amber-500 shrink-0" />
                        <span className="truncate">{formatScheduledDate()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button: Subir Respaldo a Drive Ahora */}
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    {driveConfig.lastBackupAt ? (
                      <span>
                        Último respaldo:{" "}
                        <strong className="text-stone-800 dark:text-stone-200">
                          {new Date(driveConfig.lastBackupAt).toLocaleString("es-MX", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </strong>
                      </span>
                    ) : (
                      <span>Sin respaldos previos registrados en Drive</span>
                    )}
                  </div>

                  <button
                    type="button"
                    id="btn-subir-drive-ahora"
                    onClick={handleRunDriveBackupNow}
                    disabled={isUploadingDrive}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-950 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    {isUploadingDrive ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-amber-400 dark:text-amber-600" />
                        <span>Subiendo a Google Drive...</span>
                      </>
                    ) : (
                      <>
                        <Cloud size={14} className="text-amber-400 dark:text-amber-600" />
                        <span>Subir Respaldo a Drive Ahora 🚀</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 3. TABLA QUE MUESTRA EL HISTORIAL DE RESPALDOS EJECUTADOS EXITOSAMENTE */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History size={15} className="text-stone-500" />
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                      Historial de Respaldos Ejecutados Exitosamente
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                    {driveHistory.length} respaldos
                  </span>
                </div>

                {driveHistory.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-center space-y-2">
                    <Database size={28} className="mx-auto text-stone-300 dark:text-stone-600" />
                    <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
                      Aún no se han ejecutado respaldos en Google Drive
                    </p>
                    <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                      Presiona el botón "Subir Respaldo a Drive Ahora" o espera a la próxima ejecución programada para registrar el primer archivo en tu historial.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden bg-white dark:bg-stone-900 shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                            <th className="py-2.5 px-3">Fecha y Hora</th>
                            <th className="py-2.5 px-3">Frecuencia</th>
                            <th className="py-2.5 px-3">Archivo en Drive</th>
                            <th className="py-2.5 px-3">Tamaño</th>
                            <th className="py-2.5 px-3">Contenido</th>
                            <th className="py-2.5 px-3">Estado</th>
                            <th className="py-2.5 px-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-[11px]">
                          {driveHistory.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors"
                            >
                              {/* Date & Time */}
                              <td className="py-2.5 px-3 whitespace-nowrap font-medium text-stone-700 dark:text-stone-300">
                                {new Date(item.createdAt).toLocaleString("es-MX", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </td>

                              {/* Frequency Badge */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    item.frequency === "daily"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                      : item.frequency === "weekly"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                      : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                  }`}
                                >
                                  {item.frequency === "daily"
                                    ? "Diario"
                                    : item.frequency === "weekly"
                                    ? "Semanal"
                                    : "Manual"}
                                </span>
                              </td>

                              {/* File Name */}
                              <td className="py-2.5 px-3 font-mono text-stone-900 dark:text-stone-100 max-w-[170px] truncate">
                                <span className="flex items-center gap-1.5 truncate" title={item.fileName}>
                                  <Cloud size={13} className="text-blue-500 shrink-0" />
                                  <span className="truncate">{item.fileName}</span>
                                </span>
                              </td>

                              {/* Size */}
                              <td className="py-2.5 px-3 whitespace-nowrap font-mono text-stone-500">
                                {formatFileSize(item.fileSize)}
                              </td>

                              {/* Content Summary */}
                              <td className="py-2.5 px-3 whitespace-nowrap text-stone-600 dark:text-stone-400 text-[10px]">
                                {item.tasksCount} tareas • {item.urlsCount} links • {item.quickResponsesCount || 0} plantillas
                              </td>

                              {/* Status Badge */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                                  <Check size={11} className="text-emerald-600 dark:text-emerald-400" />
                                  <span>Exitoso</span>
                                </span>
                              </td>

                              {/* Action Link */}
                              <td className="py-2.5 px-3 whitespace-nowrap text-right">
                                {item.webViewLink ? (
                                  <a
                                    href={item.webViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-blue-50 dark:bg-stone-800 dark:hover:bg-blue-950/50 text-stone-700 hover:text-blue-600 dark:text-stone-300 dark:hover:text-blue-300 font-bold text-[10px] transition-colors"
                                    title="Abrir archivo en Google Drive"
                                  >
                                    <span>Abrir en Drive</span>
                                    <ExternalLink size={11} />
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-stone-400 font-mono">Guardado</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LOCAL JSON BACKUP */}
          {activeTab === "local" && (
            <div className="space-y-4">
              {importStatus && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Export Button Box */}
                <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <Download size={14} className="text-amber-500" />
                      <span>Exportar Estado JSON</span>
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                      Descarga un archivo con las {tasks.length} tareas, {globalResources.length} recursos globales, {urlLibrary.length} enlaces y {quickResponses.length} respuestas rápidas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportLocal}
                    className="w-full py-2.5 px-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 min-h-[42px] shadow-sm"
                  >
                    <Download size={15} />
                    <span>Descargar Archivo JSON</span>
                  </button>
                </div>

                {/* Import Button Box */}
                <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <Upload size={14} className="text-blue-500" />
                      <span>Importar Respaldo JSON</span>
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                      Carga un archivo de respaldo previo para migrar o restaurar todo el estado en Firestore y almacenamiento local.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-colors flex items-center justify-center gap-1.5 min-h-[42px] shadow-sm"
                  >
                    <Upload size={15} />
                    <span>Seleccionar Archivo</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-400 text-center flex items-center justify-center gap-1.5 shrink-0">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>Garantía de soberanía: Tus datos y respaldos son 100% privados y portables.</span>
        </div>
      </div>
    </div>
  );
}
