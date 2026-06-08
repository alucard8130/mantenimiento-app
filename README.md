# 🔧 MantenimientoApp

Sistema profesional de gestión de mantenimiento para empresas de servicios. Permite crear reportes de inspección con fotos y hallazgos, generar presupuestos detallados, gestionar el ciclo completo de autorización del cliente, programar actividades con cronograma y dar seguimiento hasta el cierre y visto bueno del trabajo.

---

## ✨ Módulos y funcionalidades

### 🔐 Autenticación — Registro y Login
- Cualquier persona puede **crear su cuenta** con nombre, correo y contraseña
- Pantalla con dos pestañas: **Iniciar Sesión** y **Crear Cuenta**
- Validaciones: correo único, mínimo 6 caracteres, confirmación de contraseña
- Elección de perfil al registrarse: **Administrador** o **Técnico**
- El primer usuario registrado (aparte del superusuario) queda como **Admin automáticamente**
- Sesión persistente: al cerrar y reabrir el navegador se mantiene la sesión activa
- Usuarios guardados en `localStorage`; se conservan aunque se recargue la página

---



### 👥 Gestión de Usuarios *(Admin y Super Admin)*
- Alta de nuevos usuarios con nombre, correo, contraseña y rol
- Edición de datos y cambio de contraseña
- Eliminación de usuarios (no se puede eliminar el superusuario ni la cuenta activa)
- Vista de todos los usuarios con su rol, correo y fecha de registro
- Badges visuales por rol: ⭐ Super Admin / 👑 Admin / 🔧 Técnico

---

### 📋 Reportes de Mantenimiento

#### Creación según rol
| Rol | Comportamiento |
|---|---|
| **Técnico** | Se asigna a sí mismo automáticamente. Campo bloqueado con 🔒 |
| **Admin / Super Admin** | Elige manualmente el técnico asignado de la lista de técnicos |

#### Datos del reporte
- Folio automático (MNT-XXXX)
- Cliente, título, fecha de inspección
- Descripción general de observaciones
- Registro de **hallazgos** por severidad: 🔴 Alta / 🟡 Media / 🟢 Baja
- Carga de **fotos de evidencia** desde el dispositivo
- **Creado por** — nombre del usuario que generó el reporte
- **Técnico asignado** — quien ejecuta el trabajo

#### Visualización en lista
Cada tarjeta muestra: folio, estado, cliente, fecha, ✍️ creado por, 👤 asignado (si es diferente al creador), hallazgos críticos y avance del cronograma.

---

### 💰 Presupuestos
- Tabla de partidas: concepto, unidad, cantidad, precio unitario, total
- Cálculo automático de subtotal, IVA (16%) y total
- Slider para configurar el **% de anticipo** (10%–80%)
- Registro de anticipo pagado y pago final al cierre
- Exportación a **PDF profesional** listo para imprimir o firmar

#### El PDF incluye:
- Encabezado con folio, fecha y datos de la empresa
- Datos del cliente, RFC y persona de contacto
- Técnico asignado
- Tabla de hallazgos con severidad por colores
- Tabla de partidas con precios e IVA
- Resumen de totales y condiciones de pago (anticipo + resto)
- Espacio para firma de autorización del cliente

---

### 🔄 Flujo de autorización

El sistema guía cada reporte por un ciclo controlado de estados:

```
Borrador → Enviado → Autorizado → Anticipo Pagado → En Proceso → Completado → Visto Bueno ✓
          ↓
       Rechazado
```

| Estado | Descripción |
|---|---|
| **Borrador** | Reporte creado, presupuesto en edición |
| **Enviado** | Presupuesto enviado al cliente para revisión |
| **Autorizado** | Cliente aprobó el presupuesto |
| **Anticipo Pagado** | Se registró el pago del anticipo acordado |
| **En Proceso** | Trabajos en ejecución |
| **Completado** | Trabajos concluidos, esperando revisión del cliente |
| **Visto Bueno ✓** | Cliente aprobó el trabajo y se registró el pago final |
| **Rechazado** | Cliente rechazó el presupuesto |

Cada transición genera una **notificación automática** y queda registrada en la bitácora con fecha y usuario.

---

### 📅 Cronograma de Actividades
- Desglose de actividades con fechas de inicio y fin
- Responsable por actividad
- Control de avance individual (0–100%) con barra de progreso
- Estados por actividad: Pendiente / En Curso / Completada
- Indicador de **avance general del proyecto**

---

### 🕐 Bitácora de Seguimiento
- Historial completo de eventos con fecha y nombre del usuario
- Registro automático de cada cambio de estado
- Campo para agregar **notas manuales** de seguimiento (llamadas, acuerdos, incidencias)
- Trazabilidad total desde la creación hasta el cierre

---

### 🏢 Gestión de Clientes
- Alta, edición y eliminación de clientes
- Campos: razón social, RFC, correo, teléfono, dirección, persona de contacto, estatus
- Contador de reportes asociados por cliente
- Protección: no se puede eliminar un cliente que tenga reportes activos

---

### 🔔 Notificaciones
- Alertas automáticas en cada evento del flujo de autorización
- Tipos: ✓ Éxito / ⚠ Advertencia / ℹ Información / ✕ Error
- Badge con conteo de no leídas en el menú de navegación
- Clic en notificación → abre el reporte relacionado directamente
- Marcar individualmente o todas como leídas
- Eliminación individual de notificaciones

---


## 🛠️ Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| React 18 | Framework principal |
| React Hooks | `useState`, `useCallback`, `useRef` |
| localStorage | Persistencia de usuarios y sesión |
| CSS-in-JS | Estilos inline con variables reutilizables |
| Google Fonts | DM Sans + JetBrains Mono |
| Window.print API | Exportación a PDF via diálogo de impresión |

---

## 🔒 Seguridad y reglas de negocio

- El **superusuario no puede ser eliminado ni editado** desde ninguna pantalla
- Un **técnico no puede asignarse a otro usuario** — siempre es el autor del reporte
- Un **admin debe seleccionar manualmente** el técnico al crear un reporte
- No se puede eliminar la **cuenta de sesión activa**
- No se puede eliminar un **cliente con reportes asociados**
- Los datos se validan antes de guardar en todos los formularios

---

## 📌 Notas importantes

- Los **reportes, clientes y notificaciones** viven en memoria durante la sesión (se resetean al recargar). Para persistencia completa se requiere un backend.
- Los **usuarios y la sesión** sí persisten en `localStorage`.
- El PDF se genera usando el diálogo de impresión del navegador. Para exportación directa a archivo se puede integrar `jsPDF` o `react-pdf`.

---

## 📬 Próximas mejoras sugeridas

- [ ] Backend con base de datos (Node.js + PostgreSQL / Firebase / Supabase)
- [ ] Persistencia completa de reportes y clientes en base de datos
- [ ] Envío real de presupuesto por correo electrónico al cliente
- [ ] Portal del cliente para autorizar presupuesto en línea con firma digital
- [ ] Galería de fotos con visor de pantalla completa
- [ ] Reportes y estadísticas avanzadas (ingresos, tiempos, técnicos más activos)
- [ ] App móvil con cámara integrada para captura en campo
- [ ] Notificaciones push y/o por WhatsApp

---

> **MantenimientoApp v2.0** · Desarrollado con React por Jaime Martin Estrada Bernabe Derechos reservados 

