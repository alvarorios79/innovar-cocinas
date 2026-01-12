# Guía Completa - INNOVAR Cocinas Integrales

## Descripción General

La plataforma **INNOVAR Cocinas Integrales** es una aplicación web completa (PWA) diseñada para gestionar citas, solicitudes de asesoramiento y cotizaciones de trabajos de carpintería y mesones en Pereira, Colombia. La aplicación facilita la comunicación entre clientes y administradores mediante integración automática con WhatsApp Business.

## Características Principales

### Para Clientes

La plataforma ofrece tres formas principales de contacto con INNOVAR:

**Agendamiento de Citas**: Los clientes pueden agendar visitas técnicas proporcionando su información de contacto (nombre, teléfono WhatsApp, dirección, correo electrónico) y seleccionando el tipo de trabajo deseado entre cocinas integrales, closets, puertas o centros de TV. El sistema permite especificar una fecha preferida y agregar notas adicionales sobre el proyecto.

**Solicitud de Asesoramiento Telefónico**: Para clientes que prefieren una consulta inicial sin compromiso, existe la opción de solicitar asesoramiento telefónico. Un comercial de INNOVAR contactará al cliente para resolver dudas y orientar sobre el proyecto.

**Estimado Previo Opcional**: Los clientes que ya cuentan con las medidas de su espacio pueden solicitar un estimado preliminar ingresando las dimensiones (largo, ancho, alto), el tipo de mesón deseado (cuarzo o sinterizado) y detalles adicionales del proyecto.

### Para Administradores

El panel administrativo proporciona herramientas completas para gestionar el negocio:

**Gestión de Citas**: Visualización de todas las citas agendadas con información completa del cliente. Los administradores pueden cambiar el estado de las citas entre pendiente, confirmada, completada o cancelada. Cada cita muestra el tipo de trabajo, fecha programada, datos de contacto del cliente y notas adicionales.

**Gestión de Solicitudes de Asesoramiento**: Vista separada para clientes que solicitan asesoramiento telefónico, permitiendo marcar el estado como pendiente, contactado o completado. Esto facilita el seguimiento de leads y asegura que ningún cliente potencial quede sin atención.

**Generación de Cotizaciones**: Después de completar una visita técnica, los administradores pueden crear cotizaciones detalladas especificando la descripción del trabajo, materiales a utilizar, precio total y fecha de validez. Las cotizaciones se almacenan en el sistema y pueden enviarse directamente al cliente.

**Base de Datos de Clientes**: Acceso completo a la información de todos los clientes registrados, incluyendo historial de citas, solicitudes y cotizaciones.

### Portal de Cliente

Los clientes registrados tienen acceso a un portal personalizado donde pueden:

**Visualizar Citas**: Ver todas sus citas agendadas con estado actual y detalles completos.

**Reagendar Citas**: Modificar la fecha y hora de citas pendientes o confirmadas de forma autónoma.

**Consultar Cotizaciones**: Acceder a todas las cotizaciones recibidas con descripción detallada, materiales, precios y fechas de validez.

**Historial de Estimados**: Revisar los estimados previos enviados con las medidas y especificaciones proporcionadas.

### Integración WhatsApp Business

El sistema está integrado con WhatsApp Business (número 3136802025) para notificaciones automáticas:

**Notificación de Citas**: Cuando un cliente agenda una cita, se abre automáticamente WhatsApp Web con un mensaje pre-formateado que incluye todos los datos del cliente y detalles de la cita, listo para enviar al número de negocio.

**Notificación de Asesoramiento**: Las solicitudes de asesoramiento telefónico generan notificaciones similares, identificando claramente que el cliente solicita una llamada.

**Envío de Cotizaciones**: Los administradores pueden enviar cotizaciones directamente al WhatsApp del cliente con un mensaje profesional que incluye descripción del trabajo, precio y validez.

**Notificación de Estimados**: Los estimados previos también generan notificaciones al negocio con las medidas y especificaciones proporcionadas por el cliente.

### Progressive Web App (PWA)

La aplicación está configurada como PWA, lo que significa que:

