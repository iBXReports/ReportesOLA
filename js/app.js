// ⚠️ PEGA AQUÍ LA URL DEL WEB APP DE GOOGLE APPS SCRIPT
// Spreadsheet vuelos/aerolineas/pasajeros: https://docs.google.com/spreadsheets/d/1toTzYwuBvz7vaXNVGtWyVSevHWOZdooEoKjR-3wKlnc
// Spreadsheet dotacion/planificacion: https://docs.google.com/spreadsheets/d/13oIthxggFMQP8l_4RHCyQ7XjvbVtMq0EMRaDNN2e2TA
// Ejemplo de URL: https://script.google.com/macros/s/XXXXXXX/exec
const GAS_URL = 'https://script.google.com/macros/s/AKfycbw2a2oyiPnQCzzq_--E4GRWFV7ZGPvcbaeVeckvo3BvVsvvSQlke-qDufwrLQhfZ_7lkA/exec';

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
const OFFLINE_AIRLINES = ["DELTA","AIRFRANCE","KLM","AIRCANADA","AVIANCA","AEROLINEAS ARGENTINAS","AEROMEXICO","ARAJET","BOA","BRITISH","COPA","IBERIA","JETSMART","LEVEL","QANTAS"];
let globalAirlines = [];
function loadOfflineAirlines() {
  localStorage.removeItem('cargo_airlines_offline');
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
  // Cargar datos de control agentes al iniciar
  setTimeout(function() {
    loadControlAgentesTurno();
  }, 500);
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

// ── CONTROL AGENTES ──────────────────────────────────────
let ctrlAgentes = [];
let ctrlVuelos = [];
let ctrlAsignaciones = [];
let ctrlTimers = [];
let ctrlFecha = new Date().toISOString().slice(0, 10);
let ctrlTimerInterval = null;

function parseTurnoM(turnoStr) {
  if (!turnoStr || turnoStr.length < 5) return { entrada: '00:00', salida: '23:59', entradaAMPM: '12:00 AM', salidaAMPM: '11:59 PM', tipo: 'M', duracion: 24, raw: turnoStr || '' };
  const tipo = turnoStr.charAt(0).toUpperCase();
  const s = turnoStr.replace(/[^0-9]/g, '');
  if (s.length < 4) return { entrada: '00:00', salida: '23:59', entradaAMPM: '12:00 AM', salidaAMPM: '11:59 PM', tipo: tipo, duracion: 24, raw: turnoStr };

  const hhE = parseInt(s.substring(0, 2), 10);
  const hhS = parseInt(s.substring(2, 4), 10);

  const entrada = String(hhE).padStart(2, '0') + ':00';
  const salida = String(hhS).padStart(2, '0') + ':00';

  function fmt(h) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return String(h12).padStart(2, '0') + ':00 ' + ampm;
  }

  let duracion;
  if (hhS > hhE) {
    duracion = hhS - hhE;
  } else {
    duracion = (24 - hhE) + hhS;
  }

  return {
    entrada: entrada,
    salida: salida,
    entradaAMPM: fmt(hhE),
    salidaAMPM: fmt(hhS),
    tipo: tipo,
    duracion: duracion,
    raw: turnoStr
  };
}

function openPasteAgentesModal() {
  const modal = document.getElementById('pasteAgentesModal');
  if (modal) {
    modal.classList.add('active');
    const area = document.getElementById('pasteAgentesArea');
    if (area) area.focus();
  }
}

function closePasteAgentesModal() {
  const modal = document.getElementById('pasteAgentesModal');
  if (modal) modal.classList.remove('active');
}

function ingestAgentesPaste() {
  const area = document.getElementById('pasteAgentesArea');
  if (!area) return;
  const text = area.value.trim();
  if (!text) { alert('No hay datos para importar.'); return; }

  const lines = text.split('\n');
  const newAgentes = lines.map(function(line) {
    const parts = line.split('\t').map(function(p) { return p.trim(); });
    const rut = parts[0] || '';
    const nombre = parts[1] || '';
    const rol = parts[2] || '';
    const turnoStr = parts[3] || '';
    const turno = parseTurnoM(turnoStr);
    const esLATAM = rol.toUpperCase().includes('LATAM') || rol.toUpperCase() === 'LATAM';
    const esOLA = rol.toUpperCase().includes('OLA') || rol.toUpperCase() === 'OLA' || rol.toUpperCase().includes('CARRO');
    return {
      rut: rut,
      nombre: nombre,
      rol: rol,
      turno: turno,
      estado: 'presente',
      esLATAM: esLATAM,
      esOLA: esOLA,
      esSupervisor: false,
      vueloAsignado: null,
      tipoAsignacion: null,
      colacionTimer: null,
      libreTimer: null,
      horasExtendido: 0
    };
  }).filter(function(ag) { return ag.rut && ag.nombre; });

  if (newAgentes.length === 0) {
    alert('No se encontraron agentes válidos. Verifica el formato (RUT, Nombre, Rol, Turno).');
    return;
  }

  ctrlAgentes = newAgentes;
  closePasteAgentesModal();
  if (area) area.value = '';
  renderCtrlResumen();
  renderAgentesTabla();
  renderVuelosTabla();
  saveAgentesTurnoToServer();
  startTimerLoop();
}

function serverPost(payload, onSuccess, onError) {
  var bodyStr = JSON.stringify(payload);
  fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: bodyStr
  })
  .then(function() {
    console.log('POST enviado a GAS:', payload.action);
    if (onSuccess) onSuccess();
  })
  .catch(function(err) {
    console.error('Error enviando a GAS:', err);
    if (onError) onError(err.toString());
    else alert('No se pudo conectar con el servidor. Verifica la URL del GAS en js/app.js (const GAS_URL).');
  });
}

function saveAgentesTurnoToServer() {
  try {
    localStorage.setItem('ctrl_agentes_' + ctrlFecha, JSON.stringify(ctrlAgentes));
  } catch(e) {}
  serverPost({
    action: 'saveAgentesTurno',
    fecha: ctrlFecha,
    agentes: ctrlAgentes
  }, function() {
    console.log('✓ Agentes guardados en servidor (' + ctrlAgentes.length + ' agentes, fecha=' + ctrlFecha + ')');
  });
}

function saveVueloTurnoToServer(vuelo) {
  try {
    var existing = [];
    try { existing = JSON.parse(localStorage.getItem('ctrl_vuelos_' + ctrlFecha) || '[]'); } catch(e) {}
    var idx = -1;
    for (var i = 0; i < existing.length; i++) {
      if (existing[i].id === vuelo.id) { idx = i; break; }
    }
    if (idx >= 0) existing[idx] = vuelo;
    else existing.push(vuelo);
    localStorage.setItem('ctrl_vuelos_' + ctrlFecha, JSON.stringify(existing));
  } catch(e) {}
  serverPost({
    action: 'saveVueloTurno',
    vuelo: vuelo
  }, function() {
    console.log('✓ Vuelo guardado en servidor');
  });
}

