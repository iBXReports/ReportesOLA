# Plan: Rediseño Pestaña "👮 Control Agentes"

## 1. Resumen de Requerimientos

### 1.1 Carga de Agentes
- Pegar listado desde Excel con formato: `RUT | Nombre | Rol | Turno`
- Ejemplo: `28.181.429-K	SIRIT GIMENEZ FABIAN JESUS	FT LATAM	M0413`
- Roles: `FT LATAM`, `FT OLA`, `PT LATAM`, `PT OLA`, `CARRO`, `OLA`, `LATAM`
- Turnos: `MXXXX` donde primeros 2 dígitos = hora entrada (AM/PM), últimos 2 = hora salida
  - `M0413` = 04:00 AM a 13:00 PM
  - `M0716` = 07:00 AM a 16:00 PM
  - `M1720` = 17:00 PM a 20:00 PM

### 1.2 Gestión de Vuelos
- Crear vuelos con: Tipo (ARRIBO/EMBARQUE), Número, ETA/ETD, PAX, WCHC (opcional)
- Listar vuelos ordenados por hora
- Editar/eliminar vuelos

### 1.3 Motor de Asignación Automática
**Reglas de dotación:**
- Tramos completos (DL, AC, KL, AF): 1 agente por PAX
- Resto aerolíneas: 1 agente por cada 3 PAX (redondeo hacia arriba)
- WCHC: +1 agente adicional para ese pasajero
- LATAM agents → vuelos LA preferentemente
- OLA agents → resto de aerolíneas
- Préstamo: agentes LATAM pueden cubrir OLA y viceversa (máximo 2 por turno)

**Tiempos de liberación:**
- Tramos completos (DL, AC, KL, AF): 1 hora para volver a estar disponible
- Resto arribos: 20 minutos
- Resto embarques: 30-40 minutos (usar 35 min promedio)
- WCHC: +15 min adicional

**Colaciones:**
- 1 hora de colación
- Programar entre 4-5 horas después del inicio del turno
- No asignar vuelos durante colación
- Priorizar agentes que lleven más tiempo sin colación

**Carrito (Solo supervisores en arribos de AF, KL, AC, DL):**
- Capacidad: 7 pasajeros
- Tiempo viaje MINSAL → Puente: 8 minutos
- Solo supervisor OLA puede ir
- Prioridad: AF > KL > AC > DL

**Counters para Embarques Full Service (DL, AC, KL, AF):**
- Agentes de counter = mismos agentes que embarcan
- Cantidad de counters = ceil(PAX / 10) mínimo 1
- Tiempo counter: 30 min antes del embarque

### 1.4 Timers Visuales
- Colación: countdown desde 60:00
- Disponibilidad post-vuelo: countdown según tipo de vuelo
- Alertas visuales cuando timer llega a 0

### 1.5 UI Timeline
- Vista de línea de tiempo por agente
- Vista de línea de tiempo por vuelo
- Indicadores de estado: Disponible, Asignado, En colación, Libre (timer)

## 2. Modelo de Datos

### 2.1 Agente
```javascript
{
  rut: "28.181.429-K",
  nombre: "SIRIT GIMENEZ FABIAN JESUS",
  rol: "FT LATAM", // FT LATAM | FT OLA | PT LATAM | PT OLA | CARRO | OLA | LATAM
  turno: {
    entrada: "04:00",
    salida: "13:00",
    inicio: "04:00 AM",
    fin: "01:00 PM"
  },
  estado: "disponible", // disponible | asignado | colacion | libre
  colacionTimer: null, // timestamp fin colación
  libreTimer: null, // timestamp fin bloqueo
  vueloAsignado: null, // ID vuelo actual
  tipoAsignacion: null, // arribo | embarque | counter
  esLATAM: true, // rol contiene LATAM
  esOLA: true, // rol contiene OLA o es CARRO
  esFullTime: true, // FT vs PT
  esSupervisor: false
}
```

### 2.2 Vuelo
```javascript
{
  id: "uuid",
  tipo: "ARRIBO", // ARRIBO | EMBARQUE
  numero: "DL147",
  aerolinea: "DL",
  hora: "07:50",
  pax: 0,
  wchc: 0, // cantidad WCHC
  agentesAsignados: [], // array de RUTs
  agentesCounters: [], // RUTs para counter (embarques full service)
  supervisorAsignado: null, // RUT supervisor para carrito
  estado: "pendiente", // pendiente | en_curso | completado
  esFullService: true, // DL, AC, KL, AF
  prioridad: 1 // AF=1, KL=2, AC=3, DL=4, resto=5
}
```

