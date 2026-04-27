export function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

export function formatCpf(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 11);
  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "-" + p4;
  return out;
}

export function isValidCpf(v: string) {
  return onlyDigits(v).length === 11;
}

export function maskCpfDisplay(v: string) {
  return formatCpf(v);
}
