# NEXUS AI — Guía de Instalación Completa

## Estructura del proyecto

```
nexus/
├── backend/
│   ├── server.js       ← API Express (todos los endpoints)
│   ├── db.js           ← Conexión Neon + creación de tablas
│   ├── package.json    ← Dependencias Node.js
│   └── .env.example    ← Plantilla de variables de entorno
└── frontend/
    └── index.html      ← App completa (un solo archivo)
```

---

## ⚠️ IMPORTANTE — Seguridad de la base de datos

Tu cadena de conexión quedó expuesta en este chat.
**Ve a Neon (neon.tech) → tu proyecto → Settings → Reset password**
antes de usar esto en producción.

---

## 1. Configurar el Backend

### Requisitos
- Node.js 18+
- Cuenta en neon.tech (ya tienes la base de datos)

### Pasos

```bash
# 1. Entra a la carpeta backend
cd nexus/backend

# 2. Instala dependencias
npm install

# 3. Crea el archivo .env (copia el ejemplo)
cp .env.example .env

# 4. Edita .env con tu cadena de conexión real:
#    DATABASE_URL=postgresql://neondb_owner:TU_NUEVA_PASS@ep-winter-hill-...
#    JWT_SECRET=una_clave_muy_secreta_larga_2024
#    PORT=3001
#    FRONTEND_URL=http://localhost:5500

# 5. Inicia el servidor
node server.js
# O en modo desarrollo (se reinicia automáticamente):
npm run dev
```

Verás:
```
✅ Base de datos inicializada correctamente
🚀 NEXUS AI Backend corriendo en http://localhost:3001
```

---

## 2. Abrir el Frontend

### Opción A — Directamente en el navegador
Simplemente abre `frontend/index.html` con doble clic en el archivo.
Funciona sin servidor adicional.

### Opción B — Con VS Code Live Server
1. Instala la extensión "Live Server" en VS Code
2. Clic derecho en `index.html` → "Open with Live Server"
3. Abre en `http://localhost:5500`

### Opción C — Subir a Vercel / Netlify
Sube solo el archivo `index.html` a cualquier hosting estático.

---

## 3. Conectar Frontend con Backend

Edita la línea 4 del `<script>` en `index.html`:

```javascript
// Cambiar esto:
const API = 'http://localhost:3001/api';

// Por la URL de tu backend en producción:
const API = 'https://tu-backend.railway.app/api';
```

---

## 4. Subir el Backend a Railway (gratis)

```bash
# 1. Instala Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Desde la carpeta backend:
railway init
railway up

# 4. Agrega las variables de entorno en Railway Dashboard:
#    DATABASE_URL = tu cadena de Neon
#    JWT_SECRET   = tu clave secreta
#    FRONTEND_URL = https://tu-frontend.com
```

---

## 5. Flujo de uso de la App

1. **Registro**: Usuario + Contraseña + Código `1212` → Biometría facial
2. **Login**: Usuario + Contraseña → Biometría → Dashboard
3. **Dashboard**: KPIs en tiempo real desde Neon, gráficos, predicciones

---

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/register | Registro (user, password) |
| POST | /api/auth/login | Login (user, password) |
| POST | /api/auth/save-face | Guardar biometría (face_data) |
| GET  | /api/dashboard/kpis | KPIs principales |
| GET  | /api/dashboard/ventas-historicas | Datos del gráfico |
| GET  | /api/dashboard/predicciones | Tabla de predicciones |
| GET  | /api/dashboard/canales | Ventas por canal |
| POST | /api/ventas | Crear venta |
| GET  | /api/ventas | Listar ventas |

Todos excepto register/login requieren header:
```
Authorization: Bearer <token>
```

---

## Tablas creadas automáticamente en Neon

- **users** — id, username, password (hash), face_data, created_at, last_login
- **ventas** — id, user_id, producto, canal, monto, fecha
- **predicciones** — id, producto, venta_actual, prediccion, variacion, confianza
- **metricas_diarias** — id, fecha, ventas_total, transacciones, eficiencia

Las tablas y datos de ejemplo se crean solas al iniciar el servidor.
