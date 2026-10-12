import React, { useState, useEffect, useRef } from "react";
import {
  Printer,
  Plus,
  Search,
  ExternalLink,
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  Calendar,
  Phone,
  FileText,
  AlertCircle,
  Truck,
  RotateCcw,
  RefreshCw,
  Send,
  X,
  Share2,
  ArrowRight,
  TrendingUp,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  Download,
  Copy,
  Check,
  Sparkles,
  Calculator,
  Ruler,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageCircle,
  Upload,
  Eye,
  Sliders,
  Maximize2,
  Layers,
  ChevronRight,
  Edit3,
} from "lucide-react";
import {
  LonasOrder,
  LonasStatus,
  LonasOrderItem,
  LonasOrderLink,
  LonasOrderImage,
  Contact,
  PrintItem,
  UrlLibraryItem,
} from "../types";
import { playChime } from "../utils/audio";
import {
  buildWhatsAppUrl,
  openWhatsAppInNewTab,
  cleanPhoneNumber,
  getWhatsAppDirectLink,
} from "../utils/whatsapp";
import { downloadReceiptPNG } from "../utils/receiptGenerator";
import {
  ORDER_STAGES,
  MATERIAL_PRESETS,
  calculateItemCalculators,
  buildStageWhatsAppMessage,
  OptionCalculatorModal,
} from "./LonasCalculators";

export const STORAGE_KEY_LONAS = "task_os_pepe_lonas_orders_v1";

export const INITIAL_LONAS_ORDERS: LonasOrder[] = [
  {
    id: "lon-008",
    folio: 8,
    cliente: {
      nombre: "El Taller del Maestro",
      telefono: "19999011852",
      empresa: "Zona Jaguar",
    },
    items: [
      {
        id: "item-008-1",
        descripcion: "Fachada en Lona Front 13oz con bastilla y ojillos",
        material: "lona-13oz",
        ancho: 4.0,
        alto: 0.5,
        cantidad: 1,
        m2: 2.0,
        costoPorM2: 65,
        precioVentaPorM2: 110,
        costoCalculado: 130,
        precioCalculado: 220,
        precioFinal: 220,
        costoFinal: 130,
        observaciones: "Contacto: M. Máxima",
        acabados: {
          ojillos: true,
          ojillosCantidad: 18,
          bastilla: true,
        },
      },
    ],
    subtotal: 220,
    descuento: 0,
    costoTotalCalculado: 130,
    total: 220,
    totalModificadoManualmente: false,
    anticipo: 0,
    pagos: [],
    saldo: 220,
    estado: "Cotización",
    fechaIngreso: "2026-09-12",
    fechaEntregaEstimada: "12 sep 2026",
    driveUrl: "https://drive.google.com/file/d/1taller-maestro-diseno-fachada-lonas/view",
    links: [
      {
        id: "link-008-1",
        titulo: "Archivo de diseño en Drive",
        url: "https://drive.google.com/file/d/1taller-maestro-diseno-fachada-lonas/view",
        tipo: "drive",
      },
    ],
    notasInternas: "Seguimiento: Activo. Contacto: M. Máxima.",
    notasCliente: "Cotización pendiente de anticipo.",
  },
  {
    id: "lon-005",
    folio: 5,
    cliente: {
      nombre: "LA LEGIÓN - AZUL",
      telefono: "19991234567",
      empresa: "Zona Jaguar",
    },
    items: [
      {
        id: "item-005-1",
        descripcion: "Lona Front con Ojillos reforzados y bastilla perimetral",
        material: "lona-13oz",
        ancho: 3.5,
        alto: 2.0,
        cantidad: 1,
        m2: 7.0,
        costoPorM2: 55,
        precioVentaPorM2: 121.4,
        costoCalculado: 385,
        precioCalculado: 850,
        precioFinal: 850,
        costoFinal: 385,
        acabados: {
          ojillos: true,
          ojillosCantidad: 22,
          bastilla: true,
        },
      },
    ],
    subtotal: 850,
    descuento: 0,
    costoTotalCalculado: 385,
    total: 850,
    totalModificadoManualmente: false,
    anticipo: 850,
    pagos: [
      {
        id: "pay-005",
        fecha: "2026-09-07",
        monto: 850,
        metodo: "Transferencia",
        referencia: "TRANS-771",
      },
    ],
    saldo: 0,
    estado: "Listo",
    fechaIngreso: "2026-09-05",
    fechaEntregaEstimada: "7 sep 2026",
    driveUrl: "https://drive.google.com/file/d/1la-legion-azul-diseno-banner/view",
    links: [
      {
        id: "link-005-1",
        titulo: "Arte final para impresión",
        url: "https://drive.google.com/file/d/1la-legion-azul-diseno-banner/view",
        tipo: "drive",
      },
    ],
    notasInternas: "Listo para recoger en mostrador.",
  },
  {
    id: "lon-007",
    folio: 7,
    cliente: {
      nombre: "Cazadores de Sueños",
      telefono: "15512345678",
      empresa: "Zona Jaguar",
    },
    items: [
      {
        id: "item-007-1",
        descripcion: "Vinil mate sobre coroplast",
        material: "vinil-adhesivo",
        ancho: 2.0,
        alto: 1.0,
        cantidad: 1,
        m2: 2.0,
        costoPorM2: 80,
        precioVentaPorM2: 200,
        costoCalculado: 160,
        precioCalculado: 400,
        precioFinal: 400,
        costoFinal: 160,
      },
    ],
    subtotal: 400,
    descuento: 0,
    costoTotalCalculado: 160,
    total: 400,
    totalModificadoManualmente: false,
    anticipo: 400,
    pagos: [
      {
        id: "pay-007",
        fecha: "2026-09-10",
        monto: 400,
        metodo: "Efectivo",
      },
    ],
    saldo: 0,
    estado: "Producción",
    fechaIngreso: "2026-09-09",
    fechaEntregaEstimada: "10 sep 2026",
    driveUrl: "https://drive.google.com/file/d/1cazadores-suenos-vinil-coroplast/view",
  },
];

interface LonasOSProps {
  userEmail: string;
  onSyncWithTaskOS?: (order: LonasOrder) => void;
  onSyncWithFinanzas?: (order: LonasOrder) => void;
  onSendToPrint?: (printItem: PrintItem) => void;
  onNavigateToFinanzas?: () => void;
  onNavigateToUrls?: () => void;
  onSaveUrlToLibrary?: (item: Omit<UrlLibraryItem, "id" | "createdAt">) => void;
}

