export function idr(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}
export function fmtDate(d: Date | string) {
  const x = new Date(d);
  return x.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export function fmtDateShort(d: Date | string) {
  const x = new Date(d);
  return x.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
export function toInputDate(d: Date | string) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
export function monthKey(d: Date | string = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}
