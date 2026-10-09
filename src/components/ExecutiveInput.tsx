import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Sparkles,
  CornerDownLeft,
  Clipboard,
  Loader2,
  Image as ImageIcon,
  X,
  UploadCloud,
  FileText,
  Tag as TagIcon,
  FolderKanban,
  ChevronDown,
  ChevronUp,
  Link2,
  Bookmark,
  Globe,
  Pin,
  Plus,
  Phone,
  Hash,
  Calendar as CalendarIcon,
  User,
  Check,
  CheckCircle2,
  ListPlus,
  Layers,
  Eye,
  Trash2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { TagItem, Contact, TaskResource } from "../types";
import { extractUrls } from "../lib/executiveRouter";
import { getTagColorClass } from "../utils/tagColors";
import { playChime } from "../utils/audio";

export interface DirectTaskData {
  tarea: string;
  solicitante?: string;
  telefono?: string;
  numeroFolio?: string;
  etiquetas?: string[];
  dominio?: string;
  fechaLimite?: string;
  notas?: string;
  imagenReferencia?: string;
  resources?: TaskResource[];
}

interface ExecutiveInputProps {
  onSubmit: (
    input: string,
    imageBase64?: string,
    imageMimeType?: string,
    selectedTags?: string[],
    preassignedCategory?: string,
    urlDestinationOverride?: "TASK" | "GLOBAL" | "URL_LIBRARY" | null
  ) => void;
  onDirectCreateTask?: (taskData: DirectTaskData) => void;
  isLoading: boolean;
  availableTags: TagItem[];
  availableContacts?: Contact[];
  onOpenManageTags: () => void;
  activeTaskTitle?: string | null;
}

export const CATEGORY_OPTIONS = [
  { value: "", label: "Detectar automáticamente", badge: "Auto" },
  { value: "FGDLL", label: "FGDLL", badge: "FGDLL" },
  { value: "Personal", label: "Personal", badge: "Personal" },
  { value: "Technology", label: "Technology", badge: "Tech" },
  { value: "Universidad", label: "Universidad", badge: "Uni" },
  { value: "Diseño", label: "Diseño", badge: "Diseño" },
  { value: "Profesional", label: "Profesional", badge: "Prof" },
  { value: "Laura", label: "Laura", badge: "Laura" },
  { value: "Lonas", label: "Lonas", badge: "Lonas" },
  { value: "Reconocimientos", label: "Reconocimientos", badge: "Diplomas" },
];

const PRESET_EXAMPLES = [
  {
    label: "Laura (Reconocimientos)",
    icon: "👩",
    text: "Mensaje de Laura: Oye, acuérdate de corregir los reconocimientos antes de enviarlos.",
  },
  {
    label: "Líder Tiburón (Lona)",
    icon: "🦈",
    text: "El líder de Tiburón me dijo que necesita su lona máximo mañana porque la experiencia es el viernes.",
  },
  {
    label: "🎵 Suno AI (Biblioteca)",
    icon: "🎶",
    text: "biblioteca https://suno.com",
  },
  {
    label: "🎨 Canva (Biblioteca)",
    icon: "🎨",
    text: "guardar url https://canva.com",
  },
  {
    label: "Pomodoro (Ley 27)",
    icon: "⏱️",
    text: "Ponme un pomodoro, me voy a enfocar en la lona de Tiburón.",
  },
  {
    label: "Terminar tarea 1",
    icon: "✅",
    text: "Ya terminé el 1.",
  },
];

type ProcessorMode = "enrich" | "ai" | "batch";

