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

### Logotipo Principal Más Grande
- [x] Agrandar logotipo significativamente
- [x] Centrar logotipo encima del título "Transforma tu hogar..."
- [x] Hacer que el logotipo sea el elemento visual principal de la página

### Reorganizar Información de Contacto
- [x] Mover teléfono, dirección, sitio web cerca del logotipo centrado
- [x] Crear bloque unificado de información de contacto
- [x] Mantener buena legibilidad y organización visual

### Reducir Espacio Encima del Logotipo
- [x] Eliminar espacio excesivo entre header y logotipo grande
- [x] Acercar logotipo al header para mejor aprovechamiento del espacio

### Eliminar Barra Superior del Header
- [x] Quitar la línea superior del header con información de contacto duplicada
- [x] Mantener solo el logotipo pequeño y navegación en el header

## Optimización para Móvil v2.2

### Header y Hero Section
- [x] Ajustar tamaño del logotipo para móvil
- [x] Optimizar información de contacto en pantallas pequeñas
- [x] Mejorar espaciado y padding para móvil
- [x] Asegurar que botones sean fáciles de tocar (mínimo 44x44px)

### Formularios
- [x] Aumentar tamaño de campos de entrada para móvil
- [x] Mejorar espaciado entre campos
- [x] Optimizar botones de envío para pantallas táctiles
- [x] Asegurar que labels sean legibles en móvil

### Calendario
- [x] Adaptar calendario para pantallas pequeñas
- [x] Optimizar selector de horarios para uso táctil
- [x] Mejorar visualización de días y horarios disponibles
- [x] Asegurar que sea fácil seleccionar fechas en móvil

### Panel Admin y Portal
- [x] Optimizar tablas para móvil (scroll horizontal si es necesario)
- [x] Adaptar cards y badges para pantallas pequeñas
- [x] Mejorar navegación en móvil
- [x] Asegurar que todos los botones sean accesibles

### General
- [x] Verificar que todos los textos sean legibles
- [x] Asegurar que no haya elementos que se salgan de la pantalla
- [x] Probar en diferentes tamaños de pantalla
- [x] Verificar que todos los enlaces y botones funcionen correctamente

## Gestión de Roles de Usuario v2.3

### Backend
- [x] Crear endpoint para listar todos los usuarios
- [x] Crear endpoint para cambiar rol de usuario
- [x] Validar que solo admins puedan cambiar roles
- [x] Prevenir que un admin se quite sus propios permisos

### Frontend
- [x] Agregar tab "Usuarios" en el Panel Admin
- [x] Mostrar lista de usuarios con su información
- [x] Agregar botón para cambiar rol (user ↔ admin)
- [x] Mostrar badges visuales para identificar roles
- [x] Agregar confirmación antes de cambiar roles

## Creación de Usuarios v2.4

### Backend
- [x] Crear endpoint para registrar nuevos usuarios
- [x] Validar que email no esté duplicado
- [x] Validar formato de email y contraseña
- [x] Permitir asignar rol al crear usuario
- [x] Solo admins pueden crear usuarios

### Frontend
- [x] Agregar botón "Crear Usuario" en tab Usuarios
- [x] Crear formulario con campos: nombre, email, rol
- [x] Validación de formulario
- [x] Mostrar mensajes de éxito/error
- [x] Actualizar lista de usuarios después de crear

### Tests
- [x] Test de creación de usuario por admin
- [x] Test de prevención de duplicados
- [x] Test de validación de datos
- [x] Test de permisos (solo admin puede crear)
- [x] Test de validación de email
- [x] Test de campos requeridos

## Sistema de Roles Jerárquico v2.5

### Estructura de Roles
- [x] Agregar rol "super_admin" al esquema de base de datos
- [x] Definir jerarquía: super_admin > admin > user
- [x] Asignar rol super_admin al usuario alvarorios79@gmail.com

### Permisos por Rol
- [x] Super Admin: puede crear/eliminar admins y users
- [x] Admin: puede crear/eliminar solo users (no otros admins)
- [x] User: sin permisos de gestión