export default function LonasOS({
  userEmail,
  onSyncWithTaskOS,
  onSyncWithFinanzas,
  onSendToPrint,
  onNavigateToFinanzas,
  onNavigateToUrls,
  onSaveUrlToLibrary,
}: LonasOSProps) {
  const [orders, setOrders] = useState<LonasOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LONAS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_LONAS_ORDERS;
  });

  const [activeTab, setActiveTab] = useState<"activos" | "terminados">("activos");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<LonasOrder | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Option Calculator Modal State
  const [optionCalculatorOpen, setOptionCalculatorOpen] = useState(false);
  const [editingOptionItem, setEditingOptionItem] = useState<LonasOrderItem | null>(null);
  const [calculatorTarget, setCalculatorTarget] = useState<"new_order" | "selected_order">("new_order");

  // New Order Draft State
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmpresa, setNewClientEmpresa] = useState("Zona Jaguar");
  const [newOrderStage, setNewOrderStage] = useState<LonasStatus>("Cotización");
  const [newFechaEntrega, setNewFechaEntrega] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return `${d.getDate()} ${d.toLocaleString("es-MX", { month: "short" })} ${d.getFullYear()}`;
  });
  const [newOrderItems, setNewOrderItems] = useState<LonasOrderItem[]>([
    {
      id: "item-default",
      descripcion: "Lona Front 13oz Estándar",
      material: "lona-13oz",
      ancho: 3.0,
      alto: 1.0,
      cantidad: 1,
      m2: 3.0,
      costoPorM2: 55,
      precioVentaPorM2: 110,
      costoCalculado: 165,
      precioCalculado: 330,
      precioFinal: 330,
      costoFinal: 165,
      acabados: {
        ojillos: true,
        ojillosCantidad: 16,
        bastilla: true,
      },
    },
  ]);
  const [newOrderTotalCustom, setNewOrderTotalCustom] = useState<number | null>(null);
  const [newOrderCostoCustom, setNewOrderCostoCustom] = useState<number | null>(null);
  const [newOrderAnticipo, setNewOrderAnticipo] = useState<number>(0);
  const [newOrderDriveUrl, setNewOrderDriveUrl] = useState("");
  const [newOrderLinks, setNewOrderLinks] = useState<LonasOrderLink[]>([]);
  const [newOrderImages, setNewOrderImages] = useState<LonasOrderImage[]>([]);

  // Links & Images in Modal
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [activeImageLightbox, setActiveImageLightbox] = useState<LonasOrderImage | null>(null);
  const [whatsAppCustomText, setWhatsAppCustomText] = useState("");
  const [isEditingWhatsAppText, setIsEditingWhatsAppText] = useState(false);

  // Drive editing
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const [isEditingDrive, setIsEditingDrive] = useState(false);

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save orders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LONAS, JSON.stringify(orders));
    } catch (_) {}
  }, [orders]);

  // Operational metrics
  const activeOrders = orders.filter((o) => o.estado !== "Entregado" && o.estado !== "Cancelado");
  const completedOrders = orders.filter((o) => o.estado === "Entregado");
  const totalPorCobrar = activeOrders.reduce((sum, o) => sum + o.saldo, 0);
  const totalEnProduccion = activeOrders.filter(
    (o) => o.estado === "Producción" || o.estado === "Diseño" || o.estado === "Esperando aprobación" || o.estado === "Acabados"
  ).length;
  const totalCostosActivos = activeOrders.reduce(
    (sum, o) => sum + (o.costoTotalCalculado ?? o.items.reduce((iSum, it) => iSum + it.costoFinal, 0)),
    0
  );
  const totalVentasActivas = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const totalUtilidadEstimada = totalVentasActivas - totalCostosActivos;

  // Filtered orders
  const displayedOrders = (activeTab === "activos" ? activeOrders : completedOrders).filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      o.cliente.nombre.toLowerCase().includes(q) ||
      (o.cliente.empresa && o.cliente.empresa.toLowerCase().includes(q)) ||
      String(o.folio).includes(q) ||
      o.items.some((it) => it.descripcion.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (statusFilter === "todos") return true;
    return o.estado === statusFilter;
  });

  // Calculate draft order totals
  const calcDraftTotals = (items: LonasOrderItem[]) => {
    const sumCosto = Number(items.reduce((sum, it) => sum + (it.costoFinal ?? it.costoCalculado), 0).toFixed(2));
    const sumPrecio = Number(items.reduce((sum, it) => sum + (it.precioFinal ?? it.precioCalculado), 0).toFixed(2));
    const totalM2 = Number(items.reduce((sum, it) => sum + it.m2, 0).toFixed(2));
    return { sumCosto, sumPrecio, totalM2 };
  };

  // Helper to update selected order both in modal & orders state
  const handleUpdateSelectedOrder = (updater: Partial<LonasOrder> | ((prev: LonasOrder) => LonasOrder)) => {
    if (!selectedOrderForModal) return;
    const updated = typeof updater === "function" ? updater(selectedOrderForModal) : { ...selectedOrderForModal, ...updater };

    // Recalculate saldo if total or anticipo updated
    const finalTotal = updated.total;
    const finalAnticipo = updated.anticipo;
    updated.saldo = Math.max(0, Number((finalTotal - finalAnticipo).toFixed(2)));

    setSelectedOrderForModal(updated);
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  // Open Option Calculator
  const handleOpenAddOption = (target: "new_order" | "selected_order") => {
    setCalculatorTarget(target);
    setEditingOptionItem(null);
    setOptionCalculatorOpen(true);
  };

  const handleOpenEditOption = (target: "new_order" | "selected_order", item: LonasOrderItem) => {
    setCalculatorTarget(target);
    setEditingOptionItem(item);
    setOptionCalculatorOpen(true);
  };

  // Save item from Option Calculator
  const handleSaveOptionItem = (item: LonasOrderItem) => {
    if (calculatorTarget === "new_order") {
      if (editingOptionItem) {
        setNewOrderItems((prev) => prev.map((it) => (it.id === item.id ? item : it)));
      } else {
        setNewOrderItems((prev) => [...prev, item]);
      }
    } else if (calculatorTarget === "selected_order" && selectedOrderForModal) {
      const currentItems = selectedOrderForModal.items || [];
      const updatedItems = editingOptionItem
        ? currentItems.map((it) => (it.id === item.id ? item : it))
        : [...currentItems, item];

      const { sumCosto, sumPrecio } = calcDraftTotals(updatedItems);
      const isManual = selectedOrderForModal.totalModificadoManualmente;
      const newTotal = isManual ? selectedOrderForModal.total : sumPrecio;

      handleUpdateSelectedOrder({
        items: updatedItems,
        subtotal: sumPrecio,
        costoTotalCalculado: sumCosto,
        total: newTotal,
      });
      playChime("tick");
    }
    setOptionCalculatorOpen(false);
    setEditingOptionItem(null);
  };

  // Duplicate option
  const handleDuplicateOption = (target: "new_order" | "selected_order", item: LonasOrderItem) => {
    const duplicated: LonasOrderItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      descripcion: `${item.descripcion} (Copia)`,
    };
    if (target === "new_order") {
      setNewOrderItems((prev) => [...prev, duplicated]);
    } else if (selectedOrderForModal) {
      const updatedItems = [...selectedOrderForModal.items, duplicated];
      const { sumCosto, sumPrecio } = calcDraftTotals(updatedItems);
      const newTotal = selectedOrderForModal.totalModificadoManualmente ? selectedOrderForModal.total : sumPrecio;
      handleUpdateSelectedOrder({
        items: updatedItems,
        subtotal: sumPrecio,
        costoTotalCalculado: sumCosto,
        total: newTotal,
      });
    }
    playChime("tick");
  };

  // Delete option
  const handleDeleteOption = (target: "new_order" | "selected_order", itemId: string) => {
    if (target === "new_order") {
      if (newOrderItems.length <= 1) {
        setActionFeedback("El pedido debe tener al menos una opción.");
        setTimeout(() => setActionFeedback(null), 2500);
        return;
      }
      setNewOrderItems((prev) => prev.filter((it) => it.id !== itemId));
    } else if (selectedOrderForModal) {
      if (selectedOrderForModal.items.length <= 1) {
        setActionFeedback("El pedido debe tener al menos una opción.");
        setTimeout(() => setActionFeedback(null), 2500);
        return;
      }
      const updatedItems = selectedOrderForModal.items.filter((it) => it.id !== itemId);
      const { sumCosto, sumPrecio } = calcDraftTotals(updatedItems);
      const newTotal = selectedOrderForModal.totalModificadoManualmente ? selectedOrderForModal.total : sumPrecio;
      handleUpdateSelectedOrder({
        items: updatedItems,
        subtotal: sumPrecio,
        costoTotalCalculado: sumCosto,
        total: newTotal,
      });
    }
    playChime("tick");
  };

  // Handle stage change
  const handleChangeStage = (orderId: string, newStage: LonasStatus) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          estado: newStage,
          entregadoAt: newStage === "Entregado" ? new Date().toISOString() : o.entregadoAt,
        };
      })
    );
    if (selectedOrderForModal && selectedOrderForModal.id === orderId) {
      setSelectedOrderForModal({
        ...selectedOrderForModal,
        estado: newStage,
        entregadoAt: newStage === "Entregado" ? new Date().toISOString() : selectedOrderForModal.entregadoAt,
      });
    }
    playChime("tick");
    setActionFeedback(`Etapa actualizada: "${newStage}".`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Add Link
  const handleAddLink = (target: "new_order" | "selected_order") => {
    if (!newLinkUrl.trim()) return;
    const cleanUrl = newLinkUrl.trim().startsWith("http") ? newLinkUrl.trim() : `https://${newLinkUrl.trim()}`;
    const linkItem: LonasOrderLink = {
      id: `link-${Date.now()}`,
      titulo: newLinkTitle.trim() || "Enlace de diseño / referencia",
      url: cleanUrl,
      tipo: cleanUrl.includes("drive.google.com") ? "drive" : "otro",
    };

    if (target === "new_order") {
      setNewOrderLinks((prev) => [...prev, linkItem]);
      if (!newOrderDriveUrl && linkItem.tipo === "drive") {
        setNewOrderDriveUrl(cleanUrl);
      }
    } else if (selectedOrderForModal) {
      const currentLinks = selectedOrderForModal.links || [];
      const updatedLinks = [...currentLinks, linkItem];
      const updatePayload: Partial<LonasOrder> = { links: updatedLinks };
      if (!selectedOrderForModal.driveUrl && linkItem.tipo === "drive") {
        updatePayload.driveUrl = cleanUrl;
      }
      handleUpdateSelectedOrder(updatePayload);
    }

    setNewLinkTitle("");
    setNewLinkUrl("");
    playChime("tick");
  };

  // Delete Link
  const handleDeleteLink = (target: "new_order" | "selected_order", linkId: string) => {
    if (target === "new_order") {
      setNewOrderLinks((prev) => prev.filter((l) => l.id !== linkId));
    } else if (selectedOrderForModal) {
      const updatedLinks = (selectedOrderForModal.links || []).filter((l) => l.id !== linkId);
      handleUpdateSelectedOrder({ links: updatedLinks });
    }
    playChime("tick");
  };

  // Image Upload handler
  const handleImageUpload = (target: "new_order" | "selected_order", e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) return;

        const newImg: LonasOrderImage = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          nombre: file.name,
          dataUrl,
          fecha: new Date().toISOString(),
        };

        if (target === "new_order") {
          setNewOrderImages((prev) => [...prev, newImg]);
        } else if (selectedOrderForModal) {
          const currentImages = selectedOrderForModal.imagenesEjemplo || [];
          handleUpdateSelectedOrder({ imagenesEjemplo: [...currentImages, newImg] });
        }
        playChime("success");
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Delete Image
  const handleDeleteImage = (target: "new_order" | "selected_order", imageId: string) => {
    if (target === "new_order") {
      setNewOrderImages((prev) => prev.filter((img) => img.id !== imageId));
    } else if (selectedOrderForModal) {
      const currentImages = selectedOrderForModal.imagenesEjemplo || [];
      handleUpdateSelectedOrder({
        imagenesEjemplo: currentImages.filter((img) => img.id !== imageId),
      });
    }
    if (activeImageLightbox && activeImageLightbox.id === imageId) {
      setActiveImageLightbox(null);
    }
    playChime("tick");
  };

  // Direct WhatsApp sending
  const handleSendWhatsAppToClient = (order: LonasOrder, customMsg?: string) => {
    const phone = order.cliente.telefono;
    const msg = customMsg || buildStageWhatsAppMessage(order, order.estado);
    const opened = openWhatsAppInNewTab(phone, msg);
    if (opened) {
      playChime("success");
      setActionFeedback("Abriendo WhatsApp con el mensaje del pedido...");
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  // Create Order
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim()) {
      setActionFeedback("Por favor ingresa nombre y teléfono del cliente.");
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }

    const nextFolio = orders.length > 0 ? Math.max(...orders.map((o) => o.folio)) + 1 : 16;
    const { sumCosto, sumPrecio } = calcDraftTotals(newOrderItems);
    const finalTotal = newOrderTotalCustom !== null ? newOrderTotalCustom : sumPrecio;
    const finalCosto = newOrderCostoCustom !== null ? newOrderCostoCustom : sumCosto;
    const anticipo = Math.min(newOrderAnticipo, finalTotal);
    const saldo = Math.max(0, finalTotal - anticipo);

    // Normalize phone with https://wa.me/1 format
    const cleanPhone = cleanPhoneNumber(newClientPhone);

    const newOrder: LonasOrder = {
      id: `lon-${Date.now()}`,
      folio: nextFolio,
      cliente: {
        nombre: newClientName.trim(),
        telefono: cleanPhone,
        empresa: newClientEmpresa.trim() || "Zona Jaguar",
      },
      items: newOrderItems,
      subtotal: sumPrecio,
      descuento: 0,
      costoTotalCalculado: finalCosto,
      total: finalTotal,
      totalModificadoManualmente: newOrderTotalCustom !== null && newOrderTotalCustom !== sumPrecio,
      anticipo,
      pagos: anticipo > 0 ? [{ id: `p-${Date.now()}`, fecha: new Date().toISOString().slice(0, 10), monto: anticipo, metodo: "Efectivo" }] : [],
      saldo,
      estado: newOrderStage,
      fechaIngreso: new Date().toISOString().slice(0, 10),
      fechaEntregaEstimada: newFechaEntrega,
      driveUrl: newOrderDriveUrl.trim() || undefined,
      links: newOrderLinks,
      imagenesEjemplo: newOrderImages,
    };

    setOrders([newOrder, ...orders]);
    setIsNewOrderModalOpen(false);

    // Save to URL library if drive URL provided
    if (newOrderDriveUrl.trim() && onSaveUrlToLibrary) {
      onSaveUrlToLibrary({
        url: newOrderDriveUrl.trim(),
        title: `Diseño L-${String(newOrder.folio).padStart(3, "0")} • ${newOrder.cliente.nombre}`,
        categoria: "Diseño & Creatividad",
        descripcion: `Archivo de diseño en Google Drive para pedido L-${newOrder.folio} (${newOrder.cliente.empresa || "Zona Jaguar"}).`,
        isDesignFile: true,
        driveUrl: newOrderDriveUrl.trim(),
        relatedOrderId: newOrder.id,
        relatedOrderFolio: newOrder.folio,
        clienteNombre: newOrder.cliente.nombre,
        empresaZona: newOrder.cliente.empresa,
        icon: "https://ssl.gstatic.com/docs/doclist/images/drive_icon_32.png",
        isFavorite: true,
        keywords: ["drive", "diseño", "lona", `l-${newOrder.folio}`, newOrder.cliente.nombre.toLowerCase()],
      });
    }

    // Reset draft form
    setNewClientName("");
    setNewClientPhone("");
    setNewClientEmpresa("Zona Jaguar");
    setNewOrderItems([
      {
        id: `item-${Date.now()}`,
        descripcion: "Lona Front 13oz Estándar",
        material: "lona-13oz",
        ancho: 3.0,
        alto: 1.0,
        cantidad: 1,
        m2: 3.0,
        costoPorM2: 55,
        precioVentaPorM2: 110,
        costoCalculado: 165,
        precioCalculado: 330,
        precioFinal: 330,
        costoFinal: 165,
        acabados: { ojillos: true, ojillosCantidad: 16, bastilla: true },
      },
    ]);
    setNewOrderTotalCustom(null);
    setNewOrderCostoCustom(null);
    setNewOrderAnticipo(0);
    setNewOrderDriveUrl("");
    setNewOrderLinks([]);
    setNewOrderImages([]);

    playChime("success");
    setActionFeedback(`Pedido L-${newOrder.folio} creado con éxito (${newOrder.items.length} opciones).`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Mark paid
  const handleMarkAsPaid = (order: LonasOrder) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== order.id) return o;
        return {
          ...o,
          saldo: 0,
          anticipo: o.total,
          estado: o.estado === "Cotización" ? "Producción" : o.estado,
          pagos: [
            ...o.pagos,
            { id: `p-${Date.now()}`, fecha: new Date().toISOString().slice(0, 10), monto: o.saldo, metodo: "Efectivo", nota: "Liquidado al 100%" },
          ],
        };
      })
    );
    if (selectedOrderForModal && selectedOrderForModal.id === order.id) {
      setSelectedOrderForModal({
        ...selectedOrderForModal,
        saldo: 0,
        anticipo: selectedOrderForModal.total,
      });
    }
    playChime("work_done");
    setActionFeedback(`Pedido L-${order.folio} liquidado al 100%.`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Delete order
  const handleDeleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setSelectedOrderForModal(null);
    playChime("tick");
    setActionFeedback("Pedido eliminado del registro.");
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Ticket PNG download
  const handleDownloadOrderPNG = async (order: LonasOrder) => {
    const printItem: PrintItem = {
      id: `print-${order.id}`,
      tipo: "ticket_lona",
      folio: `L-${String(order.folio).padStart(3, "0")}`,
      titulo: `${order.cliente.nombre} • ${order.cliente.empresa || "Zona Jaguar"}`,
      clienteNombre: order.cliente.nombre,
      clienteTelefono: order.cliente.telefono,
      empresaZona: order.cliente.empresa,
      fecha: order.fechaIngreso,
      fechaEntrega: order.fechaEntregaEstimada,
      items: order.items.map((it) => ({
        descripcion: it.descripcion,
        detalle: `${it.ancho}m x ${it.alto}m • ${it.m2} m² (x${it.cantidad})`,
        cantidad: it.cantidad,
        subtotal: it.precioFinal,
      })),
      total: order.total,
      anticipo: order.anticipo,
      saldo: order.saldo,
      driveUrl: order.driveUrl,
      notas: order.notasInternas || `Opciones: ${order.items.length} • Total material: ${order.items.reduce((s, it) => s + it.m2, 0)} m²`,
      createdAt: new Date().toISOString(),
    };

    try {
      await downloadReceiptPNG(printItem);
      playChime("success");
      setActionFeedback("Ticket PNG generado y descargado exitosamente.");
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  // Send to PRINT Station
  const handleSendToPrintStation = (order: LonasOrder) => {
    if (onSendToPrint) {
      const printItem: PrintItem = {
        id: `print-${order.id}`,
        tipo: "ticket_lona",
        folio: `L-${String(order.folio).padStart(3, "0")}`,
        titulo: `${order.cliente.nombre} • ${order.cliente.empresa || "Zona Jaguar"}`,
        clienteNombre: order.cliente.nombre,
        clienteTelefono: order.cliente.telefono,
        empresaZona: order.cliente.empresa,
        fecha: order.fechaIngreso,
        fechaEntrega: order.fechaEntregaEstimada,
        items: order.items.map((it) => ({
          descripcion: it.descripcion,
          detalle: `${it.ancho}m x ${it.alto}m • ${it.m2} m² (x${it.cantidad})`,
          cantidad: it.cantidad,
          subtotal: it.precioFinal,
        })),
        total: order.total,
        anticipo: order.anticipo,
        saldo: order.saldo,
        metodoPago: "Efectivo / Transferencia",
        estado: order.estado,
        driveUrl: order.driveUrl,
        notas: order.notasInternas,
        origen: "lonas",
        createdAt: new Date().toISOString(),
      };
      onSendToPrint(printItem);
      playChime("tick");
    }
  };

  return (
    <div id="lonas-os-workspace" className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
            TALLER DE PRODUCCIÓN Y GRAN FORMATO
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white tracking-tight">
            Pedidos de lonas
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Múltiples opciones por persona, calculadoras de acabados, control de etapas y WhatsApp directo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Link to Mi Salud Financiera */}
          <button
            onClick={() => {
              if (onNavigateToFinanzas) onNavigateToFinanzas();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold transition-all hover:bg-emerald-100"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
              💚
            </div>
            <div className="text-left">
              <span className="text-[9px] uppercase tracking-wider block font-black text-emerald-700 dark:text-emerald-400">
                ESPACIO PRIVADO
              </span>
              <span>Mi Salud Financiera &rarr;</span>
            </div>
          </button>

          {/* New Order Button */}
          <button
            onClick={() => {
              setNewOrderStage("Cotización");
              setIsNewOrderModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-stone-950 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-950 text-xs font-black shadow-md transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>Nuevo pedido</span>
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 font-semibold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-emerald-700 dark:text-emerald-300 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-5 rounded-3xl bg-[#0d182b] text-white shadow-lg space-y-1 relative overflow-hidden">
          <span className="text-xs font-bold text-stone-400 block">Por cobrar</span>
          <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
            ${totalPorCobrar.toLocaleString("es-MX")}
          </p>
          <span className="text-[11px] text-stone-400 block">{activeOrders.length} pedidos abiertos</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            En producción / taller
          </span>
          <p className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white font-mono tracking-tight">
            {totalEnProduccion}
          </p>
          <span className="text-[11px] text-stone-400 block">diseño, aprobación o confección</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Utilidad estimada
          </span>
          <p className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
            ${totalUtilidadEstimada.toLocaleString("es-MX")}
          </p>
          <span className="text-[11px] text-stone-400 block">sobre pedidos abiertos</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Ventas totales activas
          </span>
          <p className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white font-mono tracking-tight">
            ${totalVentasActivas.toLocaleString("es-MX")}
          </p>
          <span className="text-[11px] text-stone-400 block">costos de producción: ${totalCostosActivos.toLocaleString("es-MX")}</span>
        </div>
      </div>

      {/* Orders List & Filters */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-stone-950 dark:text-white tracking-tight">
              Seguimiento y Control de Etapas
            </h3>
            <span className="text-xs text-stone-500 font-bold">
              {activeOrders.length} pedidos activos en curso
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-2xl bg-stone-100 dark:bg-stone-800 text-xs font-bold">
              <button
                onClick={() => setActiveTab("activos")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "activos"
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 shadow-xs"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Activos <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-stone-700 text-white font-mono">{activeOrders.length}</span>
              </button>
              <button
                onClick={() => setActiveTab("terminados")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "terminados"
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 shadow-xs"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Terminados <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-stone-300 dark:bg-stone-700 text-stone-900 dark:text-white font-mono">{completedOrders.length}</span>
              </button>
            </div>

            <div className="flex items-center p-1 rounded-xl border border-stone-200 dark:border-stone-800">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg ${viewMode === "table" ? "bg-stone-200 dark:bg-stone-700 text-stone-900" : "text-stone-400"}`}
                title="Vista tabla"
              >
                <ListIcon size={15} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg ${viewMode === "grid" ? "bg-stone-200 dark:bg-stone-700 text-stone-900" : "text-stone-400"}`}
                title="Vista tarjetas"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, empresa, folio o producto..."
              className="w-full pl-9 pr-3 py-2 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-800 dark:text-stone-200"
            >
              <option value="todos">Todos los estados</option>
              {ORDER_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Orders View */}
        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-[11px] font-bold text-stone-400 uppercase">
                  <th className="py-2.5 px-3">Pedido</th>
                  <th className="py-2.5 px-3">Cliente / WhatsApp</th>
                  <th className="py-2.5 px-3">Opciones</th>
                  <th className="py-2.5 px-3">Etapa del Pedido</th>
                  <th className="py-2.5 px-3">Entrega</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Saldo</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-medium">
                {displayedOrders.map((order) => {
                  const isPaid = order.saldo <= 0;
                  const folioStr = `L-${String(order.folio).padStart(3, "0")}`;
                  const currentStageObj = ORDER_STAGES.find((s) => s.id === order.estado) || ORDER_STAGES[0];
                  const directWaUrl = getWhatsAppDirectLink(order.cliente.telefono);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                    >
                      <td className="py-3 px-3 font-mono font-black text-stone-900 dark:text-stone-100">
                        {folioStr}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-stone-900 dark:text-stone-100">
                            {order.cliente.nombre}
                          </span>
                          {order.driveUrl && (
                            <a
                              href={order.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-[#eef5ff] dark:bg-[#073d83]/30 text-[#042f66] dark:text-[#ffd15c] text-[10px] font-bold hover:underline"
                              title="Abrir archivo de diseño en Google Drive ↗"
                            >
                              📁 Drive
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-0.5">
                          <span>{order.cliente.empresa || "Zona Jaguar"}</span>
                          <span>•</span>
                          <a
                            href={directWaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono flex items-center gap-0.5"
                            title="Abrir WhatsApp directo https://wa.me/1..."
                          >
                            <Phone size={10} />
                            {directWaUrl.replace("https://", "")}
                          </a>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-xs text-stone-800 dark:text-stone-200">
                          {order.items.length} {order.items.length === 1 ? "opción" : "opciones"}
                        </span>
                        <div className="text-[10px] text-stone-400 truncate max-w-[150px]">
                          {order.items.map((it) => it.descripcion).join(", ")}
                        </div>
                      </td>

                      {/* Etapa del pedido con selector rápido */}
                      <td className="py-3 px-3">
                        <div className="relative inline-block">
                          <select
                            value={order.estado}
                            onChange={(e) => handleChangeStage(order.id, e.target.value as LonasStatus)}
                            className={`text-[11px] font-bold py-1 px-2.5 rounded-full border cursor-pointer appearance-none pr-6 ${currentStageObj.color}`}
                          >
                            {ORDER_STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.icon} {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-stone-500 dark:text-stone-400">
                        {order.fechaEntregaEstimada}
                      </td>

                      <td className="py-3 px-3 font-mono font-black text-stone-900 dark:text-stone-100">
                        ${order.total.toLocaleString("es-MX")}
                        {order.totalModificadoManualmente && (
                          <span className="text-[9px] text-amber-500 block font-normal">manual</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {isPaid ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            Pagado
                          </span>
                        ) : (
                          <span className="font-black text-amber-600 dark:text-amber-400">
                            ${order.saldo.toLocaleString("es-MX")}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleSendWhatsAppToClient(order)}
                            className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors"
                            title="Enviar WhatsApp al cliente con la etapa actual"
                          >
                            <Send size={14} />
                          </button>
                          <button
                            onClick={() => setSelectedOrderForModal(order)}
                            className="px-3 py-1 rounded-xl bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950 text-xs font-bold hover:bg-stone-800"
                          >
                            Ver / Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {displayedOrders.map((order) => {
              const currentStageObj = ORDER_STAGES.find((s) => s.id === order.estado) || ORDER_STAGES[0];
              const directWaUrl = getWhatsAppDirectLink(order.cliente.telefono);

              return (
                <div
                  key={order.id}
                  className="p-4 rounded-3xl border border-stone-200 dark:border-stone-800 hover:border-amber-400 cursor-pointer space-y-3 bg-stone-50/50 dark:bg-stone-800/40 transition-all shadow-xs"
                  onClick={() => setSelectedOrderForModal(order)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xs text-stone-900 dark:text-stone-100">
                      L-{String(order.folio).padStart(3, "0")}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentStageObj.color}`}>
                      {currentStageObj.icon} {order.estado}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-black text-sm text-stone-950 dark:text-white">{order.cliente.nombre}</h4>
                    <p className="text-[11px] text-stone-400">{order.cliente.empresa || "Zona Jaguar"}</p>
                    <a
                      href={directWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono hover:underline inline-block mt-0.5"
                    >
                      {directWaUrl.replace("https://", "")}
                    </a>
                  </div>

                  {/* Options badge list */}
                  <div className="space-y-1 py-1.5 border-y border-stone-200/60 dark:border-stone-700/60">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">
                      {order.items.length} {order.items.length === 1 ? "Opción" : "Opciones"}:
                    </span>
                    <div className="space-y-0.5 text-xs text-stone-700 dark:text-stone-300">
                      {order.items.slice(0, 2).map((it, i) => (
                        <div key={i} className="flex justify-between items-center text-[11px]">
                          <span className="truncate max-w-[170px]">• {it.descripcion}</span>
                          <span className="font-mono font-bold">${(it.precioFinal || it.precioCalculado).toFixed(0)}</span>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <span className="text-[10px] text-stone-400">+{order.items.length - 2} opciones más</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs font-mono">
                    <div>
                      <span className="text-stone-400 block text-[10px]">TOTAL</span>
                      <span className="font-black text-stone-900 dark:text-white">${order.total}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-stone-400 block text-[10px]">SALDO</span>
                      <span className={`font-bold ${order.saldo <= 0 ? "text-emerald-500" : "text-amber-500"}`}>
                        {order.saldo <= 0 ? "Liquidado" : `$${order.saldo}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETALLE Y EDICIÓN COMPLETA DEL PEDIDO MODAL */}
      {selectedOrderForModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-[#0c182c] text-white rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto border border-blue-950">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-2 border-b border-blue-900/60">
              <div>
                <span className="text-[11px] font-mono font-black uppercase tracking-wider text-blue-400">
                  L-{String(selectedOrderForModal.folio).padStart(3, "0")} • {selectedOrderForModal.cliente.empresa || "ZONA JAGUAR"}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                  {selectedOrderForModal.cliente.nombre}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 mt-1">
                  <span>Entrega: {selectedOrderForModal.fechaEntregaEstimada}</span>
                  <span>•</span>
                  <a
                    href={getWhatsAppDirectLink(selectedOrderForModal.cliente.telefono)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline font-mono flex items-center gap-1 font-bold"
                  >
                    <Phone size={12} />
                    {getWhatsAppDirectLink(selectedOrderForModal.cliente.telefono)}
                  </a>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrderForModal(null)}
                className="w-8 h-8 rounded-full bg-blue-950/60 hover:bg-blue-900 text-stone-300 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* PIPELINE DE ETAPAS DEL PEDIDO (Interactive Stage Selector) */}
            <div className="space-y-2 p-4 rounded-2xl bg-[#14233c] border border-blue-900/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-400" />
                  Etapa Actual del Pedido
                </span>
                <span className="text-[11px] text-stone-400">Haz clic en cualquier etapa para cambiarla</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-1 scrollbar-thin">
                {ORDER_STAGES.map((stg) => {
                  const isActive = selectedOrderForModal.estado === stg.id;
                  return (
                    <button
                      key={stg.id}
                      type="button"
                      onClick={() => handleChangeStage(selectedOrderForModal.id, stg.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                        isActive
                          ? "bg-amber-500 text-stone-950 shadow-md ring-2 ring-amber-400"
                          : "bg-[#09101d] text-stone-400 hover:text-white border border-blue-950"
                      }`}
                    >
                      <span>{stg.icon}</span>
                      <span>{stg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stat Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#14233c] border border-blue-900/60 space-y-1">
                <span className="text-xs text-stone-400 block">Total acordado</span>
                <p className="text-2xl font-black font-mono text-white">
                  ${selectedOrderForModal.total.toFixed(2)}
                </p>
                {selectedOrderForModal.totalModificadoManualmente && (
                  <span className="text-[10px] text-amber-400 block">Modificado manualmente</span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[#14233c] border border-blue-900/60 space-y-1">
                <span className="text-xs text-stone-400 block">Saldo por cobrar</span>
                <p className={`text-2xl font-black font-mono ${selectedOrderForModal.saldo <= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  ${selectedOrderForModal.saldo.toFixed(2)}
                </p>
                <span className="text-[10px] text-stone-400 block">
                  {selectedOrderForModal.saldo <= 0 ? "100% cubierto" : `Anticipo recibido: $${selectedOrderForModal.anticipo.toFixed(2)}`}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#14233c] border border-blue-900/60 space-y-1">
                <span className="text-xs text-stone-400 block">Utilidad estimada</span>
                <p className="text-2xl font-black font-mono text-emerald-400">
                  ${(selectedOrderForModal.total - (selectedOrderForModal.costoTotalCalculado ?? selectedOrderForModal.items.reduce((s, it) => s + it.costoFinal, 0))).toFixed(2)}
                </p>
                <span className="text-[10px] text-stone-400 block">
                  Costo: ${(selectedOrderForModal.costoTotalCalculado ?? selectedOrderForModal.items.reduce((s, it) => s + it.costoFinal, 0)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* OPCIONES DEL PEDIDO (Múltiples opciones y calculadoras) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-stone-300 block">
                    OPCIONES / PRODUCTOS EN ESTE PEDIDO ({selectedOrderForModal.items.length})
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Puedes agregar tantas opciones como requiera la persona y calcular cada una.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAddOption("selected_order")}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus size={14} />
                  <span>Agregar opción</span>
                </button>
              </div>

              <div className="space-y-2">
                {selectedOrderForModal.items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-4 rounded-2xl bg-[#14233c] border border-blue-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-950 text-blue-300 font-bold text-[10px] flex items-center justify-center">
                          {index + 1}
                        </span>
                        <h5 className="font-bold text-sm text-white">{item.descripcion}</h5>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-stone-400 font-mono text-[11px] pl-7">
                        <span>Medidas: {item.ancho}m x {item.alto}m</span>
                        <span>•</span>
                        <span>Cant: {item.cantidad}</span>
                        <span>•</span>
                        <span className="text-blue-300 font-bold">{item.m2} m²</span>
                        {item.acabados?.ojillos && (
                          <span className="px-2 py-0.2 rounded-full bg-teal-500/20 text-teal-300 text-[10px]">
                            Ojillos ({item.acabados.ojillosCantidad || "std"})
                          </span>
                        )}
                        {item.acabados?.bastilla && (
                          <span className="px-2 py-0.2 rounded-full bg-teal-500/20 text-teal-300 text-[10px]">
                            Bastilla
                          </span>
                        )}
                        {item.estructuraInstalacion?.incluyeEstructura && (
                          <span className="px-2 py-0.2 rounded-full bg-orange-500/20 text-orange-300 text-[10px]">
                            {item.estructuraInstalacion.tipoEstructura || "Estructura"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-7 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-950">
                      <div className="text-right font-mono">
                        <span className="text-sm font-black text-amber-400 block">
                          ${(item.precioFinal || item.precioCalculado).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          Costo: ${(item.costoFinal || item.costoCalculado).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditOption("selected_order", item)}
                          className="p-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-stone-300"
                          title="Editar con Calculadora"
                        >
                          <Calculator size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateOption("selected_order", item)}
                          className="p-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-stone-300"
                          title="Duplicar opción"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOption("selected_order", item.id)}
                          className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300"
                          title="Eliminar opción"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AJUSTE MANUAL DEL COSTO Y PRECIO TOTAL */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300 block">
                    Costo Total y Cobro Final Acordado
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Puedes cambiar libremente el total final a cobrar al cliente y el costo total de producción.
                  </span>
                </div>
                <div className="text-right font-mono text-[11px] text-stone-400">
                  Suma calculada: ${(selectedOrderForModal.items.reduce((s, it) => s + (it.precioFinal || it.precioCalculado), 0)).toFixed(2)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Total Final Cobro */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-300 block">
                    Total Final a Cobrar ($)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={selectedOrderForModal.total}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      handleUpdateSelectedOrder({
                        total: val,
                        totalModificadoManualmente: true,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#09101d] border-2 border-amber-500 text-base font-black font-mono text-white mt-1"
                  />
                  {selectedOrderForModal.totalModificadoManualmente && (
                    <button
                      type="button"
                      onClick={() => {
                        const sum = selectedOrderForModal.items.reduce((s, it) => s + (it.precioFinal || it.precioCalculado), 0);
                        handleUpdateSelectedOrder({
                          total: sum,
                          totalModificadoManualmente: false,
                        });
                      }}
                      className="text-[10px] text-amber-400 hover:underline mt-1 block"
                    >
                      ↺ Restablecer a suma calculada
                    </button>
                  )}
                </div>

                {/* Costo Total */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-300 block">
                    Costo Total de Producción ($)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={selectedOrderForModal.costoTotalCalculado ?? selectedOrderForModal.items.reduce((s, it) => s + it.costoFinal, 0)}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      handleUpdateSelectedOrder({ costoTotalCalculado: val });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#09101d] border border-blue-900 text-base font-black font-mono text-white mt-1"
                  />
                </div>

                {/* Anticipo Recibido */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-300 block">
                    Anticipo Recibido ($)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={selectedOrderForModal.anticipo}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      handleUpdateSelectedOrder({ anticipo: val });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#09101d] border border-blue-900 text-base font-black font-mono text-white mt-1"
                  />
                  <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleUpdateSelectedOrder({ anticipo: 0 })}
                      className="text-stone-400 hover:text-white"
                    >
                      0%
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateSelectedOrder({ anticipo: Number((selectedOrderForModal.total * 0.5).toFixed(2)) })}
                      className="text-stone-400 hover:text-white"
                    >
                      50% (${(selectedOrderForModal.total * 0.5).toFixed(0)})
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateSelectedOrder({ anticipo: selectedOrderForModal.total })}
                      className="text-emerald-400 hover:text-emerald-300 font-bold"
                    >
                      100% Liquidar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN DE LINKS (Enlaces de diseño, Drive, bocetos, etc.) */}
            <div className="space-y-3 p-4 rounded-2xl bg-[#14233c] border border-blue-900/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#ffd15c] flex items-center gap-1.5">
                  <LinkIcon size={14} />
                  Enlaces del Pedido (Google Drive, Boceto, Canva, Referencias)
                </span>
                <span className="text-[10px] text-stone-400">
                  {(selectedOrderForModal.links || []).length} enlaces guardados
                </span>
              </div>

              {/* List of links */}
              <div className="space-y-2">
                {selectedOrderForModal.driveUrl && !(selectedOrderForModal.links || []).some((l) => l.url === selectedOrderForModal.driveUrl) && (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#09101d] border border-blue-950 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span>📁</span>
                      <a
                        href={selectedOrderForModal.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-300 hover:underline font-mono truncate"
                      >
                        Archivo Principal de Diseño en Google Drive
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={selectedOrderForModal.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-stone-200"
                        title="Abrir enlace"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                )}

                {(selectedOrderForModal.links || []).map((lnk) => (
                  <div
                    key={lnk.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#09101d] border border-blue-950 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{lnk.tipo === "drive" ? "📁" : "🔗"}</span>
                      <div className="truncate">
                        <span className="font-bold text-white block">{lnk.titulo}</span>
                        <a
                          href={lnk.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline font-mono text-[10px] truncate block"
                        >
                          {lnk.url}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={lnk.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-stone-200"
                        title="Abrir en pestaña nueva"
                      >
                        <ExternalLink size={13} />
                      </a>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(lnk.url);
                          playChime("tick");
                          setActionFeedback("Enlace copiado al portapapeles.");
                          setTimeout(() => setActionFeedback(null), 2500);
                        }}
                        className="p-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-stone-200"
                        title="Copiar enlace"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLink("selected_order", lnk.id)}
                        className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300"
                        title="Eliminar enlace"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add link form */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-blue-950">
                <input
                  type="text"
                  placeholder="Título (ej. Arte Canva, Boceto, Comprobante)"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  className="sm:col-span-5 px-3 py-2 rounded-xl bg-[#09101d] border border-blue-900 text-xs text-white"
                />
                <input
                  type="url"
                  placeholder="https://drive.google.com/... o enlace"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="sm:col-span-5 px-3 py-2 rounded-xl bg-[#09101d] border border-blue-900 text-xs text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleAddLink("selected_order")}
                  className="sm:col-span-2 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Plus size={14} />
                  <span>Agregar</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN DE SUBIR EJEMPLOS EN IMAGEN */}
            <div className="space-y-3 p-4 rounded-2xl bg-[#14233c] border border-blue-900/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-purple-400" />
                  Ejemplos e Imágenes del Pedido (Bocetos, Fachada, Muestras)
                </span>
                <label className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all">
                  <Upload size={14} />
                  <span>Subir imagen</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload("selected_order", e)}
                    className="hidden"
                  />
                </label>
              </div>

              {(selectedOrderForModal.imagenesEjemplo || []).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {selectedOrderForModal.imagenesEjemplo!.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-2xl overflow-hidden border border-blue-900/60 bg-[#09101d] aspect-video sm:aspect-square flex items-center justify-center cursor-pointer"
                      onClick={() => setActiveImageLightbox(img)}
                    >
                      <img
                        src={img.dataUrl}
                        alt={img.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <span className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/40">
                          <Eye size={16} />
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage("selected_order", img.id);
                          }}
                          className="p-1.5 rounded-lg bg-rose-600/80 text-white hover:bg-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-[10px] text-white truncate">
                        {img.nombre}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-dashed border-blue-900/60 bg-[#09101d]/50 text-center text-xs text-stone-400 space-y-1">
                  <p>No hay imágenes subidas aún para este pedido.</p>
                  <p className="text-[11px] text-stone-500">
                    Sube fotos de la fachada, muestras de color o bocetos de referencia en imagen.
                  </p>
                </div>
              )}
            </div>

            {/* SECCIÓN MANDAR WHATSAPP AL CLIENTE */}
            <div className="space-y-3 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center text-xs font-bold">
                    <Send size={13} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Mandar WhatsApp al Cliente ({selectedOrderForModal.cliente.nombre})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingWhatsAppText(!isEditingWhatsAppText)}
                  className="text-[11px] text-emerald-400 hover:underline font-bold"
                >
                  {isEditingWhatsAppText ? "Ocultar editor" : "Ver / Personalizar texto"}
                </button>
              </div>

              {isEditingWhatsAppText ? (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={whatsAppCustomText || buildStageWhatsAppMessage(selectedOrderForModal, selectedOrderForModal.estado)}
                    onChange={(e) => setWhatsAppCustomText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#09101d] border border-emerald-900 text-xs text-white font-mono"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-stone-400">
                      Destinatario: {getWhatsAppDirectLink(selectedOrderForModal.cliente.telefono)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppToClient(selectedOrderForModal, whatsAppCustomText)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <Send size={14} />
                      <span>Enviar por WhatsApp ahora</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="text-stone-300">
                    <p className="font-semibold">Mensaje predeterminado para la etapa: <strong className="text-white">{selectedOrderForModal.estado}</strong></p>
                    <p className="text-[11px] text-stone-400 mt-0.5 truncate max-w-md">
                      {buildStageWhatsAppMessage(selectedOrderForModal, selectedOrderForModal.estado).slice(0, 100)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppToClient(selectedOrderForModal)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <Send size={14} />
                      <span>Mandar WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-blue-950">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleDeleteOrder(selectedOrderForModal.id)}
                  className="px-3.5 py-2 rounded-2xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-bold transition-colors"
                >
                  Eliminar
                </button>

                <button
                  onClick={() => handleDownloadOrderPNG(selectedOrderForModal)}
                  className="px-3.5 py-2 rounded-2xl bg-white text-stone-900 hover:bg-stone-100 text-xs font-bold transition-colors"
                >
                  Ticket PNG
                </button>

                <button
                  onClick={() => {
                    handleSendToPrintStation(selectedOrderForModal);
                    setSelectedOrderForModal(null);
                  }}
                  className="px-4 py-2 rounded-2xl bg-amber-500 text-stone-950 hover:bg-amber-400 text-xs font-black transition-colors"
                >
                  🖨️ Mandar a PRINT
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMarkAsPaid(selectedOrderForModal)}
                  className="px-4 py-2 rounded-2xl bg-[#09101d] text-white hover:bg-[#121c2e] border border-blue-900 text-xs font-black transition-all"
                >
                  Marcar como pagado
                </button>
                <button
                  onClick={() => setSelectedOrderForModal(null)}
                  className="px-5 py-2 rounded-2xl bg-white text-stone-950 font-black text-xs hover:bg-stone-100 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVO PEDIDO (Con múltiples opciones y calculadoras) */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white dark:bg-stone-900 text-stone-900 dark:text-white rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto border border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h3 className="text-xl font-black tracking-tight">Nuevo Pedido de Lonas</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Agrega varias opciones a la misma persona, calcula los costos con exactitud y ajusta el cobro final.
                </p>
              </div>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-5 text-xs">
              {/* 1. Datos del Cliente */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block">
                  1. Datos del Cliente y Contacto
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-stone-500 uppercase text-[10px]">Nombre del Cliente *</label>
                    <input
                      type="text"
                      required
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Ej. Taller del Maestro, Laura Cortázar..."
                      className="w-full px-3 py-2 rounded-xl border mt-1 dark:bg-stone-900 dark:border-stone-700 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-500 uppercase text-[10px]">
                      Teléfono WhatsApp * (Usa https://wa.me/1)
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="9999011852"
                      className="w-full px-3 py-2 rounded-xl border mt-1 dark:bg-stone-900 dark:border-stone-700 font-mono"
                    />
                    {newClientPhone && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block truncate">
                        Link: {getWhatsAppDirectLink(newClientPhone)}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-stone-500 uppercase text-[10px]">Zona / Empresa</label>
                    <input
                      type="text"
                      value={newClientEmpresa}
                      onChange={(e) => setNewClientEmpresa(e.target.value)}
                      placeholder="Zona Jaguar"
                      className="w-full px-3 py-2 rounded-xl border mt-1 dark:bg-stone-900 dark:border-stone-700 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-bold text-stone-500 uppercase text-[10px]">Etapa Inicial del Pedido</label>
                    <select
                      value={newOrderStage}
                      onChange={(e) => setNewOrderStage(e.target.value as LonasStatus)}
                      className="w-full px-3 py-2 rounded-xl border mt-1 dark:bg-stone-900 dark:border-stone-700 font-bold"
                    >
                      {ORDER_STAGES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.icon} {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-stone-500 uppercase text-[10px]">Fecha Estimada de Entrega</label>
                    <input
                      type="text"
                      value={newFechaEntrega}
                      onChange={(e) => setNewFechaEntrega(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border mt-1 dark:bg-stone-900 dark:border-stone-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Opciones / Productos del Pedido */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block">
                      2. Opciones de Lona / Vinil en el Pedido ({newOrderItems.length})
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Calcula cada opción con medidas, acabados y estructura.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenAddOption("new_order")}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Plus size={14} />
                    <span>Agregar opción</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newOrderItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-[10px] flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-bold text-sm text-stone-950 dark:text-white">{item.descripcion}</span>
                        </div>
                        <div className="text-[11px] text-stone-400 font-mono pl-7">
                          {item.ancho}m x {item.alto}m • {item.m2} m² • Cantidad: {item.cantidad}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-7 sm:pl-0">
                        <div className="text-right font-mono">
                          <span className="text-sm font-black text-amber-600 dark:text-amber-400 block">
                            ${(item.precioFinal || item.precioCalculado).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            Costo: ${(item.costoFinal || item.costoCalculado).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditOption("new_order", item)}
                            className="p-1.5 rounded-lg border dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
                            title="Editar opción con Calculadora"
                          >
                            <Calculator size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateOption("new_order", item)}
                            className="p-1.5 rounded-lg border dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
                            title="Duplicar opción"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOption("new_order", item.id)}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100"
                            title="Eliminar opción"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Calculadoras Totales y Ajuste Manual */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                      3. Cobro Final Acordado y Anticipo
                    </span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">
                      Suma calculada: ${calcDraftTotals(newOrderItems).sumPrecio.toFixed(2)} (Costo prod: ${calcDraftTotals(newOrderItems).sumCosto.toFixed(2)})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold uppercase text-[10px] text-stone-700 dark:text-stone-300 block">
                      Total Final a Cobrar ($) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={newOrderTotalCustom !== null ? newOrderTotalCustom : calcDraftTotals(newOrderItems).sumPrecio}
                      onChange={(e) => setNewOrderTotalCustom(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border-2 border-amber-500 dark:border-amber-400 text-base font-black font-mono mt-1 dark:bg-stone-900"
                    />
                    {newOrderTotalCustom !== null && newOrderTotalCustom !== calcDraftTotals(newOrderItems).sumPrecio && (
                      <button
                        type="button"
                        onClick={() => setNewOrderTotalCustom(null)}
                        className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline mt-0.5 block"
                      >
                        ↺ Restablecer a suma calculada
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="font-bold uppercase text-[10px] text-stone-700 dark:text-stone-300 block">
                      Costo Total de Producción ($)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={newOrderCostoCustom !== null ? newOrderCostoCustom : calcDraftTotals(newOrderItems).sumCosto}
                      onChange={(e) => setNewOrderCostoCustom(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border mt-1 dark:bg-stone-900 dark:border-stone-700 text-base font-black font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold uppercase text-[10px] text-stone-700 dark:text-stone-300 block">
                      Anticipo Inicial ($)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={newOrderAnticipo}
                      onChange={(e) => setNewOrderAnticipo(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border mt-1 dark:bg-stone-900 dark:border-stone-700 text-base font-black font-mono"
                    />
                    <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setNewOrderAnticipo(0)}
                        className="text-stone-500 hover:text-stone-900"
                      >
                        $0
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          const tot = newOrderTotalCustom !== null ? newOrderTotalCustom : calcDraftTotals(newOrderItems).sumPrecio;
                          setNewOrderAnticipo(Number((tot * 0.5).toFixed(0)));
                        }}
                        className="text-stone-500 hover:text-stone-900"
                      >
                        50%
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          const tot = newOrderTotalCustom !== null ? newOrderTotalCustom : calcDraftTotals(newOrderItems).sumPrecio;
                          setNewOrderAnticipo(tot);
                        }}
                        className="text-emerald-600 dark:text-emerald-400 font-bold"
                      >
                        100%
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Enlaces & Imágenes */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 block">
                  4. Enlaces y Archivo de Diseño en Drive
                </span>
                <div>
                  <label className="font-bold text-stone-500 uppercase text-[10px]">
                    Link de Google Drive del diseño (opcional)
                  </label>
                  <input
                    type="url"
                    value={newOrderDriveUrl}
                    onChange={(e) => setNewOrderDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... (vinculación automática)"
                    className="w-full px-3 py-2 rounded-xl border mt-1 font-mono text-xs dark:bg-stone-900 dark:border-stone-700"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border font-bold hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950 font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Check size={16} />
                  <span>Guardar Pedido Completo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OPTION CALCULATOR MODAL (Calculadoras de área, acabados y estructura) */}
      {optionCalculatorOpen && (
        <OptionCalculatorModal
          initialItem={editingOptionItem || undefined}
          onSave={handleSaveOptionItem}
          onClose={() => {
            setOptionCalculatorOpen(false);
            setEditingOptionItem(null);
          }}
        />
      )}

      {/* LIGHTBOX PREVIEW MODAL FOR IMAGES */}
      {activeImageLightbox && (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setActiveImageLightbox(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-[#0c182c] rounded-3xl overflow-hidden p-4 space-y-3 border border-blue-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-white text-xs">
              <span className="font-bold truncate">{activeImageLightbox.nombre}</span>
              <div className="flex items-center gap-2">
                <a
                  href={activeImageLightbox.dataUrl}
                  download={activeImageLightbox.nombre || "ejemplo-lona.png"}
                  className="p-1.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-stone-200 flex items-center gap-1"
                >
                  <Download size={14} />
                  <span>Descargar</span>
                </a>
                <button
                  onClick={() => setActiveImageLightbox(null)}
                  className="p-1.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-stone-300"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center rounded-2xl bg-black/40">
              <img
                src={activeImageLightbox.dataUrl}
                alt={activeImageLightbox.nombre}
                className="max-w-full max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
