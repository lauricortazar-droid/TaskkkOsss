import Papa from "papaparse";
import { AlumnoPendiente } from "../components/AlumnosPendientesSection";
import { ReconocimientoRecord } from "../components/ReconocimientosOS";

export type ImportTarget = "alumnos" | "solicitudes" | "historial";

export interface ParsedDataResult {
  headers: string[];
  rawRows: Record<string, string>[];
  totalRows: number;
}

export interface FieldMapping {
  // Shared
  nombre?: string;
  email?: string;
  telefono?: string;
  notas?: string;

  // Alumnos
  estatus?: string;
  casa?: string;
  generacion?: string;
  rol?: string;

  // Solicitudes
  diplomado?: string;
  year?: string;
  tipoImpresion?: string;
  costo?: string;
  grupo?: string;
  zona?: string;
  driveUrl?: string;
  elaboradoDigital?: string;
  pagado?: string;
  cuadernillos?: string;
  audio?: string;
  digital?: string;
  impreso?: string;
  entregado?: string;
}

export interface AlumnoImportItem {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  estatus: string;
  casa: string;
  generacion: string;
  rol: string;
  notas: string;
  fechaRegistro: string;
  contactadoWhatsApp: boolean;
  isDuplicate?: boolean;
  duplicateReason?: string;
  selected: boolean;
}

export interface SolicitudImportItem {
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
  email?: string;
  driveUrl?: string;
  notas?: string;
  elaboradoDigital: boolean;
  pagado: boolean;
  cuadernillos: boolean;
  audio: boolean;
  digital: boolean;
  impreso: boolean;
  entregado: boolean;
  isDuplicate?: boolean;
  duplicateReason?: string;
  selected: boolean;
}

/**
 * Normalizes text for header matching: removes accents, symbols, lowercases and trims
 */
export function normalizeText(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Parses raw CSV, TSV or pasted tabular string
 */
export function parseTabularData(content: string): ParsedDataResult {
  if (!content || !content.trim()) {
    return { headers: [], rawRows: [], totalRows: 0 };
  }

  // Remove BOM if present
  let cleanContent = content;
  if (cleanContent.charCodeAt(0) === 0xfeff) {
    cleanContent = cleanContent.slice(1);
  }

  const result = Papa.parse<Record<string, string>>(cleanContent, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });

  const headers = (result.meta.fields || []).map((h) => h.trim()).filter(Boolean);
  const rawRows = (result.data || []).filter((row) => {
    // Keep only rows with at least one non-empty value
    return Object.values(row).some((val) => typeof val === "string" && val.trim().length > 0);
  });

  return {
    headers,
    rawRows,
    totalRows: rawRows.length,
  };
}

/**
 * Automatically guesses column mapping based on detected header names
 */
export function autoDetectFieldMapping(
  headers: string[],
  target: ImportTarget
): FieldMapping {
  const mapping: FieldMapping = {};
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    norm: normalizeText(h),
  }));

  const findBest = (synonyms: string[]): string | undefined => {
    // 1. Exact normalized match
    for (const syn of synonyms) {
      const match = normalizedHeaders.find((h) => h.norm === syn);
      if (match) return match.original;
    }
    // 2. Contains match
    for (const syn of synonyms) {
      const match = normalizedHeaders.find(
        (h) => h.norm.includes(syn) || syn.includes(h.norm)
      );
      if (match) return match.original;
    }
    return undefined;
  };

  // Shared fields
  mapping.nombre = findBest([
    "nombre",
    "nombre completo",
    "alumno",
    "estudiante",
    "participante",
    "full name",
    "fullname",
    "name",
    "titular",
  ]);

  mapping.email = findBest([
    "correo",
    "email",
    "correo electronico",
    "e mail",
    "mail",
  ]);

  mapping.telefono = findBest([
    "telefono",
    "whatsapp",
    "celular",
    "tel",
    "phone",
    "movil",
    "contacto",
  ]);

  mapping.notas = findBest([
    "notas",
    "observaciones",
    "nota",
    "comentarios",
    "detalles",
    "observacion",
  ]);

  if (target === "alumnos") {
    mapping.estatus = findBest([
      "estatus",
      "estado",
      "status",
      "situacion",
      "fase",
    ]);
    mapping.casa = findBest([
      "casa",
      "casa gladiadores",
      "equipo",
      "comunidad",
      "tribu",
      "sede",
      "grupo",
    ]);
    mapping.generacion = findBest([
      "generacion",
      "ano",
      "gen",
      "promocion",
      "ciclo",
    ]);
    mapping.rol = findBest([
      "rol",
      "puesto",
      "cargo",
      "funcion",
    ]);
  } else {
    // Solicitudes & Historial
    mapping.diplomado = findBest([
      "diplomado",
      "programa",
      "curso",
      "carrera",
    ]);
    mapping.year = findBest([
      "generacion",
      "ano",
      "gen",
      "promocion",
      "year",
    ]);
    mapping.tipoImpresion = findBest([
      "tipo impresion",
      "tipo de impresion",
      "impresion",
      "tipo",
    ]);
    mapping.costo = findBest([
      "costo",
      "precio",
      "importe",
      "monto",
      "pago",
    ]);
    mapping.grupo = findBest([
      "grupo",
      "casa",
      "equipo",
      "seccion",
    ]);
    mapping.zona = findBest([
      "zona",
      "region",
      "area",
    ]);
    mapping.driveUrl = findBest([
      "drive",
      "link drive",
      "enlace drive",
      "reconocimiento drive",
      "carpeta drive",
      "url drive",
      "link",
      "enlace",
      "archivo drive",
    ]);
    mapping.elaboradoDigital = findBest([
      "elaborado",
      "hecho",
      "diseno",
      "diseño",
      "digital hecho",
      "elaborado digital",
    ]);
    mapping.pagado = findBest([
      "pagado",
      "pago",
      "status pago",
    ]);
    mapping.cuadernillos = findBest(["cuadernillos", "cuadernillo"]);
    mapping.audio = findBest(["audio", "audios"]);
    mapping.digital = findBest(["digital", "reconocimiento digital"]);
    mapping.impreso = findBest(["impreso", "impresion"]);
    mapping.entregado = findBest(["entregado", "entrega"]);
  }

  return mapping;
}