function saveAsignacionToServer(asig) {
  try {
    var existing = [];
    try { existing = JSON.parse(localStorage.getItem('ctrl_asignaciones_' + ctrlFecha) || '[]'); } catch(e) {}
    existing.push(asig);
    localStorage.setItem('ctrl_asignaciones_' + ctrlFecha, JSON.stringify(existing));
  } catch(e) {}
  serverPost({
    action: 'saveAsignacion',
    asignacion: asig
  }, function() {
    console.log('✓ Asignación guardada en servidor');
  });
}

function clearControlTurno() {
  if (!confirm('¿Está seguro de que desea limpiar todo el turno? Se borrarán agentes, vuelos y asignaciones.')) return;
  try {
    localStorage.removeItem('ctrl_agentes_' + ctrlFecha);
    localStorage.removeItem('ctrl_vuelos_' + ctrlFecha);
    localStorage.removeItem('ctrl_asignaciones_' + ctrlFecha);
  } catch(e) {}
  serverPost({ action: 'clearTurno', fecha: ctrlFecha }, function() {
    ctrlAgentes = [];
    ctrlVuelos = [];
    ctrlAsignaciones = [];
    ctrlTimers = [];
    renderCtrlResumen();
    renderAgentesTabla();
    renderVuelosTabla();
    renderTimeline();
    renderTimers();
    renderConflictos();
    if (ctrlTimerInterval) { clearInterval(ctrlTimerInterval); ctrlTimerInterval = null; }
    alert('Turno limpiado.');
  });
}

function loadControlAgentesTurno() {
  var agPromise = fetch(GAS_URL + '?action=getAgentesTurno&fecha=' + encodeURIComponent(ctrlFecha))
    .then(function(r) { return r.json(); })
    .catch(function() { return { success: false, data: [] }; });

  var vlPromise = fetch(GAS_URL + '?action=getVuelosTurno&fecha=' + encodeURIComponent(ctrlFecha))
    .then(function(r) { return r.json(); })
    .catch(function() { return { success: false, data: [] }; });

  var asigPromise = fetch(GAS_URL + '?action=getAsignacionesTurno&fecha=' + encodeURIComponent(ctrlFecha))
    .then(function(r) { return r.json(); })
    .catch(function() { return { success: false, data: [] }; });

  Promise.all([agPromise, vlPromise, asigPromise]).then(function(results) {
    var agResult = results[0];
    var vlResult = results[1];
    var asigResult = results[2];

    var agData = (agResult.success && agResult.data) ? agResult.data : [];
    var vlData = (vlResult.success && vlResult.data) ? vlResult.data : [];
    var asigData = (asigResult.success && asigResult.data) ? asigResult.data : [];

    if (agData.length === 0) {
      try {
        var localAg = localStorage.getItem('ctrl_agentes_' + ctrlFecha);
        if (localAg) agData = JSON.parse(localAg);
      } catch(e) {}
    }
    if (vlData.length === 0) {
      try {
        var localVl = localStorage.getItem('ctrl_vuelos_' + ctrlFecha);
        if (localVl) vlData = JSON.parse(localVl);
      } catch(e) {}
    }
    if (asigData.length === 0) {
      try {
        var localAsig = localStorage.getItem('ctrl_asignaciones_' + ctrlFecha);
        if (localAsig) asigData = JSON.parse(localAsig);
      } catch(e) {}
    }

    if (agData.length > 0) {
      ctrlAgentes = agData.map(function(ag) {
        var turno = ag.turno || parseTurnoM(ag['Turno Entrada'] || ag.raw || '');
        if (!turno || !turno.entrada) turno = { entrada: '00:00', salida: '23:59', entradaAMPM: '12:00 AM', salidaAMPM: '11:59 PM', tipo: 'M', duracion: 24 };
        return {
          rut: ag.rut || ag['RUT'] || '',
          nombre: ag.nombre || ag['Nombre'] || '',
          rol: ag.rol || ag['Rol'] || '',
          turno: turno,
          estado: ag.estado || ag['Estado'] || 'presente',
          esLATAM: ag.esLATAM !== undefined ? ag.esLATAM : (ag['Es LATAM'] === 'SI'),
          esOLA: ag.esOLA !== undefined ? ag.esOLA : (ag['Es OLA'] === 'SI'),
          esSupervisor: ag.esSupervisor !== undefined ? ag.esSupervisor : (ag['Es Supervisor'] === 'SI'),
          vueloAsignado: ag.vueloAsignado || null,
          tipoAsignacion: ag.tipoAsignacion || null,
          colacionTimer: ag.colacionTimer || null,
          libreTimer: ag.libreTimer || null,
          horasExtendido: parseInt(ag.horasExtendido || ag['Horas Extendido']) || 0,
          colacionProgramada: ag.colacionProgramada || null
        };
      });
    }

    if (vlData.length > 0) {
      ctrlVuelos = vlData.map(function(v) {
        return {
          id: v.id || v['ID'] || '',
          fecha: v.fecha || v['Fecha'] || '',
          tipo: v.tipo || v['Tipo'] || '',
          numero: v.numero || v['Número'] || '',
          hora: v.hora || v['Hora'] || '',
          pax: parseInt(v.pax || v['PAX']) || 0,
          wchc: parseInt(v.wchc || v['WCHC']) || 0,
          estado: v.estado || v['Estado'] || 'pendiente',
          esFullService: v.esFullService !== undefined ? v.esFullService : (v['Es Full Service'] === 'SI'),
          aerolinea: v.aerolinea || v['Aerolinea'] || ''
        };
      });
    }

    if (asigData.length > 0) {
      ctrlAsignaciones = asigData.map(function(a) {
        return {
          id: a.id || a['ID'] || '',
          fecha: a.fecha || a['Fecha'] || '',
          agenteRut: a.agenteRut || a['Agente RUT'] || '',
          vueloId: a.vueloId || a['Vuelo ID'] || '',
          tipo: a.tipo || a['Tipo'] || '',
          inicio: a.inicio || a['Inicio'] || '',
          fin: a.fin || a['Fin'] || '',
          estado: a.estado || a['Estado'] || 'activa'
        };
      });
    }

    renderCtrlResumen();
    renderAgentesTabla();
    renderVuelosTabla();
    renderTimeline();
    renderTimers();
    renderConflictos();
    startTimerLoop();
  }).catch(function(err) {
    console.error('Error cargando turno:', err);
    try {
      var localAg = localStorage.getItem('ctrl_agentes_' + ctrlFecha);
      if (localAg) {
        ctrlAgentes = JSON.parse(localAg).map(function(ag) {
          var turno = ag.turno || parseTurnoM(ag.raw || '');
          if (!turno || !turno.entrada) turno = { entrada: '00:00', salida: '23:59', entradaAMPM: '12:00 AM', salidaAMPM: '11:59 PM', tipo: 'M', duracion: 24 };
          return {
            rut: ag.rut, nombre: ag.nombre, rol: ag.rol, turno: turno,
            estado: ag.estado || 'presente',
            esLATAM: ag.esLATAM, esOLA: ag.esOLA, esSupervisor: ag.esSupervisor || false,
            vueloAsignado: ag.vueloAsignado || null, tipoAsignacion: ag.tipoAsignacion || null,
            colacionTimer: ag.colacionTimer || null, libreTimer: ag.libreTimer || null,
            horasExtendido: parseInt(ag.horasExtendido) || 0,
            colacionProgramada: ag.colacionProgramada || null
          };
        });
      }
      var localVl = localStorage.getItem('ctrl_vuelos_' + ctrlFecha);
      if (localVl) {
        ctrlVuelos = JSON.parse(localVl).map(function(v) {
          return {
            id: v.id, fecha: v.fecha, tipo: v.tipo, numero: v.numero, hora: v.hora,
            pax: parseInt(v.pax) || 0, wchc: parseInt(v.wchc) || 0,
            estado: v.estado || 'pendiente', esFullService: v.esFullService, aerolinea: v.aerolinea
          };
        });
      }
      var localAsig = localStorage.getItem('ctrl_asignaciones_' + ctrlFecha);
      if (localAsig) {
        ctrlAsignaciones = JSON.parse(localAsig);
      }
      renderCtrlResumen();
      renderAgentesTabla();
      renderVuelosTabla();
      renderTimeline();
      renderTimers();
      renderConflictos();
      startTimerLoop();
    } catch(e) {
      console.error('Error cargando desde localStorage:', e);
    }
  });
}

