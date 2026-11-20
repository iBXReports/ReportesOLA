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