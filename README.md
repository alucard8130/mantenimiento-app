# 🔧 MantPro

Sistema profesional de gestión de mantenimiento para empresas de servicios. Permite crear reportes de inspección con fotos y hallazgos, generar presupuestos detallados, gestionar el ciclo completo de autorización del cliente, programar actividades con cronograma y dar seguimiento hasta el cierre y visto bueno del trabajo.

> **Bilingüe ES / EN** · Membresías con Stripe · Base de datos Supabase · Publicado en Vercel

---

## ✨ Módulos y funcionalidades

### 🔐 Autenticación — Registro y Login
- Registro abierto con nombre, correo, contraseña e idioma preferido
- Pantalla con dos pestañas: **Iniciar Sesión** y **Crear Cuenta**
- Selector de idioma 🇲🇽 Español / 🇺🇸 English visible desde el login
- Validaciones: correo único, mínimo 6 caracteres, confirmación de contraseña
- Confirmación de correo vía Supabase Auth
- Sesión persistente en base de datos
- Enlace a sitio web del desarrollador para consultas de desarrollo a la medida

---

### ⭐ Superusuario
- Existe un superusuario fijo siempre disponible, independiente de la base de datos
- No se puede eliminar ni editar desde la interfaz
- Credenciales configuradas en `.env` — nunca en el código fuente

| Campo | Variable |
|---|---|
| Nombre | `REACT_APP_SUPER_NAME` |
| Correo | `REACT_APP_SUPER_EMAIL` |
| Contraseña | `REACT_APP_SUPER_PASSWORD` |
| Rol | ⭐ Super Admin |

---

### 💳 Sistema de Membresías
- Todo usuario nuevo recibe **30 días de demo gratuito**
- Banner con días restantes visible durante el periodo demo
- Al expirar → pantalla de bloqueo con opción de pago vía Stripe
- Activación automática al recibir el pago

| Plan | Precio | Incluye |
|---|---|---|
| **Técnico** | $15 USD/mes | Acceso individual completo |
| **Empresarial** | $30 USD/mes | 2 técnicos gratis incluidos |
| **Técnico extra** | $15 USD/mes | Por técnico adicional |

**Panel de gestión (Super Admin):**
- Ver todos los usuarios con estado y días restantes
- Activar, bloquear o extender demo manualmente
- Estadísticas: total, en demo, activos, bloqueados

---

### 👥 Gestión de Usuarios *(Super Admin)*
- Alta de nuevos usuarios con nombre, correo, contraseña y rol
- Edición y eliminación (protecciones: superusuario y cuenta activa)
- Badges visuales por rol: ⭐ Super Admin / 🏢 Empresarial / 🔧 Técnico

---

### 🏢 Mi Equipo *(Empresarial)*
- Vincular técnicos existentes a la cuenta empresarial
- Ver todos los reportes y clientes de los técnicos vinculados
- Asignar reportes a técnicos del equipo
- Desvincular técnicos en cualquier momento

---

### 📋 Reportes de Mantenimiento

#### Creación según rol
| Rol | Comportamiento |
|---|---|
| **Técnico** | Se asigna a sí mismo automáticamente. Campo bloqueado con 🔒 |
| **Empresarial / Super Admin** | Elige manualmente el técnico asignado de su equipo |

#### Datos del reporte
- Folio automático (MNT-XXXX)
- Cliente, título, fecha de inspección
- Descripción general de observaciones
- Registro de hallazgos por severidad: 🔴 Alta / 🟡 Media / 🟢 Baja
- Carga de fotos de evidencia (guardadas en Supabase Storage)
- **Creado por** — nombre del usuario que generó el reporte
- **Técnico asignado** — quien ejecuta el trabajo

#### Visibilidad por rol
- **Técnico** — solo sus propios reportes (creados o asignados)
- **Empresarial** — sus reportes + los de sus técnicos vinculados
- **Super Admin** — todos los reportes del sistema

---