/**
 * Normalizes boolean strings
 */
function parseBooleanValue(val: any): boolean {
  if (typeof val === "boolean") return val;
  if (!val) return false;
  const str = String(val).trim().toLowerCase();
  return ["si", "sí", "true", "1", "x", "✓", "pagado", "entregado", "ok", "listo", "yes"].includes(str);
}

/**
 * Cleans phone number
 */
function cleanPhone(val?: string): string {
  if (!val) return "";
  return val.replace(/[^0-9+]/g, "").trim();
}

/**
 * Builds AlumnoImportItem list with duplicate checking against existing database
 */
export function buildAlumnosFromRows(
  rows: Record<string, string>[],
  mapping: FieldMapping,
  existingAlumnos: AlumnoPendiente[],
  defaults: { casa: string; generacion: string; rol: string; estatus: string }
): AlumnoImportItem[] {
  const existingMapByName = new Map<string, AlumnoPendiente>();
  const existingMapByEmail = new Map<string, AlumnoPendiente>();
  const existingMapByPhone = new Map<string, AlumnoPendiente>();

  existingAlumnos.forEach((a) => {
    if (a.nombre) existingMapByName.set(normalizeText(a.nombre), a);
    if (a.email) existingMapByEmail.set(a.email.trim().toLowerCase(), a);
    const p = cleanPhone(a.telefono);
    if (p.length >= 8) existingMapByPhone.set(p, a);
  });

  return rows.map((row, idx) => {
    const rawNombre = mapping.nombre ? row[mapping.nombre] || "" : "";
    const rawEmail = mapping.email ? row[mapping.email] || "" : "";
    const rawTel = mapping.telefono ? row[mapping.telefono] || "" : "";
    const rawEstatus = mapping.estatus ? row[mapping.estatus] || "" : "";
    const rawCasa = mapping.casa ? row[mapping.casa] || "" : "";
    const rawGen = mapping.generacion ? row[mapping.generacion] || "" : "";
    const rawRol = mapping.rol ? row[mapping.rol] || "" : "";
    const rawNotas = mapping.notas ? row[mapping.notas] || "" : "";

    const nombre = rawNombre.trim() || `Alumno Fila ${idx + 1}`;
    const email = rawEmail.trim().toLowerCase();
    const telefono = cleanPhone(rawTel);
    const estatus = rawEstatus.trim() || defaults.estatus;
    const casa = rawCasa.trim() || defaults.casa;
    const generacion = rawGen.trim() || defaults.generacion;
    const rol = rawRol.trim() || defaults.rol;
    const notas = rawNotas.trim();

    // Check duplicate
    let isDuplicate = false;
    let duplicateReason = "";

    const normName = normalizeText(nombre);
    if (normName && existingMapByName.has(normName)) {
      isDuplicate = true;
      duplicateReason = `Ya registrado con este nombre (${existingMapByName.get(normName)?.estatus})`;
    } else if (email && existingMapByEmail.has(email)) {
      isDuplicate = true;
      duplicateReason = `Mismo correo electrónico (${existingMapByEmail.get(email)?.nombre})`;
    } else if (telefono.length >= 8 && existingMapByPhone.has(telefono)) {
      isDuplicate = true;
      duplicateReason = `Mismo número de teléfono (${existingMapByPhone.get(telefono)?.nombre})`;
    }

    const id = `pend-drive-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;

    return {
      id,
      nombre,
      email,
      telefono,
      estatus,
      casa,
      generacion,
      rol,
      notas,
      fechaRegistro: new Date().toISOString().split("T")[0],
      contactadoWhatsApp: false,
      isDuplicate,
      duplicateReason,
      selected: !isDuplicate, // default select if not duplicate
    };
  });
}

/**
 * Builds SolicitudImportItem list with duplicate checking against existing records
 */
export function buildSolicitudesFromRows(
  rows: Record<string, string>[],
  mapping: FieldMapping,
  existingRecords: ReconocimientoRecord[],
  defaults: { diplomado: string; year: string; rol: string; grupo: string; zona: string }
): SolicitudImportItem[] {
  const existingMapByNameAndYear = new Map<string, ReconocimientoRecord>();
  const existingMapByEmail = new Map<string, ReconocimientoRecord>();

  existingRecords.forEach((r) => {
    if (r.nombre && r.year) {
      const key = `${normalizeText(r.nombre)}__${String(r.year).trim()}__${normalizeText(r.tipoImpresion || "")}`;
      existingMapByNameAndYear.set(key, r);
    }
    if (r.email) {
      existingMapByEmail.set(r.email.trim().toLowerCase(), r);
    }
  });

  return rows.map((row, idx) => {
    const rawNombre = mapping.nombre ? row[mapping.nombre] || "" : "";
    const rawRol = mapping.rol ? row[mapping.rol] || "" : "";
    const rawGrupo = mapping.grupo ? row[mapping.grupo] || "" : "";
    const rawZona = mapping.zona ? row[mapping.zona] || "" : "";
    const rawDiplomado = mapping.diplomado ? row[mapping.diplomado] || "" : "";
    const rawYear = mapping.year ? row[mapping.year] || "" : "";
    const rawTipo = mapping.tipoImpresion ? row[mapping.tipoImpresion] || "" : "";
    const rawCosto = mapping.costo ? row[mapping.costo] || "" : "";
    const rawTel = mapping.telefono ? row[mapping.telefono] || "" : "";
    const rawEmail = mapping.email ? row[mapping.email] || "" : "";
    const rawDrive = mapping.driveUrl ? row[mapping.driveUrl] || "" : "";
    const rawNotas = mapping.notas ? row[mapping.notas] || "" : "";

    const nombre = rawNombre.trim() || `Solicitud Fila ${idx + 1}`;
    const rol = rawRol.trim() || defaults.rol;
    const grupo = rawGrupo.trim() || defaults.grupo;
    const zona = rawZona.trim() || defaults.zona;
    const diplomado = rawDiplomado.trim() || defaults.diplomado;
    const year = rawYear.trim() || defaults.year;

    // Detect Tipo Impresión
    let tipoImpresion = "Primera Impresión";
    const normTipo = normalizeText(rawTipo);
    if (normTipo.includes("re") || normTipo.includes("segund") || normTipo.includes("copia")) {
      tipoImpresion = "Re-impresión";
    }

    // Costo
    let costo = tipoImpresion === "Primera Impresión" ? 100 : 50;
    if (rawCosto) {
      const numCosto = parseFloat(rawCosto.replace(/[^0-9.]/g, ""));
      if (!isNaN(numCosto) && numCosto > 0) {
        costo = numCosto;
      }
    }

    const telefono = cleanPhone(rawTel) || undefined;
    const email = rawEmail.trim().toLowerCase() || undefined;
    const driveUrl = rawDrive.trim() || undefined;
    const notas = rawNotas.trim() || undefined;

    const elaboradoDigital = mapping.elaboradoDigital ? parseBooleanValue(row[mapping.elaboradoDigital]) : false;
    const pagado = mapping.pagado ? parseBooleanValue(row[mapping.pagado]) : false;
    const cuadernillos = mapping.cuadernillos ? parseBooleanValue(row[mapping.cuadernillos]) : false;
    const audio = mapping.audio ? parseBooleanValue(row[mapping.audio]) : false;
    const digital = mapping.digital ? parseBooleanValue(row[mapping.digital]) : false;
    const impreso = mapping.impreso ? parseBooleanValue(row[mapping.impreso]) : false;
    const entregado = mapping.entregado ? parseBooleanValue(row[mapping.entregado]) : false;

    // Duplicate check
    let isDuplicate = false;
    let duplicateReason = "";
    const key = `${normalizeText(nombre)}__${year}__${normalizeText(tipoImpresion)}`;

    if (existingMapByNameAndYear.has(key)) {
      isDuplicate = true;
      const ex = existingMapByNameAndYear.get(key);
      duplicateReason = `Ya existe en el sistema (Gen ${ex?.year} - ${ex?.tipoImpresion})`;
    }

    const id = `rec-drive-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;

    return {
      id,
      nombre,
      rol,
      grupo,
      zona,
      diplomado,
      year,
      tipoImpresion,
      costo,
      telefono,
      email,
      driveUrl,
      notas,
      elaboradoDigital,
      pagado,
      cuadernillos,
      audio,
      digital,
      impreso,
      entregado,
      isDuplicate,
      duplicateReason,
      selected: !isDuplicate,
    };
  });
}
