// ⚠️ PEGA AQUÍ LA URL DEL WEB APP DE GOOGLE APPS SCRIPT
// Spreadsheet vuelos/aerolineas/pasajeros: https://docs.google.com/spreadsheets/d/1toTzYwuBvz7vaXNVGtWyVSevHWOZdooEoKjR-3wKlnc
// Spreadsheet dotacion/planificacion: https://docs.google.com/spreadsheets/d/13oIthxggFMQP8l_4RHCyQ7XjvbVtMq0EMRaDNN2e2TA
// Ejemplo de URL: https://script.google.com/macros/s/XXXXXXX/exec
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzCZVLoVaBTMQFK-4WUd-87jFZpJQ6l3-kLSL_t7lrdFXuLaW9L_46AcQyEH_gPG4Bp_w/exec';

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

// ── Aerolíneas ─────────────────────────────────────────────
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
  syncAirlinesFromServer();
}
async function syncAirlinesFromServer() {
  try {
    const resp = await fetch(GAS_URL + '?action=getAirlines');
    const result = await resp.json();
    if (result.success && result.data) {
      const serverAirlines = result.data;
      const merged = globalAirlines.slice();
      serverAirlines.forEach(function(a) {
        var name = typeof a === 'object' ? (a.nombre || a.name || a.aerolínea || a.aerolinea || a.airline || '') : a;
        if (name && merged.indexOf(name) === -1) {
          merged.push(name);
        }
      });
      merged.sort();
      globalAirlines = merged;
      localStorage.setItem('cargo_airlines_offline', JSON.stringify(globalAirlines));
      renderFormAirlinesDropdown();
    }
  } catch(e) {
    console.warn('No se pudo sincronizar aerolíneas del servidor:', e);
  }
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
      <select class="pax-service" required>
        <option value="WCHR">WCHR</option><option value="WCHS">WCHS</option>
        <option value="WCHC">WCHC</option><option value="ORUGA">ORUGA</option>
        <option value="DEAF/BLND">DEAF/BLND</option><option value="UMNR">UMNR</option>
        <option value="OTRO">OTRO</option>
      </select>
    </div>
    <div class="pax-field" data-label="Estado del Pasajero">
      <select class="pax-status" onchange="calculateMetrics()" required>
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
  if (!window.supabaseClient) {
    const client = initSupabase();
    window.supabaseClient = client;
  }
  initTheme();
  applyThemeLabel();
  loadOfflineAirlines();
  addAgentField();
  addPassengerRow();
  // Inicializar fecha de dotación a hoy
  const today = new Date().toISOString().slice(0, 10);
  const dotacionFecha = document.getElementById('dotacionFecha');
  if (dotacionFecha) {
    dotacionFecha.value = today;
    updateDotacionLabel(today);
    loadDotacionData(today);
  }
});

// ── Dotación Diaria ──────────────────────────────────────────
function openDotacionPasteModal() {
  const modal = document.getElementById('dotacionPasteModal');
  if (modal) modal.classList.add('active');
}

function closeDotacionPasteModal() {
  const modal = document.getElementById('dotacionPasteModal');
  if (modal) modal.classList.remove('active');
  const area = document.getElementById('dotacionPasteArea');
  if (area) area.value = '';
}

