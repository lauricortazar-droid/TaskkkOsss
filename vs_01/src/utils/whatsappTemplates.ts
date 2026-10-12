import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface WhatsAppTemplate {
  id: string;
  nombre: string;
  categoria: "reconocimiento" | "diplomado" | "pago" | "general";
  texto: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "tpl-estado-reconocimiento",
    nombre: "📋 Estado de Reconocimiento y Trámite",
    categoria: "reconocimiento",
    texto:
      `Hola {nombre}, te saluda tu madrina Laura (Universidad FGDLL).\n\n` +
      `📋 *Estado de tu Reconocimiento ({diplomado} - Generación {year})*:\n` +
      `• Folio: {folio}\n` +
      `• Tipo: {tipo} (${"{costo}"})\n` +
      `• Pago: {pagoEstado}\n` +
      `• Cuadernillos: {cuadernillosEstado}\n` +
      `• Audio: {audioEstado}\n` +
      `• Reconocimiento Digital: {digitalEstado}\n` +
      `• Impresión Física: {impresoEstado}\n` +
      `• Entrega: {entregadoEstado}\n` +
      `• Enlace Drive Digital: {driveUrl}\n\n` +
      `Cualquier duda quedo a tus órdenes. ¡Muchas felicidades!`,
    isDefault: true,
  },
  {
    id: "tpl-impreso-listo-drive",
    nombre: "🎉 Reconocimiento Impreso y Listo (con Drive)",
    categoria: "reconocimiento",
    texto:
      `¡Hola {nombre}! 🎉\n\n` +
      `Te informamos que tu reconocimiento oficial de *{diplomado}* (Generación {year}) ya fue *IMPRESO* y está listo.\n\n` +
      `🌐 Puedes consultar y descargar tu reconocimiento digital público en Google Drive aquí:\n` +
      `{driveUrl}\n\n` +
      `Quedamos en contacto para coordinar la entrega física. ¡Enhorabuena por este gran logro! 🎓`,
    isDefault: true,
  },
  {
    id: "tpl-datos-pago-spin",
    nombre: "💳 Datos de Pago SPIN / OXXO",
    categoria: "pago",
    texto:
      `Hola {nombre}, te saluda tu madrina Laura (Universidad FGDLL).\n\n` +
      `Aquí tienes los datos oficiales para realizar el pago de tu reconocimiento ({tipo} • $${"{costo}"}):\n\n` +
      `👤 *Titular:* Laura Elena Cortázar López\n` +
      `💳 *CLABE SPIN:* 638690000000000000\n` +
      `💳 *TARJETA SPIN:* 4152 3138 0000 0000\n` +
      `🏪 *CÓDIGO DE DEPÓSITO SPIN (OXXO):* 0000 0000\n` +
      `💰 *Importe:* $${"{costo}"} MXN\n\n` +
      `En cuanto hagas tu transferencia o depósito en OXXO, por favor envíame tu comprobante por este medio para avanzar con tu impresión. ¡Muchas gracias!`,
    isDefault: true,
  },
  {
    id: "tpl-bienvenida-diplomado",
    nombre: "👋 Bienvenida y Registro a Diplomado",
    categoria: "diplomado",
    texto:
      `¡Hola {nombre}! Te saludamos con mucho gusto de {casa}.\n\n` +
      `Te confirmamos que tu estatus es *ADMITIDO* para la {generacion} ({diplomado}) en el rol de *{rol}*.\n\n` +
      `Me comunico contigo para darte una cálida bienvenida y coordinar los detalles pendientes de tu documentación y reconocimientos. ¿Cómo estás?`,
    isDefault: true,
  },
  {
    id: "tpl-cuadernillos-audio",
    nombre: "📚 Recordatorio de Cuadernillos y Audio",
    categoria: "diplomado",
    texto:
      `Hola {nombre}, esperamos te encuentres muy bien.\n\n` +
      `Te contactamos de {casa} ({generacion}) para recordarte el envío pendiente de tus cuadernillos de trabajo y confirmación de audio para proceder con la elaboración de tu reconocimiento oficial de {diplomado}.\n\n` +
      `Quedamos atentos a tu respuesta. ¡Saludos cordiales!`,
    isDefault: true,
  },
  {
    id: "tpl-digital-disponible",
    nombre: "🌐 Reconocimiento Digital en Drive Disponible",
    categoria: "reconocimiento",
    texto:
      `Hola {nombre}, ya puedes consultar tu reconocimiento digital de *{diplomado}* en Google Drive:\n\n` +
      `🔗 {driveUrl}\n\n` +
      `Si detectas algún detalle en tu nombre o datos, avísame de inmediato para corregirlo antes de la impresión final.`,
    isDefault: true,
  },
];

const STORAGE_KEY = "taskos_whatsapp_templates_v2";

/**
 * Get templates from local storage or defaults
 */
