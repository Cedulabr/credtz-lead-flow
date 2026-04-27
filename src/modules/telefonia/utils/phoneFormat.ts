export function formatPhone(ddd?: string | null, numero?: string | null) {
  const d = (ddd || "").replace(/\D/g, "");
  const n = (numero || "").replace(/\D/g, "");
  if (!d && !n) return "—";
  if (!d) return n;
  if (n.length === 9) return `(${d}) ${n[0]} ${n.slice(1, 5)}-${n.slice(5)}`;
  if (n.length === 8) return `(${d}) ${n.slice(0, 4)}-${n.slice(4)}`;
  return `(${d}) ${n}`;
}

export function fullPhoneDigits(ddd?: string | null, numero?: string | null) {
  return `${(ddd || "").replace(/\D/g, "")}${(numero || "").replace(/\D/g, "")}`;
}
