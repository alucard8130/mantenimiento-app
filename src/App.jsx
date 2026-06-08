import { useState, useRef, useEffect, useCallback } from "react";

// ── FONTS ──────────────────────────────────────────────────────────────────────
const FONT_LINK = document.createElement("link");
FONT_LINK.rel = "stylesheet";
FONT_LINK.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap";
document.head.appendChild(FONT_LINK);

// ── HELPERS ───────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 9);
const fmtMXN = n => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };
const fmtDate = d => d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "";

// ── USER STORAGE (localStorage) ───────────────────────────────────────────────
const LS_USERS = "mantapp_users";
const LS_SESSION = "mantapp_session";

// Superusuario fijo — siempre existe, no se puede eliminar ni modificar
const SUPERUSER = {
  id: "superadmin",
  name: "Super Admin",
  email: "admin@mantapp.mx",
  password: "Alucard81@",
  role: "superadmin",
  avatar: "SA",
  createdAt: "2026-01-01",
  protected: true,
};

function loadUsers() {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_USERS)) || [];
    const others = stored.filter(u => u.id !== SUPERUSER.id);
    return [SUPERUSER, ...others];
  } catch { return [SUPERUSER]; }
}
function saveUsers(users) {
  // El superusuario nunca se guarda en localStorage, siempre viene del código
  localStorage.setItem(LS_USERS, JSON.stringify(users.filter(u => u.id !== SUPERUSER.id)));
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(LS_SESSION)) || null; } catch { return null; }
}
function saveSession(user) {
  if (user) localStorage.setItem(LS_SESSION, JSON.stringify(user));
  else localStorage.removeItem(LS_SESSION);
}
function makeAvatar(name) {
  return name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const INIT_CLIENTS = [
  { id: 1, name: "Constructora Vega S.A.", email: "vega@ejemplo.com", phone: "55 1234-5678", rfc: "CVE890101ABC", address: "Av. Insurgentes 456, CDMX", contact: "Ing. Pedro Vega", status: "activo" },
  { id: 2, name: "Inmobiliaria Torres", email: "torres@ejemplo.com", phone: "55 8765-4321", rfc: "ITO920315XYZ", address: "Blvd. Adolfo López 120, Guadalajara", contact: "Arq. María Torres", status: "activo" },
  { id: 3, name: "Hotel Palmas Real", email: "palmas@ejemplo.com", phone: "55 2222-3333", rfc: "HPR780630DEF", address: "Paseo de la Reforma 300, CDMX", contact: "Lic. Roberto Garza", status: "activo" },
];

const STATUS_CFG = {
  borrador:    { label: "Borrador",        color: "#94a3b8", bg: "#1e293b" },
  enviado:     { label: "Enviado",         color: "#60a5fa", bg: "#1e3a5f" },
  autorizado:  { label: "Autorizado",      color: "#34d399", bg: "#064e3b" },
  anticipo:    { label: "Anticipo OK",     color: "#a78bfa", bg: "#3b0764" },
  en_proceso:  { label: "En Proceso",      color: "#fb923c", bg: "#431407" },
  completado:  { label: "Completado",      color: "#22d3ee", bg: "#083344" },
  visto_bueno: { label: "Visto Bueno ✓",  color: "#4ade80", bg: "#14532d" },
  rechazado:   { label: "Rechazado",       color: "#f87171", bg: "#450a0a" },
};

const ACT_CFG = {
  pendiente:  { label: "Pendiente",  color: "#94a3b8" },
  en_curso:   { label: "En Curso",   color: "#fb923c" },
  completada: { label: "Completada", color: "#4ade80" },
};

const INIT_REPORTS = [{
  id: "r1", folio: "MNT-001", clientId: 1, assignedTo: 2, createdBy: "superadmin", createdByName: "Super Admin",
  title: "Impermeabilización Terraza Norte",
  description: "Filtraciones en terraza nivel 5. Requiere remoción de impermeabilizante, sellado de grietas y nueva membrana.",
  date: "2026-05-20", status: "en_proceso", photos: [],
  findings: [
    { id: "f1", desc: "Grietas en losa", severity: "alta" },
    { id: "f2", desc: "Impermeabilizante deteriorado 80%", severity: "alta" },
    { id: "f3", desc: "Humedad en muros laterales", severity: "media" },
  ],
  budget: {
    items: [
      { id: "b1", concept: "Remoción de impermeabilizante", unit: "m²", qty: 120, price: 85, total: 10200 },
      { id: "b2", concept: "Sellado de grietas (epóxico)", unit: "ml", qty: 45, price: 220, total: 9900 },
      { id: "b3", concept: "Membrana impermeabilizante", unit: "m²", qty: 120, price: 320, total: 38400 },
      { id: "b4", concept: "Mano de obra", unit: "global", qty: 1, price: 18000, total: 18000 },
    ],
    subtotal: 76500, iva: 12240, total: 88740,
    advancePct: 40, advancePaid: true, finalPaid: false,
  },
  schedule: [
    { id: "s1", activity: "Preparación y andamios", start: "2026-06-01", end: "2026-06-02", responsible: "Equipo A", status: "completada", progress: 100 },
    { id: "s2", activity: "Remoción impermeabilizante", start: "2026-06-03", end: "2026-06-05", responsible: "Equipo A", status: "completada", progress: 100 },
    { id: "s3", activity: "Sellado de grietas", start: "2026-06-06", end: "2026-06-07", responsible: "Equipo B", status: "en_curso", progress: 60 },
    { id: "s4", activity: "Aplicación membrana capa 1", start: "2026-06-09", end: "2026-06-10", responsible: "Equipo A", status: "pendiente", progress: 0 },
    { id: "s5", activity: "Aplicación membrana capa 2", start: "2026-06-11", end: "2026-06-12", responsible: "Equipo A", status: "pendiente", progress: 0 },
    { id: "s6", activity: "Prueba de hermeticidad", start: "2026-06-13", end: "2026-06-13", responsible: "Inspector", status: "pendiente", progress: 0 },
  ],
  timeline: [
    { date: "2026-05-20", event: "Reporte creado", user: "Carlos Mendoza" },
    { date: "2026-05-21", event: "Presupuesto enviado al cliente", user: "Carlos Mendoza" },
    { date: "2026-05-23", event: "Presupuesto autorizado por cliente", user: "Sistema" },
    { date: "2026-05-24", event: "Anticipo del 40% recibido ($35,496)", user: "Carlos Mendoza" },
    { date: "2026-06-01", event: "Trabajos iniciados", user: "Laura Ríos" },
  ],
}];

const INIT_NOTIFS = [
  { id: "n1", type: "warning", title: "Presupuesto pendiente", body: "MNT-001 lleva 3 días sin respuesta del cliente.", date: "2026-06-05", read: false, reportId: "r1" },
  { id: "n2", type: "success", title: "Anticipo recibido", body: "Se registró anticipo de $35,496 para MNT-001.", date: "2026-05-24", read: true, reportId: "r1" },
  { id: "n3", type: "info", title: "Actividad en curso", body: "Sellado de grietas al 60% — MNT-001.", date: "2026-06-06", read: false, reportId: "r1" },
];

// ── BASE STYLES ───────────────────────────────────────────────────────────────
const S = {
  card: { background: "#111827", border: "1px solid #1f2937", borderRadius: 14 },
  input: { width: "100%", background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "9px 12px", color: "#f9fafb", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif" },
  label: { display: "block", color: "#6b7280", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 5, textTransform: "uppercase" },
};

// ── TINY COMPONENTS ───────────────────────────────────────────────────────────
function Badge({ status, type = "r" }) {
  const cfg = type === "r" ? STATUS_CFG[status] : ACT_CFG[status];
  if (!cfg) return null;
  return <span style={{ background: cfg.bg || "#1f2937", color: cfg.color, border: `1px solid ${cfg.color}50`, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 700, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{cfg.label}</span>;
}

function Btn({ children, variant = "p", sm, style: s, ...p }) {
  const v = { p: { background: "#2563eb", color: "#fff" }, s: { background: "#15803d", color: "#fff" }, d: { background: "#dc2626", color: "#fff" }, g: { background: "transparent", color: "#9ca3af", border: "1px solid #374151" }, w: { background: "#b45309", color: "#fff" }, purple: { background: "#7c3aed", color: "#fff" }, cyan: { background: "#0e7490", color: "#fff" } };
  return <button {...p} style={{ ...(v[variant] || v.p), border: "none", borderRadius: 8, padding: sm ? "5px 12px" : "9px 18px", fontSize: sm ? 12 : 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: p.disabled ? 0.45 : 1, fontFamily: "DM Sans, sans-serif", whiteSpace: "nowrap", ...s }}>{children}</button>;
}

function Input({ label, ...p }) {
  return <div style={{ marginBottom: 13 }}>{label && <label style={S.label}>{label}</label>}<input {...p} style={{ ...S.input, ...p.style }} /></div>;
}

function Textarea({ label, ...p }) {
  return <div style={{ marginBottom: 13 }}>{label && <label style={S.label}>{label}</label>}<textarea {...p} style={{ ...S.input, resize: "vertical", minHeight: 80, ...p.style }} /></div>;
}

function Sel({ label, children, ...p }) {
  return <div style={{ marginBottom: 13 }}>{label && <label style={S.label}>{label}</label>}<select {...p} style={{ ...S.input, cursor: "pointer" }}>{children}</select></div>;
}

function ProgressBar({ value, color = "#2563eb" }) {
  return <div style={{ background: "#1f2937", borderRadius: 99, height: 5, overflow: "hidden" }}><div style={{ width: `${Math.min(value, 100)}%`, background: color, height: "100%", borderRadius: 99, transition: "width .4s" }} /></div>;
}

function Avatar({ initials, size = 32, color = "#2563eb" }) {
  return <div style={{ width: size, height: size, borderRadius: 99, background: `${color}30`, border: `1.5px solid ${color}60`, display: "flex", alignItems: "center", justifyContent: "center", color, fontWeight: 800, fontSize: size * 0.36, flexShrink: 0 }}>{initials}</div>;
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide, noPad }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000b0", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 18, width: "100%", maxWidth: wide ? 900 : 560, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px #000c" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #1f2937", flexShrink: 0 }}>
          <h3 style={{ margin: 0, color: "#f9fafb", fontSize: 16, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "#1f2937", border: "none", color: "#9ca3af", cursor: "pointer", width: 30, height: 30, borderRadius: 8, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: noPad ? 0 : 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: t.type === "success" ? "#14532d" : t.type === "error" ? "#450a0a" : "#1e3a5f", border: `1px solid ${t.type === "success" ? "#4ade80" : t.type === "error" ? "#f87171" : "#60a5fa"}50`, borderRadius: 10, padding: "12px 16px", color: "#f9fafb", fontSize: 13, fontWeight: 600, maxWidth: 320, boxShadow: "0 8px 24px #000a", animation: "slideIn .2s ease" }}>
          <span style={{ marginRight: 8 }}>{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}</span>{t.msg}
        </div>
      ))}
    </div>
  );
}

