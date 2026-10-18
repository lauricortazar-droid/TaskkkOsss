import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  Building2,
  User,
  Phone,
  MessageCircle,
  Copy,
  Check,
  RotateCcw,
  Save,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import {
  PaymentAccountConfig,
  DEFAULT_PAYMENT_CONFIG,
  savePaymentConfig,
  buildPaymentShareText,
} from "../utils/paymentConfig";
import { playChime } from "../utils/audio";

interface PaymentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: PaymentAccountConfig;
  onSaved?: (cfg: PaymentAccountConfig) => void;
  userEmail?: string;
}

export default function PaymentConfigModal({
  isOpen,
  onClose,
  currentConfig,
  onSaved,
  userEmail = "Laura (Admin)",
}: PaymentConfigModalProps) {
  const [banco, setBanco] = useState(currentConfig.banco);
  const [titular, setTitular] = useState(currentConfig.titular);
  const [clabe, setClabe] = useState(currentConfig.clabe);
  const [tarjeta, setTarjeta] = useState(currentConfig.tarjeta);
  const [codigoOxxo, setCodigoOxxo] = useState(currentConfig.codigoOxxo);
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState(currentConfig.telefonoWhatsApp);
  const [whatsappUrl, setWhatsappUrl] = useState(currentConfig.whatsappUrl);
  const [instruccionesExtra, setInstruccionesExtra] = useState(
    currentConfig.instruccionesExtra || ""
  );

  const [isSaving, setIsSaving] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBanco(currentConfig.banco || DEFAULT_PAYMENT_CONFIG.banco);
      setTitular(currentConfig.titular || DEFAULT_PAYMENT_CONFIG.titular);
      setClabe(currentConfig.clabe || DEFAULT_PAYMENT_CONFIG.clabe);
      setTarjeta(currentConfig.tarjeta || DEFAULT_PAYMENT_CONFIG.tarjeta);
      setCodigoOxxo(currentConfig.codigoOxxo || DEFAULT_PAYMENT_CONFIG.codigoOxxo);
      setTelefonoWhatsApp(
        currentConfig.telefonoWhatsApp || DEFAULT_PAYMENT_CONFIG.telefonoWhatsApp
      );
      setWhatsappUrl(currentConfig.whatsappUrl || DEFAULT_PAYMENT_CONFIG.whatsappUrl);
      setInstruccionesExtra(
        currentConfig.instruccionesExtra ?? DEFAULT_PAYMENT_CONFIG.instruccionesExtra ?? ""
      );
      setShowResetConfirm(false);
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handlePhoneChange = (val: string) => {
    setTelefonoWhatsApp(val);
    const clean = val.replace(/[^0-9]/g, "");
    if (clean) {
      setWhatsappUrl(`https://wa.me/${clean}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Partial<PaymentAccountConfig> = {
        banco: banco.trim() || DEFAULT_PAYMENT_CONFIG.banco,
        titular: titular.trim().toUpperCase() || DEFAULT_PAYMENT_CONFIG.titular,
        clabe: clabe.replace(/\s+/g, "").trim(),
        tarjeta: tarjeta.trim(),
        codigoOxxo: codigoOxxo.trim(),
        telefonoWhatsApp: telefonoWhatsApp.trim(),
        whatsappUrl: whatsappUrl.trim() || DEFAULT_PAYMENT_CONFIG.whatsappUrl,
        instruccionesExtra: instruccionesExtra.trim(),
      };

      const saved = await savePaymentConfig(payload, userEmail);
      playChime("success");
      onSaved?.(saved);
      onClose();
    } catch (err) {
      console.error("Error saving payment config:", err);
      alert("Error al guardar los datos de pago.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setIsSaving(true);
    try {
      const saved = await savePaymentConfig(DEFAULT_PAYMENT_CONFIG, userEmail);
      setBanco(saved.banco);
      setTitular(saved.titular);
      setClabe(saved.clabe);
      setTarjeta(saved.tarjeta);
      setCodigoOxxo(saved.codigoOxxo);
      setTelefonoWhatsApp(saved.telefonoWhatsApp);
      setWhatsappUrl(saved.whatsappUrl);
      setInstruccionesExtra(saved.instruccionesExtra || "");
      setShowResetConfirm(false);
      playChime("tick");
      onSaved?.(saved);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const previewConfig: PaymentAccountConfig = {
    banco,
    titular,
    clabe,
    tarjeta,
    codigoOxxo,
    telefonoWhatsApp,
    whatsappUrl,
    instruccionesExtra,
  };

  const previewText = buildPaymentShareText(
    previewConfig,
    "Nombre del Alumno",
    "Diplomado de Liderazgo (2026)",
    100
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-5 animate-in zoom-in-95 my-auto max-h-[94vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <CreditCard size={20} />
            </span>
            <div>
              <h3 className="font-black text-stone-900 dark:text-stone-100 text-lg">
                Editar Datos de Pago Oficiales
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Personaliza la cuenta bancaria, CLABE, titular y WhatsApp donde los alumnos transfieren y envían comprobantes.
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

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Banco / Institución */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Banco / Institución Financiera *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  placeholder="Ej. SPIN by OXXO / STP / BBVA"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Titular */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Nombre de la Beneficiaria / Titular *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={titular}
                  onChange={(e) => setTitular(e.target.value.toUpperCase())}
                  placeholder="Ej. LAURA CORTAZAR"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                />
              </div>
            </div>

            {/* CLABE */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                CLABE Interbancaria (18 dígitos) *
              </label>
              <input
                type="text"
                required
                value={clabe}
                onChange={(e) => setClabe(e.target.value)}
                placeholder="Ej. 728969000008838228"
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-500 tracking-wider"
              />
            </div>

            {/* Tarjeta */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Número de Tarjeta / Cuenta *
              </label>
              <input
                type="text"
                required
                value={tarjeta}
                onChange={(e) => setTarjeta(e.target.value)}
                placeholder="Ej. 4217 4701 0045 4061"
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-500 tracking-wider"
              />
            </div>

            {/* Código OXXO */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Código de Depósito OXXO (opcional)
              </label>
              <input
                type="text"
                value={codigoOxxo}
                onChange={(e) => setCodigoOxxo(e.target.value)}
                placeholder="Ej. 2242-1787-4421-1658"
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-medium text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Teléfono WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Teléfono de WhatsApp para Comprobantes *
              </label>
              <input
                type="text"
                required
                value={telefonoWhatsApp}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="Ej. 19999011852 o 521999..."
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Enlace WhatsApp Directo */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Enlace Web Directo a WhatsApp
            </label>
            <input
              type="url"
              value={whatsappUrl}
              onChange={(e) => setWhatsappUrl(e.target.value)}
              placeholder="https://wa.me/19999011852"
              className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Instrucciones adicionales */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Instrucciones adicionales para el comprobante
            </label>
            <textarea
              rows={2}
              value={instruccionesExtra}
              onChange={(e) => setInstruccionesExtra(e.target.value)}
              placeholder="Ej. En cuanto hagas tu transferencia, envíame tu comprobante aquí para avanzar con tu impresión..."
              className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Vista previa en vivo del texto copiado/enviado */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Sparkles size={12} />
                <span>Vista Previa del Mensaje para Alumnos:</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(previewText);
                  setCopiedPreview(true);
                  playChime("tick");
                  setTimeout(() => setCopiedPreview(false), 2000);
                }}
                className="text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedPreview ? (
                  <>
                    <Check size={11} className="text-emerald-600" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Copiar Texto</span>
                  </>
                )}
              </button>
            </div>
            <pre className="text-[11px] font-mono whitespace-pre-wrap text-stone-700 dark:text-stone-300 leading-relaxed bg-white/70 dark:bg-stone-900/60 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-800/40">
              {previewText}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            {showResetConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                  ¿Restablecer a valores iniciales de SPIN?
                </span>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs"
                >
                  Sí, restablecer
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-1 rounded-lg text-xs font-semibold text-stone-500"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-1.5 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <RotateCcw size={13} />
                <span>Restablecer Originales</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-black text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <Save size={14} />
                <span>{isSaving ? "Guardando..." : "Guardar Datos de Pago"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
