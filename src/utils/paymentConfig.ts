import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface PaymentAccountConfig {
  banco: string;
  titular: string;
  clabe: string;
  tarjeta: string;
  codigoOxxo: string;
  telefonoWhatsApp: string;
  whatsappUrl: string;
  instruccionesExtra?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_PAYMENT_CONFIG: PaymentAccountConfig = {
  banco: "SPIN by OXXO",
  titular: "LAURA CORTAZAR",
  clabe: "728969000008838228",
  tarjeta: "4217 4701 0045 4061",
  codigoOxxo: "2242-1787-4421-1658",
  telefonoWhatsApp: "19999011852",
  whatsappUrl: "https://wa.me/19999011852",
  instruccionesExtra: "En cuanto hagas tu transferencia o depósito en OXXO, envíame tu comprobante aquí para avanzar con tu impresión. ¡Muchas gracias!",
};

const STORAGE_KEY = "spin_payment_config_v2";

export function getSavedPaymentConfig(): PaymentAccountConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PAYMENT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn("Error reading payment config from localStorage:", e);
  }
  return DEFAULT_PAYMENT_CONFIG;
}

export async function savePaymentConfig(
  newConfig: Partial<PaymentAccountConfig>,
  updatedBy: string = "Admin"
): Promise<PaymentAccountConfig> {
  const current = getSavedPaymentConfig();
  const merged: PaymentAccountConfig = {
    ...current,
    ...newConfig,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  // If whatsapp phone changed but url was not provided, rebuild url
  if (newConfig.telefonoWhatsApp && !newConfig.whatsappUrl) {
    const cleanDigits = newConfig.telefonoWhatsApp.replace(/[^0-9]/g, "");
    merged.whatsappUrl = `https://wa.me/${cleanDigits}`;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn("Error saving payment config to localStorage:", e);
  }

  try {
    const docRef = doc(db, "configuraciones", "datos_pago");
    await setDoc(docRef, merged, { merge: true });
  } catch (e) {
    console.warn("Could not save payment config to Firestore:", e);
  }

  return merged;
}

export function subscribeToPaymentConfig(
  callback: (cfg: PaymentAccountConfig) => void
): () => void {
  // Fire immediately with local cache
  callback(getSavedPaymentConfig());

  try {
    const docRef = doc(db, "configuraciones", "datos_pago");
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<PaymentAccountConfig>;
          const merged: PaymentAccountConfig = {
            ...DEFAULT_PAYMENT_CONFIG,
            ...data,
          };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch (e) {}
          callback(merged);
        }
      },
      (err) => {
        console.warn("Notice in payment config listener:", err);
      }
    );
    return unsub;
  } catch (e) {
    console.warn("Failed to subscribe to payment config:", e);
    return () => {};
  }
}

export function buildPaymentShareText(
  cfg: PaymentAccountConfig,
  recipientName?: string,
  concept?: string,
  amount?: number
): string {
  const greeting = recipientName ? `Hola *${recipientName}*, ` : "Hola, ";
  const conceptText = concept ? `para el trámite de *${concept}*` : "para tu trámite";
  const amountText = amount !== undefined && amount > 0 ? ` (Monto: *$${amount} MXN*)` : "";

  return (
    `${greeting}te compartimos los datos oficiales ${conceptText}${amountText}:\n\n` +
    `🏦 *Banco / Institución:* ${cfg.banco}\n` +
    `👤 *Titular:* ${cfg.titular}\n` +
    `💳 *CLABE:* ${cfg.clabe}\n` +
    `💳 *Tarjeta / Cuenta:* ${cfg.tarjeta}\n` +
    (cfg.codigoOxxo ? `🏪 *Código de Depósito (OXXO):* ${cfg.codigoOxxo}\n\n` : "\n") +
    (cfg.instruccionesExtra ? `${cfg.instruccionesExtra}\n\n` : "") +
    `📲 *Envío de comprobante:* ${cfg.whatsappUrl}`
  );
}
