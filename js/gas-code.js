var SPREADSHEET_ID = '13oIthxggFMQP8l_4RHCyQ7XjvbVtMq0EMRaDNN2e2TA';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || 'write';
    var ss = getSpreadsheet();

    if (action === 'saveAirlines') {
      var configSheet = ss.getSheetByName('CONFIG') || ss.getSheets()[0];
      if (!ss.getSheetByName('CONFIG')) {
        configSheet = ss.insertSheet('CONFIG');
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
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Aerolineas guardadas' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveAgents') {
      var agents = body.agents || [];
      var agentSheet = ss.getSheetByName('AGENTES');
      if (!agentSheet) {
        agentSheet = ss.insertSheet('AGENTES');
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
      var dotacionSheet = ss.getSheetByName('DOTACION');
      if (!dotacionSheet) {
        dotacionSheet = ss.insertSheet('DOTACION');
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
      var dotacionSheet = ss.getSheetByName('DOTACION');
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
      var sheet = ss.getSheetByName('DATABASE') || ss.getSheets()[0];
      var rowIndex = body.rowIndex;
      if (typeof rowIndex === 'number' && rowIndex > 1) {
        sheet.deleteRow(rowIndex);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Fila eliminada' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var registros = body.registros || [];
    var sheet = ss.getSheetByName('DATABASE') || ss.getSheets()[0];

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
      var airlineSheet = ss.getSheetByName(name);
      if (!airlineSheet) {
        airlineSheet = ss.insertSheet(name);
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
    var ss = getSpreadsheet();
    var action = e.parameter.action;

    if (action === 'getDotacion') {
      var fecha = e.parameter.fecha;
      var dotacionSheet = ss.getSheetByName('DOTACION');
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

    var sheet = ss.getSheetByName('DATABASE') || ss.getSheets()[0];
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