### Funcionalidad de Eliminación
- [x] Crear endpoint backend para eliminar usuarios
- [x] Validar permisos según jerarquía de roles
- [x] Prevenir que usuarios se eliminen a sí mismos
- [x] Prevenir que admins eliminen super admins
- [x] Prevenir que admins eliminen otros admins

### Frontend
- [x] Agregar botón "Eliminar" en cada usuario de la lista
- [x] Mostrar confirmación antes de eliminar
- [x] Mostrar badge distintivo para super_admin (color púrpura)
- [x] Ocultar botón eliminar según permisos del usuario actual
- [x] Actualizar selector de rol para incluir super_admin (solo visible para super_admin)

### Tests
- [x] Test de eliminación exitosa por super_admin
- [x] Test de eliminación exitosa por admin (solo users)
- [x] Test de prevención: admin no puede eliminar admin
- [x] Test de prevención: admin no puede eliminar super_admin
- [x] Test de prevención: user no puede eliminar nadie
- [x] Test de creación: solo super_admin puede crear admins
- [x] Test de modificación: solo super_admin puede modificar roles de admins
- [x] 13 tests nuevos de jerarquía de roles (35/35 tests pasando)

## Ajustes de Formulario v2.6

### Formulario de Agendar Cita
- [x] Eliminar campo de teléfono duplicado debajo del calendario
- [x] Eliminar campo de tipo de trabajo duplicado debajo del calendario
- [x] Mantener solo los campos iniciales antes del calendario
- [x] Dejar solo campo de notas adicionales después del calendario

## Bug: Creación de Usuarios v2.7

### Problema Reportado
- [x] Error al crear usuario regular: sistema muestra "solo super admin puede crear administradores"
- [x] Investigar si el formulario está enviando el rol incorrecto
- [x] Verificar validación de permisos en el backend
- [x] Corregir lógica para permitir creación de usuarios regulares por admins

### Solución Implementada
- [x] Ocultar opción "Administrador" para usuarios admin (solo visible para super_admin)
- [x] Admins ahora solo ven opción "Usuario" en el selector
- [x] Super Admin ve todas las opciones: Usuario, Administrador, Super Administrador
- [x] Agregar placeholder al selector de rol

## Bug: Rol Super Admin No Aplicado v2.8

### Problema Reportado
- [x] Usuario alvarorios79@gmail.com aparece como admin (azul) en lugar de super_admin (púrpura)
- [x] No puede crear usuarios con rol administrador
- [x] Verificar rol actual en base de datos
- [x] Actualizar a super_admin si es necesario

### Solución Aplicada
- [x] Consultada base de datos y encontrado usuario con rol "admin"
- [x] Actualizado rol a "super_admin" en la base de datos
- [x] Usuario ahora tiene permisos completos de super administrador

## Limpieza de Base de Datos v2.9

### Tarea Solicitada
- [x] Listar todos los usuarios actuales (41 usuarios encontrados)
- [x] Identificar super admin y dos administradores creados por el usuario
- [x] Eliminar todos los usuarios de prueba (38 usuarios eliminados)
- [x] Conservar solo: 1 super admin + 2 administradores reales
- [x] Verificar limpieza exitosa (3 usuarios restantes)

### Usuarios Conservados
- [x] mcfy8jgnym@privaterelay.appleid.com (Super Admin)
- [x] alejoile300@gmail.com (Administrador)
- [x] martha79s@hotmail.com (Administrador)

## Ajuste Visual: Badge Super Admin v2.10

### Cambio Solicitado
- [x] Cambiar color del badge de Super Admin de púrpura a rojo
- [x] Actualizar componente Admin.tsx (bg-purple-600 → bg-red-600)
- [x] Verificar que el cambio se refleje correctamente

## Botones de Crear y Eliminar en Panel Admin v3.0

### Backend - Endpoints de Eliminación
- [x] Crear endpoint para eliminar citas (appointments.delete)
- [x] Crear endpoint para eliminar asesoramientos (advisory.delete)
- [x] Crear endpoint para eliminar cotizaciones (quotes.delete)
- [x] Crear endpoint para eliminar clientes (clients.delete)
- [x] Validar permisos (solo admin y super_admin)
- [x] Agregar funciones en db.ts para cada tipo de eliminación