**Instalación en Dispositivos**: Los clientes pueden instalar la aplicación en sus teléfonos móviles o tablets como si fuera una app nativa, sin necesidad de descargarla desde una tienda de aplicaciones.

**Acceso Rápido**: Una vez instalada, la app aparece en la pantalla de inicio del dispositivo con su propio icono, permitiendo acceso inmediato.

**Funcionalidad Offline**: El service worker permite que ciertas funciones de la aplicación funcionen incluso sin conexión a internet, mejorando la experiencia del usuario.

**Experiencia Nativa**: La app se ejecuta en pantalla completa sin la barra de navegación del navegador, proporcionando una experiencia similar a las aplicaciones nativas.

## Instalación y Configuración

### Requisitos Previos

La aplicación ya está desplegada y funcionando en el servidor de Manus. No requiere instalación adicional para uso en producción. Sin embargo, para desarrollo local se necesita:

- Node.js versión 22.13.0 o superior
- pnpm como gestor de paquetes
- Acceso a la base de datos MySQL/TiDB configurada

### Acceso a la Aplicación

La aplicación está disponible en la URL proporcionada por Manus. Los usuarios pueden acceder directamente desde cualquier navegador web moderno.

### Instalación como PWA en Móviles

Para instalar la aplicación en un dispositivo móvil:

1. Abrir la URL de la aplicación en el navegador móvil (Chrome, Safari, Firefox)
2. El navegador mostrará automáticamente un banner o mensaje sugiriendo "Agregar a pantalla de inicio" o "Instalar aplicación"
3. Tocar el botón "Instalar" o "Agregar"
4. La aplicación se instalará y aparecerá un icono en la pantalla de inicio
5. Tocar el icono para abrir la aplicación en modo standalone

En dispositivos iOS (iPhone/iPad):
1. Abrir la aplicación en Safari
2. Tocar el botón de compartir (cuadrado con flecha hacia arriba)
3. Desplazarse y seleccionar "Agregar a pantalla de inicio"
4. Confirmar el nombre y tocar "Agregar"

## Guía de Uso para Clientes

### Agendar una Cita

1. Acceder a la página principal de INNOVAR Cocinas Integrales
2. Seleccionar la pestaña "Agendar Cita"
3. Completar el formulario con la siguiente información:
   - Nombre completo (obligatorio)
   - Correo electrónico (opcional)
   - Teléfono WhatsApp (obligatorio) - formato: 3136802025
   - Dirección (opcional pero recomendado)
   - Tipo de trabajo: Cocina Integral, Closet, Puertas o Centro de TV (obligatorio)
   - Fecha preferida (opcional) - si no se especifica, el equipo contactará para coordinar
   - Notas adicionales (opcional) - cualquier detalle relevante del proyecto
4. Hacer clic en "Agendar Cita"
5. El sistema confirmará la cita y abrirá WhatsApp para notificar al negocio automáticamente
6. El equipo de INNOVAR contactará al cliente para confirmar la visita

### Solicitar Asesoramiento Telefónico

1. En la página principal, seleccionar la pestaña "Asesoramiento"
2. Completar el formulario con:
   - Nombre completo (obligatorio)
   - Correo electrónico (opcional)
   - Teléfono WhatsApp (obligatorio)
   - Tipo de trabajo de interés (obligatorio)
   - Descripción de las dudas o consultas (opcional pero recomendado)
3. Hacer clic en "Solicitar Asesoramiento"
4. Un comercial contactará al cliente por WhatsApp o llamada telefónica

### Enviar un Estimado Previo

1. Seleccionar la pestaña "Estimado Previo"
2. Completar el formulario con:
   - Nombre completo y datos de contacto (obligatorios)
   - Tipo de trabajo (obligatorio)
   - Medidas del espacio:
     - Largo en metros (ej: 3.5)
     - Ancho en metros (ej: 2.5)
     - Alto en metros (ej: 2.4)
   - Tipo de mesón si aplica: Cuarzo o Sinterizado
   - Detalles adicionales: acabados deseados, características especiales, etc.
3. Hacer clic en "Enviar Estimado"
4. El equipo revisará la información y contactará al cliente con un estimado preliminar

