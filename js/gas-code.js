var FLIGHT_SPREADSHEET_ID = '1toTzYwuBvz7vaXNVGtWyVSevHWOZdooEoKjR-3wKlnc';
var PLAN_SPREADSHEET_ID = '13oIthxggFMQP8l_4RHCyQ7XjvbVtMq0EMRaDNN2e2TA';

function getFlightSpreadsheet() {
  return SpreadsheetApp.openById(FLIGHT_SPREADSHEET_ID);
}

function getPlanSpreadsheet() {
  return SpreadsheetApp.openById(PLAN_SPREADSHEET_ID);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || 'write';
    var flightSs = getFlightSpreadsheet();
    var planSs = getPlanSpreadsheet();

    if (action === 'saveAirlines') {
      var configSheet = flightSs.getSheetByName('CONFIG') || flightSs.getSheets()[0];
      if (!flightSs.getSheetByName('CONFIG')) {
        configSheet = flightSs.insertSheet('CONFIG');
      }
      configSheet.getRange('A1').setValue('key');
      configSheet.getRange('B1').setValue('value');
      var airlines = body.airlines || [];
      var existing = configSheet.getRange('A2:B' + configSheet.getLastRow()).getValues();
      var found = false;
      for (var i = 1; i < existing.length; i++) {
        if (existing[i][0] === 'airlines') {
          configSheet.getRange(i + 1, 2).setValue(JSON.stringify(airlines));
          found = true;
          break;
        }
      }
      if (!found) {
        configSheet.appendRow(['airlines', JSON.stringify(airlines)]);
      }
      airlines.forEach(function(name) {
        if (!flightSs.getSheetByName(name)) {
          var newSheet = flightSs.insertSheet(name);
          newSheet.getRange(1, 1, 1, 14).setValues([[
            'Fecha Registro',
            'Hora Registro',
            'Operación',
            'Aerolínea',
            'Vuelo',
            'ETA/ETD',
            'Puerta',
            'Hora Inicio',
            'Hora Término',
            'Total Asistencias',
            'Nombre Pasajero',
            'Atendido Por',
            'Asistencia',
            'Estado del Pasajero'
          ]]);
        }
      });
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Aerolineas guardadas' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveAgents') {
      var agents = body.agents || [];
      var agentSheet = planSs.getSheetByName('AGENTES');
      if (!agentSheet) {
        agentSheet = planSs.insertSheet('AGENTES');
      }
      if (agentSheet.getLastRow() === 0) {
        agentSheet.getRange(1, 1, 1, 4).setValues([['RUT', 'Nombre', 'Cargo', 'Proximos Turnos']]);
      }
      if (agents.length) {
        var agentRows = agents.map(function(a) {
          return [a.rut || '', a.nombre || '', a.cargo || '', a.proximosTurnos || ''];
        });
        agentSheet.getRange(agentSheet.getLastRow() + 1, 1, agentRows.length, agentRows[0].length).setValues(agentRows);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Agentes guardados' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveDotacion') {
      var dotacionSheet = planSs.getSheetByName('DOTACION');
      if (!dotacionSheet) {
        dotacionSheet = planSs.insertSheet('DOTACION');
        dotacionSheet.getRange(1, 1, 1, 2).setValues([['Fecha', 'Datos']]);
      }
      var fecha = body.fecha;
      var datos = body.datos;
      if (!fecha || !datos) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Faltan parámetros' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var data = dotacionSheet.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === fecha) {
          dotacionSheet.getRange(i + 1, 2).setValue(JSON.stringify(datos));
          found = true;
          break;
        }
      }
      if (!found) {
        dotacionSheet.appendRow([fecha, JSON.stringify(datos)]);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Dotación guardada' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'clearDotacion') {
      var fecha = body.fecha;
      var dotacionSheet = planSs.getSheetByName('DOTACION');
      if (!dotacionSheet || !fecha) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No encontrado' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var data = dotacionSheet.getDataRange().getValues();
      for (var i = data.length - 1; i >= 1; i--) {
        if (data[i][0] === fecha) {
          dotacionSheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Dotación eliminada' }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'No había datos' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'deleteRow') {
      var sheet = flightSs.getSheetByName('DATABASE') || flightSs.getSheets()[0];
      var rowIndex = body.rowIndex;
      if (typeof rowIndex === 'number' && rowIndex > 1) {
        sheet.deleteRow(rowIndex);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Fila eliminada' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveReporte') {
      var reporteSheet = planSs.getSheetByName('REPORTES');
      if (!reporteSheet) {
        reporteSheet = planSs.insertSheet('REPORTES');
        reporteSheet.getRange(1, 1, 1, 18).setValues([[
          'Fecha', 'Supervisor OLA', 'Supervisor LATAM', 'CDO OLA', 'CDO LATAM',
          'Estado', 'Operativos', 'Sin TICA', 'Ausencias', 'Extensiones',
          'Impacto', 'Fluidez', 'Equipos', 'Coordinación', 'Incidencias',
          'Disciplina', 'Pendientes', 'Fecha Registro'
        ]]);
      }
      var rep = body.reporte || {};
      var now = new Date();
      var fechaReg = now.toLocaleDateString('es-ES') + ' ' + now.toLocaleTimeString('es-ES');
      reporteSheet.appendRow([
        rep.fecha || '',
        rep.supOLA || '',
        rep.supLATAM || '',
        rep.cdoOLA || '',
        rep.cdoLATAM || '',
        rep.estado || '',
        rep.op || '',
        rep.sinTica || '',
        rep.aus || '',
        rep.ext || '',
        rep.impacto || '',
        rep.fluidez || '',
        rep.equipos || '',
        rep.coord || '',
        rep.incidencias || '',
        rep.disciplina || '',
        rep.pendientes || '',
        fechaReg
      ]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Reporte guardado' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── CONTROL AGENTES ──────────────────────────────────────
    if (action === 'saveAgentesTurno') {
      var agSheet = planSs.getSheetByName('AGENTES_TURNO');
      if (!agSheet) {
        agSheet = planSs.insertSheet('AGENTES_TURNO');
        agSheet.getRange(1, 1, 1, 8).setValues([[
          'RUT', 'Nombre', 'Rol', 'Turno Entrada', 'Turno Salida', 'Es LATAM', 'Es OLA', 'Fecha'
        ]]);
      }
      var fecha = body.fecha || '';
      var agentes = body.agentes || [];
      var existingAg = agSheet.getRange('A2:H' + agSheet.getLastRow()).getValues();
      var toDelete = [];
      for (var ai = existingAg.length - 1; ai >= 0; ai--) {
        if (existingAg[ai][7] === fecha) toDelete.push(ai + 2);
      }
      toDelete.sort(function(a, b) { return b - a; }).forEach(function(row) {
        agSheet.deleteRow(row);
      });
      agentes.forEach(function(ag) {
        agSheet.appendRow([
          ag.rut || '',
          ag.nombre || '',
          ag.rol || '',
          ag.entrada || '',
          ag.salida || '',
          ag.esLATAM ? 'SI' : 'NO',
          ag.esOLA ? 'SI' : 'NO',
          fecha
        ]);
      });
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Agentes guardados' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveVueloTurno') {
      var vlSheet = planSs.getSheetByName('VUELOS_TURNO');
      if (!vlSheet) {
        vlSheet = planSs.insertSheet('VUELOS_TURNO');
        vlSheet.getRange(1, 1, 1, 10).setValues([[
          'ID', 'Fecha', 'Tipo', 'Número', 'Hora', 'PAX', 'WCHC', 'Estado', 'Es Full Service', 'Aerolinea'
        ]]);
      }
      var vuelo = body.vuelo || {};
      var existingVl = vlSheet.getRange('A2:J' + vlSheet.getLastRow()).getValues();
      var foundVl = false;
      for (var vi = 1; vi < existingVl.length; vi++) {
        if (existingVl[vi][0] === vuelo.id) {
          vlSheet.getRange(vi + 1, 1, 1, 10).setValues([[
            vuelo.id || '',
            vuelo.fecha || '',
            vuelo.tipo || '',
            vuelo.numero || '',
            vuelo.hora || '',
            vuelo.pax || 0,
            vuelo.wchc || 0,
            vuelo.estado || 'pendiente',
            vuelo.esFullService ? 'SI' : 'NO',
            vuelo.aerolinea || ''
          ]]);
          foundVl = true;
          break;
        }
      }
      if (!foundVl) {
        vlSheet.appendRow([
          vuelo.id || '',
          vuelo.fecha || '',
          vuelo.tipo || '',
          vuelo.numero || '',
          vuelo.hora || '',
          vuelo.pax || 0,
          vuelo.wchc || 0,
          vuelo.estado || 'pendiente',
          vuelo.esFullService ? 'SI' : 'NO',
          vuelo.aerolinea || ''
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Vuelo guardado' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveAsignacion') {
      var asigSheet = planSs.getSheetByName('ASIGNACIONES_TURNO');
      if (!asigSheet) {
        asigSheet = planSs.insertSheet('ASIGNACIONES_TURNO');
        asigSheet.getRange(1, 1, 1, 8).setValues([[
          'ID', 'Fecha', 'Agente RUT', 'Vuelo ID', 'Tipo', 'Inicio', 'Fin', 'Estado'
        ]]);
      }
      var asig = body.asignacion || {};
      asigSheet.appendRow([
        asig.id || '',
        asig.fecha || '',
        asig.agenteRut || '',
        asig.vueloId || '',
        asig.tipo || '',
        asig.inicio || '',
        asig.fin || '',
        asig.estado || 'activa'
      ]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Asignación guardada' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'clearTurno') {
      var fecha = body.fecha || '';
      var sheetsToClear = ['AGENTES_TURNO', 'VUELOS_TURNO', 'ASIGNACIONES_TURNO'];
      var cleared = [];
      sheetsToClear.forEach(function(sn) {
        var sh = planSs.getSheetByName(sn);
        if (sh && sh.getLastRow() > 1) {
          var sd = sh.getRange('A2:Z' + sh.getLastRow()).getValues();
          for (var ci = sd.length - 1; ci >= 0; ci--) {
            if (sd[ci][0] === fecha || sd[ci][1] === fecha) {
              sh.deleteRow(ci + 2);
              cleared.push(sn);
            }
          }
        }
      });
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Turno limpiado', cleared: cleared }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var registros = body.registros || [];
    var sheet = flightSs.getSheetByName('DATABASE') || flightSs.getSheets()[0];

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 14).setValues([[
        'Fecha Registro',
        'Hora Registro',
        'Operación',
        'Aerolínea',
        'Vuelo',
        'ETA/ETD',
        'Puerta',
        'Hora Inicio',
        'Hora Término',
        'Total Asistencias',
        'Nombre Pasajero',
        'Atendido Por',
        'Asistencia',
        'Estado del Pasajero'
      ]]);
    }

    if (!registros.length) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Sin registros' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var rows = registros.map(function(r) {
      return [
        r.fechaRegistro || '',
        r.horaRegistro || '',
        r.operacion || '',
        r.aerolinea || '',
        r.vuelo || '',
        r.etaEtd || '',
        r.puerta || '',
        r.horaInicio || '',
        r.horaTermino || '',
        r.totalAsistencias || 0,
        r.nombrePasajero || '',
        r.atendidoPor || '',
        r.asistencia || '',
        r.estadoPasajero || ''
      ];
    });

    var rowsByAirline = {};
    registros.forEach(function(r) {
      var key = (r.aerolinea || '').trim();
      if (!key) return;
      if (!rowsByAirline[key]) rowsByAirline[key] = [];
      rowsByAirline[key].push([
        r.fechaRegistro || '',
        r.horaRegistro || '',
        r.operacion || '',
        r.aerolinea || '',
        r.vuelo || '',
        r.etaEtd || '',
        r.puerta || '',
        r.horaInicio || '',
        r.horaTermino || '',
        r.totalAsistencias || 0,
        r.nombrePasajero || '',
        r.atendidoPor || '',
        r.asistencia || '',
        r.estadoPasajero || ''
      ]);
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);

    Object.keys(rowsByAirline).forEach(function(name) {
      var airlineSheet = flightSs.getSheetByName(name);
      if (!airlineSheet) {
        airlineSheet = flightSs.insertSheet(name);
      }
      if (airlineSheet.getLastRow() === 0) {
        airlineSheet.getRange(1, 1, 1, 14).setValues([[
          'Fecha Registro',
          'Hora Registro',
          'Operación',
          'Aerolínea',
          'Vuelo',
          'ETA/ETD',
          'Puerta',
          'Hora Inicio',
          'Hora Término',
          'Total Asistencias',
          'Nombre Pasajero',
          'Atendido Por',
          'Asistencia',
          'Estado del Pasajero'
        ]]);
      }
      var airlineRows = rowsByAirline[name];
      airlineSheet.getRange(airlineSheet.getLastRow() + 1, 1, airlineRows.length, airlineRows[0].length).setValues(airlineRows);
    });

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Registros guardados', cantidad: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var flightSs = getFlightSpreadsheet();
    var planSs = getPlanSpreadsheet();
    var action = e.parameter.action;

    if (action === 'getDotacion') {
      var fecha = e.parameter.fecha;
      var dotacionSheet = planSs.getSheetByName('DOTACION');
      if (!dotacionSheet || !fecha) {
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var dotData = dotacionSheet.getDataRange().getValues();
      for (var j = 1; j < dotData.length; j++) {
        if (dotData[j][0] === fecha) {
          var parsed = [];
          try { parsed = JSON.parse(dotData[j][1] || '[]'); } catch (err) { parsed = []; }
          return ContentService.createTextOutput(JSON.stringify({ success: true, data: parsed }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'getAirlines') {
      var configSheet = flightSs.getSheetByName('CONFIG');
      if (!configSheet || configSheet.getLastRow() === 0) {
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var cfgData = configSheet.getDataRange().getValues();
      for (var k = 1; k < cfgData.length; k++) {
        if (cfgData[k][0] === 'airlines') {
          var airlinesList = [];
          try { airlinesList = JSON.parse(cfgData[k][1] || '[]'); } catch (err) { airlinesList = []; }
          return ContentService.createTextOutput(JSON.stringify({ success: true, data: airlinesList }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'createSheet') {
      var name = e.parameter.name || '';
      if (!name) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Falta nombre' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      if (flightSs.getSheetByName(name)) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'La hoja ya existe' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      flightSs.insertSheet(name);
      var configSheet2 = flightSs.getSheetByName('CONFIG');
      if (!configSheet2) {
        configSheet2 = flightSs.insertSheet('CONFIG');
        configSheet2.getRange('A1').setValue('key');
        configSheet2.getRange('B1').setValue('value');
      }
      var cfgData2 = configSheet2.getRange('A2:B' + configSheet2.getLastRow()).getValues();
      var airlinesList2 = [];
      var found2 = false;
      for (var m = 1; m < cfgData2.length; m++) {
        if (cfgData2[m][0] === 'airlines') {
          try { airlinesList2 = JSON.parse(cfgData2[m][1] || '[]'); } catch (err) { airlinesList2 = []; }
          if (airlinesList2.indexOf(name) === -1) {
            airlinesList2.push(name);
            configSheet2.getRange(m + 1, 2).setValue(JSON.stringify(airlinesList2));
          }
          found2 = true;
          break;
        }
      }
      if (!found2) {
        airlinesList2.push(name);
        configSheet2.appendRow(['airlines', JSON.stringify(airlinesList2)]);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Aerolínea creada' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'deleteAirlineRecords') {
      var airline = e.parameter.airline || '';
      if (!airline) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Falta aerolínea' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var dbSheet = flightSs.getSheetByName('DATABASE');
      if (dbSheet && dbSheet.getLastRow() > 1) {
        var dbData = dbSheet.getDataRange().getValues();
        for (var n = dbData.length - 1; n >= 1; n--) {
          if ((dbData[n][3] || '') === airline) {
            dbSheet.deleteRow(n + 1);
          }
        }
      }
      var airSheet = flightSs.getSheetByName(airline);
      if (airSheet) {
        flightSs.deleteSheet(airSheet);
      }
      var configSheet3 = flightSs.getSheetByName('CONFIG');
      if (configSheet3 && configSheet3.getLastRow() > 1) {
        var cfgData3 = configSheet3.getRange('A2:B' + configSheet3.getLastRow()).getValues();
        for (var p = 1; p < cfgData3.length; p++) {
          if (cfgData3[p][0] === 'airlines') {
            var airlinesList3 = [];
            try { airlinesList3 = JSON.parse(cfgData3[p][1] || '[]'); } catch (err) { airlinesList3 = []; }
            airlinesList3 = airlinesList3.filter(function(a) { return a !== airline; });
            configSheet3.getRange(p + 1, 2).setValue(JSON.stringify(airlinesList3));
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Aerolínea eliminada' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'getReportes') {
      var repSheet = planSs.getSheetByName('REPORTES');
      if (!repSheet || repSheet.getLastRow() === 0) {
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var repData = repSheet.getDataRange().getValues();
      var repHeaders = repData[0];
      var reportes = repData.slice(1).map(function(row) {
        var obj = {};
        repHeaders.forEach(function(h, i) {
          obj[h] = row[i] !== undefined ? row[i] : '';
        });
        return obj;
      }).reverse();
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: reportes }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'getAusentes') {
      var fecha = e.parameter.fecha;
      var ausentes = [];
      if (fecha) {
        var ctrlSheet = planSs.getSheetByName('CONTROL');
        if (ctrlSheet && ctrlSheet.getLastRow() > 1) {
          var ctrlData = ctrlSheet.getDataRange().getValues();
          for (var q = 1; q < ctrlData.length; q++) {
            var row = ctrlData[q];
            if (row[0] === 'AUSENTE' && row[1] === fecha) {
              ausentes.push(row[2] || '');
            }
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: ausentes }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'getSinTica') {
      var fecha = e.parameter.fecha;
      var sinTica = [];
      if (fecha) {
        var ctrlSheet2 = planSs.getSheetByName('CONTROL');
        if (ctrlSheet2 && ctrlSheet2.getLastRow() > 1) {
          var ctrlData2 = ctrlSheet2.getDataRange().getValues();
          for (var r = 1; r < ctrlData2.length; r++) {
            var row2 = ctrlData2[r];
            if (row2[0] === 'SIN TICA' && row2[1] === fecha) {
              sinTica.push(row2[2] || '');
            }
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: sinTica }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── CONTROL AGENTES GET ──────────────────────────────────
    if (action === 'getAgentesTurno') {
      var fecha = e.parameter.fecha;
      var agSheet = planSs.getSheetByName('AGENTES_TURNO');
      if (!agSheet || !fecha) {
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var agData = agSheet.getDataRange().getValues();
      var agHeaders = agData[0];
      var agentes = agData.slice(1).map(function(row) {
        var obj = {};
        agHeaders.forEach(function(h, i) {
          obj[h] = row[i] !== undefined ? row[i] : '';
        });
        return obj;
      }).filter(function(a) { return a.Fecha === fecha; });
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: agentes }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'getVuelosTurno') {
      var fecha = e.parameter.fecha;
      var vlSheet = planSs.getSheetByName('VUELOS_TURNO');
      if (!vlSheet || !fecha) {
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var vlData = vlSheet.getDataRange().getValues();
      var vlHeaders = vlData[0];
      var vuelos = vlData.slice(1).map(function(row) {
        var obj = {};
        vlHeaders.forEach(function(h, i) {
          obj[h] = row[i] !== undefined ? row[i] : '';
        });
        return obj;
      }).filter(function(v) { return v.Fecha === fecha; });
      vuelos.sort(function(a, b) { return (a.Hora || '').localeCompare(b.Hora || ''); });
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: vuelos }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'getAsignacionesTurno') {
      var fecha = e.parameter.fecha;
      var asigSheet = planSs.getSheetByName('ASIGNACIONES_TURNO');
      if (!asigSheet || !fecha) {
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var asigData = asigSheet.getDataRange().getValues();
      var asigHeaders = asigData[0];
      var asignaciones = asigData.slice(1).map(function(row) {
        var obj = {};
        asigHeaders.forEach(function(h, i) {
          obj[h] = row[i] !== undefined ? row[i] : '';
        });
        return obj;
      }).filter(function(a) { return a.Fecha === fecha; });
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: asignaciones }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = flightSs.getSheetByName('DATABASE') || flightSs.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    if (data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: [], headers: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var headers = data[0];
    var rows = data.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) {
        obj[h] = row[i] !== undefined ? row[i] : '';
      });
      return obj;
    });
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: rows, headers: headers }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}