export function getLocalTemplates(): WhatsAppTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error reading local WhatsApp templates:", e);
  }
  return DEFAULT_WHATSAPP_TEMPLATES;
}

/**
 * Save templates to local storage
 */
export function saveLocalTemplates(templates: WhatsAppTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.warn("Error saving local WhatsApp templates:", e);
  }
}

/**
 * Render template text with dynamic record data
 */
export function renderWhatsAppTemplate(
  templateText: string,
  data: {
    nombre?: string;
    diplomado?: string;
    year?: string;
    costo?: string | number;
    tipo?: string;
    folio?: string;
    driveUrl?: string;
    pagoEstado?: string;
    cuadernillosEstado?: string;
    audioEstado?: string;
    digitalEstado?: string;
    impresoEstado?: string;
    entregadoEstado?: string;
    casa?: string;
    rol?: string;
    generacion?: string;
    telefono?: string;
    email?: string;
    zona?: string;
    grupo?: string;
  }
): string {
  let result = templateText;

  const replaceMap: Record<string, string> = {
    "{nombre}": data.nombre || "Alumno",
    "{diplomado}": data.diplomado || "Diplomado de Liderazgo",
    "{year}": String(data.year || "2026"),
    "{costo}": String(data.costo || "100"),
    "{tipo}": data.tipo || "Primera Impresión",
    "{folio}": data.folio || "S/F",
    "{driveUrl}": data.driveUrl || "Enlace en proceso",
    "{pagoEstado}": data.pagoEstado || "Pendiente",
    "{cuadernillosEstado}": data.cuadernillosEstado || "Pendiente",
    "{audioEstado}": data.audioEstado || "Pendiente",
    "{digitalEstado}": data.digitalEstado || "Pendiente",
    "{impresoEstado}": data.impresoEstado || "Pendiente",
    "{entregadoEstado}": data.entregadoEstado || "Pendiente",
    "{casa}": data.casa || "Gladiadores Casa Martha Sangerman",
    "{rol}": data.rol || "Participante",
    "{generacion}": data.generacion || `Generación ${data.year || "2026"}`,
    "{telefono}": data.telefono || "",
    "{email}": data.email || "",
    "{zona}": data.zona || "General",
    "{grupo}": data.grupo || "G-1",
  };

  Object.entries(replaceMap).forEach(([tag, val]) => {
    // Replace all occurrences
    result = result.split(tag).join(val);
  });

  return result;
}

/**
 * Real-time listener for WhatsApp templates from Firestore with fallback
 */
export function subscribeWhatsAppTemplates(
  onUpdate: (templates: WhatsAppTemplate[]) => void
): () => void {
  try {
    const unsub = onSnapshot(
      collection(db, "whatsapp_templates"),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: WhatsAppTemplate[] = [];
          snapshot.forEach((snap) => {
            const d = snap.data();
            list.push({
              id: snap.id,
              nombre: d.nombre || "Plantilla sin nombre",
              categoria: d.categoria || "general",
              texto: d.texto || "",
              isDefault: Boolean(d.isDefault),
              createdAt: d.createdAt,
              updatedAt: d.updatedAt,
            });
          });
          saveLocalTemplates(list);
          onUpdate(list);
        } else {
          // If Firestore is empty, seed defaults
          const defaults = getLocalTemplates();
          onUpdate(defaults);
          // Seed defaults asynchronously
          defaults.forEach((t) => {
            setDoc(doc(db, "whatsapp_templates", t.id), {
              ...t,
              createdAt: new Date().toISOString(),
            }).catch(() => null);
          });
        }
      },
      (err) => {
        console.warn("Firestore whatsapp_templates listener notice:", err);
        onUpdate(getLocalTemplates());
      }
    );
    return unsub;
  } catch (e) {
    onUpdate(getLocalTemplates());
    return () => {};
  }
}

/**
 * Save (create or update) a WhatsApp template in Firestore and localStorage
 */
export async function saveWhatsAppTemplate(template: WhatsAppTemplate): Promise<void> {
  const current = getLocalTemplates();
  const exists = current.some((t) => t.id === template.id);
  const updatedList = exists
    ? current.map((t) => (t.id === template.id ? template : t))
    : [...current, template];

  saveLocalTemplates(updatedList);

  try {
    await setDoc(doc(db, "whatsapp_templates", template.id), {
      ...template,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Could not save WhatsApp template to Firestore:", err);
  }
}

/**
 * Delete a WhatsApp template from Firestore and localStorage
 */
export async function deleteWhatsAppTemplate(id: string): Promise<void> {
  const current = getLocalTemplates();
  const filtered = current.filter((t) => t.id !== id);
  saveLocalTemplates(filtered);

  try {
    await deleteDoc(doc(db, "whatsapp_templates", id));
  } catch (err) {
    console.warn("Could not delete WhatsApp template from Firestore:", err);
  }
}