function ingestDotacionPaste() {
  const area = document.getElementById('dotacionPasteArea');
  if (!area) return;
  const text = area.value.trim();
  if (!text) {
    alert('No hay datos para insertar.');
    return;
  }

  const rows = text.split('\n').map(line => line.split('\t'));
  const tbody = document.getElementById('dotacionTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  rows.forEach(function(row) {
    const tr = document.createElement('tr');
    row.forEach(function(cell) {
      const td = document.createElement('td');
      td.contentEditable = true;
      td.textContent = cell.trim();
      td.addEventListener('blur', saveDotacionData);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  closeDotacionPasteModal();
  saveDotacionData();
}

function addDotacionRow() {
  const tbody = document.getElementById('dotacionTableBody');
  if (!tbody) return;
  // Si hay un mensaje de "No hay dotación", limpiarlo primero
  const placeholder = tbody.querySelector('td[colspan]');
  if (placeholder) tbody.innerHTML = '';

  const tr = document.createElement('tr');
  for (let i = 0; i < 6; i++) {
    const td = document.createElement('td');
    td.contentEditable = true;
    td.addEventListener('blur', saveDotacionData);
    tr.appendChild(td);
  }
  tbody.appendChild(tr);
  saveDotacionData();
}

function saveDotacionData() {
  const date = document.getElementById('dotacionFecha')?.value;
  if (!date) return;
  const tbody = document.getElementById('dotacionTableBody');
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll('tr')).map(tr => {
    return Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
  });

  fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'saveDotacion', fecha: date, datos: rows })
  }).catch(function(err) {
    console.error('Error guardando dotación:', err);
  });
}

