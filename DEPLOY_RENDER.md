# Guía de Despliegue — Innovar Cocinas en Render.com

## Requisitos previos
- Cuenta en [Render.com](https://render.com) (gratis para empezar)
- Repositorio en GitHub con el código del proyecto
- PostgreSQL en Render.com (free tier — se crea antes del Web Service)

---

## 1. Base de Datos — Render PostgreSQL (free tier)

1. En [dashboard.render.com](https://dashboard.render.com) → **New → PostgreSQL**
2. Nombre: `innovar-cocinas-db`, Region: Oregon, Plan: **Free**
3. Una vez creado, copia el **Internal Database URL** (formato `postgresql://...`)
4. Guárdalo como `DATABASE_URL` en las variables de entorno del Web Service

## 2. Subir el código a GitHub

Si aún no lo tienes en GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create innovar-cocinas --private --push
```

> **Importante:** asegúrate de que `.env` esté en `.gitignore` (ya está).

---

## 3. Desplegar en Render.com

1. Ve a [dashboard.render.com](https://dashboard.render.com) → **New → Web Service**
2. Conecta tu repositorio de GitHub
3. Render detectará el `render.yaml` automáticamente. Confirma:
   - **Runtime:** Node
   - **Build Command:** `npm install --legacy-peer-deps && npm run build`
   - **Start Command:** `npm start`
4. En la pestaña **Environment** configura estas variables (las marcadas como `sync: false` en render.yaml):

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Internal Database URL de Render PostgreSQL |
| `BUILT_IN_FORGE_API_URL` | URL del proxy de almacenamiento S3 |
| `BUILT_IN_FORGE_API_KEY` | API key del storage |
| `VITE_FRONTEND_FORGE_API_URL` | Igual que BUILT_IN_FORGE_API_URL |
| `RESEND_API_KEY` | API key de Resend.com para emails |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número de WhatsApp Business |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | ID de la cuenta de negocios |
| `WHATSAPP_ACCESS_TOKEN` | Token de acceso de Meta |
| `VAPID_PUBLIC_KEY` | Clave pública VAPID |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID |
| `VITE_VAPID_PUBLIC_KEY` | Igual que VAPID_PUBLIC_KEY |

5. Haz clic en **Create Web Service**
6. El primer deploy tarda ~5 minutos. Verás los logs en tiempo real.

---

## 4. Generar claves VAPID (notificaciones push)

Ejecuta esto **una sola vez** en tu computador:
```bash
npx web-push generate-vapid-keys
```
Copia `Public Key` → `VAPID_PUBLIC_KEY` y `VITE_VAPID_PUBLIC_KEY`  
Copia `Private Key` → `VAPID_PRIVATE_KEY`

---

## 5. Dominio personalizado

1. En Render → tu servicio → **Settings → Custom Domain**
2. Agrega `app.cocinasintegralespereira.co`
3. En tu proveedor DNS, crea un registro CNAME:
   ```
   app → innovar-cocinas-app.onrender.com
   ```
4. Render provisiona el certificado SSL automáticamente (tarda ~10 min)
5. Actualiza `VITE_APP_URL` en las variables de entorno a `https://app.cocinasintegralespereira.co`

---

## 6. Notas sobre el plan gratuito

- El servicio **se duerme** después de 15 min sin tráfico → primera petición tarda ~30 seg.
- Para evitarlo: upgradar a **Starter ($7/mes)** o usar un servicio de ping como [UptimeRobot](https://uptimerobot.com) (gratis).
- El plan gratuito tiene **750 horas/mes** — suficiente para un solo servicio corriendo todo el mes.

---

## 7. Ejecutar migraciones de BD

Después del primer deploy, conéctate a la shell de Render o corre localmente con la URL de producción:
```bash
DATABASE_URL="tu_url_produccion" npm run db:push
```

---

## Generar APK Android

### Requisitos
- **Android Studio** instalado ([developer.android.com/studio](https://developer.android.com/studio))
- **Java 17+** (`java -version`)
- **Node.js 18+** y **pnpm** (`npm i -g pnpm`)

### Pasos

```bash
# 1. Instalar dependencias (incluye Capacitor)
pnpm install

# 2. Construir el frontend
pnpm build:web

# 3. Inicializar proyecto Android (solo la primera vez)
npx cap add android

# 4. Copiar assets al proyecto Android
npx cap sync android

# 5. Abrir en Android Studio para compilar el APK
npx cap open android
```

### En Android Studio

1. Espera que Gradle sincronice (barra inferior)
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`
4. Compártelo por **WhatsApp** a los colaboradores

### Instalar en Android

El receptor debe tener activado **"Instalar desde fuentes desconocidas"**:  
Ajustes → Seguridad → Instalar apps desconocidas → activar para WhatsApp

---

## Instalar como PWA en iPhone (Safari)

1. Abre `https://app.cocinasintegralespereira.co` en **Safari**
2. Toca el botón **Compartir** (cuadrado con flecha ↑)
3. Desplázate y elige **"Agregar a pantalla de inicio"**
4. Cambia el nombre si quieres → **Agregar**
5. El ícono aparece en el escritorio como una app nativa

> **Nota:** Las notificaciones push en iOS requieren iOS 16.4+ y que el usuario las acepte desde la app instalada (no desde Safari).

---

## Troubleshooting

| Problema | Solución |
|---|---|
| Build falla con error de pnpm-lock.yaml | Render usa npm — el `render.yaml` ya usa `npm install --legacy-peer-deps` |
| "Cannot connect to database" | Verifica que `DATABASE_URL` sea el Internal URL de Render PostgreSQL |
| Fotos no se suben | Verifica `BUILT_IN_FORGE_API_URL` y `BUILT_IN_FORGE_API_KEY` |
| WhatsApp no envía | El token de Meta expira cada 60 días — renovar en Meta for Developers |
| Push notifications no llegan en iOS | Requiere iOS 16.4+, Safari, y la PWA instalada en pantalla de inicio |
