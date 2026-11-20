var FLIGHT_SPREADSHEET_ID = '1toTzYwuBvz7vaXNVGtWyVSevHWOZdooEoKjR-3wKlnc';

function getFlightSpreadsheet() {
  return SpreadsheetApp.openById(FLIGHT_SPREADSHEET_ID);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || 'write';
    var flightSs = getFlightSpreadsheet();

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
      var agentSheet = flightSs.getSheetByName('AGENTES');
      if (!agentSheet) {
        agentSheet = flightSs.insertSheet('AGENTES');
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
      var dotacionSheet = flightSs.getSheetByName('DOTACION');
      if (!dotacionSheet) {
        dotacionSheet = flightSs.insertSheet('DOTACION');
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
      var dotacionSheet = flightSs.getSheetByName('DOTACION');
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
      var reporteSheet = flightSs.getSheetByName('REPORTES');
      if (!reporteSheet) {
        reporteSheet = flightSs.insertSheet('REPORTES');
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

    // ── CONTROL AGENTES (usando CONFIG del spreadsheet de vuelos) ──
    if (action === 'saveAgentesTurno') {
      var configSheet = flightSs.getSheetByName('CONFIG');
      if (!configSheet) {
        configSheet = flightSs.insertSheet('CONFIG');
        configSheet.getRange('A1').setValue('key');
        configSheet.getRange('B1').setValue('value');
      }
      var fecha = body.fecha || '';
      var agentes = body.agentes || [];

      var cfgData = configSheet.getRange('A2:B' + configSheet.getLastRow()).getValues();
      var foundKey = false;
      for (var ci = 1; ci < cfgData.length; ci++) {
        if (cfgData[ci][0] === 'agentes_' + fecha) {
          configSheet.getRange(ci + 1, 2).setValue(JSON.stringify(agentes));
          foundKey = true;
          break;
        }
      }
      if (!foundKey) {
        configSheet.appendRow(['agentes_' + fecha, JSON.stringify(agentes)]);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Agentes guardados' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveVueloTurno') {
      var vuelo = body.vuelo || {};
      var fecha = vuelo.fecha || '';

      var cfgData2 = configSheet.getRange('A2:B' + configSheet.getLastRow()).getValues();
      var vuelosKey = 'vuelos_' + fecha;
      var vuelosList = [];
      var foundVlKey = false;
      for (var vi = 1; vi < cfgData2.length; vi++) {
        if (cfgData2[vi][0] === vuelosKey) {
          try { vuelosList = JSON.parse(cfgData2[vi][1] || '[]'); } catch (e) { vuelosList = []; }
          foundVlKey = true;
          break;
        }
      }

      var existingIdx = -1;
      for (var ei = 0; ei < vuelosList.length; ei++) {
        if (vuelosList[ei].id === vuelo.id) { existingIdx = ei; break; }
      }
      if (existingIdx >= 0) {
        vuelosList[existingIdx] = vuelo;
      } else {
        vuelosList.push(vuelo);
      }

      if (foundVlKey) {
        for (var vj = 1; vj < cfgData2.length; vj++) {
          if (cfgData2[vj][0] === vuelosKey) {
            configSheet.getRange(vj + 1, 2).setValue(JSON.stringify(vuelosList));
            break;
          }
        }
      } else {
        configSheet.appendRow([vuelosKey, JSON.stringify(vuelosList)]);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Vuelo guardado' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveAsignacion') {
      var asig = body.asignacion || {};
      var fecha = asig.fecha || '';

      var cfgData3 = configSheet.getRange('A2:B' + configSheet.getLastRow()).getValues();
      var asigKey = 'asignaciones_' + fecha;
      var asigList = [];
      var foundAsigKey = false;
      for (var ai = 1; ai < cfgData3.length; ai++) {
        if (cfgData3[ai][0] === asigKey) {
          try { asigList = JSON.parse(cfgData3[ai][1] || '[]'); } catch (e) { asigList = []; }
          foundAsigKey = true;
          break;
        }
      }

      asigList.push(asig);

      if (foundAsigKey) {
        for (var aj = 1; aj < cfgData3.length; aj++) {
          if (cfgData3[aj][0] === asigKey) {
            configSheet.getRange(aj + 1, 2).setValue(JSON.stringify(asigList));
            break;
          }
        }
      } else {
        configSheet.appendRow([asigKey, JSON.stringify(asigList)]);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Asignación guardada' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'clearTurno') {
      var fecha = body.fecha || '';
      var cfgData4 = configSheet.getRange('A2:B' + configSheet.getLastRow()).getValues();
      var keysToDelete = ['agentes_' + fecha, 'vuelos_' + fecha, 'asignaciones_' + fecha];
      for (var di = cfgData4.length - 1; di >= 0; di--) {
        if (keysToDelete.indexOf(cfgData4[di][0]) >= 0) {
          configSheet.deleteRow(di + 2);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Turno limpiado' }))
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
    var action = e.parameter.action;

    if (action === 'getDotacion') {
      var fecha = e.parameter.fecha;
      var dotacionSheet = flightSs.getSheetByName('DOTACION');
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
      var repSheet = flightSs.getSheetByName('REPORTES');
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
        var ctrlSheet = flightSs.getSheetByName('CONTROL');
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
        var ctrlSheet2 = flightSs.getSheetByName('CONTROL');
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

    // ── CONTROL AGENTES GET (desde CONFIG del spreadsheet de vuelos) ──
    var configSheet = flightSs.getSheetByName('CONFIG');
    if (!configSheet || configSheet.getLastRow() === 0) {
      if (action === 'getAgentesTurno' || action === 'getVuelosTurno' || action === 'getAsignacionesTurno') {
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } else {
      var cfgData = configSheet.getRange('A2:B' + configSheet.getLastRow()).getValues();
      var getKey = function(keyName) {
        for (var ki = 0; ki < cfgData.length; ki++) {
          if (cfgData[ki][0] === keyName) {
            try { return JSON.parse(cfgData[ki][1] || '[]'); } catch (e) { return []; }
          }
        }
        return [];
      };

      if (action === 'getAgentesTurno') {
        var fecha = e.parameter.fecha;
        var agentes = getKey('agentes_' + fecha);
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: agentes }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      if (action === 'getVuelosTurno') {
        var fecha = e.parameter.fecha;
        var vuelos = getKey('vuelos_' + fecha);
        vuelos.sort(function(a, b) { return (a.hora || '').localeCompare(b.hora || ''); });
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: vuelos }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      if (action === 'getAsignacionesTurno') {
        var fecha = e.parameter.fecha;
        var asignaciones = getKey('asignaciones_' + fecha);
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: asignaciones }))
          .setMimeType(ContentService.MimeType.JSON);
      }
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