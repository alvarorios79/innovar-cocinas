# INNOVAR Cocinas Integrales - Sistema de Gestión

Aplicación web y móvil completa para **INNOVAR Cocinas Integrales**, especializada en diseño, fabricación e instalación de cocinas integrales, closets, puertas y centros de TV en Pereira, Colombia.

## 🎯 Características Principales

### Para Clientes
- **Agendamiento de Citas**: Sistema de reserva en línea con calendario interactivo
- **Asesoramiento Virtual**: Formulario de consulta para proyectos personalizados
- **Estimados Previos**: Generación automática de cotizaciones preliminares
- **Integración WhatsApp**: Comunicación directa con el equipo de ventas

### Para Administración
- **Gestión de Cotizaciones**: Sistema completo con versionado (V1, V2, V3...)
- **Gestión de Proyectos**: Seguimiento de proyectos desde cotización hasta finalización
- **Gestión de Citas**: Calendario de citas y seguimiento de clientes
- **Gestión de Tareas**: Sistema de tareas internas para el equipo
- **Cierre Contable**: Reportes financieros con filtrado de gastos operativos por período
- **Visor PDF**: Navegación completa de cotizaciones multipágina con zoom

## 🛠️ Stack Tecnológico

### Frontend
- **React 19** - Framework UI moderno
- **Tailwind CSS 4** - Estilos responsivos
- **Vite** - Bundler de desarrollo rápido
- **shadcn/ui** - Componentes UI profesionales
- **tRPC** - Type-safe RPC client

### Backend
- **Express 4** - Servidor web
- **tRPC 11** - API type-safe
- **Node.js** - Runtime

### Base de Datos
- **MySQL/TiDB** - Base de datos relacional
- **Drizzle ORM** - ORM type-safe
- **Migrations** - Control de versiones de esquema

### Herramientas
- **TypeScript** - Type safety
- **Vitest** - Testing framework
- **PDFKit** - Generación de PDFs
- **Manus OAuth** - Autenticación
- **WhatsApp Business API** - Integración de mensajería

## 📋 Requisitos Previos

- **Node.js** 18+ o **pnpm** 8+
- **MySQL 8.0+** o **TiDB** compatible
- **Git** para control de versiones

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone https://github.com/alvarorios79/innovar-cocinas.git
cd innovar-cocinas
```

### 2. Instalar Dependencias
```bash
pnpm install
```

### 3. Configurar Variables de Entorno
Crear archivo `.env` en la raíz del proyecto:

```env
# Base de Datos
DATABASE_URL=mysql://usuario:contraseña@localhost:3306/innovar_cocinas

# Autenticación
JWT_SECRET=tu_secreto_jwt_muy_seguro
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login

# Aplicación
VITE_APP_ID=tu_app_id
VITE_APP_TITLE=INNOVAR Cocinas Integrales
VITE_APP_URL=http://localhost:3000

# WhatsApp Business
WHATSAPP_ACCESS_TOKEN=tu_token_whatsapp
WHATSAPP_BUSINESS_ACCOUNT_ID=tu_business_account_id
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_PHONE_NUMBER=+57XXXXXXXXX

# Email
EMAIL_FROM=noreply@innovarcocinas.com
RESEND_API_KEY=tu_resend_api_key

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=tu_forge_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=tu_frontend_forge_api_key

# Push Notifications
VAPID_PUBLIC_KEY=tu_vapid_public_key
VAPID_PRIVATE_KEY=tu_vapid_private_key
```

### 4. Crear Base de Datos
```bash
# Las migraciones se ejecutarán automáticamente con:
pnpm db:push
```

### 5. Ejecutar en Desarrollo
```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
innovar-cocinas/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── pages/            # Páginas principales
│   │   ├── components/       # Componentes reutilizables
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilidades
│   │   └── App.tsx           # Enrutamiento principal
│   ├── public/               # Activos estáticos
│   └── index.html            # HTML principal
│
├── server/                    # Backend Express
│   ├── _core/                # Configuración del framework
│   ├── routers.ts            # Procedimientos tRPC
│   ├── db.ts                 # Helpers de base de datos
│   └── index.ts              # Punto de entrada del servidor
│
├── drizzle/                  # Esquema y migraciones
│   ├── schema.ts             # Definición de tablas
│   └── migrations/           # Historial de migraciones
│
├── shared/                   # Código compartido
│   └── types.ts              # Tipos TypeScript compartidos
│
├── storage/                  # Helpers de almacenamiento S3
│   └── index.ts
│
├── package.json              # Dependencias del proyecto
├── tsconfig.json             # Configuración TypeScript
├── vite.config.ts            # Configuración Vite
├── vitest.config.ts          # Configuración de tests
└── drizzle.config.ts         # Configuración de migraciones
```

## 🗄️ Esquema de Base de Datos

### Tablas Principales

**users**
- Gestión de usuarios del sistema
- Roles: `admin`, `user`
- Autenticación OAuth integrada

**quotations**
- Cotizaciones con versionado (V1, V2, V3...)
- Detalles de items (cocinas, closets, puertas, centros TV)
- Cálculo automático de totales

**projects**
- Proyectos vinculados a cotizaciones
- Estados: `pending`, `in_progress`, `completed`, `archived`
- Seguimiento de pagos

**appointments**
- Citas agendadas
- Tipos: `consultation`, `measurement`, `installation`
- Integración con calendario

**tasks**
- Tareas internas del equipo
- Prioridades y asignaciones

**accounting_closures**
- Cierres contables periódicos
- Filtrado de gastos operativos por período
- Prevención de doble contabilización

## 🔧 Comandos Disponibles

```bash
# Desarrollo
pnpm dev              # Inicia servidor de desarrollo

