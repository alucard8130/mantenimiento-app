import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

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
  tecnico:     { label: "Plan Técnico",     price: 15, currency: "USD", desc: "Acceso individual completo" },
  empresarial: { label: "Plan Empresarial", price: 30, currency: "USD", desc: "Incluye 2 técnicos gratis" },
  tecnico_extra: { label: "Técnico Extra",  price: 15, currency: "USD", desc: "Por técnico adicional" },
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

// ── CONFIG ────────────────────────────────────────────────────────────────────
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
      <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 18, width: "100%", maxWidth: wide ? 900 : 560, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px #000c" }}>
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
function exportPDF(report, client, assignedUser) {
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
    <div class="logo"><div class="logo-icon">🔧</div><div class="logo-text"><h1>MantenimientoApp</h1><p>Gestión Profesional de Mantenimiento</p></div></div>
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
      <div class="tot-row"><span style="color:#6b7280">IVA (16%)</span><span>${fmtMXN(b.iva)}</span></div>
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
    <div class="footer-left"><div style="font-weight:700;color:#374151;margin-bottom:4px">MantenimientoApp · ${today()}</div><div>Vigencia: 30 días naturales.</div></div>
    <div><div class="sig-line"></div><div class="sig-label">Firma de Autorización</div><div class="sig-label">${client?.contact || "Representante Legal"}</div></div>
  </div>
</div></body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

// ══════════════════════════════════════════════════════════════════════════════
// SUPABASE DATA LAYER
// ══════════════════════════════════════════════════════════════════════════════

// ── AUTH ──────────────────────────────────────────────────────────────────────
async function sbSignUp(name, email, password, role) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name, role, avatar: mkAvatar(name) } }
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
  return { data: rep };
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



