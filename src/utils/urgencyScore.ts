import { TaskItem } from "../types";

export interface UrgencyDetails {
  score: number;
  level: "critica" | "alta" | "media" | "baja";
  label: string;
  badgeClass: string;
  badgeBg: string;
  deadlineText?: string;
  isOverdue: boolean;
  daysRemaining: number | null;
  reasons: string[];
}

/**
 * Calculates a numerical Urgency Score (0 to 100+) for a task
 * based on its deadline (fechaLimite), assigned tags (etiquetas), and status.
 *
 * Supports both signatures:
 * - calculateUrgencyScore(task: TaskItem): number
 * - calculateUrgencyScore(deadline?: string | null, tags?: string[], status?: string): number
 */
export function calculateUrgencyScore(
  taskOrDeadline?: TaskItem | string | null,
  assignedTags?: string[],
  taskStatus?: string
): number {
  let deadlineStr: string | undefined = undefined;
  let tags: string[] = [];
  let status: string | undefined = undefined;

  if (taskOrDeadline && typeof taskOrDeadline === "object") {
    const task = taskOrDeadline as TaskItem;
    deadlineStr = task.fechaLimite;
    tags = task.etiquetas || [];
    status = task.estado;
  } else {
    deadlineStr = typeof taskOrDeadline === "string" ? taskOrDeadline : undefined;
    tags = assignedTags || [];
    status = taskStatus;
  }

  if (status === "Completado") {
    // Completed tasks have lowest urgency
    return 0;
  }

  let score = 0;

  // 1. Deadline Component (Up to 65 points)
  if (deadlineStr && deadlineStr.trim()) {
    const deadline = parseTaskDate(deadlineStr);
    if (deadline) {
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const targetMidnight = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()).getTime();
      const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Overdue: 60 base points + 5 points for each overdue day (capped at 80)
        score += Math.min(80, 60 + Math.abs(diffDays) * 5);
      } else if (diffDays === 0) {
        // Due TODAY
        score += 55;
      } else if (diffDays === 1) {
        // Due TOMORROW
        score += 45;
      } else if (diffDays <= 3) {
        // Due in 2-3 days
        score += 35;
      } else if (diffDays <= 7) {
        // Due in 4-7 days
        score += 20;
      } else {
        // Due in more than a week
        score += 8;
      }
    } else {
      score += 10;
    }
  } else {
    // No deadline specified - baseline
    score += 5;
  }

  // 2. Assigned Tags Component (Up to 45 points)
  let tagBonus = 0;
  if (tags && tags.length > 0) {
    for (const tag of tags) {
      const lower = tag.toLowerCase().trim();
      if (
        lower.includes("urgente") ||
        lower.includes("crítico") ||
        lower.includes("critico") ||
        lower.includes("asap") ||
        lower.includes("inmediato") ||
        lower.includes("emergencia") ||
        lower.includes("express")
      ) {
        tagBonus += 40;
      } else if (
        lower.includes("importante") ||
        lower.includes("alta") ||
        lower.includes("prioridad alta") ||
        lower.includes("vital") ||
        lower.includes("hoy")
      ) {
        tagBonus += 30;
      } else if (
        lower.includes("pendiente") ||
        lower.includes("media") ||
        lower.includes("revisión") ||
        lower.includes("revision") ||
        lower.includes("seguimiento")
      ) {
        tagBonus += 15;
      } else if (
        lower.includes("baja") ||
        lower.includes("delegado") ||
        lower.includes("opcional")
      ) {
        tagBonus += 5;
      } else {
        tagBonus += 5;
      }
    }
  }
  // Cap tag bonus to prevent runaway scores
  score += Math.min(45, tagBonus);

  // 3. Status adjustment
  if (status === "En Proceso") {
    score += 5;
  }

  // Ensure score is at least 0
  return Math.max(0, Math.round(score));
}

/**
 * Parses various date formats commonly used in task deadlines
 */
function parseTaskDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // Try standard ISO or YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day);
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const latamMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (latamMatch) {
    const day = parseInt(latamMatch[1], 10);
    const month = parseInt(latamMatch[2], 10) - 1;
    const year = parseInt(latamMatch[3], 10);
    return new Date(year, month, day);
  }

  // Fallback to Date.parse
  const timestamp = Date.parse(trimmed);
  if (!isNaN(timestamp)) {
    return new Date(timestamp);
  }

  return null;
}

/**
 * Returns complete UI details and breakdown for a task's urgency
 */
export function getTaskUrgencyDetails(task: TaskItem): UrgencyDetails {
  const score = calculateUrgencyScore(task);
  const reasons: string[] = [];
  let isOverdue = false;
  let daysRemaining: number | null = null;
  let deadlineText: string | undefined = undefined;

  if (task.estado === "Completado") {
    return {
      score: 0,
      level: "baja",
      label: "Completada",
      badgeClass: "bg-stone-100 text-stone-500 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700",
      badgeBg: "bg-stone-100 dark:bg-stone-800",
      isOverdue: false,
      daysRemaining: null,
      reasons: ["Tarea terminada"],
    };
  }

  if (task.fechaLimite && task.fechaLimite.trim()) {
    const d = parseTaskDate(task.fechaLimite);
    if (d) {
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const targetMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      daysRemaining = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

      if (daysRemaining < 0) {
        isOverdue = true;
        const absDays = Math.abs(daysRemaining);
        deadlineText = `Vencida hace ${absDays} día${absDays === 1 ? "" : "s"}`;
        reasons.push(`¡Vencida! (+${Math.min(80, 60 + absDays * 5)} pts)`);
      } else if (daysRemaining === 0) {
        deadlineText = "Vence HOY";
        reasons.push("Vence hoy (+55 pts)");
      } else if (daysRemaining === 1) {
        deadlineText = "Vence mañana";
        reasons.push("Vence mañana (+45 pts)");
      } else {
        deadlineText = `Vence en ${daysRemaining} días`;
        reasons.push(`Fecha límite: ${task.fechaLimite} (+${daysRemaining <= 3 ? 35 : 20} pts)`);
      }
    }
  }

  if (task.etiquetas && task.etiquetas.length > 0) {
    const highTags = task.etiquetas.filter((t) => {
      const l = t.toLowerCase();
      return l.includes("urgente") || l.includes("crítico") || l.includes("importante") || l.includes("alta");
    });
    if (highTags.length > 0) {
      reasons.push(`Etiqueta de alta prioridad: ${highTags.join(", ")}`);
    }
  }

  let level: UrgencyDetails["level"] = "baja";
  let label = "Normal";
  let badgeClass = "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700";
  let badgeBg = "bg-stone-100 dark:bg-stone-800";

  if (score >= 75) {
    level = "critica";
    label = "Crítica";
    badgeClass = "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800 ring-1 ring-rose-500/30";
    badgeBg = "bg-rose-500 text-white";
  } else if (score >= 50) {
    level = "alta";
    label = "Alta";
    badgeClass = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800 ring-1 ring-amber-500/30";
    badgeBg = "bg-amber-500 text-stone-950";
  } else if (score >= 25) {
    level = "media";
    label = "Media";
    badgeClass = "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-800";
    badgeBg = "bg-blue-500 text-white";
  }

  return {
    score,
    level,
    label,
    badgeClass,
    badgeBg,
    deadlineText,
    isOverdue,
    daysRemaining,
    reasons,
  };
}
