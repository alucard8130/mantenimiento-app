import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { t } from "./i18n";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";


const isNative = () => { try { return Capacitor.isNativePlatform(); } catch(e) { return false; } };

// Global translation helper — uses window.__lang set at login
function T(key) {
  return t(window.__lang || "es", key);
}

// ── FONTS ─────────────────────────────────────────────────────────────────────
const FL = document.createElement("link");
FL.rel = "stylesheet";
FL.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap";
document.head.appendChild(FL);

// ── SUPABASE CLIENT ───────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// ── SUPERUSUARIO ──────────────────────────────────────────────────────────────
const SUPERUSER = {
  id: "superadmin",
  name: process.env.REACT_APP_SUPER_NAME || "Super Admin",
  email: process.env.REACT_APP_SUPER_EMAIL || "",
  password: process.env.REACT_APP_SUPER_PASSWORD || "",
  role: "superadmin",
  avatar: (process.env.REACT_APP_SUPER_NAME || "SA").trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
  protected: true,
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const genId   = () => Math.random().toString(36).slice(2, 9);
const fmtMXN  = n => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
const today   = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };
const fmtDate = d => d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "";
const mkFolio = () => "MNT-" + String(Math.floor(Math.random() * 9000) + 1000);
const mkAvatar = name => name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
const isSuperEmail = email => email?.toLowerCase() === SUPERUSER.email?.toLowerCase();

// ── MEMBERSHIP CONFIG ────────────────────────────────────────────────────────
const PLANS = {
  tecnico:     { label: "Plan Técnico",     price: 19.99, currency: "USD", desc: "Acceso individual completo" },
  empresarial: { label: "Plan Empresarial", price: 39.99, currency: "USD", desc: "Incluye 2 técnicos gratis" },
  tecnico_extra: { label: "Técnico Extra",  price: 15.99, currency: "USD", desc: "Por técnico adicional" },
};

function daysLeft(expiresAt) {
  if (!expiresAt) return 0;
  const diff = new Date(expiresAt) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

async function createCheckoutSession(profileId, plan, extraTecnicos = 0) {
  const res = await fetch(
    `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-checkout`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        profileId,
        plan,
        extraTecnicos,
        successUrl: window.location.origin + "?payment=success",
        cancelUrl: window.location.origin + "?payment=canceled",
      }),
    }
  );
  const data = await res.json();
  if (data.url) window.location.href = data.url;
  return data;
}

// ── TAX CONFIG ───────────────────────────────────────────────────────────────
// Tax rates by language/country
const TAX_RATES = {
  es: { rate: 0.16, label: "IVA 16%",      name: "IVA"        },
  en: { rate: 0,    label: "Tax (0%)",      name: "Tax"        },
  // When user sets their own tax rate it overrides this
};
function getTax(lang) { return TAX_RATES[lang] || TAX_RATES.es; }

// ── CONFIG ────────────────────────────────────────────────────────────────────
function getStatusCFG() {
  return {
    borrador:    { label: T("statusDraft"),     color: "#94a3b8", bg: "#1e293b" },
    enviado:     { label: T("statusSent"),      color: "#60a5fa", bg: "#1e3a5f" },
    autorizado:  { label: T("statusAuthorized"),color: "#34d399", bg: "#064e3b" },
    anticipo:    { label: T("statusAdvance"),   color: "#a78bfa", bg: "#3b0764" },
    en_proceso:  { label: T("statusInProcess"), color: "#fb923c", bg: "#431407" },
    completado:  { label: T("statusCompleted"), color: "#22d3ee", bg: "#083344" },
    visto_bueno: { label: T("statusApproved"),  color: "#4ade80", bg: "#14532d" },
    rechazado:   { label: T("statusRejected"),  color: "#f87171", bg: "#450a0a" },
  };
}
// Keep STATUS_CFG as alias for PDF export (uses fixed ES labels)
const STATUS_CFG = {
  borrador:    { label: "Borrador",       color: "#94a3b8", bg: "#1e293b" },
  enviado:     { label: "Enviado",        color: "#60a5fa", bg: "#1e3a5f" },
  autorizado:  { label: "Autorizado",     color: "#34d399", bg: "#064e3b" },
  anticipo:    { label: "Anticipo OK",    color: "#a78bfa", bg: "#3b0764" },
  en_proceso:  { label: "En Proceso",     color: "#fb923c", bg: "#431407" },
  completado:  { label: "Completado",     color: "#22d3ee", bg: "#083344" },
  visto_bueno: { label: "Visto Bueno ✓", color: "#4ade80", bg: "#14532d" },
  rechazado:   { label: "Rechazado",      color: "#f87171", bg: "#450a0a" },
};
function getActCFG() {
  return {
    pendiente:  { label: T("statusPending"),    color: "#94a3b8" },
    en_curso:   { label: T("statusInProgress"), color: "#fb923c" },
    completada: { label: T("statusDone"),        color: "#4ade80" },
  };
}
const ACT_CFG = {
  pendiente:  { label: "Pendiente",  color: "#94a3b8" },
  en_curso:   { label: "En Curso",   color: "#fb923c" },
  completada: { label: "Completada", color: "#4ade80" },
};

