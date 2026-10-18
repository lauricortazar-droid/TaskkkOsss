import React, { useState, useMemo } from "react";
import {
  X,
  Download,
  Filter,
  CheckCircle2,
  Printer,
  CreditCard,
  Layers,
  FileSpreadsheet,
  Check,
  Calendar,
  Sparkles,
  Users,
} from "lucide-react";
import { playChime } from "../utils/audio";
import { ReconocimientoRecord, ZONAS_LISTA } from "./ReconocimientosOS";

interface ExportListModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ReconocimientoRecord[];
}

export default function ExportListModal({
  isOpen,
  onClose,
  records,
}: ExportListModalProps) {
  // Filtros interactivos
  const [impresoFilter, setImpresoFilter] = useState<"todos" | "impreso" | "no_impreso">("todos");
  const [pagoFilter, setPagoFilter] = useState<"todos" | "pagado" | "pendiente">("todos");
  const [elaboradoFilter, setElaboradoFilter] = useState<"todos" | "elaborado" | "no_elaborado">("todos");
  const [entregadoFilter, setEntregadoFilter] = useState<"todos" | "entregado" | "no_entregado">("todos");
  const [driveFilter, setDriveFilter] = useState<"todos" | "con_drive" | "sin_drive">("todos");
  const [yearFilter, setYearFilter] = useState<string>("todos");
  const [zonaFilter, setZonaFilter] = useState<string>("todos");
  const [diplomadoFilter, setDiplomadoFilter] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportedCount, setLastExportedCount] = useState<number | null>(null);

  // Años únicos
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.year) set.add(String(r.year));
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [records]);

  // Diplomados únicos
  const availableDiplomados = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.diplomado) set.add(r.diplomado);
    });
    return Array.from(set).sort();
  }, [records]);

  // Registros filtrados dinámicamente
  const filteredList = useMemo(() => {
    return records.filter((r) => {
      // Impreso
      if (impresoFilter === "impreso" && !r.impreso) return false;
      if (impresoFilter === "no_impreso" && r.impreso) return false;

      // Pago
      if (pagoFilter === "pagado" && !r.pagado) return false;
      if (pagoFilter === "pendiente" && r.pagado) return false;

      // Elaborado digital
      if (elaboradoFilter === "elaborado" && !r.elaboradoDigital) return false;
      if (elaboradoFilter === "no_elaborado" && r.elaboradoDigital) return false;

      // Entregado
      if (entregadoFilter === "entregado" && !r.entregado) return false;
      if (entregadoFilter === "no_entregado" && r.entregado) return false;

      // Drive
      if (driveFilter === "con_drive" && (!r.driveUrl || !r.driveUrl.trim())) return false;
      if (driveFilter === "sin_drive" && r.driveUrl && r.driveUrl.trim()) return false;

      // Año
      if (yearFilter !== "todos" && String(r.year) !== yearFilter) return false;

      // Zona
      if (zonaFilter !== "todos" && r.zona !== zonaFilter) return false;

      // Diplomado
      if (diplomadoFilter !== "todos" && r.diplomado !== diplomadoFilter) return false;

      // Búsqueda libre
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (r.nombre || "").toLowerCase().includes(q);
        const matchFolio = (r.id || "").toLowerCase().includes(q);
        const matchTel = (r.telefono || "").includes(q);
        if (!matchName && !matchFolio && !matchTel) return false;
      }

      return true;
    });
  }, [
    records,
    impresoFilter,
    pagoFilter,
    elaboradoFilter,
    entregadoFilter,
    driveFilter,
    yearFilter,
    zonaFilter,
    diplomadoFilter,
    searchTerm,
  ]);

  if (!isOpen) return null;

  // Preset quick helpers
  const applyPreset = (preset: "graduados" | "por_imprimir" | "por_pagar" | "por_entregar" | "todos") => {
    playChime("tick");
    setSearchTerm("");
    setYearFilter("todos");
    setZonaFilter("todos");
    setDiplomadoFilter("todos");
    setDriveFilter("todos");

    switch (preset) {
      case "graduados":
        setImpresoFilter("impreso");
        setPagoFilter("todos");
        setElaboradoFilter("todos");
        setEntregadoFilter("todos");
        break;
      case "por_imprimir":
        setImpresoFilter("no_impreso");
        setPagoFilter("todos");
        setElaboradoFilter("todos");
        setEntregadoFilter("todos");
        break;
      case "por_pagar":
        setImpresoFilter("todos");
        setPagoFilter("pendiente");
        setElaboradoFilter("todos");
        setEntregadoFilter("todos");
        break;
      case "por_entregar":
        setImpresoFilter("todos");
        setPagoFilter("todos");
        setElaboradoFilter("todos");
        setEntregadoFilter("no_entregado");
        break;
      case "todos":
        setImpresoFilter("todos");
        setPagoFilter("todos");
        setElaboradoFilter("todos");
        setEntregadoFilter("todos");
        break;
    }
  };

  const handleDownloadCSV = () => {
    if (filteredList.length === 0) {
      alert("No hay registros que coincidan con los filtros seleccionados.");
      return;
    }

    setIsExporting(true);
    playChime("tick");

    try {
      const headers = [
        "Nombre Completo",
        "Rol",
        "Grupo",
        "Zona",
        "Diplomado",
        "Generación / Año",
        "Tipo Impresión",
        "Costo ($)",
        "Estatus Pago",
        "Método Pago",
        "Referencia Pago",
        "Fecha Pago",
        "Impreso (Físico)",
        "Elaborado Digital",
        "Entregado",
        "Teléfono",
        "Correo Electrónico",
        "Enlace Google Drive",
        "Notas u Observaciones",
        "Fecha de Registro",
        "Folio / ID",
      ];

      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = filteredList.map((r) => [
        escapeCSV(r.nombre || ""),
        escapeCSV(r.rol || "Líder"),
        escapeCSV(r.grupo || "G-1"),
        escapeCSV(r.zona || "Jaguar"),
        escapeCSV(r.diplomado || "Liderazgo I"),
        escapeCSV(r.year || "2026"),
        escapeCSV(r.tipoImpresion || "Primera Impresión"),
        escapeCSV(r.costo || 100),
        escapeCSV(r.pagado ? "PAGADO" : "PENDIENTE"),
        escapeCSV(r.metodoPago || ""),
        escapeCSV(r.referenciaPago || ""),
        escapeCSV(r.fechaPago || ""),
        escapeCSV(r.impreso ? "SÍ (IMPRESO)" : "NO"),
        escapeCSV(r.elaboradoDigital ? "SÍ" : "NO"),
        escapeCSV(r.entregado ? "SÍ" : "NO"),
        escapeCSV(r.telefono || ""),
        escapeCSV(r.email || ""),
        escapeCSV(r.driveUrl || ""),
        escapeCSV(r.notas || ""),
        escapeCSV(r.createdAt ? new Date(r.createdAt).toLocaleString("es-MX") : ""),
        escapeCSV(r.id),
      ]);

      // UTF-8 BOM (\uFEFF) para compatibilidad total con Microsoft Excel
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Nombre de archivo descriptivo según filtros
      let filterTag = "alumnos";
      if (impresoFilter === "impreso") filterTag = "graduados_impresos";
      else if (impresoFilter === "no_impreso") filterTag = "pendientes_imprimir";
      else if (pagoFilter === "pendiente") filterTag = "pendientes_pago";

      const now = new Date().toISOString().split("T")[0];
      link.download = `reconocimientos_${filterTag}_${now}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setLastExportedCount(filteredList.length);
      playChime("success");
    } catch (e) {
      console.error("Error al exportar:", e);
      alert("Error al generar archivo CSV");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-5 animate-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shadow-xs">
              <Download size={22} />
            </div>
            <div>
              <h3 className="font-black text-stone-900 dark:text-stone-100 text-base sm:text-lg flex items-center gap-2">
                <span>Descargar Lista de Alumnos</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  CSV / Excel
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Filtra por estado de impresión, pagos, entregas o generación antes de descargar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Botones de Selección Rápida (Presets) */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-stone-400 mb-2">
            Accesos Rápidos Populares:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => applyPreset("graduados")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                impresoFilter === "impreso" && pagoFilter === "todos"
                  ? "bg-purple-600 text-white"
                  : "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
              }`}
            >
              <Printer size={13} />
              <span>Solo Graduados (Impresos)</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("por_imprimir")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                impresoFilter === "no_impreso"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              }`}
            >
              <span>⏳ Pendientes de Imprimir</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("por_pagar")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                pagoFilter === "pendiente"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              }`}
            >
              <CreditCard size={13} />
              <span>Pendientes de Pago</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("por_entregar")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                entregadoFilter === "no_entregado"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              }`}
            >
              <span>📦 Pendientes de Entrega</span>
            </button>

            <button
              type="button"
              onClick={() => applyPreset("todos")}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 transition cursor-pointer"
            >
              <span>Todos los Registros</span>
            </button>
          </div>
        </div>

        {/* Panel de Filtros Detallados */}
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
              <Filter size={14} className="text-emerald-600" />
              <span>Filtros Específicos para la Descarga</span>
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              {filteredList.length} de {records.length} registros seleccionados
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Estado Impreso */}
            <div>
              <label className="block text-stone-500 dark:text-stone-400 mb-1 font-bold">
                🖨️ Estado de Impresión
              </label>
              <select
                value={impresoFilter}
                onChange={(e) => setImpresoFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="todos">Todos (Impresos y Por Imprimir)</option>
                <option value="impreso">Solo Impresos (Graduados)</option>
                <option value="no_impreso">Solo Por Imprimir (Pendientes)</option>
              </select>
            </div>

            {/* Estado de Pago */}
            <div>
              <label className="block text-stone-500 dark:text-stone-400 mb-1 font-bold">
                💳 Estado de Pago
              </label>
              <select
                value={pagoFilter}
                onChange={(e) => setPagoFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="todos">Todos (Pagados y Pendientes)</option>
                <option value="pagado">Solo Pagados</option>
                <option value="pendiente">Solo Pendientes de Pago</option>
              </select>
            </div>

            {/* Estado Entrega */}
            <div>
              <label className="block text-stone-500 dark:text-stone-400 mb-1 font-bold">
                📦 Estado de Entrega
              </label>
              <select
                value={entregadoFilter}
                onChange={(e) => setEntregadoFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="todos">Todos los Estados</option>
                <option value="entregado">Solo Entregados</option>
                <option value="no_entregado">Pendientes de Entrega</option>
              </select>
            </div>

            {/* Generación / Año */}
            <div>
              <label className="block text-stone-500 dark:text-stone-400 mb-1 font-bold">
                📅 Generación / Año
              </label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="todos">Todas las Generaciones</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    Generación {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Diplomado */}
            <div>
              <label className="block text-stone-500 dark:text-stone-400 mb-1 font-bold">
                🎓 Diplomado
              </label>
              <select
                value={diplomadoFilter}
                onChange={(e) => setDiplomadoFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="todos">Todos los Diplomados</option>
                {availableDiplomados.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Zona */}
            <div>
              <label className="block text-stone-500 dark:text-stone-400 mb-1 font-bold">
                📍 Zona
              </label>
              <select
                value={zonaFilter}
                onChange={(e) => setZonaFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="todos">Todas las Zonas</option>
                {ZONAS_LISTA.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Búsqueda por texto opcional */}
          <div>
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o folio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Resumen de columnas incluidas */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <FileSpreadsheet size={15} />
              <span>Formato de Salida Compatible con Excel (CSV UTF-8 BOM)</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
              21 Columnas Oficiales
            </span>
          </div>
          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
            Incluye Nombre Completo, Rol, Grupo, Zona, Diplomado, Generación/Año, Tipo de Impresión, Costo, Estatus de Pago, Impreso, Elaborado Digital, Entregado, Teléfono, Correo, Enlace Drive y Notas.
          </p>
        </div>

        {/* Notificación de descarga exitosa */}
        {lastExportedCount !== null && (
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
            <Check size={16} />
            <span>
              ¡Archivo descargado con éxito con {lastExportedCount} alumnos!
            </span>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-100 dark:border-stone-800">
          <span className="text-xs text-stone-500">
            {filteredList.length === 0 ? "Sin coincidencias" : `${filteredList.length} alumnos listos para exportar`}
          </span>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold transition cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleDownloadCSV}
              disabled={isExporting || filteredList.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/20 transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              <span>{isExporting ? "Generando CSV..." : `Descargar Lista (${filteredList.length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