# Base de datos
pnpm db:push          # Ejecuta migraciones
pnpm db:generate      # Genera tipos de Drizzle

# Testing
pnpm test             # Ejecuta tests con Vitest
pnpm test:watch       # Modo watch para tests

# Build
pnpm build            # Compila para producción
pnpm preview          # Vista previa de build

# Linting
pnpm lint             # Ejecuta ESLint
pnpm format           # Formatea código con Prettier
```

## 📊 Lógica de Negocio

### Cálculo de Precios

El sistema calcula automáticamente precios para cada categoría:

- **Cocinas Integrales**: Base + accesorios + instalación
- **Closets**: Ancho × Alto × Profundidad + accesorios
- **Puertas**: Por unidad + instalación
- **Centros TV**: Tamaño + accesorios
- **Barras**: Largo × Ancho + acabados

Ver documentación completa en `ANALISIS_VERSIONADO_COTIZACIONES.md`

### Versionado de Cotizaciones

- Cada cotización puede tener múltiples versiones (V1, V2, V3...)
- Las versiones se crean al modificar una cotización existente
- El proyecto se vincula a la versión más reciente
- Historial completo disponible para auditoría

### Cierre Contable

- Filtra gastos operativos desde el último cierre confirmado
- Evita doble contabilización
- Incluye solo proyectos completados y pagados
- Genera reportes con detalles de ingresos y gastos

## 🔐 Seguridad

- **Autenticación OAuth**: Integración con Manus OAuth
- **JWT Tokens**: Sesiones seguras
- **Type Safety**: TypeScript en frontend y backend
- **Protected Procedures**: Rutas administrativas protegidas
- **CORS**: Configurado para producción

## 📱 Integración WhatsApp

- Envío automático de cotizaciones
- Notificaciones de citas
- Mensajes de confirmación
- Templates personalizados

## 🧪 Testing

```bash
# Ejecutar todos los tests
pnpm test

# Tests específicos
pnpm test server/routers.test.ts

# Coverage
pnpm test -- --coverage
```

## 📝 Documentación Adicional

- `ANALISIS_VERSIONADO_COTIZACIONES.md` - Lógica de versionado
- `ANALISIS_COTIZACION_PROYECTO.md` - Relación cotización-proyecto
- `APP_STRUCTURE.md` - Estructura de la aplicación
- `ANALISIS_CODIGO.md` - Análisis técnico del código

## 🚀 Deployment

### Opción 1: Manus (Recomendado)
```bash
# El proyecto está configurado para Manus
# Solo necesitas hacer click en "Publish" en el Management UI
```

### Opción 2: Vercel
```bash
# Conectar repositorio a Vercel
# Las variables de entorno se configuran en el dashboard
```

### Opción 3: Railway / Render
```bash
# Conectar repositorio
# Configurar variables de entorno
# Deploy automático en cada push a main
```

## 🤝 Contribución

1. Crea una rama para tu feature: `git checkout -b feature/nombre-feature`
2. Commit tus cambios: `git commit -am 'Agrega feature'`
3. Push a la rama: `git push origin feature/nombre-feature`
4. Abre un Pull Request

## 📄 Licencia

Privado - Todos los derechos reservados para INNOVAR Cocinas Integrales

## 📞 Contacto

- **Teléfono**: +57 313 680 2029
- **Dirección**: K9 vía Cerritos a Pereira, Pereira Risaralda
- **WhatsApp**: [Contactar](https://wa.me/573136802029)
- **Sitio Web**: [cocinasintegralespereira.co](https://cocinasintegralespereira.co)

## 🎯 Roadmap Futuro

- [ ] App móvil nativa (React Native)
- [ ] Integración con software de diseño 3D
- [ ] Seguimiento de instalación en tiempo real
- [ ] Portal de cliente para ver estado de proyecto
- [ ] Integración con sistemas de pago (Stripe)
- [ ] Reportes avanzados y analytics
- [ ] Sistema de inventario

---

**Última actualización**: Mayo 2026
