export function normalizeSchoolName(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function displaySchoolName(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}