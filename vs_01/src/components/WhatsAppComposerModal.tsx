import React, { useState, useEffect } from "react";
import {
  X,
  MessageCircle,
  Plus,
  Trash2,
  Edit2,
  Check,
  Send,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Layers,
  Settings,
  HelpCircle,
  Phone,
  User,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  WhatsAppTemplate,
  DEFAULT_WHATSAPP_TEMPLATES,
  subscribeWhatsAppTemplates,
  saveWhatsAppTemplate,
  deleteWhatsAppTemplate,
  renderWhatsAppTemplate,
} from "../utils/whatsappTemplates";
import { cleanPhoneNumber, buildWhatsAppUrl, openWhatsAppInNewTab } from "../utils/whatsapp";
import { playChime } from "../utils/audio";

interface WhatsAppComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient?: {
    nombre: string;
    telefono?: string;
    diplomado?: string;
    year?: string;
    costo?: number | string;
    tipo?: string;
    folio?: string;
    driveUrl?: string;
    pagado?: boolean;
    cuadernillos?: boolean;
    audio?: boolean;
    digital?: boolean;
    impreso?: boolean;
    entregado?: boolean;
    casa?: string;
    rol?: string;
    zona?: string;
    grupo?: string;
    generacion?: string;
  } | null;
  onSent?: (message: string) => void;
  initialManageMode?: boolean;
}

const DEMO_PREVIEW_RECIPIENT = {
  nombre: "Edgar Jose Batun Alpuche",
  telefono: "3121148077",
  diplomado: "Diplomado en Liderazgo y Trabajo en Equipo",
  year: "2026",
  costo: 100,
  tipo: "Tamaño Carta (Impresión)",
  folio: "REC-2026-0042",
  driveUrl: "https://drive.google.com/drive/folders/diplomado-2026-ejemplo",
  pagado: true,
  cuadernillos: true,
  audio: true,
  digital: true,
  impreso: true,
  entregado: false,
  casa: "Gladiadores Casa Martha Sangerman",
  rol: "Participante",
  generacion: "Generación 2026",
  zona: "Zona Norte",
  grupo: "Grupo A",
};

