import React, { useState, useEffect } from "react";
import {
  X,
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
  Printer,
  RotateCcw,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  User,
  Phone,
  ShieldCheck,
  Layers,
  ArrowRight,
  Plus,
  Download,
  FileText,
} from "lucide-react";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth, ensureAnonymousAuth } from "../lib/firebase";
import { playChime } from "../utils/audio";
import { downloadTicketImage } from "../utils/ticketGenerator";

interface ReconocimientoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (folio: string) => void;
}

export interface SolicitudReconocimientoRecord {
  id: string;
  nombre: string;
  rol: string;
  grupo: string;
  zona: string;
  diplomado: string;
  year: string;
  tipoImpresion: string;
  costo: number;
  telefono?: string;
  notas?: string;
  timestamp?: any;
  createdAt?: string;
  timeVal?: number;
}

export default function ReconocimientoFormModal({
  isOpen,
  onClose,
  onSuccess,
}: ReconocimientoFormModalProps) {
  // Form fields
  const [nombre, setNombre] = useState("");
  const [rolOption, setRolOption] = useState<string>("Líder");
  const [otroRol, setOtroRol] = useState<string>("");
  const [grupo, setGrupo] = useState("");
  const [zona, setZona] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [year, setYear] = useState<"2022" | "2025" | "2026">("2026");
  const [tipoImpresion, setTipoImpresion] = useState<"Primera Impresión" | "Re-impresión" | null>(null);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDownloadingTicket, setIsDownloadingTicket] = useState(false);
  const [ticketDownloaded, setTicketDownloaded] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    id: string;
    nombre: string;
    rol: string;
    grupo: string;
    zona: string;
    diplomado: string;
    year: string;
    tipoImpresion: string;
    costo: number;
    telefono?: string;
    notas?: string;
  } | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [copiedFolio, setCopiedFolio] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    playChime("tick");
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Recent requests state (Right 1/3 column)
  const [recientes, setRecientes] = useState<SolicitudReconocimientoRecord[]>([]);
  const [isLoadingRecientes, setIsLoadingRecientes] = useState(true);

  // Dynamic cost calculation
  const costoTotal = tipoImpresion === "Primera Impresión" ? 100 : tipoImpresion === "Re-impresión" ? 50 : 0;

  // Real-time onSnapshot listener on collection 'solicitudes'
  useEffect(() => {
    if (!isOpen) return;

    // Ensure anonymous auth
    ensureAnonymousAuth().catch(() => null);

    setIsLoadingRecientes(true);

    const unsub = onSnapshot(
      collection(db, "solicitudes"),
      (snapshot) => {
        const list: SolicitudReconocimientoRecord[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const tVal = d.timestamp?.toDate
            ? d.timestamp.toDate().getTime()
            : d.createdAt
            ? new Date(d.createdAt).getTime()
            : 0;

          list.push({
            id: docSnap.id,
            nombre: d.nombre || "Sin nombre",
            rol: d.rol || "Alumno",
            grupo: d.grupo || "G-1",
            zona: d.zona || "General",
            diplomado: d.diplomado || "Liderazgo I",
            year: String(d.year || "2026"),
            tipoImpresion: d.tipoImpresion || "Primera Impresión",
            costo: Number(d.costo || (d.tipoImpresion === "Primera Impresión" ? 100 : 50)),
            telefono: d.telefono || undefined,
            timestamp: d.timestamp,
            createdAt: d.createdAt || new Date().toISOString(),
            timeVal: tVal,
          });
        });

        // Ordenar en memoria (JavaScript) por fecha descendente
        list.sort((a, b) => (b.timeVal || 0) - (a.timeVal || 0));
        setRecientes(list);
        setIsLoadingRecientes(false);
      },
      (err) => {
        console.warn("Snapshot solicitudes listener notice:", err);
        setIsLoadingRecientes(false);
      }
    );

    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUiError(null);

    if (!tipoImpresion) {
      setUiError("Por favor selecciona un Tipo de Impresión (Primera Impresión o Re-impresión).");
      playChime("tick");
      return;
    }

    const finalRol = rolOption === "Otro" ? (otroRol.trim() || "Otro") : rolOption;

    if (!nombre.trim() || !grupo.trim() || !zona.trim()) {
      setUiError("Por favor completa todos los datos requeridos (*): Nombre Completo, Grupo y Zona.");
      playChime("tick");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Iniciar sesión anónima antes de escribir
      await ensureAnonymousAuth();

      const payload = {
        nombre: nombre.trim(),
        rol: finalRol,
        grupo: grupo.trim(),
        zona: zona.trim(),
        diplomado: "Liderazgo I",
        year,
        tipoImpresion,
        costo: costoTotal,
        telefono: telefono.trim() || null,
        notas: notas.trim() || null,
        timestamp: serverTimestamp(),
        // 6 flags de control para Laura:
        pagado: false,
        cuadernillos: false,
        audio: false,
        digital: false,
        impreso: false,
        entregado: false,
        createdAt: new Date().toISOString(),
      };

      // 2. Guardar en la colección requerida 'solicitudes'
      const docRef = await addDoc(collection(db, "solicitudes"), payload);

      // 3. Guardar también en 'reconocimientos' para sincronización garantizada con el dashboard de Laura
      await addDoc(collection(db, "reconocimientos"), {
        ...payload,
        solicitudId: docRef.id,
      }).catch(() => null);

      // 4. Notificar al backend Express y despachar aviso a Laura Cortazar
      try {
        fetch("/api/reconocimientos/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: payload.nombre,
            rol: payload.rol,
            grupo: payload.grupo,
            zona: payload.zona,
            diplomado: payload.diplomado,
            year: payload.year,
            tipoImpresion: payload.tipoImpresion,
            costo: payload.costo,
            telefono: payload.telefono,
            notas: payload.notas,
            targetEmail: "laurcortazar@gmail.com",
          }),
        }).catch(() => null);

        fetch("/api/solicitudes/crear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            solicitante: payload.nombre,
            telefono: payload.telefono,
            area: payload.zona,
            titulo: `Solicitud de Reconocimiento • ${payload.diplomado} (${payload.year})`,
            descripcion: `Solicitud de impresión para ${payload.nombre} (${payload.rol}, Grupo ${payload.grupo}, Zona ${payload.zona}). Tipo: ${payload.tipoImpresion} ($${payload.costo}).${payload.notas ? " Notas: " + payload.notas : ""}`,
            canal: "Web Reconocimientos",
            prioridad: "Alta",
            targetUserEmail: "laurcortazar@gmail.com",
          }),
        }).catch(() => null);
      } catch (_) {}

      // 5. Estado de éxito
      const ticketInfo = {
        id: docRef.id,
        nombre: payload.nombre,
        rol: payload.rol,
        grupo: payload.grupo,
        zona: payload.zona,
        diplomado: payload.diplomado,
        year: payload.year,
        tipoImpresion: payload.tipoImpresion,
        costo: payload.costo,
        telefono: payload.telefono || undefined,
        notas: payload.notas || undefined,
      };

      setSubmittedData(ticketInfo);
      setIsSuccess(true);
      playChime("success");

      // Auto-descargar ticket oficial en la galería del usuario
      setTimeout(() => {
        downloadTicketImage(ticketInfo).then((ok) => {
          if (ok) setTicketDownloaded(true);
        });
      }, 600);

      if (onSuccess) onSuccess(docRef.id);
    } catch (err: any) {
      console.error("Error al registrar solicitud:", err);
      setUiError(`No se pudo registrar la solicitud: ${err.message || "Error de conexión"}. Por favor intenta de nuevo.`);
      playChime("tick");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Descarga manual del ticket a la galería de fotos
  const handleDownloadTicket = async () => {
    if (!submittedData) return;
    setIsDownloadingTicket(true);
    playChime("tick");
    const ok = await downloadTicketImage({
      id: submittedData.id,
      nombre: submittedData.nombre,
      rol: submittedData.rol,
      grupo: submittedData.grupo,
      zona: submittedData.zona,
      diplomado: submittedData.diplomado,
      year: submittedData.year,
      tipoImpresion: submittedData.tipoImpresion,
      costo: submittedData.costo,
      telefono: submittedData.telefono,
      notas: submittedData.notas,
    });
    setIsDownloadingTicket(false);
    if (ok) {
      setTicketDownloaded(true);
      playChime("success");
      setTimeout(() => setTicketDownloaded(false), 4000);
    }
  };

  // Reset form to make another request
  const handleResetForm = () => {
    setNombre("");
    setRolOption("Líder");
    setOtroRol("");
    setGrupo("");
    setZona("");
    setTelefono("");
    setNotas("");
    setYear("2026");
    setTipoImpresion(null);
    setIsSuccess(false);
    setSubmittedData(null);
    setUiError(null);
    setTicketDownloaded(false);
    playChime("tick");
  };

  const handleCopyFolio = (folio: string) => {
    navigator.clipboard.writeText(folio);
    setCopiedFolio(true);
    playChime("tick");
    setTimeout(() => setCopiedFolio(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-gray-100 rounded-3xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Top Floating Modal Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 text-lg">
              🎓
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900 leading-tight">
                Mini Web App • Solicitud de Reconocimientos
              </h2>
              <p className="text-[11px] text-gray-500">
                Liderazgo I • Notificación automática a Laura Cortazar (laurcortazar@gmail.com)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/solicitud.html"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
              title="Abrir en pestaña independiente completa"
            >
              <ExternalLink size={13} />
              <span>Ver en Pantalla Completa</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition active:scale-95"
              aria-label="Cerrar ventana"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body: 3-column Grid (2 cols Form, 1 col Recientes) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* =========================================================
                COLUMNA IZQUIERDA (Ocupa 2/3): FORMULARIO DE SOLICITUD
            ========================================================= */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                
                {/* Cabecera Colorida (Gradiente azul/índigo) */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-5 sm:p-7 text-white relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-xs mb-1.5 uppercase tracking-wider">
                        Expedición de Diplomas
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                        Solicitud de Reconocimiento
                      </h3>
                      <p className="text-indigo-100 text-xs mt-0.5">
                        Completa tus datos para solicitar la impresión oficial de tu diploma.
                      </p>
                    </div>
                    <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xs items-center justify-center text-2xl text-indigo-100">
                      <Award size={28} />
                    </div>
                  </div>
                </div>

                {/* UI Error Box (No alert ni confirm) */}
                {uiError && (
                  <div className="p-4 mx-6 mt-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2">
                    <span>{uiError}</span>
                    <button
                      type="button"
                      onClick={() => setUiError(null)}
                      className="text-rose-500 hover:text-rose-800"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {/* LÓGICA DE ESTADOS: ÉXITO */}
                {isSuccess && submittedData ? (
                  <div className="p-6 sm:p-10 text-center space-y-5 animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-3xl shadow-sm animate-bounce">
                      <CheckCircle2 size={36} />
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="text-2xl font-black text-gray-900">
                        ¡Solicitud Registrada con Éxito!
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                        Tu solicitud ha sido guardada en la base de datos en tiempo real. Laura Cortazar ha recibido la notificación en Task-OS y en su correo (<strong>laurcortazar@gmail.com</strong>).
                      </p>
                    </div>

                    {/* Receipt Summary Box */}
                    <div className="max-w-md mx-auto bg-gray-50 rounded-2xl p-4 border border-gray-200 text-left space-y-3 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                        <span className="text-gray-400 font-semibold uppercase text-[10px]">Folio de Seguimiento:</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-indigo-700">
                          <span>{submittedData.id.slice(0, 10).toUpperCase()}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyFolio(submittedData.id.slice(0, 10).toUpperCase())}
                            className="p-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px]"
                            title="Copiar folio"
                          >
                            {copiedFolio ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-400 block text-[10px]">Alumno:</span>
                          <strong className="text-gray-800">{submittedData.nombre}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Rol y Grupo:</span>
                          <strong className="text-gray-800">{submittedData.rol} • {submittedData.grupo}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Diplomado y Año:</span>
                          <strong className="text-gray-800">{submittedData.diplomado} ({submittedData.year})</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Tipo e Importe:</span>
                          <strong className="text-indigo-600 font-black">{submittedData.tipoImpresion} (${submittedData.costo})</strong>
                        </div>
                      </div>

                      {/* Notas en el resumen */}
                      {submittedData.notas && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="text-gray-400 block text-[10px] uppercase font-bold">Notas u Observaciones:</span>
                          <span className="text-gray-700 italic text-[11px]">"{submittedData.notas}"</span>
                        </div>
                      )}
                    </div>

                    {/* BOTÓN Y ACCIÓN DE DESCARGA DE TICKET EN GALERÍA */}
                    <div className="max-w-md mx-auto p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 text-left space-y-2.5 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
                          <Download size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="font-black text-emerald-950 text-xs sm:text-sm flex items-center gap-1.5">
                            <span>Ticket Oficial para tu Galería</span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                              {ticketDownloaded ? "✓ Guardado" : "PNG Listo"}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-800 leading-snug">
                            Se ha descargado a tus fotos/archivos. Puedes volver a descargarlo si lo necesitas.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleDownloadTicket}
                        disabled={isDownloadingTicket}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Download size={14} />
                        <span>
                          {isDownloadingTicket
                            ? "Generando imagen PNG..."
                            : ticketDownloaded
                            ? "Volver a Descargar Ticket en Galería"
                            : "Descargar Ticket en mi Galería (PNG)"}
                        </span>
                      </button>
                    </div>

                    {/* DATOS DE TRANSFERENCIA O DEPÓSITO */}
                    <div className="max-w-md mx-auto bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-left space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                          💳 Datos de Transferencia o Depósito
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          SPIN by OXXO
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-gray-800">
                        <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60">
                          <span className="text-gray-500 font-medium">Titular / Beneficiaria:</span>
                          <strong className="font-extrabold text-gray-900">LAURA CORTAZAR</strong>
                        </div>

                        {/* CLABE SPIN */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60">
                          <div>
                            <span className="text-gray-500 block text-[10px] uppercase font-bold">CLABE SPIN</span>
                            <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">728969000008838228</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText("728969000008838228", "clabe")}
                            className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center gap-1 transition"
                          >
                            {copiedField === "clabe" ? (
                              <>
                                <Check size={12} className="text-emerald-600" />
                                <span className="text-emerald-700">¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* TARJETA SPIN */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60">
                          <div>
                            <span className="text-gray-500 block text-[10px] uppercase font-bold">Tarjeta SPIN</span>
                            <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">4217 4701 0045 4061</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText("4217470100454061", "tarjeta")}
                            className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center gap-1 transition"
                          >
                            {copiedField === "tarjeta" ? (
                              <>
                                <Check size={12} className="text-emerald-600" />
                                <span className="text-emerald-700">¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* CÓDIGO DE DEPÓSITO SPIN (OXXO) */}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-gray-500 block text-[10px] uppercase font-bold">Código Depósito SPIN (OXXO)</span>
                            <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">2242-1787-4421-1658</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText("2242178744211658", "oxxo")}
                            className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center gap-1 transition"
                          >
                            {copiedField === "oxxo" ? (
                              <>
                                <Check size={12} className="text-emerald-600" />
                                <span className="text-emerald-700">¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Enlace directo para enviar comprobante de pago */}
                    <div className="max-w-md mx-auto">
                      <a
                        href={`https://wa.me/19999011852?text=${encodeURIComponent(
                          `Hola Laura, te comparto mi comprobante de pago para mi reconocimiento:\n\n*Nombre:* ${submittedData.nombre}\n*Rol:* ${submittedData.rol}\n*Grupo:* ${submittedData.grupo}\n*Zona:* ${submittedData.zona}\n*Diplomado:* ${submittedData.diplomado} (${submittedData.year})\n*Tipo:* ${submittedData.tipoImpresion}\n*Monto:* $${submittedData.costo} MXN\n*Folio:* ${submittedData.id.slice(0, 10).toUpperCase()}${submittedData.notas ? `\n*Notas:* ${submittedData.notas}` : ""}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md transition transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={18} />
                        <span>Mandar Comprobante de Pago por WhatsApp (Laura Cortazar)</span>
                      </a>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleResetForm}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Plus size={15} />
                        <span>Hacer otra solicitud</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Formulario Activo */
                  <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6">
                    
                    {/* 1. DATOS PERSONALES (Grid de 2 columnas) */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <User size={14} className="text-indigo-600" />
                        <span>1. Datos Personales</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Nombre Completo */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-gray-800 mb-1">
                            Nombre Completo *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Juan Pérez García"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-xs sm:text-sm shadow-xs transition"
                          />
                        </div>

                        {/* Rol (opción múltiple: Líder, Sublíder, Director centro, OSG, Otro) */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-gray-800 mb-1.5">
                            Rol / Función *
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {[
                              { label: "Líder", value: "Líder" },
                              { label: "Sublíder", value: "Sublíder" },
                              { label: "Director centro", value: "Director centro" },
                              { label: "OSG", value: "OSG" },
                              { label: "Otro", value: "Otro" },
                            ].map((item) => (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => setRolOption(item.value)}
                                className={`py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer shadow-2xs ${
                                  rolOption === item.value
                                    ? "bg-indigo-50 border-indigo-600 text-indigo-950 ring-2 ring-indigo-600/30"
                                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>

                          {/* Campo opcional si selecciona 'Otro' */}
                          {rolOption === "Otro" && (
                            <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                Especificar otro rol (opcional):
                              </label>
                              <input
                                type="text"
                                placeholder="Escribe tu rol o función personalizada (opcional)"
                                value={otroRol}
                                onChange={(e) => setOtroRol(e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-indigo-300 bg-white text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-xs sm:text-sm shadow-xs transition"
                              />
                            </div>
                          )}
                        </div>

                        {/* Grupo */}
                        <div>
                          <label className="block text-xs font-bold text-gray-800 mb-1">
                            Grupo *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Grupo A, Matutino, G-3"
                            value={grupo}
                            onChange={(e) => setGrupo(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-xs sm:text-sm shadow-xs transition"
                          />
                        </div>

                        {/* Zona */}
                        <div>
                          <label className="block text-xs font-bold text-gray-800 mb-1">
                            Zona *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Zona Tiburón, Centro, Norte"
                            value={zona}
                            onChange={(e) => setZona(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-xs sm:text-sm shadow-xs transition"
                          />
                        </div>

                        {/* Teléfono (Opcional para avisos WhatsApp) */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-gray-800 mb-1">
                            Teléfono / WhatsApp (Opcional para avisarte cuando esté impreso)
                          </label>
                          <input
                            type="tel"
                            placeholder="Ej. 999 123 4567"
                            value={telefono}
                            onChange={(e) => setTelefono(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-xs sm:text-sm shadow-xs transition"
                          />
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* APARTADO DE NOTAS / OBSERVACIONES */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <FileText size={14} className="text-indigo-600" />
                        <span>Apartado para Notas u Observaciones (Opcional)</span>
                      </h4>
                      <p className="text-[11px] text-gray-500 mb-2">
                        Si requieres alguna indicación particular sobre la impresión, fecha de entrega o comprobante, déjanos tu nota:
                      </p>
                      <textarea
                        rows={2}
                        placeholder="Ej. Realicé mi pago en OXXO, favor de entregar en la sesión presencial de este sábado..."
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-xs sm:text-sm shadow-xs transition resize-y"
                      />
                    </div>

                    <hr className="border-gray-200" />

                    {/* 2. DETALLES DEL DIPLOMA */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Award size={14} className="text-indigo-600" />
                        <span>2. Detalles del Diploma</span>
                      </h4>

                      <div className="space-y-3.5">
                        {/* Campo estático de solo lectura que diga "Liderazgo I" */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Diplomado
                          </label>
                          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gray-100 border border-gray-300 text-gray-800 text-xs sm:text-sm font-bold select-none">
                            <span className="text-gray-400">🔒</span>
                            <span>Liderazgo I</span>
                            <span className="ml-auto text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                              Programa Oficial
                            </span>
                          </div>
                        </div>

                        {/* Selector de botones para Año/Generación: 2022, 2025, 2026 */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Año / Generación *
                          </label>
                          <div className="grid grid-cols-3 gap-2.5">
                            {(["2022", "2025", "2026"] as const).map((y) => (
                              <button
                                key={y}
                                type="button"
                                onClick={() => setYear(y)}
                                className={`py-2.5 px-3 rounded-xl border font-bold text-xs sm:text-sm transition shadow-2xs ${
                                  year === y
                                    ? "ring-2 ring-indigo-600 bg-indigo-50 text-indigo-900 border-indigo-500"
                                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                {y}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* 3. TIPO DE IMPRESIÓN (Dos tarjetas clicables) */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Printer size={14} className="text-indigo-600" />
                        <span>3. Tipo de Impresión</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        
                        {/* Tarjeta 1: Primera Impresión ($100) */}
                        <div
                          onClick={() => setTipoImpresion("Primera Impresión")}
                          className={`cursor-pointer p-4 rounded-2xl border-2 transition-all shadow-2xs flex flex-col justify-between h-full ${
                            tipoImpresion === "Primera Impresión"
                              ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20"
                              : "border-gray-200 bg-white hover:border-indigo-300"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                                1ª
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 text-xs sm:text-sm">
                                  Primera Impresión
                                </div>
                                <p className="text-[11px] text-gray-500">Diploma oficial inicial</p>
                              </div>
                            </div>
                            <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg">
                              $100
                            </span>
                          </div>
                          <div className="mt-3 text-[11px] text-gray-500 flex items-center gap-1">
                            <Check size={13} className="text-indigo-500" />
                            <span>Papel opalina premium con sellos oficiales</span>
                          </div>
                        </div>

                        {/* Tarjeta 2: Re-impresión ($50) */}
                        <div
                          onClick={() => setTipoImpresion("Re-impresión")}
                          className={`cursor-pointer p-4 rounded-2xl border-2 transition-all shadow-2xs flex flex-col justify-between h-full ${
                            tipoImpresion === "Re-impresión"
                              ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20"
                              : "border-gray-200 bg-white hover:border-blue-300"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                                🔄
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 text-xs sm:text-sm">
                                  Re-impresión
                                </div>
                                <p className="text-[11px] text-gray-500">Reposición o copia extra</p>
                              </div>
                            </div>
                            <span className="text-sm font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg">
                              $50
                            </span>
                          </div>
                          <div className="mt-3 text-[11px] text-gray-500 flex items-center gap-1">
                            <Check size={13} className="text-blue-500" />
                            <span>Reposición por extravío o copia adicional</span>
                          </div>
                        </div>

                      </div>

                      {/* DATOS DE PAGO Y DEPÓSITO */}
                      <div className="mt-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            💳 Datos de Pago (Transferencia / Depósito SPIN OXXO)
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                            Laura Cortazar
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <div className="p-2 rounded-xl bg-white/80 border border-amber-200/60 flex items-center justify-between">
                            <div>
                              <span className="text-gray-400 block text-[9px] uppercase font-bold">CLABE SPIN</span>
                              <span className="font-mono font-bold text-gray-900">728969000008838228</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText("728969000008838228", "clabe_form")}
                              className="p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800"
                              title="Copiar CLABE"
                            >
                              {copiedField === "clabe_form" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          </div>

                          <div className="p-2 rounded-xl bg-white/80 border border-amber-200/60 flex items-center justify-between">
                            <div>
                              <span className="text-gray-400 block text-[9px] uppercase font-bold">Tarjeta SPIN</span>
                              <span className="font-mono font-bold text-gray-900">4217 4701 0045 4061</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText("4217470100454061", "tarjeta_form")}
                              className="p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800"
                              title="Copiar Tarjeta"
                            >
                              {copiedField === "tarjeta_form" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          </div>

                          <div className="p-2 rounded-xl bg-white/80 border border-amber-200/60 flex items-center justify-between">
                            <div>
                              <span className="text-gray-400 block text-[9px] uppercase font-bold">Depósito OXXO</span>
                              <span className="font-mono font-bold text-gray-900">2242-1787-4421-1658</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText("2242178744211658", "oxxo_form")}
                              className="p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800"
                              title="Copiar Código OXXO"
                            >
                              {copiedField === "oxxo_form" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-gray-500">
                            ¿Ya realizaste tu pago? Puedes enviar tu comprobante directamente:
                          </span>
                          <a
                            href="https://wa.me/19999011852"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                          >
                            <MessageCircle size={12} />
                            <span>WhatsApp Comprobantes</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* 4. PIE DEL FORMULARIO */}
                    <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-4">
                      
                      {/* Total a pagar dinámico */}
                      <div>
                        <span className="text-[11px] text-gray-400 font-medium block">Total de tu trámite:</span>
                        <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                          Total a pagar: <span className="text-indigo-600">${costoTotal}</span>
                        </div>
                      </div>

                      {/* Botón de Registrar Solicitud con loader */}
                      <button
                        type="submit"
                        disabled={isSubmitting || !tipoImpresion}
                        className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-xs sm:text-sm shadow-lg hover:shadow-indigo-500/25 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Registrando Solicitud...</span>
                          </>
                        ) : (
                          <>
                            <span>Registrar Solicitud</span>
                            <ArrowRight size={15} />
                          </>
                        )}
                      </button>

                    </div>

                  </form>
                )}

              </div>
            </div>

            {/* =========================================================
                COLUMNA DERECHA (Ocupa 1/3): REGISTROS RECIENTES
            ========================================================= */}
            <div className="lg:col-span-1 space-y-4">
              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-gray-900 text-xs sm:text-sm flex items-center gap-2">
                    <Clock size={15} className="text-indigo-600" />
                    <span>Registros Recientes</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {recientes.length}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Historial en vivo mediante Firestore. Se actualiza automáticamente al registrar solicitudes.
                </p>

                {/* List container */}
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {isLoadingRecientes ? (
                    <div className="p-8 text-center text-gray-400 space-y-2">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-[11px] font-medium">Sincronizando con base de datos...</p>
                    </div>
                  ) : recientes.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 space-y-2 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center text-lg">
                        📂
                      </div>
                      <p className="text-xs font-semibold text-gray-600">Aún no hay solicitudes registradas.</p>
                      <span className="text-[10px] text-gray-400 block">Sé el primero en completar el formulario.</span>
                    </div>
                  ) : (
                    recientes.slice(0, 15).map((item) => {
                      const isFirst = item.tipoImpresion === "Primera Impresión";
                      const timeLabel = item.timeVal
                        ? new Date(item.timeVal).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "Reciente";

                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 transition-all shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h5 className="font-bold text-gray-900 text-xs truncate">
                                {item.nombre}
                              </h5>
                              <p className="text-[10px] text-gray-500 truncate">
                                {item.rol} • Grupo {item.grupo} ({item.zona})
                              </p>
                            </div>
                            <span className="text-xs font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md shrink-0">
                              ${item.costo}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold ${
                                  isFirst ? "bg-indigo-100 text-indigo-800" : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {item.tipoImpresion}
                              </span>
                              <span className="font-semibold text-gray-600">({item.year})</span>
                            </div>
                            <span className="text-gray-400 font-mono text-[9px]">{timeLabel}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Admin note banner */}
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-gray-900 text-white p-4 rounded-2xl shadow-sm space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-indigo-300 font-bold uppercase tracking-wider text-[10px]">
                  <ShieldCheck size={13} />
                  <span>Control de Laura Cortazar</span>
                </div>
                <p className="text-gray-300 text-[11px] leading-snug">
                  Cada solicitud queda ligada al checklist de 6 pasos de Laura: <strong>Pago, Cuadernillos, Audio, Digital, Impreso y Entregado</strong>.
                </p>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
