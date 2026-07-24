// ⚠️ PEGA AQUÍ LA URL DEL WEB APP DE GOOGLE APPS SCRIPT
// Spreadsheet destino: https://docs.google.com/spreadsheets/d/1toTzYwuBvz7vaXNVGtWyVSevHWOZdooEoKjR-3wKlnc
// Ejemplo de URL: https://script.google.com/macros/s/XXXXXXX/exec
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzheyREUEN7VzpUsbCEpxYTC4RNOGNMTgzXHqFx5e7Hw20WsmMcRLU4RvFlu7evgAUomg/exec';

function initSupabase() {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase client not loaded');
    return null;
  }
  return window.supabase.createClient(
    'https://mfuamjwuqtwrboyofiaq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdWFtand1cXR3cmJveW9maWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NDgwNjUsImV4cCI6MjEwMDQyNDA2NX0.bsBC8FwUMoi4gjvLehaooEmsFGoy1Jo_BOjTtxbBIAM',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btns = document.querySelectorAll('#themeToggleBtn');
  btns.forEach(btn => {
    btn.textContent = theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro';
  });
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('show');
}

function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.remove('show');
}

function togglePmrFrame() {
  const container = document.getElementById('pmrFrameContainer');
  const iframe = document.getElementById('pmrFrame');
  if (!container || !iframe) return;
  const isVisible = container.style.display !== 'none';
  container.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) {
    iframe.src = iframe.src;
  }
}

// ── Aerolíneas Offline ───────────────────────────────────────
const OFFLINE_AIRLINES = ["DELTA","AIRFRANCE","KLM","AIRCANADA","AVIANCA","AEROLINEAS ARGENTINAS","ARAJET","BOA","BRITISH","COPA","IBERIA","LEVEL","QANTAS"];
let globalAirlines = [];
function loadOfflineAirlines() {
  const saved = localStorage.getItem('cargo_airlines_offline');
  if (saved) {
    try { globalAirlines = JSON.parse(saved); } catch(e) { globalAirlines = [...OFFLINE_AIRLINES]; }
  } else {
    globalAirlines = [...OFFLINE_AIRLINES];
  }
  renderFormAirlinesDropdown();
}
function renderFormAirlinesDropdown() {
  const select = document.getElementById('aerolinea');
  if (!select) return;
  const previaSeleccion = select.value;
  select.innerHTML = '<option value="">-- Seleccione una Aerolínea --</option>';
  [...globalAirlines].sort().forEach(air => {
    const opt = document.createElement('option');
    opt.value = air;
    opt.textContent = air;
    select.appendChild(opt);
  });
  if (globalAirlines.includes(previaSeleccion)) select.value = previaSeleccion;
}

// ── Agentes ────────────────────────────────────────────────
function addAgentField() {
  const container = document.getElementById('agents-list-container');
  const div = document.createElement('div');
  div.className = 'agent-entry';
  div.innerHTML = `
    <input type="text" class="agent-input-name" placeholder="Nombre Agente" oninput="syncAgentDropdowns()" required style="flex:1;text-transform:uppercase;">
    <button type="button" class="btn btn-danger btn-sm" onclick="removeAgentField(this)">✕</button>`;
  container.appendChild(div);
  syncAgentDropdowns();
}
function removeAgentField(btn) {
  const container = document.getElementById('agents-list-container');
  if (container.children.length > 1) {
    btn.parentElement.remove();
    syncAgentDropdowns();
  } else {
    alert("Debe registrar al menos un agente para el vuelo.");
  }
}
function syncAgentDropdowns() {
  let agents = [];
  document.querySelectorAll('.agent-input-name').forEach(inp => {
    const v = inp.value.trim().toUpperCase();
    if (v && !agents.includes(v)) agents.push(v);
  });
  document.querySelectorAll('.pax-agent-select').forEach(select => {
    const saved = select.value;
    select.innerHTML = '<option value="">-- Seleccionar Agente --</option>';
    agents.forEach(a => {
      const o = document.createElement('option');
      o.value = a;
      o.textContent = a;
      select.appendChild(o);
    });
    if (agents.includes(saved)) select.value = saved;
  });
}