export default function ExecutiveInput({
  onSubmit,
  onDirectCreateTask,
  isLoading,
  availableTags,
  availableContacts = [],
  onOpenManageTags,
  activeTaskTitle,
}: ExecutiveInputProps) {
  // Main mode selector
  const [mode, setMode] = useState<ProcessorMode>("enrich");

  // Core task description / pending text
  const [taskText, setTaskText] = useState("");

  // Enrichment fields
  const [solicitante, setSolicitante] = useState("");
  const [telefono, setTelefono] = useState("");
  const [numeroFolio, setNumeroFolio] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [fechaLimite, setFechaLimite] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [recursoUrl, setRecursoUrl] = useState("");
  const [recursoTitulo, setRecursoTitulo] = useState("");

  // Enrichment panels expansion toggles
  const [activePanel, setActivePanel] = useState<
    "image" | "tags" | "numbers" | "contact" | "date" | "category" | "notes" | "link" | null
  >(null);

  // Image attachment state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Quick tag creator input
  const [quickTagName, setQuickTagName] = useState("");

  // Batch pending mode state
  const [batchRawText, setBatchRawText] = useState("");
  const [batchItems, setBatchItems] = useState<{ id: string; text: string }[]>([]);

  // AI & URL router state
  const [urlDestinationOverride, setUrlDestinationOverride] = useState<
    "TASK" | "GLOBAL" | "URL_LIBRARY" | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const taskInputRef = useRef<HTMLTextAreaElement>(null);

  // Live URL detection for AI / Router mode
  const detectedUrls = useMemo(() => extractUrls(taskText), [taskText]);

  // Handle image file processing
  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona un archivo de imagen (PNG, JPG, WebP).");
      return;
    }

    setImageFileName(file.name);
    setImageMimeType(file.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      // Auto-open image panel or show confirmation
      setActivePanel("image");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Tag toggle helper
  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleAddQuickTag = () => {
    const clean = quickTagName.trim();
    if (!clean) return;
    if (!selectedTags.includes(clean)) {
      setSelectedTags([...selectedTags, clean]);
    }
    setQuickTagName("");
  };

  // Quick date shortcuts
  const handleSetQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setFechaLimite(`${yyyy}-${mm}-${dd}`);
  };

  // Direct contact selector
  const handleSelectContact = (c: Contact) => {
    setSolicitante(c.nombre);
    if (c.telefono) setTelefono(c.telefono);
    if (c.dominio && !selectedCategory) setSelectedCategory(c.dominio);
    if (c.etiquetas && c.etiquetas.length > 0) {
      const merged = Array.from(new Set([...selectedTags, ...c.etiquetas]));
      setSelectedTags(merged);
    }
  };

  // Direct Task Creation Handler (Instant, Local + Firestore)
  const handleDirectSave = () => {
    if (!taskText.trim() && !imagePreview) return;

    const resources: TaskResource[] = [];
    if (recursoUrl.trim()) {
      resources.push({
        url: recursoUrl.trim(),
        title: recursoTitulo.trim() || recursoUrl.trim(),
        addedAt: new Date().toISOString(),
      });
    }

    if (onDirectCreateTask) {
      onDirectCreateTask({
        tarea: taskText.trim() || "Pendiente con imagen adjunta",
        solicitante: solicitante.trim() || "Yo",
        telefono: telefono.trim() || undefined,
        numeroFolio: numeroFolio.trim() || undefined,
        etiquetas: selectedTags.length > 0 ? selectedTags : undefined,
        dominio: selectedCategory || "General",
        fechaLimite: fechaLimite || undefined,
        notas: notas.trim() || undefined,
        imagenReferencia: imagePreview || undefined,
        resources: resources.length > 0 ? resources : undefined,
      });

      // Clear form
      resetForm();
    } else {
      // Fallback to onSubmit if onDirectCreateTask is not passed
      handleSubmitAI();
    }
  };

  // AI Submission Handler
  const handleSubmitAI = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!taskText.trim() && !imagePreview) || isLoading) return;

    // Combine enriched text with notes if present
    let combinedInput = taskText.trim();
    if (solicitante && !combinedInput.toLowerCase().includes(solicitante.toLowerCase())) {
      combinedInput = `[De: ${solicitante}] ${combinedInput}`;
    }
    if (telefono && !combinedInput.includes(telefono)) {
      combinedInput = `${combinedInput} (Tel: ${telefono})`;
    }
    if (numeroFolio) {
      combinedInput = `${combinedInput} [Folio: ${numeroFolio}]`;
    }
    if (fechaLimite) {
      combinedInput = `${combinedInput} (Fecha límite: ${fechaLimite})`;
    }
    if (notas.trim()) {
      combinedInput = `${combinedInput} - Notas: ${notas.trim()}`;
    }
    if (recursoUrl.trim()) {
      combinedInput = `${combinedInput} ${recursoUrl.trim()}`;
    }

    onSubmit(
      combinedInput,
      imagePreview || undefined,
      imageMimeType,
      selectedTags.length > 0 ? selectedTags : undefined,
      selectedCategory || undefined,
      urlDestinationOverride
    );

    resetForm();
  };

  const resetForm = () => {
    setTaskText("");
    setSolicitante("");
    setTelefono("");
    setNumeroFolio("");
    setSelectedTags([]);
    setSelectedCategory("");
    setFechaLimite("");
    setNotas("");
    setRecursoUrl("");
    setRecursoTitulo("");
    setImagePreview(null);
    setImageFileName(null);
    setUrlDestinationOverride(null);
    setActivePanel(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter directly saves
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (mode === "ai") {
        handleSubmitAI();
      } else {
        handleDirectSave();
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Check if image is in clipboard
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFileProcess(file);
          return;
        }
      }
    }
  };

  const handlePasteClipboardBtn = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setTaskText(text);
      }
    } catch (err) {
      console.error("Clipboard read not supported:", err);
    }
  };

  // Batch lines parsing
  const handleParseBatchLines = () => {
    if (!batchRawText.trim()) return;
    const lines = batchRawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const newItems = lines.map((text, idx) => ({
      id: `b-${Date.now()}-${idx}`,
      text: text.replace(/^[-*•\d+.]\s*/, ""), // Clean leading bullets or numbers
    }));
    setBatchItems((prev) => [...prev, ...newItems]);
    setBatchRawText("");
  };

  const handleLoadBatchItemToForm = (item: { id: string; text: string }) => {
    setTaskText(item.text);
    setBatchItems((prev) => prev.filter((i) => i.id !== item.id));
    setMode("enrich");
    playChime("tick");
  };

  const handleSaveAllBatch = () => {
    if (batchItems.length === 0 || !onDirectCreateTask) return;
    batchItems.forEach((item) => {
      onDirectCreateTask({
        tarea: item.text,
        solicitante: "Yo",
        dominio: selectedCategory || "General",
        etiquetas: selectedTags.length > 0 ? selectedTags : undefined,
      });
    });
    setBatchItems([]);
    playChime("success");
  };

  // Count active enrichment items
  const enrichedCount = useMemo(() => {
    let count = 0;
    if (imagePreview) count++;
    if (selectedTags.length > 0) count += selectedTags.length;
    if (telefono) count++;
    if (numeroFolio) count++;
    if (solicitante) count++;
    if (fechaLimite) count++;
    if (selectedCategory) count++;
    if (notas.trim()) count++;
    if (recursoUrl.trim()) count++;
    return count;
  }, [
    imagePreview,
    selectedTags,
    telefono,
    numeroFolio,
    solicitante,
    fechaLimite,
    selectedCategory,
    notas,
    recursoUrl,
  ]);

  return (
    <div
      id="executive-input-section"
      className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm p-4 sm:p-5 transition-all"
    >
      {/* Hidden file input for images */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        id="image-file-input"
      />

      {/* TOP HEADER & MODE SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 pb-3 border-b border-stone-100 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles size={16} />
            </span>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Procesador Ejecutivo de Pendientes & Tareas
            </h2>
            {enrichedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                +{enrichedCount} datos agregados
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Pon tus pendientes y completa los datos faltantes (imagen, etiqueta, número, fecha, solicitante).
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center p-0.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode("enrich")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              mode === "enrich"
                ? "bg-white dark:bg-stone-900 text-amber-950 dark:text-amber-300 shadow-2xs"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
            title="Escribir pendiente y enriquecer con datos detallados"
          >
            <CheckCircle2 size={13} className={mode === "enrich" ? "text-amber-500" : ""} />
            <span>Captura & Datos</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("batch")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              mode === "batch"
                ? "bg-white dark:bg-stone-900 text-amber-950 dark:text-amber-300 shadow-2xs"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
            title="Escribir una lista de varios pendientes para procesar"
          >
            <ListPlus size={13} className={mode === "batch" ? "text-amber-500" : ""} />
            <span>Lista Rápida</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("ai")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              mode === "ai"
                ? "bg-white dark:bg-stone-900 text-amber-950 dark:text-amber-300 shadow-2xs"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
            title="Pegar mensajes largos de WhatsApp o solicitudes para auto-extracción con IA"
          >
            <Sparkles size={13} className={mode === "ai" ? "text-amber-500" : ""} />
            <span>Procesador IA</span>
          </button>
        </div>
      </div>

      {/* BATCH MODE: LIST MULTIPLE PENDIENTES */}
      {mode === "batch" && (
        <div className="mb-4 space-y-3 animate-in fade-in duration-150">
          <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
            <label className="block text-xs font-bold text-amber-950 dark:text-amber-200 mb-1">
              📝 Pega o escribe tus pendientes (un pendiente por línea):
            </label>
            <textarea
              value={batchRawText}
              onChange={(e) => setBatchRawText(e.target.value)}
              placeholder={`Ejemplo:\n- Llevar lona de 3x2m a líderes de Tiburón\n- Revisar diplomas de graduados 2026\n- Confirmar con Laura los reconocimientos pendientes\n- Enviar mensaje de WhatsApp al proveedor`}
              rows={4}
              className="w-full p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800/80 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                Puedes luego hacer clic en "Enriquecer" para agregarle imagen, etiquetas y número a cada uno.
              </span>
              <button
                type="button"
                onClick={handleParseBatchLines}
                disabled={!batchRawText.trim()}
                className="px-3 py-1.5 rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Agregar a la lista</span>
              </button>
            </div>
          </div>

          {/* Batch items pending list */}
          {batchItems.length > 0 && (
            <div className="space-y-2 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Layers size={14} className="text-amber-500" />
                  {batchItems.length} pendientes en cola rápida:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAllBatch}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Check size={12} />
                    <span>Guardar todos en Ledger</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchItems([])}
                    className="p-1 rounded text-stone-400 hover:text-rose-500"
                    title="Vaciar lista"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-stone-800">
                {batchItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="py-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] text-stone-400 shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-stone-800 dark:text-stone-200 truncate">
                        {item.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadBatchItemToForm(item)}
                        className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 hover:bg-amber-200 font-medium text-[11px] transition-colors"
                        title="Cargar al procesador para agregarle imagen, etiquetas, número, etc."
                      >
                        Enriquecer datos ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onDirectCreateTask) {
                            onDirectCreateTask({
                              tarea: item.text,
                              solicitante: "Yo",
                              dominio: selectedCategory || "General",
                              etiquetas: selectedTags.length > 0 ? selectedTags : undefined,
                            });
                          }
                          setBatchItems((prev) => prev.filter((i) => i.id !== item.id));
                          playChime("tick");
                        }}
                        className="px-2 py-1 rounded bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium text-[11px] transition-colors"
                        title="Guardar como pendiente directo"
                      >
                        Guardar ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MAIN CAPTURE FORM (Enrich & AI modes) */}
      <form
        onSubmit={mode === "ai" ? handleSubmitAI : (e) => { e.preventDefault(); handleDirectSave(); }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-xl border transition-all ${
          isDragging
            ? "border-amber-500 ring-2 ring-amber-400/20 bg-amber-50/20"
            : "border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/60"
        }`}
      >
        {/* Main Textarea */}
        <div className="relative">
          <textarea
            ref={taskInputRef}
            id="task-os-input"
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              mode === "ai"
                ? "Pega un mensaje de WhatsApp, correo, pega una URL para auto-identificar y guardar en biblioteca, o escribe: 'Ponme un pomodoro...'"
                : "Describe tu pendiente... (ej. Llevar lona de 3x2m a líderes de Tiburón, revisar diplomas 2026, llamar a proveedor)"
            }
            rows={mode === "ai" ? 3 : 2}
            disabled={isLoading}
            className="w-full p-3.5 pr-20 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none resize-none transition-all leading-relaxed"
          />

          {/* Quick Paste Clipboard Button */}
          <button
            type="button"
            onClick={handlePasteClipboardBtn}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 dark:bg-stone-800/80 hover:bg-stone-200/80 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors text-xs flex items-center gap-1 border border-stone-200 dark:border-stone-700 shadow-2xs"
            title="Pegar texto del portapapeles"
          >
            <Clipboard size={12} />
            <span className="hidden sm:inline text-[10px] font-medium">Pegar</span>
          </button>
        </div>

        {/* Live Detected URLs Banner (for AI mode) */}
        {mode === "ai" && detectedUrls.length > 0 && (
          <div className="mx-3.5 mb-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 dark:text-amber-200">
                <Link2 size={14} className="text-amber-600" />
                <span>
                  {detectedUrls.length === 1
                    ? "URL detectada en el procesador:"
                    : `${detectedUrls.length} URLs detectadas en el procesador:`}
                </span>
                <span className="font-mono text-[11px] text-amber-800 dark:text-amber-300 truncate max-w-[200px]">
                  {detectedUrls[0]}
                </span>
              </div>
              <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded bg-amber-500 text-stone-950">
                Enrutador Activo
              </span>
            </div>

            {/* Destination Selector Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                Destino:
              </span>

              <button
                type="button"
                onClick={() => setUrlDestinationOverride("URL_LIBRARY")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  urlDestinationOverride === "URL_LIBRARY"
                    ? "bg-amber-500 text-stone-950 shadow-xs"
                    : "bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100"
                }`}
              >
                <Bookmark size={12} />
                <span>⭐ Biblioteca de URLs Día a Día</span>
              </button>

              {activeTaskTitle && (
                <button
                  type="button"
                  onClick={() => setUrlDestinationOverride("TASK")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    urlDestinationOverride === "TASK" || (urlDestinationOverride === null && activeTaskTitle)
                      ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
                      : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  <Pin size={12} />
                  <span>Tarea Activa</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setUrlDestinationOverride("GLOBAL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  urlDestinationOverride === "GLOBAL" || (urlDestinationOverride === null && !activeTaskTitle)
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
                    : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300"
                }`}
              >
                <Globe size={12} />
                <span>Archivo Global</span>
              </button>
            </div>
          </div>
        )}

        {/* IMAGE PREVIEW CARD (If attached) */}
        {imagePreview && (
          <div className="mx-3.5 mb-2.5 p-2 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800/80 flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                onClick={() => setIsImageModalOpen(true)}
                className="relative w-12 h-12 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 shrink-0 cursor-pointer group"
                title="Hacer clic para ampliar imagen"
              >
                <img
                  src={imagePreview}
                  alt="Referencia"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent flex items-center justify-center">
                  <Eye size={12} className="text-white drop-shadow-xs" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                    {imageFileName || "Imagen de referencia adjunta"}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold shrink-0">
                    Imagen lista ✓
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 truncate">
                  Se guardará como evidencia/referencia en la tarea para consulta inmediata.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title="Quitar imagen"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* DRAG AND DROP OVERLAY */}
        {isDragging && (
          <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-xs flex items-center justify-center rounded-xl pointer-events-none border-2 border-dashed border-amber-500 z-10">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <UploadCloud size={16} /> Suelta la imagen aquí para adjuntarla
            </span>
          </div>
        )}

        {/* INTERACTIVE ENRICHMENT ACTION PILLS BAR (Datos que hagan falta) */}
        <div className="mx-3.5 mb-2.5 pt-2 border-t border-stone-200/70 dark:border-stone-700/60">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
              <Layers size={12} className="text-amber-500" />
              <span>Agregar datos adicionales al pendiente:</span>
            </span>
            {activePanel && (
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="text-[10px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 flex items-center gap-0.5"
              >
                <span>Cerrar panel</span>
                <ChevronUp size={11} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {/* 1. Subir Imagen Button */}
            <button
              type="button"
              onClick={() => {
                if (!imagePreview) {
                  fileInputRef.current?.click();
                } else {
                  setActivePanel(activePanel === "image" ? null : "image");
                }
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-[11px] ${
                imagePreview
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-300"
              }`}
            >
              <ImageIcon size={13} className={imagePreview ? "text-amber-600" : "text-stone-400"} />
              <span>{imagePreview ? "📸 Imagen ✓" : "📸 Subir Imagen"}</span>
            </button>

            {/* 2. Etiquetas Button */}
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === "tags" ? null : "tags")}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-[11px] ${
                selectedTags.length > 0
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                  : activePanel === "tags"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-300"
              }`}
            >
              <TagIcon size={13} className={selectedTags.length > 0 ? "text-amber-600" : "text-stone-400"} />
              <span>
                {selectedTags.length > 0 ? `🏷️ Etiquetas (${selectedTags.length})` : "🏷️ Etiqueta"}
              </span>
            </button>

            {/* 3. Número & Teléfono Button */}
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === "numbers" ? null : "numbers")}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-[11px] ${
                telefono || numeroFolio
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                  : activePanel === "numbers"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-300"
              }`}
            >
              <Hash size={13} className={telefono || numeroFolio ? "text-amber-600" : "text-stone-400"} />
              <span>
                {telefono || numeroFolio
                  ? `🔢 N° ${numeroFolio || ""} ${telefono ? "📱" : ""} ✓`
                  : "🔢 Número / Teléfono"}
              </span>
            </button>

            {/* 4. Solicitante Button */}
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === "contact" ? null : "contact")}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-[11px] ${
                solicitante
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                  : activePanel === "contact"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-300"
              }`}
            >
              <User size={13} className={solicitante ? "text-amber-600" : "text-stone-400"} />
              <span>{solicitante ? `👤 ${solicitante}` : "👤 Solicitante"}</span>
            </button>

            {/* 5. Fecha Límite Button */}
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === "date" ? null : "date")}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-[11px] ${
                fechaLimite
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                  : activePanel === "date"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-300"
              }`}
            >
              <CalendarIcon size={13} className={fechaLimite ? "text-amber-600" : "text-stone-400"} />
              <span>{fechaLimite ? `📅 ${fechaLimite}` : "📅 Fecha Límite"}</span>
            </button>

            {/* 6. Categoría / Dominio Button */}
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === "category" ? null : "category")}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-[11px] ${
                selectedCategory
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                  : activePanel === "category"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-300"
              }`}
            >
              <FolderKanban size={13} className={selectedCategory ? "text-amber-600" : "text-stone-400"} />
              <span>{selectedCategory ? `📂 ${selectedCategory}` : "📂 Categoría"}</span>
            </button>

            {/* 7. Notas / Observaciones Button */}
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === "notes" ? null : "notes")}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-[11px] ${
                notas.trim()
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                  : activePanel === "notes"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-300"
              }`}
            >
              <FileText size={13} className={notas.trim() ? "text-amber-600" : "text-stone-400"} />
              <span>{notas.trim() ? "📝 Notas ✓" : "📝 Notas"}</span>
            </button>

            {/* 8. Enlace / Drive Button */}
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === "link" ? null : "link")}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-[11px] ${
                recursoUrl.trim()
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                  : activePanel === "link"
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-300"
              }`}
            >
              <Link2 size={13} className={recursoUrl.trim() ? "text-amber-600" : "text-stone-400"} />
              <span>{recursoUrl.trim() ? "🔗 Link Drive ✓" : "🔗 Link / Drive"}</span>
            </button>
          </div>
        </div>

        {/* EXPANDABLE DATA PANELS */}

        {/* PANEL: TAGS / ETIQUETAS */}
        {activePanel === "tags" && (
          <div className="mx-3.5 mb-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <TagIcon size={14} className="text-amber-500" />
                Asignar Etiquetas al Pendiente:
              </span>
              <button
                type="button"
                onClick={onOpenManageTags}
                className="text-[11px] text-amber-600 hover:underline font-medium"
              >
                Administrar todas las etiquetas
              </button>
            </div>

            {/* Available tag chips */}
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((t) => {
                const isSelected = selectedTags.includes(t.nombre);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToggleTag(t.nombre)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                      isSelected
                        ? `${getTagColorClass(t.color)} ring-2 ring-amber-400/40 font-bold`
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-stone-400"
                    }`}
                  >
                    {isSelected && <Check size={11} />}
                    <span>{t.nombre}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick add custom tag */}
            <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <input
                type="text"
                value={quickTagName}
                onChange={(e) => setQuickTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddQuickTag();
                  }
                }}
                placeholder="Crear nueva etiqueta rápida..."
                className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={handleAddQuickTag}
                disabled={!quickTagName.trim()}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90 disabled:opacity-40"
              >
                + Agregar
              </button>
            </div>
          </div>
        )}

        {/* PANEL: NÚMEROS & TELÉFONO */}
        {activePanel === "numbers" && (
          <div className="mx-3.5 mb-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Hash size={14} className="text-amber-500" />
              Números de Referencia & Contacto:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* WhatsApp / Teléfono */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1 flex items-center gap-1">
                  <Phone size={12} className="text-emerald-500" />
                  <span>Teléfono / WhatsApp para avisos:</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+52 55 1234 5678"
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                  {telefono && (
                    <button
                      type="button"
                      onClick={() => setTelefono("")}
                      className="p-1 rounded text-stone-400 hover:text-rose-500"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Número de Folio / Orden / Prioridad */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1 flex items-center gap-1">
                  <Hash size={12} className="text-amber-500" />
                  <span>Número de Folio / Ticket / Prioridad:</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={numeroFolio}
                    onChange={(e) => setNumeroFolio(e.target.value)}
                    placeholder="Ej. #042, L-008, o prioridad 1"
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                  {numeroFolio && (
                    <button
                      type="button"
                      onClick={() => setNumeroFolio("")}
                      className="p-1 rounded text-stone-400 hover:text-rose-500"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Contact Chips to Auto-populate number */}
            {availableContacts.length > 0 && (
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                <span className="text-[10px] text-stone-400 font-medium block mb-1">
                  O autocompletar desde tus contactos guardados:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {availableContacts.slice(0, 6).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectContact(c)}
                      className="px-2 py-0.5 rounded text-[11px] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors flex items-center gap-1"
                    >
                      <span>👤 {c.nombre}</span>
                      {c.telefono && <span className="text-stone-400 font-mono">({c.telefono.slice(-4)})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANEL: SOLICITANTE / CONTACTO */}
        {activePanel === "contact" && (
          <div className="mx-3.5 mb-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <User size={14} className="text-amber-500" />
              ¿Quién solicita o está asignado a este pendiente?
            </span>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={solicitante}
                onChange={(e) => setSolicitante(e.target.value)}
                placeholder="Nombre del solicitante (ej. Laura, Líder Tiburón, Yo...)"
                className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              />
              {solicitante && (
                <button
                  type="button"
                  onClick={() => setSolicitante("")}
                  className="p-1 rounded text-stone-400 hover:text-rose-500"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Quick frequent choices */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-stone-400 font-medium">Sugerencias rápidas:</span>
              {["Yo", "Laura", "Líder Tiburón", "Gladiadores", "Proveedor"].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSolicitante(name)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    solicitante === name
                      ? "bg-amber-500 text-stone-950 font-bold"
                      : "bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PANEL: FECHA LÍMITE */}
        {activePanel === "date" && (
          <div className="mx-3.5 mb-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <CalendarIcon size={14} className="text-amber-500" />
              Fecha Límite / Deadline de Entrega:
            </span>

            {/* Quick shortcuts */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSetQuickDate(0)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100"
              >
                🔥 Hoy
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickDate(1)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100"
              >
                ⏳ Mañana
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickDate(3)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100"
              >
                📅 En 3 días
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickDate(7)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100"
              >
                🗓️ Próxima semana
              </button>
            </div>

            {/* Manual Date Input */}
            <div className="flex items-center gap-2 pt-1">
              <label className="text-[11px] text-stone-500 font-medium">O seleccionar fecha exacta:</label>
              <input
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
              {fechaLimite && (
                <button
                  type="button"
                  onClick={() => setFechaLimite("")}
                  className="p-1 rounded text-stone-400 hover:text-rose-500 text-xs"
                  title="Borrar fecha límite"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* PANEL: CATEGORÍA / DOMINIO */}
        {activePanel === "category" && (
          <div className="mx-3.5 mb-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <FolderKanban size={14} className="text-amber-500" />
              Categoría / Área de Operación:
            </span>

            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                      isSelected
                        ? "bg-amber-500 text-stone-950 border-amber-500 shadow-2xs"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-stone-400"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PANEL: NOTAS / OBSERVACIONES */}
        {activePanel === "notes" && (
          <div className="mx-3.5 mb-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 space-y-2 animate-in slide-in-from-top-2 duration-150">
            <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <FileText size={14} className="text-amber-500" />
              Observaciones, Especificaciones y Notas del Pendiente:
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Escribe detalles específicos (ej. Medidas de lona 3x2m con ojillos, validar ortografía en apellidos de diplomas, dirección de entrega, etc.)"
              rows={2}
              className="w-full p-2.5 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed"
            />
          </div>
        )}

        {/* PANEL: ENLACE / RECURSO DE GOOGLE DRIVE O WEB */}
        {activePanel === "link" && (
          <div className="mx-3.5 mb-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Link2 size={14} className="text-amber-500" />
              Enlace Web o Carpeta de Google Drive Vinculada:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="url"
                value={recursoUrl}
                onChange={(e) => setRecursoUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="px-2.5 py-1.5 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
              <input
                type="text"
                value={recursoTitulo}
                onChange={(e) => setRecursoTitulo(e.target.value)}
                placeholder="Nombre del recurso (ej. Arte Final Lona, Lista Excel)"
                className="px-2.5 py-1.5 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        )}

        {/* BOTTOM ACTION BAR & SUBMIT BUTTONS */}
        <div className="p-2.5 pt-1 flex flex-wrap items-center justify-between gap-2.5">
          {/* Left info badge / reset */}
          <div className="flex items-center gap-2 flex-wrap">
            {enrichedCount > 0 ? (
              <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                <CheckCircle2 size={13} className="text-amber-500" />
                <span>
                  {enrichedCount} {enrichedCount === 1 ? "dato añadido" : "datos añadidos"}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="ml-1 text-[10px] text-stone-400 hover:text-rose-500 underline"
                >
                  Limpiar todo
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-stone-400">
                Tip: Presiona <kbd className="px-1 py-0.5 rounded bg-stone-200 dark:bg-stone-700 font-mono text-[10px]">Ctrl+Enter</kbd> para guardar al instante.
              </span>
            )}
          </div>

          {/* Right action buttons */}
          <div className="flex items-center gap-2">
            {/* If in AI mode or if user prefers AI extraction */}
            {mode === "ai" ? (
              <button
                type="submit"
                id="task-os-submit-btn"
                disabled={(!taskText.trim() && !imagePreview) || isLoading}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-bold text-xs sm:text-sm transition-all shadow-sm hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 min-h-[42px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Procesando con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} className="text-amber-400 dark:text-amber-600" />
                    <span>
                      {urlDestinationOverride === "URL_LIBRARY"
                        ? "Guardar en Biblioteca"
                        : "Procesar con IA"}
                    </span>
                    <CornerDownLeft size={14} />
                  </>
                )}
              </button>
            ) : (
              <>
                {/* Secondary AI option if user wants multimodal analysis */}
                <button
                  type="button"
                  onClick={handleSubmitAI}
                  disabled={(!taskText.trim() && !imagePreview) || isLoading}
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-700/60 text-xs font-semibold transition-colors disabled:opacity-30"
                  title="Analizar texto o imagen con IA ejecutiva"
                >
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Procesar con IA</span>
                </button>

                {/* Primary Direct Save Button */}
                <button
                  type="button"
                  onClick={handleDirectSave}
                  disabled={(!taskText.trim() && !imagePreview) || isLoading}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed min-h-[42px]"
                >
                  <Check size={16} className="stroke-[3]" />
                  <span>Guardar Pendiente en Ledger</span>
                  <CornerDownLeft size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </form>

      {/* QUICK PRESET EXAMPLES */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px]">
        <span className="text-stone-400 mr-1 font-medium">Ejemplos rápidos:</span>
        {PRESET_EXAMPLES.map((ex, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setTaskText(ex.text);
              if (taskInputRef.current) taskInputRef.current.focus();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors font-medium cursor-pointer"
          >
            <span>{ex.icon}</span>
            <span>{ex.label}</span>
          </button>
        ))}
      </div>

      {/* IMAGE FULL VIEW MODAL */}
      {isImageModalOpen && imagePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-stone-950 rounded-2xl overflow-hidden shadow-2xl border border-stone-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-xs text-stone-200">
              <span className="font-bold truncate">{imageFileName || "Imagen de referencia"}</span>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="p-1 rounded text-stone-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center max-h-[80vh]">
              <img
                src={imagePreview}
                alt="Referencia Completa"
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