export default function WhatsAppComposerModal({
  isOpen,
  onClose,
  recipient,
  onSent,
  initialManageMode = false,
}: WhatsAppComposerModalProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(DEFAULT_WHATSAPP_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("tpl-impreso-listo-drive");
  const [customizedMessage, setCustomizedMessage] = useState<string>("");
  const [recipientPhone, setRecipientPhone] = useState<string>("");

  // Template Manager Modal / View states
  const [isManagingTemplates, setIsManagingTemplates] = useState(initialManageMode || !recipient);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState<"reconocimiento" | "diplomado" | "pago" | "general">("reconocimiento");
  const [templateText, setTemplateText] = useState("");
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const targetRecipient = recipient || DEMO_PREVIEW_RECIPIENT;

  // Subscribe to real-time templates
  useEffect(() => {
    const unsub = subscribeWhatsAppTemplates((tpls) => {
      setTemplates(tpls);
    });
    return () => unsub();
  }, []);

  // When recipient changes or modal opens, initialize fields
  useEffect(() => {
    if (isOpen) {
      if (!recipient) {
        setIsManagingTemplates(true);
      } else {
        setIsManagingTemplates(initialManageMode);
        setRecipientPhone(recipient.telefono || "");
      }
      const selected = templates.find((t) => t.id === selectedTemplateId) || templates[0];
      if (selected) {
        updateMessageFromTemplate(selected, targetRecipient);
      }
    }
  }, [recipient, isOpen, initialManageMode]);

  // Update current message using template
  const updateMessageFromTemplate = (template: WhatsAppTemplate, currentRecipient = targetRecipient) => {
    const rendered = renderWhatsAppTemplate(template.texto, {
      nombre: currentRecipient.nombre,
      diplomado: currentRecipient.diplomado,
      year: currentRecipient.year,
      costo: currentRecipient.costo,
      tipo: currentRecipient.tipo,
      folio: currentRecipient.folio,
      driveUrl: currentRecipient.driveUrl,
      pagoEstado: currentRecipient.pagado ? "✅ Confirmado" : "⏳ Pendiente",
      cuadernillosEstado: currentRecipient.cuadernillos ? "✅ Entregados" : "⏳ Pendiente",
      audioEstado: currentRecipient.audio ? "✅ Recibido" : "⏳ Pendiente",
      digitalEstado: currentRecipient.digital ? "✅ Disponible en Drive" : "⏳ En preparación",
      impresoEstado: currentRecipient.impreso ? "✅ Impreso" : "⏳ En proceso",
      entregadoEstado: currentRecipient.entregado ? "✅ Entregado" : "⏳ Pendiente de entrega",
      casa: currentRecipient.casa,
      rol: currentRecipient.rol,
      telefono: recipientPhone || currentRecipient.telefono,
      zona: currentRecipient.zona,
      grupo: currentRecipient.grupo,
    });
    setCustomizedMessage(rendered);
  };

  const handleSelectTemplate = (tpl: WhatsAppTemplate) => {
    setSelectedTemplateId(tpl.id);
    updateMessageFromTemplate(tpl);
    playChime("tick");
  };

  // Open Template Editor for New
  const handleOpenNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateCategory("reconocimiento");
    setTemplateText("");
    setIsManagingTemplates(true);
    playChime("tick");
  };

  // Open Template Editor for Edit
  const handleOpenEditTemplate = (tpl: WhatsAppTemplate, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTemplate(tpl);
    setTemplateName(tpl.nombre);
    setTemplateCategory(tpl.categoria);
    setTemplateText(tpl.texto);
    setIsManagingTemplates(true);
    playChime("tick");
  };

  // Save Template (Poner o Editar)
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !templateText.trim()) return;

    setIsSavingTemplate(true);
    const newId = editingTemplate?.id || `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const tpl: WhatsAppTemplate = {
      id: newId,
      nombre: templateName.trim(),
      categoria: templateCategory,
      texto: templateText.trim(),
      isDefault: editingTemplate?.isDefault || false,
      updatedAt: new Date().toISOString(),
    };

    await saveWhatsAppTemplate(tpl);
    playChime("success");
    setIsSavingTemplate(false);
    setIsManagingTemplates(false);
    setSelectedTemplateId(tpl.id);
    updateMessageFromTemplate(tpl);
  };

  // Delete Template (Quitar)
  const handleDeleteTemplate = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm("¿Estás seguro de quitar esta plantilla personalizada de WhatsApp?")) {
      await deleteWhatsAppTemplate(id);
      playChime("tick");
      if (selectedTemplateId === id) {
        const remaining = templates.filter((t) => t.id !== id);
        if (remaining.length > 0) {
          handleSelectTemplate(remaining[0]);
        }
      }
    }
  };

  // Insert token tag into template text
  const insertTag = (tag: string) => {
    setTemplateText((prev) => prev + tag);
    playChime("tick");
  };

  // Send WhatsApp Action
  const handleSend = () => {
    const phoneToUse = recipientPhone.trim() || recipient?.telefono || "";
    if (!phoneToUse) {
      alert("Por favor ingresa un número de teléfono válido antes de enviar.");
      return;
    }

    const clean = cleanPhoneNumber(phoneToUse);
    const success = openWhatsAppInNewTab(clean, customizedMessage);
    if (success) {
      playChime("success");
      onSent?.(customizedMessage);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-xs">
              <MessageCircle size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {recipient ? "Mensaje Personalizado de WhatsApp" : "Plantillas de WhatsApp (Agregar, Editar y Eliminar)"}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                  wa.me
                </span>
              </div>
              <p className="text-xs text-emerald-100 flex items-center gap-1.5">
                <User size={12} />
                <span>{recipient ? "Para:" : "Destinatario de muestra:"} <strong>{targetRecipient.nombre}</strong></span>
                {targetRecipient.diplomado && <span>• {targetRecipient.diplomado}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsManagingTemplates(!isManagingTemplates)}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isManagingTemplates
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "bg-white/15 hover:bg-white/25 text-white"
              }`}
              title="Administrar, poner, editar o quitar plantillas"
            >
              <Settings size={15} />
              <span className="hidden sm:inline">Gestionar Plantillas</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* VISTA 1: EDITOR DE PLANTILLAS (PONER, EDITAR, QUITAR) */}
          {isManagingTemplates ? (
            <div className="bg-stone-50 dark:bg-stone-850 p-4 sm:p-5 rounded-2xl border border-stone-200 dark:border-stone-700/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-700">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-600" />
                  <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                    {editingTemplate ? "Editar Plantilla Personalizada" : "Poner Nueva Plantilla Personalizada"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManagingTemplates(false)}
                  className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-bold"
                >
                  Volver al redactor
                </button>
              </div>

              {/* Lista actual con opción de editar / quitar */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                  Plantillas Registradas ({templates.length})
                </span>
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs hover:border-emerald-500 transition group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-stone-800 dark:text-stone-200 truncate">
                        {tpl.nombre}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 capitalize">
                        {tpl.categoria}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditTemplate(tpl, e)}
                        className="p-1 text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition"
                        title="Editar plantilla"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                        title="Quitar plantilla"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Formulario de Crear / Editar */}
              <form onSubmit={handleSaveTemplate} className="space-y-3 pt-2 border-t border-stone-200 dark:border-stone-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                      Nombre de la Plantilla *
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Ej. Aviso de Impresión Lista"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                      Categoría
                    </label>
                    <select
                      value={templateCategory}
                      onChange={(e) => setTemplateCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="reconocimiento">Reconocimiento</option>
                      <option value="diplomado">Diplomado de Liderazgo</option>
                      <option value="pago">Cobranza y SPIN / OXXO</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      Cuerpo del Mensaje (con variables dinámicas) *
                    </label>
                    <span className="text-[10px] text-stone-500">
                      Haz clic en una variable para insertarla:
                    </span>
                  </div>

                  {/* Variables Chips */}
                  <div className="flex flex-wrap gap-1.5 pb-2">
                    {[
                      "{nombre}",
                      "{diplomado}",
                      "{year}",
                      "{costo}",
                      "{driveUrl}",
                      "{folio}",
                      "{pagoEstado}",
                      "{impresoEstado}",
                      "{digitalEstado}",
                      "{casa}",
                      "{rol}",
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertTag(tag)}
                        className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono font-bold hover:bg-emerald-200 transition"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={5}
                    value={templateText}
                    onChange={(e) => setTemplateText(e.target.value)}
                    placeholder="Escribe tu mensaje con {nombre}, {diplomado}, {driveUrl}..."
                    className="w-full p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-mono leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplate(null);
                      setTemplateName("");
                      setTemplateText("");
                    }}
                    className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 text-xs font-bold"
                  >
                    Limpiar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingTemplate}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Check size={14} />
                    <span>{editingTemplate ? "Actualizar Plantilla" : "Guardar Nueva Plantilla"}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* VISTA 2: REDACTOR CON SELECTOR DE PLANTILLAS */
            <div className="space-y-4">
              
              {/* Selector de Plantilla */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                    <Layers size={14} className="text-emerald-600" />
                    <span>Seleccionar Plantilla Personalizada:</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenNewTemplate}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>+ Poner nueva plantilla</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`p-2.5 rounded-2xl text-left border transition flex items-center justify-between cursor-pointer ${
                        selectedTemplateId === tpl.id
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20 font-bold"
                          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-300"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs truncate font-bold">{tpl.nombre}</div>
                        <div className="text-[10px] text-stone-400 capitalize">{tpl.categoria}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditTemplate(tpl, e)}
                          className="p-1 text-stone-400 hover:text-emerald-600 rounded"
                          title="Editar esta plantilla"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Teléfono Destinatario */}
              <div className="p-3 bg-stone-50 dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Phone size={15} className="text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Número de WhatsApp:
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-stone-400">+52 / 1</span>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="Ej. 9999011852"
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none w-36"
                  />
                </div>
              </div>

              {/* Vista previa y edición libre del mensaje */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                    <MessageCircle size={14} className="text-emerald-600" />
                    <span>Mensaje Listo para Enviar:</span>
                  </label>
                  <span className="text-[11px] text-stone-400">
                    Puedes retocar el texto antes de enviar
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    rows={8}
                    value={customizedMessage}
                    onChange={(e) => setCustomizedMessage(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 text-xs font-mono leading-relaxed text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
                  />
                </div>
              </div>

              {/* Info de enlace a Drive incluido si aplica */}
              {targetRecipient?.driveUrl && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 truncate">
                    <ExternalLink size={14} className="text-indigo-600 shrink-0" />
                    <span className="font-bold">Drive:</span>
                    <span className="font-mono truncate">{targetRecipient.driveUrl}</span>
                  </div>
                  <a
                    href={targetRecipient.driveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[10px] shrink-0 hover:bg-indigo-700 transition"
                  >
                    Ver archivo
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-stone-600 dark:text-stone-400 font-bold text-xs hover:bg-stone-200 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(customizedMessage);
                setCopiedSuccess(true);
                playChime("tick");
                setTimeout(() => setCopiedSuccess(false), 2000);
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-stone-800 dark:text-stone-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedSuccess ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copiedSuccess ? "Copiado" : "Copiar Texto"}</span>
            </button>

            <button
              type="button"
              onClick={handleSend}
              className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-lg shadow-emerald-600/30 flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Send size={15} />
              <span>Abrir WhatsApp y Enviar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