// ══════════════════════════════════════════════════════════════════════════════
// AUTH SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "tecnico" });
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
    const { error } = await sbSignUp(form.name.trim(), form.email.trim().toLowerCase(), form.password, form.role);
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
          Tu cuenta fue creada exitosamente. Te enviamos un enlace de activación a:
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
          Ir a Iniciar Sesión
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
          <div style={{ width: 66, height: 66, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 16px", boxShadow: "0 0 48px #2563eb40" }}>🔧</div>
          <h1 style={{ color: "#f9fafb", fontSize: 26, fontWeight: 800, margin: 0 }}>MantenimientoApp</h1>
          <p style={{ color: "#4b5563", fontSize: 13, marginTop: 6 }}>Gestión profesional de mantenimiento</p>
        </div>
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 20, padding: 32, boxShadow: "0 28px 70px #000a" }}>
          <div style={{ display: "flex", background: "#1f2937", borderRadius: 12, padding: 4, marginBottom: 28 }}>
            {[["login","Iniciar Sesión"],["register","Crear Cuenta"]].map(([k,l]) => (
              <button key={k} onClick={() => { setMode(k); setError(""); }} style={{ flex: 1, background: mode===k?"#2563eb":"none", border: "none", borderRadius: 9, padding: "9px", color: mode===k?"#fff":"#6b7280", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif", transition: "all .2s" }}>{l}</button>
            ))}
          </div>
          {mode === "login" ? (
            <>
              <div style={{ marginBottom: 14 }}><label style={S.label}>Correo</label><input value={form.email} onChange={e => f("email",e.target.value)} placeholder="tu@correo.com" type="email" style={iStyle} onKeyDown={e => e.key==="Enter"&&handleLogin()} /></div>
              <div style={{ marginBottom: 22 }}><label style={S.label}>Contraseña</label><input value={form.password} onChange={e => f("password",e.target.value)} placeholder="••••••••" type="password" style={iStyle} onKeyDown={e => e.key==="Enter"&&handleLogin()} /></div>
              {error && <div style={{ background:"#450a0a",border:"1px solid #f8717140",borderRadius:8,padding:"10px 14px",color:"#f87171",fontSize:13,marginBottom:16 }}>{error}</div>}
              <button onClick={handleLogin} disabled={loading} style={{ width:"100%",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",border:"none",borderRadius:10,padding:13,color:"#fff",fontWeight:800,fontSize:15,cursor:loading?"not-allowed":"pointer",opacity:loading?.7:1,fontFamily:"DM Sans,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>{loading?<><Spinner/>Verificando…</>:"Iniciar Sesión"}</button>
              <p style={{ textAlign:"center",color:"#4b5563",fontSize:13,marginTop:18,marginBottom:0 }}>¿No tienes cuenta? <span onClick={()=>{setMode("register");setError("");}} style={{color:"#2563eb",cursor:"pointer",fontWeight:700}}>Regístrate</span></p>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}><label style={S.label}>Nombre completo</label><input value={form.name} onChange={e => f("name",e.target.value)} placeholder="Juan Pérez" style={iStyle} /></div>
              <div style={{ marginBottom: 14 }}><label style={S.label}>Correo</label><input value={form.email} onChange={e => f("email",e.target.value)} placeholder="tu@correo.com" type="email" style={iStyle} /></div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
                <div><label style={S.label}>Contraseña</label><input value={form.password} onChange={e=>f("password",e.target.value)} placeholder="Mín. 6 car." type="password" style={iStyle}/></div>
                <div><label style={S.label}>Confirmar</label><input value={form.confirm} onChange={e=>f("confirm",e.target.value)} placeholder="Repite" type="password" style={iStyle}/></div>
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={S.label}>Perfil</label>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                  {[["empresarial","🏢 Empresarial","Gestiona múltiples técnicos"],["tecnico","🔧 Técnico","Reportes y clientes propios"]].map(([val,lbl,desc]) => (
                    <div key={val} onClick={()=>f("role",val)} style={{ background:form.role===val?"#1e3a5f":"#1f2937",border:`1.5px solid ${form.role===val?"#2563eb":"#374151"}`,borderRadius:10,padding:"10px 12px",cursor:"pointer" }}>
                      <div style={{ fontWeight:700,fontSize:13,color:form.role===val?"#60a5fa":"#f9fafb" }}>{lbl}</div>
                      <div style={{ fontSize:11,color:"#6b7280",marginTop:2 }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              {error && <div style={{ background:"#450a0a",border:"1px solid #f8717140",borderRadius:8,padding:"10px 14px",color:"#f87171",fontSize:13,marginBottom:16 }}>{error}</div>}
              <button onClick={handleRegister} disabled={loading} style={{ width:"100%",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",border:"none",borderRadius:10,padding:13,color:"#fff",fontWeight:800,fontSize:15,cursor:loading?"not-allowed":"pointer",opacity:loading?.7:1,fontFamily:"DM Sans,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>{loading?<><Spinner/>Creando cuenta…</>:"Crear mi cuenta"}</button>
              <p style={{ textAlign:"center",color:"#4b5563",fontSize:13,marginTop:18,marginBottom:0 }}>¿Ya tienes cuenta? <span onClick={()=>{setMode("login");setError("");}} style={{color:"#2563eb",cursor:"pointer",fontWeight:700}}>Inicia sesión</span></p>
            </>
          )}
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
function MiEquipoModule({ profiles, currentUser, setCurrentUser, toast }) {
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
    if (members.find(m => m.tecnico_id === selectedId)) return toast("Ese técnico ya está en tu equipo", "error");
    setAdding(true);
    const err = await addCompanyMember(currentUser.id, selectedId);
    if (err) { toast("Error al agregar técnico", "error"); setAdding(false); return; }
    await loadMembers();
    setSelectedId("");
    setAdding(false);
    toast("Técnico agregado al equipo", "success");
  }

  async function remove(tecnicoId) {
    const err = await removeCompanyMember(currentUser.id, tecnicoId);
    if (err) return toast("Error al eliminar", "error");
    await loadMembers();
    toast("Técnico eliminado del equipo", "success");
  }

  // Available tecnicos not yet in team
  const memberIds = members.map(m => m.tecnico_id);
  const available = profiles.filter(p => p.role === "tecnico" && !memberIds.includes(p.id));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f9fafb" }}>Mi Equipo</h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>{members.length} técnicos vinculados a tu cuenta</p>
      </div>

      {/* Agregar técnico */}
      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <label style={S.label}>Agregar técnico existente</label>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{ ...S.input, flex: 1 }}>
            <option value="">Seleccionar técnico…</option>
            {available.map(p => <option key={p.id} value={p.id}>{p.name} — {p.email}</option>)}
          </select>
          <Btn variant="s" onClick={add} disabled={adding || !selectedId}>
            {adding ? <><Spinner /> Agregando…</> : "+ Agregar"}
          </Btn>
        </div>
        {available.length === 0 && (
          <p style={{ color: "#4b5563", fontSize: 12, marginTop: 8, marginBottom: 0 }}>
            No hay técnicos disponibles. Pídeles que se registren en la app primero.
          </p>
        )}
      </div>

      {/* Lista de miembros */}
      {currentUser.role !== "superadmin" && <DemoBanner currentUser={currentUser} />}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner /></div>
      ) : members.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: "#4b5563" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <div style={{ fontWeight: 700, color: "#6b7280" }}>Aún no tienes técnicos vinculados</div>
          <p style={{ fontSize: 13, marginTop: 8 }}>Agrega técnicos para ver sus reportes y asignarles trabajo</p>
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
                <div style={{ fontSize: 11, color: "#4b5563" }}>Desde {fmtDate(m.created_at?.slice(0, 10))}</div>
                <Btn variant="d" sm onClick={() => remove(m.tecnico_id)}>Desvincular</Btn>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UsersModule({ profiles, setProfiles, currentUser, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "tecnico" });
  const ROLE_CFG = { superadmin:{label:"⭐ Super Admin",color:"#f59e0b",bg:"#451a03"}, empresarial:{label:"🏢 Empresarial",color:"#a78bfa",bg:"#2e1065"}, tecnico:{label:"🔧 Técnico",color:"#60a5fa",bg:"#1e3a5f"} };

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
      const { error } = await sbSignUp(form.name.trim(), form.email.trim().toLowerCase(), form.password, form.role);
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
                <div style={{fontSize:12,color:"#6b7280"}}>{u.email} {u.created_at && `· Desde ${fmtDate(u.created_at)}`}</div>
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
function ClientsModule({ clients, setClients, reports, toast, currentUser }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name:"",email:"",phone:"",rfc:"",address:"",contact:"",status:"activo" });

  function openNew() { setForm({name:"",email:"",phone:"",rfc:"",address:"",contact:"",status:"activo"}); setEditing(null); setShowForm(true); }
  function openEdit(c) { setForm({...c}); setEditing(c.id); setShowForm(true); }

  async function save() {
    if (!form.name) return toast("Ingresa el nombre del cliente","error");
    const payload = editing ? { id: editing, ...form } : { ...form, created_by: currentUser.id === SUPERUSER.id ? null : currentUser.id };
    const { data, error } = await upsertClient(payload);
    if (error) return toast("Error al guardar","error");
    if (editing) setClients(clients.map(c => c.id===editing?data:c));
    else setClients([data,...clients]);
    toast(editing?"Cliente actualizado":"Cliente creado","success");
    setShowForm(false);
  }

  async function del(id) {
    if (reports.some(r => r.client_id===id)) return toast("Este cliente tiene reportes asociados","error");
    const err = await deleteClient(id);
    if (err) return toast("Error al eliminar","error");
    setClients(clients.filter(c => c.id!==id));
    toast("Cliente eliminado","success");
  }

  const filtered = clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {showForm && (
        <Modal title={editing?"✏️ Editar Cliente":"➕ Nuevo Cliente"} onClose={()=>setShowForm(false)}>
          <Input label="Razón Social / Nombre" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Empresa S.A. de C.V." />
          <Input label="Correo" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} type="email" placeholder="contacto@empresa.com" />
          <Input label="Teléfono" value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="55 1234-5678" />
          <Input label="RFC" value={form.rfc||""} onChange={e=>setForm({...form,rfc:e.target.value})} placeholder="ABC890101XYZ" />
          <Input label="Persona de Contacto" value={form.contact||""} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="Nombre del responsable" />
          <Textarea label="Dirección" value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Calle, número, colonia, ciudad" />
          <Sel label="Estado" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
            <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
          </Sel>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn variant="g" onClick={()=>setShowForm(false)}>Cancelar</Btn><Btn variant="s" onClick={save}>✓ Guardar</Btn></div>
        </Modal>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h2 style={{margin:0,fontSize:20,fontWeight:800,color:"#f9fafb"}}>Clientes</h2><p style={{margin:"4px 0 0",color:"#6b7280",fontSize:13}}>{clients.length} clientes</p></div>
        <Btn variant="p" onClick={openNew}>+ Nuevo Cliente</Btn>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Buscar cliente…" style={{...S.input,marginBottom:16}} />
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(c => (
          <div key={c.id} style={{...S.card,padding:"16px 20px",display:"flex",gap:14,alignItems:"center"}}>
            <Avatar initials={c.name.split(" ").map(w=>w[0]).join("").slice(0,2)} size={44} color="#2563eb" />
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <span style={{fontWeight:800,color:"#f9fafb",fontSize:15}}>{c.name}</span>
                <span style={{fontSize:10,fontWeight:700,color:c.status==="activo"?"#4ade80":"#6b7280",background:c.status==="activo"?"#14532d":"#1f2937",padding:"1px 7px",borderRadius:99}}>{c.status}</span>
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
function NotificationsPanel({ notifs, setNotifs, currentUser, onSelectReport }) {
  const unread = notifs.filter(n => !n.is_read).length;
  const icon = t => t==="success"?"✓":t==="warning"?"⚠":t==="error"?"✕":"ℹ";
  const color = t => t==="success"?"#4ade80":t==="warning"?"#fbbf24":t==="error"?"#f87171":"#60a5fa";

  async function mark(id) { await markNotifRead(id); setNotifs(notifs.map(n=>n.id===id?{...n,is_read:true}:n)); }
  async function markAll() { await markAllNotifsRead(currentUser.id); setNotifs(notifs.map(n=>({...n,is_read:true}))); }
  async function del(id) { await deleteNotif(id); setNotifs(notifs.filter(n=>n.id!==id)); }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div><h2 style={{margin:0,fontSize:20,fontWeight:800,color:"#f9fafb"}}>Notificaciones</h2><p style={{margin:"4px 0 0",color:"#6b7280",fontSize:13}}>{unread} sin leer</p></div>
        {unread>0&&<Btn variant="g" sm onClick={markAll}>✓ Marcar todas</Btn>}
      </div>
      {notifs.length===0?(
        <div style={{textAlign:"center",padding:"60px 0",color:"#4b5563"}}><div style={{fontSize:52,marginBottom:12}}>🔔</div><div style={{fontSize:16,fontWeight:700,color:"#6b7280"}}>Sin notificaciones</div></div>
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
function NewReportModal({ onClose, onSave, clients, profiles, currentUser }) {
  const isAdmin = ["empresarial","superadmin"].includes(currentUser.role);
  const [form, setForm] = useState({ clientId:"", title:"", description:"", date:today(), assignedTo: isAdmin?"":currentUser.id });
  const [findings, setFindings] = useState([{ id:genId(), description:"", severity:"media" }]);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  function handlePhoto(e) {
    Array.from(e.target.files).forEach(f => {
      const r = new FileReader();
      r.onload = ev => setPhotos(p=>[...p,{id:genId(),url:ev.target.result,name:f.name}]);
      r.readAsDataURL(f);
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
    const { error } = await createReport(payload, findings, currentUser);
    if (error) { alert("Error al crear reporte: " + error.message); setSaving(false); return; }
    onSave();
    setSaving(false);
  }

  const techUsers = currentUser.role === "superadmin"
    ? profiles.filter(p => p.role === "tecnico")
    : profiles.filter(p => p.role === "tecnico" && (currentUser.members || []).includes(p.id));

  return (
    <Modal title="📋 Nuevo Reporte de Mantenimiento" onClose={onClose} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div>
          <Sel label="Cliente" value={form.clientId} onChange={e=>setForm({...form,clientId:e.target.value})}>
            <option value="">Seleccionar…</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </Sel>
          <Input label="Título del Reporte" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ej. Reparación techo edificio A" />
          <Input label="Fecha de Inspección" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} />
          {isAdmin?(
            <Sel label="Técnico Asignado" value={form.assignedTo} onChange={e=>setForm({...form,assignedTo:e.target.value})}>
              <option value="">Seleccionar técnico…</option>
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
          <Textarea label="Descripción / Observaciones" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe los hallazgos generales…" style={{minHeight:130}} />
          <div style={{marginBottom:12}}>
            <label style={S.label}>Fotos ({photos.length})</label>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} style={{display:"none"}} />
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {photos.map(p=>(
                <div key={p.id} style={{position:"relative"}}>
                  <img src={p.url} alt="" style={{width:64,height:64,objectFit:"cover",borderRadius:8,border:"1px solid #374151"}} />
                  <button onClick={()=>setPhotos(photos.filter(x=>x.id!==p.id))} style={{position:"absolute",top:-6,right:-6,background:"#dc2626",border:"none",borderRadius:99,color:"#fff",width:18,height:18,cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                </div>
              ))}
              <button onClick={()=>fileRef.current.click()} style={{width:64,height:64,border:"2px dashed #374151",borderRadius:8,background:"none",color:"#4b5563",cursor:"pointer",fontSize:22}}>+</button>
            </div>
          </div>
        </div>
      </div>
      <div>
        <label style={S.label}>Hallazgos</label>
        {findings.map((f,i)=>(
          <div key={f.id} style={{display:"flex",gap:8,marginBottom:8}}>
            <input value={f.description} onChange={e=>setFindings(findings.map((x,j)=>j===i?{...x,description:e.target.value}:x))} placeholder={`Hallazgo ${i+1}`} style={{...S.input,flex:1}} />
            <select value={f.severity} onChange={e=>setFindings(findings.map((x,j)=>j===i?{...x,severity:e.target.value}:x))} style={{...S.input,width:90}}>
              <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option>
            </select>
            <button onClick={()=>setFindings(findings.filter((_,j)=>j!==i))} style={{background:"#dc262630",border:"none",borderRadius:8,color:"#f87171",padding:"0 12px",cursor:"pointer"}}>✕</button>
          </div>
        ))}
        <Btn variant="g" sm onClick={()=>setFindings([...findings,{id:genId(),description:"",severity:"media"}])}>+ Agregar hallazgo</Btn>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:16,borderTop:"1px solid #1f2937",marginTop:16}}>
        <Btn variant="g" onClick={onClose}>Cancelar</Btn>
        <Btn variant="p" onClick={save} disabled={saving}>{saving?<><Spinner/>Guardando…</>:"💾 Guardar Reporte"}</Btn>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BUDGET MODAL
// ══════════════════════════════════════════════════════════════════════════════
function BudgetModal({ report, onClose, onSave }) {
  const existing = report.budget;
  const [items, setItems] = useState(report.budgetItems?.length ? report.budgetItems.map(i=>({...i,id:i.id||genId()})) : [{id:genId(),concept:"",unit:"m²",qty:1,price:0,total:0}]);
  const [pct, setPct] = useState(existing?.advance_pct||50);
  const [saving, setSaving] = useState(false);

  function upd(i,fld,v) {
    const u = items.map((x,j)=>{if(j!==i)return x;const n={...x,[fld]:(fld==="qty"||fld==="price")?parseFloat(v)||0:v};n.total=n.qty*n.price;return n;});
    setItems(u);
  }
  const sub=items.reduce((s,x)=>s+(x.total||0),0), iva=sub*0.16, total=sub+iva;

  async function save() {
    setSaving(true);
    await saveBudget(report.id, { subtotal:sub, iva, total, advance_pct:pct, advance_paid:existing?.advance_paid||false, final_paid:existing?.final_paid||false }, items);
    onSave(); setSaving(false);
  }

  return (
    <Modal title="💰 Editar Presupuesto" onClose={onClose} wide>
      <div style={{overflowX:"auto",marginBottom:16}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{background:"#1f2937"}}>{["Concepto","Unidad","Cantidad","P. Unitario","Total",""].map(h=><th key={h} style={{padding:"8px 10px",color:"#6b7280",fontWeight:700,textAlign:"left"}}>{h}</th>)}</tr></thead>
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
        <Btn variant="g" sm onClick={()=>setItems([...items,{id:genId(),concept:"",unit:"m²",qty:1,price:0,total:0}])} style={{marginTop:10}}>+ Agregar partida</Btn>
      </div>
      <div style={{display:"flex",gap:16,justifyContent:"flex-end",flexWrap:"wrap"}}>
        <div style={{background:"#1f2937",borderRadius:10,padding:14,minWidth:220}}>
          {[["Subtotal",sub,"#9ca3af"],["IVA 16%",iva,"#9ca3af"],["TOTAL",total,"#4ade80"]].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:6,borderTop:l==="TOTAL"?"1px solid #374151":"none",paddingTop:l==="TOTAL"?8:0,fontWeight:l==="TOTAL"?800:400,fontSize:l==="TOTAL"?16:13}}>
              <span style={{color:c}}>{l}</span><span style={{color:c}}>{fmtMXN(v)}</span>
            </div>
          ))}
        </div>
        <div style={{background:"#1f2937",borderRadius:10,padding:14,minWidth:220}}>
          <label style={S.label}>Anticipo requerido</label>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <input type="range" min={10} max={80} value={pct} onChange={e=>setPct(parseInt(e.target.value))} style={{flex:1}} />
            <span style={{color:"#a78bfa",fontWeight:800,fontSize:18,minWidth:38}}>{pct}%</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7280",marginTop:6}}>
            <span>Anticipo:</span><span style={{color:"#a78bfa",fontWeight:700}}>{fmtMXN(total*pct/100)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7280"}}>
            <span>Resto:</span><span style={{color:"#9ca3af",fontWeight:700}}>{fmtMXN(total*(100-pct)/100)}</span>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:16}}>
        <Btn variant="g" onClick={onClose}>Cancelar</Btn>
        <Btn variant="s" onClick={save} disabled={saving}>{saving?<><Spinner/>Guardando…</>:"✓ Guardar"}</Btn>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULE MODAL
// ══════════════════════════════════════════════════════════════════════════════
function ScheduleModal({ report, onClose, onSave }) {
  const [acts, setActs] = useState(report.schedule?.length ? report.schedule.map(a=>({...a,start_date:a.start_date||today(),end_date:a.end_date||addDays(today(),1)})) : [{id:genId(),activity:"",start_date:today(),end_date:addDays(today(),1),responsible:"",status:"pendiente",progress:0}]);
  const [saving, setSaving] = useState(false);
  function upd(i,f,v){setActs(acts.map((x,j)=>j===i?{...x,[f]:v}:x));}
  const overall=acts.length?Math.round(acts.reduce((s,a)=>s+(a.progress||0),0)/acts.length):0;

  async function save(){setSaving(true);await saveSchedule(report.id,acts);onSave();setSaving(false);}

  return (
    <Modal title="📅 Cronograma de Actividades" onClose={onClose} wide>
      <div style={{background:"#1f2937",borderRadius:10,padding:12,marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
        <div style={{flex:1}}><ProgressBar value={overall} color="#2563eb"/></div>
        <span style={{color:"#2563eb",fontWeight:800,fontSize:18}}>{overall}% general</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {acts.map((a,i)=>(
          <div key={a.id||i} style={{background:"#1f2937",borderRadius:10,padding:14}}>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <input value={a.activity} onChange={e=>upd(i,"activity",e.target.value)} placeholder="Nombre de la actividad" style={{...S.input,flex:1}} />
              <select value={a.status} onChange={e=>upd(i,"status",e.target.value)} style={{...S.input,width:120,color:ACT_CFG[a.status]?.color}}>
                <option value="pendiente">Pendiente</option><option value="en_curso">En Curso</option><option value="completada">Completada</option>
              </select>
              <button onClick={()=>setActs(acts.filter((_,j)=>j!==i))} style={{background:"#dc262630",border:"none",borderRadius:8,color:"#f87171",padding:"0 12px",cursor:"pointer"}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
              <div><label style={{...S.label,fontSize:10}}>INICIO</label><input type="date" value={a.start_date} onChange={e=>upd(i,"start_date",e.target.value)} style={{...S.input,marginTop:4}} /></div>
              <div><label style={{...S.label,fontSize:10}}>FIN</label><input type="date" value={a.end_date} onChange={e=>upd(i,"end_date",e.target.value)} style={{...S.input,marginTop:4}} /></div>
              <div><label style={{...S.label,fontSize:10}}>RESPONSABLE</label><input value={a.responsible||""} onChange={e=>upd(i,"responsible",e.target.value)} placeholder="Equipo / persona" style={{...S.input,marginTop:4}} /></div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{color:"#6b7280",fontSize:12}}>Avance</span>
              <input type="range" min={0} max={100} value={a.progress||0} onChange={e=>upd(i,"progress",parseInt(e.target.value))} style={{flex:1}} />
              <span style={{color:"#4ade80",fontWeight:700,minWidth:34}}>{a.progress||0}%</span>
            </div>
            <ProgressBar value={a.progress||0} color={a.status==="completada"?"#4ade80":a.status==="en_curso"?"#fb923c":"#374151"} />
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,marginTop:14}}>
        <Btn variant="g" sm onClick={()=>setActs([...acts,{id:genId(),activity:"",start_date:today(),end_date:addDays(today(),1),responsible:"",status:"pendiente",progress:0}])}>+ Actividad</Btn>
        <div style={{flex:1}}/>
        <Btn variant="g" onClick={onClose}>Cancelar</Btn>
        <Btn variant="s" onClick={save} disabled={saving}>{saving?<><Spinner/>Guardando…</>:"✓ Guardar"}</Btn>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORT DETAIL
// ══════════════════════════════════════════════════════════════════════════════
function ReportDetail({ report, clients, profiles, currentUser, onClose, onRefresh, addNotif, toast }) {
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

  const TABS = [["overview","📋 Reporte"],["presupuesto","💰 Presupuesto"],["cronograma","📅 Cronograma"],["timeline","🕐 Seguimiento"]];

  return (
    <Modal title={`${report.folio} · ${report.title}`} onClose={onClose} wide>
      {showBudget && <BudgetModal report={report} onClose={()=>setShowBudget(false)} onSave={()=>{setShowBudget(false);onRefresh();toast("Presupuesto guardado","success");}} />}
      {showSchedule && <ScheduleModal report={report} onClose={()=>setShowSchedule(false)} onSave={()=>{setShowSchedule(false);onRefresh();toast("Cronograma guardado","success");}} />}

      <div style={{display:"flex",borderBottom:"1px solid #1f2937",overflowX:"auto",flexShrink:0,padding:"0 4px"}}>
        {TABS.map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{background:"none",border:"none",color:tab===k?"#2563eb":"#6b7280",borderBottom:`2px solid ${tab===k?"#2563eb":"transparent"}`,padding:"11px 16px",cursor:"pointer",fontWeight:700,fontSize:13,whiteSpace:"nowrap",fontFamily:"DM Sans, sans-serif"}}>{l}</button>)}
      </div>

      <div style={{padding:20}}>
        {/* ACTIONS */}
        <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap",background:"#111827",borderRadius:10,padding:12,alignItems:"center"}}>
          <Badge status={report.status} />
          <div style={{flex:1}}/>
          {report.status==="borrador"&&(b.total||0)>0&&<Btn variant="p" sm onClick={()=>action("send")}>📤 Enviar al Cliente</Btn>}
          {report.status==="enviado"&&<><Btn variant="s" sm onClick={()=>action("authorize")}>✓ Autorizado</Btn><Btn variant="d" sm onClick={()=>action("reject")}>✕ Rechazado</Btn></>}
          {report.status==="autorizado"&&<Btn variant="purple" sm onClick={()=>action("advance")}>💳 Registrar Anticipo</Btn>}
          {report.status==="anticipo"&&<Btn variant="w" sm onClick={()=>action("start")}>🔧 Iniciar Trabajos</Btn>}
          {report.status==="en_proceso"&&<Btn variant="p" sm onClick={()=>action("complete")}>✅ Marcar Concluido</Btn>}
          {report.status==="completado"&&<Btn variant="s" sm onClick={()=>action("visto_bueno")}>⭐ Visto Bueno</Btn>}
          {(b.total||0)>0&&<Btn variant="cyan" sm onClick={()=>exportPDF(report,client,assigned)}>📄 PDF</Btn>}
        </div>

        {tab==="overview"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:16}}>
              {[
                ["Cliente",    client?.name||"—",                client?.email||""],
                ["Creado por", report.created_by_name||"—",      "Autor del reporte"],
                ["Asignado a", report.assigned_to_name||assigned?.name||"—", "Técnico ejecutor"],
                ["Inspección", fmtDate(report.date),             `Folio: ${report.folio}`],
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
                <label style={S.label}>Hallazgos</label>
                {report.findings.map(f=>{
                  const sc={alta:"#ef4444",media:"#f59e0b",baja:"#22c55e"}[f.severity];
                  return <div key={f.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#1f2937",borderRadius:8,marginBottom:6,borderLeft:`3px solid ${sc}`}}>
                    <span style={{fontSize:13,color:"#f9fafb",flex:1}}>{f.description}</span>
                    <span style={{fontSize:10,fontWeight:800,color:sc,background:`${sc}20`,padding:"2px 8px",borderRadius:99}}>{f.severity.toUpperCase()}</span>
                  </div>;
                })}
              </div>
            )}
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
              <Btn variant="g" sm onClick={()=>setShowBudget(true)}>✏️ Editar</Btn>
              {(b.total||0)>0&&<Btn variant="cyan" sm onClick={()=>exportPDF(report,client,assigned)}>📄 PDF</Btn>}
            </div>
            {!report.budgetItems?.length?(
              <div style={{textAlign:"center",padding:40,color:"#4b5563"}}><div style={{fontSize:48,marginBottom:12}}>💰</div><Btn variant="p" onClick={()=>setShowBudget(true)}>Crear Presupuesto</Btn></div>
            ):(
              <>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,marginBottom:14}}>
                  <thead><tr style={{background:"#1f2937"}}>{["Concepto","Unidad","Cant.","P.U.","Total"].map(h=><th key={h} style={{padding:"8px 12px",color:"#6b7280",textAlign:"left"}}>{h}</th>)}</tr></thead>
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
                    {[["Subtotal",b.subtotal,"#9ca3af"],["IVA 16%",b.iva,"#9ca3af"],["TOTAL",b.total,"#4ade80"]].map(([l,v,c])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:6,borderTop:l==="TOTAL"?"1px solid #374151":"none",paddingTop:l==="TOTAL"?8:0,fontWeight:l==="TOTAL"?800:400,fontSize:l==="TOTAL"?16:13}}>
                        <span style={{color:c}}>{l}</span><span style={{color:c}}>{fmtMXN(v)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{background:"#1f2937",borderRadius:10,padding:14,minWidth:230}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}>
                      <span style={{color:"#9ca3af"}}>Anticipo ({b.advance_pct}%)</span>
                      <span style={{color:b.advance_paid?"#4ade80":"#a78bfa",fontWeight:700}}>{fmtMXN(advance)} {b.advance_paid?"✓":""}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                      <span style={{color:"#9ca3af"}}>Resto al finalizar</span>
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
                <span style={{color:"#6b7280",fontSize:13}}>Avance general:</span>
                <span style={{color:"#2563eb",fontWeight:800,fontSize:20}}>{overall}%</span>
              </div>
              <Btn variant="g" sm onClick={()=>setShowSchedule(true)}>✏️ Editar</Btn>
            </div>
            <ProgressBar value={overall} />
            <div style={{marginTop:14}}>
              {!report.schedule?.length?(
                <div style={{textAlign:"center",padding:40,color:"#4b5563"}}><div style={{fontSize:48,marginBottom:12}}>📅</div><Btn variant="p" onClick={()=>setShowSchedule(true)}>Crear Cronograma</Btn></div>
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
            <div style={{borderTop:"1px solid #1f2937",paddingTop:14,marginTop:8}}>
              <label style={S.label}>Agregar nota de seguimiento</label>
              <div style={{display:"flex",gap:8}}>
                <input value={noteVal} onChange={e=>setNoteVal(e.target.value)} placeholder="Ej. Llamada con el cliente…" style={{...S.input,flex:1}} onKeyDown={e=>e.key==="Enter"&&handleAddNote()} />
                <Btn variant="p" onClick={handleAddNote}>Agregar</Btn>
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
function BlockedScreen({ currentUser, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [extraTecnicos, setExtraTecnicos] = useState(0);
  const role = currentUser.role;
  const isEmpresarial = role === "empresarial";
  const basePrice = isEmpresarial ? 30 : 15;
  const extraPrice = extraTecnicos * 15;
  const totalPrice = basePrice + extraPrice;

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
        <h1 style={{ color: "#f9fafb", fontSize: 26, fontWeight: 800, margin: "0 0 10px" }}>Tu periodo demo ha terminado</h1>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
          Los 30 días gratuitos han concluido. Activa tu membresía para continuar usando MantenimientoApp y acceder a todos tus datos.
        </p>

        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 18, padding: 28, marginBottom: 20 }}>
          <div style={{ display: "inline-block", background: isEmpresarial ? "#2e1065" : "#1e3a5f", border: `1px solid ${isEmpresarial ? "#a78bfa" : "#60a5fa"}50`, borderRadius: 8, padding: "4px 14px", fontSize: 12, fontWeight: 700, color: isEmpresarial ? "#a78bfa" : "#60a5fa", marginBottom: 16 }}>
            {isEmpresarial ? "🏢 Plan Empresarial" : "🔧 Plan Técnico"}
          </div>

          <div style={{ fontSize: 48, fontWeight: 800, color: "#f9fafb", marginBottom: 4 }}>
            ${totalPrice} <span style={{ fontSize: 18, color: "#6b7280", fontWeight: 400 }}>USD/mes</span>
          </div>

          <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 20, lineHeight: 1.8 }}>
            {isEmpresarial ? (
              <>Plan base $30 USD · incluye 2 técnicos gratis</>
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
                <span style={{ color: "#6b7280", fontSize: 13 }}>× $15 USD = <strong style={{ color: "#a78bfa" }}>${extraPrice} USD</strong></span>
              </div>
              <p style={{ color: "#4b5563", fontSize: 11, marginTop: 8, marginBottom: 0 }}>Los primeros 2 técnicos ya están incluidos en el plan base.</p>
            </div>
          )}

          <button onClick={() => handleCheckout(role)} disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", border: "none", borderRadius: 12, padding: "15px", color: "#fff", fontWeight: 800, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 4px 24px #2563eb40" }}>
            {loading ? <><Spinner /> Redirigiendo a Stripe…</> : `💳 Activar membresía — $${totalPrice} USD/mes`}
          </button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, color: "#4b5563", fontSize: 12 }}>
            <span>🔒</span> Pago seguro con Stripe · Cancela cuando quieras
          </div>
        </div>

        <button onClick={onLogout} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", fontSize: 13, fontFamily: "DM Sans, sans-serif" }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DEMO BANNER — banner de días restantes
// ══════════════════════════════════════════════════════════════════════════════
function DemoBanner({ currentUser }) {
  const days = daysLeft(currentUser.demo_expires_at);
  if (currentUser.status !== "demo") return null;

  const color = days <= 5 ? "#f87171" : days <= 10 ? "#fbbf24" : "#60a5fa";
  const bg    = days <= 5 ? "#450a0a" : days <= 10 ? "#451a03" : "#1e3a5f";

  return (
    <div style={{ background: bg, borderBottom: `1px solid ${color}30`, padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 13 }}>
      <span style={{ fontSize: 16 }}>{days <= 5 ? "⚠️" : "🎉"}</span>
      <span style={{ color: "#f9fafb" }}>
        {days === 0 ? "Tu demo expira hoy." : `Periodo demo: ${days} día${days !== 1 ? "s" : ""} restante${days !== 1 ? "s" : ""}.`}
      </span>
      <span style={{ color, fontWeight: 700 }}>Activa tu membresía antes de que expire.</span>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
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

function HelpModal({ currentUser, onClose }) {
  const [tab, setTab] = useState("inicio");
  const role = currentUser.role;

  const TABS = [
    { id: "inicio",       icon: "🏠", label: "Inicio" },
    { id: "reportes",     icon: "📋", label: "Reportes" },
    { id: "presupuestos", icon: "💰", label: "Presupuestos" },
    { id: "cronograma",   icon: "📅", label: "Cronograma" },
    { id: "clientes",     icon: "🏢", label: "Clientes" },
    ...(role === "empresarial" ? [{ id: "equipo", icon: "👥", label: "Mi Equipo" }] : []),
    { id: "flujo",        icon: "🔄", label: "Flujo de trabajo" },
  ];

  const H2 = ({ children }) => <h2 style={{ color: "#f9fafb", fontSize: 17, fontWeight: 800, margin: "0 0 14px", borderBottom: "1px solid #1f2937", paddingBottom: 10 }}>{children}</h2>;
  const H3 = ({ children }) => <h3 style={{ color: "#60a5fa", fontSize: 13, fontWeight: 700, margin: "18px 0 8px", textTransform: "uppercase", letterSpacing: 0.8 }}>{children}</h3>;
  const P = ({ children }) => <p style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.8, margin: "0 0 10px" }}>{children}</p>;
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

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000b0", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 18, width: "100%", maxWidth: 820, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px #000c" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #1f2937", flexShrink: 0, background: "linear-gradient(135deg, #0d1117, #111827)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>❓</div>
            <div>
              <h3 style={{ margin: 0, color: "#f9fafb", fontSize: 16, fontWeight: 800 }}>Manual de Usuario</h3>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 12 }}>MantenimientoApp — Guía completa</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "#1f2937", border: "none", color: "#9ca3af", cursor: "pointer", width: 30, height: 30, borderRadius: 8, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* SIDEBAR */}
          <div style={{ width: 180, borderRight: "1px solid #1f2937", padding: "16px 10px", flexShrink: 0, overflowY: "auto", background: "#070d1b" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ width: "100%", background: tab === t.id ? "#1f2937" : "none", border: "none", color: tab === t.id ? "#2563eb" : "#6b7280", borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontWeight: tab === t.id ? 700 : 500, fontSize: 13, fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", gap: 8, marginBottom: 2, textAlign: "left" }}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* CONTENT */}
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

            {tab === "inicio" && (
              <div>
                <H2>Bienvenido a MantenimientoApp 🔧</H2>
                <P>MantenimientoApp es un sistema profesional para gestionar reportes de mantenimiento, presupuestos, cronogramas de trabajo y el seguimiento completo hasta que el cliente da su visto bueno.</P>

                <H3>Tu perfil actual</H3>
                <div style={{ background: "#1f2937", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  {role === "superadmin" && <><div style={{ color: "#f59e0b", fontWeight: 800, fontSize: 15, marginBottom: 6 }}>⭐ Super Administrador</div><P>Tienes acceso total al sistema. Puedes ver y gestionar todos los reportes, clientes y usuarios sin restricciones.</P></>}
                  {role === "empresarial" && <><div style={{ color: "#a78bfa", fontWeight: 800, fontSize: 15, marginBottom: 6 }}>🏢 Usuario Empresarial</div><P>Puedes gestionar tu equipo de técnicos y ver todos sus reportes y clientes. Asigna técnicos desde el módulo "Mi Equipo".</P></>}
                  {role === "tecnico" && <><div style={{ color: "#60a5fa", fontWeight: 800, fontSize: 15, marginBottom: 6 }}>🔧 Técnico</div><P>Puedes crear y gestionar tus propios reportes, clientes y presupuestos. Solo verás la información que tú hayas creado o que te hayan asignado.</P></>}
                </div>

                <H3>Módulos disponibles</H3>
                <Li icon="📋">Reportes — Crea y gestiona reportes de mantenimiento con fotos y hallazgos</Li>
                <Li icon="🏢">Clientes — Registra y administra la información de tus clientes</Li>
                <Li icon="🔔">Alertas — Notificaciones automáticas de cada evento importante</Li>
                {role === "empresarial" && <Li icon="👥">Mi Equipo — Vincula técnicos a tu cuenta para ver sus reportes</Li>}
                {role === "superadmin" && <Li icon="👤">Usuarios — Gestión global de todos los usuarios del sistema</Li>}

                <Tip>Usa el botón ❓ en la barra superior para abrir este manual en cualquier momento.</Tip>
              </div>
            )}

            {tab === "reportes" && (
              <div>
                <H2>📋 Reportes de Mantenimiento</H2>
                <P>Los reportes son el corazón del sistema. Cada reporte documenta una inspección, sus hallazgos y el trabajo a realizar.</P>

                <H3>Crear un reporte</H3>
                <Step n="1" title="Clic en '+ Nuevo Reporte'">En la pantalla principal, presiona el botón azul en la esquina superior derecha.</Step>
                <Step n="2" title="Selecciona el cliente">Elige el cliente de la lista desplegable. Si no existe, créalo primero en el módulo Clientes.</Step>
                <Step n="3" title="Completa la información">Título, fecha de inspección, descripción general de los hallazgos{role !== "tecnico" ? " y técnico asignado" : ""}.</Step>
                <Step n="4" title="Agrega hallazgos">Describe cada problema encontrado y asígnale severidad: 🔴 Alta, 🟡 Media, 🟢 Baja.</Step>
                <Step n="5" title="Sube fotos de evidencia">Toca el botón + para agregar fotos desde tu dispositivo.</Step>
                <Step n="6" title="Guarda el reporte">El reporte se crea en estado Borrador listo para agregar el presupuesto.</Step>

                <H3>Estados del reporte</H3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  <Badge color="#94a3b8" bg="#1e293b">Borrador</Badge>
                  <Badge color="#60a5fa" bg="#1e3a5f">Enviado</Badge>
                  <Badge color="#34d399" bg="#064e3b">Autorizado</Badge>
                  <Badge color="#a78bfa" bg="#3b0764">Anticipo OK</Badge>
                  <Badge color="#fb923c" bg="#431407">En Proceso</Badge>
                  <Badge color="#22d3ee" bg="#083344">Completado</Badge>
                  <Badge color="#4ade80" bg="#14532d">Visto Bueno ✓</Badge>
                  <Badge color="#f87171" bg="#450a0a">Rechazado</Badge>
                </div>

                <H3>Buscar y filtrar</H3>
                <Li icon="🔍">Usa la barra de búsqueda para encontrar por folio, título o nombre del cliente.</Li>
                <Li icon="🔽">Filtra por estado usando el selector desplegable.</Li>

                <Tip>El folio se genera automáticamente (MNT-XXXX). Cada reporte queda registrado con quién lo creó y a quién se asignó.</Tip>
              </div>
            )}

            {tab === "presupuestos" && (
              <div>
                <H2>💰 Presupuestos</H2>
                <P>Una vez creado el reporte, el siguiente paso es generar el presupuesto con las partidas de trabajo a realizar.</P>

                <H3>Crear o editar el presupuesto</H3>
                <Step n="1" title="Abre el reporte">Haz clic en el reporte en la lista principal.</Step>
                <Step n="2" title="Ve a la pestaña Presupuesto">Dentro del reporte selecciona la pestaña 💰 Presupuesto.</Step>
                <Step n="3" title="Clic en 'Crear Presupuesto' o 'Editar'">Se abrirá el editor de partidas.</Step>
                <Step n="4" title="Agrega las partidas">Para cada concepto ingresa: descripción, unidad de medida, cantidad y precio unitario. El total se calcula automáticamente.</Step>
                <Step n="5" title="Define el % de anticipo">Mueve el control deslizante para establecer qué porcentaje se cobra por adelantado (10% a 80%).</Step>
                <Step n="6" title="Guarda el presupuesto">El sistema calcula subtotal, IVA 16% y total automáticamente.</Step>

                <H3>Exportar a PDF</H3>
                <Li icon="📄">Presiona el botón PDF en la barra de acciones del reporte.</Li>
                <Li icon="🖨">Se abrirá el documento en una nueva pestaña listo para imprimir o guardar.</Li>
                <Li icon="✍️">El PDF incluye espacio para firma de autorización del cliente.</Li>

                <H3>Pagos</H3>
                <Li icon="💳">Una vez autorizado el presupuesto, registra el anticipo con el botón "Registrar Anticipo".</Li>
                <Li icon="✅">Al dar visto bueno el cliente, se registra el pago final automáticamente.</Li>

                <Tip>El presupuesto solo se puede enviar al cliente cuando tiene al menos una partida guardada.</Tip>
              </div>
            )}

            {tab === "cronograma" && (
              <div>
                <H2>📅 Cronograma de Actividades</H2>
                <P>El cronograma permite planificar y dar seguimiento a cada tarea del trabajo de mantenimiento.</P>

                <H3>Crear el cronograma</H3>
                <Step n="1" title="Abre el reporte y ve a la pestaña Cronograma">Solo disponible después de que el presupuesto fue autorizado.</Step>
                <Step n="2" title="Clic en 'Crear Cronograma'">Se abrirá el editor de actividades.</Step>
                <Step n="3" title="Agrega las actividades">Para cada tarea define: nombre, fecha de inicio, fecha de fin y responsable.</Step>
                <Step n="4" title="Guarda el cronograma">Las actividades quedan ordenadas y listas para seguimiento.</Step>

                <H3>Actualizar el avance</H3>
                <Li icon="📊">Abre el cronograma y edita cada actividad para actualizar su porcentaje de avance.</Li>
                <Li icon="🔄">Cambia el estado de cada actividad: Pendiente → En Curso → Completada.</Li>
                <Li icon="📈">El avance general del proyecto se calcula automáticamente como promedio de todas las actividades.</Li>

                <Tip>Mantén el cronograma actualizado para que el usuario empresarial y el cliente puedan ver el progreso en tiempo real.</Tip>
              </div>
            )}

            {tab === "clientes" && (
              <div>
                <H2>🏢 Clientes</H2>
                <P>El módulo de clientes te permite registrar y administrar la información de contacto de quienes contratan tus servicios.</P>

                <H3>Registrar un cliente nuevo</H3>
                <Step n="1" title="Ve al módulo Clientes">Clic en 🏢 Clientes en el menú superior.</Step>
                <Step n="2" title="Clic en '+ Nuevo Cliente'">Se abrirá el formulario de registro.</Step>
                <Step n="3" title="Completa los datos">Razón social, RFC, correo, teléfono, dirección y persona de contacto.</Step>
                <Step n="4" title="Guarda">El cliente quedará disponible al crear reportes.</Step>

                <H3>Editar o eliminar</H3>
                <Li icon="✏️">Presiona el botón de editar para actualizar los datos del cliente.</Li>
                <Li icon="🗑">Solo puedes eliminar clientes que no tengan reportes asociados.</Li>

                <H3>Visibilidad</H3>
                <Li icon="🔒">Cada usuario solo ve sus propios clientes.</Li>
                {role === "empresarial" && <Li icon="👥">Como empresarial también ves los clientes de tus técnicos vinculados.</Li>}
                {role === "superadmin" && <Li icon="⭐">Como Super Admin ves todos los clientes del sistema.</Li>}

                <Tip>Crea el cliente antes de crear el reporte. Sin cliente no es posible guardar un reporte.</Tip>
              </div>
            )}

            {tab === "equipo" && role === "empresarial" && (
              <div>
                <H2>👥 Mi Equipo</H2>
                <P>El módulo Mi Equipo te permite vincular técnicos a tu cuenta para supervisar su trabajo y ver todos sus reportes.</P>

                <H3>Vincular un técnico</H3>
                <Step n="1" title="El técnico debe registrarse primero">Pídele que cree su cuenta en la app eligiendo el perfil 🔧 Técnico.</Step>
                <Step n="2" title="Ve a Mi Equipo">Clic en 👥 Mi Equipo en el menú superior.</Step>
                <Step n="3" title="Selecciona el técnico">En el selector desplegable aparecerán todos los técnicos registrados no vinculados aún.</Step>
                <Step n="4" title="Clic en Agregar">El técnico quedará vinculado a tu cuenta inmediatamente.</Step>

                <H3>Una vez vinculado</H3>
                <Li icon="📋">Verás todos sus reportes en tu lista de reportes.</Li>
                <Li icon="🏢">Verás todos sus clientes en tu módulo de clientes.</Li>
                <Li icon="👤">Al crear un reporte podrás asignárselo directamente.</Li>

                <H3>Desvincular un técnico</H3>
                <Li icon="🔓">Presiona el botón Desvincular en la tarjeta del técnico.</Li>
                <Li icon="⚠️">Sus reportes y clientes ya creados no se eliminan, solo dejarás de verlos.</Li>

                <Tip>Un técnico puede estar vinculado a varios usuarios empresariales al mismo tiempo.</Tip>
              </div>
            )}

            {tab === "flujo" && (
              <div>
                <H2>🔄 Flujo de Trabajo Completo</H2>
                <P>Este es el ciclo completo que sigue cada reporte desde que se crea hasta que el trabajo concluye.</P>

                <div style={{ position: "relative", paddingLeft: 28, marginTop: 8 }}>
                  {[
                    ["📋", "Borrador",     "#94a3b8", "Creas el reporte con hallazgos y fotos. Agregas las partidas del presupuesto."],
                    ["📤", "Enviado",      "#60a5fa", "Presionas 'Enviar al Cliente'. El reporte queda en espera de respuesta."],
                    ["✅", "Autorizado",   "#34d399", "El cliente aprueba el presupuesto. Puedes registrar el anticipo."],
                    ["💳", "Anticipo OK",  "#a78bfa", "Se registra el pago del anticipo acordado. Los trabajos están listos para iniciar."],
                    ["🔧", "En Proceso",   "#fb923c", "Los trabajos inician. Actualiza el cronograma con el avance real."],
                    ["🏁", "Completado",   "#22d3ee", "Todos los trabajos concluyen. El cliente debe revisar y dar su visto bueno."],
                    ["⭐", "Visto Bueno",  "#4ade80", "El cliente aprueba el trabajo. Se registra el pago final. ¡Proyecto cerrado!"],
                  ].map(([icon, estado, color, desc], i, arr) => (
                    <div key={estado} style={{ position: "relative", marginBottom: 20 }}>
                      <div style={{ position: "absolute", left: -28, top: 4, width: 20, height: 20, borderRadius: 99, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{icon}</div>
                      {i < arr.length - 1 && <div style={{ position: "absolute", left: -19, top: 24, width: 2, height: "calc(100% + 4px)", background: "#1f2937" }} />}
                      <div style={{ color, fontWeight: 800, fontSize: 13, marginBottom: 3 }}>{estado}</div>
                      <div style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.7 }}>{desc}</div>
                    </div>
                  ))}
                </div>

                <H3>Si el cliente rechaza</H3>
                <Li icon="❌">El reporte pasa a estado Rechazado.</Li>
                <Li icon="💬">Usa la pestaña Seguimiento para registrar notas sobre el motivo.</Li>
                <Li icon="✏️">Puedes editar el presupuesto y volver a enviarlo.</Li>

                <H3>Bitácora de seguimiento</H3>
                <Li icon="🕐">Cada cambio de estado queda registrado automáticamente con fecha y usuario.</Li>
                <Li icon="📝">Puedes agregar notas manuales en la pestaña Seguimiento de cualquier reporte.</Li>

                <Tip>El PDF del presupuesto se puede generar en cualquier momento desde la pestaña Presupuesto o el botón PDF en la barra de acciones.</Tip>
              </div>
            )}

          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#070d1b", flexShrink: 0 }}>
          <span style={{ color: "#4b5563", fontSize: 12 }}>MantenimientoApp — Manual de Usuario v1.0</span>
          <Btn variant="g" sm onClick={onClose}>Cerrar</Btn>
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

  const toast = useCallback((msg, type="success") => {
    const id = genId();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200);
  },[]);

  // ── LOAD DATA ───────────────────────────────────────────────────────────────
  async function loadAll(user) {
    setLoading(true);
    try {
      const [p, c, r] = await Promise.all([fetchProfiles(), fetchClients(user), fetchReports(user)]);
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

  const NAV = [
    {id:"reportes",      icon:"📋",label:"Reportes"},
    {id:"clientes",      icon:"🏢",label:"Clientes"},
    {id:"notificaciones",icon:"🔔",label:"Alertas",badge:unread},
    ...(currentUser.role==="empresarial"?[{id:"miequipo",icon:"👥",label:"Mi Equipo"}]:[]),
    ...(currentUser.role==="superadmin"?[
      {id:"usuarios",    icon:"👤",label:"Usuarios"},
      {id:"membresias",  icon:"💳",label:"Membresías"},
    ]:[]),
  ];

  return (
    <div style={{minHeight:"100vh",background:"#030712",fontFamily:"DM Sans, sans-serif",color:"#f9fafb"}}>
      <style>{`*{box-sizing:border-box}@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:none;opacity:1}}@keyframes spin{to{transform:rotate(360deg)}}input[type=range]{accent-color:#2563eb}select option{background:#1f2937}`}</style>
      <Toast toasts={toasts} />

      {/* HEADER */}
      <div style={{background:"#070d1b",borderBottom:"1px solid #111827",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"0 20px",display:"flex",alignItems:"center",gap:16,height:58}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginRight:16}}>
            <div style={{width:34,height:34,background:"linear-gradient(135deg,#2563eb,#1d4ed8)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🔧</div>
            <span style={{fontWeight:800,fontSize:15,color:"#f9fafb"}}>MantenimientoApp</span>
          </div>
          <div style={{display:"flex",gap:2}}>
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>setSection(n.id)} style={{background:section===n.id?"#1f2937":"none",border:"none",color:section===n.id?"#2563eb":"#6b7280",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"DM Sans,sans-serif",display:"flex",alignItems:"center",gap:5}}>
                {n.icon} {n.label}
                {n.badge>0&&<span style={{background:"#dc2626",color:"#fff",borderRadius:99,fontSize:10,fontWeight:800,padding:"0 5px",minWidth:16,height:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{n.badge}</span>}
              </button>
            ))}
          </div>
          <div style={{flex:1}}/>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Avatar initials={currentUser.avatar||mkAvatar(currentUser.name)} size={32} color="#2563eb" />
            <div style={{fontSize:13}}>
              <div style={{fontWeight:700,color:"#f9fafb"}}>{currentUser.name}</div>
              <div style={{fontSize:10,color:currentUser.role==="superadmin"?"#f59e0b":currentUser.role==="empresarial"?"#a78bfa":"#6b7280",fontWeight:["superadmin","empresarial"].includes(currentUser.role)?700:400}}>
                {currentUser.role==="superadmin"?"⭐ Super Admin":currentUser.role==="empresarial"?"🏢 Empresarial":"🔧 Técnico"}
              </div>
            </div>
            <button onClick={() => setShowHelp(true)} style={{background:"#1f2937",border:"none",color:"#9ca3af",cursor:"pointer",borderRadius:7,padding:"5px 10px",fontSize:12,fontFamily:"DM Sans,sans-serif"}} title="Ayuda">❓</button>
            <button onClick={handleLogout} style={{background:"#1f2937",border:"none",color:"#9ca3af",cursor:"pointer",borderRadius:7,padding:"5px 10px",fontSize:12,fontFamily:"DM Sans,sans-serif"}}>Salir</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",gap:16,color:"#6b7280"}}>
          <Spinner/> Cargando datos…
        </div>
      ) : (
        <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 20px"}}>
          {section==="clientes"     && <ClientsModule clients={clients} setClients={setClients} reports={reports} toast={toast} currentUser={currentUser} />}
          {section==="notificaciones"&&<NotificationsPanel notifs={notifs} setNotifs={setNotifs} currentUser={currentUser} onSelectReport={id=>{const r=reports.find(x=>x.id===id);if(r){setSelected(r);setSection("reportes");}}} />}
          {section==="miequipo"&&currentUser.role==="empresarial"&&<MiEquipoModule profiles={profiles} currentUser={currentUser} setCurrentUser={setCurrentUser} toast={toast} />}
          {section==="usuarios"&&currentUser.role==="superadmin"&&<UsersModule profiles={profiles} setProfiles={setProfiles} currentUser={currentUser} toast={toast} />}
          {section==="membresias"&&currentUser.role==="superadmin"&&<AdminUsersModule profiles={profiles} setProfiles={setProfiles} toast={toast} />}

          {section==="reportes"&&(
            <>
              {/* STATS */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
                {[
                  {l:"TOTAL REPORTES",v:stats.total,ic:"📋",c:"#2563eb"},
                  {l:"EN PROCESO",v:stats.activos,ic:"🔧",c:"#f59e0b"},
                  {l:"POR AUTORIZAR",v:stats.pendAuth,ic:"⏳",c:"#a78bfa"},
                  {l:"FACTURADO",v:fmtMXN(stats.facturado),ic:"💰",c:"#4ade80"},
                ].map(({l,v,ic,c})=>(
                  <div key={l} style={{...S.card,padding:"16px 18px",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:42,height:42,borderRadius:10,background:`${c}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{ic}</div>
                    <div><div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:.8}}>{l}</div><div style={{color:"#f9fafb",fontSize:20,fontWeight:800,marginTop:2}}>{v}</div></div>
                  </div>
                ))}
              </div>

              {/* FILTERS */}
              <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Buscar por folio, título o cliente…" style={{...S.input,flex:1,minWidth:200}} />
                <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{...S.input,width:"auto"}}>
                  <option value="todos">Todos los estados</option>
                  {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
                <Btn variant="p" onClick={()=>setShowNew(true)}>+ Nuevo Reporte</Btn>
              </div>

              {/* LIST */}
              {filtered.length===0?(
                <div style={{textAlign:"center",padding:"70px 0",color:"#4b5563"}}>
                  <div style={{fontSize:52,marginBottom:12}}>🗂️</div>
                  <div style={{fontSize:18,fontWeight:700,color:"#6b7280",marginBottom:6}}>Sin reportes</div>
                  <Btn variant="p" onClick={()=>setShowNew(true)}>Crear primer reporte</Btn>
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
                        <div style={{display:"flex",gap:12,alignItems:"center",flexShrink:0}}>
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

      {showHelp&&<HelpModal currentUser={currentUser} onClose={()=>setShowHelp(false)} />}
      {showNew&&<NewReportModal onClose={()=>setShowNew(false)} onSave={()=>{setShowNew(false);loadAll(currentUser);toast("Reporte creado","success");}} clients={clients} profiles={profiles} currentUser={currentUser} />}
      {selected&&<ReportDetail report={selected} clients={clients} profiles={profiles} currentUser={currentUser} onClose={()=>setSelected(null)} onRefresh={async()=>{const fresh=await fetchReports(currentUser);setReports(fresh);const r=fresh.find(x=>x.id===selected.id);if(r)setSelected(r);}} addNotif={handleAddNotif} toast={toast} />}

      {/* FOOTER */}
      <div style={{borderTop:"1px solid #0f172a",marginTop:40,padding:"18px 24px",textAlign:"center"}}>
        <p style={{margin:0,color:"#374151",fontSize:12,fontFamily:"DM Sans,sans-serif"}}>
          © {new Date().getFullYear()} <span style={{color:"#4b5563",fontWeight:700}}>DevSoftHeron JMEB</span> · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