function openNuevoVueloModal() {
  const modal = document.getElementById('nuevoVueloModal');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('nvNumero').focus();
  }
}

function closeNuevoVueloModal() {
  const modal = document.getElementById('nuevoVueloModal');
  if (modal) modal.classList.remove('active');
}

function saveNuevoVuelo() {
  const tipo = document.getElementById('nvTipo').value;
  const numero = document.getElementById('nvNumero').value.trim().toUpperCase();
  const hora = document.getElementById('nvHora').value;
  const pax = parseInt(document.getElementById('nvPax').value) || 0;
  const wchc = parseInt(document.getElementById('nvWchc').value) || 0;

  if (!numero || !hora) {
    alert('Complete número de vuelo y hora.');
    return;
  }

  const aerolinea = numero.substring(0, 2);
  const fullServiceLines = ['DL', 'AC', 'KL', 'AF'];
  const esFullService = fullServiceLines.includes(aerolinea);

  const vuelo = {
    id: 'V-' + Date.now(),
    fecha: ctrlFecha,
    tipo: tipo,
    numero: numero,
    hora: hora,
    pax: pax,
    wchc: wchc,
    estado: 'pendiente',
    esFullService: esFullService,
    aerolinea: aerolinea
  };

  ctrlVuelos.push(vuelo);
  ctrlVuelos.sort(function(a, b) { return a.hora.localeCompare(b.hora); });
  saveVueloTurnoToServer(vuelo);

  closeNuevoVueloModal();
  document.getElementById('nvNumero').value = '';
  document.getElementById('nvHora').value = '';
  document.getElementById('nvPax').value = '';
  document.getElementById('nvWchc').value = '0';

  renderVuelosTabla();
  renderCtrlResumen();
}

function calcularAgentesNecesarios(vuelo) {
  let base = 0;
  if (vuelo.esFullService) {
    base = vuelo.pax;
  } else {
    base = Math.ceil(vuelo.pax / 3);
  }
  const wchcExtra = vuelo.wchc > 0 ? Math.ceil(vuelo.wchc / 2) : 0;
  let counters = 0;
  if (vuelo.tipo === 'EMBARQUE' && vuelo.esFullService) {
    counters = Math.max(1, Math.ceil(vuelo.pax / 10));
  }
  return {
    agentesArribo: base + wchcExtra,
    agentesCounter: counters,
    total: base + wchcExtra + counters
  };
}

function calcularTimerLiberacion(vuelo) {
  if (vuelo.esFullService) return 60 * 60 * 1000;
  if (vuelo.tipo === 'ARRIBO') return 20 * 60 * 1000;
  return 35 * 60 * 1000;
}

function estaEnTurno(agente, hora) {
  if (!agente.turno) return true;
  const [h, m] = hora.split(':').map(Number);
  const minutos = h * 60 + m;
  const [he, me] = agente.turno.entrada.split(':').map(Number);
  const [hs, ms] = agente.turno.salida.split(':').map(Number);
  let entradaMin = he * 60 + me;
  let salidaMin = hs * 60 + ms;
  if (agente.horasExtendido > 0) {
    salidaMin += agente.horasExtendido * 60;
  }
  if (salidaMin <= entradaMin) {
    // Turno nocturno que cruza medianoche
    return minutos >= entradaMin || minutos <= (salidaMin % (24 * 60));
  }
  return minutos >= entradaMin && minutos <= salidaMin;
}

function estaEnUltimaHora(agente, horaVuelo) {
  if (!agente.turno) return false;
  const [hv, mv] = horaVuelo.split(':').map(Number);
  const vueloMin = hv * 60 + mv;
  const [he, me] = agente.turno.entrada.split(':').map(Number);
  const [hs, ms] = agente.turno.salida.split(':').map(Number);
  let entradaMin = he * 60 + me;
  let salidaMin = hs * 60 + ms;
  if (agente.horasExtendido > 0) {
    salidaMin += agente.horasExtendido * 60;
  }

  if (salidaMin <= entradaMin) {
    // Cruza medianoche: convertir a escala lineal desde entrada
    const salidaRel = salidaMin + 24 * 60;
    let vueloRel = vueloMin;
    if (vueloMin <= salidaMin) vueloRel = vueloMin + 24 * 60;
    return vueloRel >= (salidaRel - 60) && vueloRel < salidaRel;
  }
  return vueloMin >= (salidaMin - 60) && vueloMin < salidaMin;
}

function agenteDisponible(agente) {
  if (agente.estado !== 'presente' && agente.estado !== 'pendiente') return false;
  if (agente.libreTimer && Date.now() < agente.libreTimer) return false;
  if (agente.colacionTimer && Date.now() < agente.colacionTimer) return false;
  return true;
}

