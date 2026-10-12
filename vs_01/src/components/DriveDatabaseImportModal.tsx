import React, { useState, useId, useRef } from "react";
import {
  X,
  FileSpreadsheet,
  Upload,
  Link2,
  Users,
  Award,
  Archive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Database,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { collection, doc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { playChime } from "../utils/audio";
import {
  ImportTarget,
  ParsedDataResult,
  FieldMapping,
  AlumnoImportItem,
  SolicitudImportItem,
  parseTabularData,
  autoDetectFieldMapping,
  buildAlumnosFromRows,
  buildSolicitudesFromRows,
} from "../utils/driveImportParser";
import { AlumnoPendiente } from "./AlumnosPendientesSection";
import { ReconocimientoRecord } from "./ReconocimientosOS";

interface DriveDatabaseImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTarget?: ImportTarget;
  existingAlumnos: AlumnoPendiente[];
  existingRecords: ReconocimientoRecord[];
  onImportAlumnosSuccess?: (newAlumnos: AlumnoPendiente[]) => void;
  onImportReconocimientosSuccess?: (newRecords: ReconocimientoRecord[]) => void;
}

export default function DriveDatabaseImportModal({
  isOpen,
  onClose,
  initialTarget = "alumnos",
  existingAlumnos,
  existingRecords,
  onImportAlumnosSuccess,
  onImportReconocimientosSuccess,
}: DriveDatabaseImportModalProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Target: "alumnos" | "solicitudes" | "historial"
  const [target, setTarget] = useState<ImportTarget>(initialTarget);

  // Method: "drive_link" | "upload_file" | "paste_text"
  const [method, setMethod] = useState<"drive_link" | "upload_file" | "paste_text">("drive_link");

  // Input states
  const [driveUrl, setDriveUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Parsed data state
  const [parsedData, setParsedData] = useState<ParsedDataResult | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [showMappingConfig, setShowMappingConfig] = useState(false);

  // Prepared items to import
  const [preparedAlumnos, setPreparedAlumnos] = useState<AlumnoImportItem[]>([]);
  const [preparedSolicitudes, setPreparedSolicitudes] = useState<SolicitudImportItem[]>([]);

  // Default fallback values
  const [defaultCasa, setDefaultCasa] = useState("Gladiadores Casa Martha Sangerman");
  const [defaultGeneracion, setDefaultGeneracion] = useState("Generación 2026");
  const [defaultRol, setDefaultRol] = useState("Participante");
  const [defaultEstatus, setDefaultEstatus] = useState("Admitido");
  const [defaultDiplomado, setDefaultDiplomado] = useState("Liderazgo I");
  const [defaultYear, setDefaultYear] = useState("2026");
  const [defaultGrupo, setDefaultGrupo] = useState("G-1");
  const [defaultZona, setDefaultZona] = useState("Jaguar");

  // Execution state
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ total: number; done: number; errorCount: number }>({
    total: 0,
    done: 0,
    errorCount: 0,
  });
  const [importSummary, setImportSummary] = useState<{ count: number; target: ImportTarget } | null>(null);

  if (!isOpen) return null;

  // Reset to initial step
  const handleResetData = () => {
    setParsedData(null);
    setPreparedAlumnos([]);
    setPreparedSolicitudes([]);
    setImportSummary(null);
    setUrlError(null);
  };

  // Change target
  const handleSwitchTarget = (newTarget: ImportTarget) => {
    setTarget(newTarget);
    if (parsedData) {
      applyMappingAndBuild(parsedData.rawRows, parsedData.headers, newTarget);
    }
  };

  // Apply mapping and generate preview items
  const applyMappingAndBuild = (
    rows: Record<string, string>[],
    headers: string[],
    activeTarget: ImportTarget,
    customMapping?: FieldMapping
  ) => {
    const mapping = customMapping || autoDetectFieldMapping(headers, activeTarget);
    setFieldMapping(mapping);

    if (activeTarget === "alumnos") {
      const items = buildAlumnosFromRows(rows, mapping, existingAlumnos, {
        casa: defaultCasa,
        generacion: defaultGeneracion,
        rol: defaultRol,
        estatus: defaultEstatus,
      });
      setPreparedAlumnos(items);
    } else {
      const items = buildSolicitudesFromRows(rows, mapping, existingRecords, {
        diplomado: defaultDiplomado,
        year: defaultYear,
        rol: defaultRol === "Participante" ? "Líder" : defaultRol,
        grupo: defaultGrupo,
        zona: defaultZona,
      });
      setPreparedSolicitudes(items);
    }
  };

  // Parse raw text (from file, paste or fetched drive URL)
  const processRawContent = (content: string, sourceName?: string) => {
    setUrlError(null);
    try {
      const parsed = parseTabularData(content);
      if (parsed.totalRows === 0) {
        setUrlError("No se encontraron filas con datos en el archivo o enlace proporcionado.");
        playChime("tick");
        return;
      }
      setParsedData(parsed);
      applyMappingAndBuild(parsed.rawRows, parsed.headers, target);
      playChime("success");
    } catch (err: any) {
      console.error("Error parsing content:", err);
      setUrlError(`Error al procesar el contenido tabular: ${err.message || err}`);
    }
  };

  // Fetch from Google Drive / Sheets via backend proxy
  const handleFetchDriveUrl = async () => {
    const cleanUrl = driveUrl.trim();
    if (!cleanUrl) {
      setUrlError("Ingresa una URL de Google Drive o Google Sheets válida.");
      return;
    }

    setIsFetchingUrl(true);
    setUrlError(null);

    try {
      const res = await fetch("/api/drive/fetch-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo extraer la base de datos de Google Drive");
      }

      processRawContent(data.csvText, "Google Drive");
    } catch (err: any) {
      console.error("Drive fetch error:", err);
      setUrlError(
        err.message ||
          "Error al conectar con Google Drive. Verifica que el documento tenga permisos públicos de lectura o descárgalo como CSV y súbelo."
      );
      playChime("tick");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Handle file drop / change
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        processRawContent(text, file.name);
      }
    };
    reader.onerror = () => {
      setUrlError("Error al leer el archivo en el navegador.");
    };
    reader.readAsText(file, "UTF-8");
  };

  // Toggle selection
  const handleToggleSelectAll = (select: boolean) => {
    if (target === "alumnos") {
      setPreparedAlumnos((prev) => prev.map((item) => ({ ...item, selected: select })));
    } else {
      setPreparedSolicitudes((prev) => prev.map((item) => ({ ...item, selected: select })));
    }
  };

  const handleToggleDeselectDuplicates = () => {
    if (target === "alumnos") {
      setPreparedAlumnos((prev) =>
        prev.map((item) => ({
          ...item,
          selected: item.isDuplicate ? false : true,
        }))
      );
    } else {
      setPreparedSolicitudes((prev) =>
        prev.map((item) => ({
          ...item,
          selected: item.isDuplicate ? false : true,
        }))
      );
    }
  };

  const handleToggleSingleItem = (id: string) => {
    if (target === "alumnos") {
      setPreparedAlumnos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
      );
    } else {
      setPreparedSolicitudes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
      );
    }
  };

  // Execute batch save to Firestore
  const handleExecuteImport = async () => {
    setIsSaving(true);
    let done = 0;
    let errorCount = 0;

    try {
      if (target === "alumnos") {
        const selected = preparedAlumnos.filter((a) => a.selected);
        if (selected.length === 0) {
          alert("No seleccionaste ningún alumno para importar.");
          setIsSaving(false);
          return;
        }

        setSaveProgress({ total: selected.length, done: 0, errorCount: 0 });

        const importedObjects: AlumnoPendiente[] = [];

        for (const item of selected) {
          try {
            const payload: AlumnoPendiente = {
              id: item.id,
              nombre: item.nombre,
              email: item.email,
              telefono: item.telefono,
              estatus: item.estatus,
              casa: item.casa,
              generacion: item.generacion,
              rol: item.rol,
              notas: item.notas ? `[Importado de Drive] ${item.notas}` : "[Importado de Drive]",
              fechaRegistro: item.fechaRegistro || new Date().toISOString().split("T")[0],
              contactadoWhatsApp: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await setDoc(doc(db, "alumnos_pendientes", item.id), payload);
            importedObjects.push(payload);
            done++;
            setSaveProgress({ total: selected.length, done, errorCount });
          } catch (e) {
            console.error("Error saving alumno to firestore", e);
            errorCount++;
          }
        }

        if (onImportAlumnosSuccess) {
          onImportAlumnosSuccess(importedObjects);
        }

        playChime("success");
        setImportSummary({ count: done, target: "alumnos" });
      } else {
        // Solicitudes o Historial
        const selected = preparedSolicitudes.filter((s) => s.selected);
        if (selected.length === 0) {
          alert("No seleccionaste ningún registro para importar.");
          setIsSaving(false);
          return;
        }

        setSaveProgress({ total: selected.length, done: 0, errorCount: 0 });
        const importedRecords: ReconocimientoRecord[] = [];

        for (const item of selected) {
          try {
            const isHistorial = target === "historial";
            const payload: any = {
              nombre: item.nombre,
              rol: item.rol,
              grupo: item.grupo,
              zona: item.zona,
              diplomado: item.diplomado,
              year: item.year,
              tipoImpresion: item.tipoImpresion,
              costo: item.costo,
              telefono: item.telefono || null,
              email: item.email || null,
              driveUrl: item.driveUrl || null,
              notas: item.notas ? `[Importado de Drive] ${item.notas}` : "[Importado de Drive]",
              elaboradoDigital: isHistorial ? true : Boolean(item.elaboradoDigital),
              pagado: isHistorial ? true : item.pagado,
              cuadernillos: isHistorial ? true : item.cuadernillos,
              audio: isHistorial ? true : item.audio,
              digital: isHistorial ? true : item.digital,
              impreso: isHistorial ? true : item.impreso,
              entregado: isHistorial ? true : item.entregado,
              createdAt: new Date().toISOString(),
              entregadoAt: isHistorial ? new Date().toISOString() : null,
              timestamp: serverTimestamp(),
            };

            // Guardar en ambas colecciones con mismo ID
            const docRef = await addDoc(collection(db, "solicitudes"), payload);
            await setDoc(doc(db, "reconocimientos", docRef.id), {
              ...payload,
              solicitudId: docRef.id,
            });

            importedRecords.push({
              ...payload,
              id: docRef.id,
              solicitudId: docRef.id,
              telefono: item.telefono,
              email: item.email,
              driveUrl: item.driveUrl,
              notas: payload.notas,
            });

            done++;
            setSaveProgress({ total: selected.length, done, errorCount });
          } catch (e) {
            console.error("Error saving solicitud to firestore", e);
            errorCount++;
          }
        }

        if (onImportReconocimientosSuccess) {
          onImportReconocimientosSuccess(importedRecords);
        }

        playChime("success");
        setImportSummary({ count: done, target });
      }
    } catch (err: any) {
      console.error("Critical error during import:", err);
      alert(`Error durante la importación: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount =
    target === "alumnos"
      ? preparedAlumnos.filter((a) => a.selected).length
      : preparedSolicitudes.filter((s) => s.selected).length;

  const duplicatesCount =
    target === "alumnos"
      ? preparedAlumnos.filter((a) => a.isDuplicate).length
      : preparedSolicitudes.filter((s) => s.isDuplicate).length;

  const totalPrepared =
    target === "alumnos" ? preparedAlumnos.length : preparedSolicitudes.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 text-white shrink-0 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-white/20 backdrop-blur-md text-white text-lg">
                  <Database size={18} />
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 text-indigo-100">
                  Administración Interna • Google Drive
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                Importar Base de Datos desde Google Drive
              </h3>
              <p className="text-xs text-indigo-100 max-w-2xl leading-relaxed">
                Carga listas completas desde enlaces de Google Sheets, archivos CSV o datos tabulares directamente a tus listas de alumnos y solicitudes.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
              title="Cerrar modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Success Banner */}
          {importSummary && (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3 animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500 text-white">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-100">
                    ¡Importación completada con éxito!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Se agregaron correctamente <strong>{importSummary.count}</strong> registros a la lista de{" "}
                    <strong>
                      {importSummary.target === "alumnos"
                        ? "Alumnos Pendientes"
                        : importSummary.target === "solicitudes"
                        ? "Solicitudes de Reconocimiento"
                        : "Historial de Entregados"}
                    </strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetData}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-stone-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold hover:bg-emerald-100/50 transition cursor-pointer"
                >
                  Importar otra base de datos
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Listo, volver al portal
                </button>
              </div>
            </div>
          )}

          {!importSummary && (
            <>
              {/* TARGET SELECTION TABS */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  1. ¿A qué lista deseas agregar esta base de datos?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSwitchTarget("alumnos")}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                      target === "alumnos"
                        ? "bg-amber-500/10 dark:bg-amber-500/20 border-amber-500 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/30"
                        : "bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-stone-300"
                    }`}
                  >
                    <span className={`p-2 rounded-xl shrink-0 ${target === "alumnos" ? "bg-amber-500 text-white" : "bg-stone-200 dark:bg-stone-700"}`}>
                      <Users size={18} />
                    </span>
                    <div>
                      <div className="text-xs font-black">Alumnos Nuevos / Pendientes</div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5">
                        Admitidos, pagos iniciales y seguimiento por WhatsApp
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchTarget("solicitudes")}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                      target === "solicitudes"
                        ? "bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/30"
                        : "bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-stone-300"
                    }`}
                  >
                    <span className={`p-2 rounded-xl shrink-0 ${target === "solicitudes" ? "bg-indigo-600 text-white" : "bg-stone-200 dark:bg-stone-700"}`}>
                      <Award size={18} />
                    </span>
                    <div>
                      <div className="text-xs font-black">Solicitudes de Reconocimiento</div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5">
                        Seguimiento operativo de impresión física y digital
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchTarget("historial")}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                      target === "historial"
                        ? "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30"
                        : "bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-stone-300"
                    }`}
                  >
                    <span className={`p-2 rounded-xl shrink-0 ${target === "historial" ? "bg-emerald-600 text-white" : "bg-stone-200 dark:bg-stone-700"}`}>
                      <Archive size={18} />
                    </span>
                    <div>
                      <div className="text-xs font-black">Historial de Entregados</div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5">
                        Registros históricos pagados y entregados
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* INPUT STEP: IF NOT PARSED YET */}
              {!parsedData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      2. Elige cómo proporcionar los datos
                    </label>

                    {/* Method Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => { setMethod("drive_link"); setUrlError(null); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          method === "drive_link"
                            ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs"
                            : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                        }`}
                      >
                        <Link2 size={13} />
                        <span>Enlace de Drive / Sheets</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setMethod("upload_file"); setUrlError(null); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          method === "upload_file"
                            ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs"
                            : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                        }`}
                      >
                        <Upload size={13} />
                        <span>Subir Archivo (.csv)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setMethod("paste_text"); setUrlError(null); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          method === "paste_text"
                            ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs"
                            : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                        }`}
                      >
                        <FileText size={13} />
                        <span>Pegar Celdas</span>
                      </button>
                    </div>
                  </div>

                  {/* METHOD 1: DRIVE URL */}
                  {method === "drive_link" && (
                    <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-4">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="text-emerald-600 dark:text-emerald-400" size={20} />
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          Pega el enlace de tu Google Sheet o archivo en Drive
                        </h4>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="url"
                              placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0X.../edit#gid=0"
                              value={driveUrl}
                              onChange={(e) => {
                                setDriveUrl(e.target.value);
                                setUrlError(null);
                              }}
                              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={isFetchingUrl || !driveUrl.trim()}
                            onClick={handleFetchDriveUrl}
                            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                          >
                            {isFetchingUrl ? (
                              <>
                                <RefreshCw className="animate-spin" size={14} />
                                <span>Conectando con Drive...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={14} />
                                <span>Extraer y Previsualizar</span>
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          💡 <strong>Consejo:</strong> Asegúrate de que tu hoja de Google Drive tenga permisos de lectura ("Cualquier persona que tenga el vínculo puede ver") o copia las celdas y pégalas en la pestaña "Pegar Celdas".
                        </p>
                      </div>
                    </div>
                  )}

                  {/* METHOD 2: FILE UPLOAD */}
                  {method === "upload_file" && (
                    <div className="p-8 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border-2 border-dashed border-stone-300 dark:border-stone-700 text-center space-y-3">
                      <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Upload size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          Sube tu base de datos exportada de Drive
                        </h4>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                          Arrastra y suelta tu archivo <strong>.csv</strong>, <strong>.tsv</strong> o <strong>.txt</strong> aquí
                        </p>
                      </div>

                      <input
                        id={fileInputId}
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.tsv,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      <div>
                        <label
                          htmlFor={fileInputId}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 text-xs font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-100 transition shadow-xs cursor-pointer"
                        >
                          <FileSpreadsheet size={14} />
                          <span>Seleccionar archivo desde mi equipo</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* METHOD 3: PASTE TEXT */}
                  {method === "paste_text" && (
                    <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="text-indigo-600 dark:text-indigo-400" size={18} />
                          <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                            Pega las celdas copiadas de Google Sheets o Excel
                          </h4>
                        </div>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400">
                          Selecciona las filas en Sheets con Ctrl+C y pégalas aquí con Ctrl+V
                        </span>
                      </div>

                      <textarea
                        rows={6}
                        placeholder="Nombre Completo	Correo Electrónico	Teléfono	Casa	Generación&#10;Juan Pérez	juan@gmail.com	3121234567	Gladiadores Casa Jaguar	Generación 2026&#10;María López	maria@hotmail.com	3129876543	Gladiadores Casa Martha	Generación 2026"
                        value={pastedText}
                        onChange={(e) => {
                          setPastedText(e.target.value);
                          setUrlError(null);
                        }}
                        className="w-full px-3.5 py-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />

                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!pastedText.trim()}
                          onClick={() => processRawContent(pastedText, "Texto Pegado")}
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles size={14} />
                          <span>Procesar Celdas</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Error display */}
                  {urlError && (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                      <div className="flex-1 leading-relaxed">{urlError}</div>
                    </div>
                  )}
                </div>
              )}

              {/* PREVIEW & MAPPING STEP: IF DATA PARSED */}
              {parsedData && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  
                  {/* Summary Bar */}
                  <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100">
                        <Database size={15} className="text-indigo-600" />
                        <span>{totalPrepared} registros detectados</span>
                      </div>

                      <span className="text-stone-300 dark:text-stone-700">|</span>

                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 size={14} />
                        <span>{selectedCount} seleccionados para importar</span>
                      </div>

                      {duplicatesCount > 0 && (
                        <>
                          <span className="text-stone-300 dark:text-stone-700">|</span>
                          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                            <AlertCircle size={14} />
                            <span>{duplicatesCount} posibles duplicados advertidos</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowMappingConfig(!showMappingConfig)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Filter size={13} />
                        <span>Mapeo de Columnas</span>
                        {showMappingConfig ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={handleResetData}
                        className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-700/80 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-300 transition cursor-pointer"
                      >
                        Cambiar fuente
                      </button>
                    </div>
                  </div>

                  {/* COLUMN MAPPING ACCORDION */}
                  {showMappingConfig && (
                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300">
                          Asignación de Columnas del Archivo
                        </h4>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400">
                          Ajusta qué columna de tu hoja corresponde a cada campo
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {/* Nombre */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400">Nombre *</label>
                          <select
                            value={fieldMapping.nombre || ""}
                            onChange={(e) => {
                              const next = { ...fieldMapping, nombre: e.target.value };
                              applyMappingAndBuild(parsedData.rawRows, parsedData.headers, target, next);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
                          >
                            <option value="">-- No asignado --</option>
                            {parsedData.headers.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400">Correo Electrónico</label>
                          <select
                            value={fieldMapping.email || ""}
                            onChange={(e) => {
                              const next = { ...fieldMapping, email: e.target.value };
                              applyMappingAndBuild(parsedData.rawRows, parsedData.headers, target, next);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
                          >
                            <option value="">-- No asignado --</option>
                            {parsedData.headers.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {/* Teléfono */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400">Teléfono / WhatsApp</label>
                          <select
                            value={fieldMapping.telefono || ""}
                            onChange={(e) => {
                              const next = { ...fieldMapping, telefono: e.target.value };
                              applyMappingAndBuild(parsedData.rawRows, parsedData.headers, target, next);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
                          >
                            <option value="">-- No asignado --</option>
                            {parsedData.headers.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {target === "alumnos" ? (
                          <>
                            {/* Casa */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400">Casa / Grupo</label>
                              <select
                                value={fieldMapping.casa || ""}
                                onChange={(e) => {
                                  const next = { ...fieldMapping, casa: e.target.value };
                                  applyMappingAndBuild(parsedData.rawRows, parsedData.headers, target, next);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
                              >
                                <option value="">-- No asignado (Usa defecto) --</option>
                                {parsedData.headers.map((h) => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Link Drive */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400">Link Drive Reconocimiento</label>
                              <select
                                value={fieldMapping.driveUrl || ""}
                                onChange={(e) => {
                                  const next = { ...fieldMapping, driveUrl: e.target.value };
                                  applyMappingAndBuild(parsedData.rawRows, parsedData.headers, target, next);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
                              >
                                <option value="">-- No asignado --</option>
                                {parsedData.headers.map((h) => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TABLE SELECTION CONTROLS */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(true)}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold hover:bg-stone-200 transition cursor-pointer"
                      >
                        Seleccionar todos
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(false)}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold hover:bg-stone-200 transition cursor-pointer"
                      >
                        Deseleccionar todos
                      </button>
                      {duplicatesCount > 0 && (
                        <button
                          type="button"
                          onClick={handleToggleDeselectDuplicates}
                          className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold hover:bg-amber-200 transition cursor-pointer"
                        >
                          Deseleccionar duplicados ({duplicatesCount})
                        </button>
                      )}
                    </div>

                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      Mostrando {totalPrepared} filas parseadas
                    </span>
                  </div>

                  {/* PREVIEW TABLE */}
                  <div className="rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden shadow-xs">
                    <div className="max-h-72 overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-stone-100 dark:bg-stone-800/90 text-stone-700 dark:text-stone-300 font-bold border-b border-stone-200 dark:border-stone-700 z-10 backdrop-blur-xs">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={selectedCount === totalPrepared && totalPrepared > 0}
                                onChange={(e) => handleToggleSelectAll(e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </th>
                            <th className="py-2.5 px-3">Nombre</th>
                            <th className="py-2.5 px-3">Contacto</th>
                            {target === "alumnos" ? (
                              <>
                                <th className="py-2.5 px-3">Estatus</th>
                                <th className="py-2.5 px-3">Casa / Generación</th>
                              </>
                            ) : (
                              <>
                                <th className="py-2.5 px-3">Tipo / Costo</th>
                                <th className="py-2.5 px-3">Generación</th>
                                <th className="py-2.5 px-3">Drive</th>
                              </>
                            )}
                            <th className="py-2.5 px-3">Validación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                          {target === "alumnos" ? (
                            preparedAlumnos.map((item) => (
                              <tr
                                key={item.id}
                                className={`transition ${
                                  item.selected
                                    ? "bg-white dark:bg-stone-900"
                                    : "bg-stone-50/50 dark:bg-stone-900/40 opacity-60"
                                } hover:bg-stone-50 dark:hover:bg-stone-850`}
                              >
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={item.selected}
                                    onChange={() => handleToggleSingleItem(item.id)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2.5 px-3 font-bold text-stone-900 dark:text-stone-100">
                                  {item.nombre}
                                  {item.rol && (
                                    <span className="block text-[10px] text-stone-500 font-normal">
                                      {item.rol}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-stone-600 dark:text-stone-300">
                                  <div className="font-mono text-[11px]">{item.telefono || "Sin tel"}</div>
                                  <div className="text-[10px] text-stone-500 truncate max-w-[140px]">{item.email || "Sin email"}</div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                                    {item.estatus}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-stone-600 dark:text-stone-400 text-[11px]">
                                  <div className="font-medium text-stone-800 dark:text-stone-200 truncate max-w-[140px]">{item.casa}</div>
                                  <div className="text-[10px]">{item.generacion}</div>
                                </td>
                                <td className="py-2.5 px-3">
                                  {item.isDuplicate ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300" title={item.duplicateReason}>
                                      <AlertCircle size={11} />
                                      <span>Duplicado</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                                      <Check size={11} />
                                      <span>Nuevo</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            preparedSolicitudes.map((item) => (
                              <tr
                                key={item.id}
                                className={`transition ${
                                  item.selected
                                    ? "bg-white dark:bg-stone-900"
                                    : "bg-stone-50/50 dark:bg-stone-900/40 opacity-60"
                                } hover:bg-stone-50 dark:hover:bg-stone-850`}
                              >
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={item.selected}
                                    onChange={() => handleToggleSingleItem(item.id)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2.5 px-3 font-bold text-stone-900 dark:text-stone-100">
                                  {item.nombre}
                                  <span className="block text-[10px] text-stone-500 font-normal">
                                    {item.rol} • {item.grupo}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-stone-600 dark:text-stone-300">
                                  <div className="font-mono text-[11px]">{item.telefono || "Sin tel"}</div>
                                  <div className="text-[10px] text-stone-500 truncate max-w-[140px]">{item.email || "Sin email"}</div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300">
                                    {item.tipoImpresion} (${item.costo})
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-stone-700 dark:text-stone-300 font-medium">
                                  {item.year}
                                </td>
                                <td className="py-2.5 px-3">
                                  {item.driveUrl ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                                      <Link2 size={11} /> Con enlace
                                    </span>
                                  ) : (
                                    <span className="text-stone-400 text-[10px]">Sin link</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  {item.isDuplicate ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300" title={item.duplicateReason}>
                                      <AlertCircle size={11} />
                                      <span>Duplicado</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                                      <Check size={11} />
                                      <span>Nuevo</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Modal Footer */}
        {!importSummary && (
          <div className="p-4 sm:p-5 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-stone-500 dark:text-stone-400">
              {parsedData ? (
                <span>
                  Listo para guardar <strong>{selectedCount}</strong> registros seleccionados en Firestore.
                </span>
              ) : (
                <span>Ingresa el enlace de Google Drive o sube un archivo para continuar.</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                Cancelar
              </button>

              {parsedData && (
                <button
                  type="button"
                  disabled={isSaving || selectedCount === 0}
                  onClick={handleExecuteImport}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} />
                      <span>
                        Importando... ({saveProgress.done}/{saveProgress.total})
                      </span>
                    </>
                  ) : (
                    <>
                      <Database size={14} />
                      <span>
                        Importar {selectedCount} {target === "alumnos" ? "Alumnos" : "Registros"} a la Base de Datos
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
