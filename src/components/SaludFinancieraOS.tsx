import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  DollarSign,
  AlertTriangle,
  Calendar,
  CreditCard,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  TrendingDown,
  TrendingUp,
  HelpCircle,
  X,
  Play,
  Check,
  Building,
  Banknote,
  PiggyBank,
  Smartphone,
  RefreshCw,
  Printer,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Search,
  ExternalLink,
  Download,
  Trash2,
  Edit2,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  Tag,
  Share2,
  FileText,
  Info,
} from "lucide-react";
import {
  FinancialAccount,
  FinancialExpense,
  FinancialIncomeItem,
  FinancialDebt,
  FinancialFixedExpenseConfig,
  PaymentMethodType,
  ExpenseType,
  PrintItem,
} from "../types";
import { playChime } from "../utils/audio";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
  PieChart,
  Pie,
} from "recharts";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { createCalendarEvent } from "../lib/googleWorkspace";

const STORAGE_KEY_FINANZAS_ACCOUNTS = "task_os_finanzas_accounts_v2";
const STORAGE_KEY_FINANZAS_EXPENSES = "task_os_finanzas_expenses_v2";
const STORAGE_KEY_FINANZAS_INCOMES = "task_os_finanzas_incomes_v2";
const STORAGE_KEY_FINANZAS_DEBTS = "task_os_finanzas_debts_v2";
const STORAGE_KEY_FINANZAS_FIXED = "task_os_finanzas_fixed_v2";

const INITIAL_ACCOUNTS: FinancialAccount[] = [
  { id: "acc-1", nombre: "Cuentas Bancarias / Tarjeta", tipo: "Cuenta Bancaria", saldoActual: 8450 },
  { id: "acc-2", nombre: "Efectivo Caja Taller", tipo: "Efectivo", saldoActual: 3200 },
];

const INITIAL_EXPENSES: FinancialExpense[] = [
  {
    id: "exp-1",
    fecha: new Date().toISOString().slice(0, 8) + "05",
    articulo: "Renta Taller Lonas y Producción",
    tipo: "Fijo",
    referencia: "REC-RENTA-09",
    metodo: "Transferencia",
    monto: 6500,
    categoria: "Renta",
    notas: "Pago mensual de arrendamiento taller",
  },
  {
    id: "exp-2",
    fecha: new Date().toISOString().slice(0, 8) + "12",
    articulo: "Rollo de lona front 13oz 3.20x50m",
    tipo: "Variable",
    referencia: "FAC-ROL-8812",
    metodo: "Tarjeta",
    monto: 2450,
    categoria: "Materiales Lonas",
    notas: "Insumos para pedidos de eventos",
  },
  {
    id: "exp-3",
    fecha: new Date().toISOString().slice(0, 8) + "15",
    articulo: "Servicio de Internet y Telefonía Telcel",
    tipo: "Fijo",
    referencia: "TEL-SEP-26",
    metodo: "Tarjeta",
    monto: 1200,
    categoria: "Servicios",
    notas: "Conexión taller y líneas de atención",
  },
  {
    id: "exp-4",
    fecha: new Date().toISOString().slice(0, 8) + "18",
    articulo: "Alimentos y despensa del día",
    tipo: "Variable",
    referencia: "Ticket de caja",
    metodo: "Efectivo",
    monto: 380,
    categoria: "Alimentos",
    notas: "Comida diaria del equipo",
  },
  {
    id: "exp-5",
    fecha: new Date().toISOString().slice(0, 8) + "22",
    articulo: "Ojillos metálicos y cinta bifaz reforzada",
    tipo: "Variable",
    referencia: "TICKET-FERR-441",
    metodo: "Efectivo",
    monto: 420,
    categoria: "Materiales Lonas",
    notas: "Acabados de lonas",
  },
];

const INITIAL_INCOMES: FinancialIncomeItem[] = [
  {
    id: "inc-1",
    fecha: new Date().toISOString().slice(0, 8) + "08",
    articulo: "Lona Gran Formato 3x2m Evento Molas",
    monto: 4500,
    tipo: "Venta",
    categoria: "Clientes Lonas",
    metodo: "Transferencia",
    referencia: "TRF-MOLAS-01",
    estado: "Recibido",
    notas: "Liquidación cliente Molas",
  },
  {
    id: "inc-2",
    fecha: new Date().toISOString().slice(0, 8) + "14",
    articulo: "Anticipo 50% Rotulación y Bastidor",
    monto: 3200,
    tipo: "Anticipo",
    categoria: "Clientes Lonas",
    metodo: "Efectivo",
    referencia: "FOL-LON-104",
    estado: "Recibido",
    notas: "Anticipo en efectivo en taller",
  },
  {
    id: "inc-3",
    fecha: new Date().toISOString().slice(0, 8) + "28",
    articulo: "Cobro pendiente MEDS SPEEDY",
    monto: 5000,
    tipo: "Cobro",
    categoria: "Comercial",
    metodo: "Transferencia",
    referencia: "FAC-MEDS-26",
    estado: "Esperado",
    notas: "Por cobrar a fin de mes",
  },
  {
    id: "inc-4",
    fecha: new Date().toISOString().slice(0, 8) + "30",
    articulo: "Pedido Reconocimientos y Playeras",
    monto: 3500,
    tipo: "Servicios",
    categoria: "Servicios",
    metodo: "Transferencia",
    referencia: "REQ-DIP-89",
    estado: "Esperado",
    notas: "Diplomas cohorte",
  },
];

const INITIAL_FIXED_CONFIGS: FinancialFixedExpenseConfig[] = [
  {
    id: "fix-renta",
    concepto: "Renta Taller y Oficinas",
    monto: 6500,
    diaVencimiento: 5,
    categoria: "Renta",
    metodo: "Transferencia",
    referencia: "Arrendamiento mensual",
    activo: true,
  },
  {
    id: "fix-telcel",
    concepto: "Internet y Telefonía Telcel",
    monto: 1200,
    diaVencimiento: 15,
    categoria: "Servicios",
    metodo: "Tarjeta",
    referencia: "Línea Telcel Taller",
    activo: true,
  },
  {
    id: "fix-luz",
    concepto: "Luz CFE Taller",
    monto: 1850,
    diaVencimiento: 20,
    categoria: "Servicios",
    metodo: "Efectivo",
    referencia: "Recibo CFE",
    activo: true,
  },
  {
    id: "fix-software",
    concepto: "Suscripciones Software y Hosting",
    monto: 650,
    diaVencimiento: 28,
    categoria: "Tecnología",
    metodo: "Tarjeta",
    referencia: "Nube y Dominios",
    activo: true,
  },
];

const INITIAL_DEBTS: FinancialDebt[] = [
  {
    id: "deb-mp",
    acreedor: "Mercado Pago",
    concepto: "Línea de crédito / Terminal Taller",
    montoOriginal: 3500,
    saldoActual: 1683,
    vencimiento: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    pagoMinimo: 850,
    prioridad: "Alta",
    estado: "Activa",
    notas: "Pago mensual de capital e intereses",
    historialPagos: [
      {
        id: "pay-mp-1",
        fecha: new Date(Date.now() - 25 * 86400000).toISOString().slice(0, 10),
        monto: 1817,
        metodo: "Tarjeta",
        referencia: "TRF-ABONO-01",
        nota: "Abono anterior",
      },
    ],
  },
  {
    id: "deb-telcel",
    acreedor: "Telcel Equipos",
    concepto: "Financiamiento terminales móviles",
    montoOriginal: 6000,
    saldoActual: 3000,
    vencimiento: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10),
    pagoMinimo: 1500,
    prioridad: "Alta",
    estado: "Activa",
    notas: "Plan de renovación",
    historialPagos: [
      {
        id: "pay-tel-1",
        fecha: new Date(Date.now() - 22 * 86400000).toISOString().slice(0, 10),
        monto: 3000,
        metodo: "Tarjeta",
        referencia: "CARGO-AUT-TEL",
        nota: "Primer abono",
      },
    ],
  },
  {
    id: "deb-proveedor",
    acreedor: "Proveedor Rollos e Insumos",
    concepto: "Lonas front y tintas solventes",
    montoOriginal: 22000,
    saldoActual: 14500,
    vencimiento: new Date(Date.now() + 18 * 86400000).toISOString().slice(0, 10),
    pagoMinimo: 3500,
    prioridad: "Media",
    estado: "Activa",
    notas: "Crédito a 30 días para rollos de lona",
    historialPagos: [
      {
        id: "pay-prov-1",
        fecha: new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10),
        monto: 7500,
        metodo: "Transferencia",
        referencia: "BBVA-7782",
        nota: "Anticipo a cuenta",
      },
    ],
  },
];

const CATEGORIAS_GASTO = [
  "Renta",
  "Servicios",
  "Materiales Lonas",
  "Alimentos",
  "Transporte",
  "Nómina / Honorarios",
  "Tecnología",
  "Mantenimiento",
  "Personal",
  "Otro",
];

const CATEGORIAS_INGRESO = [
  "Clientes Lonas",
  "Comercial",
  "Servicios",
  "Sueldo",
  "Honorarios",
  "Reembolso",
  "Otro",
];

interface SaludFinancieraOSProps {
  userEmail: string;
  onSendToPrint?: (printItem: PrintItem) => void;
  onNavigateToLonas?: () => void;
}