function autoAsignarTurno() {
  if (ctrlAgentes.length === 0) {
    alert('Cargue agentes primero con "Pegar Agentes".');
    return;
  }
  if (ctrlVuelos.length === 0) {
    alert('Cree vuelos primero con "Nuevo Vuelo".');
    return;
  }

  const now = new Date();
  const horaActual = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  const vuelosPendientes = ctrlVuelos.filter(function(v) { return v.estado === 'pendiente'; });
  vuelosPendientes.sort(function(a, b) { return a.hora.localeCompare(b.hora); });

  let asignacionesRealizadas = 0;

  vuelosPendientes.forEach(function(vuelo) {
    const necesarios = calcularAgentesNecesarios(vuelo);
    let asignados = 0;
    const agentesAsignados = [];

    const agentesOrdenados = ctrlAgentes.slice().sort(function(a, b) {
      var ea = a.turno && a.turno.entrada ? a.turno.entrada : '99:99';
      var eb = b.turno && b.turno.entrada ? b.turno.entrada : '99:99';
      if (ea !== eb) return ea.localeCompare(eb);
      return (a.nombre || '').localeCompare(b.nombre || '');
    });

    for (let i = 0; i < agentesOrdenados.length && asignados < necesarios.total; i++) {
      const ag = agentesOrdenados[i];
      if (!agenteDisponible(ag)) continue;
      if (!estaEnTurno(ag, vuelo.hora)) continue;
      if (estaEnUltimaHora(ag, vuelo.hora)) continue;

      const esLATAMFlight = vuelo.aerolinea.startsWith('LA');
      if (esLATAMFlight && !ag.esLATAM) continue;
      if (!esLATAMFlight && !ag.esOLA) continue;

      ag.estado = 'asignado';
      ag.vueloAsignado = vuelo.id;
      ag.tipoAsignacion = vuelo.tipo.toLowerCase();

      const timerMs = calcularTimerLiberacion(vuelo);
      ag.libreTimer = Date.now() + timerMs;

      const asig = {
        id: 'A-' + Date.now() + '-' + i,
        fecha: ctrlFecha,
        agenteRut: ag.rut,
        vueloId: vuelo.id,
        tipo: vuelo.tipo.toLowerCase(),
        inicio: new Date().toISOString(),
        fin: new Date(Date.now() + timerMs).toISOString(),
        estado: 'activa'
      };
      ctrlAsignaciones.push(asig);
      saveAsignacionToServer(asig);

      agentesAsignados.push(ag.rut);
      asignados++;
      asignacionesRealizadas++;
    }

    if (asignados >= necesarios.total) {
      vuelo.estado = 'completado';
    } else if (asignados > 0) {
      vuelo.estado = 'en_curso';
    }

    vuelo.agentesAsignados = agentesAsignados;
    saveVueloTurnoToServer(vuelo);
  });

  programarColaciones();
  renderCtrlResumen();
  renderAgentesTabla();
  renderVuelosTabla();
  renderTimeline();
  renderTimers();
  renderConflictos();
  startTimerLoop();

  alert('Asignación automática completada: ' + asignacionesRealizadas + ' asignaciones realizadas.');
}

function cambiarEstadoAgente(rut, nuevoEstado) {
  const ag = ctrlAgentes.find(function(a) { return a.rut === rut; });
  if (!ag) return;
  ag.estado = nuevoEstado;
  saveAgentesTurnoToServer();
  renderAgentesTabla();
  renderCtrlResumen();
  renderConflictos();
}

function openExtendidoModal(rut) {
  const ag = ctrlAgentes.find(function(a) { return a.rut === rut; });
  if (!ag) return;
  const horas = prompt('¿Cuántas horas está extendido el agente ' + ag.nombre + '?', ag.horasExtendido || '0');
  if (horas === null) return;
  ag.horasExtendido = parseFloat(horas) || 0;
  saveAgentesTurnoToServer();
  renderAgentesTabla();
}

function programarColaciones() {
  const now = new Date();
  ctrlAgentes.forEach(function(ag) {
    if (ag.estado !== 'presente' && ag.estado !== 'pendiente' && ag.estado !== 'asignado') return;
    if (!ag.turno || !ag.turno.entrada) return;

    const [he, me] = ag.turno.entrada.split(':').map(Number);
    const entradaDate = new Date();
    entradaDate.setHours(he, me, 0, 0);

    const colacionOptima = new Date(entradaDate.getTime() + 4.5 * 60 * 60 * 1000);

    if (colacionOptima > now && colacionOptima < new Date(now.getTime() + 2 * 60 * 60 * 1000)) {
      const hayConflicto = ctrlAsignaciones.some(function(a) {
        if (a.agenteRut !== ag.rut || a.estado !== 'activa') return false;
        const asigInicio = new Date(a.inicio).getTime();
        const asigFin = new Date(a.fin).getTime();
        return colacionOptima >= asigInicio && colacionOptima <= asigFin;
      });

      if (!hayConflicto) {
        ag.colacionProgramada = colacionOptima.getTime();
      }
    }
  });
}

function iniciarColacion(rut) {
  const ag = ctrlAgentes.find(function(a) { return a.rut === rut; });
  if (!ag) return;
  ag.estado = 'colacion';
  ag.colacionTimer = Date.now() + 60 * 60 * 1000;
  ag.vueloAsignado = null;
  ag.tipoAsignacion = 'colacion';

  const asig = {
    id: 'C-' + Date.now(),
    fecha: ctrlFecha,
    agenteRut: rut,
    vueloId: null,
    tipo: 'colacion',
    inicio: new Date().toISOString(),
    fin: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    estado: 'activa'
  };
  ctrlAsignaciones.push(asig);
  saveAsignacionToServer(asig);

  renderAgentesTabla();
  renderTimers();
  renderCtrlResumen();
}

function finalizarColacion(rut) {
  const ag = ctrlAgentes.find(function(a) { return a.rut === rut; });
  if (!ag) return;
  ag.estado = 'disponible';
  ag.colacionTimer = null;
  ag.vueloAsignado = null;
  ag.tipoAsignacion = null;

  ctrlAsignaciones.forEach(function(a) {
    if (a.agenteRut === rut && a.tipo === 'colacion' && a.estado === 'activa') {
      a.estado = 'completada';
    }
  });

  renderAgentesTabla();
  renderTimers();
  renderCtrlResumen();
}

function liberarAgente(rut) {
  const ag = ctrlAgentes.find(function(a) { return a.rut === rut; });
  if (!ag) return;
  ag.estado = 'disponible';
  ag.libreTimer = null;
  ag.vueloAsignado = null;
  ag.tipoAsignacion = null;

  ctrlAsignaciones.forEach(function(a) {
    if (a.agenteRut === rut && a.estado === 'activa') {
      a.estado = 'completada';
    }
  });

  renderAgentesTabla();
  renderTimers();
  renderCtrlResumen();
}