// ── Pasajeros ──────────────────────────────────────────────
function addPassengerRow() {
  const container = document.getElementById('pax-container');
  const row = document.createElement('div');
  row.className = 'pax-row';
  row.innerHTML = `
    <div class="pax-field pax-field-name" data-label="Nombre Completo">
      <input type="text" class="pax-name" placeholder="Nombre completo" required>
    </div>
    <div class="pax-field" data-label="Asistencia">
      <select class="pax-service">
        <option value="WCHR">WCHR</option><option value="WCHS">WCHS</option>
        <option value="WCHC">WCHC</option><option value="ORUGA">ORUGA</option>
        <option value="DEAF/BLND">DEAF/BLND</option><option value="UMNR">UMNR</option>
        <option value="OTRO">OTRO</option>
      </select>
    </div>
    <div class="pax-field" data-label="Estado del Pasajero">
      <select class="pax-status" onchange="calculateMetrics()">
        <option value="PAX ASISTIDO">PAX ASISTIDO</option>
        <option value="NO ASISTIDO">NO ASISTIDO</option>
        <option value="NO CONTACTA">NO CONTACTA</option>
        <option value="NO MANIFESTADO">NO MANIFESTADO</option>
        <option value="NO REQUIERE ASISTENCIA">NO REQUIERE ASISTENCIA</option>
      </select>
    </div>
    <div class="pax-field" data-label="Atendido Por">
      <select class="pax-agent-select" required><option value="">-- Seleccionar Agente --</option></select>
    </div>
    <div class="pax-field pax-field-action">
      <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.pax-row').remove(); calculateMetrics();">✕</button>
    </div>`;
  container.appendChild(row);
  syncAgentDropdowns();
  calculateMetrics();
}

function calculateMetrics() {
  const rows = document.querySelectorAll('.pax-row');
  let asistidos = 0, noManif = 0, otros = 0;
  rows.forEach(row => {
    const s = row.querySelector('.pax-status').value;
    if (s === "PAX ASISTIDO") asistidos++;
    else if (s === "NO MANIFESTADO") noManif++;
    else otros++;
  });
  const totalEl = document.getElementById('count-total');
  const asistidosEl = document.getElementById('count-asistidos');
  const nomanifEl = document.getElementById('count-nomanif');
  const otrosEl = document.getElementById('count-otros');
  if (totalEl) totalEl.textContent = rows.length;
  if (asistidosEl) asistidosEl.textContent = asistidos;
  if (nomanifEl) nomanifEl.textContent = noManif;
  if (otrosEl) otrosEl.textContent = otros;
}

// ── Formulario ─────────────────────────────────────────────
function generateConsolidadoTexto(payload) {
  const totalPax  = payload.pasajeros.length;
  const asistidos = payload.pasajeros.filter(p => p.estado === "PAX ASISTIDO");
  const noManif   = payload.pasajeros.filter(p => p.estado === "NO MANIFESTADO");
  const noReq     = payload.pasajeros.filter(p => p.estado === "NO REQUIERE ASISTENCIA");
  let txt = `✈️${payload.tipoOperacion} Finalizado: ${payload.vuelo}\n`;
  txt += `⏰ETA/ETD: ${payload.etaEtd}\n🚪Puerta : ${payload.puerta}\n`;
  txt += `🕧Hora de Inicio : ${payload.horaInicio}\n🕧Hora de Termino : ${payload.horaTermino}\n`;
  txt += `🧑Asistencias: # de asistencias ${asistidos.length} / ${totalPax}\nPAX (LISTADO DE PASAJEROS):\n`;
  if (!payload.pasajeros.length) txt += "SIN PASAJEROS REGISTRADOS\n";
  else payload.pasajeros.forEach((p,i) => { txt += `${i+1}.- ${p.nombre} - ${p.asistencia} (${p.estado}) - ATENDIDO POR: ${p.agente||'SIN ASIGNAR'}\n`; });

  if (noManif.length > 0) {
    txt += `👤No manifestados: # de asistencias ${noManif.length}\n-(LISTADO DE PAX) NO MANIFESTADOS-\n`;
    noManif.forEach((p,i) => { txt += `${i+1}.- ${p.nombre} - ${p.asistencia} - ATENDIDO POR: ${p.agente||'SIN ASIGNAR'}\n`; });
    txt += "❌ NO REQUIEREN ASISTENCIA\n";
    if (noReq.length) noReq.forEach((p,i) => { txt += `${i+1}.- ${p.nombre} - ${p.asistencia} - ATENDIDO POR: ${p.agente||'SIN ASIGNAR'}\n`; });
    else txt += "SIN PAX EN ESTA CATEGORÍA\n";
  } else {
    txt += "❌ NO REQUIEREN ASISTENCIA\n";
    if (noReq.length) noReq.forEach((p,i) => { txt += `${i+1}.- ${p.nombre} - ${p.asistencia} - ATENDIDO POR: ${p.agente||'SIN ASIGNAR'}\n`; });
    else txt += "-SIN PAX-\n";
  }

  txt += `\n🛎️ LIST@ PARA PROXIMAS ASIGNACIONES!`;
  return txt;
}