### 2.3 Asignación
```javascript
{
  id: "uuid",
  agenteRut: "28.181.429-K",
  vueloId: "uuid-vuelo",
  tipo: "arribo", // arribo | embarque | counter | carrito
  inicio: timestamp,
  fin: timestamp,
  estado: "activa" // activa | completada | cancelada
}
```

### 2.4 Estado del Turno
```javascript
{
  fecha: "2026-11-20",
  agentes: [],
  vuelos: [],
  asignaciones: [],
  ultimaActualizacion: timestamp
}
```

## 3. UI - Pestaña Control Agentes

### 3.1 Header con Botones de Acción
```
[📋 Pegar Agentes Excel] [✈️ Nuevo Vuelo] [🔄 Actualizar] [🧹 Limpiar Todo]
```

### 3.2 Sección: Resumen del Turno
```
📊 RESUMEN DEL TURNO
Agentes Totales: 30 | Disponibles: 12 | Asignados: 15 | En Colación: 3
Vuelos Totales: 18 | Pendientes: 10 | En Curso: 5 | Completados: 3
Próxima Colación: 10:30 - SIRIT GIMENEZ
```

### 3.3 Sección: Lista de Agentes
Tabla con columnas:
| RUT | Nombre | Rol | Turno | Estado | Timer | Asignación |
|-----|--------|-----|-------|--------|-------|------------|
| 28.181.429-K | SIRIT GIMENEZ | FT LATAM | 04:00-13:00 | 🟢 Disponible | — | — |
| 19.884.107-2 | LOPEZ ANTIQUEO | FT LATAM | 04:00-13:00 | 🔴 Asignado | 45:00 | DL147 Arribo |

Filtros: Por rol, Por estado, Por aerolínea preferida

### 3.4 Sección: Gestión de Vuelos
Tabla ordenada por hora:
| Hora | Tipo | Vuelo | PAX | WCHC | Agentes Necesarios | Asignados | Estado |
|------|------|-------|-----|------|-------------------|-----------|--------|
| 07:50 | ARRIBO | DL147 | 0 | 0 | 0 | — | Pendiente |
| 09:00 | ARRIBO | QF27 | 1 | 0 | 1 | SIRIT GIMENEZ | En Curso |

Botón: [+ Agregar Vuelo] → Modal con: Tipo, Vuelo, Hora, PAX, WCHC checkbox

### 3.5 Sección: Timeline de Agentes
Vista horizontal por agente:
```
SIRIT GIMENEZ (04:00-13:00)
04:00 ██████████████████████████████████████████████ 13:00
      ├── DL147 Arribo (07:50-08:50)
      ├── Colación (10:00-11:00)
      └── Disponible
```

### 3.6 Sección: Timers Activos
Cards flotantes:
```
⏱️ COLACIÓN: SIRIT GIMENEZ
   Tiempo restante: 42:15
   [Finalizar Colación]

⏱️ DISPONIBLE: LOPEZ ANTIQUEO
   Motivo: Liberado de DL147
   Tiempo restante: 38:20
```

### 3.7 Sección: Alertas y Conflictos
```
⚠️ CONFLICTOS DETECTADOS
• Vuelo AF406 (09:40) requiere 16 agentes, solo hay 12 disponibles
• Agente PALMA CANALES en colación hasta 10:30, asignado a AR1282 (14:15)
• Supervisor OLA no disponible para carrito en KL701 (11:40)
```

## 4. Motor de Asignación (Algoritmo)

### 4.1 Algoritmo Principal
```
1. Ordenar vuelos por hora (más próximo primero)
2. Para cada vuelo pendiente:
   a. Calcular agentes necesarios:
      - Full service (DL, AC, KL, AF): PAX + WCHC
      - Resto: ceil(PAX / 3) + WCHC
   b. Filtrar agentes disponibles:
      - Rol compatible (LATAM ↔ LA, OLA ↔ resto)
      - Turno activo (hora actual entre entrada y salida)
      - No en colación
      - No bloqueado (timer libre = 0)
   c. Priorizar:
      - Agentes del rol correcto (LATAM para LA, OLA para resto)
      - Agentes con más tiempo disponible
      - Agentes PT antes que FT (para equilibrar carga)
   d. Asignar agentes al vuelo
   e. Marcar agentes como "Asignado" con timer de liberación
3. Programar colaciones:
   - Para cada agente, calcular hora óptima (inicio + 4-5h)
   - Si hay conflicto con vuelo, reprogramar
   - Marcar agente como "En Colación" con timer 60 min
4. Asignar supervisores a carritos:
   - Solo vuelos AF, KL, AC, DL (arribos)
   - Solo supervisor OLA disponible
   - Timer: 8 min viaje + tiempo en puerta
```