function startTimerLoop() {
  if (ctrlTimerInterval) clearInterval(ctrlTimerInterval);
  ctrlTimerInterval = setInterval(function() {
    let changed = false;
    const now = Date.now();

    ctrlAgentes.forEach(function(ag) {
      if (ag.libreTimer && now >= ag.libreTimer) {
        ag.libreTimer = null;
        if (ag.estado === 'asignado' || ag.estado === 'libre') {
          ag.estado = 'presente';
          ag.vueloAsignado = null;
          ag.tipoAsignacion = null;
          changed = true;
        }
      }
      if (ag.colacionTimer && now >= ag.colacionTimer) {
        ag.colacionTimer = null;
        if (ag.estado === 'colacion') {
          ag.estado = 'presente';
          ag.vueloAsignado = null;
          ag.tipoAsignacion = null;
          changed = true;
        }
      }
    });

    if (changed) {
      renderAgentesTabla();
      renderCtrlResumen();
      renderTimers();
      renderConflictos();
    } else {
      renderTimers();
    }
  }, 1000);
}

function formatearTimer(ms) {
  if (ms <= 0) return '00:00';
  const totalSeg = Math.floor(ms / 1000);
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return String(min).padStart(2, '0') + ':' + String(seg).padStart(2, '0');
}

function renderCtrlResumen() {
  const container = document.getElementById('ctrlResumen');
  if (!container) return;

  var now = new Date();
  var horaActual = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  var agentesVisibles = ctrlAgentes.filter(function(a) {
    if (a.estado === 'ausente') return true;
    return estaEnTurno(a, horaActual);
  });

  var totalAgentes = agentesVisibles.length;
  var presentes = agentesVisibles.filter(function(a) { return a.estado === 'presente'; }).length;
  var ausentes = agentesVisibles.filter(function(a) { return a.estado === 'ausente'; }).length;
  var pendientesCount = agentesVisibles.filter(function(a) { return a.estado === 'pendiente'; }).length;
  var asignados = agentesVisibles.filter(function(a) { return a.estado === 'asignado'; }).length;
  var enColacion = agentesVisibles.filter(function(a) { return a.estado === 'colacion'; }).length;
  var libres = agentesVisibles.filter(function(a) { return a.estado === 'libre' || (a.libreTimer && Date.now() < a.libreTimer); }).length;

  var totalVuelos = ctrlVuelos.length;
  var vuelosPendientes = ctrlVuelos.filter(function(v) { return v.estado === 'pendiente'; }).length;
  var enCurso = ctrlVuelos.filter(function(v) { return v.estado === 'en_curso'; }).length;
  var completados = ctrlVuelos.filter(function(v) { return v.estado === 'completado'; }).length;

  var proximaColacion = '—';
  var agentesConColacion = ctrlAgentes.filter(function(a) { return a.colacionProgramada && a.colacionProgramada > Date.now(); });
  if (agentesConColacion.length > 0) {
    agentesConColacion.sort(function(a, b) { return a.colacionProgramada - b.colacionProgramada; });
    var prox = agentesConColacion[0];
    proximaColacion = formatearTimer(prox.colacionProgramada - Date.now()) + ' - ' + prox.nombre;
  }

  container.innerHTML =
    '<div class="resumen-card"><div class="resumen-value">' + totalAgentes + '</div><div class="resumen-label">Agentes Totales</div></div>' +
    '<div class="resumen-card"><div class="resumen-value" style="color:var(--success);">' + presentes + '</div><div class="resumen-label">🟢 Presentes</div></div>' +
    '<div class="resumen-card"><div class="resumen-value" style="color:var(--danger);">' + ausentes + '</div><div class="resumen-label">🔴 Ausentes</div></div>' +
    '<div class="resumen-card"><div class="resumen-value" style="color:var(--warning);">' + pendientesCount + '</div><div class="resumen-label">🟡 Pendientes</div></div>' +
    '<div class="resumen-card"><div class="resumen-value" style="color:#3b82f6;">' + asignados + '</div><div class="resumen-label">🔵 Asignados</div></div>' +
    '<div class="resumen-card"><div class="resumen-value" style="color:var(--warning);">' + enColacion + '</div><div class="resumen-label">🍽️ Colación</div></div>' +
    '<div class="resumen-card"><div class="resumen-value" style="color:var(--success);">' + libres + '</div><div class="resumen-label">⏳ Libres</div></div>' +
    '<div class="resumen-card"><div class="resumen-value">' + totalVuelos + '</div><div class="resumen-label">✈️ Vuelos</div></div>' +
    '<div class="resumen-card"><div class="resumen-value" style="color:var(--warning);">' + vuelosPendientes + '</div><div class="resumen-label">⏳ Pendientes</div></div>' +
    '<div class="resumen-card"><div class="resumen-value" style="color:#3b82f6;">' + enCurso + '</div><div class="resumen-label">🔄 En Curso</div></div>' +
    '<div class="resumen-card"><div class="resumen-value" style="color:var(--success);">' + completados + '</div><div class="resumen-label">✅ Completados</div></div>' +
    '<div class="resumen-card"><div class="resumen-value" style="color:var(--accent);font-size:0.9em;">' + proximaColacion + '</div><div class="resumen-label">⏱️ Próxima Colación</div></div>';
}

