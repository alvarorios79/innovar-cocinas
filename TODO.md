# TODO - INNOVAR Cocinas Integrales

## Funcionalidades Principales

### Base de Datos y Configuración
- [x] Crear tabla de clientes con teléfono WhatsApp, dirección, correo
- [x] Crear tabla de citas con tipo de trabajo y estados
- [x] Crear tabla de solicitudes de asesoramiento telefónico
- [x] Crear tabla de estimados previos con dimensiones
- [x] Crear tabla de cotizaciones generadas por admin

### Sistema de Agendamiento (Cliente)
- [x] Formulario de agendamiento de citas
- [x] Validación de teléfono WhatsApp
- [x] Selección de tipo de trabajo (cocina, closet, puertas, centro TV)
- [x] Creación automática de registro de cliente

### Solicitud de Asesoramiento
- [x] Formulario de solicitud de asesoramiento telefónico
- [x] Separación de clientes por tipo de solicitud

### Estimado Previo Opcional
- [x] Formulario de estimado previo con dimensiones
- [x] Selección de tipo de mesón (cuarzo/sinterizado)
- [x] Almacenamiento de estimados previos

### Panel Administrativo
- [x] Vista de clientes con asesoramiento telefónico
- [x] Vista de citas agendadas
- [x] Gestión de estados de citas (confirmada, completada, cancelada)
- [x] Generación de cotizaciones después de visitas
- [x] Envío de cotizaciones a clientes

### Portal de Cliente
- [x] Visualización de citas agendadas
- [x] Reagendamiento de citas
- [x] Consulta de estimados/cotizaciones recibidos
- [x] Historial de trabajos

### Integración WhatsApp Business
- [x] Notificación automática al agendar cita
- [x] Notificación automática al solicitar asesoramiento
- [x] Envío de cotizaciones por WhatsApp
- [x] Integración con número 3136802025

### PWA (Aplicación Móvil)
- [x] Configuración de manifest.json
- [x] Service worker para funcionalidad offline
- [x] Iconos y splash screens
- [x] Instalación como app móvil

### Pruebas y Documentación
- [x] Pruebas de agendamiento de citas
- [x] Pruebas de panel administrativo
- [x] Pruebas de integración WhatsApp
- [x] Documentación de instalación
- [x] Guía de uso para administradores

## Personalización con Identidad Corporativa

### Logotipo e Identidad Visual
- [x] Copiar logotipos oficiales al proyecto
- [x] Integrar logotipo en header de la aplicación
- [x] Crear favicon con el logotipo
- [x] Generar iconos PWA personalizados (192x192, 512x512)
- [x] Actualizar manifest.json con nuevos iconos

### Colores Corporativos
- [x] Actualizar paleta de colores en index.css con turquesa (#00B8A9)
- [x] Aplicar gris corporativo (#6B7280) en elementos secundarios
- [x] Actualizar botones principales con color turquesa
- [x] Ajustar badges y estados con colores corporativos
- [x] Verificar contraste y legibilidad en todos los componentes

### Traducción al Español
- [x] Traducir todos los textos de la interfaz al español
- [x] Traducir mensajes de error y validación
- [x] Traducir notificaciones y toasts
- [x] Traducir labels de formularios
- [x] Verificar que no queden textos en inglés

## Mejoras Solicitadas v1.2

### Diseño y Header
- [x] Agrandar logo en el header
- [x] Agregar enlace a página web oficial (https://cocinasintegralespereira.co/)
- [x] Agregar teléfono de la empresa en el header
- [x] Agregar dirección física en el header
- [x] Agregar botón directo a WhatsApp en el header

### Seguridad y Acceso
- [x] Proteger panel admin - solo usuarios con rol admin pueden acceder
- [x] Implementar redirección automática si usuario no es admin

### Sistema de Citas Avanzado
- [x] Restringir citas solo a martes, jueves y viernes
- [x] Configurar horarios: 8am-12pm y 2pm-5pm
- [x] Citas de 1.5 horas de duración
- [x] Primera cita disponible a las 8am
- [x] Separar calendario y selector de hora
- [x] Implementar bloqueo de horarios ocupados
- [x] Validar disponibilidad antes de confirmar cita
- [x] Mostrar solo horarios disponibles en el selector

## Mejoras Solicitadas v1.3 - Calendario Visual

### Calendario Tradicional Completo
- [x] Implementar calendario visual con todos los días del mes
- [x] Marcar días bloqueados (lun, mié, sáb, dom) en rojo o deshabilitados
- [x] Mostrar días disponibles (mar, jue, vie) en blanco/normal
- [x] Mostrar horarios ocupados en rojo
- [x] Mostrar horarios libres en verde
- [x] Permitir selección de fecha y hora en el mismo calendario

### Estados de Citas con Colores
- [x] Pendiente: color rojo
- [x] Confirmada: color azul
- [x] Completada: color verde
- [x] Cancelada: color marrón
- [x] Actualizar badges en panel admin
- [x] Actualizar badges en portal de cliente

### Otros Ajustes
- [x] Actualizar año en créditos/footer a 2026

## Ajustes Visuales v1.4

### Limpieza de Leyenda del Calendario
- [x] Quitar "Bloqueado" y punto rojo de la leyenda
- [x] Quitar texto "* Solo disponible martes, jueves y viernes"
- [x] Simplificar leyenda dejando solo "Disponible" y "Seleccionado"

### Actualización de Dirección
- [x] Actualizar dirección a "K9 vía Cerritos a Pereira, Pereira Risaralda"
- [x] Hacer dirección clickeable con enlace a Google Maps
- [x] Agregar enlace directo a ubicación de INNOVAR en Google Maps

### Alineación del Calendario
- [x] Alinear correctamente los nombres de días con los cuadros del calendario
- [x] Asegurar que los días comiencen en la columna correcta según el día de la semana

### Bug: Horarios No Disponibles
- [x] Revisar consulta de disponibilidad de horarios
- [x] Verificar formato de fecha en la consulta
- [x] Corregir generación de horarios disponibles
- [x] Asegurar que se muestren horarios libres cuando no hay citas agendadas