### 💰 Presupuestos
- Tabla de partidas: concepto, unidad, cantidad, precio unitario, total
- Impuesto configurable por país (16% IVA México por defecto, 0% USA)
- Slider para configurar el **% de anticipo** (10%–80%)
- Registro de anticipo pagado y pago final al cierre
- Exportación a **PDF profesional** listo para imprimir o firmar

#### El PDF incluye:
- Encabezado MantPro con folio y fecha
- Datos del cliente, RFC y persona de contacto
- Técnico asignado
- Tabla de hallazgos con severidad por colores
- Tabla de partidas con impuesto configurable
- Resumen de totales y condiciones de pago
- Espacio para firma de autorización del cliente

---

### 🔄 Flujo de autorización

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

---

### 📅 Cronograma de Actividades
- Desglose de actividades con fechas de inicio y fin
- Responsable por actividad
- Control de avance individual (0–100%) con barra de progreso
- Estados: Pendiente / En Curso / Completada
- Indicador de avance general del proyecto

---

### 🕐 Bitácora de Seguimiento
- Historial completo de eventos con fecha y usuario
- Registro automático de cada cambio de estado
- Notas manuales de seguimiento
- Trazabilidad total desde la creación hasta el cierre

---

### 🏢 Gestión de Clientes
- Alta, edición y eliminación de clientes
- Campos: razón social, RFC, correo, teléfono, dirección, persona de contacto, estatus
- Contador de reportes asociados por cliente
- Visibilidad filtrada por rol (igual que reportes)
- Protección: no se puede eliminar un cliente con reportes activos

---

### 🔔 Notificaciones en Tiempo Real
- Alertas automáticas en cada evento del flujo
- Tipos: ✓ Éxito / ⚠ Advertencia / ℹ Información / ✕ Error
- Badge con conteo de no leídas en el menú
- Clic en notificación → abre el reporte relacionado directamente
- Tiempo real vía Supabase Realtime

---

### 🌐 Soporte Bilingüe ES / EN
- Idioma elegido por el usuario al registrarse
- Toda la interfaz, modales, botones, manual y PDF se adaptan al idioma
- Impuesto configurable según país
- PDF exportado en el idioma del usuario

---


---

## 🛠️ Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| React 18 | Framework principal |
| Supabase | Base de datos, Auth, Storage, Realtime |
| Stripe | Membresías y pagos |
| Vercel | Deploy y hosting |
| Supabase Edge Functions | Webhooks de Stripe |
| CSS-in-JS | Estilos inline |
| Google Fonts | DM Sans + JetBrains Mono |
| Window.print API | Exportación a PDF |
| Capacitor *(próximo)* | App móvil Android e iOS |

---

## 🔒 Seguridad y reglas de negocio

- Superusuario no puede ser eliminado ni editado
- Técnico solo ve sus propios datos
- Admin empresarial ve datos de su equipo
- No se puede eliminar cuenta de sesión activa
- No se puede eliminar cliente con reportes asociados
- Credenciales del superusuario solo en `.env`
- Políticas RLS en Supabase para cada tabla
- Impuesto configurable por país

---

## 📬 Próximas mejoras

- [ ] App móvil con Capacitor (Android + iOS)
- [ ] Envío de presupuesto por correo con Resend o EmailJS
- [ ] Portal del cliente para autorizar en línea con firma digital
- [ ] Galería de fotos con visor de pantalla completa
- [ ] Reportes y estadísticas avanzadas
- [ ] Notificaciones push móvil
- [ ] Más idiomas (portugués, francés)
- [ ] Dominio personalizado `mantpro.app`

---

## 📞 Desarrollo a la medida

¿Necesitas un sistema personalizado para tu empresa?

🌐 [paginaweb-ro9v.onrender.com](https://paginaweb-ro9v.onrender.com)

---

> **MantPro v2.0** · © 2026 Jaime Martin Estrada Bernabe · Todos los derechos reservados  
> Credenciales del superusuario configuradas en `.env` — nunca en el código fuente.
