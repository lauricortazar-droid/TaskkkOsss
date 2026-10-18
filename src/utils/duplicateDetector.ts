export interface DuplicateGroup<T> {
  id: string;
  reason: "nombre" | "telefono" | "email";
  matchValue: string;
  items: T[];
}

export function normalizeNameForComparison(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function cleanPhoneForComparison(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/[^0-9]/g, "");
  // Return last 10 digits (standard Mexican mobile or standard national number)
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function cleanEmailForComparison(email?: string): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

export interface DuplicateDetectionResult<T> {
  groups: DuplicateGroup<T>[];
  duplicateIdSet: Set<string>;
  totalDuplicates: number;
}

export function detectDuplicates<T>(
  items: T[],
  extract: (item: T) => {
    id: string;
    nombre: string;
    telefono?: string;
    email?: string;
  }
): DuplicateDetectionResult<T> {
  const groups: DuplicateGroup<T>[] = [];
  const duplicateIdSet = new Set<string>();

  const byName = new Map<string, T[]>();
  const byPhone = new Map<string, T[]>();
  const byEmail = new Map<string, T[]>();

  for (const item of items) {
    const { nombre, telefono, email } = extract(item);

    const normName = normalizeNameForComparison(nombre);
    if (normName.length >= 4) {
      if (!byName.has(normName)) byName.set(normName, []);
      byName.get(normName)!.push(item);
    }

    const normPhone = cleanPhoneForComparison(telefono);
    if (normPhone.length >= 8) {
      if (!byPhone.has(normPhone)) byPhone.set(normPhone, []);
      byPhone.get(normPhone)!.push(item);
    }

    const normEmail = cleanEmailForComparison(email);
    if (normEmail && normEmail.includes("@")) {
      if (!byEmail.has(normEmail)) byEmail.set(normEmail, []);
      byEmail.get(normEmail)!.push(item);
    }
  }

  // Group by name
  byName.forEach((list, key) => {
    if (list.length > 1) {
      const first = extract(list[0]);
      groups.push({
        id: `name-${key}`,
        reason: "nombre",
        matchValue: first.nombre,
        items: list,
      });
      list.forEach((it) => duplicateIdSet.add(extract(it).id));
    }
  });

  // Group by phone
  byPhone.forEach((list, key) => {
    if (list.length > 1) {
      const hasUnmatched = list.some((it) => !duplicateIdSet.has(extract(it).id));
      if (hasUnmatched) {
        const first = extract(list[0]);
        groups.push({
          id: `phone-${key}`,
          reason: "telefono",
          matchValue: first.telefono || key,
          items: list,
        });
        list.forEach((it) => duplicateIdSet.add(extract(it).id));
      }
    }
  });

  // Group by email
  byEmail.forEach((list, key) => {
    if (list.length > 1) {
      const hasUnmatched = list.some((it) => !duplicateIdSet.has(extract(it).id));
      if (hasUnmatched) {
        const first = extract(list[0]);
        groups.push({
          id: `email-${key}`,
          reason: "email",
          matchValue: first.email || key,
          items: list,
        });
        list.forEach((it) => duplicateIdSet.add(extract(it).id));
      }
    }
  });

  return {
    groups,
    duplicateIdSet,
    totalDuplicates: duplicateIdSet.size,
  };
}
