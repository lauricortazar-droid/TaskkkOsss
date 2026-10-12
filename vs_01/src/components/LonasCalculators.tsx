import React, { useState } from "react";
import {
  LonasOrderItem,
  LonasOrderItemAcabados,
  LonasOrderItemEstructura,
  LonasStatus,
  LonasOrder,
} from "../types";
import {
  Calculator,
  Ruler,
  Maximize2,
  DollarSign,
  Check,
  X,
  Plus,
  HelpCircle,
  Percent,
} from "lucide-react";

// Material Presets
export interface LonasMaterialPreset {
  id: string;
  nombre: string;
  costoBaseM2: number;
  precioVentaBaseM2: number;
  descripcion: string;
  icono: string;
}

export const MATERIAL_PRESETS: LonasMaterialPreset[] = [
  {
    id: "lona-13oz",
    nombre: "Lona Front 13oz Estándar",
    costoBaseM2: 55,
    precioVentaBaseM2: 110,
    descripcion: "Para fachadas, eventos, carteleras y banners generales.",
    icono: "🏷️",
  },
  {
    id: "lona-18oz",
    nombre: "Lona Pesada 18oz (Alto Tráfico / Viento)",
    costoBaseM2: 75,
    precioVentaBaseM2: 150,
    descripcion: "Especial para espectaculares, bastidores grandes y viento fuerte.",
    icono: "🛡️",
  },
  {
    id: "lona-mesh",
    nombre: "Lona Mesh Microperforada",
    costoBaseM2: 85,
    precioVentaBaseM2: 170,
    descripcion: "Deja pasar el aire y la luz, ideal para fachadas altas y andamios.",
    icono: "💨",
  },
  {
    id: "lona-backlight",
    nombre: "Lona Backlight Traslúcida",
    costoBaseM2: 110,
    precioVentaBaseM2: 260,
    descripcion: "Para cajas de luz, anuncios luminosos y noche.",
    icono: "💡",
  },
  {
    id: "lona-blackout",
    nombre: "Lona Blackout Opaca (Doble Vista)",
    costoBaseM2: 90,
    precioVentaBaseM2: 190,
    descripcion: "Bloquea 100% el paso de la luz, no transparenta el bastidor.",
    icono: "🌑",
  },
  {
    id: "vinil-adhesivo",
    nombre: "Vinil Adhesivo Brillante / Mate",
    costoBaseM2: 65,
    precioVentaBaseM2: 140,
    descripcion: "Para rotulación de cristales, mostradores, vehículos y placas.",
    icono: "✨",
  },
  {
    id: "vinil-microperforado",
    nombre: "Vinil Microperforado para Cristales",
    costoBaseM2: 120,
    precioVentaBaseM2: 280,
    descripcion: "Visibilidad hacia afuera y gráfico comercial al exterior.",
    icono: "🪟",
  },
  {
    id: "personalizado",
    nombre: "Otro / Material Personalizado",
    costoBaseM2: 60,
    precioVentaBaseM2: 120,
    descripcion: "Medidas y costo por m² libremente configurables.",
    icono: "📐",
  },
];