function renderAgentesTabla() {
  const thead = document.getElementById('ctrlAgentesTableHead');
  const tbody = document.getElementById('ctrlAgentesTableBody');
  if (!thead || !tbody) return;

  thead.innerHTML = '<tr>' +
    '<th>RUT</th>' +
    '<th>Nombre</th>' +
    '<th>Rol</th>' +
    '<th>Turno</th>' +
    '<th>Estado</th>' +
    '<th>Timer</th>' +
    '<th>Asignación</th>' +
    '<th>Colación</th>' +
    '<th>Acciones</th>' +
    '</tr>';

  const filtroNombre = (document.getElementById('ctrlFilterAgente')?.value || '').toLowerCase();
  const filtroEstado = document.getElementById('ctrlFilterEstado')?.value || '';
  const filtroRol = document.getElementById('ctrlFilterRol')?.value || '';

  const now = Date.now();
  var ahora = new Date(now);
  var horaActual = String(ahora.getHours()).padStart(2, '0') + ':' + String(ahora.getMinutes()).padStart(2, '0');

  let agentesFiltrados = ctrlAgentes.filter(function(ag) {
    if (ag.estado !== 'ausente' && !estaEnTurno(ag, horaActual)) return false;
    if (filtroNombre && !ag.nombre.toLowerCase().includes(filtroNombre) && !ag.rut.toLowerCase().includes(filtroNombre)) return false;
    if (filtroEstado && ag.estado !== filtroEstado) return false;
    if (filtroRol === 'LATAM' && !ag.esLATAM) return false;
    if (filtroRol === 'OLA' && !ag.esOLA) return false;
    return true;
  });

  agentesFiltrados.sort(function(a, b) {
    var ea = a.turno && a.turno.entrada ? a.turno.entrada : '99:99';
    var eb = b.turno && b.turno.entrada ? b.turno.entrada : '99:99';
    if (ea !== eb) return ea.localeCompare(eb);
    return (a.nombre || '').localeCompare(b.nombre || '');
  });

  if (agentesFiltrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted);">No hay agentes que coincidan con los filtros.</td></tr>';
    return;
  }

  tbody.innerHTML = agentesFiltrados.map(function(ag) {
    const estadoBadge = ag.estado === 'presente' ? '<span class="badge badge-disponible">🟢 Presente</span>' :
      ag.estado === 'ausente' ? '<span class="badge" style="background:var(--danger-bg);color:var(--danger);">🔴 Ausente</span>' :
      ag.estado === 'pendiente' ? '<span class="badge" style="background:rgba(245,158,11,0.15);color:var(--warning);">🟡 Pendiente</span>' :
      ag.estado === 'asignado' ? '<span class="badge badge-asignado">🔵 Asignado</span>' :
      ag.estado === 'colacion' ? '<span class="badge badge-colacion">🍽️ Colación</span>' :
      '<span class="badge badge-libre">⏳ Libre</span>';

    let timerStr = '—';
    if (ag.libreTimer && now < ag.libreTimer) {
      timerStr = '<span class="badge badge-libre">' + formatearTimer(ag.libreTimer - now) + '</span>';
    } else if (ag.colacionTimer && now < ag.colacionTimer) {
      timerStr = '<span class="badge badge-colacion">' + formatearTimer(ag.colacionTimer - now) + '</span>';
    }

    const vueloAsignado = ag.vueloAsignado ? ctrlVuelos.find(function(v) { return v.id === ag.vueloAsignado; }) : null;
    const asignacionStr = vueloAsignado ? (vueloAsignado.numero + ' ' + vueloAsignado.tipo.substring(0, 3)) : '—';

    let colacionBadge = '';
    if (ag.turno && ag.turno.entrada) {
      const [he, me] = ag.turno.entrada.split(':').map(Number);
      const entradaDate = new Date();
      entradaDate.setHours(he, me, 0, 0);
      const horasTrabajadas = (now - entradaDate.getTime()) / (60 * 60 * 1000);
      if (horasTrabajadas >= 5.5 && ag.estado !== 'colacion' && !ag.colacionTimer) {
        colacionBadge = '<span class="colacion-badge alerta">⚠️ ' + horasTrabajadas.toFixed(1) + 'h sin colación</span>';
      } else if (horasTrabajadas >= 4 && horasTrabajadas < 5.5 && ag.estado !== 'colacion' && !ag.colacionTimer) {
        colacionBadge = '<span class="colacion-badge">🍽️ Colación pendiente</span>';
      }
    }

    let acciones = '';
    if (ag.estado === 'colacion' || (ag.colacionTimer && now < ag.colacionTimer)) {
      acciones = '<button class="btn btn-success btn-sm" onclick="finalizarColacion(\'' + ag.rut.replace(/'/g, "\\'") + '\')" style="padding:2px 6px;font-size:0.75em;">✅ Fin Colación</button>';
    } else if (ag.estado === 'asignado' || (ag.libreTimer && now < ag.libreTimer)) {
      acciones = '<button class="btn btn-ghost btn-sm" onclick="liberarAgente(\'' + ag.rut.replace(/'/g, "\\'") + '\')" style="padding:2px 6px;font-size:0.75em;">🔓 Liberar</button>';
    } else if (ag.estado === 'ausente') {
      acciones = '<button class="btn btn-success btn-sm" onclick="cambiarEstadoAgente(\'' + ag.rut.replace(/'/g, "\\'") + '\', \'presente\')" style="padding:2px 6px;font-size:0.75em;">✅ Presente</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="cambiarEstadoAgente(\'' + ag.rut.replace(/'/g, "\\'") + '\', \'pendiente\')" style="padding:2px 6px;font-size:0.75em;">🟡 Pendiente</button>';
    } else if (ag.estado === 'pendiente') {
      acciones = '<button class="btn btn-success btn-sm" onclick="cambiarEstadoAgente(\'' + ag.rut.replace(/'/g, "\\'") + '\', \'presente\')" style="padding:2px 6px;font-size:0.75em;">✅ Presente</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="cambiarEstadoAgente(\'' + ag.rut.replace(/'/g, "\\'") + '\', \'ausente\')" style="padding:2px 6px;font-size:0.75em;">🔴 Ausente</button>';
    } else {
      acciones = '<button class="btn btn-ghost btn-sm" onclick="cambiarEstadoAgente(\'' + ag.rut.replace(/'/g, "\\'") + '\', \'ausente\')" style="padding:2px 6px;font-size:0.75em;">🔴 Ausente</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="iniciarColacion(\'' + ag.rut.replace(/'/g, "\\'") + '\')" style="padding:2px 6px;font-size:0.75em;">🍽️ Colación</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="openExtendidoModal(\'' + ag.rut.replace(/'/g, "\\'") + '\')" style="padding:2px 6px;font-size:0.75em;">⏱️ Ext.</button>';
    }

    const turnoTxt = ag.turno ? (ag.turno.entradaAMPM + ' - ' + ag.turno.salidaAMPM) : '—';
    const esLATAMBadge = ag.esLATAM ? ' <span class="badge" style="background:var(--accent-light);color:var(--accent);font-size:0.65em;">LATAM</span>' : '';
    const esOLABadge = ag.esOLA ? ' <span class="badge" style="background:#3b82f6;color:#fff;font-size:0.65em;">OLA</span>' : '';

    return '<tr>' +
      '<td class="col-rut">' + escapeHtml(ag.rut) + '</td>' +
      '<td class="col-nombre">' + escapeHtml(ag.nombre) + esLATAMBadge + esOLABadge + '</td>' +
      '<td class="col-rol"><span style="font-size:0.8em;">' + escapeHtml(ag.rol) + '</span></td>' +
      '<td class="col-turno">' + escapeHtml(turnoTxt) + '</td>' +
      '<td class="col-estado">' + estadoBadge + '</td>' +
      '<td class="col-timer">' + timerStr + '</td>' +
      '<td class="col-rol" style="font-size:0.85em;">' + escapeHtml(asignacionStr) + '</td>' +
      '<td>' + colacionBadge + '</td>' +
      '<td class="col-acciones">' + acciones + '</td>' +
      '</tr>';
  }).join('');
}

function renderVuelosTabla() {
  const thead = document.getElementById('ctrlVuelosTableHead');
  const tbody = document.getElementById('ctrlVuelosTableBody');
  if (!thead || !tbody) return;

  thead.innerHTML = '<tr>' +
    '<th>Hora</th>' +
    '<th>Tipo</th>' +
    '<th>Vuelo</th>' +
    '<th>PAX</th>' +
    '<th>WCHC</th>' +
    '<th>Agentes Necesarios</th>' +
    '<th>Estado</th>' +
    '<th>Acciones</th>' +
    '</tr>';

  if (ctrlVuelos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted);">Crea vuelos con "Nuevo Vuelo" para comenzar.</td></tr>';
    return;
  }

  const vuelosOrdenados = ctrlVuelos.slice().sort(function(a, b) { return a.hora.localeCompare(b.hora); });

  tbody.innerHTML = vuelosOrdenados.map(function(v) {
    const necesarios = calcularAgentesNecesarios(v);
    const estadoBadge = v.estado === 'pendiente' ? '<span class="badge" style="background:var(--text-subtle);color:#fff;">Pendiente</span>' :
      v.estado === 'en_curso' ? '<span class="badge badge-asignado">En Curso</span>' :
      '<span class="badge badge-disponible">Completado</span>';

    const fullServiceBadge = v.esFullService ? ' <span class="badge" style="background:var(--accent);color:#fff;font-size:0.65em;">FULL</span>' : '';
    const tipoBadge = v.tipo === 'ARRIBO' ? '<span class="badge" style="background:var(--accent-light);color:var(--accent);">ARR</span>' : '<span class="badge" style="background:#3b82f6;color:#fff;">EMB</span>';

    return '<tr>' +
      '<td class="vuelo-hora">' + escapeHtml(v.hora) + '</td>' +
      '<td class="vuelo-tipo">' + tipoBadge + '</td>' +
      '<td class="vuelo-numero">' + escapeHtml(v.numero) + fullServiceBadge + '</td>' +
      '<td class="vuelo-pax">' + v.pax + '</td>' +
      '<td class="vuelo-pax">' + v.wchc + '</td>' +
      '<td class="vuelo-agentes">' + necesarios.total + (necesarios.agentesCounter > 0 ? ' (+' + necesarios.agentesCounter + ' counter)' : '') + '</td>' +
      '<td class="vuelo-estado">' + estadoBadge + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn btn-ghost btn-sm" onclick="asignarAgenteManual(\'' + v.id + '\')" style="padding:2px 6px;font-size:0.75em;margin-right:4px;">👤 Asignar</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="eliminarVuelo(\'' + v.id + '\')" style="padding:2px 6px;font-size:0.75em;">✕</button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function eliminarVuelo(vueloId) {
  if (!confirm('¿Eliminar este vuelo?')) return;
  ctrlVuelos = ctrlVuelos.filter(function(v) { return v.id !== vueloId; });
  renderVuelosTabla();
  renderCtrlResumen();
}

function asignarAgenteManual(vueloId) {
  var vuelo = ctrlVuelos.find(function(v) { return v.id === vueloId; });
  if (!vuelo) { alert('Vuelo no encontrado.'); return; }

  var disponibles = ctrlAgentes.filter(function(ag) {
    return ag.estado === 'presente' || ag.estado === 'pendiente';
  });
  if (disponibles.length === 0) {
    alert('No hay agentes presentes o pendientes para asignar.');
    return;
  }

  var lista = disponibles.map(function(ag, idx) {
    return (idx + 1) + '. ' + ag.nombre + ' (' + ag.rut + ') - ' + ag.rol + ' [' + (ag.turno ? ag.turno.entradaAMPM + '-' + ag.turno.salidaAMPM : 'sin turno') + ']';
  }).join('\n');

  var sel = prompt('Asignar agente manualmente a vuelo ' + vuelo.numero + ' (' + vuelo.hora + ')\n\nAgentes disponibles:\n' + lista + '\n\nIngrese el número del agente:');
  if (sel === null) return;
  var idx = parseInt(sel, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= disponibles.length) {
    alert('Selección inválida.');
    return;
  }

  var ag = disponibles[idx];

  if (!estaEnTurno(ag, vuelo.hora)) {
    alert('El agente ' + ag.nombre + ' no está en turno a las ' + vuelo.hora + '.');
    return;
  }

  if (estaEnUltimaHora(ag, vuelo.hora)) {
    var confirmar = confirm('⚠️ El vuelo ' + vuelo.numero + ' (' + vuelo.hora + ') está dentro de la última hora antes de la salida del agente ' + ag.nombre + ' (sale a las ' + (ag.turno ? ag.turno.salidaAMPM : '?') + ').\n\n¿Desea asignar de todas formas?');
    if (!confirmar) return;
  }

  var timerMs = calcularTimerLiberacion(vuelo);
  ag.estado = 'asignado';
  ag.vueloAsignado = vuelo.id;
  ag.tipoAsignacion = vuelo.tipo.toLowerCase();
  ag.libreTimer = Date.now() + timerMs;

  var asig = {
    id: 'A-' + Date.now() + '-manual',
    fecha: ctrlFecha,
    agenteRut: ag.rut,
    vueloId: vuelo.id,
    tipo: vuelo.tipo.toLowerCase(),
    inicio: new Date().toISOString(),
    fin: new Date(Date.now() + timerMs).toISOString(),
    estado: 'activa'
  };
  ctrlAsignaciones.push(asig);
  saveAsignacionToServer(asig);

  var necesarios = calcularAgentesNecesarios(vuelo);
  var asignadosCount = ctrlAsignaciones.filter(function(a) { return a.vueloId === vuelo.id && a.estado === 'activa'; }).length;
  if (asignadosCount >= necesarios.total) {
    vuelo.estado = 'completado';
  } else {
    vuelo.estado = 'en_curso';
  }
  saveVueloTurnoToServer(vuelo);

  renderCtrlResumen();
  renderAgentesTabla();
  renderVuelosTabla();
  renderTimeline();
  renderTimers();
  renderConflictos();
  startTimerLoop();
}

function renderTimeline() {
  const container = document.getElementById('ctrlTimeline');
  if (!container) return;

  if (ctrlAgentes.length === 0) {
    container.innerHTML = '<div class="hint-box">Carga agentes y crea vuelos para ver el timeline.</div>';
    return;
  }

  const now = new Date();
  const horaInicio = 4;
  const horaFin = 23;
  const totalMinutos = (horaFin - horaInicio) * 60;
  const anchoMin = 400;

  let html = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">';
  html += '<div style="min-width:160px;font-size:0.75em;color:var(--text-muted);">Agente / Turno</div>';
  html += '<div style="flex:1;position:relative;min-width:' + anchoMin + 'px;height:20px;">';
  for (let h = horaInicio; h <= horaFin; h += 2) {
    const pct = ((h - horaInicio) * 60 / totalMinutos) * 100;
    html += '<div style="position:absolute;left:' + pct + '%;font-size:0.65em;color:var(--text-muted);transform:translateX(-50%);">' + String(h).padStart(2, '0') + ':00</div>';
  }
  html += '</div></div>';

  ctrlAgentes.slice(0, 20).forEach(function(ag) {
    const turnoInicio = ag.turno ? ag.turno.entrada : '04:00';
    const turnoFin = ag.turno ? ag.turno.salida : '13:00';
    const [hi, mi] = turnoInicio.split(':').map(Number);
    const [hf, mf] = turnoFin.split(':').map(Number);
    const inicioMin = (hi - horaInicio) * 60 + mi;
    const finMin = (hf - horaInicio) * 60 + mf;
    const totalM = (horaFin - horaInicio) * 60;
    const leftPct = Math.max(0, Math.min(100, (inicioMin / totalM) * 100));
    const widthPct = Math.max(2, Math.min(100 - leftPct, ((finMin - inicioMin) / totalM) * 100));

    html += '<div class="timeline-row">';
    html += '<div class="timeline-label" title="' + escapeHtml(ag.nombre) + '">' + escapeHtml(ag.nombre.substring(0, 22)) + '</div>';
    html += '<div class="timeline-bar-container">';
    html += '<div class="timeline-bar ' + (ag.esLATAM ? 'arribo' : 'embarque') + '" style="left:' + leftPct + '%;width:' + widthPct + '%;opacity:0.7;">' + escapeHtml(ag.rol.substring(0, 8)) + '</div>';

    if (ag.estado === 'colacion' || ag.colacionProgramada) {
      const colInicio = ag.colacionTimer ? (60 - Math.floor((ag.colacionTimer - Date.now()) / 60000)) : 4.5 * 60;
      const colMin = colInicio;
      const colLeftPct = Math.max(0, Math.min(100, ((colMin) / totalM) * 100));
      const colWidthPct = Math.max(2, Math.min(100 - colLeftPct, (60 / totalM) * 100));
      html += '<div class="timeline-bar colacion" style="left:' + colLeftPct + '%;width:' + colWidthPct + '%;">🍽️</div>';
    }

    ctrlAsignaciones.filter(function(a) { return a.agenteRut === ag.rut; }).forEach(function(a) {
      const asigHora = a.inicio ? new Date(a.inicio) : new Date();
      const asigH = asigHora.getHours();
      const asigM = asigHora.getMinutes();
      const asigMin = (asigH - horaInicio) * 60 + asigM;
      const asigLeftPct = Math.max(0, Math.min(100, (asigMin / totalM) * 100));
      const asigWidthPct = Math.max(2, Math.min(100 - asigLeftPct, (15 / totalM) * 100));
      const asigClass = a.tipo === 'arribo' ? 'arribo' : a.tipo === 'embarque' ? 'embarque' : a.tipo === 'colacion' ? 'colacion' : 'libre';
      const asigLabel = a.tipo === 'arribo' ? 'ARR' : a.tipo === 'embarque' ? 'EMB' : a.tipo === 'colacion' ? 'COL' : 'LIB';
      html += '<div class="timeline-bar ' + asigClass + '" style="left:' + asigLeftPct + '%;width:' + asigWidthPct + '%;font-size:0.65em;">' + asigLabel + '</div>';
    });

    html += '</div></div>';
  });

  container.innerHTML = html;
}

function renderTimers() {
  const container = document.getElementById('ctrlTimers');
  if (!container) return;

  const now = Date.now();
  const timersActivos = [];

  ctrlAgentes.forEach(function(ag) {
    if (ag.colacionTimer && now < ag.colacionTimer) {
      timersActivos.push({
        tipo: 'colacion',
        nombre: ag.nombre,
        rut: ag.rut,
        fin: ag.colacionTimer,
        restante: ag.colacionTimer - now,
        total: 60 * 60 * 1000
      });
    }
    if (ag.libreTimer && now < ag.libreTimer) {
      timersActivos.push({
        tipo: 'libre',
        nombre: ag.nombre,
        rut: ag.rut,
        fin: ag.libreTimer,
        restante: ag.libreTimer - now,
        total: ag.libreTimer - now + 1000
      });
    }
  });

  if (timersActivos.length === 0) {
    container.innerHTML = '<div class="hint-box">No hay timers activos.</div>';
    return;
  }

  container.innerHTML = timersActivos.map(function(t) {
    const pct = Math.max(0, Math.min(100, (t.restante / t.total) * 100));
    const label = t.tipo === 'colacion' ? '🍽️ COLACIÓN' : '⏳ DISPONIBLE';
    return '<div class="timer-card ' + t.tipo + '">' +
      '<div class="timer-label">' + label + '</div>' +
      '<div class="timer-name">' + escapeHtml(t.nombre) + '</div>' +
      '<div class="timer-value">' + formatearTimer(t.restante) + '</div>' +
      '<div class="timer-bar"><div class="timer-bar-fill" style="width:' + pct + '%;"></div></div>' +
      '</div>';
  }).join('');
}

function renderConflictos() {
  const container = document.getElementById('ctrlAlertasContainer');
  if (!container) return;

  const conflictos = [];

  ctrlVuelos.forEach(function(v) {
    if (v.estado === 'pendiente') {
      const necesarios = calcularAgentesNecesarios(v);
      const disponibles = ctrlAgentes.filter(function(a) {
        return agenteDisponible(a) && estaEnTurno(a, v.hora);
      }).length;
      if (disponibles < necesarios.total) {
        conflictos.push({
          tipo: 'danger',
          texto: '⚠️ Vuelo ' + v.numero + ' (' + v.hora + ') requiere ' + necesarios.total + ' agentes, solo hay ' + disponibles + ' disponibles'
        });
      }
    }
  });

  ctrlAgentes.forEach(function(ag) {
    if (!ag.turno || !ag.turno.entrada) return;
    const [he, me] = ag.turno.entrada.split(':').map(Number);
    const entradaDate = new Date();
    entradaDate.setHours(he, me, 0, 0);
    const horas = (Date.now() - entradaDate.getTime()) / (60 * 60 * 1000);
    if (horas >= 5.5 && ag.estado !== 'colacion' && !ag.colacionTimer) {
      conflictos.push({
        tipo: 'warning',
        texto: '⚠️ ' + ag.nombre + ' lleva ' + horas.toFixed(1) + 'h sin colación (ingreso ' + ag.turno.entradaAMPM + ')'
      });
    }
  });

  if (conflictos.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = '<h3 style="font-size:0.95em;color:var(--danger);margin:8px 0 6px;">⚠️ Alertas y Conflictos</h3>' +
    conflictos.map(function(c) {
      return '<div class="conflict-item ' + c.tipo + '">' + c.texto + '</div>';
    }).join('');
}

// Inicializar fecha de control al cargar
document.addEventListener('DOMContentLoaded', function() {
  const today = new Date().toISOString().slice(0, 10);
  ctrlFecha = today;
});