### 4.2 Lógica de Préstamo LATAM/OLA
```
- Máximo 2 agentes prestados por turno
- Priorizar préstamo cuando hay déficit > 3 agentes
- Registrar préstamo para auditoría
- Agente prestado mantiene su rol original para colaciones
```

### 4.3 Cálculo de Agentes Necesarios
```javascript
function calcularAgentesNecesarios(vuelo) {
  let base = 0;
  if (vuelo.esFullService) {
    base = vuelo.pax;
  } else {
    base = Math.ceil(vuelo.pax / 3);
  }
  
  // WCHC requiere agente adicional dedicado
  const wchcExtra = vuelo.wchc > 0 ? Math.ceil(vuelo.wchc / 2) : 0;
  
  // Counters para embarques full service
  let counters = 0;
  if (vuelo.tipo === "EMBARQUE" && vuelo.esFullService) {
    counters = Math.max(1, Math.ceil(vuelo.pax / 10));
  }
  
  return {
    agentesArribo: base + wchcExtra,
    agentesCounter: counters,
    total: base + wchcExtra + counters
  };
}
```

### 4.4 Timers de Liberación
```javascript
function calcularTimerLiberacion(vuelo) {
  if (vuelo.esFullService) {
    return 60 * 60 * 1000; // 1 hora
  }
  if (vuelo.tipo === "ARRIBO") {
    return 20 * 60 * 1000; // 20 minutos
  }
  return 35 * 60 * 1000; // 35 minutos (embarque regular)
}
```

## 5. Backend - Google Apps Script

### 5.1 Nuevas Hojas en Spreadsheet Planificación
- `AGENTES_TURNO`: RUT, Nombre, Rol, Turno Entrada, Turno Salida, Estado, Fecha
- `VUELOS_TURNO`: ID, Fecha, Tipo, Número, Hora, PAX, WCHC, Estado
- `ASIGNACIONES_TURNO`: ID, Fecha, Agente RUT, Vuelo ID, Tipo, Inicio, Fin, Estado
- `TURNOS_CONFIG`: Fecha, Hora Inicio Turno, Hora Fin Turno, Supervisor OLA, Supervisor LATAM

### 5.2 Endpoints Nuevos
- `POST saveAgentesTurno` - Guardar listado de agentes
- `GET getAgentesTurno` - Obtener agentes del turno
- `POST saveVueloTurno` - Guardar vuelo
- `GET getVuelosTurno` - Obtener vuelos del turno
- `POST saveAsignacion` - Guardar asignación
- `GET getAsignacionesTurno` - Obtener asignaciones
- `POST clearTurno` - Limpiar turno completo

## 6. Archivos a Modificar

### 6.1 `admin.html`
- Reemplazar contenido de `#planificacion-control-agentes`
- Agregar modales: Modal Nuevo Vuelo, Modal Pegar Agentes, Modal Confirmar Limpieza
- Agregar sección de timers flotantes
- Agregar sección de alertas

### 6.2 `js/app.js`
- Agregar funciones de parseo de agentes
- Agregar funciones de parseo de turnos MXXXX
- Agregar motor de asignación automática
- Agregar funciones de timers
- Agregar funciones de renderizado de tablas
- Agregar funciones de drag & drop para reasignar agentes

### 6.3 `js/gas-code.js`
- Agregar endpoints para agentes, vuelos, asignaciones
- Agregar lógica de persistencia en nuevas hojas

### 6.4 `css/styles.css`
- Estilos para timeline
- Estilos para timers
- Estilos para alertas
- Estilos para drag & drop
- Estilos para badges de estado

## 7. Priorización de Implementación

### Fase 1 (Crítico)
1. Carga de agentes (pegar Excel)
2. Parseo de turnos MXXXX
3. Gestión básica de vuelos (crear/listar)
4. Cálculo de agentes necesarios

### Fase 2 (Importante)
5. Motor de asignación automática básico
6. Timers de liberación
7. Colaciones automáticas

### Fase 3 (Avanzado)
8. Timeline visual
9. Drag & drop para reasignación manual
10. Carrito supervisores
11. Counters para embarques
12. Sistema de préstamo LATAM/OLA

## 8. Preguntas Pendientes

1. ¿Los agentes se cargan una vez por día o se mantienen entre días?
2. ¿Qué hacer si un agente no tiene turno definido (MXXXX)?
3. ¿Los supervisores también se cargan en el listado de agentes?
4. ¿Hay límite máximo de agentes prestados LATAM↔OLA?
5. ¿Los vuelos se crean manualmente o se importan de algún sistema externo?
6. ¿La colación es obligatoria o el supervisor puede saltarla?