async function sendFormToServer() {
  const aerolineaEl = document.getElementById('aerolinea');
  const vueloEl = document.getElementById('vuelo');
  if (!aerolineaEl || !vueloEl) { alert('No se encontraron los campos del formulario.'); return; }
  const aerolinea = aerolineaEl.value;
  const vuelo = vueloEl.value.trim().toUpperCase();
  if (!aerolinea || !vuelo) { alert("Por favor complete los campos obligatorios del vuelo."); return; }
  let agentesArray = [];
  document.querySelectorAll('.agent-input-name').forEach(inp => { const v = inp.value.trim().toUpperCase(); if (v) agentesArray.push(v); });
  if (!agentesArray.length) { alert("Por favor ingrese al menos un agente."); return; }
  let validado = true, listaPasajeros = [], totalAsist = 0;
  document.querySelectorAll('.pax-row').forEach(row => {
    const nombre = row.querySelector('.pax-name').value.trim().toUpperCase();
    const service = row.querySelector('.pax-service').value;
    const status  = row.querySelector('.pax-status').value;
    const agente  = row.querySelector('.pax-agent-select').value;
    if (nombre) { if (!agente) validado = false; listaPasajeros.push({ nombre, asistencia: service, estado: status, agente }); if (status === "PAX ASISTIDO") totalAsist++; }
  });
  if (!validado) { alert("Por favor, asigne qué agente atendió a cada pasajero."); return; }

  const btn = document.getElementById('btn-submit');
  if (btn) { btn.textContent = "Guardando..."; btn.disabled = true; }

  const payload = {
    tipoOperacion: document.getElementById('tipoOperacion').value,
    aerolinea,
    vuelo,
    etaEtd: document.getElementById('etaEtd').value,
    puerta: document.getElementById('puerta').value.toUpperCase(),
    horaInicio: document.getElementById('horaInicio').value,
    horaTermino: document.getElementById('horaTermino').value,
    totalAsistencias: totalAsist,
    agentes: agentesArray.join(" - "),
    pasajeros: listaPasajeros,
    registros: []
  };

  const now = new Date();
  const fechaRegistro = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaRegistro = now.toTimeString().slice(0, 8);

  payload.registros = listaPasajeros.map(p => ({
    fechaRegistro,
    horaRegistro,
    operacion: payload.tipoOperacion,
    aerolinea: payload.aerolinea,
    vuelo: payload.vuelo,
    etaEtd: payload.etaEtd,
    puerta: payload.puerta,
    horaInicio: payload.horaInicio,
    horaTermino: payload.horaTermino,
    totalAsistencias: payload.totalAsistencias,
    nombrePasajero: p.nombre,
    atendidoPor: p.agente || '',
    asistencia: p.asistencia,
    estadoPasajero: p.estado
  }));

  let modalText = "";
  if (!GAS_URL) {
    modalText = "Error: Debes configurar la URL del Google Apps Script en js/app.js (const GAS_URL).";
  } else {
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registros: payload.registros })
      });
      modalText = generateConsolidadoTexto(payload);
    } catch (e) {
      modalText = "Error de conexión al guardar: " + e.message;
    }
  }
  try {
    const consolidadoTextArea = document.getElementById('consolidadoTextArea');
    if (consolidadoTextArea) consolidadoTextArea.value = modalText;
    const modal = document.getElementById('consolidadoModal');
    if (modal) modal.classList.add('active');
  } catch(e) {
    alert(modalText);
  }
  try {
    const mainForm = document.getElementById('mainForm');
    if (mainForm) mainForm.reset();
    const paxContainer = document.getElementById('pax-container');
    if (paxContainer) paxContainer.innerHTML = "";
    const agentsContainer = document.getElementById('agents-list-container');
    if (agentsContainer) agentsContainer.innerHTML = "";
    if (typeof addAgentField === 'function') addAgentField();
    if (typeof addPassengerRow === 'function') addPassengerRow();
  } catch(e) {
    console.error('Error al reiniciar formulario:', e);
  }
  if (btn) { btn.textContent = "💾 Guardar Registro General"; btn.disabled = false; }
}

function copyConsolidadoText() {
  const ta = document.getElementById('consolidadoTextArea');
  ta.select();
  navigator.clipboard.writeText(ta.value).then(() => { alert("¡Reporte copiado con éxito!"); });
}
function closeModal() {
  const modal = document.getElementById('consolidadoModal');
  if (modal) modal.classList.remove('active');
}

function applyThemeLabel() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const btns = document.querySelectorAll('#themeToggleBtn');
  btns.forEach(btn => { btn.textContent = isDark ? '☀️ Claro' : '🌙 Oscuro'; });
}

document.addEventListener('DOMContentLoaded', () => {
  const client = initSupabase();
  window.supabaseClient = client;
  initTheme();
  applyThemeLabel();
  loadOfflineAirlines();
  addAgentField();
  addPassengerRow();
});