function loadDotacionData(date) {
  const tbody = document.getElementById('dotacionTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);font-style:italic;">Cargando dotación...</td></tr>';

  fetch(GAS_URL + '?action=getDotacion&fecha=' + encodeURIComponent(date))
    .then(function(r) { return r.json(); })
    .then(function(result) {
      if (result.success && result.data && result.data.length > 0) {
        const rows = result.data;
        tbody.innerHTML = '';
        rows.forEach(function(row) {
          const tr = document.createElement('tr');
          row.forEach(function(cell) {
            const td = document.createElement('td');
            td.contentEditable = true;
            td.textContent = cell;
            td.addEventListener('blur', saveDotacionData);
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);font-style:italic;">No hay dotación para esta fecha. Use "Pegar desde Excel" o "Agregar Agente" para comenzar.</td></tr>';
      }
    })
    .catch(function(err) {
      console.error('Error cargando dotación:', err);
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">Error al cargar dotación.</td></tr>';
    });
}

function changeDotacionDate(value) {
  loadDotacionData(value);
  updateDotacionLabel(value);
}

function goToToday() {
  const today = new Date().toISOString().slice(0, 10);
  const input = document.getElementById('dotacionFecha');
  if (input) {
    input.value = today;
    changeDotacionDate(today);
  }
}

function updateDotacionLabel(date) {
  const label = document.getElementById('dotacionFechaLabel');
  if (label && date) {
    const d = new Date(date + 'T00:00:00');
    label.textContent = d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}

function clearDotacionDiaria() {
  if (!confirm('¿Está seguro de que desea limpiar la dotación de este día?')) return;
  const date = document.getElementById('dotacionFecha')?.value;
  if (!date) return;

  fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'clearDotacion', fecha: date })
  }).catch(function(err) {
    console.error('Error limpiando dotación:', err);
  });

  const tbody = document.getElementById('dotacionTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);font-style:italic;">No hay dotación para esta fecha.</td></tr>';
}

function exportDotacionDiariaExcel() {
  const tbody = document.getElementById('dotacionTableBody');
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll('tr')).map(tr => {
    return Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
  });
  if (rows.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }
  let csv = 'Col1,Col2,Col3,Col4,Col5,Col6\n';
  rows.forEach(row => {
    csv += row.map(c => '"' + c.replace(/"/g, '""') + '"').join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dotacion_' + (document.getElementById('dotacionFecha')?.value || 'export') + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function onDotacionFileChange(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split('\n');
    const rows = lines.map(line => line.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
    const tbody = document.getElementById('dotacionTableBody');
    if (tbody) {
      tbody.innerHTML = '';
      rows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
          const td = document.createElement('td');
          td.contentEditable = true;
          td.textContent = cell;
          td.addEventListener('blur', saveDotacionData);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      saveDotacionData();
    }
  };
  reader.readAsText(file);
}

function refreshDotacionActual() {
  const enTurno = document.getElementById('enTurnoContainer');
  const proximos = document.getElementById('proximosContainer');
  if (enTurno) enTurno.innerHTML = '<div class="hint-box">No hay datos de turno disponibles.</div>';
  if (proximos) proximos.innerHTML = '<div class="hint-box">No hay datos próximos.</div>';
}

// Guardar automáticamente al editar celdas de la tabla de dotación
document.addEventListener('focusout', function(e) {
  if (e.target.tagName === 'TD' && e.target.closest('#dotacionTable')) {
    saveDotacionData();
  }
}, true);

// ── Reportes ─────────────────────────────────────────────
function generarResumenReporte() {
  const fecha = document.getElementById('repoFecha')?.value || '';
  const supOLA = document.getElementById('repoSupOLA')?.value || '';
  const supLATAM = document.getElementById('repoSupLATAM')?.value || '';
  const cdoOLA = document.getElementById('repoCdoOLA')?.value || '';
  const cdoLATAM = document.getElementById('repoCdoLATAM')?.value || '';
  const estado = document.getElementById('repoEstado')?.value || '';
  const op = document.getElementById('repoOp')?.value || '0';
  const sinTica = document.getElementById('repoSinTica')?.value || '0';
  const aus = document.getElementById('repoAus')?.value || '0';
  const ext = document.getElementById('repoExt')?.value || '0';
  const impacto = document.getElementById('repoImpacto')?.value || '';
  const fluidez = document.getElementById('repoFluidez')?.value || '';
  const equipos = document.getElementById('repoEquipos')?.value || '';
  const coord = document.getElementById('repoCoord')?.value || '';
  const incidencias = document.getElementById('repoIncidencias')?.value || '';
  const disciplina = document.getElementById('repoDisciplina')?.value || '';
  const pendientes = document.getElementById('repoPendientes')?.value || '';

  let txt = '📋 CIERRE DE TURNO: ' + fecha + '\n';
  txt += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  txt += '👥 EQUIPO DE TURNO\n';
  txt += '• Supervisor OLA: ' + (supOLA || 'N/A') + '\n';
  txt += '• Supervisor LATAM: ' + (supLATAM || 'N/A') + '\n';
  txt += '• CDO OLA: ' + (cdoOLA || 'N/A') + '\n';
  txt += '• CDO LATAM: ' + (cdoLATAM || 'N/A') + '\n\n';

  txt += '🟢 1. ESTADO GENERAL\n';
  txt += 'Cambio de turno en operación: ' + (estado || 'N/A') + '\n\n';

  txt += '👥 2. ASISTENCIA\n';
  txt += '• Operativos: ' + op + '\n';
  txt += '• Sin TICA: ' + sinTica + '\n';
  txt += '• Ausencias: ' + aus + '\n';
  txt += '• Extensiones: ' + ext + '\n\n';

  txt += '⚠️ 3. IMPACTO OPERACIONAL\n';
  txt += impacto || 'N/A';
  txt += '\n\n';

  txt += '✈️ 4. OPERACIÓN (OBSERVACIONES)\n';
  txt += '• Fluidez de atención: ' + (fluidez || 'N/A') + '\n';
  txt += '• Equipos: ' + (equipos || 'N/A') + '\n';
  txt += '• Coordinación: ' + (coord || 'N/A') + '\n\n';

  txt += '📌 6. INCIDENCIAS\n';
  txt += incidencias || 'N/A';
  txt += '\n\n';

  txt += '👔 7. DISCIPLINA\n';
  txt += disciplina || 'N/A';
  txt += '\n\n';

  txt += '⏳ 8. PENDIENTES DEL TURNO\n';
  txt += pendientes || 'Ninguno.';
  txt += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  txt += '🛎️ LIST@ PARA PRÓXIMAS ASIGNACIONES!';

  const textArea = document.getElementById('reportesTextArea');
  const modal = document.getElementById('reportesModal');
  if (textArea) textArea.value = txt;
  if (modal) modal.classList.add('active');
}

function closeReportesModal() {
  const modal = document.getElementById('reportesModal');
  if (modal) modal.classList.remove('active');
}

function copyReporteText() {
  const ta = document.getElementById('reportesTextArea');
  if (!ta) return;
  ta.select();
  navigator.clipboard.writeText(ta.value).then(function() {
    alert('Reporte copiado al portapapeles.');
  }).catch(function() {
    document.execCommand('copy');
    alert('Reporte copiado al portapapeles.');
  });
}

function toggleRepoExtDetalle() {
  const ext = document.getElementById('repoExt');
  const detalle = document.getElementById('repoExtDetalle');
  if (!ext || !detalle) return;
  const count = parseInt(ext.value) || 0;
  detalle.style.display = count > 0 ? 'block' : 'none';
  if (count > 0) {
    const list = document.getElementById('repoExtList');
    if (list && list.children.length === 0) {
      for (let i = 0; i < count; i++) {
        addRepoExtRow();
      }
    }
  }
}

function addRepoExtRow() {
  const list = document.getElementById('repoExtList');
  if (!list) return;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';
  div.innerHTML =
    '<input type="text" placeholder="Agente" style="flex:1;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--input-bg);color:var(--text);">' +
    '<input type="text" placeholder="HHEE" style="width:100px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--input-bg);color:var(--text);">' +
    '<button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✕</button>';
  list.appendChild(div);
}

function cargarDatosReportes() {
  const fecha = document.getElementById('repoFecha')?.value;
  if (!fecha) return;

  const ausentesList = document.getElementById('repoAusentesList');
  const sinTicaList = document.getElementById('repoSinTicaList');
  if (ausentesList) ausentesList.textContent = 'Cargando...';
  if (sinTicaList) sinTicaList.textContent = 'Cargando...';

  fetch(GAS_URL + '?action=getAusentes&fecha=' + encodeURIComponent(fecha))
    .then(function(r) { return r.json(); })
    .then(function(result) {
      const data = result.success ? (result.data || []) : [];
      if (ausentesList) {
        ausentesList.textContent = data.length > 0
          ? data.join(', ')
          : 'Sin ausencias registradas.';
      }
    })
    .catch(function() {
      if (ausentesList) ausentesList.textContent = 'Sin datos disponibles.';
    });

  fetch(GAS_URL + '?action=getSinTica&fecha=' + encodeURIComponent(fecha))
    .then(function(r) { return r.json(); })
    .then(function(result) {
      const data = result.success ? (result.data || []) : [];
      if (sinTicaList) {
        sinTicaList.textContent = data.length > 0
          ? data.join(', ')
          : 'Sin registros SIN TICA.';
      }
    })
    .catch(function() {
      if (sinTicaList) sinTicaList.textContent = 'Sin datos disponibles.';
    });
}

function guardarReporte() {
  const fecha = document.getElementById('repoFecha')?.value;
  if (!fecha) {
    alert('Seleccione una fecha.');
    return;
  }

  const reporte = {
    fecha: fecha,
    supOLA: document.getElementById('repoSupOLA')?.value || '',
    supLATAM: document.getElementById('repoSupLATAM')?.value || '',
    cdoOLA: document.getElementById('repoCdoOLA')?.value || '',
    cdoLATAM: document.getElementById('repoCdoLATAM')?.value || '',
    estado: document.getElementById('repoEstado')?.value || '',
    op: document.getElementById('repoOp')?.value || '0',
    sinTica: document.getElementById('repoSinTica')?.value || '0',
    aus: document.getElementById('repoAus')?.value || '0',
    ext: document.getElementById('repoExt')?.value || '0',
    impacto: document.getElementById('repoImpacto')?.value || '',
    fluidez: document.getElementById('repoFluidez')?.value || '',
    equipos: document.getElementById('repoEquipos')?.value || '',
    coord: document.getElementById('repoCoord')?.value || '',
    incidencias: document.getElementById('repoIncidencias')?.value || '',
    disciplina: document.getElementById('repoDisciplina')?.value || '',
    pendientes: document.getElementById('repoPendientes')?.value || ''
  };

  fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'saveReporte', reporte: reporte })
  })
  .then(function() {
    alert('Reporte guardado exitosamente.');
    cargarReportes();
  })
  .catch(function(err) {
    console.error('Error guardando reporte:', err);
    alert('Error al guardar el reporte.');
  });
}

function cargarReportes() {
  const container = document.getElementById('reportesListContainer');
  if (!container) return;
  container.innerHTML = '<div style="padding:20px;color:var(--text-muted);">Cargando reportes...</div>';

  fetch(GAS_URL + '?action=getReportes')
    .then(function(r) { return r.json(); })
    .then(function(result) {
      const data = result.success ? (result.data || []) : [];
      if (data.length === 0) {
        container.innerHTML = '<div style="padding:20px;color:var(--text-muted);">No hay reportes guardados.</div>';
        return;
      }
      container.innerHTML = data.map(function(rep) {
        return '<div class="list-item" style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid var(--border);">' +
          '<div><strong>📅 ' + escapeHtml(rep.fecha || '') + '</strong>' +
          '<br><span style="font-size:0.85em;color:var(--text-muted);">Estado: ' + escapeHtml(rep.estado || 'N/A') + '</span>' +
          '<br><span style="font-size:0.85em;color:var(--text-muted);">Sup OLA: ' + escapeHtml(rep.supOLA || 'N/A') + ' | Sup LATAM: ' + escapeHtml(rep.supLATAM || 'N/A') + '</span></div>' +
          '<button class="btn btn-ghost btn-sm" onclick="verReporte(' + JSON.stringify(JSON.stringify(rep)).replace(/"/g, '&quot;') + ')">👁️ Ver</button>' +
          '</div>';
      }).join('');
    })
    .catch(function(err) {
      console.error('Error cargando reportes:', err);
      container.innerHTML = '<div style="padding:20px;color:var(--text-muted);">Error al cargar reportes.</div>';
    });
}

function verReporte(repStr) {
  try {
    const rep = typeof repStr === 'string' ? JSON.parse(repStr) : repStr;
    let txt = '📋 CIERRE DE TURNO: ' + (rep.fecha || '') + '\n';
    txt += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    txt += '👥 EQUIPO DE TURNO\n';
    txt += '• Supervisor OLA: ' + (rep.supOLA || 'N/A') + '\n';
    txt += '• Supervisor LATAM: ' + (rep.supLATAM || 'N/A') + '\n';
    txt += '• CDO OLA: ' + (rep.cdoOLA || 'N/A') + '\n';
    txt += '• CDO LATAM: ' + (rep.cdoLATAM || 'N/A') + '\n\n';
    txt += '🟢 1. ESTADO GENERAL\n';
    txt += 'Cambio de turno en operación: ' + (rep.estado || 'N/A') + '\n\n';
    txt += '👥 2. ASISTENCIA\n';
    txt += '• Operativos: ' + (rep.op || '0') + '\n';
    txt += '• Sin TICA: ' + (rep.sinTica || '0') + '\n';
    txt += '• Ausencias: ' + (rep.aus || '0') + '\n';
    txt += '• Extensiones: ' + (rep.ext || '0') + '\n\n';
    txt += '⚠️ 3. IMPACTO OPERACIONAL\n';
    txt += (rep.impacto || 'N/A') + '\n\n';
    txt += '✈️ 4. OPERACIÓN (OBSERVACIONES)\n';
    txt += '• Fluidez de atención: ' + (rep.fluidez || 'N/A') + '\n';
    txt += '• Equipos: ' + (rep.equipos || 'N/A') + '\n';
    txt += '• Coordinación: ' + (rep.coord || 'N/A') + '\n\n';
    txt += '📌 6. INCIDENCIAS\n';
    txt += (rep.incidencias || 'N/A') + '\n\n';
    txt += '👔 7. DISCIPLINA\n';
    txt += (rep.disciplina || 'N/A') + '\n\n';
    txt += '⏳ 8. PENDIENTES DEL TURNO\n';
    txt += (rep.pendientes || 'Ninguno.') + '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

    const textArea = document.getElementById('reportesTextArea');
    const modal = document.getElementById('reportesModal');
    if (textArea) textArea.value = txt;
    if (modal) modal.classList.add('active');
  } catch(e) {
    console.error('Error mostrando reporte:', e);
  }
}

window.verReporte = verReporte;