### Frontend - Botones y UI
- [x] Agregar botón "Crear Cita" en pestaña Citas Pendientes (redirige a formulario)
- [x] Agregar botón "Eliminar" en cada cita con icono
- [x] Agregar botón "Crear Asesoramiento" en pestaña Asesoramiento (redirige a formulario)
- [x] Agregar botón "Eliminar" en cada asesoramiento con icono
- [x] Agregar botón "Solicitar Estimado" en pestaña Cotizaciones (redirige a formulario)
- [x] Agregar botón "Eliminar" en cada cotización con icono
- [x] Nota informativa en pestaña Clientes (se crean automáticamente)
- [x] Agregar botón "Eliminar" en cada cliente con icono

### Diálogos y Confirmación
- [x] Crear diálogo de confirmación unificado para eliminar
- [x] Mostrar nombre del elemento a eliminar en confirmación
- [x] Implementar lógica handleDelete para todos los tipos
- [x] Botones de crear redirigen a formularios existentes en Home
- [x] Actualizar botón eliminar usuario para usar nuevo sistema

### Tests
- [x] Tests de eliminación de citas (admin y super_admin)
- [x] Tests de eliminación de asesoramientos (admin y super_admin)
- [x] Tests de eliminación de cotizaciones (admin y super_admin)
- [x] Tests de eliminación de clientes (admin y super_admin)
- [x] Tests de validación de permisos (user no puede eliminar)
- [x] 10 tests nuevos pasando (45/45 tests totales)


## Bug: No se pueden eliminar cotizaciones v3.1

### Problema Reportado
- [x] Al intentar eliminar una cotización, requiere hacer clic dos veces
- [x] Revisar endpoint quotations.delete (funcionando correctamente)
- [x] Verificar validación de permisos (correcta)
- [x] Identificar problema: botones en columna causaban clicks accidentales

### Solución Implementada
- [x] Cambiar botones de flex-col a flex-row en quotations
- [x] Botones ahora están lado a lado en lugar de apilados
- [x] Elimina confusión y clicks accidentales


## Botón Flotante de WhatsApp v3.2

### Funcionalidad Solicitada
- [x] Crear componente de botón flotante de WhatsApp
- [x] Diseño circular con icono de WhatsApp (MessageCircle de lucide-react)
- [x] Posición fija en esquina inferior derecha (bottom-6 right-6)
- [x] Número: 313 680 2025
- [x] Visible en todas las páginas del sitio (integrado en App.tsx)
- [x] Efecto hover y animación sutil (scale-110, efecto pulso)
- [x] Enlace directo a WhatsApp con mensaje predefinido
- [x] Tooltip informativo al hacer hover
- [x] Color oficial de WhatsApp (#25D366)


## Configuración PWA Profesional v3.3

### Elementos de PWA
- [x] Generar iconos de la app en múltiples tamaños (192x192, 512x512) usando logo original
- [x] Crear manifest.json con configuración completa
- [x] Service worker ya existía con funcionalidad offline básica
- [x] Agregar meta tags para iOS y Android
- [x] Configurar pantalla de carga (splash screen automático)
- [x] Definir colores de tema (#14b8a6)
- [x] Habilitar instalación desde navegador
- [x] Agregar shortcuts (Agendar Cita, Solicitar Estimado, Panel Admin)
- [x] Configurar apple-mobile-web-app meta tags


## Mejora de Formulario de Cotizaciones v3.4

### Campos Técnicos Nuevos
- [x] Agregar campo "Forma de Cocina" (selector: L, U, Lineal)
- [x] Agregar campo "Medidas" (texto para especificar dimensiones)
- [x] Agregar campo "Tipo de Material" (selector: Quarzone, Sinterizado)
- [x] Mantener campo "Detalles Adicionales" existente
- [x] Actualizar esquema de base de datos (quotations y priorEstimates tables)
- [x] Migrar base de datos con nuevos campos
- [x] Actualizar endpoints backend (create, list, whatsapp notification)
- [x] Actualizar formulario en Home.tsx con nuevos campos
- [x] Actualizar visualización en Panel Admin (muestra forma, medidas, material)
- [x] Actualizar visualización en Mi Portal (muestra forma, medidas, material)
- [x] Actualizar función de WhatsApp con nuevos campos