export const ORDER_STAGES: { id: LonasStatus; label: string; color: string; icon: string; description: string }[] = [
  { id: "Cotización", label: "Cotización", color: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-300", icon: "📋", description: "Propuesta enviada al cliente" },
  { id: "Anticipo recibido", label: "Anticipo Recibido", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-400", icon: "💳", description: "50% cubierto para iniciar" },
  { id: "Diseño", label: "En Diseño", color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-400", icon: "🎨", description: "Creando arte en Illustrator/Photoshop" },
  { id: "Esperando aprobación", label: "Esperando Aprobación", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-400", icon: "⏳", description: "Boceto enviado para visto bueno" },
  { id: "Aprobado", label: "Visto Bueno Aprobado", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-400", icon: "✅", description: "Cliente autorizó impresión" },
  { id: "Producción", label: "En Producción / Taller", color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-400", icon: "🖨️", description: "Imprimiendo en gran formato" },
  { id: "Acabados", label: "Confección y Acabados", color: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-400", icon: "🪡", description: "Ojillos, bastillas, jaretas" },
  { id: "Listo", label: "Listo para Entrega", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-500", icon: "📦", description: "Terminado, listo en mostrador" },
  { id: "Entregado", label: "Entregado y Liquidado", color: "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 border-stone-700", icon: "🤝", description: "Entregado con éxito" },
  { id: "Cancelado", label: "Cancelado", color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300", icon: "❌", description: "Orden cancelada" },
];

/**
 * Calcula el desglose completo de un ítem según las calculadoras de área, acabados y estructura.
 */
export function calculateItemCalculators(item: Partial<LonasOrderItem>): {
  m2: number;
  costoArea: number;
  precioArea: number;
  costoAcabados: number;
  precioAcabados: number;
  costoEstructura: number;
  precioEstructura: number;
  costoTotalCalculado: number;
  precioTotalCalculado: number;
} {
  const ancho = Math.max(0.01, item.ancho || 1);
  const alto = Math.max(0.01, item.alto || 1);
  const cantidad = Math.max(1, item.cantidad || 1);
  const m2Unitario = ancho * alto;
  const m2Total = Number((m2Unitario * cantidad).toFixed(2));

  const costoPorM2 = item.costoPorM2 ?? 55;
  const precioVentaPorM2 = item.precioVentaPorM2 ?? 110;

  const costoArea = Number((m2Total * costoPorM2).toFixed(2));
  const precioArea = Number((m2Total * precioVentaPorM2).toFixed(2));

  // 1. Calculadora de Acabados
  let costoAcabados = 0;
  let precioAcabados = 0;
  const acabados = item.acabados || {};

  if (acabados.ojillos) {
    const defaultOjillos = Math.max(4, Math.ceil((2 * (ancho + alto)) / 0.5));
    const qty = acabados.ojillosCantidad ?? defaultOjillos;
    const unitPrice = acabados.ojillosCostoUnitario ?? 4;
    const totalOjillos = qty * cantidad * unitPrice;
    costoAcabados += totalOjillos * 0.4;
    precioAcabados += totalOjillos;
  }

  if (acabados.bastilla) {
    const metrosLineales = 2 * (ancho + alto) * cantidad;
    const costoM = acabados.bastillaCostoMetro ?? 15;
    const totalBastilla = metrosLineales * costoM;
    costoAcabados += totalBastilla * 0.4;
    precioAcabados += totalBastilla;
  }

  if (acabados.jaretas) {
    const totalJaretas = (acabados.jaretasCosto ?? 60) * cantidad;
    costoAcabados += totalJaretas * 0.3;
    precioAcabados += totalJaretas;
  }

  if (acabados.refuerzoEsquinas) {
    const totalRefuerzo = (acabados.refuerzoCosto ?? 50) * cantidad;
    costoAcabados += totalRefuerzo * 0.3;
    precioAcabados += totalRefuerzo;
  }

  if (acabados.otrosAcabadosCosto) {
    precioAcabados += acabados.otrosAcabadosCosto;
    costoAcabados += acabados.otrosAcabadosCosto * 0.5;
  }

  // 2. Calculadora de Estructura / Montaje
  let costoEstructura = 0;
  let precioEstructura = 0;
  const est = item.estructuraInstalacion || {};

  if (est.incluyeEstructura && est.costoEstructura) {
    precioEstructura += est.costoEstructura;
    costoEstructura += est.costoEstructura * 0.65;
  }

  if (est.instalacionEnSitio && est.costoInstalacion) {
    precioEstructura += est.costoInstalacion;
    costoEstructura += est.costoInstalacion * 0.5;
  }

  if (est.envioFlete) {
    precioEstructura += est.envioFlete;
    costoEstructura += est.envioFlete * 0.8;
  }

  const costoTotalCalculado = Number((costoArea + costoAcabados + costoEstructura).toFixed(2));
  const precioTotalCalculado = Number((precioArea + precioAcabados + precioEstructura).toFixed(2));

  return {
    m2: m2Total,
    costoArea,
    precioArea,
    costoAcabados: Number(costoAcabados.toFixed(2)),
    precioAcabados: Number(precioAcabados.toFixed(2)),
    costoEstructura: Number(costoEstructura.toFixed(2)),
    precioEstructura: Number(precioEstructura.toFixed(2)),
    costoTotalCalculado,
    precioTotalCalculado,
  };
}

/**
 * Genera el mensaje de WhatsApp pre-redactado para enviar al cliente según la etapa del pedido.
 */
export function buildStageWhatsAppMessage(order: LonasOrder, stage: LonasStatus): string {
  const nombre = order.cliente.nombre || "estimado cliente";
  const folio = String(order.folio).padStart(3, "0");
  const driveLink = order.driveUrl ? `\n📁 Archivo de diseño en Drive: ${order.driveUrl}` : "";
  const saldoTexto = order.saldo > 0 ? `\n💰 Saldo pendiente por liquidar: $${order.saldo.toFixed(2)} MXN` : "\n✅ Pedido liquidado al 100%.";

  const itemsList = order.items && order.items.length > 0
    ? order.items.map((it, i) => `  ${i + 1}. *${it.descripcion}* (${it.ancho}m x ${it.alto}m, cant: ${it.cantidad}) — $${(it.precioFinal || it.precioCalculado).toFixed(2)} MXN`).join("\n")
    : "  • Pedido de lona";

  switch (stage) {
    case "Cotización":
      return `¡Hola ${nombre}! 👋 Te compartimos la cotización detallada de tu pedido L-${folio}:\n\n` +
        `${itemsList}\n\n` +
        `💵 *Total Cotizado: $${order.total.toFixed(2)} MXN*` +
        (order.totalModificadoManualmente ? " (Precio especial acordado)" : "") +
        `\n\n📌 Para arrancar con el diseño y producción requerimos el 50% de anticipo ($${(order.total * 0.5).toFixed(2)} MXN). ¿Deseas que procedamos?`;

    case "Anticipo recibido":
      return `¡Hola ${nombre}! Confirmamos con éxito la recepción de tu anticipo de $${order.anticipo.toFixed(2)} MXN para tu pedido L-${folio}. Hemos registrado tu orden en nuestro taller y comenzamos de inmediato con el diseño. ¡Muchas gracias!`;

    case "Esperando aprobación":
    case "Diseño":
      return `¡Hola ${nombre}! Tu propuesta de diseño para el pedido de lonas L-${folio} ya está lista para tu revisión.${driveLink}\n\n` +
        `Por favor revísalo con calma (textos, teléfonos, medidas y colores) y confírmanos tu *VISTO BUENO* para mandarlo directo a impresión.`;

    case "Aprobado":
      return `¡Excelente ${nombre}! Recibimos tu visto bueno para el pedido L-${folio}. Enviamos de inmediato el archivo a máquinas de gran formato para impresión y acabados.`;

    case "Producción":
      return `¡Hola ${nombre}! Te informamos que tu pedido L-${folio} ya está en máquina imprimiéndose en alta definición en nuestro taller.`;

    case "Acabados":
      return `¡Hola ${nombre}! Tu pedido L-${folio} está en el área de confección de ojillos reforzados y bastillas. Ya casi está listo.`;

    case "Listo":
      return `¡Excelentes noticias ${nombre}! 🌟 Tu pedido de lonas L-${folio} ya está COMPLETAMENTE TERMINADO con ojillos y control de calidad listo para recoger en mostrador.${saldoTexto}\n\n` +
        `Puedes pasar por él en nuestro taller en el horario acordado. ¡Quedó impecable!`;

    case "Entregado":
      return `¡Muchas gracias por tu confianza, ${nombre}! Confirmamos la entrega de tu pedido L-${folio}. Fue un gusto trabajar contigo. ¡Quedamos a tus órdenes para futuros proyectos!`;

    default:
      return `Hola ${nombre}, te contacto respecto a tu pedido de lonas L-${folio}. Total: $${order.total.toFixed(2)} MXN.${driveLink}${saldoTexto}`;
  }
}

/**
 * Componente modal interactivo para configurar una opción/ítem usando las 3 calculadoras:
 * 1. Calculadora de Área & Material
 * 2. Calculadora de Acabados & Confección (ojillos, bastilla, jaretas)
 * 3. Calculadora de Estructura, Montaje e Instalación
 */
interface OptionCalculatorModalProps {
  initialItem?: LonasOrderItem;
  onSave: (item: LonasOrderItem) => void;
  onClose: () => void;
}

export function OptionCalculatorModal({
  initialItem,
  onSave,
  onClose,
}: OptionCalculatorModalProps) {
  const [descripcion, setDescripcion] = useState(initialItem?.descripcion || "Lona Front 13oz Fachada");
  const [material, setMaterial] = useState(initialItem?.material || "lona-13oz");
  const [ancho, setAncho] = useState<number>(initialItem?.ancho || 3.0);
  const [alto, setAlto] = useState<number>(initialItem?.alto || 1.0);
  const [cantidad, setCantidad] = useState<number>(initialItem?.cantidad || 1);
  const [costoPorM2, setCostoPorM2] = useState<number>(initialItem?.costoPorM2 || 55);
  const [precioVentaPorM2, setPrecioVentaPorM2] = useState<number>(initialItem?.precioVentaPorM2 || 110);
  const [observaciones, setObservaciones] = useState(initialItem?.observaciones || "");

  // Acabados
  const [ojillos, setOjillos] = useState<boolean>(initialItem?.acabados?.ojillos ?? true);
  const [ojillosCantidad, setOjillosCantidad] = useState<number>(
    initialItem?.acabados?.ojillosCantidad || Math.max(4, Math.ceil((2 * ((initialItem?.ancho || 3.0) + (initialItem?.alto || 1.0))) / 0.5))
  );
  const [ojillosCostoUnitario, setOjillosCostoUnitario] = useState<number>(initialItem?.acabados?.ojillosCostoUnitario || 4);

  const [bastilla, setBastilla] = useState<boolean>(initialItem?.acabados?.bastilla ?? true);
  const [bastillaCostoMetro, setBastillaCostoMetro] = useState<number>(initialItem?.acabados?.bastillaCostoMetro || 15);

  const [jaretas, setJaretas] = useState<boolean>(initialItem?.acabados?.jaretas ?? false);
  const [jaretasCosto, setJaretasCosto] = useState<number>(initialItem?.acabados?.jaretasCosto || 60);

  const [refuerzoEsquinas, setRefuerzoEsquinas] = useState<boolean>(initialItem?.acabados?.refuerzoEsquinas ?? false);
  const [refuerzoCosto, setRefuerzoCosto] = useState<number>(initialItem?.acabados?.refuerzoCosto || 50);

  const [otrosAcabadosTexto, setOtrosAcabadosTexto] = useState(initialItem?.acabados?.otrosAcabadosTexto || "");
  const [otrosAcabadosCosto, setOtrosAcabadosCosto] = useState<number>(initialItem?.acabados?.otrosAcabadosCosto || 0);

  // Estructura & Montaje
  const [incluyeEstructura, setIncluyeEstructura] = useState<boolean>(initialItem?.estructuraInstalacion?.incluyeEstructura ?? false);
  const [tipoEstructura, setTipoEstructura] = useState<string>(initialItem?.estructuraInstalacion?.tipoEstructura || "Bastidor de madera");
  const [costoEstructura, setCostoEstructura] = useState<number>(initialItem?.estructuraInstalacion?.costoEstructura || 350);

  const [instalacionEnSitio, setInstalacionEnSitio] = useState<boolean>(initialItem?.estructuraInstalacion?.instalacionEnSitio ?? false);
  const [costoInstalacion, setCostoInstalacion] = useState<number>(initialItem?.estructuraInstalacion?.costoInstalacion || 250);

  const [envioFlete, setEnvioFlete] = useState<number>(initialItem?.estructuraInstalacion?.envioFlete || 0);

  // Precio final editable
  const [precioFinalCustom, setPrecioFinalCustom] = useState<number | null>(
    initialItem?.precioFinal !== undefined && initialItem.precioFinal !== initialItem.precioCalculado
      ? initialItem.precioFinal
      : null
  );

  // Calculate live
  const acabadosObj: LonasOrderItemAcabados = {
    ojillos,
    ojillosCantidad,
    ojillosCostoUnitario,
    bastilla,
    bastillaMetrosLineales: 2 * (ancho + alto) * cantidad,
    bastillaCostoMetro,
    jaretas,
    jaretasCosto,
    refuerzoEsquinas,
    refuerzoCosto,
    otrosAcabadosTexto: otrosAcabadosTexto.trim() || undefined,
    otrosAcabadosCosto: otrosAcabadosCosto || 0,
  };

  const estructuraObj: LonasOrderItemEstructura = {
    incluyeEstructura,
    tipoEstructura,
    costoEstructura: incluyeEstructura ? costoEstructura : 0,
    instalacionEnSitio,
    costoInstalacion: instalacionEnSitio ? costoInstalacion : 0,
    envioFlete,
  };

  const calc = calculateItemCalculators({
    ancho,
    alto,
    cantidad,
    costoPorM2,
    precioVentaPorM2,
    acabados: acabadosObj,
    estructuraInstalacion: estructuraObj,
  });

  const finalPrice = precioFinalCustom !== null ? precioFinalCustom : calc.precioTotalCalculado;
  const margenEstimado = finalPrice - calc.costoTotalCalculado;
  const margenPorcentaje = finalPrice > 0 ? ((margenEstimado / finalPrice) * 100).toFixed(0) : "0";

  const handleSelectPreset = (preset: LonasMaterialPreset) => {
    setMaterial(preset.id);
    setCostoPorM2(preset.costoBaseM2);
    setPrecioVentaPorM2(preset.precioVentaBaseM2);
    if (!descripcion || descripcion === "Lona Front 13oz Fachada" || MATERIAL_PRESETS.some((p) => p.nombre === descripcion)) {
      setDescripcion(preset.nombre);
    }
  };

  const handleSave = () => {
    const item: LonasOrderItem = {
      id: initialItem?.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      descripcion: descripcion.trim() || "Lona / Vinil",
      material,
      ancho: Number(ancho) || 1,
      alto: Number(alto) || 1,
      cantidad: Number(cantidad) || 1,
      m2: calc.m2,
      costoPorM2: Number(costoPorM2) || 0,
      precioVentaPorM2: Number(precioVentaPorM2) || 0,
      costoCalculado: calc.costoTotalCalculado,
      precioCalculado: calc.precioTotalCalculado,
      precioFinal: Number(finalPrice) || 0,
      costoFinal: calc.costoTotalCalculado,
      observaciones: observaciones.trim() || undefined,
      acabados: acabadosObj,
      estructuraInstalacion: estructuraObj,
    };
    onSave(item);
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-[#0c182c] text-stone-900 dark:text-white rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto border border-stone-200 dark:border-blue-950">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-blue-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-950 dark:text-white tracking-tight">
                {initialItem ? "Editar Opción con Calculadoras" : "Nueva Opción / Producto en Pedido"}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Calculadoras de área, confección de acabados y montaje para saber cuánto cobrar con exactitud.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-blue-950/60 hover:bg-stone-200 dark:hover:bg-blue-900 text-stone-500 dark:text-stone-300 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Selector de Material (Presets) */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-blue-300 flex items-center justify-between">
            <span>1. Material y Tipo de Impresión</span>
            <span className="text-[10px] text-amber-500 dark:text-amber-400 font-semibold">Selecciona para auto-completar costos</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MATERIAL_PRESETS.map((p) => {
              const isSelected = material === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`p-2.5 rounded-2xl text-left border transition-all text-xs flex flex-col justify-between ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500 dark:border-amber-400 text-stone-950 dark:text-white ring-1 ring-amber-500"
                      : "bg-stone-50 dark:bg-[#14233c] border-stone-200 dark:border-blue-900/60 hover:border-stone-400 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>{p.icono}</span>
                    <span className="truncate">{p.nombre.split(" ")[0]} {p.nombre.split(" ")[1]}</span>
                  </div>
                  <div className="mt-1 text-[10px] font-mono text-stone-500 dark:text-stone-400 flex items-center justify-between">
                    <span>Costo: ${p.costoBaseM2}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">${p.precioVentaBaseM2}/m²</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Medidas y Cantidad (Calculadora de Área) */}
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#14233c] border border-stone-200 dark:border-blue-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-white flex items-center gap-1.5">
              <Ruler size={14} className="text-blue-500" />
              2. Calculadora de Medidas y Área
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-400/20 text-blue-700 dark:text-blue-300 text-xs font-mono font-bold">
              {calc.m2} m² totales ({Number((ancho * alto).toFixed(2))} m² c/u)
            </span>
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">
              Descripción o Nombre de la Opción
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Fachada negocio, Lona evento, Banner araña..."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#09101d] border border-stone-300 dark:border-blue-900 text-xs font-semibold mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                Ancho (metros)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                value={ancho}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setAncho(val);
                  // update default ojillos
                  setOjillosCantidad(Math.max(4, Math.ceil((2 * (val + alto)) / 0.5)));
                }}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#09101d] border border-stone-300 dark:border-blue-900 text-xs font-mono font-bold mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                Alto (metros)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                value={alto}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setAlto(val);
                  // update default ojillos
                  setOjillosCantidad(Math.max(4, Math.ceil((2 * (ancho + val)) / 0.5)));
                }}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#09101d] border border-stone-300 dark:border-blue-900 text-xs font-mono font-bold mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                Cantidad (piezas)
              </label>
              <input
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#09101d] border border-stone-300 dark:border-blue-900 text-xs font-mono font-bold mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                Costo Base de Material por m² ($)
              </label>
              <input
                type="number"
                step="1"
                value={costoPorM2}
                onChange={(e) => setCostoPorM2(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#09101d] border border-stone-300 dark:border-blue-900 text-xs font-mono mt-1"
              />
              <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">
                Costo impresión área: ${calc.costoArea.toFixed(2)}
              </span>
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                Precio Sugerido Venta por m² ($)
              </label>
              <input
                type="number"
                step="1"
                value={precioVentaPorM2}
                onChange={(e) => setPrecioVentaPorM2(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#09101d] border border-stone-300 dark:border-blue-900 text-xs font-mono mt-1 text-amber-600 dark:text-amber-400 font-bold"
              />
              <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">
                Precio área: ${calc.precioArea.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Calculadora de Acabados & Confección */}
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#14233c] border border-stone-200 dark:border-blue-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-white flex items-center gap-1.5">
              <span>🪡</span> 3. Calculadora de Confección y Acabados
            </span>
            <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
              +${calc.precioAcabados.toFixed(2)} cobro (costo: ${calc.costoAcabados.toFixed(2)})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Ojillos */}
            <div className={`p-3 rounded-xl border transition-all ${ojillos ? "bg-white dark:bg-[#09101d] border-teal-500/50" : "bg-white/50 dark:bg-[#09101d]/50 border-stone-200 dark:border-blue-950 opacity-70"}`}>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-bold flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ojillos}
                    onChange={(e) => setOjillos(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  Ojillos metálicos reforzados
                </span>
                {ojillos && (
                  <span className="text-[10px] font-mono font-bold text-teal-500">
                    +${(ojillosCantidad * cantidad * ojillosCostoUnitario).toFixed(2)}
                  </span>
                )}
              </label>
              {ojillos && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-stone-100 dark:border-blue-950">
                  <div>
                    <span className="text-[10px] text-stone-400 block">Cantidad ojillos</span>
                    <input
                      type="number"
                      min="2"
                      value={ojillosCantidad}
                      onChange={(e) => setOjillosCantidad(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1 rounded-lg border text-xs font-mono dark:bg-[#0c182c] dark:border-blue-900"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Precio c/u ($)</span>
                    <input
                      type="number"
                      value={ojillosCostoUnitario}
                      onChange={(e) => setOjillosCostoUnitario(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1 rounded-lg border text-xs font-mono dark:bg-[#0c182c] dark:border-blue-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bastilla perimetral */}
            <div className={`p-3 rounded-xl border transition-all ${bastilla ? "bg-white dark:bg-[#09101d] border-teal-500/50" : "bg-white/50 dark:bg-[#09101d]/50 border-stone-200 dark:border-blue-950 opacity-70"}`}>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-bold flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={bastilla}
                    onChange={(e) => setBastilla(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  Bastilla perimetral doble
                </span>
                {bastilla && (
                  <span className="text-[10px] font-mono font-bold text-teal-500">
                    +${(2 * (ancho + alto) * cantidad * bastillaCostoMetro).toFixed(2)}
                  </span>
                )}
              </label>
              {bastilla && (
                <div className="mt-2 pt-2 border-t border-stone-100 dark:border-blue-950 flex items-center justify-between">
                  <span className="text-[10px] text-stone-400 font-mono">
                    Perímetro: {(2 * (ancho + alto) * cantidad).toFixed(1)} metros lineales
                  </span>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-stone-400">$</span>
                    <input
                      type="number"
                      value={bastillaCostoMetro}
                      onChange={(e) => setBastillaCostoMetro(Number(e.target.value) || 0)}
                      className="w-14 px-2 py-0.5 rounded-lg border text-xs font-mono dark:bg-[#0c182c] dark:border-blue-900"
                    />
                    <span className="text-stone-400">/m</span>
                  </div>
                </div>
              )}
            </div>

            {/* Jaretas para tubos */}
            <div className={`p-3 rounded-xl border transition-all ${jaretas ? "bg-white dark:bg-[#09101d] border-teal-500/50" : "bg-white/50 dark:bg-[#09101d]/50 border-stone-200 dark:border-blue-950 opacity-70"}`}>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-bold flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={jaretas}
                    onChange={(e) => setJaretas(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  Jaretas sup/inf para tubo
                </span>
                {jaretas && (
                  <span className="text-[10px] font-mono font-bold text-teal-500">
                    +${(jaretasCosto * cantidad).toFixed(2)}
                  </span>
                )}
              </label>
              {jaretas && (
                <div className="mt-2 pt-2 border-t border-stone-100 dark:border-blue-950 flex items-center justify-between">
                  <span className="text-[10px] text-stone-400">Costo jareta por pieza:</span>
                  <input
                    type="number"
                    value={jaretasCosto}
                    onChange={(e) => setJaretasCosto(Number(e.target.value) || 0)}
                    className="w-16 px-2 py-0.5 rounded-lg border text-xs font-mono dark:bg-[#0c182c] dark:border-blue-900"
                  />
                </div>
              )}
            </div>

            {/* Refuerzo esquinas */}
            <div className={`p-3 rounded-xl border transition-all ${refuerzoEsquinas ? "bg-white dark:bg-[#09101d] border-teal-500/50" : "bg-white/50 dark:bg-[#09101d]/50 border-stone-200 dark:border-blue-950 opacity-70"}`}>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-bold flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={refuerzoEsquinas}
                    onChange={(e) => setRefuerzoEsquinas(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  Refuerzo vulcanizado en esquinas
                </span>
                {refuerzoEsquinas && (
                  <span className="text-[10px] font-mono font-bold text-teal-500">
                    +${(refuerzoCosto * cantidad).toFixed(2)}
                  </span>
                )}
              </label>
              {refuerzoEsquinas && (
                <div className="mt-2 pt-2 border-t border-stone-100 dark:border-blue-950 flex items-center justify-between">
                  <span className="text-[10px] text-stone-400">Costo refuerzos por lona:</span>
                  <input
                    type="number"
                    value={refuerzoCosto}
                    onChange={(e) => setRefuerzoCosto(Number(e.target.value) || 0)}
                    className="w-16 px-2 py-0.5 rounded-lg border text-xs font-mono dark:bg-[#0c182c] dark:border-blue-900"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Calculadora de Estructura, Montaje e Instalación */}
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#14233c] border border-stone-200 dark:border-blue-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-white flex items-center gap-1.5">
              <span>🏗️</span> 4. Calculadora de Estructura, Montaje y Flete
            </span>
            <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400">
              +${calc.precioEstructura.toFixed(2)} cobro (costo: ${calc.costoEstructura.toFixed(2)})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Estructura / Display */}
            <div className={`p-3 rounded-xl border transition-all ${incluyeEstructura ? "bg-white dark:bg-[#09101d] border-orange-500/50" : "bg-white/50 dark:bg-[#09101d]/50 border-stone-200 dark:border-blue-950 opacity-70"}`}>
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={incluyeEstructura}
                  onChange={(e) => setIncluyeEstructura(e.target.checked)}
                  className="rounded text-orange-600"
                />
                Estructura / Bastidor
              </label>
              {incluyeEstructura && (
                <div className="mt-2 space-y-2 pt-2 border-t border-stone-100 dark:border-blue-950">
                  <select
                    value={tipoEstructura}
                    onChange={(e) => {
                      setTipoEstructura(e.target.value);
                      if (e.target.value === "Roll-up 85x200") setCostoEstructura(450);
                      if (e.target.value === "Araña X 60x160") setCostoEstructura(250);
                      if (e.target.value === "Bastidor de madera") setCostoEstructura(350);
                      if (e.target.value === "Bastidor de herrería") setCostoEstructura(750);
                    }}
                    className="w-full px-2 py-1 rounded-lg border text-xs dark:bg-[#0c182c] dark:border-blue-900"
                  >
                    <option value="Bastidor de madera">Bastidor de madera</option>
                    <option value="Bastidor de herrería">Bastidor de herrería</option>
                    <option value="Roll-up 85x200">Roll-up 85x200</option>
                    <option value="Araña X 60x160">Araña X 60x160</option>
                    <option value="Estructura personalizada">Estructura personalizada</option>
                  </select>
                  <div>
                    <span className="text-[10px] text-stone-400">Precio estructura ($)</span>
                    <input
                      type="number"
                      value={costoEstructura}
                      onChange={(e) => setCostoEstructura(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1 rounded-lg border text-xs font-mono dark:bg-[#0c182c] dark:border-blue-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Instalación en sitio */}
            <div className={`p-3 rounded-xl border transition-all ${instalacionEnSitio ? "bg-white dark:bg-[#09101d] border-orange-500/50" : "bg-white/50 dark:bg-[#09101d]/50 border-stone-200 dark:border-blue-950 opacity-70"}`}>
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={instalacionEnSitio}
                  onChange={(e) => setInstalacionEnSitio(e.target.checked)}
                  className="rounded text-orange-600"
                />
                Instalación en Sitio
              </label>
              {instalacionEnSitio && (
                <div className="mt-2 pt-2 border-t border-stone-100 dark:border-blue-950">
                  <span className="text-[10px] text-stone-400">Mano de obra ($)</span>
                  <input
                    type="number"
                    value={costoInstalacion}
                    onChange={(e) => setCostoInstalacion(Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 rounded-lg border text-xs font-mono dark:bg-[#0c182c] dark:border-blue-900 mt-1"
                  />
                </div>
              )}
            </div>

            {/* Flete / Envío */}
            <div className="p-3 rounded-xl border bg-white dark:bg-[#09101d] border-stone-200 dark:border-blue-950">
              <span className="font-bold block">Flete o Envío ($)</span>
              <input
                type="number"
                placeholder="0"
                value={envioFlete || ""}
                onChange={(e) => setEnvioFlete(Number(e.target.value) || 0)}
                className="w-full px-2 py-1 rounded-lg border text-xs font-mono dark:bg-[#0c182c] dark:border-blue-900 mt-2"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">Opcional si requiere entrega a domicilio</span>
            </div>
          </div>
        </div>

        {/* 5. Resumen Financiero y Precio Final Ajustable */}
        <div className="p-4 rounded-3xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
                SUGERENCIA DE COBRO CALCULADA
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black font-mono text-stone-950 dark:text-white">
                  ${calc.precioTotalCalculado.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                  (Costo de producción: ${calc.costoTotalCalculado.toFixed(2)})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-2xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold font-mono">
                Margen: ${margenEstimado.toFixed(2)} ({margenPorcentaje}%)
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-black uppercase text-stone-700 dark:text-stone-300 block">
                Precio acordado final para esta opción ($)
              </label>
              <p className="text-[10px] text-stone-500 dark:text-stone-400">
                Puedes cambiar el precio aquí si aplicas descuento o tarifa especial.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="5"
                value={finalPrice}
                onChange={(e) => setPrecioFinalCustom(Number(e.target.value) || 0)}
                className="w-32 px-3 py-2 rounded-xl bg-white dark:bg-[#0c182c] border-2 border-amber-500 dark:border-amber-400 text-base font-black font-mono text-stone-900 dark:text-white text-right focus:outline-none"
              />
              {precioFinalCustom !== null && precioFinalCustom !== calc.precioTotalCalculado && (
                <button
                  type="button"
                  onClick={() => setPrecioFinalCustom(null)}
                  className="px-2 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Restablecer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200 dark:border-blue-950">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl border border-stone-300 dark:border-blue-900 text-xs font-bold hover:bg-stone-100 dark:hover:bg-blue-950"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Check size={16} />
            <span>{initialItem ? "Actualizar Opción" : "Agregar Opción al Pedido"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
