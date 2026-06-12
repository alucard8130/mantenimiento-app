# MantPro — Gestión Profesional de Mantenimiento

**MantPro** es una aplicación web y móvil para empresas y técnicos de mantenimiento. Gestiona reportes, presupuestos, cronogramas, materiales y análisis de rentabilidad en tiempo real.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18, DM Sans, CSS in JS |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Pagos | Stripe (suscripciones mensuales) |
| Mobile | Capacitor (Android / iOS) |
| Deploy Web | Vercel |
| Deploy Mobile | Google Play Store |

---

## Módulos

### 📋 Reportes de Mantenimiento
- Folio automático `MNT-XXXX`
- Hallazgos por severidad (Alta / Media / Baja)
- Fotos desde cámara nativa o galería (Android/iOS)
- Flujo completo de estados con bitácora automática
- Exportación a PDF profesional con firma de autorización

### 💰 Presupuestos
- Partidas con unidades, cantidades y precios unitarios
- Impuesto configurable por idioma (IVA 16% MX / Tax configurable EUA)
- Anticipo configurable con slider (10%–80%)
- Registro de pagos: anticipo y pago final
- Export PDF integrado

### 📅 Cronograma de Actividades
- Actividades con fechas, responsable y estado
- Progreso por actividad (slider 0–100%)
- Avance general calculado automáticamente
- Estados: Pendiente → En Curso → Completada

### 📦 Almacén de Materiales
- Catálogo de materiales con SKU, categoría, unidad y precio
- Stock en tiempo real con alertas de stock mínimo
- Registro de compras (entradas) con historial por material
- Asignación de materiales a reportes con descuento automático de stock
- Valor total del inventario
- Badge rojo en el menú cuando hay stock bajo

### 👷 Mano de Obra (por reporte)
- Conceptos de costo libre por proyecto
- Agregar, editar y eliminar costos
- Total acumulado por reporte

### 📊 Resultado del Proyecto
- Ingreso presupuestado vs costo total
- Desglose: materiales + mano de obra
- Utilidad bruta y margen de utilidad (%)
- Cobrado hasta ahora vs utilidad real
- Barra visual de rentabilidad

### 🏢 Clientes
- CRUD completo con RFC, contacto, teléfono y dirección
- Estado activo / inactivo
- Contador de reportes por cliente
- Filtrado por rol

### 🔔 Notificaciones
- Tiempo real con Supabase Realtime
- Alertas por cada evento del flujo
- Badge de no leídas en el menú

### 👥 Mi Equipo (Empresarial)
- Vincular / desvincular técnicos
- Ver reportes y clientes del equipo
- Asignación de reportes a técnicos vinculados

### 💳 Membresías con Stripe
- Demo 30 días automático al registrarse
- Banner clickeable con días restantes → checkout Stripe
- Pantalla de bloqueo al expirar
- Planes: Técnico $19.99/mes, Empresarial $39.99/mes, Técnico extra $15.99/mes
- Activación/bloqueo automático vía webhook

### 👤 Gestión de Usuarios (Super Admin)
- Ver todos los usuarios con estado (Demo / Activo / Bloqueado)
- Activar, bloquear y extender demo manualmente
- Estadísticas globales del sistema

---

## Roles

| Rol | Acceso |
|---|---|
| ⭐ Super Admin | Todo el sistema, gestión de usuarios y membresías |
| 🏢 Empresarial | Sus reportes + los de su equipo de técnicos |
| 🔧 Técnico | Solo sus propios reportes, clientes y materiales |

---

## Idiomas

- 🇲🇽 Español — IVA 16% por defecto
- 🇺🇸 English — Tax 0% configurable por estado

El idioma se elige al registrarse y afecta toda la interfaz, formularios, PDF y mensajes.

---

## Flujo de Estados de un Reporte

```
Borrador → Enviado → Autorizado → Anticipo OK → En Proceso → Completado → Visto Bueno ✓
                  ↘ Rechazado
```

Cada cambio queda registrado en la bitácora con fecha y usuario responsable.

---

## Planes de Membresía

| Plan | Precio | Incluye |
|---|---|---|
| 🔧 Técnico | $19.99 USD/mes | Acceso individual completo |
| 🏢 Empresarial | $39.99 USD/mes | 2 técnicos incluidos |
| Técnico extra | $15.99 USD/mes | Por técnico adicional |
| Demo | Gratis | 30 días sin restricciones |

---

## Créditos

**MantPro** desarrollado por **Jaime Martin Estrada Bernabe** — DevSoft Heron
© 2026 JMEB. Todos los derechos reservados.
https://paginaweb-ro9v.onrender.com