### Acceder al Portal de Cliente

1. Hacer clic en "Iniciar Sesión" en la esquina superior derecha
2. Completar el proceso de autenticación de Manus OAuth
3. Una vez autenticado, hacer clic en "Mi Portal"
4. En el portal se puede:
   - Ver todas las citas agendadas con su estado actual
   - Reagendar citas pendientes o confirmadas seleccionando una nueva fecha
   - Consultar cotizaciones recibidas con precios y detalles
   - Revisar el historial de estimados previos enviados

## Guía de Uso para Administradores

### Acceso al Panel Administrativo

1. Iniciar sesión con una cuenta de administrador
2. Hacer clic en "Panel Admin" en la navegación superior
3. El panel muestra estadísticas en tiempo real:
   - Número de citas pendientes
   - Solicitudes de asesoramiento pendientes
   - Total de cotizaciones generadas
   - Total de clientes registrados

### Gestionar Citas Agendadas

1. En el panel admin, seleccionar la pestaña "Citas Agendadas"
2. Cada cita muestra:
   - Nombre del cliente y datos de contacto completos
   - Tipo de trabajo solicitado
   - Fecha y hora programada
   - Estado actual (pendiente, confirmada, completada, cancelada)
   - Notas adicionales del cliente
3. Para cambiar el estado de una cita:
   - Usar el menú desplegable de estado
   - Seleccionar el nuevo estado
   - El cambio se guarda automáticamente
4. Para crear una cotización después de una visita:
   - Cambiar el estado de la cita a "Completada"
   - Hacer clic en el botón "Crear Cotización"
   - Completar el formulario de cotización (ver sección siguiente)

### Gestionar Solicitudes de Asesoramiento

1. Seleccionar la pestaña "Asesoramiento"
2. Las solicitudes se muestran separadas de las citas agendadas
3. Cada solicitud incluye:
   - Datos completos del cliente
   - Tipo de trabajo de interés
   - Consultas o dudas expresadas por el cliente
   - Estado: pendiente, contactado o completado
4. Actualizar el estado según el progreso:
   - "Pendiente": solicitud recién recibida
   - "Contactado": ya se habló con el cliente
   - "Completado": asesoramiento finalizado

### Crear y Enviar Cotizaciones

1. Desde una cita completada, hacer clic en "Crear Cotización"
2. Completar el formulario de cotización:
   - **Descripción del trabajo**: Detalle completo del proyecto a realizar
   - **Materiales**: Especificar materiales a utilizar (tipo de madera, acabados, herrajes, etc.)
   - **Precio Total**: Monto en pesos colombianos (COP)
   - **Válida hasta**: Fecha de vencimiento de la cotización (opcional)
3. Hacer clic en "Crear Cotización"
4. La cotización se guarda con estado "Borrador"
5. Para enviar la cotización al cliente:
   - Ir a la pestaña "Cotizaciones"
   - Localizar la cotización en estado "Borrador"
   - Hacer clic en "Enviar al Cliente"
   - El sistema abrirá WhatsApp con un mensaje profesional pre-formateado
   - Revisar el mensaje y enviarlo al cliente

### Gestionar Base de Datos de Clientes

1. Seleccionar la pestaña "Clientes"
2. Ver lista completa de clientes registrados con:
   - Nombre completo
   - Teléfono WhatsApp
   - Correo electrónico
   - Dirección
   - Fecha de registro
3. Usar esta información para seguimiento y análisis de clientes

## Flujo de Trabajo Recomendado

### Proceso de Cita y Cotización

El flujo típico de trabajo con un cliente es el siguiente:

1. **Cliente agenda cita**: El cliente completa el formulario de agendamiento en la web
2. **Notificación automática**: WhatsApp se abre con los datos del cliente para notificar al negocio
3. **Confirmación de cita**: El administrador contacta al cliente para confirmar fecha y hora
4. **Actualizar estado a "Confirmada"**: En el panel admin, cambiar el estado de la cita
5. **Realizar visita técnica**: El equipo visita al cliente, toma medidas y define detalles
6. **Marcar cita como "Completada"**: Después de la visita, actualizar el estado en el sistema
7. **Crear cotización**: Usar el botón "Crear Cotización" desde la cita completada
8. **Enviar cotización**: Una vez revisada, enviar la cotización al cliente por WhatsApp
9. **Seguimiento**: Contactar al cliente para responder dudas y cerrar la venta