// ── BASE STYLES ───────────────────────────────────────────────────────────────
const S = {
  card:  { background: "#111827", border: "1px solid #1f2937", borderRadius: 14 },
  input: { width: "100%", background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "9px 12px", color: "#f9fafb", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif" },
  label: { display: "block", color: "#6b7280", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 5, textTransform: "uppercase" },
};

// ══════════════════════════════════════════════════════════════════════════════
// TINY UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
function Badge({ status, type = "r" }) {
  const cfg = type === "r" ? getStatusCFG()[status] : getActCFG()[status];
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
  return <div style={{ background: "#1f2937", borderRadius: 99, height: 5, overflow: "hidden" }}><div style={{ width: `${Math.min(value || 0, 100)}%`, background: color, height: "100%", borderRadius: 99, transition: "width .4s" }} /></div>;
}
function Avatar({ initials, size = 32, color = "#2563eb" }) {
  return <div style={{ width: size, height: size, borderRadius: 99, background: `${color}30`, border: `1.5px solid ${color}60`, display: "flex", alignItems: "center", justifyContent: "center", color, fontWeight: 800, fontSize: size * 0.36, flexShrink: 0 }}>{initials}</div>;
}
function Spinner() {
  return <div style={{ width: 20, height: 20, border: "2px solid #374151", borderTop: "2px solid #2563eb", borderRadius: 99, animation: "spin .7s linear infinite" }} />;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000b0", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 18, width: "100%", maxWidth: wide ? 1100 : 560, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px #000c" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #1f2937", flexShrink: 0 }}>
          <h3 style={{ margin: 0, color: "#f9fafb", fontSize: 16, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "#1f2937", border: "none", color: "#9ca3af", cursor: "pointer", width: 30, height: 30, borderRadius: 8, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: t.type === "success" ? "#14532d" : t.type === "error" ? "#450a0a" : "#1e3a5f", border: `1px solid ${t.type === "success" ? "#4ade80" : t.type === "error" ? "#f87171" : "#60a5fa"}50`, borderRadius: 10, padding: "12px 16px", color: "#f9fafb", fontSize: 13, fontWeight: 600, maxWidth: 320, animation: "slideIn .2s ease" }}>
          {t.type === "success" ? "✓ " : t.type === "error" ? "✕ " : "ℹ "}{t.msg}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PDF EXPORT
// ══════════════════════════════════════════════════════════════════════════════
function exportPDF(report, client, assignedUser, lang = "es") {
  const b = report.budget || {};
  const items = report.budgetItems || [];
  const findings = report.findings || [];

  const advance = (b.total || 0) * ((b.advance_pct || 50) / 100);
  const sc = s => s === "alta" ? "#ef4444" : s === "media" ? "#f59e0b" : "#22c55e";

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Presupuesto ${report.folio}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box} body{font-family:'DM Sans',sans-serif;background:#fff;color:#111827;font-size:13px}
  .page{max-width:800px;margin:0 auto;padding:40px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:24px;border-bottom:2px solid #1d4ed8}
  .logo{display:flex;align-items:center;gap:12px} .logo-icon{width:44px;height:44px;background:#1d4ed8;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px}
  .logo-text h1{font-size:18px;font-weight:800} .logo-text p{font-size:11px;color:#6b7280;margin-top:2px}
  .folio{text-align:right} .folio .num{font-size:22px;font-weight:800;color:#1d4ed8;font-family:monospace} .folio .date{font-size:12px;color:#6b7280;margin-top:4px}
  .sec-title{font-size:10px;font-weight:800;color:#1d4ed8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #e5e7eb}
  .section{margin-bottom:24px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .info-box{background:#f9fafb;border-radius:8px;padding:12px 14px} .info-box label{font-size:10px;color:#9ca3af;font-weight:700;letter-spacing:.5px;display:block;margin-bottom:4px;text-transform:uppercase} .info-box span{font-weight:700;color:#111827;font-size:13px}
  table{width:100%;border-collapse:collapse} th{background:#1d4ed8;color:#fff;padding:9px 12px;font-size:11px;font-weight:700;text-align:left} th:last-child,td:last-child{text-align:right}
  td{padding:9px 12px;border-bottom:1px solid #f3f4f6;color:#374151} tr:nth-child(even) td{background:#fafafa}
  .totals{margin-top:12px;display:flex;justify-content:flex-end}
  .totals-box{background:#f9fafb;border-radius:10px;padding:16px 20px;min-width:260px;border:1px solid #e5e7eb}
  .tot-row{display:flex;justify-content:space-between;margin-bottom:8px}
  .tot-row.total{font-size:16px;font-weight:800;color:#1d4ed8;border-top:2px solid #e5e7eb;padding-top:10px;margin-top:4px}
  .payments{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
  .pay-box{border-radius:10px;padding:14px;border:1.5px solid}
  .pay-box.advance{border-color:#7c3aed;background:#f5f3ff} .pay-box.advance .pay-label{color:#7c3aed}
  .pay-box.final{border-color:#0e7490;background:#ecfeff} .pay-box.final .pay-label{color:#0e7490}
  .pay-label{font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
  .pay-amount{font-size:18px;font-weight:800} .pay-note{font-size:11px;color:#6b7280;margin-top:4px}
  .finding{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;border-left:3px solid;margin-bottom:6px;background:#fafafa}
  .footer{margin-top:36px;padding-top:18px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center}
  .footer-left{font-size:11px;color:#9ca3af}
  .sig-line{width:200px;border-bottom:1px solid #9ca3af;margin-bottom:6px;height:40px}
  .sig-label{font-size:11px;color:#6b7280;text-align:center}
</style></head><body><div class="page">
  <div class="header">
    <div class="logo"><div class="logo-icon">🔧</div><div class="logo-text"><h1>MantPro</h1><p>Professional Maintenance Management</p></div></div>
    <div class="folio"><div class="num">${report.folio}</div><div class="date">Fecha: ${fmtDate(report.date)}</div><div class="date">Generado: ${fmtDate(today())}</div></div>
  </div>
  <div class="section"><div class="sec-title">Información del Proyecto</div>
    <div class="info-grid">
      <div class="info-box"><label>Título</label><span>${report.title}</span></div>
      <div class="info-box"><label>Estado</label><span>${STATUS_CFG[report.status]?.label || report.status}</span></div>
      <div class="info-box"><label>Cliente</label><span>${client?.name || "—"}</span></div>
      <div class="info-box"><label>Contacto</label><span>${client?.contact || "—"}</span></div>
      <div class="info-box"><label>RFC</label><span>${client?.rfc || "—"}</span></div>
      <div class="info-box"><label>Técnico Asignado</label><span>${assignedUser?.name || report.assigned_to_name || "—"}</span></div>
    </div>
  </div>
  ${report.description ? `<div class="section"><div class="sec-title">Descripción</div><div style="background:#f9fafb;border-radius:8px;padding:14px;color:#374151;line-height:1.7">${report.description}</div></div>` : ""}
  ${findings.length ? `<div class="section"><div class="sec-title">Hallazgos</div>${findings.map(f => `<div class="finding" style="border-color:${sc(f.severity)}"><span style="font-size:11px;font-weight:800;color:${sc(f.severity)};min-width:36px">${f.severity.toUpperCase()}</span><span>${f.description}</span></div>`).join("")}</div>` : ""}
  ${items.length ? `
  <div class="section"><div class="sec-title">Presupuesto Detallado</div>
    <table><thead><tr><th>#</th><th>Concepto</th><th>Unidad</th><th>Cantidad</th><th>P. Unitario</th><th>Total</th></tr></thead>
    <tbody>${items.map((item, i) => `<tr><td style="color:#9ca3af">${i+1}</td><td><strong>${item.concept}</strong></td><td>${item.unit}</td><td>${item.qty}</td><td>${fmtMXN(item.price)}</td><td><strong>${fmtMXN(item.total)}</strong></td></tr>`).join("")}</tbody></table>
    <div class="totals"><div class="totals-box">
      <div class="tot-row"><span style="color:#6b7280">Subtotal</span><span>${fmtMXN(b.subtotal)}</span></div>
      <div class="tot-row"><span style="color:#6b7280">${getTax(lang || "es").name} ${b.tax_rate ?? 16}%</span><span>${fmtMXN(b.iva)}</span></div>
      <div class="tot-row total"><span>TOTAL</span><span>${fmtMXN(b.total)}</span></div>
    </div></div>
  </div>
  <div class="section"><div class="sec-title">Condiciones de Pago</div>
    <div class="payments">
      <div class="pay-box advance"><div class="pay-label">Anticipo (${b.advance_pct}%)</div><div class="pay-amount">${fmtMXN(advance)}</div><div class="pay-note">Al autorizar${b.advance_paid?" — ✓ PAGADO":""}</div></div>
      <div class="pay-box final"><div class="pay-label">Pago Final (${100-(b.advance_pct||50)}%)</div><div class="pay-amount">${fmtMXN((b.total||0)-advance)}</div><div class="pay-note">Al concluir${b.final_paid?" — ✓ PAGADO":""}</div></div>
    </div>
  </div>` : ""}
  <div class="footer">
    <div class="footer-left"><div style="font-weight:700;color:#374151;margin-bottom:4px">MantPro · ${today()}</div><div>Vigencia: 30 días naturales.</div></div>
    <div><div class="sig-line"></div><div class="sig-label">Firma de Autorización</div><div class="sig-label">${client?.contact || "Representante Legal"}</div></div>
  </div>
</div></body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Presupuesto_${report.folio}_${new Date().toISOString().slice(0,10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}


// ── PDF SHARED STYLES ────────────────────────────────────────────────────────
const PDF_BASE_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box} body{font-family:'DM Sans',sans-serif;background:#fff;color:#111827;font-size:13px}
  .page{max-width:800px;margin:0 auto;padding:40px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #1d4ed8}
  .logo{display:flex;align-items:center;gap:12px} .logo-icon{width:40px;height:40px;background:#1d4ed8;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px}
  .logo-text h1{font-size:17px;font-weight:800} .logo-text p{font-size:11px;color:#6b7280;margin-top:2px}
  .folio{text-align:right} .folio .num{font-size:20px;font-weight:800;color:#1d4ed8;font-family:monospace} .folio .date{font-size:11px;color:#6b7280;margin-top:3px}
  .sec-title{font-size:10px;font-weight:800;color:#1d4ed8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid #e5e7eb}
  .section{margin-bottom:22px}
  table{width:100%;border-collapse:collapse} th{background:#1d4ed8;color:#fff;padding:8px 12px;font-size:11px;font-weight:700;text-align:left} th:last-child,td:last-child{text-align:right}
  td{padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151} tr:nth-child(even) td{background:#fafafa}
  .footer{margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#9ca3af}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700}
`;

function pdfHeader(report, client, subtitle) {
  return `
  <div class="header">
    <div class="logo">
      <div class="logo-icon">🔧</div>
      <div class="logo-text"><h1>MantPro</h1><p>Professional Maintenance Management</p></div>
    </div>
    <div class="folio">
      <div class="num">${report.folio}</div>
      <div class="date">${subtitle}</div>
      <div class="date">${fmtDate(report.date)}</div>
      <div class="date">Generated: ${fmtDate(today())}</div>
    </div>
  </div>
  <div class="section">
    <table style="margin-bottom:0"><tbody>
      <tr><td style="color:#9ca3af;width:120px">Project</td><td><strong>${report.title}</strong></td><td style="color:#9ca3af;width:100px">Client</td><td><strong>${client?.name||"—"}</strong></td></tr>
      <tr><td style="color:#9ca3af">Assigned to</td><td>${report.assigned_to_name||"—"}</td><td style="color:#9ca3af">Status</td><td>${report.status}</td></tr>
    </tbody></table>
  </div>`;
}

function openPDF(title, folio, html) {
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} ${folio}</title><style>${PDF_BASE_STYLE}</style></head><body><div class="page">${html}</div></body></html>`;
  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${title}_${folio}_${new Date().toISOString().slice(0,10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ── PDF: SCHEDULE ─────────────────────────────────────────────────────────────
function exportPDFSchedule(report, client, lang = "es") {
  const L = (es, en) => lang === "en" ? en : es;
  const acts = report.schedule || [];
  const overall = acts.length ? Math.round(acts.reduce((s,a)=>s+(a.progress||0),0)/acts.length) : 0;
  const statusColor = s => s==="completada"?"#15803d":s==="en_curso"?"#b45309":"#374151";
  const statusLabel = s => lang==="en" ? (s==="completada"?"Done":s==="en_curso"?"In Progress":"Pending") : (s==="completada"?"Completada":s==="en_curso"?"En Curso":"Pendiente");

  const html = `
    ${pdfHeader(report, client, L("Cronograma de Actividades","Activity Schedule"))}
    <div class="section">
      <div class="sec-title">${L("Resumen","Summary")}</div>
      <div style="display:flex;gap:20px;margin-bottom:12px">
        <div style="background:#f9fafb;border-radius:8px;padding:10px 16px;flex:1;text-align:center">
          <div style="font-size:10px;color:#9ca3af;font-weight:700;letter-spacing:.5px">${L("ACTIVIDADES","ACTIVITIES")}</div>
          <div style="font-size:22px;font-weight:800;color:#1d4ed8">${acts.length}</div>
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:10px 16px;flex:1;text-align:center">
          <div style="font-size:10px;color:#9ca3af;font-weight:700;letter-spacing:.5px">${L("COMPLETADAS","COMPLETED")}</div>
          <div style="font-size:22px;font-weight:800;color:#15803d">${acts.filter(a=>a.status==="completada").length}</div>
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:10px 16px;flex:1;text-align:center">
          <div style="font-size:10px;color:#9ca3af;font-weight:700;letter-spacing:.5px">${L("AVANCE GENERAL","OVERALL PROGRESS")}</div>
          <div style="font-size:22px;font-weight:800;color:#1d4ed8">${overall}%</div>
        </div>
      </div>
      <div style="background:#e5e7eb;border-radius:99px;height:8px;overflow:hidden;margin-bottom:16px">
        <div style="width:${overall}%;background:#1d4ed8;height:100%;border-radius:99px"></div>
      </div>
    </div>
    <div class="section">
      <div class="sec-title">${L("Actividades","Activities")}</div>
      ${acts.length === 0 ? `<p style="color:#9ca3af">${L("Sin actividades registradas","No activities registered")}</p>` : `
      <table>
        <thead><tr>
          <th>#</th>
          <th>${L("Actividad","Activity")}</th>
          <th>${L("Inicio","Start")}</th>
          <th>${L("Fin","End")}</th>
          <th>${L("Responsable","Responsible")}</th>
          <th>${L("Estado","Status")}</th>
          <th>${L("Avance","Progress")}</th>
        </tr></thead>
        <tbody>${acts.map((a,i)=>`
          <tr>
            <td style="color:#9ca3af">${i+1}</td>
            <td><strong>${a.activity}</strong></td>
            <td>${fmtDate(a.start_date)}</td>
            <td>${fmtDate(a.end_date)}</td>
            <td>${a.responsible||"—"}</td>
            <td><span class="badge" style="background:${statusColor(a.status)}20;color:${statusColor(a.status)}">${statusLabel(a.status)}</span></td>
            <td style="text-align:right;font-weight:700;color:#1d4ed8">${a.progress||0}%</td>
          </tr>`).join("")}
        </tbody>
      </table>`}
    </div>
    <div class="footer"><span>MantPro · ${today()}</span><span>${L("Cronograma de Actividades","Activity Schedule")} — ${report.folio}</span></div>`;

  openPDF(L("Cronograma","Schedule"), report.folio, html);
}

// ── PDF: MATERIALS ────────────────────────────────────────────────────────────
function exportPDFMaterials(report, client, assignments, lang = "es") {
  const L = (es, en) => lang === "en" ? en : es;
  const total = assignments.reduce((s,a) => s + (a.total_cost||0), 0);

  const html = `
    ${pdfHeader(report, client, L("Materiales Utilizados","Materials Used"))}
    <div class="section">
      <div class="sec-title">${L("Lista de Materiales","Material List")}</div>
      ${assignments.length === 0 ? `<p style="color:#9ca3af">${L("Sin materiales asignados","No materials assigned")}</p>` : `
      <table>
        <thead><tr>
          <th>#</th>
          <th>${L("Material","Material")}</th>
          <th>${L("Unidad","Unit")}</th>
          <th>${L("Cantidad","Quantity")}</th>
          <th>${L("Precio Unitario","Unit Price")}</th>
          <th>${L("Total","Total")}</th>
        </tr></thead>
        <tbody>${assignments.map((a,i)=>`
          <tr>
            <td style="color:#9ca3af">${i+1}</td>
            <td><strong>${a.materials?.name||"—"}</strong></td>
            <td>${a.materials?.unit||"—"}</td>
            <td>${a.quantity}</td>
            <td>${fmtMXN(a.unit_price)}</td>
            <td><strong>${fmtMXN(a.total_cost)}</strong></td>
          </tr>`).join("")}
        </tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:12px">
        <div style="background:#f9fafb;border-radius:8px;padding:12px 20px;min-width:220px;border:1px solid #e5e7eb">
          <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;color:#1d4ed8">
            <span>${L("TOTAL MATERIALES","TOTAL MATERIALS")}</span>
            <span>${fmtMXN(total)}</span>
          </div>
        </div>
      </div>`}
    </div>
    <div class="footer"><span>MantPro · ${today()}</span><span>${L("Materiales Utilizados","Materials Used")} — ${report.folio}</span></div>`;

  openPDF(L("Materiales","Materials"), report.folio, html);
}

// ── PDF: LABOR COSTS ──────────────────────────────────────────────────────────
function exportPDFLabor(report, client, laborCosts, lang = "es") {
  const L = (es, en) => lang === "en" ? en : es;
  const total = laborCosts.reduce((s,c) => s + (c.amount||0), 0);

  const html = `
    ${pdfHeader(report, client, L("Mano de Obra","Labor Costs"))}
    <div class="section">
      <div class="sec-title">${L("Conceptos de Mano de Obra","Labor Cost Concepts")}</div>
      ${laborCosts.length === 0 ? `<p style="color:#9ca3af">${L("Sin costos registrados","No costs registered")}</p>` : `
      <table>
        <thead><tr>
          <th>#</th>
          <th>${L("Concepto","Concept")}</th>
          <th>${L("Notas","Notes")}</th>
          <th>${L("Fecha","Date")}</th>
          <th>${L("Monto","Amount")}</th>
        </tr></thead>
        <tbody>${laborCosts.map((c,i)=>`
          <tr>
            <td style="color:#9ca3af">${i+1}</td>
            <td><strong>${c.concept}</strong></td>
            <td style="color:#9ca3af">${c.notes||"—"}</td>
            <td>${fmtDate(c.created_at?.slice(0,10))}</td>
            <td><strong>${fmtMXN(c.amount)}</strong></td>
          </tr>`).join("")}
        </tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:12px">
        <div style="background:#f9fafb;border-radius:8px;padding:12px 20px;min-width:220px;border:1px solid #e5e7eb">
          <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;color:#1d4ed8">
            <span>${L("TOTAL MANO DE OBRA","TOTAL LABOR")}</span>
            <span>${fmtMXN(total)}</span>
          </div>
        </div>
      </div>`}
    </div>
    <div class="footer"><span>MantPro · ${today()}</span><span>${L("Mano de Obra","Labor Costs")} — ${report.folio}</span></div>`;

  openPDF(L("Mano de Obra","Labor"), report.folio, html);
}

// ── PDF: RESULTS ──────────────────────────────────────────────────────────────
function exportPDFResults(report, client, assignments, laborCosts, lang = "es") {
  const L = (es, en) => lang === "en" ? en : es;
  const b = report.budget || {};
  const ingreso         = b.total || 0;
  const ingresoReal     = (b.advance_paid ? ingreso*(b.advance_pct||50)/100 : 0) + (b.final_paid ? ingreso*(100-(b.advance_pct||50))/100 : 0);
  const costoMat        = assignments.reduce((s,a) => s+(a.total_cost||0), 0);
  const costoLabor      = laborCosts.reduce((s,c) => s+(c.amount||0), 0);
  const costoTotal      = costoMat + costoLabor;
  const utilidad        = ingreso - costoTotal;
  const utilidadReal    = ingresoReal - costoTotal;
  const margen          = ingreso > 0 ? ((utilidad/ingreso)*100).toFixed(1) : 0;
  const isProfit        = utilidad >= 0;

  const row = (label, value, color="#111827", bold=false) =>
    `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6">
      <span style="color:#6b7280">${label}</span>
      <span style="color:${color};font-weight:${bold?800:400}">${value}</span>
    </div>`;

  const html = `
    ${pdfHeader(report, client, L("Resultado del Proyecto","Project Results"))}
    <div class="section">
      <div class="sec-title">${L("Resumen Financiero","Financial Summary")}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
        ${[
          [L("INGRESO PRESUPUESTADO","BUDGETED INCOME"), fmtMXN(ingreso), "#15803d"],
          [L("COSTO TOTAL","TOTAL COST"), fmtMXN(costoTotal), "#dc2626"],
          [L("UTILIDAD BRUTA","GROSS PROFIT"), fmtMXN(utilidad), isProfit?"#15803d":"#dc2626"],
        ].map(([l,v,c])=>`
          <div style="background:#f9fafb;border-radius:8px;padding:12px;border-left:3px solid ${c}">
            <div style="font-size:10px;color:#9ca3af;font-weight:700;letter-spacing:.5px;margin-bottom:4px">${l}</div>
            <div style="font-size:18px;font-weight:800;color:${c}">${v}</div>
          </div>`).join("")}
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="color:#6b7280;font-size:12px">${L("Margen de utilidad","Profit margin")}</span>
          <span style="font-size:20px;font-weight:800;color:${isProfit?"#15803d":"#dc2626"}">${margen}%</span>
        </div>
        <div style="background:#e5e7eb;border-radius:99px;height:8px;overflow:hidden">
          <div style="width:${Math.min(Math.abs(parseFloat(margen)),100)}%;background:${isProfit?"#15803d":"#dc2626"};height:100%;border-radius:99px"></div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="section">
        <div class="sec-title">${L("Desglose de Costos","Cost Breakdown")}</div>
        ${row(L("Materiales","Materials"), fmtMXN(costoMat))}
        ${row(L("Mano de obra","Labor"), fmtMXN(costoLabor))}
        ${row(L("TOTAL COSTOS","TOTAL COSTS"), fmtMXN(costoTotal), "#dc2626", true)}
      </div>
      <div class="section">
        <div class="sec-title">${L("Estado de Cobro","Collection Status")}</div>
        ${row(L("Anticipo cobrado","Advance collected"), b.advance_paid?fmtMXN(ingreso*(b.advance_pct||50)/100):L("Pendiente","Pending"), b.advance_paid?"#15803d":"#9ca3af")}
        ${row(L("Pago final cobrado","Final payment collected"), b.final_paid?fmtMXN(ingreso*(100-(b.advance_pct||50))/100):L("Pendiente","Pending"), b.final_paid?"#15803d":"#9ca3af")}
        ${row(L("Total cobrado","Total collected"), fmtMXN(ingresoReal), "#1d4ed8", true)}
        ${row(L("Utilidad sobre cobrado","Profit on collected"), fmtMXN(utilidadReal), utilidadReal>=0?"#15803d":"#dc2626", true)}
      </div>
    </div>
    <div class="footer"><span>MantPro · ${today()}</span><span>${L("Resultado del Proyecto","Project Results")} — ${report.folio}</span></div>`;

  openPDF(L("Resultado","Results"), report.folio, html);
}

// ── PDF: TIMELINE ─────────────────────────────────────────────────────────────
function exportPDFTimeline(report, client, lang = "es") {
  const L = (es, en) => lang === "en" ? en : es;
  const timeline = report.timeline || [];

  const html = `
    ${pdfHeader(report, client, L("Bitácora de Seguimiento","Follow-up Log"))}
    <div class="section">
      <div class="sec-title">${L("Historial de Eventos","Event History")} (${timeline.length})</div>
      ${timeline.length === 0 ? `<p style="color:#9ca3af">${L("Sin eventos registrados","No events registered")}</p>` :
      timeline.map((t,i)=>`
        <div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #f3f4f6;align-items:flex-start">
          <div style="width:24px;height:24px;border-radius:99px;background:#1d4ed8;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">${i+1}</div>
          <div style="flex:1">
            <div style="color:#111827;font-weight:600">${t.event}</div>
            <div style="color:#9ca3af;font-size:11px;margin-top:2px">${fmtDate(t.created_at?.slice(0,10))} · ${t.user_name||"—"}</div>
          </div>
        </div>`).join("")}
    </div>
    <div class="footer"><span>MantPro · ${today()}</span><span>${L("Bitácora","Follow-up Log")} — ${report.folio}</span></div>`;

  openPDF(L("Bitácora","Timeline"), report.folio, html);
}

// ── PDF: INSPECTION REPORT ────────────────────────────────────────────────────
function exportPDFInspection(report, client, assignedUser, lang = "es") {
  const L = (es, en) => lang === "en" ? en : es;
  const findings = report.findings || [];
  const photos   = report.photos   || [];
  const sc = s => s==="alta"?"#ef4444":s==="media"?"#f59e0b":"#22c55e";

  const html = `
    ${pdfHeader(report, client, L("Reporte de Inspección","Inspection Report"))}
    <div class="section">
      <div class="sec-title">${L("Información del Proyecto","Project Information")}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${[
          [L("Título","Title"), report.title],
          [L("Estado","Status"), report.status],
          [L("Cliente","Client"), client?.name||"—"],
          [L("Contacto","Contact"), client?.contact||"—"],
          [L("RFC","Tax ID"), client?.rfc||"—"],
          [L("Técnico Asignado","Assigned Tech"), assignedUser?.name||report.assigned_to_name||"—"],
          [L("Creado por","Created by"), report.created_by_name||"—"],
          [L("Fecha Inspección","Inspection Date"), fmtDate(report.date)],
        ].map(([l,v])=>`
          <div style="background:#f9fafb;border-radius:6px;padding:10px 12px">
            <div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">${l}</div>
            <div style="font-weight:700;color:#111827">${v}</div>
          </div>`).join("")}
      </div>
    </div>
    ${report.description ? `
    <div class="section">
      <div class="sec-title">${L("Descripción / Observaciones","Description / Observations")}</div>
      <div style="background:#f9fafb;border-radius:8px;padding:14px;color:#374151;line-height:1.7">${report.description}</div>
    </div>` : ""}
    ${findings.length ? `
    <div class="section">
      <div class="sec-title">${L("Hallazgos","Findings")} (${findings.length})</div>
      ${findings.map(f=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;border-left:3px solid ${sc(f.severity)};margin-bottom:6px;background:#fafafa">
          <span style="font-size:11px;font-weight:800;color:${sc(f.severity)};min-width:40px;text-transform:uppercase">${f.severity}</span>
          <span>${f.description}</span>
        </div>`).join("")}
    </div>` : ""}
    ${photos.length ? `
    <div class="section">
      <div class="sec-title">${L("Evidencia Fotográfica","Photo Evidence")} (${photos.length} ${L("fotos","photos")})</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${photos.map(p=>`<img src="${p.url}" style="width:160px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb" />`).join("")}
      </div>
    </div>` : ""}
    <div class="footer"><span>MantPro · ${today()}</span><span>${L("Reporte de Inspección","Inspection Report")} — ${report.folio}</span></div>`;

  openPDF(L("Reporte","Report"), report.folio, html);
}

// ══════════════════════════════════════════════════════════════════════════════
// SUPABASE DATA LAYER
// ══════════════════════════════════════════════════════════════════════════════

// ── AUTH ──────────────────────────────────────────────────────────────────────
async function sbSignUp(name, email, password, role, lang = "es") {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name, role, lang, avatar: mkAvatar(name) } }
  });
  return { data, error };
}

async function sbSignIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function sbSignOut() {
  await supabase.auth.signOut();
}

// ── PROFILES ──────────────────────────────────────────────────────────────────
async function fetchProfiles() {
  // Usar cabecera especial para bypassear RLS en lectura
  // (el superusuario no tiene sesión de Supabase Auth)
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at");
  if (error) console.error("fetchProfiles error:", error.message);
  return data || [];
}

async function updateProfile(id, updates) {
  const { error } = await supabase.from("profiles").update(updates).eq("id", id);
  return error;
}

async function deleteProfile(id) {
  // Delete auth user (cascades to profile)
  const { error } = await supabase.auth.admin.deleteUser(id);
  return error;
}

// ── CLIENTS ───────────────────────────────────────────────────────────────────
async function fetchClients(user) {
  let query = supabase.from("clients").select("*").order("name");
  // Técnico: solo sus clientes
  if (user && user.role === "tecnico") {
    query = query.eq("created_by", user.id);
  }
  const { data } = await query;
  return data || [];
}
async function upsertClient(client) {
  const { data, error } = await supabase.from("clients").upsert(client).select().single();
  return { data, error };
}
async function deleteClient(id) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  return error;
}

// ── REPORTS ───────────────────────────────────────────────────────────────────
async function fetchReports(user) {
  let query = supabase
    .from("reports")
    .select(`*, clients(name,email,contact,rfc), findings(*), photos(*), budgets(*, budget_items(*)), schedule(*), timeline(*)`)
    .order("created_at", { ascending: false });

  // Técnico individual: solo sus reportes
  if (user && user.role === "tecnico") {
    query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`);
  }
  // Empresarial y superadmin: RLS maneja el filtro en Supabase

  const { data } = await query;
  return (data || []).map(normalizeReport);
}

function normalizeReport(r) {
  return {
    ...r,
    client: r.clients,
    findings: r.findings || [],
    photos: r.photos || [],
    budget: r.budgets ? { ...r.budgets, items: r.budgets.budget_items || [] } : null,
    budgetItems: r.budgets?.budget_items || [],
    schedule: (r.schedule || []).sort((a, b) => a.sort_order - b.sort_order),
    timeline: (r.timeline || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  };
}

async function createReport(payload, findings, profile) {
  // 1. Insert report
  const { data: rep, error } = await supabase.from("reports").insert(payload).select().single();
  if (error) return { error };
  // 2. Insert findings
  if (findings.filter(f => f.description).length) {
    await supabase.from("findings").insert(findings.filter(f => f.description).map(f => ({ report_id: rep.id, description: f.description, severity: f.severity })));
  }
  // 3. Insert empty budget
  await supabase.from("budgets").insert({ report_id: rep.id, subtotal: 0, iva: 0, total: 0, advance_pct: 50 });
  // 4. Insert initial timeline
  await supabase.from("timeline").insert({ report_id: rep.id, event: "Reporte creado", user_name: profile.name });
  return { data: rep, error: null };
}

async function updateReportStatus(reportId, status, eventText, userName) {
  await supabase.from("reports").update({ status }).eq("id", reportId);
  await supabase.from("timeline").insert({ report_id: reportId, event: eventText, user_name: userName });
}

async function saveBudget(reportId, budget, items) {
  // Buscar presupuesto existente por report_id
  const { data: existing } = await supabase
    .from("budgets").select("id").eq("report_id", reportId).single();

  let budgetId;
  if (existing?.id) {
    // Actualizar el existente
    await supabase.from("budgets")
      .update({ subtotal: budget.subtotal, iva: budget.iva, total: budget.total, advance_pct: budget.advance_pct, advance_paid: budget.advance_paid ?? false, final_paid: budget.final_paid ?? false })
      .eq("id", existing.id);
    budgetId = existing.id;
  } else {
    // Crear nuevo
    const { data: newB } = await supabase.from("budgets")
      .insert({ report_id: reportId, subtotal: budget.subtotal, iva: budget.iva, total: budget.total, advance_pct: budget.advance_pct, advance_paid: budget.advance_paid ?? false, final_paid: budget.final_paid ?? false })
      .select().single();
    if (!newB) return;
    budgetId = newB.id;
  }

  // Reemplazar todas las partidas
  await supabase.from("budget_items").delete().eq("budget_id", budgetId);
  if (items.length) {
    await supabase.from("budget_items").insert(
      items.map((it, i) => ({ budget_id: budgetId, concept: it.concept, unit: it.unit, qty: it.qty, price: it.price, total: it.total, sort_order: i }))
    );
  }
}

async function saveSchedule(reportId, activities) {
  await supabase.from("schedule").delete().eq("report_id", reportId);
  if (activities.length) {
    await supabase.from("schedule").insert(activities.map((a, i) => ({ report_id: reportId, activity: a.activity, start_date: a.start_date, end_date: a.end_date, responsible: a.responsible, status: a.status, progress: a.progress, sort_order: i })));
  }
}

async function addTimeline(reportId, event, userName) {
  await supabase.from("timeline").insert({ report_id: reportId, event, user_name: userName });
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
async function fetchNotifications(userId) {
  const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return data || [];
}
async function insertNotification(n) {
  await supabase.from("notifications").insert(n);
}
async function markNotifRead(id) {
  await supabase.from("notifications").update({ is_read: true }).eq("id", id);
}
async function markAllNotifsRead(userId) {
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId);
}
async function deleteNotif(id) {
  await supabase.from("notifications").delete().eq("id", id);
}

// ── COMPANY MEMBERS ───────────────────────────────────────────
async function fetchCompanyMembers(companyId) {
  const { data } = await supabase
    .from("company_members")
    .select("*, profiles!company_members_tecnico_id_fkey(*)")
    .eq("company_id", companyId);
  return data || [];
}

async function addCompanyMember(companyId, tecnicoId) {
  const { error } = await supabase
    .from("company_members")
    .insert({ company_id: companyId, tecnico_id: tecnicoId });
  return error;
}

async function removeCompanyMember(companyId, tecnicoId) {
  const { error } = await supabase
    .from("company_members")
    .delete()
    .eq("company_id", companyId)
    .eq("tecnico_id", tecnicoId);
  return error;
}

// ── MATERIALS DATA LAYER ──────────────────────────────────────────────────────
async function fetchMaterials(user) {
  let query = supabase.from("materials").select("*").order("name");
  if (user && user.role === "tecnico") query = query.eq("created_by", user.id);
  const { data } = await query;
  return data || [];
}

async function saveMaterial(material) {
  if (material.id) {
    const { id, created_by, created_at, updated_at, ...updates } = material;
    const { data, error } = await supabase.from("materials").update(updates).eq("id", id).select().single();
    return { data, error };
  }
  const { data, error } = await supabase.from("materials").insert(material).select().single();
  return { data, error };
}

async function deleteMaterial(id) {
  const { error } = await supabase.from("materials").delete().eq("id", id);
  return error;
}

async function fetchPurchases(materialId) {
  const { data } = await supabase.from("material_purchases").select("*").eq("material_id", materialId).order("purchase_date", { ascending: false });
  return data || [];
}

async function addPurchase(purchase) {
  const { data, error } = await supabase.from("material_purchases").insert(purchase).select().single();
  return { data, error };
}

async function fetchAssignments(reportId) {
  const { data } = await supabase.from("material_assignments").select("*, materials(name,unit)").eq("report_id", reportId);
  return data || [];
}

async function addAssignment(assignment) {
  const { data, error } = await supabase.from("material_assignments").insert(assignment).select().single();
  return { data, error };
}

async function deleteAssignment(id) {
  const { error } = await supabase.from("material_assignments").delete().eq("id", id);
  return error;
}

// ── LABOR COSTS ───────────────────────────────────────────────
async function fetchLaborCosts(reportId) {
  const { data } = await supabase.from("labor_costs").select("*").eq("report_id", reportId).order("created_at");
  return data || [];
}

async function addLaborCost(item) {
  const { data, error } = await supabase.from("labor_costs").insert(item).select().single();
  return { data, error };
}

async function updateLaborCost(id, updates) {
  const { error } = await supabase.from("labor_costs").update(updates).eq("id", id);
  return error;
}

async function deleteLaborCost(id) {
  const { error } = await supabase.from("labor_costs").delete().eq("id", id);
  return error;
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "tecnico", lang: "es" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(null); // email confirmado pendiente
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleLogin() {
    if (!form.email || !form.password) return setError("Completa todos los campos");
    setLoading(true); setError("");
    // Superusuario — autenticar localmente
    if (isSuperEmail(form.email)) {
      if (form.password === SUPERUSER.password) { onLogin(SUPERUSER, null); }
      else { setError("Contraseña incorrecta"); setLoading(false); }
      return;
    }
    const { data, error } = await sbSignIn(form.email, form.password);
    if (error) { setError("Correo o contraseña incorrectos"); setLoading(false); return; }
    // Retry fetching profile up to 3 times (trigger may be slightly delayed)
    let profile = null;
    for (let i = 0; i < 3; i++) {
      const profiles = await fetchProfiles();
      profile = profiles.find(p => p.id === data.user.id);
      if (profile) break;
      await new Promise(r => setTimeout(r, 600));
    }
    if (!profile) {
      // Profile not found — create it manually as fallback
      const meta = data.user.user_metadata || {};
      const fallback = { id: data.user.id, name: meta.name || data.user.email, role: meta.role || "tecnico", avatar: mkAvatar(meta.name || data.user.email) };
      await supabase.from("profiles").insert(fallback);
      profile = fallback;
    }
    onLogin(profile, data.session);
  }

  async function handleRegister() {
    if (!form.name.trim()) return setError("Ingresa tu nombre completo");
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return setError("Correo inválido");
    if (isSuperEmail(form.email)) return setError("Ese correo no está disponible");
    if (form.password.length < 6) return setError("Contraseña mínimo 6 caracteres");
    if (form.password !== form.confirm) return setError("Las contraseñas no coinciden");
    setLoading(true); setError("");
    const { error } = await sbSignUp(form.name.trim(), form.email.trim().toLowerCase(), form.password, form.role, form.lang || "es");
    if (error) { setError(error.message); setLoading(false); return; }
    // Mostrar pantalla de confirmación pendiente
    setRegistered(form.email.trim().toLowerCase());
    setLoading(false);
  }

  const iStyle = { ...S.input, marginBottom: 0 };

  // ── PANTALLA: CONFIRMAR CORREO ───────────────────────────────
  if (registered) return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 50%, #1d4ed820 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #7c3aed15 0%, transparent 50%)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 460, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 72, marginBottom: 8 }}>📬</div>
        <h1 style={{ color: "#f9fafb", fontSize: 24, fontWeight: 800, margin: "0 0 10px" }}>
          Revisa tu correo
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
{form.lang==="en"?"Your account was created. We sent an activation link to:":"Tu cuenta fue creada exitosamente. Te enviamos un enlace de activación a:"}
        </p>
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: "18px 24px", marginBottom: 28 }}>
          <div style={{ color: "#60a5fa", fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{registered}</div>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: 0, lineHeight: 1.7 }}>
            Haz clic en el enlace del correo para activar tu cuenta.<br/>
            Después podrás iniciar sesión normalmente.
          </p>
        </div>
        <div style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 10, padding: "14px 20px", marginBottom: 24, textAlign: "left" }}>
          <div style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>⚠ ¿No ves el correo?</div>
          <ul style={{ color: "#9ca3af", fontSize: 13, margin: 0, paddingLeft: 18, lineHeight: 2 }}>
            <li>Revisa tu carpeta de <strong style={{ color: "#f9fafb" }}>SPAM o correo no deseado</strong></li>
            <li>El correo puede tardar hasta 2 minutos en llegar</li>
            <li>Verifica que escribiste bien tu dirección</li>
          </ul>
        </div>
        <button onClick={() => { setRegistered(null); setMode("login"); setForm({ name:"", email:"", password:"", confirm:"", role:"tecnico" }); }}
          style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", border: "none", borderRadius: 10, padding: "12px 32px", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "DM Sans,sans-serif" }}>
          {form.lang==="en"?"Go to Sign In":"Ir a Iniciar Sesión"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Sans, sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:none;opacity:1}}`}</style>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 50%, #1d4ed820 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #7c3aed15 0%, transparent 50%)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 440, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/icon-only.svg" alt="MantPro" style={{ width: 72, height: 72, margin: "0 auto 16px", display: "block", borderRadius: 18 }} onError={e => { e.target.style.display="none"; }} />
          <h1 style={{ color: "#f9fafb", fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -0.5, fontFamily: "DM Sans, sans-serif" }}>MantPro</h1>
          <p style={{ color: "#4b5563", fontSize: 13, marginTop: 6 }}>{form.lang === "en" ? "Professional maintenance management" : "Gestión profesional de mantenimiento"}</p>
        </div>
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 20, padding: 32, boxShadow: "0 28px 70px #000a" }}>
          {/* Language selector — visible in both tabs */}
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {[["es","🇲🇽 Español"],["en","🇺🇸 English"]].map(([val,lbl])=>(
              <div key={val} onClick={()=>f("lang",val)} style={{flex:1,background:form.lang===val?"#1e3a5f":"#1f2937",border:`1.5px solid ${form.lang===val?"#2563eb":"#374151"}`,borderRadius:8,padding:"8px 10px",cursor:"pointer",textAlign:"center",fontSize:13,fontWeight:700,color:form.lang===val?"#60a5fa":"#9ca3af"}}>{lbl}</div>
            ))}
          </div>
          <div style={{ display: "flex", background: "#1f2937", borderRadius: 12, padding: 4, marginBottom: 28 }}>
            {[["login", form.lang==="en"?"Sign In":"Iniciar Sesión"],["register", form.lang==="en"?"Create Account":"Crear Cuenta"]].map(([k,l]) => (
              <button key={k} onClick={() => { setMode(k); setError(""); }} style={{ flex: 1, background: mode===k?"#2563eb":"none", border: "none", borderRadius: 9, padding: "9px", color: mode===k?"#fff":"#6b7280", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif", transition: "all .2s" }}>{l}</button>
            ))}
          </div>
          {mode === "login" ? (
            <>
              <div style={{ marginBottom: 14 }}><label style={S.label}>{form.lang==="en"?"EMAIL":"CORREO"}</label><input value={form.email} onChange={e => f("email",e.target.value)} placeholder="tu@correo.com" type="email" style={iStyle} onKeyDown={e => e.key==="Enter"&&handleLogin()} /></div>
              <div style={{ marginBottom: 22 }}><label style={S.label}>{form.lang==="en"?"PASSWORD":"CONTRASEÑA"}</label><input value={form.password} onChange={e => f("password",e.target.value)} placeholder="••••••••" type="password" style={iStyle} onKeyDown={e => e.key==="Enter"&&handleLogin()} /></div>
              {error && <div style={{ background:"#450a0a",border:"1px solid #f8717140",borderRadius:8,padding:"10px 14px",color:"#f87171",fontSize:13,marginBottom:16 }}>{error}</div>}
              <button onClick={handleLogin} disabled={loading} style={{ width:"100%",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",border:"none",borderRadius:10,padding:13,color:"#fff",fontWeight:800,fontSize:15,cursor:loading?"not-allowed":"pointer",opacity:loading?.7:1,fontFamily:"DM Sans,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>{loading?<><Spinner/>{form.lang==="en"?"Verifying…":"Verificando…"}</>:form.lang==="en"?"Sign In":"Iniciar Sesión"}</button>
              <p style={{ textAlign:"center",color:"#4b5563",fontSize:13,marginTop:18,marginBottom:0 }}>{form.lang==="en"?"Don't have an account?":"¿No tienes cuenta?"} <span onClick={()=>{setMode("register");setError("");}} style={{color:"#2563eb",cursor:"pointer",fontWeight:700}}>{form.lang==="en"?"Sign up":"Regístrate"}</span></p>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}><label style={S.label}>{form.lang==="en"?"FULL NAME":"NOMBRE COMPLETO"}</label><input value={form.name} onChange={e => f("name",e.target.value)} placeholder="Juan Pérez" style={iStyle} /></div>
              <div style={{ marginBottom: 14 }}><label style={S.label}>{form.lang==="en"?"EMAIL":"CORREO"}</label><input value={form.email} onChange={e => f("email",e.target.value)} placeholder="tu@correo.com" type="email" style={iStyle} /></div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
                <div><label style={S.label}>Contraseña</label><input value={form.password} onChange={e=>f("password",e.target.value)} placeholder="Mín. 6 car." type="password" style={iStyle}/></div>
                <div><label style={S.label}>Confirmar</label><input value={form.confirm} onChange={e=>f("confirm",e.target.value)} placeholder="Repite" type="password" style={iStyle}/></div>
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={S.label}>{form.lang==="en"?"PROFILE":"PERFIL"}</label>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                  {[["empresarial","🏢 " + (form.lang==="en"?"Business":"Empresarial"),form.lang==="en"?"Manage multiple technicians":"Gestiona múltiples técnicos"],["tecnico","🔧 " + (form.lang==="en"?"Technician":"Técnico"),form.lang==="en"?"Own reports and clients":"Reportes y clientes propios"]].map(([val,lbl,desc]) => (
                    <div key={val} onClick={()=>f("role",val)} style={{ background:form.role===val?"#1e3a5f":"#1f2937",border:`1.5px solid ${form.role===val?"#2563eb":"#374151"}`,borderRadius:10,padding:"10px 12px",cursor:"pointer" }}>
                      <div style={{ fontWeight:700,fontSize:13,color:form.role===val?"#60a5fa":"#f9fafb" }}>{lbl}</div>
                      <div style={{ fontSize:11,color:"#6b7280",marginTop:2 }}>{desc}</div>
                    </div>
                  ))}

                </div>
              </div>
              {error && <div style={{ background:"#450a0a",border:"1px solid #f8717140",borderRadius:8,padding:"10px 14px",color:"#f87171",fontSize:13,marginBottom:16 }}>{error}</div>}
              <button onClick={handleRegister} disabled={loading} style={{ width:"100%",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",border:"none",borderRadius:10,padding:13,color:"#fff",fontWeight:800,fontSize:15,cursor:loading?"not-allowed":"pointer",opacity:loading?.7:1,fontFamily:"DM Sans,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>{loading?<><Spinner/>{form.lang==="en"?"Creating account…":"Creando cuenta…"}</>:form.lang==="en"?"Create my account":"Crear mi cuenta"}</button>
              <p style={{ textAlign:"center",color:"#4b5563",fontSize:13,marginTop:18,marginBottom:0 }}>{form.lang==="en"?"Already have an account?":"¿Ya tienes cuenta?"} <span onClick={()=>{setMode("login");setError("");}} style={{color:"#2563eb",cursor:"pointer",fontWeight:700}}>{form.lang==="en"?"Sign in":"Inicia sesión"}</span></p>
            </>
          )}

          {/* Enlace comercial */}
          <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid #1f2937",textAlign:"center"}}>
            <p style={{color:"#4b5563",fontSize:12,margin:"0 0 6px"}}>
              {form.lang==="en"
                ? "Need custom software for your business?"
                : "¿Necesitas desarrollo de software a la medida?"}
            </p>
            <a href="https://paginaweb-ro9v.onrender.com" target="_blank" rel="noopener noreferrer"
              style={{color:"#2563eb",fontWeight:700,fontSize:13,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:6}}>
              {form.lang==="en" ? "Visit our website →" : "Visita nuestro sitio web →"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// USERS MODULE
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// MI EQUIPO MODULE (solo para empresarial)
// ══════════════════════════════════════════════════════════════════════════════
function MiEquipoModule({ profiles, currentUser, setCurrentUser, toast ,lang="es" }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => { loadMembers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMembers() {
    setLoading(true);
    const data = await fetchCompanyMembers(currentUser.id);
    setMembers(data);
    // Update currentUser.members list for NewReportModal
    const ids = data.map(m => m.tecnico_id);
    setCurrentUser(u => ({ ...u, members: ids }));
    setLoading(false);
  }

  async function add() {
    if (!selectedId) return;
    if (members.find(m => m.tecnico_id === selectedId)) return toast("Technician Already added", "error");
    setAdding(true);
    const err = await addCompanyMember(currentUser.id, selectedId);
    if (err) { toast("Error adding technician", "error"); setAdding(false); return; }
    await loadMembers();
    setSelectedId("");
    setAdding(false);
    toast("Technician added to team", "success");
  }

  async function remove(tecnicoId) {
    const err = await removeCompanyMember(currentUser.id, tecnicoId);
    if (err) return toast("Error removing technician", "error");
    await loadMembers();
    toast("Technician removed from team", "success");
  }

  // Available tecnicos not yet in team
  const memberIds = members.map(m => m.tecnico_id);
  const available = profiles.filter(p => p.role === "tecnico" && !memberIds.includes(p.id));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f9fafb" }}>{t(lang,'myTeamTitle')}</h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>{members.length} {t(lang,'teamMembers')}</p>
      </div>

      {/* Agregar técnico */}
      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <label style={S.label}>{t(lang,'addTechnic')}</label>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{ ...S.input, flex: 1 }}>
            <option value="">{t(lang,'selectTechnic')}</option>
            {available.map(p => <option key={p.id} value={p.id}>{p.name} — {p.email}</option>)}
          </select>
          <Btn variant="s" onClick={add} disabled={adding || !selectedId}>
            {adding ? <><Spinner />{t(lang,'adding')}</> : t(lang,'add')}
          </Btn>
        </div>
        {available.length === 0 && (
          <p style={{ color: "#4b5563", fontSize: 12, marginTop: 8, marginBottom: 0 }}>
            No available technicians. Ask them to register in the app first.
          </p>
        )}
      </div>

      {/* Lista de miembros */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner /></div>
      ) : members.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: "#4b5563" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <div style={{ fontWeight: 700, color: "#6b7280" }}>{t(lang,'noTeam')}</div>
          <p style={{ fontSize: 13, marginTop: 8 }}>{t(lang,'noTeamDesc')}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {members.map(m => {
            const p = m["profiles!company_members_tecnico_id_fkey"] || {};
            return (
              <div key={m.id} style={{ ...S.card, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar initials={p.avatar || mkAvatar(p.name || "?")} size={42} color="#60a5fa" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#f9fafb", fontSize: 14 }}>{p.name}</div>
                  <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>{p.email} · 🔧 Técnico</div>
                </div>
                <div style={{ fontSize: 11, color: "#4b5563" }}>{t(lang,'since')} {fmtDate(m.created_at?.slice(0, 10))}</div>
                <Btn variant="d" sm onClick={() => remove(m.tecnico_id)}>Unassign</Btn>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UsersModule({ profiles, setProfiles, currentUser, toast , lang="es" }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "tecnico" });
  const ROLE_CFG = { superadmin:{label:"⭐ Super Admin",color:"#f59e0b",bg:"#451a03"}, empresarial:{label:`🏢 ${t(lang,'roleEmpresarial')}`,color:"#a78bfa",bg:"#2e1065"}, tecnico:{label:`🔧 ${t(lang,'roleTecnico')}`,color:"#60a5fa",bg:"#1e3a5f"} };

  function openEdit(u) {
    if (u.protected) return toast("El superusuario no se puede editar","error");
    setForm({ name:u.name, email:"", password:"", role:u.role });
    setEditing(u.id); setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) return toast("Ingresa el nombre","error");
    if (editing) {
      const err = await updateProfile(editing, { name: form.name.trim(), role: form.role, avatar: mkAvatar(form.name) });
      if (err) return toast("Error al actualizar","error");
      setProfiles(profiles.map(p => p.id === editing ? { ...p, name: form.name.trim(), role: form.role, avatar: mkAvatar(form.name) } : p));
      toast("Usuario actualizado","success");
    } else {
      if (!form.email || form.password.length < 6) return toast("Correo y contraseña requeridos (mín 6 car.)","error");
      const { error } = await sbSignUp(form.name.trim(), form.email.trim().toLowerCase(), form.password, form.role, form.lang || "es");
      if (error) return toast(error.message,"error");
      toast("Usuario creado. Debe confirmar correo.","success");
      setTimeout(async () => setProfiles(await fetchProfiles()), 1500);
    }
    setShowForm(false);
  }

  async function del(id) {
    const u = profiles.find(x => x.id === id);
    if (u?.protected) return toast("El superusuario no se puede eliminar","error");
    if (id === currentUser.id) return toast("No puedes eliminar tu propia cuenta","error");
    const err = await deleteProfile(id);
    if (err) { toast("Elimina desde Supabase Dashboard → Authentication","error"); return; }
    setProfiles(profiles.filter(p => p.id !== id));
    toast("Usuario eliminado","success");
  }

  const all = [SUPERUSER, ...profiles.filter(p => !isSuperEmail(p.email))];

  return (
    <div>
      {showForm && (
        <Modal title={editing?"✏️ Editar Usuario":"➕ Nuevo Usuario"} onClose={() => setShowForm(false)}>
          <Input label="Nombre completo" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Juan Pérez" />
          {!editing && <Input label="Correo electrónico" type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="usuario@empresa.com" />}
          {!editing && <Input label="Contraseña" type="password" value={form.password} onChange={e => setForm({...form,password:e.target.value})} placeholder="Mín. 6 caracteres" />}
          <div style={{ marginBottom:20 }}>
            <label style={S.label}>Perfil</label>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
              {[["empresarial","🏢 Empresarial","Gestiona múltiples técnicos"],["tecnico","🔧 Técnico","Reportes y clientes propios"]].map(([val,lbl,desc]) => (
                <div key={val} onClick={()=>setForm({...form,role:val})} style={{ background:form.role===val?"#1e3a5f":"#1f2937",border:`1.5px solid ${form.role===val?"#2563eb":"#374151"}`,borderRadius:10,padding:"10px 12px",cursor:"pointer" }}>
                  <div style={{fontWeight:700,fontSize:13,color:form.role===val?"#60a5fa":"#f9fafb"}}>{lbl}</div>
                  <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
            <Btn variant="g" onClick={()=>setShowForm(false)}>Cancelar</Btn>
            <Btn variant="s" onClick={save}>✓ Guardar</Btn>
          </div>
        </Modal>
      )}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <div><h2 style={{margin:0,fontSize:20,fontWeight:800,color:"#f9fafb"}}>Usuarios</h2><p style={{margin:"4px 0 0",color:"#6b7280",fontSize:13}}>{all.length} usuarios registrados</p></div>
        <Btn variant="p" onClick={()=>{setForm({name:"",email:"",password:"",role:"tecnico"});setEditing(null);setShowForm(true);}}>+ Nuevo Usuario</Btn>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {all.map(u => {
          const rc = ROLE_CFG[u.role]||ROLE_CFG.tecnico;
          const isMe = u.id === currentUser.id;
          return (
            <div key={u.id} style={{ ...S.card,padding:"16px 20px",display:"flex",gap:14,alignItems:"center",borderColor:u.protected?"#f59e0b30":"#1f2937" }}>
              <Avatar initials={u.avatar||mkAvatar(u.name)} size={44} color={u.protected?"#f59e0b":"#2563eb"} />
              <div style={{ flex:1 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap" }}>
                  <span style={{fontWeight:800,color:"#f9fafb",fontSize:15}}>{u.name}</span>
                  <span style={{fontSize:10,fontWeight:700,color:rc.color,background:rc.bg,padding:"2px 8px",borderRadius:99}}>{rc.label}</span>
                  {isMe && <span style={{fontSize:10,fontWeight:700,color:"#4ade80",background:"#14532d",padding:"2px 8px",borderRadius:99}}>Tú</span>}
                  {u.protected && <span style={{fontSize:10,fontWeight:700,color:"#f59e0b",background:"#451a03",padding:"2px 8px",borderRadius:99}}>🔒 Protegido</span>}
                </div>
                <div style={{fontSize:12,color:"#6b7280"}}>{u.email} {u.created_at && `· Desde ${fmtDate(u.created_at.slice(0,10))}`}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn variant="g" sm onClick={()=>openEdit(u)} style={{opacity:u.protected?.35:1}}>✏️</Btn>
                <Btn variant="d" sm onClick={()=>del(u.id)} style={{opacity:(u.protected||isMe)?.35:1}}>🗑</Btn>
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
// ══════════════════════════════════════════════════════════════════════════════
// MATERIALS MODULE — Almacén de materiales
// ══════════════════════════════════════════════════════════════════════════════
function MaterialsModule({ currentUser, toast, lang = "es" }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPurchase, setShowPurchase] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterLow, setFilterLow] = useState(false);
  const [form, setForm] = useState({ name:"", description:"", category:"General", unit:"pieza", unit_price:0, stock:0, stock_min:5, sku:"" });
  const [purchaseForm, setPurchaseForm] = useState({ quantity:1, unit_price:0, supplier:"", notes:"", purchase_date: today() });
  const [purchases, setPurchases] = useState([]);
  const [saving, setSaving] = useState(false);

  const UNITS = ["pz","m²","m³","ml","kg","lt","rollo","caja","bolsa","cubeta","hr"];
  const CATS  = ["General","Eléctrico","Plomería","Albañilería","Impermeabilización","Pintura","Herramienta","Otro"];

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    const data = await fetchMaterials(currentUser);
    setMaterials(data);
    setLoading(false);
  }

  async function saveMat() {
    if (!form.name.trim()) return toast(lang==="en"?"Enter material name":"Ingresa el nombre","error");
    setSaving(true);
    const payload = editing
      ? { id: editing, ...form }
      : { ...form, created_by: currentUser.id === SUPERUSER.id ? null : currentUser.id };
    const { data, error } = await saveMaterial(payload);
    if (error) { toast(lang==="en"?"Error saving":"Error al guardar","error"); setSaving(false); return; }
    if (editing) setMaterials(materials.map(m => m.id===editing ? data : m));
    else setMaterials([data, ...materials]);
    toast(lang==="en"?"Material saved":"Material guardado","success");
    setShowForm(false); setSaving(false);
  }

  async function delMat(id) {
    const err = await deleteMaterial(id);
    if (err) return toast(lang==="en"?"Error deleting":"Error al eliminar","error");
    setMaterials(materials.filter(m => m.id!==id));
    toast(lang==="en"?"Material deleted":"Material eliminado","success");
  }

  async function openPurchase(mat) {
    setShowPurchase(mat);
    setPurchaseForm({ quantity:1, unit_price: mat.unit_price||0, supplier:"", notes:"", purchase_date: today() });
  }

  async function savePurchase() {
    if (!purchaseForm.quantity || purchaseForm.quantity <= 0) return toast(lang==="en"?"Enter valid quantity":"Ingresa cantidad válida","error");
    setSaving(true);
    const payload = {
      material_id: showPurchase.id,
      created_by: currentUser.id === SUPERUSER.id ? null : currentUser.id,
      quantity: parseFloat(purchaseForm.quantity),
      unit_price: parseFloat(purchaseForm.unit_price)||0,
      total_cost: parseFloat(purchaseForm.quantity) * parseFloat(purchaseForm.unit_price||0),
      supplier: purchaseForm.supplier,
      notes: purchaseForm.notes,
      purchase_date: purchaseForm.purchase_date,
    };
    const { error } = await addPurchase(payload);
    if (error) { toast(lang==="en"?"Error registering purchase":"Error al registrar compra","error"); setSaving(false); return; }
    await load();
    toast(lang==="en"?"Purchase registered":"Compra registrada","success");
    setShowPurchase(null); setSaving(false);
  }

  async function openDetail(mat) {
    setShowDetail(mat);
    const p = await fetchPurchases(mat.id);
    setPurchases(p);
  }

  const lowStock = materials.filter(m => m.stock <= m.stock_min);
  const filtered = materials
    .filter(m => !filterLow || m.stock <= m.stock_min)
    .filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.category?.toLowerCase().includes(search.toLowerCase()) || m.sku?.toLowerCase().includes(search.toLowerCase()));

  const totalValue = materials.reduce((s, m) => s + (m.stock * m.unit_price), 0);

  return (
    <div>
      {/* PURCHASE MODAL */}
      {showPurchase && (
        <Modal title={`🛒 ${lang==="en"?"Register Purchase":"Registrar Compra"} — ${showPurchase.name}`} onClose={()=>setShowPurchase(null)}>
          <Input label={lang==="en"?"QUANTITY":"CANTIDAD"} type="number" value={purchaseForm.quantity} onChange={e=>setPurchaseForm({...purchaseForm,quantity:e.target.value})} />
          <Input label={lang==="en"?"UNIT PRICE":"PRECIO UNITARIO"} type="number" value={purchaseForm.unit_price} onChange={e=>setPurchaseForm({...purchaseForm,unit_price:e.target.value})} />
          <div style={{background:"#1f2937",borderRadius:8,padding:"10px 14px",marginBottom:14,display:"flex",justifyContent:"space-between"}}>
            <span style={{color:"#6b7280",fontSize:13}}>{lang==="en"?"Total cost":"Costo total"}</span>
            <span style={{color:"#4ade80",fontWeight:800}}>{fmtMXN(purchaseForm.quantity * purchaseForm.unit_price)}</span>
          </div>
          <Input label={lang==="en"?"SUPPLIER":"PROVEEDOR"} value={purchaseForm.supplier} onChange={e=>setPurchaseForm({...purchaseForm,supplier:e.target.value})} placeholder={lang==="en"?"Supplier name":"Nombre del proveedor"} />
          <Input label={lang==="en"?"PURCHASE DATE":"FECHA DE COMPRA"} type="date" value={purchaseForm.purchase_date} onChange={e=>setPurchaseForm({...purchaseForm,purchase_date:e.target.value})} />
          <Textarea label={lang==="en"?"NOTES":"NOTAS"} value={purchaseForm.notes} onChange={e=>setPurchaseForm({...purchaseForm,notes:e.target.value})} placeholder={lang==="en"?"Optional notes":"Notas opcionales"} />
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn variant="g" onClick={()=>setShowPurchase(null)}>{lang==="en"?"Cancel":"Cancelar"}</Btn>
            <Btn variant="s" onClick={savePurchase} disabled={saving}>{saving?<><Spinner/>{lang==="en"?"Saving…":"Guardando…"}</>:lang==="en"?"✓ Register":"✓ Registrar"}</Btn>
          </div>
        </Modal>
      )}

      {/* DETAIL MODAL */}
      {showDetail && (
        <Modal title={`📦 ${showDetail.name}`} onClose={()=>setShowDetail(null)} wide>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
            {[
              [lang==="en"?"Stock":"Stock", `${showDetail.stock} ${showDetail.unit}`, showDetail.stock<=showDetail.stock_min?"#f87171":"#4ade80"],
              [lang==="en"?"Unit Price":"Precio unitario", fmtMXN(showDetail.unit_price), "#60a5fa"],
              [lang==="en"?"Total Value":"Valor total", fmtMXN(showDetail.stock * showDetail.unit_price), "#a78bfa"],
            ].map(([l,v,c])=>(
              <div key={l} style={{background:"#1f2937",borderRadius:10,padding:12}}>
                <div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:.5,marginBottom:4}}>{l}</div>
                <div style={{color:c,fontWeight:800,fontSize:18}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{marginBottom:8,color:"#6b7280",fontSize:11,fontWeight:700,letterSpacing:.5}}>{lang==="en"?"PURCHASE HISTORY":"HISTORIAL DE COMPRAS"}</div>
          {purchases.length === 0 ? (
            <div style={{textAlign:"center",padding:30,color:"#4b5563",fontSize:13}}>{lang==="en"?"No purchases registered":"Sin compras registradas"}</div>
          ) : (
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#1f2937"}}>
                {[lang==="en"?"Date":"Fecha", lang==="en"?"Qty":"Cant.", lang==="en"?"Unit Price":"P.U.", lang==="en"?"Total":"Total", lang==="en"?"Supplier":"Proveedor"].map(h=><th key={h} style={{padding:"8px 12px",color:"#6b7280",textAlign:"left"}}>{h}</th>)}
              </tr></thead>
              <tbody>{purchases.map(p=>(
                <tr key={p.id} style={{borderBottom:"1px solid #1f2937"}}>
                  <td style={{padding:"8px 12px",color:"#f9fafb"}}>{fmtDate(p.purchase_date)}</td>
                  <td style={{padding:"8px 12px",color:"#f9fafb"}}>{p.quantity} {showDetail.unit}</td>
                  <td style={{padding:"8px 12px",color:"#9ca3af"}}>{fmtMXN(p.unit_price)}</td>
                  <td style={{padding:"8px 12px",color:"#4ade80",fontWeight:700}}>{fmtMXN(p.total_cost)}</td>
                  <td style={{padding:"8px 12px",color:"#9ca3af"}}>{p.supplier||"—"}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:14}}>
            <Btn variant="s" onClick={()=>{setShowDetail(null);openPurchase(showDetail);}}>🛒 {lang==="en"?"New Purchase":"Nueva Compra"}</Btn>
          </div>
        </Modal>
      )}

      {/* MATERIAL FORM MODAL */}
      {showForm && (
        <Modal title={editing?(lang==="en"?"✏️ Edit Material":"✏️ Editar Material"):(lang==="en"?"➕ New Material":"➕ Nuevo Material")} onClose={()=>setShowForm(false)}>
          <Input label={lang==="en"?"NAME":"NOMBRE"} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={lang==="en"?"Material name":"Nombre del material"} />
          <Input label={lang==="en"?"SKU / CODE":"SKU / CÓDIGO"} value={form.sku||""} onChange={e=>setForm({...form,sku:e.target.value})} placeholder={lang==="en"?"Optional code":"Código opcional"} />
          <Textarea label={lang==="en"?"DESCRIPTION":"DESCRIPCIÓN"} value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder={lang==="en"?"Optional description":"Descripción opcional"} />
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Sel label={lang==="en"?"CATEGORY":"CATEGORÍA"} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
              {CATS.map(c=><option key={c}>{c}</option>)}
            </Sel>
            <Sel label={lang==="en"?"UNIT":"UNIDAD"} value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
              {UNITS.map(u=><option key={u}>{u}</option>)}
            </Sel>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <Input label={lang==="en"?"UNIT PRICE":"PRECIO UNIT."} type="number" value={form.unit_price} onChange={e=>setForm({...form,unit_price:parseFloat(e.target.value)||0})} />
            <Input label={lang==="en"?"INITIAL STOCK":"STOCK INICIAL"} type="number" value={form.stock} onChange={e=>setForm({...form,stock:parseFloat(e.target.value)||0})} />
            <Input label={lang==="en"?"MIN STOCK":"STOCK MÍNIMO"} type="number" value={form.stock_min} onChange={e=>setForm({...form,stock_min:parseFloat(e.target.value)||0})} />
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn variant="g" onClick={()=>setShowForm(false)}>{lang==="en"?"Cancel":"Cancelar"}</Btn>
            <Btn variant="s" onClick={saveMat} disabled={saving}>{saving?<><Spinner/>{lang==="en"?"Saving…":"Guardando…"}</>:lang==="en"?"✓ Save":"✓ Guardar"}</Btn>
          </div>
        </Modal>
      )}

      {/* HEADER */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:800,color:"#f9fafb"}}>{lang==="en"?"Warehouse":"Almacén"}</h2>
          <p style={{margin:"4px 0 0",color:"#6b7280",fontSize:13}}>{materials.length} {lang==="en"?"materials":"materiales"} · {lang==="en"?"Total value":"Valor total"}: <span style={{color:"#4ade80",fontWeight:700}}>{fmtMXN(totalValue)}</span></p>
        </div>
        <Btn variant="p" onClick={()=>{setForm({name:"",description:"",category:"General",unit:"pieza",unit_price:0,stock:0,stock_min:5,sku:""});setEditing(null);setShowForm(true);}}>+ {lang==="en"?"New Material":"Nuevo Material"}</Btn>
      </div>

      {/* LOW STOCK ALERT */}
      {lowStock.length > 0 && (
        <div style={{background:"#450a0a",border:"1px solid #f8717140",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setFilterLow(!filterLow)}>
          <span style={{fontSize:18}}>⚠️</span>
          <span style={{color:"#f87171",fontWeight:700,fontSize:13}}>{lowStock.length} {lang==="en"?"materials with low stock":"materiales con stock bajo"}</span>
          <span style={{color:"#f87171",fontSize:12,marginLeft:"auto"}}>{filterLow?(lang==="en"?"Show all":"Ver todos"):(lang==="en"?"Show only":"Ver solo estos")}</span>
        </div>
      )}

      {/* FILTERS */}
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={lang==="en"?"🔍 Search materials…":"🔍 Buscar materiales…"} style={{...S.input,flex:1}} />
      </div>

      {/* LIST */}
      {loading ? (
        <div style={{display:"flex",justifyContent:"center",padding:40}}><Spinner/></div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 0",color:"#4b5563"}}>
          <div style={{fontSize:52,marginBottom:12}}>📦</div>
          <div style={{fontSize:16,fontWeight:700,color:"#6b7280",marginBottom:8}}>{lang==="en"?"No materials yet":"Sin materiales"}</div>
          <Btn variant="p" onClick={()=>{setForm({name:"",description:"",category:"General",unit:"pieza",unit_price:0,stock:0,stock_min:5,sku:""});setEditing(null);setShowForm(true);}}>+ {lang==="en"?"Add first material":"Agregar primer material"}</Btn>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(m => {
            const isLow = m.stock <= m.stock_min;
            return (
              <div key={m.id} style={{...S.card,padding:"14px 18px",display:"flex",gap:14,alignItems:"center",borderColor:isLow?"#f8717140":"#1f2937",cursor:"pointer"}}
                onClick={()=>openDetail(m)}
                onMouseEnter={e=>e.currentTarget.style.borderColor=isLow?"#f87171":"#2563eb"}
                onMouseLeave={e=>e.currentTarget.style.borderColor=isLow?"#f8717140":"#1f2937"}>
                <div style={{width:44,height:44,borderRadius:10,background:isLow?"#450a0a":"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                  {m.category==="Eléctrico"?"⚡":m.category==="Plomería"?"🔧":m.category==="Pintura"?"🎨":m.category==="Herramienta"?"🔨":"📦"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span style={{fontWeight:800,color:"#f9fafb",fontSize:14}}>{m.name}</span>
                    <span style={{fontSize:10,background:"#1f2937",color:"#6b7280",padding:"1px 7px",borderRadius:99}}>{m.category}</span>
                    {isLow && <span style={{fontSize:10,background:"#450a0a",color:"#f87171",padding:"1px 7px",borderRadius:99,fontWeight:700}}>⚠ {lang==="en"?"Low stock":"Stock bajo"}</span>}
                  </div>
                  <div style={{display:"flex",gap:14,fontSize:12,color:"#6b7280"}}>
                    {m.sku && <span>#{m.sku}</span>}
                    <span>{lang==="en"?"Unit price":"P.U."}: {fmtMXN(m.unit_price)}</span>
                    <span>{lang==="en"?"Min":"Mín"}: {m.stock_min} {m.unit}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:12,alignItems:"center",flexShrink:0}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{color:"#6b7280",fontSize:10}}>{lang==="en"?"Stock":"Stock"}</div>
                    <div style={{color:isLow?"#f87171":"#4ade80",fontWeight:800,fontSize:18}}>{m.stock} <span style={{fontSize:11,fontWeight:400}}>{m.unit}</span></div>
                  </div>
                  <div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
                    <Btn variant="s" sm onClick={()=>openPurchase(m)}>🛒</Btn>
                    <Btn variant="g" sm onClick={()=>{setForm({name:m.name,description:m.description||"",category:m.category,unit:m.unit,unit_price:m.unit_price,stock:m.stock,stock_min:m.stock_min,sku:m.sku||""});setEditing(m.id);setShowForm(true);}}>✏️</Btn>
                    <Btn variant="d" sm onClick={()=>delMat(m.id)}>🗑</Btn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── REPORT MATERIALS PANEL (inside ReportDetail) ──────────────────────────────
function ReportMaterialsPanel({ report, client, currentUser, lang = "es", toast }) {
  const [assignments, setAssignments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedMat, setSelectedMat] = useState("");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    const [a, m] = await Promise.all([fetchAssignments(report.id), fetchMaterials(currentUser)]);
    setAssignments(a);
    setMaterials(m.filter(m => m.stock > 0));
    setLoading(false);
  }

  async function assign() {
    if (!selectedMat || qty <= 0) return toast(lang==="en"?"Select material and quantity":"Selecciona material y cantidad","error");
    const mat = materials.find(m => m.id === selectedMat);
    if (!mat) return;
    if (qty > mat.stock) return toast(lang==="en"?"Insufficient stock":"Stock insuficiente","error");
    setAdding(true);
    const { error } = await addAssignment({
      material_id: selectedMat,
      report_id: report.id,
      created_by: currentUser.id === SUPERUSER.id ? null : currentUser.id,
      quantity: parseFloat(qty),
      unit_price: mat.unit_price,
      total_cost: parseFloat(qty) * mat.unit_price,
      notes,
    });
    if (error) { toast(lang==="en"?"Error assigning":"Error al asignar","error"); setAdding(false); return; }
    await load();
    setSelectedMat(""); setQty(1); setNotes("");
    setAdding(false);
    toast(lang==="en"?"Material assigned":"Material asignado","success");
  }

  async function remove(id) {
    const err = await deleteAssignment(id);
    if (err) return toast(lang==="en"?"Error removing":"Error al eliminar","error");
    await load();
    toast(lang==="en"?"Material removed":"Material eliminado","success");
  }

  const totalCost = assignments.reduce((s, a) => s + (a.total_cost || 0), 0);

  if (loading) return <div style={{display:"flex",justifyContent:"center",padding:20}}><Spinner/></div>;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
        <Btn variant="cyan" sm onClick={()=>exportPDFMaterials(report, client, assignments, totalCost, lang)}>📄 PDF {lang==="en"?" Materials":"Materiales"}</Btn>
        
      </div>
      {/* Assign material */}
      <div style={{background:"#1f2937",borderRadius:10,padding:14,marginBottom:16}}>
        <label style={S.label}>{lang==="en"?"ASSIGN MATERIAL":"ASIGNAR MATERIAL"}</label>
        <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
          <select value={selectedMat} onChange={e=>setSelectedMat(e.target.value)} style={{...S.input,flex:2,minWidth:140}}>
            <option value="">{lang==="en"?"Select material…":"Seleccionar material…"}</option>
            {materials.map(m=><option key={m.id} value={m.id}>{m.name} ({lang==="en"?"stock":"stock"}: {m.stock} {m.unit})</option>)}
          </select>
          <input type="number" min={0.1} step={0.1} value={qty} onChange={e=>setQty(e.target.value)} style={{...S.input,width:80}} placeholder={lang==="en"?"Qty":"Cant."} />
          <Btn variant="s" onClick={assign} disabled={adding}>{adding?<><Spinner/></>:lang==="en"?"+ Assign":"+ Asignar"}</Btn>
        </div>
        {selectedMat && (
          <div style={{color:"#6b7280",fontSize:12,marginTop:6}}>
            {lang==="en"?"Estimated cost":"Costo estimado"}: <span style={{color:"#4ade80",fontWeight:700}}>{fmtMXN(qty * (materials.find(m=>m.id===selectedMat)?.unit_price||0))}</span>
          </div>
        )}
      </div>

      {/* Assignments list */}
      {assignments.length === 0 ? (
        <div style={{textAlign:"center",padding:24,color:"#4b5563",fontSize:13}}>
          <div style={{fontSize:32,marginBottom:8}}>📦</div>
          {lang==="en"?"No materials assigned to this report":"Sin materiales asignados a este reporte"}
        </div>
      ) : (
        <>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,marginBottom:12}}>
            <thead><tr style={{background:"#1f2937"}}>
              {[lang==="en"?"Material":"Material", lang==="en"?"Qty":"Cant.", lang==="en"?"Unit Price":"P.U.", lang==="en"?"Total":"Total",""].map(h=><th key={h} style={{padding:"8px 12px",color:"#6b7280",textAlign:"left"}}>{h}</th>)}
            </tr></thead>
            <tbody>{assignments.map(a=>(
              <tr key={a.id} style={{borderBottom:"1px solid #1f2937"}}>
                <td style={{padding:"8px 12px",color:"#f9fafb"}}>{a.materials?.name||"—"}</td>
                <td style={{padding:"8px 12px",color:"#9ca3af"}}>{a.quantity} {a.materials?.unit||""}</td>
                <td style={{padding:"8px 12px",color:"#9ca3af"}}>{fmtMXN(a.unit_price)}</td>
                <td style={{padding:"8px 12px",color:"#4ade80",fontWeight:700}}>{fmtMXN(a.total_cost)}</td>
                <td style={{padding:"8px 12px"}}><button onClick={()=>remove(a.id)} style={{background:"#dc262630",border:"none",borderRadius:6,color:"#f87171",padding:"4px 8px",cursor:"pointer"}}>✕</button></td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <div style={{background:"#1f2937",borderRadius:8,padding:"10px 16px",display:"flex",gap:16,alignItems:"center"}}>
              <span style={{color:"#6b7280",fontSize:13}}>{lang==="en"?"Total materials cost":"Costo total materiales"}</span>
              <span style={{color:"#4ade80",fontWeight:800,fontSize:16}}>{fmtMXN(totalCost)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ClientsModule({ clients, setClients, reports, toast, currentUser, lang = 'es' }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name:"",email:"",phone:"",rfc:"",address:"",contact:"",status:"activo" });

  function openNew() { setForm({name:"",email:"",phone:"",rfc:"",address:"",contact:"",status:"activo"}); setEditing(null); setShowForm(true); }
  function openEdit(c) { setForm({...c}); setEditing(c.id); setShowForm(true); }

  async function save() {
    if (!form.name) return toast(t(lang,"clientNameRequired"),"error");
    const payload = editing ? { id: editing, ...form } : { ...form, created_by: currentUser.id === SUPERUSER.id ? null : currentUser.id };
    const { data, error } = await upsertClient(payload);
    if (error) return toast("Error al guardar","error");
    if (editing) setClients(clients.map(c => c.id===editing?data:c));
    else setClients([data,...clients]);
    toast(editing?t(lang,"clientUpdated"):t(lang,"clientCreated"),"success");
    setShowForm(false);
  }

  async function del(id) {
    if (reports.some(r => r.client_id===id)) return toast(t(lang,"clientHasReports"),"error");
    const err = await deleteClient(id);
    if (err) return toast("Error al eliminar","error");
    setClients(clients.filter(c => c.id!==id));
    toast(t(lang,"clientDeleted"),"success");
  }

  const filtered = clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {showForm && (
        <Modal title={editing?t(lang,'editClient'):"➕ " + t(lang,'newClient').replace('+ ','')} onClose={()=>setShowForm(false)}>
          <Input label={t(lang,'companyName')} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={t(lang,'companyPlaceholder')} />
          <Input label={t(lang,'email')} value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} type="email" placeholder={t(lang,'emailPlaceholder')} />
          <Input label={t(lang,'phone')} value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})} placeholder={t(lang,'phonePlaceholder')} />
          <Input label={t(lang,'rfc')} value={form.rfc||""} onChange={e=>setForm({...form,rfc:e.target.value})} placeholder={t(lang,'rfcPlaceholder')} />
          <Input label={t(lang,'contactPerson')} value={form.contact||""} onChange={e=>setForm({...form,contact:e.target.value})} placeholder={t(lang,'contactPlaceholder')} />
          <Textarea label={t(lang,'address')} value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})} placeholder={t(lang,'addressPlaceholder')} />
          <Sel label={t(lang,'status')} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
            <option value="activo">{t(lang,'active')}</option><option value="inactivo">{t(lang,'inactive')}</option>
          </Sel>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn variant="g" onClick={()=>setShowForm(false)}>{t(lang,'cancel')}</Btn><Btn variant="s" onClick={save}>{t(lang,'save')}</Btn></div>
        </Modal>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h2 style={{margin:0,fontSize:20,fontWeight:800,color:"#f9fafb"}}>{t(lang,'clientsTitle')}</h2><p style={{margin:"4px 0 0",color:"#6b7280",fontSize:13}}>{clients.length} {t(lang,'clients').toLowerCase()}</p></div>
        <Btn variant="p" onClick={openNew}>{t(lang,'newClient')}</Btn>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t(lang,'searchClient')} style={{...S.input,marginBottom:16}} />
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(c => (
          <div key={c.id} style={{...S.card,padding:"16px 20px",display:"flex",gap:14,alignItems:"center"}}>
            <Avatar initials={c.name.split(" ").map(w=>w[0]).join("").slice(0,2)} size={44} color="#2563eb" />
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <span style={{fontWeight:800,color:"#f9fafb",fontSize:15}}>{c.name}</span>
                <span style={{fontSize:10,fontWeight:700,color:c.status==="activo"?"#4ade80":"#6b7280",background:c.status==="activo"?"#14532d":"#1f2937",padding:"1px 7px",borderRadius:99}}>{c.status==="activo"?t(lang,'active'):t(lang,'inactive')}</span>
              </div>
              <div style={{display:"flex",gap:14,fontSize:12,color:"#6b7280",flexWrap:"wrap"}}>
                {c.email&&<span>✉ {c.email}</span>}{c.phone&&<span>📞 {c.phone}</span>}{c.contact&&<span>👤 {c.contact}</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{textAlign:"center"}}><div style={{color:"#6b7280",fontSize:10}}>Reportes</div><div style={{color:"#60a5fa",fontWeight:800,fontSize:18}}>{reports.filter(r=>r.client_id===c.id).length}</div></div>
              <Btn variant="g" sm onClick={()=>openEdit(c)}>✏️</Btn>
              <Btn variant="d" sm onClick={()=>del(c.id)}>🗑</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS MODULE
// ══════════════════════════════════════════════════════════════════════════════
function NotificationsPanel({ notifs, setNotifs, currentUser, lang = 'es', onSelectReport }) {
  const unread = notifs.filter(n => !n.is_read).length;
  const icon = t => t==="success"?"✓":t==="warning"?"⚠":t==="error"?"✕":"ℹ";
  const color = t => t==="success"?"#4ade80":t==="warning"?"#fbbf24":t==="error"?"#f87171":"#60a5fa";

  async function mark(id) { await markNotifRead(id); setNotifs(notifs.map(n=>n.id===id?{...n,is_read:true}:n)); }
  async function markAll() { await markAllNotifsRead(currentUser.id); setNotifs(notifs.map(n=>({...n,is_read:true}))); }
  async function del(id) { await deleteNotif(id); setNotifs(notifs.filter(n=>n.id!==id)); }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h2 style={{margin:0,fontSize:20,fontWeight:800,color:"#f9fafb"}}>{t(lang,'notificationsTitle')}</h2><p style={{margin:"4px 0 0",color:"#6b7280",fontSize:13}}>{unread} {t(lang,'unread')}</p></div>
        {unread>0&&<Btn variant="g" sm onClick={markAll}>{t(lang,'markAllRead')}</Btn>}
      </div>
      {notifs.length===0?(
        <div style={{textAlign:"center",padding:"60px 0",color:"#4b5563"}}><div style={{fontSize:52,marginBottom:12}}>🔔</div><div style={{fontSize:16,fontWeight:700,color:"#6b7280"}}>{t(lang,'noNotifications')}</div></div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {notifs.map(n=>(
            <div key={n.id} onClick={()=>{mark(n.id);if(n.report_id&&onSelectReport)onSelectReport(n.report_id);}} style={{...S.card,padding:"14px 18px",display:"flex",gap:14,alignItems:"flex-start",cursor:"pointer",borderColor:!n.is_read?`${color(n.type)}30`:"#1f2937",opacity:n.is_read?.6:1,transition:"opacity .2s"}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${color(n.type)}20`,display:"flex",alignItems:"center",justifyContent:"center",color:color(n.type),fontWeight:800,fontSize:16,flexShrink:0}}>{icon(n.type)}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <span style={{fontWeight:700,color:"#f9fafb",fontSize:14}}>{n.title}</span>
                  {!n.is_read&&<span style={{width:7,height:7,borderRadius:99,background:color(n.type),display:"inline-block"}}/>}
                </div>
                <p style={{margin:0,color:"#9ca3af",fontSize:13}}>{n.body}</p>
                <div style={{color:"#4b5563",fontSize:11,marginTop:4}}>{fmtDate(n.created_at?.slice(0,10))}</div>
              </div>
              <button onClick={e=>{e.stopPropagation();del(n.id);}} style={{background:"none",border:"none",color:"#374151",cursor:"pointer",fontSize:14,padding:4}}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NEW REPORT MODAL
// ══════════════════════════════════════════════════════════════════════════════
function NewReportModal({ onClose, onSave, clients, profiles, currentUser, lang = 'es' }) {
  const isAdmin = ["empresarial","superadmin"].includes(currentUser.role);
  const [form, setForm] = useState({ clientId:"", title:"", description:"", date:today(), assignedTo: isAdmin?"":currentUser.id });
  const [findings, setFindings] = useState([{ id:genId(), description:"", severity:"media" }]);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  async function handlePhotoNative() {
    if (isNative()) {
      // Running on Android/iOS — show picker: Camera or Gallery
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt, // shows "Camera" or "Photos" choice
          promptLabelHeader: "Foto",
          promptLabelCancel: "Cancelar",
          promptLabelPhoto: "Elegir de galería",
          promptLabelPicture: "Tomar foto",
        });
        const blob = await fetch(image.dataUrl).then(r => r.blob());
        const file = new File([blob], `photo_${genId()}.jpg`, { type: "image/jpeg" });
        setPhotos(p => [...p, { id: genId(), url: image.dataUrl, name: file.name, file }]);
      } catch(e) {
        if (e?.message && !e.message.includes("cancel")) console.error("Camera error:", e);
      }
    } else {
      // Running on web — use file picker
      fileRef.current.click();
    }
  }

  function handlePhoto(e) {
    Array.from(e.target.files).forEach(f => {
      const previewUrl = URL.createObjectURL(f);
      setPhotos(p => [...p, { id: genId(), url: previewUrl, name: f.name, file: f }]);
    });
  }

  async function save() {
    if (!form.clientId||!form.title) return alert("Completa cliente y título");
    if (isAdmin&&!form.assignedTo) return alert("Selecciona el técnico asignado");
    setSaving(true);
    const assignedId = isAdmin ? form.assignedTo : currentUser.id;
    const assignedProfile = profiles.find(p => p.id === assignedId) || (assignedId===SUPERUSER.id?SUPERUSER:null);
    const payload = {
      folio: mkFolio(),
      title: form.title,
      description: form.description,
      date: form.date,
      client_id: form.clientId,
      created_by: currentUser.id === SUPERUSER.id ? null : currentUser.id,
      created_by_name: currentUser.name,
      assigned_to: assignedId === SUPERUSER.id ? null : assignedId,
      assigned_to_name: assignedProfile?.name || "",
      status: "borrador",
    };
    const { data: rep, error } = await createReport(payload, findings, currentUser);
    if (error) { alert("Error al crear reporte: " + error.message); setSaving(false); return; }

    // Upload photos to Supabase Storage
    if (photos.length && rep?.id) {
      for (const photo of photos) {
        if (!photo.file) continue;
        const ext = photo.name.split(".").pop();
        const path = `${rep.id}/${photo.id}.${ext}`;
        const { data: stored } = await supabase.storage
          .from("report-photos")
          .upload(path, photo.file, { upsert: true });
        if (stored) {
          const { data: { publicUrl } } = supabase.storage
            .from("report-photos")
            .getPublicUrl(path);
          await supabase.from("photos").insert({
            report_id: rep.id,
            url: publicUrl,
            name: photo.name,
          });
        }
      }
    }

    onSave();
    setSaving(false);
  }

  const techUsers = currentUser.role === "superadmin"
    ? profiles.filter(p => p.role === "tecnico")
    : profiles.filter(p => p.role === "tecnico" && (currentUser.members || []).includes(p.id));

  return (
    
    <Modal title={`📋 ${t(lang,'reportTitle')}`} onClose={onClose} wide>
      <div className="grid-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div>
          <Sel label={t(lang,'client')} value={form.clientId} onChange={e=>setForm({...form,clientId:e.target.value})}>
            <option value="">{t(lang,'selectClient')}</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </Sel>
          <Input label={t(lang,'reportTitle')} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ej. Reparación techo edificio A" />
          <Input label={t(lang,'inspectionDate')} type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} />
          {isAdmin?(
            <Sel label={t(lang,'assignedTech')} value={form.assignedTo} onChange={e=>setForm({...form,assignedTo:e.target.value})}>
              <option value="">{t(lang,'selectTech')}</option>
              {techUsers.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </Sel>
          ):(
            <div style={{marginBottom:13}}>
              <label style={S.label}>Técnico Asignado</label>
              <div style={{...S.input,background:"#111827",color:"#6b7280",display:"flex",alignItems:"center",gap:8}}>🔒 {currentUser.name} <span style={{fontSize:11,color:"#4b5563"}}>(tú)</span></div>
            </div>
          )}
        </div>
        <div>
          <Textarea label={t(lang,'description')} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder={t(lang,'descriptionPlaceholder')} style={{minHeight:130}} />
          <div style={{marginBottom:12}}>
            <label style={S.label}>{t(lang,'photos')} ({photos.length})</label>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} style={{display:"none"}} />
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {photos.map(p=>(
                <div key={p.id} style={{position:"relative"}}>
                  <img src={p.url} alt="" style={{width:64,height:64,objectFit:"cover",borderRadius:8,border:"1px solid #374151"}} />
                  <button onClick={()=>setPhotos(photos.filter(x=>x.id!==p.id))} style={{position:"absolute",top:-6,right:-6,background:"#dc2626",border:"none",borderRadius:99,color:"#fff",width:18,height:18,cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                </div>
              ))}
              <button onClick={handlePhotoNative} style={{width:64,height:64,border:"2px dashed #374151",borderRadius:8,background:"none",color:"#4b5563",cursor:"pointer",fontSize:22}}>+</button>
            </div>
          </div>
        </div>
      </div>
      <div>
        <label style={S.label}>{t(lang,'findings')}</label>
        {findings.map((f,i)=>(
          <div key={f.id} style={{display:"flex",gap:8,marginBottom:8}}>
            <input value={f.description} onChange={e=>setFindings(findings.map((x,j)=>j===i?{...x,description:e.target.value}:x))} placeholder={`${t(lang,'findingPlaceholder')} ${i+1}`} style={{...S.input,flex:1}} />
            <select value={f.severity} onChange={e=>setFindings(findings.map((x,j)=>j===i?{...x,severity:e.target.value}:x))} style={{...S.input,width:90}}>
              <option value="baja">{t(lang,'severityLow')}</option><option value="media">{t(lang,'severityMed')}</option><option value="alta">{t(lang,'severityHigh')}</option>
            </select>
            <button onClick={()=>setFindings(findings.filter((_,j)=>j!==i))} style={{background:"#dc262630",border:"none",borderRadius:8,color:"#f87171",padding:"0 12px",cursor:"pointer"}}>✕</button>
          </div>
        ))}
        <Btn variant="g" sm onClick={()=>setFindings([...findings,{id:genId(),description:"",severity:"media"}])}>{t(lang,'addFinding')}</Btn>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:16,borderTop:"1px solid #1f2937",marginTop:16}}>
        <Btn variant="g" onClick={onClose}>{t(lang,'cancel')}</Btn>
        <Btn variant="p" onClick={save} disabled={saving}>{saving?<><Spinner/>{t(lang,'saving')}</>:t(lang,'saveReport')}</Btn>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BUDGET MODAL
// ══════════════════════════════════════════════════════════════════════════════
function BudgetModal({ report, onClose, onSave, lang = 'es' }) {
  const existing = report.budget;
  const [items, setItems] = useState(report.budgetItems?.length ? report.budgetItems.map(i=>({...i,id:i.id||genId()})) : [{id:genId(),concept:"",unit:"m²",qty:1,price:0,total:0}]);
  const [pct, setPct] = useState(existing?.advance_pct||50);
  const [saving, setSaving] = useState(false);

  function upd(i,fld,v) {
    const u = items.map((x,j)=>{if(j!==i)return x;const n={...x,[fld]:(fld==="qty"||fld==="price")?parseFloat(v)||0:v};n.total=n.qty*n.price;return n;});
    setItems(u);
  }
  const taxCfg = getTax(lang);
  const [taxRate, setTaxRate] = useState(taxCfg.rate * 100);
  const sub=items.reduce((s,x)=>s+(x.total||0),0), iva=sub*(taxRate/100), total=sub+iva;

  async function save() {
    setSaving(true);
    await saveBudget(report.id, { subtotal:sub, iva, total, advance_pct:pct, tax_rate:taxRate, advance_paid:existing?.advance_paid||false, final_paid:existing?.final_paid||false }, items);
    onSave(); setSaving(false);
  }

  return (
    <Modal title={t(lang,'editBudget')} onClose={onClose} wide>
      <div className="budget-table-wrap" style={{overflowX:"auto",marginBottom:16}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{background:"#1f2937"}}>{[t(lang,"concept"),t(lang,"unit"),t(lang,"quantity"),t(lang,"unitPrice"),t(lang,"total"),""].map(h=><th key={h} style={{padding:"8px 10px",color:"#6b7280",fontWeight:700,textAlign:"left"}}>{h}</th>)}</tr></thead>
          <tbody>{items.map((item,i)=>(
            <tr key={item.id} style={{borderBottom:"1px solid #1f2937"}}>
              <td style={{padding:"5px 6px"}}><input value={item.concept} onChange={e=>upd(i,"concept",e.target.value)} style={{...S.input,minWidth:150}} /></td>
              <td style={{padding:"5px 6px"}}><select value={item.unit} onChange={e=>upd(i,"unit",e.target.value)} style={{...S.input,width:70}}>{["m²","m³","ml","kg","pieza","global","hr","día"].map(u=><option key={u}>{u}</option>)}</select></td>
              <td style={{padding:"5px 6px"}}><input type="number" value={item.qty} onChange={e=>upd(i,"qty",e.target.value)} style={{...S.input,width:70}} /></td>
              <td style={{padding:"5px 6px"}}><input type="number" value={item.price} onChange={e=>upd(i,"price",e.target.value)} style={{...S.input,width:100}} /></td>
              <td style={{padding:"5px 6px",color:"#4ade80",fontWeight:700,whiteSpace:"nowrap"}}>{fmtMXN(item.total)}</td>
              <td style={{padding:"5px 6px"}}><button onClick={()=>setItems(items.filter((_,j)=>j!==i))} style={{background:"#dc262630",border:"none",borderRadius:6,color:"#f87171",padding:"4px 8px",cursor:"pointer"}}>✕</button></td>
            </tr>
          ))}</tbody>
        </table>
        <Btn variant="g" sm onClick={()=>setItems([...items,{id:genId(),concept:"",unit:"m²",qty:1,price:0,total:0}])} style={{marginTop:10}}>{t(lang,'addItem')}</Btn>
      </div>
      <div style={{display:"flex",gap:16,justifyContent:"flex-end",flexWrap:"wrap"}}>
        <div style={{background:"#1f2937",borderRadius:10,padding:14,minWidth:220}}>
          {[[t(lang,"subtotal"),sub,"#9ca3af"],[`${getTax(lang).name} ${taxRate}%`,iva,"#9ca3af"],[t(lang,"total"),total,"#4ade80"]].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:6,borderTop:l==="TOTAL"?"1px solid #374151":"none",paddingTop:l==="TOTAL"?8:0,fontWeight:l==="TOTAL"?800:400,fontSize:l==="TOTAL"?16:13}}>
              <span style={{color:c}}>{l}</span><span style={{color:c}}>{fmtMXN(v)}</span>
            </div>
          ))}
        </div>
        <div style={{background:"#1f2937",borderRadius:10,padding:14,minWidth:220}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <label style={{...S.label,marginBottom:0}}>{getTax(lang).name} %</label>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="number" min={0} max={30} step={0.5} value={taxRate} onChange={e=>setTaxRate(parseFloat(e.target.value)||0)} style={{...S.input,width:70,padding:"4px 8px",fontSize:13}} />
              <span style={{color:"#6b7280",fontSize:12}}>%</span>
            </div>
          </div>
          <label style={S.label}>{t(lang,"advanceRequired")}</label>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <input type="range" min={10} max={80} value={pct} onChange={e=>setPct(parseInt(e.target.value))} style={{flex:1}} />
            <span style={{color:"#a78bfa",fontWeight:800,fontSize:18,minWidth:38}}>{pct}%</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7280",marginTop:6}}>
            <span>{t(lang,"advanceRequired")}:</span><span style={{color:"#a78bfa",fontWeight:700}}>{fmtMXN(total*pct/100)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7280"}}>
            <span>{t(lang,"finalPayment")}:</span><span style={{color:"#9ca3af",fontWeight:700}}>{fmtMXN(total*(100-pct)/100)}</span>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:16}}>
        <Btn variant="g" onClick={onClose}>{t(lang,'cancel')}</Btn>
        <Btn variant="s" onClick={save} disabled={saving}>{saving?<><Spinner/>{t(lang,'saving')}</>:t(lang,'save')}</Btn>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULE MODAL
// ══════════════════════════════════════════════════════════════════════════════
function ScheduleModal({ report, onClose, onSave, lang = 'es' }) {
  const [acts, setActs] = useState(report.schedule?.length ? report.schedule.map(a=>({...a,start_date:a.start_date||today(),end_date:a.end_date||addDays(today(),1)})) : [{id:genId(),activity:"",start_date:today(),end_date:addDays(today(),1),responsible:"",status:"pendiente",progress:0}]);
  const [saving, setSaving] = useState(false);
  function upd(i,f,v){setActs(acts.map((x,j)=>j===i?{...x,[f]:v}:x));}
  const overall=acts.length?Math.round(acts.reduce((s,a)=>s+(a.progress||0),0)/acts.length):0;

  async function save(){setSaving(true);await saveSchedule(report.id,acts);onSave();setSaving(false);}

  return (
    <Modal title={t(lang,'scheduleTitle')} onClose={onClose} wide>
      <div style={{background:"#1f2937",borderRadius:10,padding:12,marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
        <div style={{flex:1}}><ProgressBar value={overall} color="#2563eb"/></div>
        <span style={{color:"#2563eb",fontWeight:800,fontSize:18}}>{overall}% {t(lang,'overallProgress')}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {acts.map((a,i)=>(
          <div key={a.id||i} style={{background:"#1f2937",borderRadius:10,padding:14}}>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <input value={a.activity} onChange={e=>upd(i,"activity",e.target.value)} placeholder={t(lang,"activityName")} style={{...S.input,flex:1}} />
              <select value={a.status} onChange={e=>upd(i,"status",e.target.value)} style={{...S.input,width:120,color:ACT_CFG[a.status]?.color}}>
                <option value="pendiente">{t(lang,"statusPending")}</option><option value="en_curso">{t(lang,"statusInProgress")}</option><option value="completada">{t(lang,"statusDone")}</option>
              </select>
              <button onClick={()=>setActs(acts.filter((_,j)=>j!==i))} style={{background:"#dc262630",border:"none",borderRadius:8,color:"#f87171",padding:"0 12px",cursor:"pointer"}}>✕</button>
            </div>
            <div className="schedule-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
              <div><label style={{...S.label,fontSize:10}}>{t(lang,"startDate")}</label><input type="date" value={a.start_date} onChange={e=>upd(i,"start_date",e.target.value)} style={{...S.input,marginTop:4}} /></div>
              <div><label style={{...S.label,fontSize:10}}>{t(lang,"endDate")}</label><input type="date" value={a.end_date} onChange={e=>upd(i,"end_date",e.target.value)} style={{...S.input,marginTop:4}} /></div>
              <div><label style={{...S.label,fontSize:10}}>{t(lang,"responsible")}</label><input value={a.responsible||""} onChange={e=>upd(i,"responsible",e.target.value)} placeholder={t(lang,"responsiblePlaceholder")} style={{...S.input,marginTop:4}} /></div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{color:"#6b7280",fontSize:12}}>{t(lang,"progress")}</span>
              <input type="range" min={0} max={100} value={a.progress||0} onChange={e=>upd(i,"progress",parseInt(e.target.value))} style={{flex:1}} />
              <span style={{color:"#4ade80",fontWeight:700,minWidth:34}}>{a.progress||0}%</span>
            </div>
            <ProgressBar value={a.progress||0} color={a.status==="completada"?"#4ade80":a.status==="en_curso"?"#fb923c":"#374151"} />
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,marginTop:14}}>
        <Btn variant="g" sm onClick={()=>setActs([...acts,{id:genId(),activity:"",start_date:today(),end_date:addDays(today(),1),responsible:"",status:"pendiente",progress:0}])}>{t(lang,'addActivity')}</Btn>
        <div style={{flex:1}}/>
        <Btn variant="g" onClick={onClose}>{t(lang,'cancel')}</Btn>
        <Btn variant="s" onClick={save} disabled={saving}>{saving?<><Spinner/>{t(lang,'saving')}</>:t(lang,'save')}</Btn>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LABOR COSTS PANEL — Registro de mano de obra
// ══════════════════════════════════════════════════════════════════════════════
function LaborCostsPanel({ report, client, currentUser, lang = "es", toast }) {
  const [laborCosts, setLaborCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newConcept, setNewConcept] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editConcept, setEditConcept] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const L = (es, en) => lang === "en" ? en : es;

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    const data = await fetchLaborCosts(report.id);
    setLaborCosts(data);
    setLoading(false);
  }

  async function addCost() {
    if (!newConcept.trim() || !newAmount) return toast(L("Ingresa concepto y monto","Enter concept and amount"),"error");
    setSaving(true);
    const { error } = await addLaborCost({
      report_id: report.id,
      created_by: currentUser.id === SUPERUSER.id ? null : currentUser.id,
      concept: newConcept.trim(),
      amount: parseFloat(newAmount) || 0,
      notes: newNotes.trim(),
    });
    if (error) { toast(L("Error al agregar","Error adding"),"error"); setSaving(false); return; }
    setNewConcept(""); setNewAmount(""); setNewNotes("");
    await load();
    toast(L("Costo agregado","Cost added"),"success");
    setSaving(false);
  }

  async function saveEdit(id) {
    const err = await updateLaborCost(id, { concept: editConcept, amount: parseFloat(editAmount)||0 });
    if (err) return toast(L("Error al actualizar","Error updating"),"error");
    setEditingId(null);
    await load();
    toast(L("Costo actualizado","Cost updated"),"success");
  }

  async function removeCost(id) {
    const err = await deleteLaborCost(id);
    if (err) return toast(L("Error al eliminar","Error deleting"),"error");
    await load();
    toast(L("Costo eliminado","Cost deleted"),"success");
  }

  const total = laborCosts.reduce((s, c) => s + (c.amount || 0), 0);

  if (loading) return <div style={{display:"flex",justifyContent:"center",padding:40}}><Spinner/></div>;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
        <Btn variant="cyan" sm onClick={()=>exportPDFLabor(report,client,laborCosts,lang)}>📄 PDF {L("Mano de Obra","Labor")}</Btn>
      </div>
      {/* TOTAL */}
      <div style={{background:"#111827",border:"1px solid #f8717130",borderRadius:12,padding:"16px 20px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:.8,marginBottom:4}}>{L("TOTAL MANO DE OBRA","TOTAL LABOR COST")}</div>
          <div style={{color:"#f87171",fontWeight:800,fontSize:24}}>{fmtMXN(total)}</div>
        </div>
        <span style={{fontSize:36}}>👷</span>
      </div>

      {/* LIST */}
      {laborCosts.length === 0 ? (
        <div style={{textAlign:"center",padding:"30px 0",color:"#4b5563",fontSize:13,marginBottom:20}}>
          <div style={{fontSize:36,marginBottom:8}}>📋</div>
          {L("Sin costos registrados aún","No costs registered yet")}
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
          {laborCosts.map(c => (
            <div key={c.id} style={{background:"#111827",border:"1px solid #1f2937",borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
              {editingId === c.id ? (
                <>
                  <input value={editConcept} onChange={e=>setEditConcept(e.target.value)} style={{...S.input,flex:2}} />
                  <input type="number" value={editAmount} onChange={e=>setEditAmount(e.target.value)} style={{...S.input,width:110}} placeholder={L("Monto","Amount")} />
                  <Btn variant="s" sm onClick={()=>saveEdit(c.id)}>✓</Btn>
                  <Btn variant="g" sm onClick={()=>setEditingId(null)}>✕</Btn>
                </>
              ) : (
                <>
                  <div style={{flex:1}}>
                    <div style={{color:"#f9fafb",fontWeight:700,fontSize:14}}>{c.concept}</div>
                    {c.notes && <div style={{color:"#6b7280",fontSize:12,marginTop:2}}>{c.notes}</div>}
                    <div style={{color:"#4b5563",fontSize:11,marginTop:2}}>{fmtDate(c.created_at?.slice(0,10))}</div>
                  </div>
                  <div style={{color:"#f87171",fontWeight:800,fontSize:16,marginRight:8}}>{fmtMXN(c.amount)}</div>
                  <Btn variant="g" sm onClick={()=>{setEditingId(c.id);setEditConcept(c.concept);setEditAmount(c.amount);}}>✏️</Btn>
                  <Btn variant="d" sm onClick={()=>removeCost(c.id)}>🗑</Btn>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ADD FORM */}
      <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:12,padding:16}}>
        <label style={{...S.label,marginBottom:10}}>+ {L("NUEVO COSTO","NEW COST")}</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
          <input value={newConcept} onChange={e=>setNewConcept(e.target.value)} placeholder={L("Concepto (ej. Instalación eléctrica)","Concept (e.g. Electrical installation)")} style={{...S.input,flex:2,minWidth:160}} onKeyDown={e=>e.key==="Enter"&&addCost()} />
          <input type="number" value={newAmount} onChange={e=>setNewAmount(e.target.value)} placeholder={L("Monto","Amount")} style={{...S.input,width:110}} onKeyDown={e=>e.key==="Enter"&&addCost()} />
          <Btn variant="s" onClick={addCost} disabled={saving}>{saving?<Spinner/>:`+ ${L("Agregar","Add")}`}</Btn>
        </div>
        <input value={newNotes} onChange={e=>setNewNotes(e.target.value)} placeholder={L("Notas opcionales…","Optional notes…")} style={{...S.input,fontSize:12}} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PROJECT RESULT PANEL — Rentabilidad del proyecto
// ══════════════════════════════════════════════════════════════════════════════
function ProjectResultPanel({ report, client,currentUser, lang = "es", toast }) {
  const [laborCosts, setLaborCosts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const L = (es, en) => lang === "en" ? en : es;

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    const [lc, asgn] = await Promise.all([
      fetchLaborCosts(report.id),
      fetchAssignments(report.id),
    ]);
    setLaborCosts(lc);
    setAssignments(asgn);
    setLoading(false);
  }

  // ── CALCULATIONS ──────────────────────────────────────────────
  const b = report.budget || {};
  const ingreso        = b.total || 0;
  const ingresoReal    = (b.advance_paid ? (ingreso * (b.advance_pct||50) / 100) : 0) +
                         (b.final_paid   ? (ingreso * (100-(b.advance_pct||50)) / 100) : 0);
  const costoMateriales = assignments.reduce((s, a) => s + (a.total_cost || 0), 0);
  const costoManoObra   = laborCosts.reduce((s, c) => s + (c.amount || 0), 0);
  const costoTotal      = costoMateriales + costoManoObra;
  const utilidadBruta   = ingreso - costoTotal;
  const margen          = ingreso > 0 ? ((utilidadBruta / ingreso) * 100).toFixed(1) : 0;
  const utilidadReal    = ingresoReal - costoTotal;

  const isProfit = utilidadBruta >= 0;

  if (loading) return <div style={{display:"flex",justifyContent:"center",padding:40}}><Spinner/></div>;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
        <Btn variant="cyan" sm onClick={()=>exportPDFResults(report,client,assignments,laborCosts,lang)}>📄 PDF {L("Resultado","Results")}</Btn>
      </div>
      {/* ── SUMMARY CARDS ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
        {[
          { l: L("INGRESO PRESUPUESTADO","BUDGETED INCOME"),  v: fmtMXN(ingreso),        c: "#4ade80", ic: "💰" },
          { l: L("COSTO TOTAL","TOTAL COST"),                  v: fmtMXN(costoTotal),     c: "#f87171", ic: "📉" },
          { l: L("UTILIDAD BRUTA","GROSS PROFIT"),             v: fmtMXN(utilidadBruta),  c: isProfit?"#4ade80":"#f87171", ic: isProfit?"✅":"⚠️" },
        ].map(({ l, v, c, ic }) => (
          <div key={l} style={{ background: "#111827", border: `1px solid ${c}30`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:18 }}>{ic}</span>
              <span style={{ color:"#6b7280", fontSize:10, fontWeight:700, letterSpacing:.8 }}>{l}</span>
            </div>
            <div style={{ color: c, fontWeight:800, fontSize:20 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* ── MARGIN BAR ── */}
      <div style={{ background:"#111827", border:"1px solid #1f2937", borderRadius:12, padding:"16px 20px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ color:"#6b7280", fontSize:13 }}>{L("Margen de utilidad","Profit margin")}</span>
          <span style={{ color: isProfit?"#4ade80":"#f87171", fontWeight:800, fontSize:22 }}>{margen}%</span>
        </div>
        <div style={{ background:"#1f2937", borderRadius:99, height:8, overflow:"hidden" }}>
          <div style={{ width:`${Math.min(Math.abs(parseFloat(margen)),100)}%`, background: isProfit?"linear-gradient(90deg,#15803d,#4ade80)":"#dc2626", height:"100%", borderRadius:99, transition:"width .5s" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, fontSize:12, color:"#6b7280" }}>
          <span>{L("Cobrado hasta ahora","Collected so far")}: <span style={{ color:"#60a5fa", fontWeight:700 }}>{fmtMXN(ingresoReal)}</span></span>
          <span>{L("Utilidad sobre cobrado","Profit on collected")}: <span style={{ color: utilidadReal>=0?"#4ade80":"#f87171", fontWeight:700 }}>{fmtMXN(utilidadReal)}</span></span>
        </div>
      </div>

      {/* ── COST BREAKDOWN ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
        {/* Materials */}
        <div style={{ background:"#111827", border:"1px solid #1f2937", borderRadius:12, padding:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ color:"#f9fafb", fontWeight:700, fontSize:14 }}>📦 {L("Materiales","Materials")}</span>
            <span style={{ color:"#f87171", fontWeight:800 }}>{fmtMXN(costoMateriales)}</span>
          </div>
          {assignments.length === 0 ? (
            <p style={{ color:"#4b5563", fontSize:12, margin:0 }}>{L("Sin materiales asignados","No materials assigned")}</p>
          ) : (
            assignments.map(a => (
              <div key={a.id} style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#9ca3af", marginBottom:4, paddingBottom:4, borderBottom:"1px solid #1f293740" }}>
                <span>{a.materials?.name||"—"} × {a.quantity}</span>
                <span style={{ color:"#f9fafb" }}>{fmtMXN(a.total_cost)}</span>
              </div>
            ))
          )}
        </div>

        {/* Labor */}
        <div style={{ background:"#111827", border:"1px solid #1f2937", borderRadius:12, padding:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ color:"#f9fafb", fontWeight:700, fontSize:14 }}>👷 {L("Mano de obra","Labor")}</span>
            <span style={{ color:"#f87171", fontWeight:800 }}>{fmtMXN(costoManoObra)}</span>
          </div>
          {laborCosts.length === 0 ? (
            <p style={{ color:"#4b5563", fontSize:12, margin:0 }}>{L("Sin costos registrados","No costs registered")}</p>
          ) : (
            laborCosts.map(c => (
              <div key={c.id} style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#9ca3af", marginBottom:4, paddingBottom:4, borderBottom:"1px solid #1f293740" }}>
                <span>{c.concept}</span>
                <span style={{ color:"#f9fafb" }}>{fmtMXN(c.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>


    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORT DETAIL
// ══════════════════════════════════════════════════════════════════════════════
function ReportDetail({ report, clients, profiles, currentUser, lang = "es", onClose, onRefresh, addNotif, toast }) {
  const [tab, setTab] = useState("overview");
  const [showBudget, setShowBudget] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [noteVal, setNoteVal] = useState("");

  const client = clients.find(c => c.id===report.client_id) || report.client;
  const assigned = profiles.find(p => p.id===report.assigned_to) || (report.assigned_to===SUPERUSER.id?SUPERUSER:null);
  const b = report.budget || {};
  const advance = (b.total||0)*((b.advance_pct||50)/100);
  const overall = report.schedule?.length ? Math.round(report.schedule.reduce((s,a)=>s+(a.progress||0),0)/report.schedule.length) : 0;

  async function action(type) {
    const ACTIONS = {
      send:       ["enviado",    `Presupuesto enviado a ${client?.name}`,              {type:"info",   title:"Presupuesto enviado",       body:`${report.folio} enviado por ${fmtMXN(b.total)}`}],
      authorize:  ["autorizado", "Presupuesto autorizado por cliente",                  {type:"success",title:"¡Presupuesto autorizado!",    body:`${client?.name} autorizó ${report.folio}`}],
      reject:     ["rechazado",  "Presupuesto rechazado por cliente",                   {type:"error",  title:"Presupuesto rechazado",       body:`${client?.name} rechazó ${report.folio}`}],
      advance:    ["anticipo",   `Anticipo del ${b.advance_pct}% recibido (${fmtMXN(advance)})`, {type:"success",title:"Anticipo recibido",body:`${fmtMXN(advance)} registrado para ${report.folio}`}],
      start:      ["en_proceso", "Trabajos iniciados",                                  {type:"info",   title:"Trabajos iniciados",          body:`${report.folio} — Trabajos en curso`}],
      complete:   ["completado", "Trabajos concluidos, esperando visto bueno",          {type:"info",   title:"Trabajos concluidos",         body:`${report.folio} — Pendiente visto bueno`}],
      visto_bueno:["visto_bueno","Cliente dio visto bueno ✓ y pago final recibido",     {type:"success",title:"¡Visto bueno! ⭐",            body:`${report.folio} finalizado. Pago final registrado.`}],
    };
    const [status, event, notifData] = ACTIONS[type];

    // Update budget flags if needed
    if (type==="advance") await saveBudget(report.id,{...b,advance_paid:true},report.budgetItems||[]);
    if (type==="visto_bueno") await saveBudget(report.id,{...b,final_paid:true},report.budgetItems||[]);

    await updateReportStatus(report.id, status, event, currentUser.name);
    await addNotif({ user_id: currentUser.id===SUPERUSER.id?null:currentUser.id, ...notifData, report_id: report.id });
    toast(event,"success");
    onRefresh();
  }

  async function handleAddNote() {
    if (!noteVal.trim()) return;
    await addTimeline(report.id, noteVal.trim(), currentUser.name);
    setNoteVal("");
    onRefresh();
  }

  const TABS = [["overview",T("tabReport")],["presupuesto",T("tabBudget")],["cronograma",T("tabSchedule")],["materiales",lang==="en"?"📦 Materials":"📦 Materiales"],["manoobra",lang==="en"?"👷 Labor":"👷 Mano de obra"],["resultado",lang==="en"?"📊 Results":"📊 Resultado"],["timeline",T("tabTimeline")]];

  return (
    <Modal title={`${report.folio} · ${report.title}`} onClose={onClose} wide>
      {showBudget && <BudgetModal report={report} lang={lang} onClose={()=>setShowBudget(false)} onSave={()=>{setShowBudget(false);onRefresh();toast(t(lang,"budgetSaved"),"success");}} />}
      {showSchedule && <ScheduleModal report={report} lang={lang} onClose={()=>setShowSchedule(false)} onSave={()=>{setShowSchedule(false);onRefresh();toast(t(lang,"scheduleSaved"),"success");}} />}

      <div style={{display:"flex",borderBottom:"1px solid #1f2937",overflowX:"auto",flexShrink:0,padding:"0 4px"}}>
        {TABS.map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{background:"none",border:"none",color:tab===k?"#2563eb":"#6b7280",borderBottom:`2px solid ${tab===k?"#2563eb":"transparent"}`,padding:"11px 16px",cursor:"pointer",fontWeight:700,fontSize:13,whiteSpace:"nowrap",fontFamily:"DM Sans, sans-serif"}}>{l}</button>)}
      </div>

      <div style={{padding:20}}>
        {/* ACTIONS */}
        <div className="actions-bar" style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap",background:"#111827",borderRadius:10,padding:12,alignItems:"center"}}>
          <Badge status={report.status} />
          <div style={{flex:1}}/>
          {report.status==="borrador"&&(b.total||0)>0&&<Btn variant="p" sm onClick={()=>action("send")}>{T("sendToClient")}</Btn>}
          {report.status==="enviado"&&<><Btn variant="s" sm onClick={()=>action("authorize")}>{T("markAuthorized")}</Btn><Btn variant="d" sm onClick={()=>action("reject")}>{T("markRejected")}</Btn></>}
          {report.status==="autorizado"&&<Btn variant="purple" sm onClick={()=>action("advance")}>{T("registerAdvance")}</Btn>}
          {report.status==="anticipo"&&<Btn variant="w" sm onClick={()=>action("start")}>{T("startWork")}</Btn>}
          {report.status==="en_proceso"&&<Btn variant="p" sm onClick={()=>action("complete")}>{T("markComplete")}</Btn>}
          {report.status==="completado"&&<Btn variant="s" sm onClick={()=>action("visto_bueno")}>{T("clientApproval")}</Btn>}
        </div>

        {tab==="overview"&&(
          <div>
            <div className="grid-4col" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:16}}>
              {[
                [T("client"),    client?.name||"—",                client?.email||""],
                [T("createdBy"), report.created_by_name||"—",      T("authorReport")],
                [T("assignedTo"),report.assigned_to_name||assigned?.name||"—", T("techExecutor")],
                [T("inspection"),fmtDate(report.date),             `Folio: ${report.folio}`],
              ].map(([l,v,s])=>(
                <div key={l} style={{background:"#1f2937",borderRadius:10,padding:12}}>
                  <div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:.5,marginBottom:4}}>{l.toUpperCase()}</div>
                  <div style={{color:l==="Creado por"?"#60a5fa":"#f9fafb",fontWeight:700}}>{v}</div>
                  <div style={{color:"#6b7280",fontSize:12}}>{s}</div>
                </div>
              ))}
            </div>
            {report.description&&<div style={{background:"#1f2937",borderRadius:10,padding:14,marginBottom:14}}><label style={S.label}>Descripción</label><p style={{margin:0,color:"#9ca3af",fontSize:13,lineHeight:1.7}}>{report.description}</p></div>}
            {report.findings?.length>0&&(
              <div style={{marginBottom:14}}>
                <label style={S.label}>{T("findings")}</label>
                {report.findings.map(f=>{
                  const sc={alta:"#ef4444",media:"#f59e0b",baja:"#22c55e"}[f.severity];
                  return <div key={f.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#1f2937",borderRadius:8,marginBottom:6,borderLeft:`3px solid ${sc}`}}>
                    <span style={{fontSize:13,color:"#f9fafb",flex:1}}>{f.description}</span>
                    <span style={{fontSize:10,fontWeight:800,color:sc,background:`${sc}20`,padding:"2px 8px",borderRadius:99}}>{f.severity.toUpperCase()}</span>
                  </div>;
                })}
              </div>
            )}
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
              <Btn variant="cyan" sm onClick={()=>exportPDFInspection(report,client,assigned,lang)}>📄 PDF {lang==="en"?"WorkOrder":"Orden de Trabajo"}</Btn>
            </div>
            {report.photos?.length>0&&(
              <div><label style={S.label}>Evidencia Fotográfica ({report.photos.length})</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {report.photos.map(p=><img key={p.id} src={p.url} alt="" style={{width:88,height:88,objectFit:"cover",borderRadius:8,border:"1px solid #374151"}} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {tab==="presupuesto"&&(
          <div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:14}}>
              <Btn variant="g" sm onClick={()=>setShowBudget(true)}>{T("edit")}</Btn>
              <Btn variant="cyan" sm onClick={()=>exportPDF(report,client,b.lang)}>{T("exportPDF")}</Btn>
            </div>
            {!report.budgetItems?.length?(
              <div style={{textAlign:"center",padding:40,color:"#4b5563"}}><div style={{fontSize:48,marginBottom:12}}>💰</div><div style={{marginBottom:14}}>{T("emptyBudget")}</div><Btn variant="p" onClick={()=>setShowBudget(true)}>{T("createBudget")}</Btn></div>
            ):(
              <>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,marginBottom:14}}>
                  <thead><tr style={{background:"#1f2937"}}>{[T("concept"),T("unit"),T("quantity"),T("unitPrice"),T("total")].map(h=><th key={h} style={{padding:"8px 12px",color:"#6b7280",textAlign:"left"}}>{h}</th>)}</tr></thead>
                  <tbody>{report.budgetItems.map(item=>(
                    <tr key={item.id} style={{borderBottom:"1px solid #1f2937"}}>
                      <td style={{padding:"8px 12px",color:"#f9fafb"}}>{item.concept}</td>
                      <td style={{padding:"8px 12px",color:"#9ca3af"}}>{item.unit}</td>
                      <td style={{padding:"8px 12px",color:"#9ca3af"}}>{item.qty}</td>
                      <td style={{padding:"8px 12px",color:"#9ca3af"}}>{fmtMXN(item.price)}</td>
                      <td style={{padding:"8px 12px",color:"#4ade80",fontWeight:700}}>{fmtMXN(item.total)}</td>
                    </tr>
                  ))}</tbody>
                </table>
                <div style={{display:"flex",gap:12,justifyContent:"flex-end",flexWrap:"wrap"}}>
                  <div style={{background:"#1f2937",borderRadius:10,padding:14,minWidth:230}}>
                    {[[T("subtotal"),b.subtotal,"#9ca3af"],[`${getTax(lang).name} ${b.tax_rate??16}%`,b.iva,"#9ca3af"],[T("total"),b.total,"#4ade80"]].map(([l,v,c])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:6,borderTop:l==="TOTAL"?"1px solid #374151":"none",paddingTop:l==="TOTAL"?8:0,fontWeight:l==="TOTAL"?800:400,fontSize:l==="TOTAL"?16:13}}>
                        <span style={{color:c}}>{l}</span><span style={{color:c}}>{fmtMXN(v)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{background:"#1f2937",borderRadius:10,padding:14,minWidth:230}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}>
                      <span style={{color:"#9ca3af"}}>{T("advanceRequired")} ({b.advance_pct}%)</span>
                      <span style={{color:b.advance_paid?"#4ade80":"#a78bfa",fontWeight:700}}>{fmtMXN(advance)} {b.advance_paid?"✓":""}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                      <span style={{color:"#9ca3af"}}>{T("finalPayment")}</span>
                      <span style={{color:b.final_paid?"#4ade80":"#9ca3af",fontWeight:700}}>{fmtMXN((b.total||0)-advance)} {b.final_paid?"✓":""}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab==="cronograma"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{color:"#6b7280",fontSize:13}}>{T("overallProgress")}:</span>
                <span style={{color:"#2563eb",fontWeight:800,fontSize:20}}>{overall}%</span>
              </div>
              <Btn variant="cyan" sm onClick={()=>exportPDFSchedule(report,client,lang)}>📄 PDF {lang==="en"?"Schedule":"Cronograma"}</Btn>
              <Btn variant="g" sm onClick={()=>setShowSchedule(true)}>{T("edit")}</Btn>
            </div>
            <ProgressBar value={overall} />
            <div style={{marginTop:14}}>
              {!report.schedule?.length?(
                <div style={{textAlign:"center",padding:40,color:"#4b5563"}}><div style={{fontSize:48,marginBottom:12}}>📅</div><Btn variant="p" onClick={()=>setShowSchedule(true)}>{T("createSchedule")}</Btn></div>
              ):report.schedule.map((a,i)=>(
                <div key={a.id||i} style={{display:"flex",gap:10,marginBottom:10}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                    <div style={{width:30,height:30,borderRadius:99,background:a.status==="completada"?"#15803d":a.status==="en_curso"?"#b45309":"#1f2937",border:`2px solid ${ACT_CFG[a.status]?.color||"#374151"}`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700}}>{i+1}</div>
                    {i<report.schedule.length-1&&<div style={{width:2,flex:1,background:"#1f2937",minHeight:16}}/>}
                  </div>
                  <div style={{flex:1,background:"#1f2937",borderRadius:10,padding:12,marginBottom:4}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{color:"#f9fafb",fontWeight:700}}>{a.activity}</span>
                      <Badge status={a.status} type="a" />
                    </div>
                    <div style={{display:"flex",gap:14,fontSize:12,color:"#6b7280",marginBottom:8}}>
                      <span>📅 {fmtDate(a.start_date)} → {fmtDate(a.end_date)}</span>
                      <span>👤 {a.responsible}</span>
                    </div>
                    <ProgressBar value={a.progress||0} color={a.status==="completada"?"#4ade80":a.status==="en_curso"?"#fb923c":"#374151"} />
                    <div style={{textAlign:"right",fontSize:11,color:"#6b7280",marginTop:3}}>{a.progress||0}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="materiales"&&(
          <ReportMaterialsPanel report={report} currentUser={currentUser} lang={lang} toast={toast} />
        )}

        {tab==="manoobra"&&(
          <LaborCostsPanel report={report} currentUser={currentUser} lang={lang} toast={toast} />
        )}

        {tab==="resultado"&&(
          <ProjectResultPanel report={report} currentUser={currentUser} lang={lang} toast={toast} />
        )}

        {tab==="timeline"&&(
          <div>
            <div style={{paddingLeft:24,position:"relative"}}>
              {report.timeline?.map((t,i)=>(
                <div key={t.id||i} style={{position:"relative",marginBottom:18}}>
                  <div style={{position:"absolute",left:-24,top:5,width:10,height:10,borderRadius:99,background:"#2563eb",border:"2px solid #1d4ed8"}}/>
                  {i<(report.timeline.length-1)&&<div style={{position:"absolute",left:-20,top:16,width:2,height:"calc(100% + 10px)",background:"#1f2937"}}/>}
                  <div style={{fontSize:11,color:"#4b5563",marginBottom:2}}>{fmtDate(t.created_at?.slice(0,10))} · <span style={{color:"#6b7280"}}>{t.user_name}</span></div>
                  <div style={{color:"#f9fafb",fontSize:13}}>{t.event}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
              <Btn variant="cyan" sm onClick={()=>exportPDFTimeline(report,client,lang)}>📄 PDF {lang==="en"?"Log":"Bitácora"}</Btn>
            </div>
            <div style={{borderTop:"1px solid #1f2937",paddingTop:14,marginTop:8}}>
              <label style={S.label}>{T("addNote")}</label>
              <div style={{display:"flex",gap:8}}>
                <input value={noteVal} onChange={e=>setNoteVal(e.target.value)} placeholder={T("notePlaceholder")} style={{...S.input,flex:1}} onKeyDown={e=>e.key==="Enter"&&handleAddNote()} />
                <Btn variant="p" onClick={handleAddNote}>{T("addBtn")}</Btn>
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
// ══════════════════════════════════════════════════════════════════════════════
// HELP MODAL — Manual de usuario
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// BLOCKED SCREEN — pantalla de membresía expirada
// ══════════════════════════════════════════════════════════════════════════════
function BlockedScreen({ currentUser, onLogout, lang }) {
  if (!lang) lang = currentUser.lang || 'es';
  const [loading, setLoading] = useState(false);
  const [extraTecnicos, setExtraTecnicos] = useState(0);
  const role = currentUser.role;
  const isEmpresarial = role === "empresarial";
  const basePrice = isEmpresarial ? 39.99 : 19.99;
  const extraPrice = extraTecnicos * 15.99;
  const totalPrice = (basePrice + extraPrice).toFixed(2);

  async function handleCheckout(plan) {
    setLoading(true);
    await createCheckoutSession(currentUser.id, plan, isEmpresarial ? extraTecnicos : 0);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Sans, sans-serif", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, #dc262620 0%, transparent 60%)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 520, textAlign: "center" }}>
        <div style={{ fontSize: 72, marginBottom: 8 }}>🔒</div>
        <h1 style={{ color: "#f9fafb", fontSize: 26, fontWeight: 800, margin: "0 0 10px" }}>{t(lang,"blockedTitle")}</h1>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
{t(lang,"blockedDesc")}
        </p>

        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 18, padding: 28, marginBottom: 20 }}>
          <div style={{ display: "inline-block", background: isEmpresarial ? "#2e1065" : "#1e3a5f", border: `1px solid ${isEmpresarial ? "#a78bfa" : "#60a5fa"}50`, borderRadius: 8, padding: "4px 14px", fontSize: 12, fontWeight: 700, color: isEmpresarial ? "#a78bfa" : "#60a5fa", marginBottom: 16 }}>
            {isEmpresarial ? `🏢 ${t(lang,'roleEmpresarial')}` : `🔧 ${t(lang,'roleTecnico')}`}
          </div>

          <div style={{ fontSize: 48, fontWeight: 800, color: "#f9fafb", marginBottom: 4 }}>
            ${totalPrice} <span style={{ fontSize: 18, color: "#6b7280", fontWeight: 400 }}>USD/mes</span>
          </div>

          <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 20, lineHeight: 1.8 }}>
            {isEmpresarial ? (
              <>Plan base $39.99 USD · incluye 2 técnicos gratis</>
            ) : (
              <>Acceso individual completo a todos los módulos</>
            )}
          </div>

          {isEmpresarial && (
            <div style={{ background: "#1f2937", borderRadius: 10, padding: 14, marginBottom: 20, textAlign: "left" }}>
              <label style={{ color: "#6b7280", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, display: "block", marginBottom: 8 }}>TÉCNICOS ADICIONALES (opcional)</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setExtraTecnicos(Math.max(0, extraTecnicos - 1))} style={{ width: 32, height: 32, borderRadius: 8, background: "#374151", border: "none", color: "#f9fafb", fontSize: 18, cursor: "pointer" }}>−</button>
                <span style={{ color: "#f9fafb", fontWeight: 800, fontSize: 18, minWidth: 24, textAlign: "center" }}>{extraTecnicos}</span>
                <button onClick={() => setExtraTecnicos(extraTecnicos + 1)} style={{ width: 32, height: 32, borderRadius: 8, background: "#374151", border: "none", color: "#f9fafb", fontSize: 18, cursor: "pointer" }}>+</button>
                <span style={{ color: "#6b7280", fontSize: 13 }}>× $15.99 USD = <strong style={{ color: "#a78bfa" }}>${extraPrice} USD</strong></span>
              </div>
              <p style={{ color: "#4b5563", fontSize: 11, marginTop: 8, marginBottom: 0 }}>Los primeros 2 técnicos ya están incluidos en el plan base.</p>
            </div>
          )}

          <button onClick={() => handleCheckout(role)} disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", border: "none", borderRadius: 12, padding: "15px", color: "#fff", fontWeight: 800, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 4px 24px #2563eb40" }}>
            {loading ? <><Spinner /> Redirigiendo a Stripe…</> : `💳 Activar membresía — $${totalPrice} USD/mes`}
          </button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, color: "#4b5563", fontSize: 12 }}>
            <span>🔒</span> {t(lang,"securePayment")}
          </div>
        </div>

        <button onClick={onLogout} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", fontSize: 13, fontFamily: "DM Sans, sans-serif" }}>
          {t(lang,"logout")}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DEMO BANNER — banner de días restantes
// ══════════════════════════════════════════════════════════════════════════════
function DemoBanner({ currentUser, lang = "es" }) {
  const days = daysLeft(currentUser.demo_expires_at);
  if (currentUser.status !== "demo") return null;

  const color = days <= 5 ? "#f87171" : days <= 10 ? "#fbbf24" : "#60a5fa";
  const bg    = days <= 5 ? "#450a0a" : days <= 10 ? "#451a03" : "#1e3a5f";

  return (
    <div style={{ background: bg, borderBottom: `1px solid ${color}30`, padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 13 }}>
      <span style={{ fontSize: 16 }}>{days <= 5 ? "⚠️" : "🎉"}</span>
      <span style={{ color: "#f9fafb" }}>
        {days === 0 ? t(lang,"demoExpirestoday") : `${t(lang,"demoExpires")} ${days} ${days !== 1 ? t(lang,"daysLeftPlural") : t(lang,"daysLeft")} ${days !== 1 ? t(lang,"demoRemainingPlural") : t(lang,"demoRemaining")}.`}
      </span>
      <span
        onClick={() => createCheckoutSession(currentUser.id, currentUser.role === "empresarial" ? "empresarial" : "tecnico")}
        style={{ color, fontWeight: 700, cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}
      >
        {t(lang,"activateMembership")}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN USERS MODULE — panel de gestión para Super Admin
// ══════════════════════════════════════════════════════════════════════════════
function AdminUsersModule({ profiles, setProfiles, toast }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const STATUS_CFG_M = {
    demo:      { label: "Demo",      color: "#60a5fa", bg: "#1e3a5f" },
    activo:    { label: "Activo",    color: "#4ade80", bg: "#14532d" },
    bloqueado: { label: "Bloqueado", color: "#f87171", bg: "#450a0a" },
  };

  async function updateUserStatus(profileId, status) {
    setSaving(true);
    // Use service role via edge function to bypass RLS for superadmin
    const { error } = await supabase.rpc("admin_update_profile_status", {
      p_profile_id: profileId,
      p_status: status,
    });
    if (error) { toast("Error: " + error.message, "error"); setSaving(false); return; }
    setProfiles(profiles.map(p => p.id === profileId ? { ...p, status } : p));
    if (selected?.id === profileId) setSelected(s => ({ ...s, status }));
    toast(`Usuario ${status === "activo" ? "activado" : status === "bloqueado" ? "bloqueado" : "en demo"}`, "success");
    setSaving(false);
  }

  async function extendDemo(profileId, days) {
    setSaving(true);
    const newExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.rpc("admin_extend_demo", {
      p_profile_id: profileId,
      p_expires_at: newExpiry,
    });
    if (error) { toast("Error: " + error.message, "error"); setSaving(false); return; }
    setProfiles(profiles.map(p => p.id === profileId ? { ...p, status: "demo", demo_expires_at: newExpiry } : p));
    if (selected?.id === profileId) setSelected(s => ({ ...s, status: "demo", demo_expires_at: newExpiry }));
    toast(`Demo extendido ${days} días`, "success");
    setSaving(false);
  }

  const all = [SUPERUSER, ...profiles];
  const filtered = all.filter(p => {
    const ok1 = filterStatus === "todos" || p.status === filterStatus || (filterStatus === "todos");
    const ok2 = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase());
    return ok1 && ok2;
  }).filter(p => filterStatus === "todos" || p.status === filterStatus);

  const stats = {
    total: profiles.length,
    demo: profiles.filter(p => p.status === "demo").length,
    activos: profiles.filter(p => p.status === "activo").length,
    bloqueados: profiles.filter(p => p.status === "bloqueado").length,
  };

  return (
    <div>
      {/* STATS */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { l: "TOTAL USUARIOS", v: stats.total,     c: "#2563eb", ic: "👤" },
          { l: "EN DEMO",        v: stats.demo,       c: "#60a5fa", ic: "🎉" },
          { l: "ACTIVOS",        v: stats.activos,    c: "#4ade80", ic: "✅" },
          { l: "BLOQUEADOS",     v: stats.bloqueados, c: "#f87171", ic: "🔒" },
        ].map(({ l, v, c, ic }) => (
          <div key={l} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{ic}</div>
            <div><div style={{ color: "#6b7280", fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>{l}</div><div style={{ color: "#f9fafb", fontSize: 20, fontWeight: 800 }}>{v}</div></div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f9fafb" }}>Gestión de Usuarios</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar…" style={{ ...S.input, width: 200 }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...S.input, width: "auto" }}>
            <option value="todos">Todos</option>
            <option value="demo">Demo</option>
            <option value="activo">Activos</option>
            <option value="bloqueado">Bloqueados</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(u => {
          const days = daysLeft(u.demo_expires_at);
          const sc = STATUS_CFG_M[u.status] || STATUS_CFG_M.demo;
          return (
            <div key={u.id} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#374151"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#1f2937"}>
              <Avatar initials={u.avatar || mkAvatar(u.name || "?")} size={42} color={u.protected ? "#f59e0b" : "#2563eb"} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, color: "#f9fafb", fontSize: 14 }}>{u.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: sc.color, background: sc.bg, padding: "2px 8px", borderRadius: 99 }}>{sc.label}</span>
                  <span style={{ fontSize: 10, color: "#6b7280" }}>{u.role === "superadmin" ? "⭐ Super Admin" : u.role === "empresarial" ? "🏢 Empresarial" : "🔧 Técnico"}</span>
                  {u.protected && <span style={{ fontSize: 10, color: "#f59e0b" }}>🔒 Protegido</span>}
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#6b7280", flexWrap: "wrap" }}>
                  <span>✉ {u.email}</span>
                  {u.status === "demo" && <span style={{ color: days <= 5 ? "#f87171" : "#fbbf24" }}>⏳ {days} días restantes</span>}
                  {u.plan && <span style={{ color: "#4ade80" }}>💳 {PLANS[u.plan]?.label}</span>}
                  {u.status === "activo" && u.stripe_subscription_id && <span style={{ color: "#4ade80" }}>✓ Suscripción activa</span>}
                </div>
              </div>

              {!u.protected && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {u.status !== "activo" && (
                    <Btn variant="s" sm onClick={() => updateUserStatus(u.id, "activo")} disabled={saving}>✓ Activar</Btn>
                  )}
                  {u.status !== "bloqueado" && (
                    <Btn variant="d" sm onClick={() => updateUserStatus(u.id, "bloqueado")} disabled={saving}>🔒 Bloquear</Btn>
                  )}
                  {u.status !== "demo" && (
                    <Btn variant="g" sm onClick={() => extendDemo(u.id, 30)} disabled={saving}>🎉 Demo 30d</Btn>
                  )}
                  {u.status === "demo" && (
                    <Btn variant="g" sm onClick={() => extendDemo(u.id, 30)} disabled={saving}>+30 días</Btn>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HelpModal({ currentUser, lang = "es", onClose }) {
  const [tab, setTab] = useState("inicio");
  const role = currentUser.role;
  const isEN = lang === "en";

  const TABS = [
    { id: "inicio",       icon: "🏠", label: isEN ? "Home"      : "Inicio" },
    { id: "reportes",     icon: "📋", label: isEN ? "Reports"   : "Reportes" },
    { id: "presupuestos", icon: "💰", label: isEN ? "Budgets"   : "Presupuestos" },
    { id: "cronograma",   icon: "📅", label: isEN ? "Schedule"  : "Cronograma" },
    { id: "almacen",      icon: "📦", label: isEN ? "Warehouse" : "Almacén" },
    { id: "resultado",    icon: "📊", label: isEN ? "Results"   : "Resultado" },
    { id: "clientes",     icon: "🏢", label: isEN ? "Clients"   : "Clientes" },
    ...(role === "empresarial" ? [{ id: "equipo", icon: "👥", label: isEN ? "My Team" : "Mi Equipo" }] : []),
    { id: "flujo",        icon: "🔄", label: isEN ? "Workflow"  : "Flujo de trabajo" },
  ];

  const H2 = ({ children }) => <h2 style={{ color: "#f9fafb", fontSize: 17, fontWeight: 800, margin: "0 0 14px", borderBottom: "1px solid #1f2937", paddingBottom: 10 }}>{children}</h2>;
  const H3 = ({ children }) => <h3 style={{ color: "#60a5fa", fontSize: 13, fontWeight: 700, margin: "18px 0 8px", textTransform: "uppercase", letterSpacing: 0.8 }}>{children}</h3>;
  const P  = ({ children }) => <p style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.8, margin: "0 0 10px" }}>{children}</p>;
  const Li = ({ icon, children }) => (
    <div style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.7 }}>{children}</span>
    </div>
  );
  const Tip = ({ children }) => (
    <div style={{ background: "#1e3a5f", border: "1px solid #2563eb30", borderRadius: 8, padding: "10px 14px", marginTop: 12, display: "flex", gap: 10 }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
      <span style={{ color: "#93c5fd", fontSize: 12, lineHeight: 1.7 }}>{children}</span>
    </div>
  );
  const Badge = ({ color, bg, children }) => (
    <span style={{ background: bg, color, border: `1px solid ${color}50`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 6 }}>{children}</span>
  );
  const Step = ({ n, title, children }) => (
    <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
      <div style={{ width: 28, height: 28, borderRadius: 99, background: "#2563eb", color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</div>
      <div><div style={{ color: "#f9fafb", fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{title}</div><div style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.7 }}>{children}</div></div>
    </div>
  );

  const T2 = (es, en) => isEN ? en : es;

  const flowSteps = isEN ? [
    ["📋","Draft",      "#94a3b8","Create the report with findings and photos. Add budget items."],
    ["📤","Sent",       "#60a5fa","Press 'Send to Client'. The report awaits a response."],
    ["✅","Authorized", "#34d399","The client approves the budget. You can register the advance."],
    ["💳","Advance OK", "#a78bfa","The agreed advance is recorded. Work is ready to start."],
    ["🔧","In Process", "#fb923c","Work begins. Update the schedule with actual progress."],
    ["🏁","Completed",  "#22d3ee","All work is done. The client must review and give approval."],
    ["⭐","Approved",   "#4ade80","Client approves. Final payment recorded. Project closed!"],
  ] : [
    ["📋","Borrador",    "#94a3b8","Creas el reporte con hallazgos y fotos. Agregas las partidas del presupuesto."],
    ["📤","Enviado",     "#60a5fa","Presionas 'Enviar al Cliente'. El reporte queda en espera de respuesta."],
    ["✅","Autorizado",  "#34d399","El cliente aprueba el presupuesto. Puedes registrar el anticipo."],
    ["💳","Anticipo OK", "#a78bfa","Se registra el pago del anticipo. Los trabajos están listos para iniciar."],
    ["🔧","En Proceso",  "#fb923c","Los trabajos inician. Actualiza el cronograma con el avance real."],
    ["🏁","Completado",  "#22d3ee","Todos los trabajos concluyen. El cliente debe dar su visto bueno."],
    ["⭐","Visto Bueno", "#4ade80","El cliente aprueba. Se registra el pago final. ¡Proyecto cerrado!"],
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000b0", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 18, width: "100%", maxWidth: 820, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px #000c" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #1f2937", flexShrink: 0, background: "linear-gradient(135deg, #0d1117, #111827)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>❓</div>
            <div>
              <h3 style={{ margin: 0, color: "#f9fafb", fontSize: 16, fontWeight: 800 }}>{T2("Manual de Usuario","User Manual")}</h3>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 12 }}>{T2("MantPro — Guía completa","MantPro — Complete guide")}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "#1f2937", border: "none", color: "#9ca3af", cursor: "pointer", width: 30, height: 30, borderRadius: 8, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div style={{ width: 180, borderRight: "1px solid #1f2937", padding: "16px 10px", flexShrink: 0, overflowY: "auto", background: "#070d1b" }}>
            {TABS.map(tb => (
              <button key={tb.id} onClick={() => setTab(tb.id)} style={{ width: "100%", background: tab === tb.id ? "#1f2937" : "none", border: "none", color: tab === tb.id ? "#2563eb" : "#6b7280", borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontWeight: tab === tb.id ? 700 : 500, fontSize: 13, fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", gap: 8, marginBottom: 2, textAlign: "left" }}>
                <span>{tb.icon}</span>{tb.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

            {tab === "inicio" && (
              <div>
                <H2>{T2("Bienvenido a MantenimientoApp 🔧","Welcome to MaintenanceApp 🔧")}</H2>
                <P>{T2("MantenimientoApp es un sistema profesional para gestionar reportes de mantenimiento, presupuestos, cronogramas y seguimiento completo hasta el visto bueno del cliente.","MantPro is a professional system to manage maintenance reports, budgets, work schedules and full follow-up until client approval.")}</P>
                <H3>{T2("Tu perfil actual","Your current profile")}</H3>
                <div style={{ background: "#1f2937", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  {role === "superadmin" && <><div style={{ color: "#f59e0b", fontWeight: 800, fontSize: 15, marginBottom: 6 }}>⭐ Super Admin</div><P>{T2("Tienes acceso total al sistema. Puedes ver y gestionar todos los reportes, clientes y usuarios sin restricciones.","You have full access to the system. You can view and manage all reports, clients and users without restrictions.")}</P></>}
                  {role === "empresarial" && <><div style={{ color: "#a78bfa", fontWeight: 800, fontSize: 15, marginBottom: 6 }}>🏢 {T2("Empresarial","Business")}</div><P>{T2("Puedes gestionar tu equipo de técnicos y ver todos sus reportes y clientes. Asigna técnicos desde el módulo Mi Equipo.","You can manage your team of technicians and view all their reports and clients. Assign technicians from the My Team module.")}</P></>}
                  {role === "tecnico" && <><div style={{ color: "#60a5fa", fontWeight: 800, fontSize: 15, marginBottom: 6 }}>🔧 {T2("Técnico","Technician")}</div><P>{T2("Puedes crear y gestionar tus propios reportes, clientes y presupuestos. Solo verás la información que creaste o que te asignaron.","You can create and manage your own reports, clients and budgets. You will only see information you created or that was assigned to you.")}</P></>}
                </div>
                <H3>{T2("Módulos disponibles","Available modules")}</H3>
                <Li icon="📋">{T2("Reportes — Crea y gestiona reportes de mantenimiento con fotos y hallazgos","Reports — Create and manage maintenance reports with photos and findings")}</Li>
                <Li icon="🏢">{T2("Clientes — Registra y administra la información de tus clientes","Clients — Register and manage your clients contact information")}</Li>
                <Li icon="🔔">{T2("Alertas — Notificaciones automáticas de cada evento importante","Alerts — Automatic notifications for every important event")}</Li>
                {role === "empresarial" && <Li icon="👥">{T2("Mi Equipo — Vincula técnicos a tu cuenta para ver sus reportes","My Team — Link technicians to your account to view their reports")}</Li>}
                {role === "superadmin" && <Li icon="👤">{T2("Usuarios — Gestión global de todos los usuarios del sistema","Users — Global management of all system users")}</Li>}
                <Tip>{T2("Usa el botón ❓ en la barra superior para abrir este manual en cualquier momento.","Use the ❓ button in the top bar to open this manual at any time.")}</Tip>
              </div>
            )}

            {tab === "reportes" && (
              <div>
                <H2>{T2("📋 Reportes de Mantenimiento","📋 Maintenance Reports")}</H2>
                <P>{T2("Los reportes son el corazón del sistema. Cada reporte documenta una inspección, sus hallazgos y el trabajo a realizar.","Reports are the heart of the system. Each report documents an inspection, its findings and the work to be done.")}</P>
                <H3>{T2("Crear un reporte","Create a report")}</H3>
                <Step n="1" title={T2("Clic en '+ Nuevo Reporte'","Click '+ New Report'")}>{T2("En la pantalla principal, presiona el botón azul en la esquina superior derecha.","On the main screen, press the blue button in the top right corner.")}</Step>
                <Step n="2" title={T2("Selecciona el cliente","Select the client")}>{T2("Elige el cliente de la lista. Si no existe, créalo primero en el módulo Clientes.","Choose the client from the list. If it does not exist, create it first in the Clients module.")}</Step>
                <Step n="3" title={T2("Completa la información","Fill in the information")}>{T2("Título, fecha de inspección, descripción" + (role !== "tecnico" ? " y técnico asignado." : "."), "Title, inspection date, description" + (role !== "tecnico" ? " and assigned technician." : "."))}</Step>
                <Step n="4" title={T2("Agrega hallazgos","Add findings")}>{T2("Describe cada problema y asígnale severidad: 🔴 Alta, 🟡 Media, 🟢 Baja.","Describe each problem and assign severity: 🔴 High, 🟡 Medium, 🟢 Low.")}</Step>
                <Step n="5" title={T2("Sube fotos de evidencia","Upload evidence photos")}>{T2("Toca el botón + para agregar fotos desde tu dispositivo.","Tap the + button to add photos from your device.")}</Step>
                <Step n="6" title={T2("Guarda el reporte","Save the report")}>{T2("El reporte se crea en estado Borrador listo para agregar el presupuesto.","The report is created in Draft status, ready to add the budget.")}</Step>
                <H3>{T2("Estados del reporte","Report statuses")}</H3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {[["#94a3b8","#1e293b",T2("Borrador","Draft")],["#60a5fa","#1e3a5f",T2("Enviado","Sent")],["#34d399","#064e3b",T2("Autorizado","Authorized")],["#a78bfa","#3b0764",T2("Anticipo OK","Advance OK")],["#fb923c","#431407",T2("En Proceso","In Process")],["#22d3ee","#083344",T2("Completado","Completed")],["#4ade80","#14532d",T2("Visto Bueno ✓","Approved ✓")],["#f87171","#450a0a",T2("Rechazado","Rejected")]].map(([c,b,l])=><Badge key={l} color={c} bg={b}>{l}</Badge>)}
                </div>
                <H3>{T2("Buscar y filtrar","Search and filter")}</H3>
                <Li icon="🔍">{T2("Usa la barra de búsqueda para encontrar por folio, título o cliente.","Use the search bar to find by folio, title or client name.")}</Li>
                <Li icon="🔽">{T2("Filtra por estado usando el selector desplegable.","Filter by status using the dropdown selector.")}</Li>
                <Tip>{T2("El folio se genera automáticamente (MNT-XXXX). Cada reporte registra quién lo creó y a quién se asignó.","The folio is generated automatically (MNT-XXXX). Each report records who created it and who it was assigned to.")}</Tip>
              </div>
            )}

            {tab === "presupuestos" && (
              <div>
                <H2>{T2("💰 Presupuestos","💰 Budgets")}</H2>
                <P>{T2("Una vez creado el reporte, el siguiente paso es generar el presupuesto con las partidas de trabajo.","Once the report is created, the next step is to generate the budget with the work items.")}</P>
                <H3>{T2("Crear o editar el presupuesto","Create or edit the budget")}</H3>
                <Step n="1" title={T2("Abre el reporte","Open the report")}>{T2("Haz clic en el reporte en la lista principal.","Click the report in the main list.")}</Step>
                <Step n="2" title={T2("Ve a la pestaña Presupuesto","Go to the Budget tab")}>{T2("Selecciona la pestaña 💰 Presupuesto dentro del reporte.","Select the 💰 Budget tab inside the report.")}</Step>
                <Step n="3" title={T2("Clic en 'Crear' o 'Editar'","Click 'Create' or 'Edit'")}>{T2("Se abrirá el editor de partidas.","The item editor will open.")}</Step>
                <Step n="4" title={T2("Agrega las partidas","Add items")}>{T2("Para cada concepto ingresa: descripción, unidad, cantidad y precio unitario.","For each concept enter: description, unit, quantity and unit price.")}</Step>
                <Step n="5" title={T2("Define el % de anticipo","Set the advance %")}>{T2("Mueve el control deslizante para establecer el porcentaje que se cobra por adelantado (10%–80%).","Move the slider to set the percentage charged upfront (10%–80%).")}</Step>
                <Step n="6" title={T2("Guarda","Save")}>{T2("El sistema calcula subtotal, IVA 16% y total automáticamente.","The system calculates subtotal, 16% tax and total automatically.")}</Step>
                <H3>{T2("Exportar a PDF","Export to PDF")}</H3>
                <Li icon="📄">{T2("Presiona el botón PDF en la barra de acciones del reporte.","Press the PDF button in the report actions bar.")}</Li>
                <Li icon="🖨">{T2("Se abrirá el documento en nueva pestaña listo para imprimir o guardar.","The document opens in a new tab ready to print or save.")}</Li>
                <Li icon="✍️">{T2("El PDF incluye espacio para firma de autorización del cliente.","The PDF includes a space for the client authorization signature.")}</Li>
                <H3>{T2("Pagos","Payments")}</H3>
                <Li icon="💳">{T2("Una vez autorizado, registra el anticipo con el botón 'Registrar Anticipo'.","Once authorized, register the advance with the 'Register Advance' button.")}</Li>
                <Li icon="✅">{T2("Al dar visto bueno, se registra el pago final automáticamente.","When the client gives approval, the final payment is recorded automatically.")}</Li>
                <Tip>{T2("El presupuesto solo se puede enviar cuando tiene al menos una partida guardada.","The budget can only be sent when it has at least one saved item.")}</Tip>
              </div>
            )}

            {tab === "cronograma" && (
              <div>
                <H2>{T2("📅 Cronograma de Actividades","📅 Activity Schedule")}</H2>
                <P>{T2("El cronograma permite planificar y dar seguimiento a cada tarea del trabajo de mantenimiento.","The schedule allows you to plan and track each task of the maintenance work.")}</P>
                <H3>{T2("Crear el cronograma","Create the schedule")}</H3>
                <Step n="1" title={T2("Abre el reporte y ve a Cronograma","Open the report and go to Schedule")}>{T2("Solo disponible después de que el presupuesto fue autorizado.","Only available after the budget has been authorized.")}</Step>
                <Step n="2" title={T2("Clic en 'Crear Cronograma'","Click 'Create Schedule'")}>{T2("Se abrirá el editor de actividades.","The activity editor will open.")}</Step>
                <Step n="3" title={T2("Agrega las actividades","Add activities")}>{T2("Para cada tarea define: nombre, fecha de inicio, fin y responsable.","For each task define: name, start date, end date and responsible person.")}</Step>
                <Step n="4" title={T2("Guarda el cronograma","Save the schedule")}>{T2("Las actividades quedan ordenadas y listas para seguimiento.","Activities are sorted and ready for tracking.")}</Step>
                <H3>{T2("Actualizar el avance","Update progress")}</H3>
                <Li icon="📊">{T2("Edita cada actividad para actualizar su porcentaje de avance.","Edit each activity to update its progress percentage.")}</Li>
                <Li icon="🔄">{T2("Cambia el estado: Pendiente → En Curso → Completada.","Change the status: Pending → In Progress → Done.")}</Li>
                <Li icon="📈">{T2("El avance general se calcula como promedio de todas las actividades.","Overall progress is calculated as the average of all activities.")}</Li>
                <Tip>{T2("Mantén el cronograma actualizado para que todos puedan ver el progreso en tiempo real.","Keep the schedule updated so everyone can see progress in real time.")}</Tip>
              </div>
            )}

            {tab === "almacen" && (
              <div>
                <H2>{T2("📦 Almacén de Materiales","📦 Warehouse")}</H2>
                <P>{T2("El módulo de almacén te permite controlar el inventario de materiales, registrar compras y asignarlos a tus proyectos.","The warehouse module lets you control material inventory, register purchases and assign them to your projects.")}</P>
                <H3>{T2("Catálogo de materiales","Material catalog")}</H3>
                <Step n="1" title={T2("Ve al módulo Almacén","Go to Warehouse module")}>{T2("Clic en 📦 Almacén en el menú superior.","Click 📦 Warehouse in the top menu.")}</Step>
                <Step n="2" title={T2("Clic en '+ Nuevo Material'","Click '+ New Material'")}>{T2("Ingresa nombre, SKU, categoría, unidad, precio unitario, stock inicial y stock mínimo.","Enter name, SKU, category, unit, unit price, initial stock and minimum stock.")}</Step>
                <Step n="3" title={T2("Registrar compra","Register purchase")}>{T2("Presiona el botón 🛒 en la tarjeta del material para registrar una entrada de inventario.","Press the 🛒 button on the material card to register an inventory entry.")}</Step>
                <Step n="4" title={T2("Asignar a reporte","Assign to report")}>{T2("Dentro de cualquier reporte, ve a la pestaña 📦 Materiales y selecciona el material y cantidad a usar.","Inside any report, go to the 📦 Materials tab and select the material and quantity to use.")}</Step>
                <H3>{T2("Alertas de stock bajo","Low stock alerts")}</H3>
                <Li icon="⚠️">{T2("Cuando el stock de un material baja del mínimo definido aparece una alerta roja.","When a material's stock drops below the defined minimum a red alert appears.")}</Li>
                <Li icon="🔴">{T2("El menú muestra un badge rojo con el número de materiales en stock bajo.","The menu shows a red badge with the number of low-stock materials.")}</Li>
                <Tip>{T2("El stock se actualiza automáticamente al registrar compras y al asignar materiales a reportes.","Stock updates automatically when registering purchases and assigning materials to reports.")}</Tip>
              </div>
            )}

            {tab === "resultado" && (
              <div>
                <H2>{T2("📊 Resultado del Proyecto","📊 Project Results")}</H2>
                <P>{T2("Cada reporte tiene tres pestañas financieras que te permiten controlar la rentabilidad del proyecto.","Each report has three financial tabs that let you control project profitability.")}</P>
                <H3>{T2("Pestaña 📦 Materiales","📦 Materials tab")}</H3>
                <Li icon="📦">{T2("Asigna materiales del inventario al reporte. El stock se descuenta automáticamente.","Assign materials from inventory to the report. Stock is automatically deducted.")}</Li>
                <Li icon="💰">{T2("Muestra el costo total de materiales usados en el proyecto.","Shows the total cost of materials used in the project.")}</Li>
                <H3>{T2("Pestaña 👷 Mano de Obra","👷 Labor tab")}</H3>
                <Li icon="➕">{T2("Agrega conceptos de costo libre: instalación, traslado, viáticos, subcontrato, etc.","Add free cost concepts: installation, travel, per diem, subcontract, etc.")}</Li>
                <Li icon="✏️">{T2("Edita o elimina cualquier concepto registrado.","Edit or delete any registered concept.")}</Li>
                <Li icon="💰">{T2("Muestra el total acumulado de mano de obra del proyecto.","Shows the accumulated total labor cost of the project.")}</Li>
                <H3>{T2("Pestaña 📊 Resultado","📊 Results tab")}</H3>
                <Li icon="💰">{T2("Ingreso presupuestado — el total del presupuesto aprobado.","Budgeted income — the total of the approved budget.")}</Li>
                <Li icon="📉">{T2("Costo total — suma de materiales + mano de obra registrada.","Total cost — sum of materials + registered labor.")}</Li>
                <Li icon="✅">{T2("Utilidad bruta — ingreso menos costos totales.","Gross profit — income minus total costs.")}</Li>
                <Li icon="📊">{T2("Margen de utilidad — porcentaje de ganancia sobre el ingreso.","Profit margin — profit percentage over income.")}</Li>
                <Li icon="💳">{T2("Cobrado hasta ahora — según anticipos y pagos finales registrados.","Collected so far — based on registered advances and final payments.")}</Li>
                <Tip>{T2("Mantén los materiales y la mano de obra actualizados para tener una visión real de la rentabilidad del proyecto.","Keep materials and labor updated to have a real view of project profitability.")}</Tip>
              </div>
            )}

            {tab === "clientes" && (
              <div>
                <H2>{T2("🏢 Clientes","🏢 Clients")}</H2>
                <P>{T2("El módulo de clientes te permite registrar y administrar la información de contacto de quienes contratan tus servicios.","The clients module lets you register and manage contact information for those who hire your services.")}</P>
                <H3>{T2("Registrar un cliente nuevo","Register a new client")}</H3>
                <Step n="1" title={T2("Ve al módulo Clientes","Go to the Clients module")}>{T2("Clic en 🏢 Clientes en el menú superior.","Click 🏢 Clients in the top menu.")}</Step>
                <Step n="2" title={T2("Clic en '+ Nuevo Cliente'","Click '+ New Client'")}>{T2("Se abrirá el formulario de registro.","The registration form will open.")}</Step>
                <Step n="3" title={T2("Completa los datos","Fill in the data")}>{T2("Razón social, RFC, correo, teléfono, dirección y contacto.","Company name, Tax ID, email, phone, address and contact person.")}</Step>
                <Step n="4" title={T2("Guarda","Save")}>{T2("El cliente quedará disponible al crear reportes.","The client will be available when creating reports.")}</Step>
                <H3>{T2("Editar o eliminar","Edit or delete")}</H3>
                <Li icon="✏️">{T2("Presiona el botón de editar para actualizar los datos del cliente.","Press the edit button to update the client data.")}</Li>
                <Li icon="🗑">{T2("Solo puedes eliminar clientes que no tengan reportes asociados.","You can only delete clients that have no associated reports.")}</Li>
                <H3>{T2("Visibilidad","Visibility")}</H3>
                <Li icon="🔒">{T2("Cada usuario solo ve sus propios clientes.","Each user only sees their own clients.")}</Li>
                {role === "empresarial" && <Li icon="👥">{T2("Como empresarial también ves los clientes de tus técnicos vinculados.","As a business user you also see your linked technicians clients.")}</Li>}
                {role === "superadmin" && <Li icon="⭐">{T2("Como Super Admin ves todos los clientes del sistema.","As Super Admin you see all clients in the system.")}</Li>}
                <Tip>{T2("Crea el cliente antes de crear el reporte. Sin cliente no es posible guardar un reporte.","Create the client before creating the report. Without a client you cannot save a report.")}</Tip>
              </div>
            )}

            {tab === "equipo" && role === "empresarial" && (
              <div>
                <H2>{T2("👥 Mi Equipo","👥 My Team")}</H2>
                <P>{T2("El módulo Mi Equipo te permite vincular técnicos a tu cuenta para supervisar su trabajo y ver todos sus reportes.","The My Team module lets you link technicians to your account to supervise their work and view all their reports.")}</P>
                <H3>{T2("Vincular un técnico","Link a technician")}</H3>
                <Step n="1" title={T2("El técnico debe registrarse primero","The technician must register first")}>{T2("Pídele que cree su cuenta eligiendo el perfil 🔧 Técnico.","Ask them to create their account choosing the 🔧 Technician profile.")}</Step>
                <Step n="2" title={T2("Ve a Mi Equipo","Go to My Team")}>{T2("Clic en 👥 Mi Equipo en el menú superior.","Click 👥 My Team in the top menu.")}</Step>
                <Step n="3" title={T2("Selecciona el técnico","Select the technician")}>{T2("El selector mostrará los técnicos registrados no vinculados aún.","The dropdown will show registered technicians not yet linked.")}</Step>
                <Step n="4" title={T2("Clic en Agregar","Click Add")}>{T2("El técnico quedará vinculado inmediatamente.","The technician will be linked immediately.")}</Step>
                <H3>{T2("Una vez vinculado","Once linked")}</H3>
                <Li icon="📋">{T2("Verás todos sus reportes en tu lista.","You will see all their reports in your list.")}</Li>
                <Li icon="🏢">{T2("Verás todos sus clientes en tu módulo de clientes.","You will see all their clients in your clients module.")}</Li>
                <Li icon="👤">{T2("Al crear un reporte podrás asignárselo directamente.","When creating a report you can assign it directly to them.")}</Li>
                <H3>{T2("Desvincular un técnico","Unlink a technician")}</H3>
                <Li icon="🔓">{T2("Presiona el botón Desvincular en la tarjeta del técnico.","Press the Unlink button on the technician card.")}</Li>
                <Li icon="⚠️">{T2("Sus reportes y clientes creados no se eliminan, solo dejarás de verlos.","Their created reports and clients are not deleted, you will just stop seeing them.")}</Li>
                <Tip>{T2("Un técnico puede estar vinculado a varios usuarios empresariales al mismo tiempo.","A technician can be linked to multiple business users at the same time.")}</Tip>
              </div>
            )}

            {tab === "flujo" && (
              <div>
                <H2>{T2("🔄 Flujo de Trabajo Completo","🔄 Complete Workflow")}</H2>
                <P>{T2("Este es el ciclo completo que sigue cada reporte desde que se crea hasta que el trabajo concluye.","This is the complete cycle each report follows from creation until the work is finished.")}</P>
                <div style={{ position: "relative", paddingLeft: 28, marginTop: 8 }}>
                  {flowSteps.map(([icon, estado, color, desc], i, arr) => (
                    <div key={estado} style={{ position: "relative", marginBottom: 20 }}>
                      <div style={{ position: "absolute", left: -28, top: 4, width: 20, height: 20, borderRadius: 99, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{icon}</div>
                      {i < arr.length - 1 && <div style={{ position: "absolute", left: -19, top: 24, width: 2, height: "calc(100% + 4px)", background: "#1f2937" }} />}
                      <div style={{ color, fontWeight: 800, fontSize: 13, marginBottom: 3 }}>{estado}</div>
                      <div style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.7 }}>{desc}</div>
                    </div>
                  ))}
                </div>
                <H3>{T2("Si el cliente rechaza","If the client rejects")}</H3>
                <Li icon="❌">{T2("El reporte pasa a estado Rechazado.","The report moves to Rejected status.")}</Li>
                <Li icon="💬">{T2("Usa la pestaña Seguimiento para registrar notas sobre el motivo.","Use the Timeline tab to record notes about the reason.")}</Li>
                <Li icon="✏️">{T2("Puedes editar el presupuesto y volver a enviarlo.","You can edit the budget and send it again.")}</Li>
                <H3>{T2("Bitácora de seguimiento","Follow-up log")}</H3>
                <Li icon="🕐">{T2("Cada cambio de estado queda registrado automáticamente con fecha y usuario.","Every status change is automatically recorded with date and user.")}</Li>
                <Li icon="📝">{T2("Puedes agregar notas manuales en la pestaña Seguimiento de cualquier reporte.","You can add manual notes in the Timeline tab of any report.")}</Li>
                <Tip>{T2("El PDF se puede generar en cualquier momento desde la pestaña Presupuesto o el botón PDF.","The PDF can be generated at any time from the Budget tab or the PDF button.")}</Tip>
              </div>
            )}

          </div>
        </div>

        <div style={{ padding: "12px 24px", borderTop: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#070d1b", flexShrink: 0 }}>
          <span style={{ color: "#4b5563", fontSize: 12 }}>{T2("MantPro — Manual de Usuario v1.0","MantPro — User Manual v1.0")}</span>
          <Btn variant="g" sm onClick={onClose}>{T2("Cerrar","Close")}</Btn>
        </div>
      </div>
    </div>
  );
}


export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profiles, setProfiles]       = useState([]);
  const [reports, setReports]         = useState([]);
  const [clients, setClients]         = useState([]);
  const [notifs, setNotifs]           = useState([]);
  const [toasts, setToasts]           = useState([]);
  const [section, setSection]         = useState("reportes");
  const [showNew, setShowNew]         = useState(false);
  const [selected, setSelected]       = useState(null);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [search, setSearch]           = useState("");
  const [loading, setLoading]         = useState(true);
  const [showHelp, setShowHelp]         = useState(false);
  const [materials, setMaterials]       = useState([]);

  const toast = useCallback((msg, type="success") => {
    const id = genId();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200);
  },[]);

  // ── LOAD DATA ───────────────────────────────────────────────────────────────
  async function loadAll(user) {
    setLoading(true);
    try {
      const [p, c, r, mat] = await Promise.all([fetchProfiles(), fetchClients(user), fetchReports(user), fetchMaterials(user)]);
      setMaterials(mat);
      console.log("DEBUG perfiles cargados:", p);
      setProfiles(p.filter(x => !isSuperEmail(x.email)));
      setClients(c);
      setReports(r);
      if (user && user.id !== SUPERUSER.id) {
        const n = await fetchNotifications(user.id);
        setNotifs(n);
      }
    } catch(e) {
      console.error("loadAll error:", e);
    }
    setLoading(false);
  }

  // ── REALTIME ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel("realtime-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => loadAll(currentUser))
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${currentUser.id}` }, async () => {
        if (currentUser.id !== SUPERUSER.id) setNotifs(await fetchNotifications(currentUser.id));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [currentUser]);

  // ── AUTH ─────────────────────────────────────────────────────────────────────
  async function handleLogin(profile, session) {
    // Refresh profile from DB to get latest status/demo_expires_at
    let freshProfile = profile;
    if (profile.id !== SUPERUSER.id) {
      const { data } = await supabase.from("profiles").select("*").eq("id", profile.id).single();
      if (data) freshProfile = data;
    }
    setCurrentUser(freshProfile);
    await loadAll(freshProfile);
  }

  // Restore session when returning from Stripe (back button or redirect)
  useEffect(() => {
    async function restoreSession() {
      const params = new URLSearchParams(window.location.search);
      const payment = params.get("payment");
      // Clean URL regardless
      if (payment) window.history.replaceState({}, "", window.location.pathname);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (profile) {
          setCurrentUser(profile);
          await loadAll(profile);
          if (payment === "success") {
            // Refresh profile to get updated subscription status
            setTimeout(async () => {
              const { data: fresh } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
              if (fresh) setCurrentUser(fresh);
            }, 2000);
          }
        }
      }
    }
    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    if (currentUser?.id !== SUPERUSER.id) await sbSignOut();
    setCurrentUser(null);
    setReports([]); setClients([]); setNotifs([]); setProfiles([]);
  }

  async function handleAddNotif(n) {
    if (!n.user_id) return;
    await insertNotification(n);
    if (n.user_id === currentUser?.id) setNotifs(await fetchNotifications(currentUser.id));
  }

  if (!currentUser) return <AuthScreen onLogin={handleLogin} />;

  // Check demo expiry and block if needed
  if (currentUser.role !== "superadmin") {
    if (currentUser.status === "bloqueado") {
      return <BlockedScreen currentUser={currentUser} onLogout={handleLogout} />;
    }
    if (currentUser.status === "demo" && daysLeft(currentUser.demo_expires_at) === 0) {
      return <BlockedScreen currentUser={currentUser} onLogout={handleLogout} />;
    }
  }

  const lang = currentUser.lang || "es";
  window.__lang = lang;
  const unread = notifs.filter(n=>!n.is_read).length;

  const filtered = reports.filter(r => {
    const ok1 = filterStatus==="todos"||r.status===filterStatus;
    const cl = clients.find(c=>c.id===r.client_id)||r.client;
    const ok2 = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.folio?.toLowerCase().includes(search.toLowerCase()) || cl?.name?.toLowerCase().includes(search.toLowerCase());
    return ok1&&ok2;
  });

  const stats = {
    total: reports.length,
    activos: reports.filter(r=>["en_proceso","anticipo"].includes(r.status)).length,
    pendAuth: reports.filter(r=>["borrador","enviado"].includes(r.status)).length,
    facturado: reports.filter(r=>r.status==="visto_bueno").reduce((s,r)=>s+(r.budget?.total||0),0),
  };

  const lowStockCount = materials.filter(m => m.stock <= m.stock_min).length;
  const NAV = [
    {id:"reportes",      icon:"📋",label:T("reports")},
    {id:"clientes",      icon:"🏢",label:T("clients")},
    {id:"almacen",       icon:"📦",label:lang==="en"?"Warehouse":"Almacén", badge: lowStockCount},
    {id:"notificaciones",icon:"🔔",label:T("alerts"),badge:unread},
    ...(currentUser.role==="empresarial"?[{id:"miequipo",icon:"👥",label:T("myTeam")}]:[]),
    ...(currentUser.role==="superadmin"?[
      {id:"usuarios",    icon:"👤",label:T("users")},
      {id:"membresias",  icon:"💳",label:T("memberships")},
    ]:[]),
  ];

  return (
    <div style={{minHeight:"100vh",background:"#030712",fontFamily:"DM Sans, sans-serif",color:"#f9fafb"}}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:none;opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        input[type=range]{accent-color:#2563eb}
        select option{background:#1f2937}

        /* ── RESPONSIVE MOBILE ── */
        @media (max-width: 768px) {

          /* Header nav — scroll horizontal */
          .nav-bar { overflow-x: auto; -webkit-overflow-scrolling: touch; }

          /* Ocultar texto logo y nav labels en móvil */
          .logo-text-hide { display: none !important; }
          .nav-label { display: none !important; }
          .user-name { display: none !important; }

          /* Stats grid — 2 columnas en móvil */
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }

          /* Filtros — stack vertical */
          .filters-row { flex-direction: column !important; }
          .filters-row input, .filters-row select { width: 100% !important; min-width: unset !important; }

          /* Tarjetas de reporte — ocultar columna derecha */
          .report-card-right { display: none !important; }

          /* Modal — pantalla completa */
          .modal-inner { max-width: 100% !important; max-height: 100vh !important; border-radius: 0 !important; margin: 0 !important; }

          /* Grids de 2 y 3 columnas — a 1 columna */
          .grid-2col { grid-template-columns: 1fr !important; }
          .grid-3col { grid-template-columns: 1fr !important; }
          .grid-4col { grid-template-columns: repeat(2,1fr) !important; }

          /* Tabla presupuesto — scroll horizontal */
          .budget-table-wrap { overflow-x: auto !important; }

          /* Cronograma grid — stack */
          .schedule-grid { grid-template-columns: 1fr !important; }

          /* Header usuario — ocultar nombre en pantalla muy pequeña */
          .user-name { display: none; }

          /* Padding general reducido */
          .main-content { padding: 12px !important; }

          /* Botones en fila — wrap */
          .actions-bar { flex-wrap: wrap !important; gap: 6px !important; }
        }

        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .grid-4col  { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
      <Toast toasts={toasts} />

      {/* HEADER */}
      <div style={{background:"#070d1b",borderBottom:"1px solid #111827",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"0 12px",display:"flex",alignItems:"center",gap:8,height:54}}>
          {/* LOGO */}
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <span className="logo-text-hide" style={{fontWeight:800,fontSize:14,color:"#f9fafb",whiteSpace:"nowrap"}}><img src="logo-dark.png" alt="MantPro" style={{width:80,height:"auto"}} /></span>
          </div>
          {/* NAV */}
          <div className="nav-bar" style={{display:"flex",gap:1,flex:1,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>setSection(n.id)} style={{background:section===n.id?"#1f2937":"none",border:"none",color:section===n.id?"#2563eb":"#6b7280",borderRadius:8,padding:"6px 8px",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"DM Sans,sans-serif",display:"flex",alignItems:"center",gap:4,flexShrink:0,whiteSpace:"nowrap"}}>
                {n.icon}<span className="nav-label">{n.label}</span>
                {n.badge>0&&<span style={{background:"#dc2626",color:"#fff",borderRadius:99,fontSize:10,fontWeight:800,padding:"0 5px",minWidth:16,height:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{n.badge}</span>}
              </button>
            ))}
          </div>
          {/* ACTIONS */}
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <Avatar initials={currentUser.avatar||mkAvatar(currentUser.name)} size={28} color="#2563eb" />
            <div className="user-name" style={{fontSize:12,lineHeight:1.3}}>
              <div style={{fontWeight:700,color:"#f9fafb"}}>{currentUser.name}</div>
              <div style={{fontSize:10,color:currentUser.role==="superadmin"?"#f59e0b":currentUser.role==="empresarial"?"#a78bfa":"#6b7280"}}>
                {currentUser.role==="superadmin"?"⭐ Super Admin":currentUser.role==="empresarial"?`🏢 ${t(lang,'roleEmpresarial')}`:`🔧 ${t(lang,'roleTecnico')}`}
              </div>
            </div>
            <button onClick={()=>setShowHelp(true)} style={{background:"#1f2937",border:"none",color:"#9ca3af",cursor:"pointer",borderRadius:7,width:32,height:32,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}} title="Ayuda">❓</button>
            <button onClick={handleLogout} style={{background:"#1f2937",border:"none",color:"#9ca3af",cursor:"pointer",borderRadius:7,padding:"5px 10px",fontSize:12,fontFamily:"DM Sans,sans-serif",whiteSpace:"nowrap"}}>{T("logout")}</button>
          </div>
        </div>
      </div>

      {currentUser.role !== "superadmin" && <DemoBanner currentUser={currentUser} lang={lang} />}
      {loading ? (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",gap:16,color:"#6b7280"}}>
          <Spinner/> {T("loading")}
        </div>
      ) : (
        <div className="main-content" style={{maxWidth:1200,margin:"0 auto",padding:"24px 20px"}}>
          {section==="clientes"     && <ClientsModule clients={clients} setClients={setClients} reports={reports} toast={toast} currentUser={currentUser} lang={lang} />}
          {section==="almacen"      && <MaterialsModule currentUser={currentUser} toast={toast} lang={lang} />}
          {section==="notificaciones"&&<NotificationsPanel notifs={notifs} setNotifs={setNotifs} currentUser={currentUser} lang={lang} onSelectReport={id=>{const r=reports.find(x=>x.id===id);if(r){setSelected(r);setSection("reportes");}}} />}
          {section==="miequipo"&&currentUser.role==="empresarial"&&<MiEquipoModule profiles={profiles} currentUser={currentUser} setCurrentUser={setCurrentUser} toast={toast} lang={lang} />}
          {section==="usuarios"&&currentUser.role==="superadmin"&&<UsersModule profiles={profiles} setProfiles={setProfiles} currentUser={currentUser} toast={toast} lang={lang} />}
          {section==="membresias"&&currentUser.role==="superadmin"&&<AdminUsersModule profiles={profiles} setProfiles={setProfiles} toast={toast} lang={lang} />}

          {section==="reportes"&&(
            <>
              {/* STATS */}
              <div className="stats-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
                {[
                  {l:T("totalReports"),v:stats.total,ic:"📋",c:"#2563eb"},
                  {l:T("inProcess"),v:stats.activos,ic:"🔧",c:"#f59e0b"},
                  {l:T("toAuthorize"),v:stats.pendAuth,ic:"⏳",c:"#a78bfa"},
                  {l:T("billed"),v:fmtMXN(stats.facturado),ic:"💰",c:"#4ade80"},
                ].map(({l,v,ic,c})=>(
                  <div key={l} style={{...S.card,padding:"16px 18px",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:42,height:42,borderRadius:10,background:`${c}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{ic}</div>
                    <div><div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:.8}}>{l}</div><div style={{color:"#f9fafb",fontSize:20,fontWeight:800,marginTop:2}}>{v}</div></div>
                  </div>
                ))}
              </div>

              {/* FILTERS */}
              <div className="filters-row" style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={T("searchPlaceholder")} style={{...S.input,flex:1,minWidth:200}} />
                <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{...S.input,width:"auto"}}>
                  <option value="todos">{T("allStatuses")}</option>
                  {Object.entries(getStatusCFG()).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
                <Btn variant="p" onClick={()=>setShowNew(true)}>{T("newReport")}</Btn>
              </div>

              {/* LIST */}
              {filtered.length===0?(
                <div style={{textAlign:"center",padding:"70px 0",color:"#4b5563"}}>
                  <div style={{fontSize:52,marginBottom:12}}>🗂️</div>
                  <div style={{fontSize:18,fontWeight:700,color:"#6b7280",marginBottom:6}}>{T("noReports")}</div>
                  <Btn variant="p" onClick={()=>setShowNew(true)}>{T("createFirstReport")}</Btn>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {filtered.map(r=>{
                    const cl=clients.find(c=>c.id===r.client_id)||r.client;
                    const prog=r.schedule?.length?Math.round(r.schedule.reduce((s,a)=>s+(a.progress||0),0)/r.schedule.length):null;
                    return (
                      <div key={r.id} onClick={()=>setSelected(r)} style={{...S.card,padding:"14px 18px",cursor:"pointer",display:"flex",gap:14,alignItems:"center",transition:"border-color .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="#2563eb"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor="#1f2937"}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                            <span style={{color:"#4b5563",fontSize:11,fontWeight:700,fontFamily:"JetBrains Mono,monospace"}}>{r.folio}</span>
                            <Badge status={r.status} />
                          </div>
                          <div style={{fontWeight:800,fontSize:14,color:"#f9fafb",marginBottom:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.title}</div>
                          <div style={{display:"flex",gap:12,fontSize:12,color:"#6b7280",flexWrap:"wrap"}}>
                            <span>🏢 {cl?.name}</span>
                            <span>📅 {fmtDate(r.date)}</span>
                            {r.created_by_name&&<span>✍️ {r.created_by_name}</span>}
                            {r.assigned_to_name&&r.assigned_to_name!==r.created_by_name&&<span>👤 {r.assigned_to_name}</span>}
                            {r.findings?.filter(f=>f.severity==="alta").length>0&&<span style={{color:"#f87171"}}>🔴 {r.findings.filter(f=>f.severity==="alta").length} críticos</span>}
                          </div>
                        </div>
                        <div className="report-card-right" style={{display:"flex",gap:12,alignItems:"center",flexShrink:0}}>
                          {(r.budget?.total||0)>0&&<div style={{textAlign:"right"}}>
                            <div style={{color:"#6b7280",fontSize:10}}>Presupuesto</div>
                            <div style={{color:"#4ade80",fontWeight:800,fontSize:15}}>{fmtMXN(r.budget.total)}</div>
                          </div>}
                          {prog!==null&&<div style={{width:60}}>
                            <div style={{color:"#6b7280",fontSize:10,marginBottom:4,textAlign:"center"}}>Avance</div>
                            <div style={{color:"#2563eb",fontWeight:800,fontSize:14,textAlign:"center"}}>{prog}%</div>
                            <ProgressBar value={prog}/>
                          </div>}
                          <span style={{color:"#374151",fontSize:18}}>›</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showHelp&&<HelpModal currentUser={currentUser} lang={lang} onClose={()=>setShowHelp(false)} />}
      {showNew&&<NewReportModal onClose={()=>setShowNew(false)} onSave={()=>{setShowNew(false);loadAll(currentUser);toast(T("reportCreated"),"success");}} clients={clients} profiles={profiles} currentUser={currentUser} lang={lang} />}
      {selected&&<ReportDetail report={selected} clients={clients} profiles={profiles} currentUser={currentUser} lang={lang} onClose={()=>setSelected(null)} onRefresh={async()=>{const fresh=await fetchReports(currentUser);setReports(fresh);const r=fresh.find(x=>x.id===selected.id);if(r)setSelected(r);}} addNotif={handleAddNotif} toast={toast} />}

      {/* FOOTER */}
      <div style={{borderTop:"1px solid #0f172a",marginTop:40,padding:"18px 24px",textAlign:"center"}}>
        <p style={{margin:0,color:"#374151",fontSize:12,fontFamily:"DM Sans,sans-serif"}}>
          © {new Date().getFullYear()} <span style={{color:"#4b5563",fontWeight:700}}>DevSoft Heron</span> · MantPro by Jaime Martin Estrada Bernabe · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