export default function SaludFinancieraOS({
  userEmail,
  onSendToPrint,
  onNavigateToLonas,
}: SaludFinancieraOSProps) {
  // Pestañas principales de Salud Financiera
  const [activeTab, setActiveTab] = useState<
    "resumen" | "gastos" | "ingresos" | "deudas" | "fijos_variables" | "calendario" | "estadisticas"
  >("resumen");

  // Estado de Cuentas / Fondos
  const [accounts, setAccounts] = useState<FinancialAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_ACCOUNTS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_ACCOUNTS;
  });

  // Estado de Gastos (Fijos y Variables)
  const [expenses, setExpenses] = useState<FinancialExpense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_EXPENSES);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_EXPENSES;
  });

  // Estado de Ingresos
  const [incomes, setIncomes] = useState<FinancialIncomeItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_INCOMES);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_INCOMES;
  });

  // Estado de Deudas
  const [debts, setDebts] = useState<FinancialDebt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_DEBTS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_DEBTS;
  });

  // Estado de Gastos Fijos (Plantillas recurrentes)
  const [fixedConfigs, setFixedConfigs] = useState<FinancialFixedExpenseConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FINANZAS_FIXED);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_FIXED_CONFIGS;
  });

  // Estados de Modales de Acción
  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false);
  const [isIngresoModalOpen, setIsIngresoModalOpen] = useState(false);
  const [isDeudaModalOpen, setIsDeudaModalOpen] = useState(false);
  const [isPagarDeudaModalOpen, setIsPagarDeudaModalOpen] = useState(false);
  const [isFixedConfigModalOpen, setIsFixedConfigModalOpen] = useState(false);
  const [selectedDebtToPay, setSelectedDebtToPay] = useState<FinancialDebt | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Filtros de Gastos
  const [gastoFilterTipo, setGastoFilterTipo] = useState<"todos" | "Fijo" | "Variable">("todos");
  const [gastoFilterMetodo, setGastoFilterMetodo] = useState<"todos" | "Efectivo" | "Tarjeta" | "Transferencia">("todos");
  const [gastoSearchQuery, setGastoSearchQuery] = useState("");

  // Filtros de Ingresos
  const [ingresoFilterEstado, setIngresoFilterEstado] = useState<"todos" | "Recibido" | "Esperado">("todos");
  const [ingresoSearchQuery, setIngresoSearchQuery] = useState("");

  // Formulario de Gasto
  const [formGastoFecha, setFormGastoFecha] = useState(new Date().toISOString().slice(0, 10));
  const [formGastoArticulo, setFormGastoArticulo] = useState("");
  const [formGastoTipo, setFormGastoTipo] = useState<ExpenseType>("Variable");
  const [formGastoReferencia, setFormGastoReferencia] = useState("");
  const [formGastoMetodo, setFormGastoMetodo] = useState<PaymentMethodType>("Efectivo");
  const [formGastoMonto, setFormGastoMonto] = useState<number>(150);
  const [formGastoCategoria, setFormGastoCategoria] = useState("Materiales Lonas");
  const [formGastoNotas, setFormGastoNotas] = useState("");

  // Formulario de Ingreso
  const [formIngresoFecha, setFormIngresoFecha] = useState(new Date().toISOString().slice(0, 10));
  const [formIngresoArticulo, setFormIngresoArticulo] = useState("");
  const [formIngresoMonto, setFormIngresoMonto] = useState<number>(1000);
  const [formIngresoCategoria, setFormIngresoCategoria] = useState("Clientes Lonas");
  const [formIngresoMetodo, setFormIngresoMetodo] = useState<PaymentMethodType>("Efectivo");
  const [formIngresoReferencia, setFormIngresoReferencia] = useState("");
  const [formIngresoNotas, setFormIngresoNotas] = useState("");
  const [formIngresoEstado, setFormIngresoEstado] = useState<"Recibido" | "Esperado">("Recibido");

  // Formulario de Pago de Deuda (Abono)
  const [pagoDeudaMonto, setPagoDeudaMonto] = useState<number>(0);
  const [pagoDeudaFecha, setPagoDeudaFecha] = useState(new Date().toISOString().slice(0, 10));
  const [pagoDeudaMetodo, setPagoDeudaMetodo] = useState<PaymentMethodType>("Tarjeta");
  const [pagoDeudaReferencia, setPagoDeudaReferencia] = useState("");
  const [pagoDeudaRegistrarGasto, setPagoDeudaRegistrarGasto] = useState(true);
  const [pagoDeudaMandarPrint, setPagoDeudaMandarPrint] = useState(false);

  // Formulario de Nueva / Edición Deuda
  const [editingDebt, setEditingDebt] = useState<FinancialDebt | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<FinancialDebt | null>(null);
  const [formDeudaAcreedor, setFormDeudaAcreedor] = useState("");
  const [formDeudaConcepto, setFormDeudaConcepto] = useState("");
  const [formDeudaMontoOriginal, setFormDeudaMontoOriginal] = useState<number>(5000);
  const [formDeudaSaldoActual, setFormDeudaSaldoActual] = useState<number>(5000);
  const [formDeudaVencimiento, setFormDeudaVencimiento] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
  );
  const [formDeudaPagoMinimo, setFormDeudaPagoMinimo] = useState<number>(1000);
  const [formDeudaPrioridad, setFormDeudaPrioridad] = useState<"Alta" | "Media" | "Baja">("Alta");
  const [formDeudaEstado, setFormDeudaEstado] = useState<"Activa" | "Liquidada">("Activa");
  const [formDeudaNotas, setFormDeudaNotas] = useState("");

  // Formulario de Gasto Fijo Recurrente
  const [formFixedConcepto, setFormFixedConcepto] = useState("");
  const [formFixedMonto, setFormFixedMonto] = useState<number>(1000);
  const [formFixedDia, setFormFixedDia] = useState<number>(15);
  const [formFixedCategoria, setFormFixedCategoria] = useState("Servicios");
  const [formFixedMetodo, setFormFixedMetodo] = useState<PaymentMethodType>("Tarjeta");
  const [formFixedReferencia, setFormFixedReferencia] = useState("");

  // Sincronización en LocalStorage y Firestore Cloud
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FINANZAS_ACCOUNTS, JSON.stringify(accounts));
      localStorage.setItem(STORAGE_KEY_FINANZAS_EXPENSES, JSON.stringify(expenses));
      localStorage.setItem(STORAGE_KEY_FINANZAS_INCOMES, JSON.stringify(incomes));
      localStorage.setItem(STORAGE_KEY_FINANZAS_DEBTS, JSON.stringify(debts));
      localStorage.setItem(STORAGE_KEY_FINANZAS_FIXED, JSON.stringify(fixedConfigs));
    } catch (_) {}
  }, [accounts, expenses, incomes, debts, fixedConfigs]);

  // Firestore Snapshot Listeners (opcional / tiempo real)
  useEffect(() => {
    try {
      const unsubExp = onSnapshot(collection(db, "finanzas_gastos"), (snap) => {
        if (!snap.empty) {
          const list: FinancialExpense[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as FinancialExpense), id: d.id }));
          if (list.length > 0) {
            setExpenses((prev) => {
              const ids = new Set(list.map((l) => l.id));
              const merged = [...list, ...prev.filter((p) => !ids.has(p.id))];
              return merged.sort((a, b) => b.fecha.localeCompare(a.fecha));
            });
          }
        }
      });

      const unsubInc = onSnapshot(collection(db, "finanzas_ingresos"), (snap) => {
        if (!snap.empty) {
          const list: FinancialIncomeItem[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as FinancialIncomeItem), id: d.id }));
          if (list.length > 0) {
            setIncomes((prev) => {
              const ids = new Set(list.map((l) => l.id));
              const merged = [...list, ...prev.filter((p) => !ids.has(p.id))];
              return merged.sort((a, b) => b.fecha.localeCompare(a.fecha));
            });
          }
        }
      });

      const unsubDeb = onSnapshot(collection(db, "finanzas_deudas"), (snap) => {
        if (!snap.empty) {
          const list: FinancialDebt[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as FinancialDebt), id: d.id }));
          if (list.length > 0) {
            setDebts((prev) => {
              const ids = new Set(list.map((l) => l.id));
              return [...list, ...prev.filter((p) => !ids.has(p.id))];
            });
          }
        }
      });

      return () => {
        unsubExp();
        unsubInc();
        unsubDeb();
      };
    } catch (err) {
      console.warn("Notice in finanzas firestore snapshot:", err);
    }
  }, []);

  // CÁLCULOS FINANCIEROS CLAVE
  const saldoTotalCuentas = useMemo(() => {
    return accounts.reduce((sum, a) => sum + (Number(a.saldoActual) || 0), 0);
  }, [accounts]);

  const totalGastos = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.monto) || 0), 0);
  }, [expenses]);

  const totalGastosFijos = useMemo(() => {
    return expenses
      .filter((e) => e.tipo === "Fijo")
      .reduce((sum, e) => sum + (Number(e.monto) || 0), 0);
  }, [expenses]);

  const totalGastosVariables = useMemo(() => {
    return expenses
      .filter((e) => e.tipo === "Variable")
      .reduce((sum, e) => sum + (Number(e.monto) || 0), 0);
  }, [expenses]);

  const totalIngresosRecibidos = useMemo(() => {
    return incomes
      .filter((i) => i.estado === "Recibido")
      .reduce((sum, i) => sum + (Number(i.monto) || 0), 0);
  }, [incomes]);

  const totalIngresosEsperados = useMemo(() => {
    return incomes
      .filter((i) => i.estado === "Esperado")
      .reduce((sum, i) => sum + (Number(i.monto) || 0), 0);
  }, [incomes]);

  const deudaTotalActiva = useMemo(() => {
    return debts
      .filter((d) => d.estado === "Activa")
      .reduce((sum, d) => sum + (Number(d.saldoActual) || 0), 0);
  }, [debts]);

  const deudaTotalOriginal = useMemo(() => {
    return debts.reduce((sum, d) => sum + (Number(d.montoOriginal) || 0), 0);
  }, [debts]);

  const deudaTotalPagada = useMemo(() => {
    return debts.reduce((sum, d) => {
      const pagado = Math.max(0, (Number(d.montoOriginal) || 0) - (Number(d.saldoActual) || 0));
      return sum + pagado;
    }, 0);
  }, [debts]);

  const porcentajeDeudaPagada = useMemo(() => {
    if (deudaTotalOriginal <= 0) return 100;
    return Math.min(100, Math.round((deudaTotalPagada / deudaTotalOriginal) * 100));
  }, [deudaTotalPagada, deudaTotalOriginal]);

  const balanceNeto = useMemo(() => {
    return totalIngresosRecibidos - totalGastos;
  }, [totalIngresosRecibidos, totalGastos]);

  // Presupuesto mensual de gastos fijos configurados
  const presupuestoFijoMensual = useMemo(() => {
    return fixedConfigs
      .filter((f) => f.activo)
      .reduce((sum, f) => sum + (Number(f.monto) || 0), 0);
  }, [fixedConfigs]);

  // Diagnóstico de Salud Financiera
  const diagnosticoSalud = useMemo(() => {
    if (balanceNeto > 2000 && deudaTotalActiva < 10000) {
      return {
        nivel: "Excelente",
        color: "text-emerald-600 dark:text-emerald-400",
        badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
        mensaje: "Tu balance es positivo y el endeudamiento está controlado. Continúa aportando a reservas.",
      };
    } else if (balanceNeto >= 0) {
      return {
        nivel: "Estable / Moderado",
        color: "text-blue-600 dark:text-blue-400",
        badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
        mensaje: "Ingresos cubren los gastos. Prioriza amortizar deudas con interés antes de gastos variables.",
      };
    } else {
      return {
        nivel: "Atención Requerida",
        color: "text-rose-600 dark:text-rose-400",
        badge: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
        mensaje: "Los gastos superan los ingresos recibidos. Reduce gastos variables y activa cobranza pendiente.",
      };
    }
  }, [balanceNeto, deudaTotalActiva]);

  // FILTRADO DE GASTOS
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (gastoFilterTipo !== "todos" && e.tipo !== gastoFilterTipo) return false;
      if (gastoFilterMetodo !== "todos" && e.metodo !== gastoFilterMetodo) return false;
      if (gastoSearchQuery.trim()) {
        const q = gastoSearchQuery.toLowerCase().trim();
        const matchArt = e.articulo.toLowerCase().includes(q);
        const matchRef = e.referencia.toLowerCase().includes(q);
        const matchCat = e.categoria.toLowerCase().includes(q);
        const matchNot = (e.notas || "").toLowerCase().includes(q);
        if (!matchArt && !matchRef && !matchCat && !matchNot) return false;
      }
      return true;
    });
  }, [expenses, gastoFilterTipo, gastoFilterMetodo, gastoSearchQuery]);

  // FILTRADO DE INGRESOS
  const filteredIncomes = useMemo(() => {
    return incomes.filter((i) => {
      if (ingresoFilterEstado !== "todos" && i.estado !== ingresoFilterEstado) return false;
      if (ingresoSearchQuery.trim()) {
        const q = ingresoSearchQuery.toLowerCase().trim();
        const matchArt = i.articulo.toLowerCase().includes(q);
        const matchRef = i.referencia.toLowerCase().includes(q);
        const matchCat = i.categoria.toLowerCase().includes(q);
        if (!matchArt && !matchRef && !matchCat) return false;
      }
      return true;
    });
  }, [incomes, ingresoFilterEstado, ingresoSearchQuery]);

  // EVENTOS DEL CALENDARIO DE PAGOS
  const paymentCalendarEvents = useMemo(() => {
    const events: Array<{
      id: string;
      tipo: "deuda" | "fijo" | "ingreso";
      titulo: string;
      descripcion: string;
      monto: number;
      fecha: string;
      metodo?: string;
      prioridad?: string;
      diasRestantes: number;
      estadoVencimiento: "vencido" | "hoy" | "proximo" | "futuro";
      rawObj: any;
    }> = [];

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayMs = new Date(todayStr + "T00:00:00").getTime();

    // 1. Deudas Activas
    debts
      .filter((d) => d.estado === "Activa" && d.vencimiento)
      .forEach((d) => {
        const dMs = new Date(d.vencimiento + "T00:00:00").getTime();
        const diffDays = Math.round((dMs - todayMs) / 86400000);
        let status: "vencido" | "hoy" | "proximo" | "futuro" = "futuro";
        if (diffDays < 0) status = "vencido";
        else if (diffDays === 0) status = "hoy";
        else if (diffDays <= 7) status = "proximo";

        events.push({
          id: `cal-deb-${d.id}`,
          tipo: "deuda",
          titulo: `Pago de Deuda: ${d.acreedor}`,
          descripcion: `Vencimiento de deuda (${d.concepto}). Pago mínimo / saldo: $${d.saldoActual}.`,
          monto: d.pagoMinimo || d.saldoActual,
          fecha: d.vencimiento,
          prioridad: d.prioridad,
          diasRestantes: diffDays,
          estadoVencimiento: status,
          rawObj: d,
        });
      });

    // 2. Gastos Fijos Configurados para este mes
    const currYearMonth = new Date().toISOString().slice(0, 7);
    fixedConfigs
      .filter((f) => f.activo)
      .forEach((f) => {
        const dayStr = String(f.diaVencimiento).padStart(2, "0");
        const dueDate = `${currYearMonth}-${dayStr}`;
        const dMs = new Date(dueDate + "T00:00:00").getTime();
        const diffDays = Math.round((dMs - todayMs) / 86400000);
        let status: "vencido" | "hoy" | "proximo" | "futuro" = "futuro";
        if (diffDays < 0) status = "vencido";
        else if (diffDays === 0) status = "hoy";
        else if (diffDays <= 7) status = "proximo";

        events.push({
          id: `cal-fix-${f.id}`,
          tipo: "fijo",
          titulo: `Gasto Fijo: ${f.concepto}`,
          descripcion: `Gasto fijo recurrente mensual (${f.categoria}) por $${f.monto}.`,
          monto: f.monto,
          fecha: dueDate,
          metodo: f.metodo,
          diasRestantes: diffDays,
          estadoVencimiento: status,
          rawObj: f,
        });
      });

    // 3. Ingresos Esperados
    incomes
      .filter((i) => i.estado === "Esperado")
      .forEach((i) => {
        const dMs = new Date(i.fecha + "T00:00:00").getTime();
        const diffDays = Math.round((dMs - todayMs) / 86400000);
        let status: "vencido" | "hoy" | "proximo" | "futuro" = "futuro";
        if (diffDays < 0) status = "vencido";
        else if (diffDays === 0) status = "hoy";
        else if (diffDays <= 7) status = "proximo";

        events.push({
          id: `cal-inc-${i.id}`,
          tipo: "ingreso",
          titulo: `Cobro Esperado: ${i.articulo}`,
          descripcion: `Ingreso esperado por cobrar (${i.categoria}) por $${i.monto}.`,
          monto: i.monto,
          fecha: i.fecha,
          metodo: i.metodo,
          diasRestantes: diffDays,
          estadoVencimiento: status,
          rawObj: i,
        });
      });

    // Ordenar por fecha cronológica ascendente
    return events.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [debts, fixedConfigs, incomes]);

  // HELPER: Generar URL oficial para agregar evento a Google Calendar web
  const buildGoogleCalendarWebUrl = (summary: string, description: string, date: string) => {
    const cleanDate = date.replace(/-/g, "");
    const nextDateObj = new Date(date + "T00:00:00");
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const nextDate = nextDateObj.toISOString().slice(0, 10).replace(/-/g, "");

    const text = encodeURIComponent(`💰 Salud Financiera: ${summary}`);
    const details = encodeURIComponent(
      `${description}\n\nProgramado desde Task-OS • Mi Salud Financiera.\nFecha requerida: ${date}`
    );
    const dates = `${cleanDate}/${nextDate}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
  };

  // HELPER: Sincronizar evento directamente con Google Calendar API si hay token
  const handleSyncToGoogleCalendarApi = async (ev: {
    titulo: string;
    descripcion: string;
    fecha: string;
  }) => {
    const token = localStorage.getItem("google_access_token");
    if (!token) {
      // Si no hay token de Google Workspace directo, abre Google Calendar con los datos cargados
      const url = buildGoogleCalendarWebUrl(ev.titulo, ev.descripcion, ev.fecha);
      window.open(url, "_blank");
      playChime("tick");
      setActionFeedback("Abriendo Google Calendar con los datos precargados...");
      setTimeout(() => setActionFeedback(null), 3500);
      return;
    }

    try {
      await createCalendarEvent(token, {
        summary: `💰 ${ev.titulo}`,
        description: ev.descripcion,
        date: ev.fecha,
      });
      playChime("success");
      setActionFeedback(`¡Evento sincronizado con tu Google Calendar exitosamente!`);
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (err) {
      console.warn("Notice syncing with Google Calendar API, opening web fallback:", err);
      const url = buildGoogleCalendarWebUrl(ev.titulo, ev.descripcion, ev.fecha);
      window.open(url, "_blank");
    }
  };

  // HELPER: Descargar archivo .ICS para importar todos los pagos a Google Calendar
  const handleDownloadICS = () => {
    if (paymentCalendarEvents.length === 0) {
      alert("No hay pagos pendientes para exportar al calendario.");
      return;
    }

    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Task-OS//Salud Financiera//ES\nCALSCALE:GREGORIAN\n";
    paymentCalendarEvents.forEach((ev, i) => {
      const cleanDate = ev.fecha.replace(/-/g, "");
      ics += "BEGIN:VEVENT\n";
      ics += `UID:finanzas-${i}-${cleanDate}@taskos.fgdll\n`;
      ics += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z\n`;
      ics += `DTSTART;VALUE=DATE:${cleanDate}\n`;
      ics += `SUMMARY:💰 ${ev.titulo} ($${ev.monto})\n`;
      ics += `DESCRIPTION:${ev.descripcion.replace(/\n/g, "\\n")}\n`;
      ics += "STATUS:CONFIRMED\n";
      ics += "END:VEVENT\n";
    });
    ics += "END:VCALENDAR";

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `calendario_pagos_${new Date().toISOString().slice(0, 10)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    playChime("success");
  };

  // HANDLER: AGREGAR GASTO
  const handleSaveGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGastoArticulo.trim() || formGastoMonto <= 0) return;

    const newExpense: FinancialExpense = {
      id: `exp-${Date.now()}`,
      fecha: formGastoFecha,
      articulo: formGastoArticulo.trim(),
      tipo: formGastoTipo,
      referencia: formGastoReferencia.trim() || "S/Ref",
      metodo: formGastoMetodo,
      monto: Number(formGastoMonto),
      categoria: formGastoCategoria,
      notas: formGastoNotas.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    // Actualizar estado local
    setExpenses((prev) => [newExpense, ...prev]);

    // Descontar saldo de la cuenta correspondiente
    setAccounts((prev) =>
      prev.map((acc) => {
        if (formGastoMetodo === "Efectivo" && acc.tipo === "Efectivo") {
          return { ...acc, saldoActual: acc.saldoActual - formGastoMonto };
        }
        if (formGastoMetodo !== "Efectivo" && acc.tipo !== "Efectivo") {
          return { ...acc, saldoActual: acc.saldoActual - formGastoMonto };
        }
        return acc;
      })
    );

    // Guardar en Firestore
    try {
      await setDoc(doc(db, "finanzas_gastos", newExpense.id), newExpense);
    } catch (_) {}

    setIsGastoModalOpen(false);
    playChime("tick");
    setActionFeedback(`Gasto de $${formGastoMonto} (${formGastoTipo}) registrado con éxito.`);
    setTimeout(() => setActionFeedback(null), 3000);

    // Reset form
    setFormGastoArticulo("");
    setFormGastoReferencia("");
    setFormGastoNotas("");
  };

  // HANDLER: AGREGAR INGRESO
  const handleSaveIngreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIngresoArticulo.trim() || formIngresoMonto <= 0) return;

    const newIncome: FinancialIncomeItem = {
      id: `inc-${Date.now()}`,
      fecha: formIngresoFecha,
      articulo: formIngresoArticulo.trim(),
      monto: Number(formIngresoMonto),
      categoria: formIngresoCategoria,
      metodo: formIngresoMetodo,
      referencia: formIngresoReferencia.trim() || "S/Ref",
      notas: formIngresoNotas.trim() || undefined,
      estado: formIngresoEstado,
      createdAt: new Date().toISOString(),
    };

    setIncomes((prev) => [newIncome, ...prev]);

    // Si ya está recibido, sumar al saldo de cuentas
    if (formIngresoEstado === "Recibido") {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (formIngresoMetodo === "Efectivo" && acc.tipo === "Efectivo") {
            return { ...acc, saldoActual: acc.saldoActual + formIngresoMonto };
          }
          if (formIngresoMetodo !== "Efectivo" && acc.tipo !== "Efectivo") {
            return { ...acc, saldoActual: acc.saldoActual + formIngresoMonto };
          }
          return acc;
        })
      );
    }

    try {
      await setDoc(doc(db, "finanzas_ingresos", newIncome.id), newIncome);
    } catch (_) {}

    setIsIngresoModalOpen(false);
    playChime("success");
    setActionFeedback(`Ingreso de $${formIngresoMonto} registrado.`);
    setTimeout(() => setActionFeedback(null), 3000);

    // Reset form
    setFormIngresoArticulo("");
    setFormIngresoReferencia("");
    setFormIngresoNotas("");
  };

  // HANDLER: MARCAR INGRESO ESPERADO COMO RECIBIDO
  const handleMarcarIngresoRecibido = async (inc: FinancialIncomeItem) => {
    setIncomes((prev) =>
      prev.map((i) => (i.id === inc.id ? { ...i, estado: "Recibido" } : i))
    );

    setAccounts((prev) =>
      prev.map((acc) => {
        if (inc.metodo === "Efectivo" && acc.tipo === "Efectivo") {
          return { ...acc, saldoActual: acc.saldoActual + inc.monto };
        }
        if (inc.metodo !== "Efectivo" && acc.tipo !== "Efectivo") {
          return { ...acc, saldoActual: acc.saldoActual + inc.monto };
        }
        return acc;
      })
    );

    try {
      await updateDoc(doc(db, "finanzas_ingresos", inc.id), { estado: "Recibido" });
    } catch (_) {}

    playChime("work_done");
    setActionFeedback(`Ingreso de $${inc.monto} marcado como recibido y sumado a caja.`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // HANDLERS: DEUDAS (CREAR, EDITAR, ELIMINAR)
  const handleOpenCreateDeuda = () => {
    setEditingDebt(null);
    setFormDeudaAcreedor("");
    setFormDeudaConcepto("");
    setFormDeudaMontoOriginal(5000);
    setFormDeudaSaldoActual(5000);
    setFormDeudaVencimiento(new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10));
    setFormDeudaPagoMinimo(1000);
    setFormDeudaPrioridad("Alta");
    setFormDeudaEstado("Activa");
    setFormDeudaNotas("");
    setIsDeudaModalOpen(true);
    playChime("tick");
  };

  const handleOpenEditDeuda = (d: FinancialDebt) => {
    setEditingDebt(d);
    setFormDeudaAcreedor(d.acreedor);
    setFormDeudaConcepto(d.concepto);
    setFormDeudaMontoOriginal(d.montoOriginal);
    setFormDeudaSaldoActual(d.saldoActual);
    setFormDeudaVencimiento(d.vencimiento);
    setFormDeudaPagoMinimo(d.pagoMinimo);
    setFormDeudaPrioridad(d.prioridad);
    setFormDeudaEstado(d.estado);
    setFormDeudaNotas(d.notas || "");
    setIsDeudaModalOpen(true);
    playChime("tick");
  };

  const handleDeleteDeuda = async (debt: FinancialDebt) => {
    setDebts((prev) => prev.filter((d) => d.id !== debt.id));

    try {
      await deleteDoc(doc(db, "finanzas_deudas", debt.id));
    } catch (err) {
      console.error("Error al eliminar deuda en Firestore", err);
    }

    setDebtToDelete(null);
    playChime("tick");
    setActionFeedback(`Deuda con ${debt.acreedor} eliminada.`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleSaveDeuda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDeudaAcreedor.trim() || formDeudaMontoOriginal <= 0) return;

    if (editingDebt) {
      const nuevoSaldo = Math.max(0, Number(formDeudaSaldoActual));
      const estadoFinal: "Activa" | "Liquidada" = nuevoSaldo === 0 ? "Liquidada" : formDeudaEstado;

      const updatedDebt: FinancialDebt = {
        ...editingDebt,
        acreedor: formDeudaAcreedor.trim(),
        concepto: formDeudaConcepto.trim() || "Deuda registrada",
        montoOriginal: Number(formDeudaMontoOriginal),
        saldoActual: nuevoSaldo,
        vencimiento: formDeudaVencimiento,
        pagoMinimo: Number(formDeudaPagoMinimo) || Math.round(Number(formDeudaMontoOriginal) * 0.2),
        prioridad: formDeudaPrioridad,
        estado: estadoFinal,
        notas: formDeudaNotas.trim() || undefined,
      };

      setDebts((prev) => prev.map((d) => (d.id === editingDebt.id ? updatedDebt : d)));

      try {
        await setDoc(doc(db, "finanzas_deudas", updatedDebt.id), updatedDebt);
      } catch (err) {
        console.error("Error al actualizar deuda en Firestore", err);
      }

      setIsDeudaModalOpen(false);
      setEditingDebt(null);
      playChime("tick");
      setActionFeedback(`Deuda con ${updatedDebt.acreedor} actualizada exitosamente.`);
      setTimeout(() => setActionFeedback(null), 3000);

      setFormDeudaAcreedor("");
      setFormDeudaConcepto("");
      setFormDeudaNotas("");
      return;
    }

    const newDebt: FinancialDebt = {
      id: `deb-${Date.now()}`,
      acreedor: formDeudaAcreedor.trim(),
      concepto: formDeudaConcepto.trim() || "Deuda registrada",
      montoOriginal: Number(formDeudaMontoOriginal),
      saldoActual: Number(formDeudaMontoOriginal),
      vencimiento: formDeudaVencimiento,
      pagoMinimo: Number(formDeudaPagoMinimo) || Math.round(formDeudaMontoOriginal * 0.2),
      prioridad: formDeudaPrioridad,
      estado: "Activa",
      notas: formDeudaNotas.trim() || undefined,
      historialPagos: [],
    };

    setDebts((prev) => [newDebt, ...prev]);

    try {
      await setDoc(doc(db, "finanzas_deudas", newDebt.id), newDebt);
    } catch (_) {}

    setIsDeudaModalOpen(false);
    playChime("tick");
    setActionFeedback(`Deuda con ${newDebt.acreedor} registrada.`);
    setTimeout(() => setActionFeedback(null), 3000);

    setFormDeudaAcreedor("");
    setFormDeudaConcepto("");
    setFormDeudaNotas("");
  };

  // HANDLER: REGISTRAR PAGO / ABONO A DEUDA
  const handleRealizarPagoDeuda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtToPay || pagoDeudaMonto <= 0) return;

    const montoAbonado = Math.min(selectedDebtToPay.saldoActual, pagoDeudaMonto);
    const nuevoSaldo = Math.max(0, selectedDebtToPay.saldoActual - montoAbonado);
    const estaLiquidada = nuevoSaldo === 0;

    const nuevoPago = {
      id: `pay-${Date.now()}`,
      fecha: pagoDeudaFecha,
      monto: montoAbonado,
      metodo: pagoDeudaMetodo,
      referencia: pagoDeudaReferencia.trim() || "Abono a deuda",
      nota: `Pago registrado a ${selectedDebtToPay.acreedor}`,
    };

    // Actualizar deuda
    const updatedDebt: FinancialDebt = {
      ...selectedDebtToPay,
      saldoActual: nuevoSaldo,
      estado: estaLiquidada ? "Liquidada" : "Activa",
      historialPagos: [nuevoPago, ...selectedDebtToPay.historialPagos],
    };

    setDebts((prev) => prev.map((d) => (d.id === selectedDebtToPay.id ? updatedDebt : d)));

    // Si se marcó registrar como gasto automático:
    if (pagoDeudaRegistrarGasto) {
      const expenseDeuda: FinancialExpense = {
        id: `exp-deuda-${Date.now()}`,
        fecha: pagoDeudaFecha,
        articulo: `Abono Deuda: ${selectedDebtToPay.acreedor}`,
        tipo: "Fijo",
        referencia: pagoDeudaReferencia || `PAG-${selectedDebtToPay.acreedor.slice(0, 3)}`,
        metodo: pagoDeudaMetodo,
        monto: montoAbonado,
        categoria: "Servicios",
        notas: `Pago a crédito ${selectedDebtToPay.concepto}`,
        deudaId: selectedDebtToPay.id,
        createdAt: new Date().toISOString(),
      };

      setExpenses((prev) => [expenseDeuda, ...prev]);

      // Descontar saldo de cuentas
      setAccounts((prev) =>
        prev.map((acc) => {
          if (pagoDeudaMetodo === "Efectivo" && acc.tipo === "Efectivo") {
            return { ...acc, saldoActual: acc.saldoActual - montoAbonado };
          }
          if (pagoDeudaMetodo !== "Efectivo" && acc.tipo !== "Efectivo") {
            return { ...acc, saldoActual: acc.saldoActual - montoAbonado };
          }
          return acc;
        })
      );

      try {
        await setDoc(doc(db, "finanzas_gastos", expenseDeuda.id), expenseDeuda);
      } catch (_) {}
    }

    // Si se marcó mandar a PrintOS:
    if (pagoDeudaMandarPrint && onSendToPrint) {
      onSendToPrint({
        id: `print-pay-${selectedDebtToPay.id}-${Date.now()}`,
        tipo: "comprobante_pago",
        folio: `PAG-${selectedDebtToPay.acreedor.slice(0, 3).toUpperCase()}`,
        titulo: `Comprobante de Pago a ${selectedDebtToPay.acreedor}`,
        clienteNombre: selectedDebtToPay.acreedor,
        fecha: pagoDeudaFecha,
        items: [
          {
            descripcion: `Abono a ${selectedDebtToPay.concepto}`,
            cantidad: 1,
            subtotal: montoAbonado,
          },
        ],
        total: montoAbonado,
        anticipo: montoAbonado,
        saldo: nuevoSaldo,
        metodoPago: pagoDeudaMetodo,
        estado: "Pagado",
        notas: estaLiquidada ? "¡DEUDA COMPLETAMENTE LIQUIDADA!" : `Saldo restante: $${nuevoSaldo}`,
        origen: "finanzas",
        createdAt: new Date().toISOString(),
      });
    }

    try {
      await setDoc(doc(db, "finanzas_deudas", updatedDebt.id), updatedDebt);
    } catch (_) {}

    setIsPagarDeudaModalOpen(false);
    setSelectedDebtToPay(null);

    if (estaLiquidada) {
      playChime("work_done");
      setActionFeedback(`🏆 ¡Felicidades! La deuda con ${selectedDebtToPay.acreedor} ha sido LIQUIDADA.`);
    } else {
      playChime("tick");
      setActionFeedback(`Abono de $${montoAbonado} registrado. Saldo actual: $${nuevoSaldo}.`);
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // HANDLER: AGREGAR GASTO FIJO RECURRENTE
  const handleSaveFixedConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFixedConcepto.trim() || formFixedMonto <= 0) return;

    const newFixed: FinancialFixedExpenseConfig = {
      id: `fix-${Date.now()}`,
      concepto: formFixedConcepto.trim(),
      monto: Number(formFixedMonto),
      diaVencimiento: Math.min(31, Math.max(1, formFixedDia)),
      categoria: formFixedCategoria,
      metodo: formFixedMetodo,
      referencia: formFixedReferencia.trim() || "Gasto fijo mensual",
      activo: true,
    };

    setFixedConfigs((prev) => [newFixed, ...prev]);

    try {
      await setDoc(doc(db, "finanzas_fijos", newFixed.id), newFixed);
    } catch (_) {}

    setIsFixedConfigModalOpen(false);
    playChime("tick");
    setActionFeedback(`Gasto fijo ${newFixed.concepto} configurado.`);
    setTimeout(() => setActionFeedback(null), 3000);

    setFormFixedConcepto("");
    setFormFixedReferencia("");
  };

  // HANDLER: MARCAR GASTO FIJO COMO PAGADO ESTE MES
  const handlePagarGastoFijoEsteMes = (f: FinancialFixedExpenseConfig) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const newExp: FinancialExpense = {
      id: `exp-fix-${f.id}-${Date.now()}`,
      fecha: todayStr,
      articulo: f.concepto,
      tipo: "Fijo",
      referencia: f.referencia || "Pago mensual",
      metodo: f.metodo,
      monto: f.monto,
      categoria: f.categoria,
      notas: `Gasto fijo de ${new Date().toLocaleDateString("es-MX", { month: "long" })}`,
      createdAt: new Date().toISOString(),
    };

    setExpenses((prev) => [newExp, ...prev]);

    setAccounts((prev) =>
      prev.map((acc) => {
        if (f.metodo === "Efectivo" && acc.tipo === "Efectivo") {
          return { ...acc, saldoActual: acc.saldoActual - f.monto };
        }
        if (f.metodo !== "Efectivo" && acc.tipo !== "Efectivo") {
          return { ...acc, saldoActual: acc.saldoActual - f.monto };
        }
        return acc;
      })
    );

    try {
      setDoc(doc(db, "finanzas_gastos", newExp.id), newExp);
    } catch (_) {}

    playChime("tick");
    setActionFeedback(`Gasto fijo ${f.concepto} ($${f.monto}) marcado como pagado este mes.`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // DATOS PARA GRÁFICOS RECHARTS
  // 1. Comparativa Ingresos vs Gastos
  const chartDataBalance = useMemo(() => {
    return [
      {
        nombre: "Ingresos Recibidos",
        monto: totalIngresosRecibidos,
        color: "#10b981",
      },
      {
        nombre: "Gastos Fijos",
        monto: totalGastosFijos,
        color: "#6366f1",
      },
      {
        nombre: "Gastos Variables",
        monto: totalGastosVariables,
        color: "#f59e0b",
      },
      {
        nombre: "Total Gastos",
        monto: totalGastos,
        color: "#ef4444",
      },
    ];
  }, [totalIngresosRecibidos, totalGastosFijos, totalGastosVariables, totalGastos]);

  // 2. Proporción Gastos Fijos vs Variables
  const chartDataFijosVsVariables = useMemo(() => {
    return [
      {
        name: "Gastos Fijos",
        value: totalGastosFijos || 1,
        color: "#6366f1",
      },
      {
        name: "Gastos Variables",
        value: totalGastosVariables || 1,
        color: "#f59e0b",
      },
    ];
  }, [totalGastosFijos, totalGastosVariables]);

  // 3. Gastos por Categoría
  const chartDataCategorias = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      const cat = e.categoria || "Otro";
      map.set(cat, (map.get(cat) || 0) + (Number(e.monto) || 0));
    });
    return Array.from(map.entries()).map(([cat, val]) => ({
      categoria: cat,
      monto: val,
    }));
  }, [expenses]);

  // 4. Gastos por Método de Pago (Efectivo vs Tarjeta vs Transferencia)
  const chartDataMetodos = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      const met = e.metodo || "Efectivo";
      map.set(met, (map.get(met) || 0) + (Number(e.monto) || 0));
    });
    return Array.from(map.entries()).map(([met, val]) => ({
      metodo: met,
      monto: val,
    }));
  }, [expenses]);

  return (
    <div id="salud-financiera-suite" className="space-y-6">
      
      {/* CABECERA PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-950 to-stone-900 text-white shadow-xl relative overflow-hidden border border-emerald-500/30">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-white/10 backdrop-blur-md text-emerald-300 text-xl font-bold shadow-inner">
              💚
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-400 text-stone-950 font-mono">
              FINANZAS • TASK-OS
            </span>
            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${diagnosticoSalud.badge}`}>
              {diagnosticoSalud.nivel}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Salud Financiera & Control de Flujo
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl leading-relaxed">
            Gastos (fijos y variables), ingresos, amortización de deudas, calendario conectado con Google Calendar y estadísticas en tiempo real.
          </p>
        </div>

        {/* Acciones Rápidas en Cabecera */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="btn-agregar-gasto-header"
            onClick={() => {
              setIsGastoModalOpen(true);
              playChime("tick");
            }}
            className="px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <ArrowUpRight size={14} />
            <span>+ Gasto</span>
          </button>

          <button
            type="button"
            id="btn-agregar-ingreso-header"
            onClick={() => {
              setIsIngresoModalOpen(true);
              playChime("tick");
            }}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <ArrowDownRight size={14} />
            <span>+ Ingreso</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPagarDeudaModalOpen(true);
              playChime("tick");
            }}
            className="px-3.5 py-2 rounded-2xl bg-white text-stone-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md hover:bg-stone-100 active:scale-95 cursor-pointer"
          >
            <CreditCard size={14} className="text-blue-600" />
            <span>Pagar Deuda</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK TOAST TEMPORAL */}
      {actionFeedback && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-3 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 font-semibold shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-emerald-700 dark:text-emerald-300 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* NAVEGACIÓN POR PESTAÑAS */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-stone-100 dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
        {[
          { key: "resumen", label: "Resumen & KPIs", icon: Wallet, count: null },
          { key: "gastos", label: "Gastos", icon: ArrowUpRight, count: expenses.length },
          { key: "ingresos", label: "Ingresos", icon: ArrowDownRight, count: incomes.length },
          { key: "deudas", label: "Deudas & Pagos", icon: CreditCard, count: debts.filter((d) => d.estado === "Activa").length },
          { key: "fijos_variables", label: "Fijos vs Variables", icon: Layers, count: fixedConfigs.length },
          { key: "calendario", label: "Calendario de Pagos (Google)", icon: Calendar, count: paymentCalendarEvents.length },
          { key: "estadisticas", label: "Estadísticas", icon: BarChart3, count: null },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key as any);
                playChime("tick");
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 ${
                isActive
                  ? "bg-white dark:bg-stone-750 text-stone-900 dark:text-white shadow-xs border border-stone-200/80 dark:border-stone-700"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white/40"
              }`}
            >
              <Icon size={14} className={isActive ? "text-emerald-600 dark:text-emerald-400" : ""} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200"
                      : "bg-stone-200 dark:bg-stone-800 text-stone-500"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =========================================================
          PESTAÑA 1: RESUMEN & KPIS PRINCIPALES
      ========================================================= */}
      {activeTab === "resumen" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* 4 KPIs de Alto Nivel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Balance Neto */}
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                Balance Neto (Recibido - Gastos)
              </span>
              <p className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                balanceNeto >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}>
                {balanceNeto >= 0 ? "+" : "-"}${Math.abs(balanceNeto).toLocaleString("es-MX")}
              </p>
              <span className="text-[11px] text-stone-400 block">
                {balanceNeto >= 0 ? "Superávit operativo" : "Déficit por cubrir"}
              </span>
            </div>

            {/* Card 2: Total Gastos (Fijos + Variables) */}
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block">
                  Gastos del Periodo
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold">
                  {expenses.length} registros
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                ${totalGastos.toLocaleString("es-MX")}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                <span>Fijos: ${totalGastosFijos.toLocaleString()}</span>
                <span>•</span>
                <span>Var: ${totalGastosVariables.toLocaleString()}</span>
              </div>
            </div>

            {/* Card 3: Ingresos Recibidos vs Esperados */}
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">
                  Ingresos Recibidos
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                  +{totalIngresosEsperados > 0 ? `$${totalIngresosEsperados.toLocaleString()} esperados` : "Al día"}
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                ${totalIngresosRecibidos.toLocaleString("es-MX")}
              </p>
              <span className="text-[11px] text-stone-400 block">
                Total cobrado y confirmado en caja/cuentas
              </span>
            </div>

            {/* Card 4: Deuda Total Activa */}
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Deuda Total Activa
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">
                  {porcentajeDeudaPagada}% amortizado
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 font-mono tracking-tight">
                ${deudaTotalActiva.toLocaleString("es-MX")}
              </p>
              <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${porcentajeDeudaPagada}%` }}
                />
              </div>
            </div>
          </div>

          {/* Próximos Pagos Urgentes & Atajos Rápidos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Columna 1 y 2: Calendario Inmediato de Pagos */}
            <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block font-mono">
                    CALENDARIO INMEDIATO
                  </span>
                  <h4 className="text-base font-black text-stone-900 dark:text-stone-100">
                    Próximos Pagos y Vencimientos
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("calendario")}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Ver calendario completo</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-2.5">
                {paymentCalendarEvents.slice(0, 4).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850 flex items-center justify-between gap-3 hover:border-emerald-300 dark:hover:border-emerald-800 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          ev.estadoVencimiento === "vencido"
                            ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                            : ev.estadoVencimiento === "hoy"
                            ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                            : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                        }`}
                      >
                        {ev.tipo === "deuda" ? "💳" : ev.tipo === "fijo" ? "🏛️" : "💵"}
                      </div>
                      <div>
                        <h5 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                          {ev.titulo}
                        </h5>
                        <p className="text-[11px] text-stone-400 font-mono">
                          Vence: {ev.fecha} •{" "}
                          <span
                            className={
                              ev.estadoVencimiento === "vencido"
                                ? "text-rose-600 font-bold"
                                : ev.estadoVencimiento === "hoy"
                                ? "text-amber-600 font-bold"
                                : "text-stone-500"
                            }
                          >
                            {ev.diasRestantes < 0
                              ? `Vencido hace ${Math.abs(ev.diasRestantes)} días`
                              : ev.diasRestantes === 0
                              ? "¡Vence hoy!"
                              : `En ${ev.diasRestantes} días`}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                        ${ev.monto.toLocaleString("es-MX")}
                      </span>

                      {/* Botón Google Calendar */}
                      <button
                        type="button"
                        onClick={() => handleSyncToGoogleCalendarApi(ev)}
                        className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-200 text-stone-600 dark:text-stone-300 transition"
                        title="Añadir recordatorio a Google Calendar"
                      >
                        <Calendar size={13} />
                      </button>

                      {ev.tipo === "deuda" && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDebtToPay(ev.rawObj);
                            setPagoDeudaMonto(ev.rawObj.pagoMinimo || ev.rawObj.saldoActual);
                            setIsPagarDeudaModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-[11px] font-bold cursor-pointer"
                        >
                          Pagar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna 3: Diagnóstico y Distribución Efectivo vs Tarjeta */}
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block font-mono">
                  DIAGNÓSTICO & FONDOS
                </span>

                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-100 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      Estado de Solvencia:
                    </span>
                    <span className={`text-xs font-black ${diagnosticoSalud.color}`}>
                      {diagnosticoSalud.nivel}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                    {diagnosticoSalud.mensaje}
                  </p>
                </div>

                {/* Saldos por Cuenta */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-stone-400 block uppercase">
                    Disponibilidad en Cuentas:
                  </span>
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50/80 dark:bg-stone-800 text-xs"
                    >
                      <span className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                        {acc.tipo === "Efectivo" ? <Banknote size={14} className="text-emerald-500" /> : <CreditCard size={14} className="text-blue-500" />}
                        <span>{acc.nombre}</span>
                      </span>
                      <span className="font-mono font-black text-stone-900 dark:text-stone-100">
                        ${acc.saldoActual.toLocaleString("es-MX")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("estadisticas")}
                  className="w-full py-2.5 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <BarChart3 size={14} />
                  <span>Ver Gráficos y Estadísticas Detalladas</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* =========================================================
          PESTAÑA 2: GASTOS (CON FECHA, ARTÍCULO, TIPO, REFERENCIA, EFECTIVO/TARJETA)
      ========================================================= */}
      {activeTab === "gastos" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Header de la sección de Gastos */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                Registro y Control de Gastos
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Registra cada desembolso con fecha, artículo, tipo (Fijo/Variable), referencia y método (Efectivo / Tarjeta).
              </p>
            </div>

            <button
              type="button"
              id="btn-agregar-gasto-modal"
              onClick={() => {
                setIsGastoModalOpen(true);
                playChime("tick");
              }}
              className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition flex items-center gap-2 shadow-md self-start sm:self-auto cursor-pointer"
            >
              <Plus size={15} />
              <span>Nuevo Gasto</span>
            </button>
          </div>

          {/* Filtros de Gastos */}
          <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Buscador */}
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={gastoSearchQuery}
                  onChange={(e) => setGastoSearchQuery(e.target.value)}
                  placeholder="Buscar por artículo, referencia, notas o categoría..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500"
                />
                {gastoSearchQuery && (
                  <button onClick={() => setGastoSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro Tipo: Fijo vs Variable */}
              <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl shrink-0">
                <span className="text-[10px] font-bold text-stone-400 px-2 uppercase">Tipo:</span>
                {[
                  { key: "todos", label: "Todos" },
                  { key: "Fijo", label: "Fijos" },
                  { key: "Variable", label: "Variables" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setGastoFilterTipo(t.key as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      gastoFilterTipo === t.key
                        ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs"
                        : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Filtro Método: Efectivo vs Tarjeta */}
              <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl shrink-0">
                <span className="text-[10px] font-bold text-stone-400 px-2 uppercase">Método:</span>
                {[
                  { key: "todos", label: "Todos" },
                  { key: "Efectivo", label: "Efectivo" },
                  { key: "Tarjeta", label: "Tarjeta" },
                  { key: "Transferencia", label: "Transfer" },
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setGastoFilterMetodo(m.key as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      gastoFilterMetodo === m.key
                        ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs"
                        : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtotal filtrado */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
              <span className="text-stone-400 font-bold">
                Mostrando {filteredExpenses.length} de {expenses.length} gastos
              </span>
              <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                Total: ${filteredExpenses.reduce((s, e) => s + e.monto, 0).toLocaleString("es-MX")}
              </span>
            </div>
          </div>

          {/* Tabla de Gastos */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-sm font-bold text-stone-500">No hay gastos con los filtros seleccionados.</p>
                <button
                  type="button"
                  onClick={() => {
                    setGastoFilterTipo("todos");
                    setGastoFilterMetodo("todos");
                    setGastoSearchQuery("");
                  }}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-850 text-stone-400 font-extrabold uppercase tracking-wider border-b border-stone-200 dark:border-stone-800 text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Fecha</th>
                      <th className="py-3.5 px-4">Artículo / Concepto</th>
                      <th className="py-3.5 px-3">Tipo</th>
                      <th className="py-3.5 px-3">Referencia</th>
                      <th className="py-3.5 px-3">Método</th>
                      <th className="py-3.5 px-3">Categoría</th>
                      <th className="py-3.5 px-4 text-right">Monto ($)</th>
                      <th className="py-3.5 px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-medium">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition">
                        <td className="py-3 px-4 font-mono text-stone-500 whitespace-nowrap">
                          {exp.fecha}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-stone-900 dark:text-stone-100 block">
                            {exp.articulo}
                          </span>
                          {exp.notas && (
                            <span className="text-[11px] text-stone-400 block truncate max-w-xs">
                              {exp.notas}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              exp.tipo === "Fijo"
                                ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            }`}
                          >
                            {exp.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-600 dark:text-stone-300 text-[11px] whitespace-nowrap">
                          {exp.referencia || "—"}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-bold text-stone-700 dark:text-stone-300">
                            {exp.metodo === "Efectivo" ? (
                              <Banknote size={12} className="text-emerald-500" />
                            ) : (
                              <CreditCard size={12} className="text-blue-500" />
                            )}
                            <span>{exp.metodo}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-stone-500 text-[11px]">{exp.categoria}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-rose-600 dark:text-rose-400 text-right whitespace-nowrap">
                          -${exp.monto.toLocaleString("es-MX")}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`¿Eliminar gasto de ${exp.articulo}?`)) {
                                setExpenses((prev) => prev.filter((p) => p.id !== exp.id));
                                try {
                                  await deleteDoc(doc(db, "finanzas_gastos", exp.id));
                                } catch (_) {}
                                playChime("tick");
                              }
                            }}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Eliminar gasto"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* =========================================================
          PESTAÑA 3: INGRESOS CON SUS DATOS
      ========================================================= */}
      {activeTab === "ingresos" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                Control de Ingresos y Cobranza
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Registra ingresos recibidos o programa cobros esperados con fecha, concepto, método y comprobante.
              </p>
            </div>

            <button
              type="button"
              id="btn-agregar-ingreso-modal"
              onClick={() => {
                setIsIngresoModalOpen(true);
                playChime("tick");
              }}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition flex items-center gap-2 shadow-md self-start sm:self-auto cursor-pointer"
            >
              <Plus size={15} />
              <span>Nuevo Ingreso</span>
            </button>
          </div>

          {/* Filtros de Ingresos */}
          <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={ingresoSearchQuery}
                  onChange={(e) => setIngresoSearchQuery(e.target.value)}
                  placeholder="Buscar por artículo, concepto o referencia..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl shrink-0">
                <span className="text-[10px] font-bold text-stone-400 px-2 uppercase">Estado:</span>
                {[
                  { key: "todos", label: "Todos" },
                  { key: "Recibido", label: "Recibidos" },
                  { key: "Esperado", label: "Esperados" },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setIngresoFilterEstado(s.key as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      ingresoFilterEstado === s.key
                        ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs"
                        : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla de Ingresos */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-stone-850 text-stone-400 font-extrabold uppercase tracking-wider border-b border-stone-200 dark:border-stone-800 text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Fecha</th>
                    <th className="py-3.5 px-4">Artículo / Concepto</th>
                    <th className="py-3.5 px-3">Categoría</th>
                    <th className="py-3.5 px-3">Método</th>
                    <th className="py-3.5 px-3">Referencia</th>
                    <th className="py-3.5 px-3">Estado</th>
                    <th className="py-3.5 px-4 text-right">Monto ($)</th>
                    <th className="py-3.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-medium">
                  {filteredIncomes.map((inc) => (
                    <tr key={inc.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition">
                      <td className="py-3 px-4 font-mono text-stone-500 whitespace-nowrap">
                        {inc.fecha}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-stone-900 dark:text-stone-100 block">
                          {inc.articulo}
                        </span>
                        {inc.notas && (
                          <span className="text-[11px] text-stone-400 block truncate max-w-xs">
                            {inc.notas}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-stone-500 text-[11px] whitespace-nowrap">
                        {inc.categoria}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-bold text-stone-700 dark:text-stone-300">
                          {inc.metodo === "Efectivo" ? (
                            <Banknote size={12} className="text-emerald-500" />
                          ) : (
                            <CreditCard size={12} className="text-blue-500" />
                          )}
                          <span>{inc.metodo}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-500 text-[11px] whitespace-nowrap">
                        {inc.referencia || "—"}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inc.estado === "Recibido"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                              : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          {inc.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400 text-right whitespace-nowrap">
                        +${inc.monto.toLocaleString("es-MX")}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {inc.estado === "Esperado" && (
                            <button
                              type="button"
                              onClick={() => handleMarcarIngresoRecibido(inc)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black transition"
                              title="Marcar como recibido y sumar a saldo"
                            >
                              Confirmar Recibo
                            </button>
                          )}

                          {onSendToPrint && (
                            <button
                              type="button"
                              onClick={() => {
                                onSendToPrint({
                                  id: `print-inc-${inc.id}`,
                                  tipo: "recibo_general",
                                  folio: `REC-${inc.articulo.slice(0, 3).toUpperCase()}`,
                                  titulo: `Recibo de Ingreso • ${inc.articulo}`,
                                  clienteNombre: inc.categoria,
                                  fecha: inc.fecha,
                                  items: [{ descripcion: inc.articulo, cantidad: 1, subtotal: inc.monto }],
                                  total: inc.monto,
                                  metodoPago: inc.metodo,
                                  estado: inc.estado === "Recibido" ? "Pagado" : "Pendiente",
                                  notas: inc.notas,
                                  origen: "finanzas",
                                  createdAt: new Date().toISOString(),
                                });
                                playChime("tick");
                              }}
                              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-200 text-stone-600 dark:text-stone-300"
                              title="Generar comprobante en PRINT 🖨️"
                            >
                              <Printer size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`¿Eliminar ingreso ${inc.articulo}?`)) {
                                setIncomes((prev) => prev.filter((p) => p.id !== inc.id));
                                try {
                                  await deleteDoc(doc(db, "finanzas_ingresos", inc.id));
                                } catch (_) {}
                                playChime("tick");
                              }
                            }}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 transition"
                            title="Eliminar registro"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================
          PESTAÑA 4: DEUDAS & PAGO DE DEUDAS
      ========================================================= */}
      {activeTab === "deudas" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                Plan de Amortización y Pago de Deudas
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Registra abonos a capital o pago de cuotas. El saldo se actualiza automáticamente.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                id="btn-nueva-deuda-modal"
                onClick={handleOpenCreateDeuda}
                className="px-3.5 py-2 rounded-2xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-xs transition cursor-pointer"
              >
                + Nueva Deuda
              </button>

              <button
                type="button"
                id="btn-pagar-deuda-action"
                onClick={() => {
                  if (debts.filter((d) => d.estado === "Activa").length > 0) {
                    setSelectedDebtToPay(debts.filter((d) => d.estado === "Activa")[0]);
                    setPagoDeudaMonto(debts.filter((d) => d.estado === "Activa")[0].pagoMinimo);
                  }
                  setIsPagarDeudaModalOpen(true);
                  playChime("tick");
                }}
                className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <CreditCard size={15} />
                <span>Registrar Pago / Abono</span>
              </button>
            </div>
          </div>

          {/* Tarjetas de Deudas Activas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {debts.map((d) => {
              const amortizado = Math.max(0, d.montoOriginal - d.saldoActual);
              const pct = Math.min(100, Math.round((amortizado / (d.montoOriginal || 1)) * 100));
              const isLiquidada = d.estado === "Liquidada" || d.saldoActual === 0;

              return (
                <div
                  key={d.id}
                  className={`p-5 rounded-3xl border shadow-xs space-y-4 transition ${
                    isLiquidada
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-850"
                      : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isLiquidada
                              ? "bg-emerald-500 text-white"
                              : d.prioridad === "Alta"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {isLiquidada ? "🏆 Liquidada" : `Prioridad ${d.prioridad}`}
                        </span>
                      </div>
                      <h4 className="font-black text-base text-stone-900 dark:text-stone-100">
                        {d.acreedor}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400">{d.concepto}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditDeuda(d)}
                          className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-blue-400 dark:hover:border-blue-500 text-stone-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                          title="Editar información de esta deuda"
                          aria-label={`Editar deuda con ${d.acreedor}`}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDebtToDelete(d)}
                          className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-rose-400 dark:hover:border-rose-500 text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Eliminar esta deuda"
                          aria-label={`Eliminar deuda con ${d.acreedor}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-stone-400 block uppercase">
                          Saldo Actual
                        </span>
                        <span className="font-mono font-black text-lg text-stone-900 dark:text-stone-100">
                          ${d.saldoActual.toLocaleString("es-MX")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Amortización */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-500">
                      <span>Progreso ({pct}%)</span>
                      <span>De ${d.montoOriginal.toLocaleString("es-MX")}</span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLiquidada ? "bg-emerald-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Detalles y Vencimiento */}
                  <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-850 text-xs space-y-1 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Vencimiento:</span>
                      <span className="font-bold text-stone-700 dark:text-stone-300">{d.vencimiento}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400">Cuota / Mínimo:</span>
                      <span className="font-black text-stone-900 dark:text-stone-100">
                        ${d.pagoMinimo.toLocaleString("es-MX")}
                      </span>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    {!isLiquidada ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDebtToPay(d);
                          setPagoDeudaMonto(d.pagoMinimo || d.saldoActual);
                          setIsPagarDeudaModalOpen(true);
                        }}
                        className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <CreditCard size={13} />
                        <span>Abonar</span>
                      </button>
                    ) : (
                      <span className="flex-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={14} />
                        <span>Completamente saldada</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEditDeuda(d)}
                      className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                      title="Editar parámetros de la deuda"
                    >
                      <Edit2 size={12} />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDebtToDelete(d)}
                      className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center justify-center cursor-pointer"
                      title="Eliminar esta deuda"
                      aria-label="Eliminar deuda"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Historial de Pagos de la Deuda */}
                  {d.historialPagos && d.historialPagos.length > 0 && (
                    <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                        Abonos Registrados ({d.historialPagos.length}):
                      </span>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {d.historialPagos.map((p, pIdx) => (
                          <div
                            key={p.id || pIdx}
                            className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 font-mono"
                          >
                            <span className="text-stone-500">{p.fecha}</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              -${p.monto.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* =========================================================
          PESTAÑA 5: GASTOS FIJOS VS VARIABLES
      ========================================================= */}
      {activeTab === "fijos_variables" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                Gastos Fijos vs Gastos Variables
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Audita y separa los gastos fijos obligatorios del mes respecto a compras y desembolsos variables.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsFixedConfigModalOpen(true);
                playChime("tick");
              }}
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus size={14} />
              <span>Configurar Gasto Fijo</span>
            </button>
          </div>

          {/* Comparativa Visual de Barras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box Gastos Fijos */}
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  🏛️ GASTOS FIJOS (RECURRENTES)
                </span>
                <span className="font-mono font-black text-lg text-indigo-600 dark:text-indigo-400">
                  ${totalGastosFijos.toLocaleString("es-MX")}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Presupuesto mensual fijo base: <strong>${presupuestoFijoMensual.toLocaleString("es-MX")}</strong>.
              </p>

              <div className="space-y-2 pt-2">
                {fixedConfigs.map((f) => {
                  const yaFuePagadoEsteMes = expenses.some(
                    (e) => e.articulo.toLowerCase().includes(f.concepto.toLowerCase()) && e.tipo === "Fijo"
                  );

                  return (
                    <div
                      key={f.id}
                      className="p-3 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                            {f.concepto}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-stone-200 dark:bg-stone-700 font-mono">
                            Día {f.diaVencimiento}
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-400 font-mono">
                          {f.categoria} • {f.metodo}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                          ${f.monto.toLocaleString()}
                        </span>

                        {yaFuePagadoEsteMes ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                            ✓ Pagado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePagarGastoFijoEsteMes(f)}
                            className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black transition cursor-pointer"
                            title="Registrar gasto de este mes"
                          >
                            Pagar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Box Gastos Variables */}
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  🛒 GASTOS VARIABLES (OPERATIVOS / DÍA A DÍA)
                </span>
                <span className="font-mono font-black text-lg text-amber-600 dark:text-amber-400">
                  ${totalGastosVariables.toLocaleString("es-MX")}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Insumos extraordinarios, comidas, materiales de lonas y compras imprevistas.
              </p>

              <div className="space-y-2 pt-2 max-h-96 overflow-y-auto">
                {expenses
                  .filter((e) => e.tipo === "Variable")
                  .map((e) => (
                    <div
                      key={e.id}
                      className="p-3 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850 flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 block">
                          {e.articulo}
                        </span>
                        <span className="text-[11px] text-stone-400 font-mono">
                          {e.fecha} • {e.categoria} • {e.metodo} ({e.referencia})
                        </span>
                      </div>

                      <span className="font-mono font-black text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                        ${e.monto.toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================
          PESTAÑA 6: CALENDARIO DE PAGOS CONECTADO CON GOOGLE CALENDAR
      ========================================================= */}
      {activeTab === "calendario" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-950 to-stone-900 text-white shadow-xl border border-blue-500/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-white/10 text-white text-lg font-bold">
                  📅
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-400 text-stone-950 font-mono">
                  GOOGLE CALENDAR CONNECTED
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Calendario de Pagos y Vencimientos
              </h3>
              <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
                Todos tus compromisos programados sincronizados con Google Calendar. Haz clic en cualquier evento para abrirlo o descárgalos todos en formato .ICS.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleDownloadICS}
                className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white font-bold text-xs transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
                title="Descargar archivo .ICS para importar en cualquier calendario"
              >
                <Download size={14} />
                <span>Descargar .ICS</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const firstUpcoming = paymentCalendarEvents[0];
                  if (firstUpcoming) {
                    handleSyncToGoogleCalendarApi(firstUpcoming);
                  } else {
                    alert("No hay pagos pendientes para programar.");
                  }
                }}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 text-stone-950 font-black text-xs transition flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
                title="Sincronizar próximo pago a Google Calendar"
              >
                <Calendar size={14} />
                <span>Añadir a Google Calendar</span>
              </button>
            </div>
          </div>

          {/* Cronograma de Eventos de Pago */}
          <div className="space-y-3">
            {paymentCalendarEvents.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-2">
                <Calendar size={32} className="mx-auto text-stone-400" />
                <h4 className="font-bold text-sm text-stone-600 dark:text-stone-300">
                  No hay pagos o cobros programados
                </h4>
                <p className="text-xs text-stone-400">
                  Agrega una deuda o configura un gasto fijo para verlo en el calendario.
                </p>
              </div>
            ) : (
              paymentCalendarEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-400 transition"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold shrink-0 shadow-inner ${
                        ev.estadoVencimiento === "vencido"
                          ? "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300"
                          : ev.estadoVencimiento === "hoy"
                          ? "bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300"
                          : "bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-mono leading-none">
                        {new Date(ev.fecha + "T00:00:00").toLocaleDateString("es-MX", { month: "short" })}
                      </span>
                      <span className="text-base font-black font-mono leading-none mt-0.5">
                        {new Date(ev.fecha + "T00:00:00").getDate()}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            ev.tipo === "deuda"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : ev.tipo === "fijo"
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {ev.tipo === "deuda" ? "Deuda" : ev.tipo === "fijo" ? "Gasto Fijo" : "Cobro"}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            ev.estadoVencimiento === "vencido"
                              ? "text-rose-600 dark:text-rose-400"
                              : ev.estadoVencimiento === "hoy"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-stone-500"
                          }`}
                        >
                          {ev.diasRestantes < 0
                            ? `⚠️ Vencido (${Math.abs(ev.diasRestantes)} días)`
                            : ev.diasRestantes === 0
                            ? "🚨 Vence Hoy"
                            : `📅 En ${ev.diasRestantes} días`}
                        </span>
                      </div>

                      <h4 className="font-black text-sm sm:text-base text-stone-900 dark:text-stone-100">
                        {ev.titulo}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400 leading-snug">
                        {ev.descripcion}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
                    <span className="font-mono font-black text-base sm:text-lg text-stone-900 dark:text-stone-100">
                      ${ev.monto.toLocaleString("es-MX")}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleSyncToGoogleCalendarApi(ev)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs transition flex items-center gap-1.5 border border-blue-200 dark:border-blue-800"
                      title="Abrir o crear evento en Google Calendar"
                    >
                      <Calendar size={13} />
                      <span>Google Calendar</span>
                      <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* =========================================================
          PESTAÑA 7: ESTADÍSTICAS Y GRÁFICOS INTERACTIVOS
      ========================================================= */}
      {activeTab === "estadisticas" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
            <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
              Estadísticas y Análisis de Flujo Financiero
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Métricas clave de balance, desglose de gastos fijos vs variables y progreso de amortización.
            </p>
          </div>

          {/* Fila de Gráficos Recharts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico 1: Ingresos vs Gastos */}
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
              <span className="text-xs font-black uppercase tracking-wider text-stone-400 font-mono block">
                BALANCE Y FLUJO COMPARATIVO ($ MXN)
              </span>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataBalance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="nombre" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: any) => [`$${Number(val).toLocaleString()} MXN`, "Monto"]}
                      contentStyle={{ borderRadius: 16, fontSize: 12, fontWeight: "bold" }}
                    />
                    <Bar dataKey="monto" radius={[8, 8, 0, 0]}>
                      {chartDataBalance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Proporción Fijos vs Variables (Torta / Anillo) */}
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
              <span className="text-xs font-black uppercase tracking-wider text-stone-400 font-mono block">
                DISTRIBUCIÓN: FIJOS VS VARIABLES
              </span>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDataFijosVsVariables}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={45}
                      paddingAngle={4}
                      label={({ name, percent }: any) => `${name} (${(((percent ?? 0) as number) * 100).toFixed(0)}%)`}
                    >
                      {chartDataFijosVsVariables.map((entry, index) => (
                        <Cell key={`pie-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()} MXN`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 3: Gastos por Categoría */}
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
              <span className="text-xs font-black uppercase tracking-wider text-stone-400 font-mono block">
                GASTOS POR CATEGORÍA
              </span>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataCategorias} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="categoria" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()} MXN`]} />
                    <Bar dataKey="monto" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 4: Desglose por Método de Pago */}
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
              <span className="text-xs font-black uppercase tracking-wider text-stone-400 font-mono block">
                MÉTODOS DE PAGO: EFECTIVO VS TARJETA VS TRANSFERENCIA
              </span>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataMetodos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="metodo" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()} MXN`]} />
                    <Bar dataKey="monto" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* =========================================================
          MODALES DE FORMULARIO
      ========================================================= */}

      {/* MODAL 1: AGREGAR GASTO */}
      {isGastoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 text-sm">
                  💸
                </span>
                <h4 className="font-black text-base text-stone-900 dark:text-stone-100">
                  Registrar Nuevo Gasto
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsGastoModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGasto} className="space-y-4 text-xs">
              {/* Artículo / Concepto */}
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Artículo o Concepto del Gasto: *
                </label>
                <input
                  type="text"
                  required
                  value={formGastoArticulo}
                  onChange={(e) => setFormGastoArticulo(e.target.value)}
                  placeholder="Ej. Rollo de lona 13oz, Renta taller, Alimentos..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-medium text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Fila: Monto y Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Monto ($ MXN): *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formGastoMonto}
                    onChange={(e) => setFormGastoMonto(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-mono font-black text-base text-rose-600 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Fecha del Gasto: *
                  </label>
                  <input
                    type="date"
                    required
                    value={formGastoFecha}
                    onChange={(e) => setFormGastoFecha(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-mono text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Fila: Tipo (Fijo / Variable) y Método (Efectivo / Tarjeta / Transferencia) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Tipo de Gasto: *
                  </label>
                  <select
                    value={formGastoTipo}
                    onChange={(e) => setFormGastoTipo(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-bold text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Variable">Gasto Variable (Día a día / Operativo)</option>
                    <option value="Fijo">Gasto Fijo (Renta / Servicios / Nómina)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Método de Pago: *
                  </label>
                  <select
                    value={formGastoMetodo}
                    onChange={(e) => setFormGastoMetodo(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-bold text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Efectivo">💵 Efectivo (Caja)</option>
                    <option value="Tarjeta">💳 Tarjeta (Débito/Crédito)</option>
                    <option value="Transferencia">🏦 Transferencia Bancaria</option>
                  </select>
                </div>
              </div>

              {/* Fila: Referencia y Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Referencia / Folio / Factura:
                  </label>
                  <input
                    type="text"
                    value={formGastoReferencia}
                    onChange={(e) => setFormGastoReferencia(e.target.value)}
                    placeholder="Ej. TICKET-992, FAC-410, SPEI..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-mono text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Categoría:
                  </label>
                  <select
                    value={formGastoCategoria}
                    onChange={(e) => setFormGastoCategoria(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-medium text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {CATEGORIAS_GASTO.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Notas u Observaciones:
                </label>
                <textarea
                  rows={2}
                  value={formGastoNotas}
                  onChange={(e) => setFormGastoNotas(e.target.value)}
                  placeholder="Detalles adicionales del gasto..."
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 border-none text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsGastoModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md cursor-pointer"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR INGRESO */}
      {isIngresoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 text-sm">
                  💵
                </span>
                <h4 className="font-black text-base text-stone-900 dark:text-stone-100">
                  Registrar Ingreso / Cobro
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsIngresoModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveIngreso} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Concepto o Artículo del Ingreso: *
                </label>
                <input
                  type="text"
                  required
                  value={formIngresoArticulo}
                  onChange={(e) => setFormIngresoArticulo(e.target.value)}
                  placeholder="Ej. Anticipo Lona 3x2, Venta playeras, Liquidación..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-medium text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Monto ($ MXN): *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formIngresoMonto}
                    onChange={(e) => setFormIngresoMonto(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-mono font-black text-base text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Fecha: *
                  </label>
                  <input
                    type="date"
                    required
                    value={formIngresoFecha}
                    onChange={(e) => setFormIngresoFecha(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-mono text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Método de Cobro:
                  </label>
                  <select
                    value={formIngresoMetodo}
                    onChange={(e) => setFormIngresoMetodo(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-bold text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Efectivo">💵 Efectivo (Caja)</option>
                    <option value="Tarjeta">💳 Tarjeta / Terminal</option>
                    <option value="Transferencia">🏦 Transferencia Bancaria</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Estado del Ingreso:
                  </label>
                  <select
                    value={formIngresoEstado}
                    onChange={(e) => setFormIngresoEstado(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-bold text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Recibido">✅ Ya Recibido (Confirmado en mano)</option>
                    <option value="Esperado">⏳ Esperado (Cobro programado)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Referencia / Folio:
                  </label>
                  <input
                    type="text"
                    value={formIngresoReferencia}
                    onChange={(e) => setFormIngresoReferencia(e.target.value)}
                    placeholder="Ej. FOL-LON-105..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-mono text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Categoría:
                  </label>
                  <select
                    value={formIngresoCategoria}
                    onChange={(e) => setFormIngresoCategoria(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-medium text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORIAS_INGRESO.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsIngresoModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md cursor-pointer"
                >
                  Guardar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PAGAR / ABONAR A DEUDA */}
      {isPagarDeudaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 text-sm">
                  💳
                </span>
                <h4 className="font-black text-base text-stone-900 dark:text-stone-100">
                  Registrar Pago o Abono a Deuda
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsPagarDeudaModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRealizarPagoDeuda} className="space-y-4 text-xs">
              {/* Selección de la deuda */}
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Selecciona la Deuda a Pagar: *
                </label>
                <select
                  value={selectedDebtToPay?.id || ""}
                  onChange={(e) => {
                    const found = debts.find((d) => d.id === e.target.value);
                    if (found) {
                      setSelectedDebtToPay(found);
                      setPagoDeudaMonto(found.pagoMinimo || found.saldoActual);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-bold text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona una deuda...</option>
                  {debts
                    .filter((d) => d.estado === "Activa")
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.acreedor} • Saldo: ${d.saldoActual.toLocaleString()} (Min: ${d.pagoMinimo})
                      </option>
                    ))}
                </select>
              </div>

              {selectedDebtToPay && (
                <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-1 font-mono">
                  <div className="flex justify-between text-stone-700 dark:text-stone-300">
                    <span>Saldo pendiente:</span>
                    <span className="font-black text-rose-600">${selectedDebtToPay.saldoActual.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-stone-700 dark:text-stone-300">
                    <span>Cuota mínima sugerida:</span>
                    <span className="font-bold">${selectedDebtToPay.pagoMinimo.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-stone-700 dark:text-stone-300">
                    <span>Fecha de vencimiento:</span>
                    <span className="font-bold">{selectedDebtToPay.vencimiento}</span>
                  </div>
                </div>
              )}

              {/* Atajos de Monto */}
              {selectedDebtToPay && (
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 dark:text-stone-300 block">
                    Monto del Abono ($ MXN): *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPagoDeudaMonto(selectedDebtToPay.pagoMinimo)}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-[11px] font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-200"
                    >
                      Mínimo (${selectedDebtToPay.pagoMinimo})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPagoDeudaMonto(selectedDebtToPay.saldoActual)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200"
                    >
                      Liquidar Total (${selectedDebtToPay.saldoActual})
                    </button>
                  </div>
                  <input
                    type="number"
                    required
                    min={1}
                    max={selectedDebtToPay.saldoActual}
                    value={pagoDeudaMonto}
                    onChange={(e) => setPagoDeudaMonto(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-mono font-black text-lg text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Fila: Fecha y Método de Pago */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Fecha del Pago:
                  </label>
                  <input
                    type="date"
                    required
                    value={pagoDeudaFecha}
                    onChange={(e) => setPagoDeudaFecha(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-mono text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Método Utilizado:
                  </label>
                  <select
                    value={pagoDeudaMetodo}
                    onChange={(e) => setPagoDeudaMetodo(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-bold text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Tarjeta">💳 Tarjeta / Débito</option>
                    <option value="Transferencia">🏦 Transferencia Bancaria</option>
                    <option value="Efectivo">💵 Efectivo</option>
                  </select>
                </div>
              </div>

              {/* Referencia */}
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Referencia / Número de Comprobante:
                </label>
                <input
                  type="text"
                  value={pagoDeudaReferencia}
                  onChange={(e) => setPagoDeudaReferencia(e.target.value)}
                  placeholder="Ej. AUT-8891, Folio de transferencia..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-mono text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Opciones Adicionales */}
              <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-700 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={pagoDeudaRegistrarGasto}
                    onChange={(e) => setPagoDeudaRegistrarGasto(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Registrar automáticamente como gasto en los movimientos (resta saldo)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-700 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={pagoDeudaMandarPrint}
                    onChange={(e) => setPagoDeudaMandarPrint(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Generar comprobante de pago en PrintOS 🖨️</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsPagarDeudaModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedDebtToPay || pagoDeudaMonto <= 0}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  Confirmar Pago (${pagoDeudaMonto})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: NUEVA / EDITAR DEUDA */}
      {isDeudaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 text-sm">
                  💳
                </span>
                <div>
                  <h4 className="font-black text-base text-stone-900 dark:text-stone-100">
                    {editingDebt ? "Editar Deuda o Crédito" : "Registrar Nueva Deuda o Crédito"}
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {editingDebt
                      ? `Modifica los términos, saldo o vencimiento de la deuda con ${editingDebt.acreedor}`
                      : "Planifica la amortización de pasivos y créditos comerciales o personales"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDeudaModalOpen(false);
                  setEditingDebt(null);
                }}
                className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDeuda} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Acreedor o Entidad: *
                </label>
                <input
                  type="text"
                  required
                  value={formDeudaAcreedor}
                  onChange={(e) => setFormDeudaAcreedor(e.target.value)}
                  placeholder="Ej. Mercado Pago, Telcel, Banco, Proveedor..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-medium text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Concepto de la Deuda:
                </label>
                <input
                  type="text"
                  value={formDeudaConcepto}
                  onChange={(e) => setFormDeudaConcepto(e.target.value)}
                  placeholder="Ej. Línea de crédito para compras de rollos de lona..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-medium text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Monto Total Original ($): *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formDeudaMontoOriginal}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setFormDeudaMontoOriginal(val);
                      if (!editingDebt) {
                        setFormDeudaSaldoActual(val);
                        if (formDeudaPagoMinimo === 0) setFormDeudaPagoMinimo(Math.round(val * 0.2));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-mono font-black text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Pago Mínimo o Cuota ($):
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formDeudaPagoMinimo}
                    onChange={(e) => setFormDeudaPagoMinimo(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-mono font-black text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Campos especiales en edición: ajuste manual de saldo y estado */}
              {editingDebt && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                  <div>
                    <label className="font-bold text-amber-900 dark:text-amber-200 block mb-1">
                      Saldo Actual Pendiente ($): *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formDeudaSaldoActual}
                      onChange={(e) => setFormDeudaSaldoActual(Number(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 font-mono font-black text-amber-700 dark:text-amber-300 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-amber-900 dark:text-amber-200 block mb-1">
                      Estado de la Deuda:
                    </label>
                    <select
                      value={formDeudaEstado}
                      onChange={(e) => setFormDeudaEstado(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 font-bold text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Activa">⏳ Activa (Pendiente de pago)</option>
                      <option value="Liquidada">🏆 Liquidada (Completamente pagada)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Fecha Límite de Vencimiento: *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDeudaVencimiento}
                    onChange={(e) => setFormDeudaVencimiento(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-mono text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Prioridad de Pago:
                  </label>
                  <select
                    value={formDeudaPrioridad}
                    onChange={(e) => setFormDeudaPrioridad(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-bold text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Alta">🔴 Alta (Urgente / Intereses altos)</option>
                    <option value="Media">🟡 Media (Proveedores / Fija)</option>
                    <option value="Baja">🟢 Baja (Sin interés inmediato)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Notas u Observaciones:
                </label>
                <textarea
                  rows={2}
                  value={formDeudaNotas}
                  onChange={(e) => setFormDeudaNotas(e.target.value)}
                  placeholder="Detalles sobre plazo o condiciones..."
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 border-none text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                {editingDebt ? (
                  <button
                    type="button"
                    onClick={() => {
                      const d = editingDebt;
                      setIsDeudaModalOpen(false);
                      setEditingDebt(null);
                      setDebtToDelete(d);
                    }}
                    className="px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    title="Eliminar esta deuda"
                  >
                    <Trash2 size={13} />
                    <span>Eliminar Deuda</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeudaModalOpen(false);
                      setEditingDebt(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md cursor-pointer transition flex items-center gap-1.5"
                  >
                    {editingDebt ? <Edit2 size={13} /> : <Plus size={13} />}
                    <span>{editingDebt ? "Guardar Cambios" : "Guardar Deuda"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4.5: CONFIRMAR ELIMINAR DEUDA */}
      {debtToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <Trash2 size={22} />
              </div>
              <div>
                <h4 className="font-black text-base text-stone-900 dark:text-stone-100">
                  ¿Eliminar esta deuda?
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {debtToDelete.acreedor} • {debtToDelete.concepto}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-stone-400">Saldo pendiente:</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  ${debtToDelete.saldoActual.toLocaleString("es-MX")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Monto original:</span>
                <span className="text-stone-600 dark:text-stone-400">
                  ${debtToDelete.montoOriginal.toLocaleString("es-MX")}
                </span>
              </div>
              {debtToDelete.historialPagos && debtToDelete.historialPagos.length > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Abonos registrados:</span>
                  <span>{debtToDelete.historialPagos.length} pago(s)</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Esta acción quitará la deuda de tu tablero financiero y recalculará automáticamente tus métricas de endeudamiento.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setDebtToDelete(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-bold text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDeuda(debtToDelete)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>Sí, Eliminar Deuda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIGURAR GASTO FIJO RECURRENTE */}
      {isFixedConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-stone-100 dark:border-stone-800">
              <h4 className="font-black text-base text-stone-900 dark:text-stone-100">
                Configurar Gasto Fijo Recurrente
              </h4>
              <button onClick={() => setIsFixedConfigModalOpen(false)} className="text-stone-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFixedConfig} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Concepto del Gasto Fijo: *
                </label>
                <input
                  type="text"
                  required
                  value={formFixedConcepto}
                  onChange={(e) => setFormFixedConcepto(e.target.value)}
                  placeholder="Ej. Renta Taller, Telcel, Luz CFE, Nómina fija..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-medium text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Monto Mensual Esperado ($): *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formFixedMonto}
                    onChange={(e) => setFormFixedMonto(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-mono font-black text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Día del Mes en que Vence (1 al 31): *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={31}
                    value={formFixedDia}
                    onChange={(e) => setFormFixedDia(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-mono font-black text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Categoría:
                  </label>
                  <select
                    value={formFixedCategoria}
                    onChange={(e) => setFormFixedCategoria(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-medium text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CATEGORIAS_GASTO.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Método Habitual:
                  </label>
                  <select
                    value={formFixedMetodo}
                    onChange={(e) => setFormFixedMetodo(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border-none font-bold text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Tarjeta">Tarjeta / Domiciliado</option>
                    <option value="Efectivo">Efectivo en Ventanilla</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsFixedConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md cursor-pointer"
                >
                  Guardar Plantilla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