### Proceso de Asesoramiento

Para solicitudes de asesoramiento telefónico:

1. **Cliente solicita asesoramiento**: Completa el formulario de asesoramiento
2. **Notificación automática**: WhatsApp se abre con la solicitud
3. **Contactar cliente**: El comercial llama o envía mensaje al cliente
4. **Actualizar a "Contactado"**: Marcar en el sistema que ya se contactó al cliente
5. **Resolver dudas**: Proporcionar información sobre productos, precios, tiempos, etc.
6. **Marcar como "Completado"**: Si el cliente quedó satisfecho con la información
7. **Convertir en cita**: Si el cliente desea continuar, agendar una visita técnica

## Estructura de la Base de Datos

La aplicación utiliza las siguientes tablas principales:

**users**: Almacena usuarios del sistema con autenticación OAuth de Manus. Incluye roles (admin/user) para control de acceso.

**clients**: Contiene información de clientes con teléfono WhatsApp, dirección, correo y relación con usuarios autenticados.

**appointments**: Registra citas agendadas con tipo de trabajo, fecha programada, estado y notas adicionales.

**advisoryRequests**: Almacena solicitudes de asesoramiento telefónico separadas de las citas.

**priorEstimates**: Guarda estimados previos con medidas proporcionadas por clientes.

**quotations**: Contiene cotizaciones generadas por administradores con descripción, materiales, precios y estados de envío.

## Seguridad y Privacidad

La aplicación implementa las siguientes medidas de seguridad:

**Autenticación OAuth**: Utiliza el sistema de autenticación seguro de Manus para proteger el acceso.

**Control de Acceso Basado en Roles**: Los endpoints administrativos están protegidos y solo accesibles para usuarios con rol de administrador.

**Validación de Datos**: Todos los formularios validan los datos antes de procesarlos, previniendo inyecciones y datos malformados.

**Comunicación Segura**: La aplicación utiliza HTTPS para todas las comunicaciones, protegiendo la información en tránsito.

**Privacidad de Datos**: Los datos de clientes se almacenan de forma segura y solo son accesibles por administradores autorizados.

## Soporte Técnico

Para problemas técnicos, dudas sobre funcionalidades o solicitudes de nuevas características, contactar al equipo de desarrollo a través de los canales oficiales de Manus.

## Tecnologías Utilizadas

La plataforma está construida con tecnologías modernas y confiables:

**Frontend**: React 19 con TypeScript, Tailwind CSS 4 para estilos, shadcn/ui para componentes, Wouter para enrutamiento.

**Backend**: Express 4 con tRPC 11 para comunicación tipo-segura entre frontend y backend.

**Base de Datos**: MySQL/TiDB con Drizzle ORM para gestión de datos.

**Autenticación**: Manus OAuth para inicio de sesión seguro.

**PWA**: Service Worker y Web App Manifest para funcionalidad de aplicación instalable.

**Integración**: WhatsApp Business API para notificaciones automáticas.

## Mantenimiento y Actualizaciones

La aplicación está diseñada para ser fácil de mantener y actualizar:

**Migraciones de Base de Datos**: Utilizar `pnpm db:push` para aplicar cambios en el esquema de la base de datos.

**Pruebas Automatizadas**: El proyecto incluye tests unitarios que se ejecutan con `pnpm test` para verificar funcionalidades críticas.

**Despliegue**: La aplicación se despliega automáticamente a través de la plataforma Manus con cada actualización.

**Monitoreo**: El panel de Manus proporciona análisis de tráfico y uso de la aplicación.

---

**Desarrollado por**: Manus AI  
**Versión**: 1.0.0  
**Fecha**: Enero 2025  
**Cliente**: INNOVAR Cocinas Integrales - Pereira, Colombia