// ── PDF EXPORT ────────────────────────────────────────────────────────────────
function exportPDF(report, client, users) {
  const b = report.budget;
  const advance = b.total * (b.advancePct / 100);
  const assignedUser = users.find(u => u.id === report.assignedTo);
  const severityColor = s => s === "alta" ? "#ef4444" : s === "media" ? "#f59e0b" : "#22c55e";

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Presupuesto ${report.folio}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DM Sans', sans-serif; background: #fff; color: #111827; font-size: 13px; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 2px solid #1d4ed8; }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 44px; height: 44px; background: #1d4ed8; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
  .logo-text h1 { font-size: 18px; font-weight: 800; color: #111827; }
  .logo-text p { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .folio { text-align: right; }
  .folio .num { font-size: 22px; font-weight: 800; color: #1d4ed8; font-family: monospace; }
  .folio .date { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 10px; font-weight: 800; color: #1d4ed8; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .info-box { background: #f9fafb; border-radius: 8px; padding: 12px 14px; }
  .info-box label { font-size: 10px; color: #9ca3af; font-weight: 700; letter-spacing: 0.5px; display: block; margin-bottom: 4px; text-transform: uppercase; }
  .info-box span { font-weight: 700; color: #111827; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1d4ed8; color: #fff; padding: 9px 12px; font-size: 11px; font-weight: 700; text-align: left; letter-spacing: 0.3px; }
  th:last-child, td:last-child { text-align: right; }
  td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
  tr:nth-child(even) td { background: #fafafa; }
  .totals { margin-top: 12px; display: flex; justify-content: flex-end; }
  .totals-box { background: #f9fafb; border-radius: 10px; padding: 16px 20px; min-width: 260px; border: 1px solid #e5e7eb; }
  .tot-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .tot-row.total { font-size: 16px; font-weight: 800; color: #1d4ed8; border-top: 2px solid #e5e7eb; padding-top: 10px; margin-top: 4px; }
  .payments { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
  .pay-box { border-radius: 10px; padding: 14px; border: 1.5px solid; }
  .pay-box.advance { border-color: #7c3aed; background: #f5f3ff; }
  .pay-box.final { border-color: #0e7490; background: #ecfeff; }
  .pay-box .pay-label { font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
  .pay-box.advance .pay-label { color: #7c3aed; }
  .pay-box.final .pay-label { color: #0e7490; }
  .pay-box .pay-amount { font-size: 18px; font-weight: 800; color: #111827; }
  .pay-box .pay-note { font-size: 11px; color: #6b7280; margin-top: 4px; }
  .finding { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 6px; border-left: 3px solid; margin-bottom: 6px; background: #fafafa; }
  .footer { margin-top: 36px; padding-top: 18px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
  .footer-left { font-size: 11px; color: #9ca3af; }
  .signature-box { text-align: center; }
  .sig-line { width: 200px; border-bottom: 1px solid #9ca3af; margin-bottom: 6px; height: 40px; }
  .sig-label { font-size: 11px; color: #6b7280; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">
      <div class="logo-icon">🔧</div>
      <div class="logo-text"><h1>MantenimientoApp</h1><p>Gestión Profesional de Mantenimiento</p></div>
    </div>
    <div class="folio">
      <div class="num">${report.folio}</div>
      <div class="date">Fecha: ${fmtDate(report.date)}</div>
      <div class="date">Generado: ${fmtDate(today())}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Información del Proyecto</div>
    <div class="info-grid">
      <div class="info-box"><label>Título</label><span>${report.title}</span></div>
      <div class="info-box"><label>Estado</label><span>${STATUS_CFG[report.status]?.label || report.status}</span></div>
      <div class="info-box"><label>Cliente</label><span>${client?.name || "—"}</span></div>
      <div class="info-box"><label>Contacto</label><span>${client?.contact || "—"}</span></div>
      <div class="info-box"><label>RFC</label><span>${client?.rfc || "—"}</span></div>
      <div class="info-box"><label>Técnico Asignado</label><span>${assignedUser?.name || "—"}</span></div>
    </div>
  </div>

  ${report.description ? `
  <div class="section">
    <div class="section-title">Descripción / Observaciones</div>
    <div style="background:#f9fafb;border-radius:8px;padding:14px;color:#374151;line-height:1.7;">${report.description}</div>
  </div>` : ""}

  ${report.findings.length ? `
  <div class="section">
    <div class="section-title">Hallazgos Detectados</div>
    ${report.findings.map(f => `<div class="finding" style="border-color:${severityColor(f.severity)}">
      <span style="font-size:11px;font-weight:800;color:${severityColor(f.severity)};min-width:36px">${f.severity.toUpperCase()}</span>
      <span>${f.desc}</span>
    </div>`).join("")}
  </div>` : ""}

  ${b.items.length ? `
  <div class="section">
    <div class="section-title">Presupuesto Detallado</div>
    <table>
      <thead><tr><th>#</th><th>Concepto</th><th>Unidad</th><th>Cantidad</th><th>P. Unitario</th><th>Total</th></tr></thead>
      <tbody>
        ${b.items.map((item, i) => `<tr><td style="color:#9ca3af">${i + 1}</td><td><strong>${item.concept}</strong></td><td>${item.unit}</td><td>${item.qty}</td><td>${fmtMXN(item.price)}</td><td><strong>${fmtMXN(item.total)}</strong></td></tr>`).join("")}
      </tbody>
    </table>
    <div class="totals">
      <div class="totals-box">
        <div class="tot-row"><span style="color:#6b7280">Subtotal</span><span>${fmtMXN(b.subtotal)}</span></div>
        <div class="tot-row"><span style="color:#6b7280">IVA (16%)</span><span>${fmtMXN(b.iva)}</span></div>
        <div class="tot-row total"><span>TOTAL</span><span>${fmtMXN(b.total)}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Condiciones de Pago</div>
    <div class="payments">
      <div class="pay-box advance">
        <div class="pay-label">Anticipo Requerido (${b.advancePct}%)</div>
        <div class="pay-amount">${fmtMXN(b.total * b.advancePct / 100)}</div>
        <div class="pay-note">A pagar al autorizar el presupuesto${b.advancePaid ? " — ✓ PAGADO" : ""}</div>
      </div>
      <div class="pay-box final">
        <div class="pay-label">Pago Final (${100 - b.advancePct}%)</div>
        <div class="pay-amount">${fmtMXN(b.total * (100 - b.advancePct) / 100)}</div>
        <div class="pay-note">Al concluir los trabajos y dar visto bueno${b.finalPaid ? " — ✓ PAGADO" : ""}</div>
      </div>
    </div>
  </div>` : ""}

  <div class="footer">
    <div class="footer-left">
      <div style="font-weight:700;color:#374151;margin-bottom:4px">MantenimientoApp · ${today()}</div>
      <div>Este documento es una propuesta formal de servicios de mantenimiento.</div>
      <div>Vigencia: 30 días naturales a partir de la fecha de emisión.</div>
    </div>
    <div class="signature-box">
      <div class="sig-line"></div>
      <div class="sig-label">Firma de Autorización del Cliente</div>
      <div class="sig-label" style="margin-top:3px">${client?.contact || "Representante Legal"}</div>
    </div>
  </div>
</div>
</body>
</html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.print(); }, 600);
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH SCREEN (LOGIN + REGISTER)
// ══════════════════════════════════════════════════════════════════════════════
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "tecnico" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function handleLogin() {
    if (!form.email || !form.password) return setError("Completa todos los campos");
    setLoading(true); setError("");
    setTimeout(() => {
      const users = loadUsers();
      const u = users.find(u => u.email.toLowerCase() === form.email.toLowerCase() && u.password === form.password);
      if (u) { saveSession(u); onLogin(u); }
      else { setError("Correo o contraseña incorrectos"); setLoading(false); }
    }, 500);
  }

  function handleRegister() {
    if (!form.name.trim()) return setError("Ingresa tu nombre completo");
    if (!form.email.trim()) return setError("Ingresa tu correo electrónico");
    if (!/\S+@\S+\.\S+/.test(form.email)) return setError("Correo electrónico inválido");
    if (form.password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres");
    if (form.password !== form.confirm) return setError("Las contraseñas no coinciden");
    setLoading(true); setError("");
    setTimeout(() => {
      const users = loadUsers();
      if (users.find(u => u.email.toLowerCase() === form.email.toLowerCase()))
        return (setError("Ya existe una cuenta con ese correo"), setLoading(false));
      // Primer usuario registrado (aparte del superusuario) es admin automáticamente
      const nonSuper = users.filter(u => u.id !== SUPERUSER.id);
      const isFirst = nonSuper.length === 0;
      const newUser = {
        id: genId(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: isFirst ? "admin" : form.role,
        avatar: makeAvatar(form.name),
        createdAt: today(),
        protected: false,
      };
      const updated = [...users, newUser];
      saveUsers(updated);
      saveSession(newUser);
      onLogin(newUser);
    }, 500);
  }

  const inputStyle = { ...S.input, marginBottom: 0 };

  return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Sans, sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 50%, #1d4ed820 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #7c3aed15 0%, transparent 50%)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 440, padding: 24 }}>

        {/* LOGO */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 66, height: 66, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 16px", boxShadow: "0 0 48px #2563eb40" }}>🔧</div>
          <h1 style={{ color: "#f9fafb", fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>MantenimientoApp</h1>
          <p style={{ color: "#4b5563", fontSize: 13, marginTop: 6 }}>Gestión profesional de mantenimiento</p>
        </div>

        {/* CARD */}
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 20, padding: 32, boxShadow: "0 28px 70px #000a" }}>

          {/* TABS */}
          <div style={{ display: "flex", background: "#1f2937", borderRadius: 12, padding: 4, marginBottom: 28 }}>
            {[["login", "Iniciar Sesión"], ["register", "Crear Cuenta"]].map(([k, l]) => (
              <button key={k} onClick={() => { setMode(k); setError(""); }} style={{ flex: 1, background: mode === k ? "#2563eb" : "none", border: "none", borderRadius: 9, padding: "9px", color: mode === k ? "#fff" : "#6b7280", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif", transition: "all .2s" }}>{l}</button>
            ))}
          </div>

          {mode === "login" ? (
            <div>
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Correo electrónico</label>
                <input value={form.email} onChange={e => f("email", e.target.value)} placeholder="tu@correo.com" type="email" style={inputStyle} onKeyDown={e => e.key === "Enter" && handleLogin()} />
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={S.label}>Contraseña</label>
                <input value={form.password} onChange={e => f("password", e.target.value)} placeholder="••••••••" type="password" style={inputStyle} onKeyDown={e => e.key === "Enter" && handleLogin()} />
              </div>
              {error && <ErrBox msg={error} />}
              <AuthBtn onClick={handleLogin} loading={loading}>Iniciar Sesión</AuthBtn>
              <p style={{ textAlign: "center", color: "#4b5563", fontSize: 13, marginTop: 18, marginBottom: 0 }}>
                ¿No tienes cuenta?{" "}
                <span onClick={() => { setMode("register"); setError(""); }} style={{ color: "#2563eb", cursor: "pointer", fontWeight: 700 }}>Regístrate gratis</span>
              </p>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Nombre completo</label>
                <input value={form.name} onChange={e => f("name", e.target.value)} placeholder="Juan Pérez García" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Correo electrónico</label>
                <input value={form.email} onChange={e => f("email", e.target.value)} placeholder="tu@correo.com" type="email" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={S.label}>Contraseña</label>
                  <input value={form.password} onChange={e => f("password", e.target.value)} placeholder="Mín. 6 caracteres" type="password" style={inputStyle} />
                </div>
                <div>
                  <label style={S.label}>Confirmar contraseña</label>
                  <input value={form.confirm} onChange={e => f("confirm", e.target.value)} placeholder="Repite la contraseña" type="password" style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={S.label}>Perfil</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[["admin", "👑 Administrador", "Acceso completo"], ["tecnico", "🔧 Técnico", "Gestión de reportes"]].map(([val, lbl, desc]) => (
                    <div key={val} onClick={() => f("role", val)} style={{ background: form.role === val ? "#1e3a5f" : "#1f2937", border: `1.5px solid ${form.role === val ? "#2563eb" : "#374151"}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", transition: "all .15s" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: form.role === val ? "#60a5fa" : "#f9fafb" }}>{lbl}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{desc}</div>
                    </div>
                  ))}
                </div>
                <p style={{ color: "#4b5563", fontSize: 11, marginTop: 8, marginBottom: 0 }}>
                  💡 El primer usuario registrado será <strong style={{ color: "#6b7280" }}>Administrador</strong> automáticamente.
                </p>
              </div>
              {error && <ErrBox msg={error} />}
              <AuthBtn onClick={handleRegister} loading={loading}>Crear mi cuenta</AuthBtn>
              <p style={{ textAlign: "center", color: "#4b5563", fontSize: 13, marginTop: 18, marginBottom: 0 }}>
                ¿Ya tienes cuenta?{" "}
                <span onClick={() => { setMode("login"); setError(""); }} style={{ color: "#2563eb", cursor: "pointer", fontWeight: 700 }}>Inicia sesión</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrBox({ msg }) {
  return <div style={{ background: "#450a0a", border: "1px solid #f8717140", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{msg}</div>;
}
function AuthBtn({ children, onClick, loading }) {
  return <button onClick={onClick} disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "DM Sans, sans-serif", boxShadow: "0 4px 20px #2563eb40" }}>{loading ? "Un momento…" : children}</button>;
}

// ══════════════════════════════════════════════════════════════════════════════
// USERS MODULE
// ══════════════════════════════════════════════════════════════════════════════
function UsersModule({ users, setUsers, currentUser, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "tecnico" });
  const ROLE_CFG = {
    superadmin: { label: "⭐ Super Admin", color: "#f59e0b", bg: "#451a03" },
    admin:      { label: "👑 Admin",       color: "#a78bfa", bg: "#2e1065" },
    tecnico:    { label: "🔧 Técnico",     color: "#60a5fa", bg: "#1e3a5f" },
  };

  function openNew() { setForm({ name: "", email: "", password: "", role: "tecnico" }); setEditing(null); setShowForm(true); }
  function openEdit(u) {
    if (u.protected) return toast("El superusuario no se puede editar", "error");
    setForm({ name: u.name, email: u.email, password: u.password, role: u.role });
    setEditing(u.id);
    setShowForm(true);
  }
  function del(id) {
    const u = users.find(x => x.id === id);
    if (u?.protected) return toast("El superusuario no se puede eliminar", "error");
    if (id === currentUser.id) return toast("No puedes eliminar tu propia cuenta", "error");
    const updated = users.filter(x => x.id !== id);
    setUsers(updated); saveUsers(updated); toast("Usuario eliminado", "success");
  }
  function save() {
    if (!form.name.trim()) return toast("Ingresa el nombre", "error");
    if (!form.email.trim()) return toast("Ingresa el correo", "error");
    if (!/\S+@\S+\.\S+/.test(form.email)) return toast("Correo inválido", "error");
    if (!editing && form.password.length < 6) return toast("Contraseña mínimo 6 caracteres", "error");
    if (users.find(u => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== editing))
      return toast("Ya existe un usuario con ese correo", "error");
    let updated;
    if (editing) {
      updated = users.map(u => u.id === editing ? { ...u, name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password || u.password, role: form.role, avatar: makeAvatar(form.name) } : u);
      toast("Usuario actualizado", "success");
    } else {
      const newU = { id: genId(), name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password, role: form.role, avatar: makeAvatar(form.name), createdAt: today(), protected: false };
      updated = [...users, newU];
      toast("Usuario creado", "success");
    }
    setUsers(updated); saveUsers(updated); setShowForm(false);
  }

  return (
    <div>
      {showForm && (
        <Modal title={editing ? "✏️ Editar Usuario" : "➕ Nuevo Usuario"} onClose={() => setShowForm(false)}>
          <Input label="Nombre completo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Juan Pérez" />
          <Input label="Correo electrónico" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="usuario@empresa.com" />
          <Input label={editing ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mín. 6 caracteres" />
          <div style={{ marginBottom: 20 }}>
            <label style={S.label}>Perfil</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["admin", "👑 Administrador", "Acceso completo"], ["tecnico", "🔧 Técnico", "Gestión de reportes"]].map(([val, lbl, desc]) => (
                <div key={val} onClick={() => setForm({ ...form, role: val })} style={{ background: form.role === val ? "#1e3a5f" : "#1f2937", border: `1.5px solid ${form.role === val ? "#2563eb" : "#374151"}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: form.role === val ? "#60a5fa" : "#f9fafb" }}>{lbl}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="g" onClick={() => setShowForm(false)}>Cancelar</Btn>
            <Btn variant="s" onClick={save}>✓ Guardar</Btn>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f9fafb" }}>Usuarios</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>{users.length} usuarios registrados</p>
        </div>
        <Btn variant="p" onClick={openNew}>+ Nuevo Usuario</Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {users.map(u => {
          const rc = ROLE_CFG[u.role] || ROLE_CFG.tecnico;
          const isMe = u.id === currentUser.id;
          return (
            <div key={u.id} style={{ ...S.card, padding: "16px 20px", display: "flex", gap: 14, alignItems: "center", borderColor: u.protected ? "#f59e0b30" : "#1f2937" }}>
              <Avatar initials={u.avatar} size={44} color={u.protected ? "#f59e0b" : "#2563eb"} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, color: "#f9fafb", fontSize: 15 }}>{u.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: rc.color, background: rc.bg, padding: "2px 8px", borderRadius: 99 }}>{rc.label}</span>
                  {isMe && <span style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", background: "#14532d", padding: "2px 8px", borderRadius: 99 }}>Tú</span>}
                  {u.protected && <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "#451a03", padding: "2px 8px", borderRadius: 99 }}>🔒 Protegido</span>}
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#6b7280" }}>
                  <span>✉ {u.email}</span>
                  {u.createdAt && <span>📅 Desde {fmtDate(u.createdAt)}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="g" sm onClick={() => openEdit(u)} style={{ opacity: u.protected ? 0.35 : 1 }}>✏️</Btn>
                <Btn variant="d" sm onClick={() => del(u.id)} style={{ opacity: (u.protected || isMe) ? 0.35 : 1 }}>🗑</Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CLIENTS MODULE
// ══════════════════════════════════════════════════════════════════════════════
function ClientsModule({ clients, setClients, reports, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", rfc: "", address: "", contact: "", status: "activo" });

  function openNew() { setForm({ name: "", email: "", phone: "", rfc: "", address: "", contact: "", status: "activo" }); setEditing(null); setShowForm(true); }
  function openEdit(c) { setForm({ ...c }); setEditing(c.id); setShowForm(true); }
  function save() {
    if (!form.name) return toast("Ingresa el nombre del cliente", "error");
    if (editing) { setClients(clients.map(c => c.id === editing ? { ...c, ...form } : c)); toast("Cliente actualizado", "success"); }
    else { setClients([...clients, { ...form, id: genId() }]); toast("Cliente creado", "success"); }
    setShowForm(false);
  }
  function del(id) {
    if (reports.some(r => r.clientId === id)) return toast("Este cliente tiene reportes asociados", "error");
    setClients(clients.filter(c => c.id !== id)); toast("Cliente eliminado", "success");
  }

  const filtered = clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {showForm && (
        <Modal title={editing ? "✏️ Editar Cliente" : "➕ Nuevo Cliente"} onClose={() => setShowForm(false)}>
          <Input label="Razón Social / Nombre" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Empresa S.A. de C.V." />
          <Input label="Correo Electrónico" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" placeholder="contacto@empresa.com" />
          <Input label="Teléfono" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="55 1234-5678" />
          <Input label="RFC" value={form.rfc} onChange={e => setForm({ ...form, rfc: e.target.value })} placeholder="ABC890101XYZ" />
          <Input label="Persona de Contacto" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Nombre del responsable" />
          <Textarea label="Dirección" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Calle, número, colonia, ciudad" />
          <Sel label="Estado" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
          </Sel>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="g" onClick={() => setShowForm(false)}>Cancelar</Btn>
            <Btn variant="s" onClick={save}>✓ Guardar</Btn>
          </div>
        </Modal>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f9fafb" }}>Clientes</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>{clients.length} clientes registrados</p>
        </div>
        <Btn variant="p" onClick={openNew}>+ Nuevo Cliente</Btn>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Buscar cliente…" style={{ ...S.input, marginBottom: 16 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(c => {
          const cReports = reports.filter(r => r.clientId === c.id);
          return (
            <div key={c.id} style={{ ...S.card, padding: "16px 20px", display: "flex", gap: 14, alignItems: "center" }}>
              <Avatar initials={c.name.split(" ").map(w => w[0]).join("").slice(0, 2)} size={44} color="#2563eb" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 800, color: "#f9fafb", fontSize: 15 }}>{c.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: c.status === "activo" ? "#4ade80" : "#6b7280", background: c.status === "activo" ? "#14532d" : "#1f2937", padding: "1px 7px", borderRadius: 99 }}>{c.status}</span>
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#6b7280", flexWrap: "wrap" }}>
                  {c.email && <span>✉ {c.email}</span>}
                  {c.phone && <span>📞 {c.phone}</span>}
                  {c.contact && <span>👤 {c.contact}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#6b7280", fontSize: 10 }}>Reportes</div>
                  <div style={{ color: "#60a5fa", fontWeight: 800, fontSize: 18 }}>{cReports.length}</div>
                </div>
                <Btn variant="g" sm onClick={() => openEdit(c)}>✏️</Btn>
                <Btn variant="d" sm onClick={() => del(c.id)}>🗑</Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS MODULE
// ══════════════════════════════════════════════════════════════════════════════
function NotificationsPanel({ notifs, setNotifs, onSelectReport }) {
  const unread = notifs.filter(n => !n.read).length;
  function markAll() { setNotifs(notifs.map(n => ({ ...n, read: true }))); }
  function mark(id) { setNotifs(notifs.map(n => n.id === id ? { ...n, read: true } : n)); }
  function del(id) { setNotifs(notifs.filter(n => n.id !== id)); }

  const icon = t => t === "success" ? "✓" : t === "warning" ? "⚠" : t === "error" ? "✕" : "ℹ";
  const color = t => t === "success" ? "#4ade80" : t === "warning" ? "#fbbf24" : t === "error" ? "#f87171" : "#60a5fa";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f9fafb" }}>Notificaciones</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>{unread} sin leer</p>
        </div>
        {unread > 0 && <Btn variant="g" sm onClick={markAll}>✓ Marcar todas como leídas</Btn>}
      </div>
      {notifs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#4b5563" }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🔔</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#6b7280" }}>Sin notificaciones</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notifs.map(n => (
            <div key={n.id} onClick={() => { mark(n.id); if (n.reportId && onSelectReport) onSelectReport(n.reportId); }}
              style={{ ...S.card, padding: "14px 18px", display: "flex", gap: 14, alignItems: "flex-start", cursor: "pointer", borderColor: !n.read ? `${color(n.type)}30` : "#1f2937", opacity: n.read ? 0.6 : 1, transition: "opacity .2s" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color(n.type)}20`, display: "flex", alignItems: "center", justifyContent: "center", color: color(n.type), fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{icon(n.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, color: "#f9fafb", fontSize: 14 }}>{n.title}</span>
                  {!n.read && <span style={{ width: 7, height: 7, borderRadius: 99, background: color(n.type), display: "inline-block" }} />}
                </div>
                <p style={{ margin: 0, color: "#9ca3af", fontSize: 13 }}>{n.body}</p>
                <div style={{ color: "#4b5563", fontSize: 11, marginTop: 4 }}>{fmtDate(n.date)}</div>
              </div>
              <button onClick={e => { e.stopPropagation(); del(n.id); }} style={{ background: "none", border: "none", color: "#374151", cursor: "pointer", fontSize: 14, padding: 4 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORT FORMS
// ══════════════════════════════════════════════════════════════════════════════
function NewReportModal({ onClose, onSave, clients, users, currentUser }) {
  const isAdmin = ["admin","superadmin"].includes(currentUser.role);
  const [form, setForm] = useState({ clientId: "", title: "", description: "", date: today(), assignedTo: isAdmin ? "" : currentUser.id });
  const [findings, setFindings] = useState([{ id: genId(), desc: "", severity: "media" }]);
  const [photos, setPhotos] = useState([]);
  const fileRef = useRef();

  function handlePhoto(e) {
    Array.from(e.target.files).forEach(f => {
      const r = new FileReader();
      r.onload = ev => setPhotos(p => [...p, { id: genId(), url: ev.target.result, name: f.name }]);
      r.readAsDataURL(f);
    });
  }

  function save() {
    if (!form.clientId || !form.title) return alert("Completa cliente y título");
    if (isAdmin && !form.assignedTo) return alert("Selecciona el técnico asignado");
    const assignedTo = isAdmin ? parseInt(form.assignedTo) : currentUser.id;
    const assignedUser = users.find(u => u.id === assignedTo);
    const folio = "MNT-" + String(Math.floor(Math.random() * 9000) + 1000);
    onSave({ id: genId(), folio, ...form, clientId: form.clientId, assignedTo, assignedToName: assignedUser?.name || "", createdBy: currentUser.id, createdByName: currentUser.name, status: "borrador", photos, findings, budget: { items: [], subtotal: 0, iva: 0, total: 0, advancePct: 50, advancePaid: false, finalPaid: false }, schedule: [], timeline: [{ date: today(), event: "Reporte creado", user: currentUser.name }] });
  }

  return (
    <Modal title="📋 Nuevo Reporte de Mantenimiento" onClose={onClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <Sel label="Cliente" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
            <option value="">Seleccionar…</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Sel>
          <Input label="Título del Reporte" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ej. Reparación techo edificio A" />
          <Input label="Fecha de Inspección" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          {isAdmin ? (
            <Sel label="Técnico Asignado" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">Seleccionar técnico…</option>
              {users.filter(u => u.role === "tecnico").map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Sel>
          ) : (
            <div style={{ marginBottom: 13 }}>
              <label style={S.label}>Técnico Asignado</label>
              <div style={{ ...S.input, background: "#111827", color: "#6b7280", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🔒</span> {currentUser.name} <span style={{ fontSize: 11, color: "#4b5563" }}>(tú)</span>
              </div>
            </div>
          )}
        </div>
        <div>
          <Textarea label="Descripción / Observaciones" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe los hallazgos generales…" style={{ minHeight: 130 }} />
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Fotos ({photos.length})</label>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} style={{ display: "none" }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {photos.map(p => (
                <div key={p.id} style={{ position: "relative" }}>
                  <img src={p.url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #374151" }} />
                  <button onClick={() => setPhotos(photos.filter(x => x.id !== p.id))} style={{ position: "absolute", top: -6, right: -6, background: "#dc2626", border: "none", borderRadius: 99, color: "#fff", width: 18, height: 18, cursor: "pointer", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
              ))}
              <button onClick={() => fileRef.current.click()} style={{ width: 64, height: 64, border: "2px dashed #374151", borderRadius: 8, background: "none", color: "#4b5563", cursor: "pointer", fontSize: 22 }}>+</button>
            </div>
          </div>
        </div>
      </div>
      <div>
        <label style={S.label}>Hallazgos</label>
        {findings.map((f, i) => (
          <div key={f.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={f.desc} onChange={e => setFindings(findings.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} placeholder={`Hallazgo ${i + 1}`} style={{ ...S.input, flex: 1 }} />
            <select value={f.severity} onChange={e => setFindings(findings.map((x, j) => j === i ? { ...x, severity: e.target.value } : x))} style={{ ...S.input, width: 90 }}>
              <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option>
            </select>
            <button onClick={() => setFindings(findings.filter((_, j) => j !== i))} style={{ background: "#dc262640", border: "none", borderRadius: 8, color: "#f87171", padding: "0 12px", cursor: "pointer" }}>✕</button>
          </div>
        ))}
        <Btn variant="g" sm onClick={() => setFindings([...findings, { id: genId(), desc: "", severity: "media" }])}>+ Agregar hallazgo</Btn>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid #1f2937", marginTop: 16 }}>
        <Btn variant="g" onClick={onClose}>Cancelar</Btn>
        <Btn variant="p" onClick={save}>💾 Guardar Reporte</Btn>
      </div>
    </Modal>
  );
}

// ── BUDGET ────────────────────────────────────────────────────────────────────
function BudgetModal({ report, onClose, onSave }) {
  const [items, setItems] = useState(report.budget.items.length ? report.budget.items : [{ id: genId(), concept: "", unit: "m²", qty: 1, price: 0, total: 0 }]);
  const [pct, setPct] = useState(report.budget.advancePct || 50);

  function upd(i, f, v) {
    const u = items.map((x, j) => { if (j !== i) return x; const n = { ...x, [f]: (f === "qty" || f === "price") ? parseFloat(v) || 0 : v }; n.total = n.qty * n.price; return n; });
    setItems(u);
  }

  const sub = items.reduce((s, x) => s + (x.total || 0), 0);
  const iva = sub * 0.16;
  const total = sub + iva;

  return (
    <Modal title="💰 Editar Presupuesto" onClose={onClose} wide>
      <div style={{ overflowX: "auto", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: "#1f2937" }}>
            {["Concepto", "Unidad", "Cantidad", "P. Unitario", "Total", ""].map(h => <th key={h} style={{ padding: "8px 10px", color: "#6b7280", fontWeight: 700, textAlign: "left" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #1f2937" }}>
                <td style={{ padding: "5px 6px" }}><input value={item.concept} onChange={e => upd(i, "concept", e.target.value)} style={{ ...S.input, minWidth: 150 }} /></td>
                <td style={{ padding: "5px 6px" }}>
                  <select value={item.unit} onChange={e => upd(i, "unit", e.target.value)} style={{ ...S.input, width: 70 }}>
                    {["m²", "m³", "ml", "kg", "pieza", "global", "hr", "día"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </td>
                <td style={{ padding: "5px 6px" }}><input type="number" value={item.qty} onChange={e => upd(i, "qty", e.target.value)} style={{ ...S.input, width: 70 }} /></td>
                <td style={{ padding: "5px 6px" }}><input type="number" value={item.price} onChange={e => upd(i, "price", e.target.value)} style={{ ...S.input, width: 100 }} /></td>
                <td style={{ padding: "5px 6px", color: "#4ade80", fontWeight: 700, whiteSpace: "nowrap" }}>{fmtMXN(item.total)}</td>
                <td style={{ padding: "5px 6px" }}><button onClick={() => setItems(items.filter((_, j) => j !== i))} style={{ background: "#dc262630", border: "none", borderRadius: 6, color: "#f87171", padding: "4px 8px", cursor: "pointer" }}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Btn variant="g" sm onClick={() => setItems([...items, { id: genId(), concept: "", unit: "m²", qty: 1, price: 0, total: 0 }])} style={{ marginTop: 10 }}>+ Agregar partida</Btn>
      </div>
      <div style={{ display: "flex", gap: 16, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <div style={{ background: "#1f2937", borderRadius: 10, padding: 14, minWidth: 220 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#9ca3af", marginBottom: 6 }}><span>Subtotal</span><span>{fmtMXN(sub)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#9ca3af", marginBottom: 6 }}><span>IVA 16%</span><span>{fmtMXN(iva)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, color: "#4ade80", borderTop: "1px solid #374151", paddingTop: 10 }}><span>TOTAL</span><span>{fmtMXN(total)}</span></div>
        </div>
        <div style={{ background: "#1f2937", borderRadius: 10, padding: 14, minWidth: 220 }}>
          <label style={S.label}>Anticipo requerido</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="range" min={10} max={80} value={pct} onChange={e => setPct(parseInt(e.target.value))} style={{ flex: 1 }} />
            <span style={{ color: "#a78bfa", fontWeight: 800, fontSize: 18, minWidth: 38 }}>{pct}%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginTop: 6 }}>
            <span>Anticipo:</span><span style={{ color: "#a78bfa", fontWeight: 700 }}>{fmtMXN(total * pct / 100)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
            <span>Resto:</span><span style={{ color: "#9ca3af", fontWeight: 700 }}>{fmtMXN(total * (100 - pct) / 100)}</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 16 }}>
        <Btn variant="g" onClick={onClose}>Cancelar</Btn>
        <Btn variant="s" onClick={() => onSave({ ...report.budget, items, subtotal: sub, iva, total, advancePct: pct })}>✓ Guardar Presupuesto</Btn>
      </div>
    </Modal>
  );
}

// ── SCHEDULE ──────────────────────────────────────────────────────────────────
function ScheduleModal({ report, onClose, onSave }) {
  const [acts, setActs] = useState(report.schedule.length ? report.schedule : [{ id: genId(), activity: "", start: today(), end: addDays(today(), 1), responsible: "", status: "pendiente", progress: 0 }]);
  function upd(i, f, v) { setActs(acts.map((x, j) => j === i ? { ...x, [f]: v } : x)); }
  const overall = acts.length ? Math.round(acts.reduce((s, a) => s + (a.progress || 0), 0) / acts.length) : 0;

  return (
    <Modal title="📅 Cronograma de Actividades" onClose={onClose} wide>
      <div style={{ background: "#1f2937", borderRadius: 10, padding: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1 }}><ProgressBar value={overall} color="#2563eb" /></div>
        <span style={{ color: "#2563eb", fontWeight: 800, fontSize: 18 }}>{overall}% general</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {acts.map((a, i) => (
          <div key={a.id} style={{ background: "#1f2937", borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={a.activity} onChange={e => upd(i, "activity", e.target.value)} placeholder="Nombre de la actividad" style={{ ...S.input, flex: 1 }} />
              <select value={a.status} onChange={e => upd(i, "status", e.target.value)} style={{ ...S.input, width: 120, color: ACT_CFG[a.status]?.color }}>
                <option value="pendiente">Pendiente</option><option value="en_curso">En Curso</option><option value="completada">Completada</option>
              </select>
              <button onClick={() => setActs(acts.filter((_, j) => j !== i))} style={{ background: "#dc262630", border: "none", borderRadius: 8, color: "#f87171", padding: "0 12px", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div><label style={{ ...S.label, fontSize: 10 }}>INICIO</label><input type="date" value={a.start} onChange={e => upd(i, "start", e.target.value)} style={{ ...S.input, marginTop: 4 }} /></div>
              <div><label style={{ ...S.label, fontSize: 10 }}>FIN</label><input type="date" value={a.end} onChange={e => upd(i, "end", e.target.value)} style={{ ...S.input, marginTop: 4 }} /></div>
              <div><label style={{ ...S.label, fontSize: 10 }}>RESPONSABLE</label><input value={a.responsible} onChange={e => upd(i, "responsible", e.target.value)} placeholder="Equipo / persona" style={{ ...S.input, marginTop: 4 }} /></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#6b7280", fontSize: 12 }}>Avance</span>
              <input type="range" min={0} max={100} value={a.progress} onChange={e => upd(i, "progress", parseInt(e.target.value))} style={{ flex: 1 }} />
              <span style={{ color: "#4ade80", fontWeight: 700, minWidth: 34 }}>{a.progress}%</span>
            </div>
            <ProgressBar value={a.progress} color={a.status === "completada" ? "#4ade80" : a.status === "en_curso" ? "#fb923c" : "#374151"} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <Btn variant="g" sm onClick={() => setActs([...acts, { id: genId(), activity: "", start: today(), end: addDays(today(), 1), responsible: "", status: "pendiente", progress: 0 }])}>+ Actividad</Btn>
        <div style={{ flex: 1 }} />
        <Btn variant="g" onClick={onClose}>Cancelar</Btn>
        <Btn variant="s" onClick={() => onSave(acts)}>✓ Guardar</Btn>
      </div>
    </Modal>
  );
}

// ── REPORT DETAIL ─────────────────────────────────────────────────────────────
function ReportDetail({ report, clients, users, currentUser, onClose, onUpdate, addNotif, toast }) {
  const [tab, setTab] = useState("overview");
  const [showBudget, setShowBudget] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const client = clients.find(c => c.id === report.clientId);
  const assigned = users.find(u => u.id === report.assignedTo);
  const b = report.budget;
  const advance = b.total * (b.advancePct / 100);
  const overall = report.schedule.length ? Math.round(report.schedule.reduce((s, a) => s + (a.progress || 0), 0) / report.schedule.length) : 0;

  function addEvent(event) { onUpdate({ ...report, timeline: [...report.timeline, { date: today(), event, user: currentUser.name }] }); }

  function action(type) {
    const updates = {
      send:       [{ status: "enviado" },    `Presupuesto enviado a ${client?.name}`, { type: "info", title: "Presupuesto enviado", body: `${report.folio} enviado a ${client?.name} por ${fmtMXN(b.total)}` }],
      authorize:  [{ status: "autorizado" }, "Presupuesto autorizado por cliente", { type: "success", title: "¡Presupuesto autorizado!", body: `${client?.name} autorizó el presupuesto de ${report.folio}` }],
      reject:     [{ status: "rechazado" },  "Presupuesto rechazado por cliente", { type: "error", title: "Presupuesto rechazado", body: `${client?.name} rechazó el presupuesto de ${report.folio}` }],
      advance:    [{ status: "anticipo", budget: { ...b, advancePaid: true } }, `Anticipo del ${b.advancePct}% recibido (${fmtMXN(advance)})`, { type: "success", title: "Anticipo recibido", body: `Se registró anticipo de ${fmtMXN(advance)} para ${report.folio}` }],
      start:      [{ status: "en_proceso" }, "Trabajos iniciados", { type: "info", title: "Trabajos iniciados", body: `${report.folio} — Los trabajos han comenzado` }],
      complete:   [{ status: "completado" }, "Trabajos concluidos, esperando visto bueno", { type: "info", title: "Trabajos concluidos", body: `${report.folio} completado. Pendiente visto bueno del cliente.` }],
      visto_bueno:[{ status: "visto_bueno", budget: { ...b, finalPaid: true } }, "Cliente dio visto bueno ✓ y pago final recibido", { type: "success", title: "¡Visto bueno recibido! ⭐", body: `${report.folio} finalizado. Pago final registrado.` }],
    };
    const [upd, event, notif] = updates[type];
    onUpdate({ ...report, ...upd, timeline: [...report.timeline, { date: today(), event, user: currentUser.name }] });
    if (notif) addNotif({ id: genId(), ...notif, date: today(), read: false, reportId: report.id });
    toast(event, "success");
  }

  const TABS = [["overview", "📋 Reporte"], ["presupuesto", "💰 Presupuesto"], ["cronograma", "📅 Cronograma"], ["timeline", "🕐 Seguimiento"]];

  return (
    <Modal title={`${report.folio} · ${report.title}`} onClose={onClose} wide>
      {showBudget && <BudgetModal report={report} onClose={() => setShowBudget(false)} onSave={bd => { onUpdate({ ...report, budget: { ...report.budget, ...bd } }); setShowBudget(false); toast("Presupuesto guardado", "success"); }} />}
      {showSchedule && <ScheduleModal report={report} onClose={() => setShowSchedule(false)} onSave={sc => { onUpdate({ ...report, schedule: sc }); setShowSchedule(false); toast("Cronograma guardado", "success"); }} />}

      {/* TABS */}
      <div style={{ display: "flex", borderBottom: "1px solid #1f2937", overflowX: "auto", flexShrink: 0, padding: "0 4px" }}>
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} style={{ background: "none", border: "none", color: tab === k ? "#2563eb" : "#6b7280", borderBottom: `2px solid ${tab === k ? "#2563eb" : "transparent"}`, padding: "11px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", fontFamily: "DM Sans, sans-serif" }}>{l}</button>)}
      </div>

      <div style={{ padding: 20 }}>
        {/* ACTIONS */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", background: "#111827", borderRadius: 10, padding: 12, alignItems: "center" }}>
          <Badge status={report.status} />
          <div style={{ flex: 1 }} />
          {report.status === "borrador" && b.total > 0 && <Btn variant="p" sm onClick={() => action("send")}>📤 Enviar al Cliente</Btn>}
          {report.status === "enviado" && <><Btn variant="s" sm onClick={() => action("authorize")}>✓ Autorizado</Btn><Btn variant="d" sm onClick={() => action("reject")}>✕ Rechazado</Btn></>}
          {report.status === "autorizado" && <Btn variant="purple" sm onClick={() => action("advance")}>💳 Registrar Anticipo</Btn>}
          {report.status === "anticipo" && <Btn variant="w" sm onClick={() => action("start")}>🔧 Iniciar Trabajos</Btn>}
          {report.status === "en_proceso" && <Btn variant="p" sm onClick={() => action("complete")}>✅ Marcar Concluido</Btn>}
          {report.status === "completado" && <Btn variant="s" sm onClick={() => action("visto_bueno")}>⭐ Visto Bueno</Btn>}
          {b.total > 0 && <Btn variant="cyan" sm onClick={() => exportPDF(report, client, users)}>📄 Exportar PDF</Btn>}
        </div>

        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                ["Cliente",    client?.name,               client?.email],
                ["Creado por", report.createdByName || "—", "Técnico autor"],
                ["Asignado a", assigned?.name || "—",       assigned?.role || ""],
                ["Inspección", fmtDate(report.date),        `Folio: ${report.folio}`],
              ].map(([l, v, s]) => (
                <div key={l} style={{ background: "#1f2937", borderRadius: 10, padding: 12 }}>
                  <div style={{ color: "#6b7280", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>{l.toUpperCase()}</div>
                  <div style={{ color: l === "Creado por" ? "#60a5fa" : "#f9fafb", fontWeight: 700 }}>{v}</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>{s}</div>
                </div>
              ))}
            </div>
            {report.description && <div style={{ background: "#1f2937", borderRadius: 10, padding: 14, marginBottom: 14 }}><label style={S.label}>Descripción</label><p style={{ margin: 0, color: "#9ca3af", fontSize: 13, lineHeight: 1.7 }}>{report.description}</p></div>}
            {report.findings.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Hallazgos</label>
                {report.findings.map(f => {
                  const sc = { alta: "#ef4444", media: "#f59e0b", baja: "#22c55e" }[f.severity];
                  return <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#1f2937", borderRadius: 8, marginBottom: 6, borderLeft: `3px solid ${sc}` }}>
                    <span style={{ fontSize: 13, color: "#f9fafb", flex: 1 }}>{f.desc}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: sc, background: `${sc}20`, padding: "2px 8px", borderRadius: 99 }}>{f.severity.toUpperCase()}</span>
                  </div>;
                })}
              </div>
            )}
            {report.photos.length > 0 && (
              <div><label style={S.label}>Evidencia Fotográfica ({report.photos.length})</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {report.photos.map(p => <img key={p.id} src={p.url} alt="" style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 8, border: "1px solid #374151" }} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "presupuesto" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
              <Btn variant="g" sm onClick={() => setShowBudget(true)}>✏️ Editar</Btn>
              {b.total > 0 && <Btn variant="cyan" sm onClick={() => exportPDF(report, client, users)}>📄 Exportar PDF</Btn>}
            </div>
            {b.items.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#4b5563" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
                <div style={{ marginBottom: 14 }}>Presupuesto vacío</div>
                <Btn variant="p" onClick={() => setShowBudget(true)}>Crear Presupuesto</Btn>
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 14 }}>
                  <thead><tr style={{ background: "#1f2937" }}>
                    {["Concepto", "Unidad", "Cant.", "P.U.", "Total"].map(h => <th key={h} style={{ padding: "8px 12px", color: "#6b7280", textAlign: "left" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>{b.items.map(item => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #1f2937" }}>
                      <td style={{ padding: "8px 12px", color: "#f9fafb" }}>{item.concept}</td>
                      <td style={{ padding: "8px 12px", color: "#9ca3af" }}>{item.unit}</td>
                      <td style={{ padding: "8px 12px", color: "#9ca3af" }}>{item.qty}</td>
                      <td style={{ padding: "8px 12px", color: "#9ca3af" }}>{fmtMXN(item.price)}</td>
                      <td style={{ padding: "8px 12px", color: "#4ade80", fontWeight: 700 }}>{fmtMXN(item.total)}</td>
                    </tr>
                  ))}</tbody>
                </table>
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <div style={{ background: "#1f2937", borderRadius: 10, padding: 14, minWidth: 230 }}>
                    {[["Subtotal", b.subtotal, "#9ca3af"], ["IVA 16%", b.iva, "#9ca3af"], ["TOTAL", b.total, "#4ade80"]].map(([l, v, c]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, borderTop: l === "TOTAL" ? "1px solid #374151" : "none", paddingTop: l === "TOTAL" ? 8 : 0, fontWeight: l === "TOTAL" ? 800 : 400, fontSize: l === "TOTAL" ? 16 : 13 }}>
                        <span style={{ color: c }}>{l}</span><span style={{ color: c }}>{fmtMXN(v)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#1f2937", borderRadius: 10, padding: 14, minWidth: 230 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: "#9ca3af" }}>Anticipo ({b.advancePct}%)</span>
                      <span style={{ color: b.advancePaid ? "#4ade80" : "#a78bfa", fontWeight: 700 }}>{fmtMXN(advance)} {b.advancePaid ? "✓" : ""}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#9ca3af" }}>Resto al finalizar</span>
                      <span style={{ color: b.finalPaid ? "#4ade80" : "#9ca3af", fontWeight: 700 }}>{fmtMXN(b.total - advance)} {b.finalPaid ? "✓" : ""}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "cronograma" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#6b7280", fontSize: 13 }}>Avance general:</span>
                <span style={{ color: "#2563eb", fontWeight: 800, fontSize: 20 }}>{overall}%</span>
              </div>
              <Btn variant="g" sm onClick={() => setShowSchedule(true)}>✏️ Editar</Btn>
            </div>
            <ProgressBar value={overall} />
            <div style={{ marginTop: 14 }}>
              {report.schedule.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#4b5563" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                  <Btn variant="p" onClick={() => setShowSchedule(true)}>Crear Cronograma</Btn>
                </div>
              ) : report.schedule.map((a, i) => (
                <div key={a.id} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 99, background: a.status === "completada" ? "#15803d" : a.status === "en_curso" ? "#b45309" : "#1f2937", border: `2px solid ${ACT_CFG[a.status]?.color || "#374151"}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>{i + 1}</div>
                    {i < report.schedule.length - 1 && <div style={{ width: 2, flex: 1, background: "#1f2937", minHeight: 16 }} />}
                  </div>
                  <div style={{ flex: 1, background: "#1f2937", borderRadius: 10, padding: 12, marginBottom: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: "#f9fafb", fontWeight: 700 }}>{a.activity}</span>
                      <Badge status={a.status} type="a" />
                    </div>
                    <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                      <span>📅 {fmtDate(a.start)} → {fmtDate(a.end)}</span>
                      <span>👤 {a.responsible}</span>
                    </div>
                    <ProgressBar value={a.progress} color={a.status === "completada" ? "#4ade80" : a.status === "en_curso" ? "#fb923c" : "#374151"} />
                    <div style={{ textAlign: "right", fontSize: 11, color: "#6b7280", marginTop: 3 }}>{a.progress}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "timeline" && (
          <div>
            <div style={{ paddingLeft: 24, position: "relative" }}>
              {report.timeline.map((t, i) => (
                <div key={i} style={{ position: "relative", marginBottom: 18 }}>
                  <div style={{ position: "absolute", left: -24, top: 5, width: 10, height: 10, borderRadius: 99, background: "#2563eb", border: "2px solid #1d4ed8" }} />
                  {i < report.timeline.length - 1 && <div style={{ position: "absolute", left: -20, top: 16, width: 2, height: "calc(100% + 10px)", background: "#1f2937" }} />}
                  <div style={{ fontSize: 11, color: "#4b5563", marginBottom: 2 }}>{fmtDate(t.date)} · <span style={{ color: "#6b7280" }}>{t.user}</span></div>
                  <div style={{ color: "#f9fafb", fontSize: 13 }}>{t.event}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid #1f2937", paddingTop: 14, marginTop: 8 }}>
              <label style={S.label}>Agregar nota de seguimiento</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input id="note-in" placeholder="Ej. Se realizó llamada con el cliente…" style={{ ...S.input, flex: 1 }} />
                <Btn variant="p" onClick={() => { const el = document.getElementById("note-in"); if (el.value.trim()) { addEvent(el.value.trim()); el.value = ""; } }}>Agregar</Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => loadSession());
  const [users, setUsers] = useState(() => loadUsers());
  const [reports, setReports] = useState(INIT_REPORTS);
  const [clients, setClients] = useState(INIT_CLIENTS);
  const [notifs, setNotifs] = useState(INIT_NOTIFS);
  const [toasts, setToasts] = useState([]);
  const [section, setSection] = useState("reportes");
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [search, setSearch] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);

  const toast = useCallback((msg, type = "success") => {
    const id = genId();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  const addNotif = useCallback(n => setNotifs(prev => [n, ...prev]), []);

  const unread = notifs.filter(n => !n.read).length;

  function saveReport(r) { setReports(p => [r, ...p]); setShowNew(false); toast(`Reporte ${r.folio} creado`); }
  function updateReport(r) { setReports(p => p.map(x => x.id === r.id ? r : x)); if (selected?.id === r.id) setSelected(r); }

  const filtered = reports.filter(r => {
    const ok1 = filterStatus === "todos" || r.status === filterStatus;
    const cl = clients.find(c => c.id === r.clientId);
    const ok2 = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.folio.toLowerCase().includes(search.toLowerCase()) || cl?.name.toLowerCase().includes(search.toLowerCase());
    return ok1 && ok2;
  });

  const stats = {
    total: reports.length,
    activos: reports.filter(r => ["en_proceso", "anticipo"].includes(r.status)).length,
    pendAuth: reports.filter(r => ["borrador", "enviado"].includes(r.status)).length,
    facturado: reports.filter(r => r.status === "visto_bueno").reduce((s, r) => s + r.budget.total, 0),
  };

  if (!currentUser) return <AuthScreen onLogin={u => { setUsers(loadUsers()); setCurrentUser(u); }} />;

  const isAdmin = ["admin","superadmin"].includes(currentUser.role);
  const NAV = [
    { id: "reportes", icon: "📋", label: "Reportes" },
    { id: "clientes", icon: "🏢", label: "Clientes" },
    { id: "notificaciones", icon: "🔔", label: "Alertas", badge: unread },
    ...(isAdmin ? [{ id: "usuarios", icon: "👥", label: "Usuarios" }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#030712", fontFamily: "DM Sans, sans-serif", color: "#f9fafb" }}>
      <style>{`* { box-sizing: border-box; } @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } } input[type=range] { accent-color: #2563eb; } select option { background: #1f2937; }`}</style>
      <Toast toasts={toasts} />

      {/* HEADER */}
      <div style={{ background: "#070d1b", borderBottom: "1px solid #111827", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", gap: 16, height: 58 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 16 }}>
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔧</div>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#f9fafb" }}>MantenimientoApp</span>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setSection(n.id)} style={{ background: section === n.id ? "#1f2937" : "none", border: "none", color: section === n.id ? "#2563eb" : "#6b7280", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", gap: 5, position: "relative" }}>
                {n.icon} {n.label}
                {n.badge > 0 && <span style={{ background: "#dc2626", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 800, padding: "0 5px", minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{n.badge}</span>}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar initials={currentUser.avatar} size={32} color="#2563eb" />
            <div style={{ fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: "#f9fafb" }}>{currentUser.name}</div>
              <div style={{ fontSize: 10, color: currentUser.role === "superadmin" ? "#f59e0b" : "#6b7280", fontWeight: currentUser.role === "superadmin" ? 700 : 400 }}>
                {currentUser.role === "superadmin" ? "⭐ Super Admin" : currentUser.role}
              </div>
            </div>
            <button onClick={() => { saveSession(null); setCurrentUser(null); }} style={{ background: "#1f2937", border: "none", color: "#9ca3af", cursor: "pointer", borderRadius: 7, padding: "5px 10px", fontSize: 12, fontFamily: "DM Sans, sans-serif" }}>Salir</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
        {section === "clientes" && <ClientsModule clients={clients} setClients={setClients} reports={reports} toast={toast} />}
        {section === "notificaciones" && <NotificationsPanel notifs={notifs} setNotifs={setNotifs} onSelectReport={id => { const r = reports.find(x => x.id === id); if (r) { setSelected(r); setSection("reportes"); } }} />}
        {section === "usuarios" && isAdmin && <UsersModule users={users} setUsers={setUsers} currentUser={currentUser} toast={toast} />}

        {section === "reportes" && (
          <>
            {/* STATS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { l: "TOTAL REPORTES", v: stats.total, ic: "📋", c: "#2563eb" },
                { l: "EN PROCESO", v: stats.activos, ic: "🔧", c: "#f59e0b" },
                { l: "POR AUTORIZAR", v: stats.pendAuth, ic: "⏳", c: "#a78bfa" },
                { l: "FACTURADO", v: fmtMXN(stats.facturado), ic: "💰", c: "#4ade80" },
              ].map(({ l, v, ic, c }) => (
                <div key={l} style={{ ...S.card, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: `${c}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{ic}</div>
                  <div><div style={{ color: "#6b7280", fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>{l}</div><div style={{ color: "#f9fafb", fontSize: 20, fontWeight: 800, marginTop: 2 }}>{v}</div></div>
                </div>
              ))}
            </div>

            {/* FILTERS */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Buscar por folio, título o cliente…" style={{ ...S.input, flex: 1, minWidth: 200 }} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...S.input, width: "auto" }}>
                <option value="todos">Todos los estados</option>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <Btn variant="p" onClick={() => setShowNew(true)}>+ Nuevo Reporte</Btn>
            </div>

            {/* REPORT LIST */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "70px 0", color: "#4b5563" }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🗂️</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Sin reportes</div>
                <Btn variant="p" onClick={() => setShowNew(true)}>Crear primer reporte</Btn>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.map(r => {
                  const cl = clients.find(c => c.id === r.clientId);
                  const prog = r.schedule.length ? Math.round(r.schedule.reduce((s, a) => s + (a.progress || 0), 0) / r.schedule.length) : null;
                  const as = users.find(u => u.id === r.assignedTo);
                  return (
                    <div key={r.id} onClick={() => setSelected(r)} style={{ ...S.card, padding: "14px 18px", cursor: "pointer", display: "flex", gap: 14, alignItems: "center", transition: "border-color .15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#2563eb"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "#1f2937"}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <span style={{ color: "#4b5563", fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>{r.folio}</span>
                          <Badge status={r.status} />
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#f9fafb", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#6b7280", flexWrap: "wrap" }}>
                          <span>🏢 {cl?.name}</span>
                          <span>📅 {fmtDate(r.date)}</span>
                          {r.createdByName && <span title="Creado por">✍️ {r.createdByName}</span>}
                          {as && as.id !== r.createdBy && <span title="Asignado a">👤 {as.name}</span>}
                          {r.findings.filter(f => f.severity === "alta").length > 0 && <span style={{ color: "#f87171" }}>🔴 {r.findings.filter(f => f.severity === "alta").length} críticos</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
                        {r.budget.total > 0 && <div style={{ textAlign: "right" }}>
                          <div style={{ color: "#6b7280", fontSize: 10 }}>Presupuesto</div>
                          <div style={{ color: "#4ade80", fontWeight: 800, fontSize: 15 }}>{fmtMXN(r.budget.total)}</div>
                        </div>}
                        {prog !== null && <div style={{ width: 60 }}>
                          <div style={{ color: "#6b7280", fontSize: 10, marginBottom: 4, textAlign: "center" }}>Avance</div>
                          <div style={{ color: "#2563eb", fontWeight: 800, fontSize: 14, textAlign: "center" }}>{prog}%</div>
                          <ProgressBar value={prog} />
                        </div>}
                        <span style={{ color: "#374151", fontSize: 18 }}>›</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {showNew && <NewReportModal onClose={() => setShowNew(false)} onSave={saveReport} clients={clients} users={users} currentUser={currentUser} />}
      {selected && <ReportDetail report={selected} clients={clients} users={users} currentUser={currentUser} onClose={() => setSelected(null)} onUpdate={r => { updateReport(r); setSelected(r); }} addNotif={addNotif} toast={toast} />}
    </div>
  );
}
